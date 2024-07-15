//import {
//  getHighestLevelPlayerPokemon,
//  koPlayerPokemon,
//  leaveEncounterWithoutBattle,
//  queueEncounterMessage,
//  setEncounterRewards,
//  showEncounterText,
//} from "#app/data/mystery-encounters/mystery-encounter-utils";
import { leaveEncounterWithoutBattle } from "#app/data/mystery-encounters/mystery-encounter-utils";
//import { mysteryEncounter } from "#app/locales/en/mystery-encounter";
//import { ModifierTier } from "#app/modifier/modifier-tier";
//import { GameOverPhase } from "#app/phases";
import { randSeedInt } from "#app/utils";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import i18next from "i18next";
import BattleScene from "../../../battle-scene";
import IMysteryEncounter, {
  MysteryEncounterBuilder,
  MysteryEncounterTier,
} from "../mystery-encounter";
import { EncounterOptionMode, MysteryEncounterOptionBuilder } from "../mystery-encounter-option";
import { Aura, AuraType, getAuraName } from "#app/data/mystery-encounters/mystery-encounter-data";

const namespace = "mysteryEncounter:choice_of_balance";

function generateRewards(numOptions: number): RewardOption[] {
  const negativeRewards = getNegativeRewards(numOptions);
  const positiveRewards = getPositiveRewards(numOptions);
  const rewardArray = [];
  for (let i = 0; i < negativeRewards.length; i++) {
    rewardArray.push(new RewardOption(negativeRewards[i], positiveRewards[i]));
  }

  return rewardArray;
}

export const ChoiceOfBalanceEncounter: IMysteryEncounter = MysteryEncounterBuilder
  .withEncounterType(MysteryEncounterType.CHOICE_OF_BALANCE)
  .withEncounterTier(MysteryEncounterTier.GREAT)
  .withIntroSpriteConfigs([
    {
      spriteKey: "686",
      fileRoot: "pokemon",
      hasShadow: true,
      x: 4,
      y: 8,
      scale: 2.5,
      disableAnimation: true // Re-enabled after option select
    }
  ])
  .withHideIntroVisuals(false)
  .withSceneWaveRangeRequirement(10, 180) // waves 10 to 180
  .withIntroDialogue([
    {
      text: `${namespace}_intro_message`,
    }
  ])
  .withOnInit((scene: BattleScene) => {
    const encounter = scene.currentBattle.mysteryEncounter;
    encounter.misc = [];
    console.log(encounter);

    const options = 2 + randSeedInt(2); // this makes a random number between 2 and 3 for the options

    const rewardsArray = generateRewards(options);

    for (let i = 0; i < rewardsArray.length; i++) {
      rewardsArray[i].generateStats();
      rewardsArray[i].generateAuras();
      if (rewardsArray[i].negativeStat > 0) {
        if (rewardsArray[i].negativeOption === NegativeRewards.ENEMY_STATS) {
          encounter.setDialogueToken("negativeEnemySTAT", getAuraName(rewardsArray[i].negativeStat));
        } else if (rewardsArray[i].negativeOption === NegativeRewards.PLAYER_STATS) {
          encounter.setDialogueToken("negativePlayerSTAT", getAuraName(rewardsArray[i].negativeStat));
        }
      }
      if (rewardsArray[i].positiveStat > 0) {
        if (rewardsArray[i].positiveOption === PositiveRewards.ENEMY_STATS) {
          encounter.setDialogueToken("positiveEnemySTAT", getAuraName(rewardsArray[i].positiveStat));
        } else if (rewardsArray[i].positiveOption === PositiveRewards.PLAYER_STATS) {
          encounter.setDialogueToken("positivePlayerSTAT", getAuraName(rewardsArray[i].positiveStat));
        }
      }
      encounter.misc.push(rewardsArray[i]);
    }

    encounter.setDialogueToken("dynamic1", rewardsArray[0].generateMessage());
    encounter.setDialogueToken("dynamic2", rewardsArray[1].generateMessage());
    if (options === 3) {
      encounter.setDialogueToken("dynamic3", rewardsArray[2].generateMessage());
    } else if (options === 2 && encounter.options.length === 3) {
      encounter.options.pop();
    }

    return true;
  })
  .withTitle(`${namespace}_title`)
  .withDescription(`${ namespace }_description`)
  .withQuery(`${namespace}_query`)
  .withOption(
    new MysteryEncounterOptionBuilder()
      .withOptionMode(EncounterOptionMode.DEFAULT)
      .withDialogue({
        buttonLabel: `${namespace}_option_1_label`,
        buttonTooltip: `${ namespace }_dynamic_option_1`,
        selected: [
          {
            text: `${namespace}_option_1_selected_message`,
          },
        ],
      })
      .withOptionPhase(async (scene: BattleScene) => {
        // Leave encounter with no rewards or exp
        //[const negativeAura, const positiveAura]
        leaveEncounterWithoutBattle(scene, true);
        return true;
      })
      .build()
  )
  .withSimpleOption(
    {
      buttonLabel: `${namespace}_option_2_label`,
      buttonTooltip: `${namespace}_dynamic_option_2`,
      selected: [
        {
          text: `${namespace}_option_2_selected_message`,
        },
      ],
    },
    async (scene: BattleScene) => {
    // Leave encounter with no rewards or exp
      leaveEncounterWithoutBattle(scene, true);
      return true;
    })
  .withSimpleOption(
    {
      buttonLabel: `${namespace}_option_3_label`,
      buttonTooltip: `${namespace}_dynamic_option_3`,
      selected: [
        {
          text: `${namespace}_option_3_selected_message`,
        },
      ],
    },
    async (scene: BattleScene) => {
      // Leave encounter with no rewards or exp
      leaveEncounterWithoutBattle(scene, true);
      return true;
    })
  .build();

