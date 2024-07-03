import i18next from "i18next";
import {BattleType} from "../../battle";
import BattleScene from "../../battle-scene";
import PokemonSpecies, {getPokemonSpecies, speciesStarters} from "../pokemon-species";
import MysteryEncounter, {MysteryEncounterVariant} from "../mystery-encounter";
import {Status, StatusEffect} from "../status-effect";
import {TrainerConfig, trainerConfigs, TrainerSlot} from "../trainer-config";
import {FieldPosition, PlayerPokemon} from "../../field/pokemon";
import Trainer, {TrainerVariant} from "../../field/trainer";
import {PokemonExpBoosterModifier} from "../../modifier/modifier";
import {
  CustomModifierSettings,
  ModifierPoolType,
  ModifierTypeFunc, PokemonHeldItemModifierType,
  regenerateModifierPoolThresholds
} from "../../modifier/modifier-type";
import {BattleEndPhase, EggLapsePhase, ModifierRewardPhase, TrainerVictoryPhase} from "../../phases";
import {MysteryEncounterBattlePhase, MysteryEncounterRewardsPhase} from "../../phases/mystery-encounter-phase";
import * as Utils from "../../utils";
import {isNullOrUndefined} from "../../utils";
import {SelectModifierPhase} from "#app/phases/select-modifier-phase";
import {TrainerType} from "#enums/trainer-type";
import {Species} from "#enums/species";
import {Type} from "#app/data/type";
import {BattlerTagType} from "#enums/battler-tag-type";
import PokemonData from "#app/system/pokemon-data";
import {Biome} from "#enums/biome";
import {biomeLinks} from "#app/data/biomes";
import { EncounterSceneRequirement } from "#app/data/mystery-encounter-requirements";

/**
 * Util file for functions used in mystery encounters
 * **MIGHT** be useful outside of mystery encounters but no guarantees of functionality
 */

/**
 * Async function that is called every time a mystery encounter option is selected
 * If there are intro visuals as part of an encounter, they will fade back and then be removed
 * Async logic can be used to await or promise chain once visuals are finished being removed
 * Note: If Trainer objects are part of a mystery encounter battle, those will be shown after intro visuals
 * @param scene - Battle scene object
 * @returns - Promise
 */
export function hideMysteryEncounterIntroVisuals(scene: BattleScene): Promise<boolean> {
  return new Promise(resolve => {
    const introVisuals = scene.currentBattle.mysteryEncounter.introVisuals;
    if (introVisuals) {
      // Hide
      scene.tweens.add({
        targets: introVisuals,
        x: "+=16",
        y: "-=16",
        alpha: 0,
        ease: "Sine.easeInOut",
        duration: 750,
        onComplete: () => {
          scene.field.remove(introVisuals);
          introVisuals.setVisible(false);
          introVisuals.destroy();
          scene.currentBattle.mysteryEncounter.introVisuals = null;
          resolve(true);
        }
      });
    } else {
      resolve(true);
    }
  });
}

/**
 *
 * Will never remove the player's last non-fainted Pokemon (if they only have 1)
 * Otherwise, picks a Pokemon completely at random and removes from the party
 * @param scene
 * @param isAllowedInBattle - default false. If true, only picks from unfainted mons. If there is only 1 unfainted mon left and doNotReturnLastAbleMon is also true, will return fainted mon
 * @param doNotReturnLastAbleMon - If true, will never return the last unfainted pokemon in the party. Useful when this function is being used to determine what Pokemon to remove from the party (Don't want to remove last unfainted)
 * @returns
 */
