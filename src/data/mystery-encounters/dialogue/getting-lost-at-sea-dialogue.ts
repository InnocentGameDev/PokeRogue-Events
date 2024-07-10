import MysteryEncounterDialogue from "#app/data/mystery-encounters/dialogue/mystery-encounter-dialogue";

export const GettingLostAtSeaDialogue: MysteryEncounterDialogue = {
  intro: [
    {
      text: "mysteryEncounter:getting_lost_intro_message",
    },
    {
      text: "mysteryEncounter:getting_lost_intro_dialogue",
    },
  ],
  encounterOptionsDialogue: {
    title: "mysteryEncounter:getting_lost_title",
    description: "mysteryEncounter:getting_lost_description",
    options: [
      {
        buttonLabel: "mysteryEncounter:getting_lost_option_1_label",
        buttonTooltip: "mysteryEncounter:getting_lost_option_1_tooltip",
        selected: [
          {
            text: "mysteryEncounter:getting_lost_option_1_selected",
          },
        ],
      },
      {
        buttonLabel: "mysteryEncounter:getting_lost_option_2_label",
        buttonTooltip: "mysteryEncounter:getting_lost_option_2_tooltip",
        selected: [
          {
            text: "mysteryEncounter:getting_lost_option_2_selected",
          },
        ],
      },
      {
        buttonLabel: "mysteryEncounter:getting_lost_option_3_label",
        buttonTooltip: "mysteryEncounter:getting_lost_option_3_tooltip",
        selected: [
          {
            text: "mysteryEncounter:getting_lost_option_2_selected",
          },
        ],
      },
    ],
  },
};
