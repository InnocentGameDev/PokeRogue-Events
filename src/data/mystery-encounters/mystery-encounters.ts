import MysteryEncounter from "../mystery-encounter";
import {DarkDealEncounter} from "./dark-deal";
import {MysteriousChallengersEncounter} from "./mysterious-challengers";
import {MysteriousChestEncounter} from "./mysterious-chest";
import {FightOrFlightEncounter} from "#app/data/mystery-encounters/fight-or-flight";
import {TrainingSessionEncounter} from "#app/data/mystery-encounters/training-session";

// TODO: reset BASE_MYSTYERY_ENCOUNTER_WEIGHT to 3, 90 is for test branch
export const BASE_MYSTYERY_ENCOUNTER_WEIGHT = 90;
import { Biome } from "#app/enums/biome";
import { SleepingSnorlaxEncounter } from "./sleeping-snorlax";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";

export const allMysteryEncounters : {[encounterType:string]: MysteryEncounter} = {};

// Only add your MysterEncounter here if you want it to be in every biome.
// We recommend designing biome-specific encounters for better flavor and variance
export function initMysteryEncounters() {
  allMysteryEncounters[MysteryEncounterType.MYSTERIOUS_CHALLENGERS] = MysteriousChallengersEncounter;
  allMysteryEncounters[MysteryEncounterType.MYSTERIOUS_CHEST] = MysteriousChestEncounter;
  allMysteryEncounters[MysteryEncounterType.DARK_DEAL] =  DarkDealEncounter;
  allMysteryEncounters[MysteryEncounterType.FIGHT_OR_FLIGHT] = FightOrFlightEncounter;
  allMysteryEncounters[MysteryEncounterType.TRAINING_SESSION] = TrainingSessionEncounter;
  allMysteryEncounters[MysteryEncounterType.SLEEPING_SNORLAX] = SleepingSnorlaxEncounter;

  for (const biome of mysteryEncountersByBiome.keys()) {
    mysteryEncountersByBiome.get(biome).push(
      MysteryEncounterType.MYSTERIOUS_CHALLENGERS,
      MysteryEncounterType.MYSTERIOUS_CHEST,
      MysteryEncounterType.DARK_DEAL,
      MysteryEncounterType.FIGHT_OR_FLIGHT,
      MysteryEncounterType.TRAINING_SESSION
    );
  }
}


// Add your MysteryEncounter to a biome to enable it to show up in that biome.
export const mysteryEncountersByBiome = new Map<Biome, MysteryEncounterType[]>([
  [Biome.TOWN, [
  ]],
  [Biome.PLAINS,[
    MysteryEncounterType.SLEEPING_SNORLAX
  ]],
  [Biome.GRASS, [
    MysteryEncounterType.SLEEPING_SNORLAX
  ]],
  [Biome.TALL_GRASS, [

  ]],
  [Biome.METROPOLIS, [

  ]],
  [Biome.FOREST, [
    MysteryEncounterType.SLEEPING_SNORLAX
  ]],

  [Biome.SEA, [

  ]],
  [Biome.SWAMP, [

  ]],
  [Biome.BEACH, [

  ]],
  [Biome.LAKE, [

  ]],
  [Biome.SEABED, [

  ]],
  [Biome.MOUNTAIN, [
    MysteryEncounterType.SLEEPING_SNORLAX
  ]],
  [Biome.BADLANDS, [

  ]],
  [Biome.CAVE, [
    MysteryEncounterType.SLEEPING_SNORLAX
  ]],
  [Biome.DESERT, [

  ]],
  [Biome.ICE_CAVE, [

  ]],
  [Biome.MEADOW, [

  ]],
  [Biome.POWER_PLANT, [

  ]],
  [Biome.VOLCANO, [

  ]],
  [Biome.GRAVEYARD, [

  ]],
  [Biome.DOJO, [

  ]],
  [Biome.FACTORY, [

  ]],
  [Biome.RUINS, [

  ]],
  [Biome.WASTELAND, [

  ]],
  [Biome.ABYSS, [

  ]],
  [Biome.SPACE, [

  ]],
  [Biome.CONSTRUCTION_SITE, [

  ]],
  [Biome.JUNGLE, [

  ]],
  [Biome.FAIRY_CAVE, [

  ]],
  [Biome.TEMPLE, [

  ]],
  [Biome.SLUM, [

  ]],
  [Biome.SNOWY_FOREST, [

  ]],
  [Biome.ISLAND, [

  ]],
  [Biome.LABORATORY, [

  ]]
]);