export function getRandomPlayerPokemon(scene: BattleScene, isAllowedInBattle: boolean = false, doNotReturnLastAbleMon: boolean = false): PlayerPokemon {
  const party = scene.getParty();
  let chosenIndex: number;
  let chosenPokemon: PlayerPokemon;
  const unfaintedMons = party.filter(p => p.isAllowedInBattle());
  const faintedMons = party.filter(p => !p.isAllowedInBattle());

  if (doNotReturnLastAbleMon && unfaintedMons.length === 1) {
    chosenIndex = Utils.randSeedInt(faintedMons.length);
    chosenPokemon = faintedMons.at(chosenIndex);
  } else if (isAllowedInBattle) {
    chosenIndex = Utils.randSeedInt(unfaintedMons.length);
    chosenPokemon = unfaintedMons.at(chosenIndex);
  } else {
    chosenIndex = Utils.randSeedInt(party.length);
    chosenPokemon = party.at(chosenIndex);
  }

  return chosenPokemon;
}


export function getTokensFromScene(scene:BattleScene, reqs:EncounterSceneRequirement[]): Array<[RegExp, String]> {
  const arr = [];
  if (scene) {
    for (const req of reqs) {
      req.getMatchingDialogueToken(scene);
    }
  }
  return arr;
}

// Auto-pushes dialogue tokens based on required attributes.
// Grabs the first support pokemon. if you want multiple support pokemon in your text, you'll have to write it yourself.
export function pushDialogueTokensFromPokemon(instance:MysteryEncounter) {
  if (instance.primaryPokemon?.length > 0) {
    instance.dialogueTokens.push([/@ec\{primaryName\}/gi, instance.primaryPokemon.name]);
    for (const req of instance.primaryPokemonRequirements) {
      if (!req.invertQuery) {
        instance.dialogueTokens.push(req.getMatchingDialogueToken("primary", instance.primaryPokemon));
      }
    }
  }
  if (instance.secondaryPokemonRequirements?.length > 0 && instance.secondaryPokemon?.length > 0) {
    instance.dialogueTokens.push([/@ec\{secondaryName\}/gi, instance.secondaryPokemon[0].name]);
    for (const req of instance.secondaryPokemonRequirements) {
      if (!req.invertQuery) {
        instance.dialogueTokens.push(req.getMatchingDialogueToken("secondary", instance.secondaryPokemon[0]));
      }
    }
  }
  for (let i = 0; i < instance.options.length; i++) {
    const opt = instance.options[i];
    const j = i + 1;
    if (opt.primaryPokemonRequirements?.length > 0 && opt.primaryPokemon?.length > 0) {
      instance.dialogueTokens.push([new RegExp("@ec\{option" + j + "PrimaryName\\}", "gi"), opt.primaryPokemon.name]);
      for (const req of opt.primaryPokemonRequirements) {
        if (!req.invertQuery) {
          instance.dialogueTokens.push(req.getMatchingDialogueToken("option" + j + "Primary", opt.primaryPokemon));
        }
      }
    }
    if (opt.secondaryPokemonRequirements?.length > 0 && opt.secondaryPokemon?.length > 0) {
      instance.dialogueTokens.push([new RegExp("@ec\{option" + j + "SecondaryName\\}", "gi"), opt.secondaryPokemon[0].name]);
      for (const req of opt.secondaryPokemonRequirements) {
        if (!req.invertQuery) {
          instance.dialogueTokens.push(req.getMatchingDialogueToken("option" + j + "Secondary", opt.secondaryPokemon[0]));
        }
      }
    }
  }
}

/**
 * Ties are broken by whatever mon is closer to the front of the party
 * @param scene
 * @param unfainted - default false. If true, only picks from unfainted mons.
 * @returns
 */
export function getHighestLevelPlayerPokemon(scene: BattleScene, unfainted: boolean = false): PlayerPokemon {
  const party = scene.getParty();
  let pokemon: PlayerPokemon;
  party.every(p => {
    if (unfainted && p.isFainted()) {
      return true;
    }

    pokemon = pokemon ? pokemon?.level < p?.level ? p : pokemon : p;
    return true;
  });

  return pokemon;
}

/**
 * Ties are broken by whatever mon is closer to the front of the party
 * @param scene
 * @param unfainted - default false. If true, only picks from unfainted mons.
 * @returns
 */
