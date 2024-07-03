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
import MysteryEncounter, {MysteryEncounterBuilder, MysteryEncounterTier} from "../mystery-encounter";
import * as Utils from "../../utils";
import {MysteryEncounterType} from "#enums/mystery-encounter-type";
import {MoveRequirement, WaveCountRequirement} from "../mystery-encounter-requirements";
import {MysteryEncounterOptionBuilder} from "../mystery-encounter-option";
import {
  BerryModifierType,
  ModifierTypeOption,
  modifierTypes
} from "#app/modifier/modifier-type";
import { getPokemonSpecies } from "../pokemon-species";
import { Species } from "#enums/species";
import { StatusEffect } from "../status-effect";
import { Moves } from "#enums/moves";
import { SummonPhase } from "#app/phases";
import { BerryType } from "#enums/berry-type";

export const SleepingSnorlaxEncounter: MysteryEncounter = new MysteryEncounterBuilder()
  .withEncounterType(MysteryEncounterType.SLEEPING_SNORLAX)
  .withEncounterTier(MysteryEncounterTier.UNCOMMON)
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
      levelAdditiveMultiplier: 2,
      pokemonConfigs: [pokemonConfig]
    };
    instance.enemyPartyConfigs = [config];

    // Calculate item
    // 1-60 ULTRA, 60-120 ROGUE, 120+ MASTER
    return true;
  })
  .withOption(new MysteryEncounterOptionBuilder()
    .withOptionPhase(async (scene: BattleScene) => {
      // Pick battle
      // Do we want special rewards for this?
      // setCustomEncounterRewards(scene, { guaranteedModifierTypeOptions: [new ModifierTypeOption(modifierTypes.LEFTOVERS(), 0)], fillRemaining: true});
      await initBattleWithEnemyConfig(scene, scene.currentBattle.mysteryEncounter.enemyPartyConfigs[0]);
    })
    .build())
  .withOption(new MysteryEncounterOptionBuilder()
    .withOptionPhase(async (scene: BattleScene) => {
      const instance = scene.currentBattle.mysteryEncounter;
      pushDialogueTokensFromPokemon(instance);
      console.log(instance);
      let roll:integer;
      scene.executeWithSeedOffset(() => {
        roll = Utils.randSeedInt(16, 0);
      }, scene.currentBattle.waveIndex);
      if (roll > 4) {
        // Fall asleep and get a berry (75%)
        const p = instance.primaryPokemon;
        p.trySetStatus(StatusEffect.SLEEP);
        p.updateInfo();
        setCustomEncounterRewards(scene, { guaranteedModifierTypeOptions: [new ModifierTypeOption(new BerryModifierType(BerryType.SITRUS), 0)], fillRemaining: false});
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
    .withPrimaryPokemonRequirement(new MoveRequirement([Moves.PLUCK, Moves.COVET, Moves.KNOCK_OFF, Moves.THIEF, Moves.TRICK, Moves.SWITCHEROO]))
    .withOptionPhase(async (scene: BattleScene) => {
      // Leave encounter with no rewards or exp
      const instance = scene.currentBattle.mysteryEncounter;
      pushDialogueTokensFromPokemon(instance);
      setCustomEncounterRewards(scene, { guaranteedModifierTypeOptions: [new ModifierTypeOption(modifierTypes.LEFTOVERS(), 0)], fillRemaining: false});
      await showEncounterText(scene, "mysteryEncounter:sleeping_snorlax_option_3_good_result").then(() => leaveEncounterWithoutBattle(scene));
    })
    .build())
  .build();
