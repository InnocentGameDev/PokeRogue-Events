import {
  getHighestLevelPlayerPokemon,
  koPlayerPokemon,
  leaveEncounterWithoutBattle,
  queueEncounterMessage,
  setEncounterRewards,
  showEncounterText,
} from "#app/data/mystery-encounters/mystery-encounter-utils";
import { ModifierTier } from "#app/modifier/modifier-tier";
import { GameOverPhase } from "#app/phases";
import { randSeedInt } from "#app/utils";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import BattleScene from "../../../battle-scene";
import IMysteryEncounter, {
  MysteryEncounterBuilder,
  MysteryEncounterTier,
} from "../mystery-encounter";
import { EncounterOptionMode, MysteryEncounterOptionBuilder } from "../mystery-encounter-option";
//import { AuraType, getAuraName } from "#app/data/mystery-encounters/mystery-encounter-data";

const namespace = "mysteryEncounter:choice_of_balance";

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
  .withTitle(`${namespace}_title`)
  .withDescription(`${ namespace }_description`)
  .withQuery(`${namespace}_query`)
  .withOption(
    new MysteryEncounterOptionBuilder()
      .withOptionMode(EncounterOptionMode.DEFAULT)
      .withDialogue({
        buttonLabel: `${namespace}_option_1_label`,
        buttonTooltip: `${ namespace }_option_1_tooltip`,
        selected: [
          {
            text: `${namespace}_option_1_selected_message`,
          },
        ],
      })
      .withOptionPhase(async (scene: BattleScene) => {
      // Open the chest
        let roll = randSeedInt(100);
        const negativeRewards = getNegativeRewards(2);
        const positiveRewards = getPositiveRewards(2);
        console.log(negativeRewards);
        console.log(positiveRewards);
        roll = 100;
        if (roll > 60) {
        // Choose between 2 COMMON / 2 GREAT tier items (40%)
          setEncounterRewards(scene, { guaranteedModifierTiers: [ModifierTier.COMMON, ModifierTier.COMMON, ModifierTier.GREAT, ModifierTier.GREAT] });
          // Display result message then proceed to rewards
          queueEncounterMessage(scene, `${namespace}_option_1_normal_result`);
          leaveEncounterWithoutBattle(scene);
        } else if (roll > 40) {
        // Choose between 3 ULTRA tier items (20%)
          setEncounterRewards(scene, { guaranteedModifierTiers: [ModifierTier.ULTRA, ModifierTier.ULTRA, ModifierTier.ULTRA] });
          // Display result message then proceed to rewards
          queueEncounterMessage(scene, `${namespace}_option_1_good_result`);
          leaveEncounterWithoutBattle(scene);
        } else if (roll > 36) {
        // Choose between 2 ROGUE tier items (4%)
          setEncounterRewards(scene, { guaranteedModifierTiers: [ModifierTier.ROGUE, ModifierTier.ROGUE] });
          // Display result message then proceed to rewards
          queueEncounterMessage(scene, `${namespace}_option_1_great_result`);
          leaveEncounterWithoutBattle(scene);
        } else if (roll > 35) {
        // Choose 1 MASTER tier item (1%)
          setEncounterRewards(scene, { guaranteedModifierTiers: [ModifierTier.MASTER] });
          // Display result message then proceed to rewards
          queueEncounterMessage(scene, `${namespace}_option_1_amazing_result`);
          leaveEncounterWithoutBattle(scene);
        } else {
        // Your highest level unfainted Pok�mon gets OHKO. Progress with no rewards (35%)
          const highestLevelPokemon = getHighestLevelPlayerPokemon(scene, true);
          koPlayerPokemon(highestLevelPokemon);

          scene.currentBattle.mysteryEncounter.setDialogueToken("pokeName", highestLevelPokemon.name);
          // Show which Pokemon was KOed, then leave encounter with no rewards
          // Does this synchronously so that game over doesn't happen over result message
          await showEncounterText(scene, `${namespace}_option_1_bad_result`)
            .then(() => {
              if (scene.getParty().filter(p => p.isAllowedInBattle()).length === 0) {
              // All pokemon fainted, game over
                scene.clearPhaseQueue();
                scene.unshiftPhase(new GameOverPhase(scene));
              } else {
                leaveEncounterWithoutBattle(scene);
              }
            });
        }
      })
      .build()
  )
  .withSimpleOption(
    {
      buttonLabel: `${namespace}_option_2_label`,
      buttonTooltip: `${namespace}_option_2_tooltip`,
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
      negativeOptions.push(NegativeRewards[roll]);
    }
  }
  return negativeOptions;
}