export function getLowestLevelPlayerPokemon(scene: BattleScene, unfainted: boolean = false): PlayerPokemon {
  const party = scene.getParty();
  let pokemon: PlayerPokemon;
  party.every(p => {
    if (unfainted && p.isFainted()) {
      return true;
    }

    pokemon = pokemon ? pokemon?.level > p?.level ? p : pokemon : p;
    return true;
  });

  return pokemon;
}

export function koPlayerPokemon(pokemon: PlayerPokemon) {
  pokemon.hp = 0;
  pokemon.trySetStatus(StatusEffect.FAINT);
  pokemon.updateInfo();
}

/**
 * Will display a message in UI with injected encounter data tokens
 * @param scene
 * @param contentKey
 */
export function showEncounterText(scene: BattleScene, contentKey: TemplateStringsArray | `mysteryEncounter:${string}`): Promise<void> {
  return new Promise<void>(resolve => {
    let text: string = i18next.t(contentKey);
    const dialogueTokens = scene.currentBattle?.mysteryEncounter?.dialogueTokens;
    if (dialogueTokens) {
      dialogueTokens.forEach((token) => {
        console.log(token);
        text = text.replace(token[0], token[1]);
      });
    }

    const onMessageContinue = (() => {
      resolve();
    });

    scene.ui.showText(text, null, onMessageContinue, 0, true);
  });
}

/**
 * Will display a dialogue (with speaker title) in UI with injected encounter data tokens
 * @param scene
 * @param textContentKey
 * @param speakerContentKey
 * @param callback
 */
export function showEncounterDialogue(scene: BattleScene, textContentKey: TemplateStringsArray | `mysteryEncounter:${string}`, speakerContentKey: TemplateStringsArray | `mysteryEncounter:${string}`, callback?: Function) {
  let text: string = i18next.t(textContentKey);
  let speaker: string = i18next.t(speakerContentKey);
  const dialogueTokens = scene.currentBattle?.mysteryEncounter?.dialogueTokens;
  if (dialogueTokens) {
    dialogueTokens.forEach((token) => {
      text = text.replace(token[0], token[1]);
      speaker = speaker.replace(token[0], token[1]);
    });
  }

  scene.ui.showDialogue(text, speaker, null, callback, 0, 0);
}

/**
 *
 * NOTE: This returns ANY random species, including those locked behind eggs, etc.
 * @param starterTiers
 * @param excludedSpecies
 * @param types
 * @returns
 */
export function getRandomSpeciesByStarterTier(starterTiers: number | [number, number], excludedSpecies?: Species[], types?: Type[]): Species {
  let min = starterTiers instanceof Array ? starterTiers[0] : starterTiers;
  let max = starterTiers instanceof Array ? starterTiers[1] : starterTiers;

  let filteredSpecies = Object.entries(speciesStarters)
    .map(s => parseInt(s[0]))
    .filter(s => getPokemonSpecies(s) && !excludedSpecies.includes(s));

  if (!isNullOrUndefined(types) && types.length > 0) {
    filteredSpecies = filteredSpecies.filter(s => {
      const species = getPokemonSpecies(s);
      return types.includes(species.type1) || types.includes(species.type2);
    });
  }

  // If no filtered mons exist at specified starter tiers, will expand starter search range until there are
  // Starts by decrementing starter tier min until it is 0, then increments tier max up to 10
  let tryFilterStarterTiers = filteredSpecies.filter(s => s[1] >= min && s[1] <= max);
  while (tryFilterStarterTiers.length === 0 || !(min === 0 && max === 10)) {
    if (min > 0) {
      min--;
    } else {
      max++;
    }

    tryFilterStarterTiers = filteredSpecies.filter(s => s[1] >= min && s[1] <= max);
  }

  if (tryFilterStarterTiers.length > 0) {
    const index = Utils.randSeedInt(tryFilterStarterTiers.length);
    return Phaser.Math.RND.shuffle(tryFilterStarterTiers)[index];
  }

  return Species.BULBASAUR;
}

