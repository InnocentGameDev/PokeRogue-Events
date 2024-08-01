export const trashToTreasureDialogue = {
  intro: "It's a massive pile of garbage!\nWhere did this come from?",
  title: "Trash to Treasure",
  description: "The garbage heap looms over you, and you can spot some items of value buried amidst the refuse. Are you sure you want to get covered in filth to get them, though?",
  query: "What will you do?",
  option: {
    1: {
      label: "Dig for Valuables",
      tooltip: "(-) Become Covered in Filth\n(+) Gain Amazing Items",
      selected: `You wade through the garbage pile, becoming mired in filth.
        $There's no way any respectable shopkeepers\nwill sell you anything in your grimy state!
        $You'll just have to make do without shop healing items.
        $However, you found some incredible items in the garbage!`,
    },
    2: {
      label: "Investigate Further",
      tooltip: "(?) Find the Source of the Garbage",
      selected: "You wander around the heap, searching for any indication as to how this might have appeared here...",
      selected_2: "Suddenly, the garbage shifts! It wasn't just garbage, it's a Pokémon!"
    },
  },
};