export enum NegativeRewards {
  INCOME,
  LUCK,
  PLAYER_STATS,
  ENEMY_STATS,
  ADD_POKEMON,
  DAMAGE_TO_PLAYER,
  NO_REROLL
}

export enum PositiveRewards {
  INCOME = 1000, // starting at 1000 for positive so we can tell them apart between the negatives later
  LUCK,
  PLAYER_STATS,
  ENEMY_STATS,
  PP,
  INSTANT_MONEY,
  INSTANT_CANDY
}

export function getNegativeRewards(totalOptions: number): number[] {
  const negativeOptions = [];
  const numNegatives = Object.keys(NegativeRewards).filter(nr => !isNaN(Number(nr)));
  while (negativeOptions.length < totalOptions) {
    const roll = randSeedInt(numNegatives.length);
    if (!negativeOptions.includes(roll)) {
      negativeOptions.push(roll);
    }
  }
  return negativeOptions;
}

export function getPositiveRewards(totalOptions: number): number[] {
  const positiveOptions = [];
  const numPositives = Object.values(PositiveRewards).filter(pr => !isNaN(Number(pr)));
  while (positiveOptions.length < totalOptions) {
    const roll = randSeedInt(numPositives.length);
    if (!positiveOptions.includes(numPositives[roll])) {
      positiveOptions.push(numPositives[roll]);
    }
  }
  return positiveOptions;
}

export class RewardOption {
  public negativeOption: number;
  public positiveOption: number;
  public negativeStat = -1;
  public positiveStat = -1;
  public negativeAura: Aura;
  public positiveAura: Aura;

  constructor(negativeOption: number, positiveOption: number) {
    this.negativeOption = negativeOption;
    this.positiveOption = positiveOption;
  }

  generateMessage(): string {
    const [negativeType, negativeText, negativeStrength, negativeDuration] = this.getRewardInfo(this.negativeOption);
    const [positiveType, positiveText, positiveStrength, positiveDuration] = this.getRewardInfo(this.positiveOption);
    const outputMessage: string[] = [];
    outputMessage.push(this.getDescriptorText(negativeText));
    if (this.formattedStrengths(negativeType, negativeStrength) !== "") {
      outputMessage.push(this.formattedStrengths(negativeType, negativeStrength));
    }
    outputMessage.push(this.getDescriptorText("for"));
    outputMessage.push(this.formattedWaves(negativeDuration));
    outputMessage.push(this.getDescriptorText("then"));
    outputMessage.push(this.getDescriptorText(positiveText));
    if (this.formattedStrengths(positiveType, positiveStrength) !== "") {
      outputMessage.push(this.formattedStrengths(positiveType, positiveStrength));
    }
    if (positiveDuration !== 0) {
      outputMessage.push(this.getDescriptorText("for"));
    }
    outputMessage.push(this.formattedWaves(positiveDuration));
    return outputMessage.join(" ");
  }

  getRewardInfo(reward: number): [index: number, dialogueName: string, auraStrength: number, auraDuration: number] {
    //if (Object.values(PositiveRewards).includes(reward) || Object.values(NegativeRewards).includes(reward)) {
    return statMessageIndex.find(r => r[0] === reward);
    //return statMessageIndex.filter(r => r[0] === reward)[1];
    //}
  }

  private formattedStrengths(type: number, strength: number): string {
    let newStrength: string;
    switch (type) {
    // These are for percentages
    case NegativeRewards.INCOME:
    case NegativeRewards.DAMAGE_TO_PLAYER:
    case PositiveRewards.INCOME:
    case PositiveRewards.PP:
      newStrength = String(Math.abs(strength * 100)) + "%";
      break;
      // These are for single numbers (i.e. stat stage increase/decrease, luck increase/decrease etc)
    case NegativeRewards.LUCK:
    case NegativeRewards.PLAYER_STATS:
    case NegativeRewards.ENEMY_STATS:
    case PositiveRewards.LUCK:
    case PositiveRewards.PLAYER_STATS:
    case PositiveRewards.ENEMY_STATS:
      newStrength = String(Math.abs(strength));
      break;
      // These are for exceptions that don't have a strength
    case NegativeRewards.ADD_POKEMON:
    case NegativeRewards.NO_REROLL:
    case PositiveRewards.INSTANT_CANDY:
      newStrength = "";
      break;
      // These are for money rewards
    case PositiveRewards.INSTANT_MONEY:
      newStrength = "$" + String(strength);
      break;
    default:
      console.log("Missing formattedStrengths!!!");
      newStrength = "Missing formattedStrengths";
      break;
    }
    return newStrength;
  }