export class EnemyPokemonConfig {
  species: PokemonSpecies;
  isBoss: boolean = false;
  bossSegments?: number;
  bossSegmentModifier?: number; // Additive to the determined segment number
  formIndex?: number;
  level?: number;
  modifierTypes?: PokemonHeldItemModifierType[];
  dataSource?: PokemonData;
  tags?: BattlerTagType[];
  status?: StatusEffect;
}

export class EnemyPartyConfig {
  levelAdditiveMultiplier?: number = 0; // Formula for enemy: level += waveIndex / 10 * levelAdditive
  doubleBattle?: boolean = false;
  trainerType?: TrainerType; // Generates trainer battle solely off trainer type
  trainerConfig?: TrainerConfig; // More customizable option for configuring trainer battle
  pokemonConfigs?: EnemyPokemonConfig[];
  female?: boolean; // True for female trainer, false for male
}

/**
 * Generates an enemy party for a mystery encounter battle
 * This will override and replace any standard encounter generation logic
 * Useful for tailoring specific battles to mystery encounters
 * @param scene - Battle Scene
 * @param partyConfig - Can pass various customizable attributes for the enemy party, see EnemyPartyConfig
 */
export async function initBattleWithEnemyConfig(scene: BattleScene, partyConfig: EnemyPartyConfig): Promise<void> {
  const loaded = false;
  const loadEnemyAssets = [];

  const battle = scene.currentBattle;

  // const normalCount = partyConfig?.pokemonConfigs?.filter(p => !p.isBoss)?.length || 0;
  // const bossCount = partyConfig?.pokemonConfigs?.filter(p => p.isBoss)?.length || 0;
  let doubleBattle = partyConfig?.doubleBattle;

  // Trainer
  const trainerType = partyConfig?.trainerType;
  let trainerConfig = partyConfig?.trainerConfig;
  if (trainerType || trainerConfig) {
    scene.currentBattle.mysteryEncounter.encounterVariant = MysteryEncounterVariant.TRAINER_BATTLE;
    if (scene.currentBattle.trainer) {
      scene.currentBattle.trainer.setVisible(false);
      scene.currentBattle.trainer.destroy();
    }

    trainerConfig = partyConfig?.trainerConfig ? partyConfig?.trainerConfig : trainerConfigs[trainerType];

    const doubleTrainer = trainerConfig.doubleOnly || (trainerConfig.hasDouble && partyConfig.doubleBattle);
    doubleBattle = doubleTrainer;
    const trainerFemale = isNullOrUndefined(partyConfig.female) ? !!(Utils.randSeedInt(2)) : partyConfig.female;
    const newTrainer = new Trainer(scene, trainerConfig.trainerType, doubleTrainer ? TrainerVariant.DOUBLE : trainerFemale ? TrainerVariant.FEMALE : TrainerVariant.DEFAULT, null, null, null, trainerConfig);
    newTrainer.x += 300;
    newTrainer.setVisible(false);
    scene.field.add(newTrainer);
    scene.currentBattle.trainer = newTrainer;
    loadEnemyAssets.push(newTrainer.loadAssets());

    battle.enemyLevels = scene.currentBattle.trainer.getPartyLevels(scene.currentBattle.waveIndex);
  } else {
    // Wild
    scene.currentBattle.mysteryEncounter.encounterVariant = MysteryEncounterVariant.WILD_BATTLE;
    battle.enemyLevels = new Array(partyConfig?.pokemonConfigs?.length > 0 ? partyConfig?.pokemonConfigs?.length : doubleBattle ? 2 : 1).fill(null).map(() => scene.currentBattle.getLevelForWave());
  }

  scene.getEnemyParty().forEach(enemyPokemon => enemyPokemon.destroy());
  battle.enemyParty = [];
  battle.double = doubleBattle;

  // Adjust levels for battle by modifier
  // ME levels are modified by an additive that scales with wave index
  // Every 10 floors, 1 will be added to level value, which starts at 2
  // This can be amplified or counteracted by setting levelAdditiveMultiplier in config
  // Leaving undefined will default to 0
  const mult = !isNullOrUndefined(partyConfig.levelAdditiveMultiplier) ? partyConfig.levelAdditiveMultiplier : 0;
  const additive = Math.max(Math.round((2 + scene.currentBattle.waveIndex / 10) * mult), 0);
  battle.enemyLevels = battle.enemyLevels.map(level => level + additive);

  battle.enemyLevels.forEach((level, e) => {
    let enemySpecies;
    let isBoss = false;
    if (!loaded) {
      if (trainerType || trainerConfig) {
        battle.enemyParty[e] = battle.trainer.genPartyMember(e);
      } else {
        if (e < partyConfig?.pokemonConfigs?.length) {
          const config = partyConfig?.pokemonConfigs?.[e];
          enemySpecies = config.species;
          isBoss = config.isBoss;
          if (isBoss) {
            scene.currentBattle.mysteryEncounter.encounterVariant = MysteryEncounterVariant.BOSS_BATTLE;
          }
        } else {
          enemySpecies = scene.randomSpecies(battle.waveIndex, level, true);
        }

        battle.enemyParty[e] = scene.addEnemyPokemon(enemySpecies, level, TrainerSlot.NONE, isBoss);
      }
    }

    const enemyPokemon = scene.getEnemyParty()[e];
    if (isBoss) {
      enemyPokemon.setBoss(true, scene.getEncounterBossSegments(scene.currentBattle.waveIndex, level, enemySpecies, true));
    }

    if (e < (doubleBattle ? 2 : 1)) {
      enemyPokemon.setX(-66 + enemyPokemon.getFieldPositionOffset()[0]);
      enemyPokemon.resetSummonData();
    }

    if (!loaded) {
      scene.gameData.setPokemonSeen(enemyPokemon, true, !!(trainerType || trainerConfig));
    }

    if (e < partyConfig?.pokemonConfigs?.length) {
      if (partyConfig.pokemonConfigs[e].status) {
        // we can't use trysetstatus because pokemon aint in battle yet
        enemyPokemon.status = new Status(partyConfig.pokemonConfigs[e].status, 3);
      }
      if (partyConfig?.pokemonConfigs?.[e].tags?.length > 0) {
        const tags = partyConfig?.pokemonConfigs?.[e].tags;
        tags.forEach(tag => enemyPokemon.addTag(tag));

        // Requires re-priming summon data so that tags are not cleared on SummonPhase
        enemyPokemon.primeSummonData(enemyPokemon.summonData);
      }
    }

    loadEnemyAssets.push(enemyPokemon.loadAssets());

    console.log(enemyPokemon.name, enemyPokemon.species.speciesId, enemyPokemon.stats);
  });

  scene.pushPhase(new MysteryEncounterBattlePhase(scene));

  await Promise.all(loadEnemyAssets);
  battle.enemyParty.forEach((enemyPokemon_2, e_1) => {
    if (e_1 < (doubleBattle ? 2 : 1)) {
      enemyPokemon_2.setVisible(false);
      if (battle.double) {
        enemyPokemon_2.setFieldPosition(e_1 ? FieldPosition.RIGHT : FieldPosition.LEFT);
      }
      // Spawns at current visible field instead of on "next encounter" field (off screen to the left)
      enemyPokemon_2.x += 300;
    }
  });
  if (!loaded) {
    regenerateModifierPoolThresholds(scene.getEnemyField(), battle.battleType === BattleType.TRAINER ? ModifierPoolType.TRAINER : ModifierPoolType.WILD);
    scene.generateEnemyModifiers();
  }
}


