import BattleScene from "../../battle-scene";
import {
  EnemyPartyConfig,
  EnemyPokemonConfig,
  initBattleWithEnemyConfig,
  leaveEncounterWithoutBattle,
  pushDialogueTokensFromPokemon,
  setCustomEncounterRewards,
  showEncounterText
} from "./mystery-encounter-utils";
import MysteryEncounter, {MysteryEncounterBuilder} from "../mystery-encounter";
import * as Utils from "../../utils";
import {MysteryEncounterType} from "#enums/mystery-encounter-type";
import {MoveRequirement, StatusEffectRequirement, WaveCountRequirement} from "../mystery-encounter-requirements";
import {MysteryEncounterOptionBuilder} from "../mystery-encounter-option";
import {
  modifierTypes
} from "#app/modifier/modifier-type";
import { getPokemonSpecies } from "../pokemon-species";
import { Species } from "#enums/species";
import { StatusEffect } from "../status-effect";
import { Moves } from "#enums/moves";
import { SummonPhase } from "#app/phases";

export const SleepingSnorlaxEncounter: MysteryEncounter = new MysteryEncounterBuilder()
  .withEncounterType(MysteryEncounterType.SLEEPING_SNORLAX)
  .withIntroSpriteConfigs([
    {
      spriteKey: Species.SNORLAX.toString(),
      fileRoot: "pokemon",
      hasShadow: true,
      tint: 0.25,
      repeat: true
    }
  ]) // Set in onInit()
  .withSceneRequirement(new WaveCountRequirement([10, 180])) // waves 10 to 180
  .withCatchAllowed(true)
  .withOnInit((scene: BattleScene) => {
    const instance = scene.currentBattle.mysteryEncounter;
    pushDialogueTokensFromPokemon(instance);
    console.log(instance);
    const availablePartyMembers = scene.getParty().filter(p => p.isAllowedInBattle());
    if (!availablePartyMembers[0].isOnField()) {

      scene.pushPhase(new SummonPhase(scene, 0));
    }

    // Calculate boss mon
    const bossSpecies = getPokemonSpecies(Species.SNORLAX);
    const pokemonConfig: EnemyPokemonConfig = {
      species: bossSpecies,
      isBoss: true,
      status: StatusEffect.SLEEP
    };
    const config: EnemyPartyConfig = {
      levelAdditiveMultiplier: 4,
      pokemonConfigs: [pokemonConfig]
    };
    instance.enemyPartyConfigs = [config];

    // Calculate item
    // 1-60 ULTRA, 60-120 ROGUE, 120+ MASTER

    const item = modifierTypes.LEFTOVERS;
    scene.currentBattle.mysteryEncounter.dialogueTokens.push([/@ec\{itemName\}/gi, item.name]);
    scene.currentBattle.mysteryEncounter.misc = item;

    return true;
  })
  .withOption(new MysteryEncounterOptionBuilder()
    .withOptionPhase(async (scene: BattleScene) => {
      // Pick battle
      //setEncounterRewards(scene, { guaranteedModifiers: [], fillRemaining: false});
      await initBattleWithEnemyConfig(scene, scene.currentBattle.mysteryEncounter.enemyPartyConfigs[0]);
    })
    .build())
  .withOption(new MysteryEncounterOptionBuilder()
    .withProtagonistPokemonRequirement(new StatusEffectRequirement(StatusEffect.SLEEP, 1, true)) // find at least one pokemon that ain't sleepin
    .withProtagonistPokemonRequirement(new StatusEffectRequirement(StatusEffect.FAINT, 1, true)) // that same pokemon better not be fainted
    .withOptionPhase(async (scene: BattleScene) => {
      const instance = scene.currentBattle.mysteryEncounter;
      pushDialogueTokensFromPokemon(instance);
      let roll:integer;
      scene.executeWithSeedOffset(() => {
        roll = Utils.randSeedInt(16, 0);
      }, scene.currentBattle.waveIndex);
      console.log(roll);
      if (roll > 4) {
        // Fall alseep and get a leftovers (75%)
        const p = instance.options[1].protagonistPokemon;
        p.trySetStatus(StatusEffect.SLEEP);
        p.updateInfo();
        setCustomEncounterRewards(scene, { guaranteedModifiers: [modifierTypes.LEFTOVERS], fillRemaining: false});
        await showEncounterText(scene, "mysteryEncounter:sleeping_snorlax_option_2_bad_result")
          .then(() => leaveEncounterWithoutBattle(scene));
        //await initBattleWithEnemyConfig(scene, scene.currentBattle.mysteryEncounter.enemyPartyConfigs[0]);
      } else {
        // Heal to full (25%)
        for (const pokemon of scene.getParty()) {
          pokemon.hp = pokemon.getMaxHp();
          pokemon.resetStatus();
          for (const move of pokemon.moveset) {
            move.ppUsed = 0;
          }
          pokemon.updateInfo(true);
        }

        await showEncounterText(scene, "mysteryEncounter:sleeping_snorlax_option_2_good_result")
          .then(() => leaveEncounterWithoutBattle(scene));


      }
    })
    .build())
  .withOption(new MysteryEncounterOptionBuilder()
    .withProtagonistPokemonRequirement(new MoveRequirement([Moves.PLUCK, Moves.COVET, Moves.KNOCK_OFF, Moves.THIEF, Moves.TRICK, Moves.SWITCHEROO]))
    .withOptionPhase(async (scene: BattleScene) => {
      // Leave encounter with no rewards or exp
      const instance = scene.currentBattle.mysteryEncounter;
      pushDialogueTokensFromPokemon(instance);
      setCustomEncounterRewards(scene, { guaranteedModifiers: [modifierTypes.LEFTOVERS], fillRemaining: false});
      await showEncounterText(scene, "mysteryEncounter:sleeping_snorlax_option_3_good_result").then(() => leaveEncounterWithoutBattle(scene));
    })
    .build())
  .build();
