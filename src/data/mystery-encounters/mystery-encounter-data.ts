import { MysteryEncounterTier } from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import { BASE_MYSTERY_ENCOUNTER_SPAWN_WEIGHT } from "#app/data/mystery-encounters/mystery-encounters";
import { isNullOrUndefined } from "#app/utils";
//import { time } from "console";

export class MysteryEncounterData {
  encounteredEvents: [MysteryEncounterType, MysteryEncounterTier][] = [];
  encounterSpawnChance: number = BASE_MYSTERY_ENCOUNTER_SPAWN_WEIGHT;
  nextEncounterQueue: [MysteryEncounterType, integer][] = [];

  constructor(flags: MysteryEncounterData) {
    if (!isNullOrUndefined(flags)) {
      Object.assign(this, flags);
    }
  }
}

export class MysteryEncounterAuras {
  public playerAura: Aura[];

  constructor() {
    this.playerAura = [];
  }

  AddAura(target: number[], auraStrength: number, duration: number, auraType: string, team: number, timeUntilActive: number = 0) {
    this.playerAura.push(new Aura(target, auraStrength, duration, auraType, team, timeUntilActive));
  }

  UpdateAurasDurations() {
    for (let i = 0; i < this.playerAura.length; i++) {
      if (this.playerAura[i].timeUntilActive !== 0) {
        this.playerAura[i].timeUntilActive -= 1;
      } else {
        if (this.playerAura[i].duration > 0) {
          this.playerAura[i].duration -= 1;
        }
      }
    }
    this.playerAura = this.playerAura.filter(aura => aura.duration !== 0);
  }

  FindAuraTotals(auraType: string): number {
    let total = 0;
    const filteredAuras = this.FindAura(auraType);
    if (filteredAuras.length > 0) {
      for (let i = 0; i < filteredAuras.length; i++) {
        const auraValue = filteredAuras[i].auraStrength;
        if (auraType === getAuraName(AuraType.LUCK) && auraValue === 0) { // this is used to check if luck has "Set to 0"
          total = 0.5;
          break;
        }
        total += filteredAuras[i].timeUntilActive > 0 ? 0 : auraValue; // this checks to make sure the aura is active before adding it to our totals
      }
    }
    return total;
  }

  FindAura(auraType: string): Aura[] {
    return this.playerAura.filter(auras => auras.auraType === auraType);
  }
}

export class Aura {
  public target: number[]; // this can be used to target specific pokemon (using an array of pokemon ID) or all pokemon (using [-1])
  public auraStrength: number; // this is the amount boosted/reduced - can be positive or negative
  public duration: number; // this is how many waves the aura lasts for; use a number > 0 for timed auras, or -1 for auras for the rest of the game
  public auraType: string; // this is the aura type - for now, for example, what stat will be changed
  public team: number; // this is the team. I think this will eventually be an enum - something like Team.PLAYER, Team.ENEMY, Team.ALL to target the player, enemy or everyone respectively.
  public timeUntilActive: number; // this will be the amount of waves until an aura is active; for example, a positive aura being activated when a negative one runs out.

  constructor(target: number[], auraStrength: number, duration: number, auraType: string, team: number, timeUntilActive: number) {
    this.target = target;
    this.auraStrength = auraStrength;
    this.duration = duration;
    this.auraType = auraType;
    this.team = team;
    this.timeUntilActive = timeUntilActive;
  }
}

export enum TeamTarget {
  ALL,
  PLAYER,
  ENEMY
}

export enum AuraType {
  INCOME,
  MONEY,
  ATK,
  SPATK,
  DEF,
  SPDEF,
  SPD,
  EVA,
  ACC,
  LUCK,
  XP
}

export function getAuraName(aura: AuraType) {
  switch (aura) {
  case AuraType.INCOME:
    return "INCOME";
  case AuraType.MONEY:
    return "MONEY";
  case AuraType.ATK:
    return "ATK";
  case AuraType.SPATK:
    return "SP. ATK";
  case AuraType.DEF:
    return "DEF";
  case AuraType.SPDEF:
    return "SP. DEF";
  case AuraType.SPD:
    return "SPEED";
  case AuraType.ACC:
    return "ACC";
  case AuraType.EVA:
    return "EVA";
  case AuraType.LUCK:
    return "LUCK";
  case AuraType.XP:
    return "EXP";
  default:
    return "???";
  }
}