/**
 * For trainer battles during mystery encounters
 * Will animate the trainer onto the field and show intro dialogue selected at random from the trainer's pool of dialogue
 * Async logic can be used to await or promise chain from the player's continuation of the dialogue
 * @param scene - Battle Scene
 * @returns - Promise
 */
export function showTrainerDialogue(scene: BattleScene): Promise<boolean> {
  scene.pbTray.showPbTray(scene.getParty());
  scene.pbTrayEnemy.showPbTray(scene.getEnemyParty());

  // Show enemy trainer
  const trainer = scene.currentBattle.trainer;
  trainer.alpha = 0;
  trainer.x += 16;
  trainer.y -= 16;
  scene.tweens.add({
    targets: scene.currentBattle.trainer,
    x: "-=16",
    y: "+=16",
    alpha: 1,
    ease: "Sine.easeInOut",
    duration: 750,
    onComplete: () => {
      trainer.playAnim();
    }
  });

  return new Promise(resolve => {
    if (trainer) {
      const encounterMessages = scene.currentBattle.trainer.getEncounterMessages();
      let message: string;
      scene.executeWithSeedOffset(() => message = Utils.randSeedItem(encounterMessages), scene.currentBattle.waveIndex);
      scene.ui.showDialogue(message, trainer.getName(TrainerSlot.NONE, true), null, () => resolve(true));
    } else {
      resolve(true);
    }
  });
}

