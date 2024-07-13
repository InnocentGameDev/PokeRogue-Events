import MysteryEncounterDialogue from "#app/data/mystery-encounters/mystery-encounter-dialogue";

export const ChoiceOfBalanceDialogue: MysteryEncounterDialogue = {
  intro: [
    {
      text: "mysteryEncounter:choice_of_balance_intro_message"
    }
  ],
  encounterOptionsDialogue: {
    title: "mysteryEncounter:choice_of_balance_title",
    description: "mysteryEncounter:choice_of_balance_description",
    query: "mysteryEncounter:choice_of_balance_query",
    options: [
      {
        buttonLabel: "mysteryEncounter:choice_of_balance_option_1_label",
        buttonTooltip: "mysteryEncounter:choice_of_balance_option_1_tooltip",
        selected: [
          {
            text: "mysteryEncounter:choice_of_balance_option_selected_message"
          }
        ]
      },
      {
        buttonLabel: "mysteryEncounter:choice_of_balance_option_2_label",
        buttonTooltip: "mysteryEncounter:choice_of_balance_option_2_tooltip",
        selected: [
          {
            text: "mysteryEncounter:choice_of_balance_option_selected_message"
          }
        ]
      }
    ]
  }
};