export function getPositiveRewards(totalOptions: number): number[] {
  const positiveOptions = [];
  const numPositives = Object.values(PositiveRewards).filter(pr => !isNaN(Number(pr)));
  while (positiveOptions.length < totalOptions) {
    const roll = randSeedInt(numPositives.length);
    if (!positiveOptions.includes(roll)) {
      positiveOptions.push(PositiveRewards[numPositives[roll]]);
    }
  }
  return positiveOptions;
}

export class RewardOption {
  public negativeOption: number;
  public positiveOption: number;

  constructor(negativeOption: number, positiveOption: number) {
    this.negativeOption = negativeOption;
    this.positiveOption = positiveOption;
  }

  generateMessage(): string {
    const negativeInfo = this.getRewardInfo(this.negativeOption);
    //const positiveInfo = this.getRewardInfo(this.positiveOption);
    let outputMessage = this.descriptorText(negativeInfo[1]);
    console.log(this.formattedStrengths(NegativeRewards.ADD_POKEMON));
    outputMessage += this.descriptorText("for");
    outputMessage = negativeInfo[1];
    return outputMessage;

  }

  getRewardInfo(reward: number): [index: number, dialogueName: string, auraStrength: number, auraDuration: number] {
    //if (Object.values(PositiveRewards).includes(reward) || Object.values(NegativeRewards).includes(reward)) {
    return statMessageIndex.find(r => r[0] === reward);
    //return statMessageIndex.filter(r => r[0] === reward)[1];
    //}
  }

  private formattedStrengths(strength: number): string {
    let newStrength: string;
    switch (strength) {
    case NegativeRewards.INCOME:
    case NegativeRewards.DAMAGE_TO_PLAYER:
    case PositiveRewards.INCOME:
    case PositiveRewards.PP:
      newStrength = String(Math.abs(strength * 100));
    case NegativeRewards.LUCK:
    case NegativeRewards.PLAYER_STATS:
    case NegativeRewards.ENEMY_STATS:
    case PositiveRewards.LUCK:
    case PositiveRewards.PLAYER_STATS:
    case PositiveRewards.ENEMY_STATS:
    case NegativeRewards.PLAYER_STATS:
      newStrength = String(Math.abs(strength));
    case NegativeRewards.ADD_POKEMON:
    case NegativeRewards.NO_REROLL:
      newStrength = "";
    }
    return newStrength;
  }

  private descriptorText(text: string) {
    return "mysteryEncounter:choice_of_balance_" + text;
  }
}

const statMessageIndex: [index: number, dialogueName: string, auraStrength: number, auraDuration: number][] = [
  [NegativeRewards.INCOME, "choice_of_balance_negative_income", -0.4, 5],
  [NegativeRewards.LUCK, "choice_of_balance_negative_luck", 0, 15],
  [NegativeRewards.PLAYER_STATS, "choice_of_balance_negative_player_stats", -1, 10],
  [NegativeRewards.ENEMY_STATS, "choice_of_balance_negative_enemy_stats", 1, 8],
  [NegativeRewards.ADD_POKEMON, "choice_of_balance_negative_add_pokemon", 0, 15],
  [NegativeRewards.DAMAGE_TO_PLAYER, "choice_of_balance_negative_damage_to_player", 0.1, 5],
  [NegativeRewards.NO_REROLL, "choice_of_balance_negative_no_reroll", 0, 7],
  [PositiveRewards.INCOME, "choice_of_balance_positive_income", 0.7, -1],
  [PositiveRewards.LUCK, "choice_of_balance_positive_luck", 5, -1],
  [PositiveRewards.PLAYER_STATS, "choice_of_balance_positive_player_stats", 1, 13],
  [PositiveRewards.ENEMY_STATS, "choice_of_balance_positive_enemy_stats", -1, 12],
  [PositiveRewards.PP, "choice_of_balance_positive_pp_chance", 0.2, 40],
  [PositiveRewards.INSTANT_MONEY, "choice_of_balance_positive_instant_money", 5000, 0],
  [PositiveRewards.INSTANT_CANDY, "choice_of_balance_positive_instant_candy", 0, 0]
];