/**
 * Will initialize reward phases to follow the mystery encounter
 * Can have shop displayed or skipped
 * @param scene - Battle Scene
 * @param customShopRewards - adds a shop phase with the specified rewards / reward tiers
 * @param nonShopRewards - will add a non-shop reward phase for each specified item/modifier (can happen in addition to a shop)
 * @param preRewardsCallback - can execute an arbitrary callback before the new phases if necessary
 */
export function setCustomEncounterRewards(scene: BattleScene, customShopRewards?: CustomModifierSettings, nonShopRewards?: ModifierTypeFunc[], preRewardsCallback?: Function) {
  scene.currentBattle.mysteryEncounter.doEncounterRewards = (scene: BattleScene) => {
    if (preRewardsCallback) {
      preRewardsCallback();
    }

    if (customShopRewards) {
      scene.unshiftPhase(new SelectModifierPhase(scene, 0, null, customShopRewards));
    } else {
      scene.tryRemovePhase(p => p instanceof SelectModifierPhase);
    }

    if (nonShopRewards?.length > 0) {
      nonShopRewards.forEach((reward) => {
        scene.unshiftPhase(new ModifierRewardPhase(scene, reward));
      });
    } else {
      while (!Utils.isNullOrUndefined(scene.findPhase(p => p instanceof ModifierRewardPhase))) {
        scene.tryRemovePhase(p => p instanceof ModifierRewardPhase);
      }
    }

    return true;
  };
}

/**
 * Will initialize exp phases to follow the mystery encounter (in addition to any combat or other exp earned)
 * Exp earned will be a simple function that linearly scales with wave index, that can be increased or decreased by the expMultiplier
 * Exp Share will have no effect (so no accounting for what mon is "on the field")
 * Exp Balance will still function as normal
 * @param scene - Battle Scene
 * @param expMultiplier - default is 100, can be increased or decreased as desired
 */