  private formattedWaves(duration: number): string {
    let waveDuration: string;
    if (duration < 0) {
      waveDuration = this.getDescriptorText("rest_of_run");
    } else if (duration === 0) {
      waveDuration = this.getDescriptorText("instantly");
    } else if (duration > 0) {
      waveDuration = String(duration) + " " + this.getDescriptorText("waves");
    }
    return waveDuration;
  }

  private getDescriptorText(text: string) {
    return i18next.t(namespace + "_" + text);
  }

  generateStats() {
    const statArray = [AuraType.ATK, AuraType.SPATK, AuraType.DEF, AuraType.SPDEF, AuraType.SPD, AuraType.EVA, AuraType.ACC];
    if (this.negativeStat < 0 && (this.negativeOption === NegativeRewards.ENEMY_STATS || this.negativeOption === NegativeRewards.PLAYER_STATS)) {
      this.negativeStat = statArray[randSeedInt(statArray.length)];
    }
    if (this.positiveStat < 0 && (this.positiveOption === PositiveRewards.PLAYER_STATS || this.positiveOption === PositiveRewards.ENEMY_STATS)) {
      this.positiveStat = statArray[randSeedInt(statArray.length)];
    }
  }

  generateAuras() {
    const [negativeType, negativeText, negativeStrength, negativeDuration] = this.getRewardInfo(this.negativeOption);
    const [positiveType, positiveText, positiveStrength, positiveDuration] = this.getRewardInfo(this.positiveOption);
    console.log(negativeText + ", " + positiveText);
    this.negativeAura = new Aura([-1], negativeStrength, negativeDuration, getAuraName(this.convertRewardsToAura(negativeType)), 0, 0);
    this.positiveAura = new Aura([-1], positiveStrength, positiveDuration, getAuraName(this.convertRewardsToAura(positiveType)), 0, negativeDuration);
  }

  convertRewardsToAura(reward: number): number {
    const statArray = [AuraType.ATK, AuraType.SPATK, AuraType.DEF, AuraType.SPDEF, AuraType.SPD, AuraType.EVA, AuraType.ACC];
    switch (reward) {
    case NegativeRewards.INCOME:
      return AuraType.INCOME;
    case NegativeRewards.LUCK:
      return AuraType.LUCK;
    case NegativeRewards.PLAYER_STATS:
    case NegativeRewards.ENEMY_STATS:
      return statArray[this.negativeStat];
    case NegativeRewards.ADD_POKEMON:
    case NegativeRewards.DAMAGE_TO_PLAYER:
    case NegativeRewards.NO_REROLL:
      return -1;
    case PositiveRewards.INCOME:
      return AuraType.INCOME;
    case PositiveRewards.LUCK:
      return AuraType.LUCK;
    case PositiveRewards.PLAYER_STATS:
    case PositiveRewards.ENEMY_STATS:
      return statArray[this.positiveStat];
    case PositiveRewards.PP:
      return AuraType.PP;
    case PositiveRewards.INSTANT_MONEY:
      return AuraType.MONEY;
    case PositiveRewards.INSTANT_CANDY:
      return AuraType.CANDY;
    }
  }
}

const statMessageIndex: [index: number, dialogueName: string, auraStrength: number, auraDuration: number][] = [
  [NegativeRewards.INCOME, "negative_income", -0.4, 5],
  [NegativeRewards.LUCK, "negative_luck", 0, 15],
  [NegativeRewards.PLAYER_STATS, "negative_player_stats", -1, 10],
  [NegativeRewards.ENEMY_STATS, "negative_enemy_stats", 1, 8],
  [NegativeRewards.ADD_POKEMON, "negative_add_pokemon", 0, 15],
  [NegativeRewards.DAMAGE_TO_PLAYER, "negative_damage_to_player", 0.1, 5],
  [NegativeRewards.NO_REROLL, "negative_no_reroll", 0, 7],
  [PositiveRewards.INCOME, "positive_income", 0.7, -1],
  [PositiveRewards.LUCK, "positive_luck", 5, -1],
  [PositiveRewards.PLAYER_STATS, "positive_player_stats", 1, 13],
  [PositiveRewards.ENEMY_STATS, "positive_enemy_stats", -1, 12],
  [PositiveRewards.PP, "positive_pp_chance", 0.2, 40],
  [PositiveRewards.INSTANT_MONEY, "positive_instant_money", 5000, 0],
  [PositiveRewards.INSTANT_CANDY, "positive_instant_candy", 0, 0]
];