export function setEncounterExp(scene: BattleScene, expMultiplier: number = 100) {
  //const expBalanceModifier = scene.findModifier(m => m instanceof ExpBalanceModifier) as ExpBalanceModifier;
  const expVal = scene.currentBattle.waveIndex * expMultiplier;
  const pokemonExp = new Utils.NumberHolder(expVal);
  const partyMemberExp = [];

  const party = scene.getParty();
  party.forEach(pokemon => {
    scene.applyModifiers(PokemonExpBoosterModifier, true, pokemon, pokemonExp);
    partyMemberExp.push(Math.floor(pokemonExp.value));
  });

  // TODO
  //if (expBalanceModifier) {
  //  let totalLevel = 0;
  //  let totalExp = 0;
  //  expPartyMembers.forEach((expPartyMember, epm) => {
  //    totalExp += partyMemberExp[epm];
  //    totalLevel += expPartyMember.level;
  //  });

  //  const medianLevel = Math.floor(totalLevel / expPartyMembers.length);

  //  const recipientExpPartyMemberIndexes = [];
  //  expPartyMembers.forEach((expPartyMember, epm) => {
  //    if (expPartyMember.level <= medianLevel) {
  //      recipientExpPartyMemberIndexes.push(epm);
  //    }
  //  });

  //  const splitExp = Math.floor(totalExp / recipientExpPartyMemberIndexes.length);

  //  expPartyMembers.forEach((_partyMember, pm) => {
  //    partyMemberExp[pm] = Phaser.Math.Linear(partyMemberExp[pm], recipientExpPartyMemberIndexes.indexOf(pm) > -1 ? splitExp : 0, 0.2 * expBalanceModifier.getStackCount());
  //  });
  //}
}

/**
 * Can be used to exit an encounter without any battles or followup
 * Will skip any shops and rewards, and queue the next encounter phase as normal
 * @param scene
 * @param addHealPhase - when true, will add a shop phase to end of encounter with 0 rewards but healing items are available
 */
export function leaveEncounterWithoutBattle(scene: BattleScene, addHealPhase: boolean = false) {
  scene.currentBattle.mysteryEncounter.encounterVariant = MysteryEncounterVariant.NO_BATTLE;
  scene.clearPhaseQueue();
  scene.clearPhaseQueueSplice();
  handleMysteryEncounterVictory(scene, addHealPhase);
}

export function handleMysteryEncounterVictory(scene: BattleScene, addHealPhase: boolean = false) {
  if (scene.currentBattle.mysteryEncounter.encounterVariant === MysteryEncounterVariant.NO_BATTLE) {
    scene.pushPhase(new EggLapsePhase(scene));
    scene.pushPhase(new MysteryEncounterRewardsPhase(scene, addHealPhase));
  } else if (!scene.getEnemyParty().find(p => scene.currentBattle.mysteryEncounter.encounterVariant !== MysteryEncounterVariant.TRAINER_BATTLE ? p.isOnField() : !p?.isFainted(true))) {
    scene.pushPhase(new BattleEndPhase(scene));
    if (scene.currentBattle.mysteryEncounter.encounterVariant === MysteryEncounterVariant.TRAINER_BATTLE) {
      scene.pushPhase(new TrainerVictoryPhase(scene));
    }
    if (scene.gameMode.isEndless || !scene.gameMode.isWaveFinal(scene.currentBattle.waveIndex)) {
      scene.pushPhase(new EggLapsePhase(scene));
      scene.pushPhase(new MysteryEncounterRewardsPhase(scene, addHealPhase));
    }
  }
}

export function applyEncounterDialogueTokens(scene: BattleScene, text: string): string {
  const dialogueTokens = scene.currentBattle?.mysteryEncounter?.dialogueTokens;

  if (dialogueTokens) {
    dialogueTokens.forEach((token) => {
      text = text.replace(token[0], token[1]);
    });
  }

  return text;
}

// TODO: remove once encounter spawn rate is finalized
// Just a helper function to calculate stats on MEs per run
export function calculateMEAggregateStats(scene: BattleScene, baseSpawnWeight: number) {
  const numRuns = 1000;
  let run = 0;

  const calculateNumEncounters = (): number[] => {
    let encounterRate = baseSpawnWeight;
    const numEncounters = [0, 0, 0, 0];
    let currentBiome = Biome.TOWN;
    let currentArena = scene.newArena(currentBiome);
    for (let i = 10; i < 180; i++) {
      // Boss
      if (i % 10 === 0) {
        continue;
      }

      // New biome
      if (i % 10 === 1) {
        if (Array.isArray(biomeLinks[currentBiome])) {
          let biomes: Biome[];
          scene.executeWithSeedOffset(() => {
            biomes = (biomeLinks[currentBiome] as (Biome | [Biome, integer])[])
              .filter(b => !Array.isArray(b) || !Utils.randSeedInt(b[1]))
              .map(b => !Array.isArray(b) ? b : b[0]);
          }, i);
          currentBiome = biomes[Utils.randSeedInt(biomes.length)];
        } else if (biomeLinks.hasOwnProperty(currentBiome)) {
          currentBiome = (biomeLinks[currentBiome] as Biome);
        } else {
          if (!(i % 50)) {
            currentBiome = Biome.END;
          } else {
            currentBiome = scene.generateRandomBiome(i);
          }
        }

        currentArena = scene.newArena(currentBiome);
      }

      // Fixed battle
      if (scene.gameMode.isFixedBattle(i)) {
        continue;
      }

      // Trainer
      if (scene.gameMode.isWaveTrainer(i, currentArena)) {
        continue;
      }

      // Otherwise, roll encounter

      const roll = Utils.randSeedInt(256);

      // If total number of encounters is lower than expected for the run, slightly favor a new encounter
      // Do the reverse as well
      const expectedEncountersByFloor = 8 / (180 - 10) * i;
      const currentRunDiffFromAvg = expectedEncountersByFloor - numEncounters.reduce((a, b) => a + b);
      const favoredEncounterRate = encounterRate + currentRunDiffFromAvg * 5;

      if (roll < favoredEncounterRate) {
        encounterRate = baseSpawnWeight;

        // Calculate encounter rarity
        // Common / Uncommon / Rare / Super Rare (base is out of 128)
        const tierWeights = [61, 40, 21, 6];

        // Adjust tier weights by currently encountered events (pity system that lowers odds of multiple common/uncommons)
        tierWeights[0] = tierWeights[0] - 6 * numEncounters[0];
        tierWeights[1] = tierWeights[1] - 4 * numEncounters[1];

        const totalWeight = tierWeights.reduce((a, b) => a + b);
        const tierValue = Utils.randSeedInt(totalWeight);
        const commonThreshold = totalWeight - tierWeights[0]; // 64 - 32 = 32
        const uncommonThreshold = totalWeight - tierWeights[0] - tierWeights[1]; // 64 - 32 - 16 = 16
        const rareThreshold = totalWeight - tierWeights[0] - tierWeights[1] - tierWeights[2]; // 64 - 32 - 16 - 10 = 6

        tierValue > commonThreshold ? ++numEncounters[0] : tierValue > uncommonThreshold ? ++numEncounters[1] : tierValue > rareThreshold ? ++numEncounters[2] : ++numEncounters[3];
      } else {
        encounterRate++;
      }
    }

    return numEncounters;
  };

  const runs = [];
  while (run < numRuns) {
    scene.executeWithSeedOffset(() => {
      const numEncounters = calculateNumEncounters();
      runs.push(numEncounters);
    }, 1000 * run);
    run++;
  }

  const n = runs.length;
  const totalEncountersInRun = runs.map(run => run.reduce((a, b) => a + b));
  const totalMean = totalEncountersInRun.reduce((a, b) => a + b) / n;
  const totalStd = Math.sqrt(totalEncountersInRun.map(x => Math.pow(x - totalMean, 2)).reduce((a, b) => a + b) / n);
  const commonMean = runs.reduce((a, b) => a + b[0], 0) / n;
  const uncommonMean = runs.reduce((a, b) => a + b[1], 0) / n;
  const rareMean = runs.reduce((a, b) => a + b[2], 0) / n;
  const superRareMean = runs.reduce((a, b) => a + b[3], 0) / n;

  console.log(`Starting weight: ${baseSpawnWeight}\nAverage MEs per run: ${totalMean}\nStandard Deviation: ${totalStd}\nAvg Commons: ${commonMean}\nAvg Uncommons: ${uncommonMean}\nAvg Rares: ${rareMean}\nAvg Super Rares: ${superRareMean}`);
}
