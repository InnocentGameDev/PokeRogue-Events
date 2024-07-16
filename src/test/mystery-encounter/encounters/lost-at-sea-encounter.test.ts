import Battle from "#app/battle.js";
import { LostAtSeaEncounter } from "#app/data/mystery-encounters/encounters/lost-at-sea-encounter";
import { EncounterOptionMode } from "#app/data/mystery-encounters/mystery-encounter-option";
import { MysteryEncounterTier } from "#app/data/mystery-encounters/mystery-encounter.js";
import * as MysteryEncounters from "#app/data/mystery-encounters/mystery-encounters";
import { Biome } from "#app/enums/biome.js";
import { Button } from "#app/enums/buttons.js";
import { Moves } from "#app/enums/moves";
import { MysteryEncounterType } from "#app/enums/mystery-encounter-type";
import { Species } from "#app/enums/species.js";
import { MessagePhase } from "#app/phases.js";
import { MysteryEncounterOptionSelectedPhase, MysteryEncounterPhase } from "#app/phases/mystery-encounter-phase.js";
import GameManager from "#app/test/utils/gameManager.js";
import { workaround_reInitSceneWithOverrides } from "#app/test/utils/testUtils.js";
import MysteryEncounterUiHandler from "#app/ui/mystery-encounter-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const namepsace = "mysteryEncounter:lostAtSea";

describe("Lost at Sea - Mystery Encounter", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override.mysteryEncounterChance(100);
    game.override.startingBiome(Biome.SEA);
    vi.spyOn(MysteryEncounters, "allMysteryEncounters", "get").mockReturnValue({ [MysteryEncounterType.LOST_AT_SEA]: LostAtSeaEncounter });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  it("should have the correct properties", async () => {
    await game.runToMysteryEncounter([Species.ABRA]);

    expect(LostAtSeaEncounter.encounterType).toBe(MysteryEncounterType.LOST_AT_SEA);
    expect(LostAtSeaEncounter.dialogue).toBeDefined();
    expect(LostAtSeaEncounter.dialogue.intro).toStrictEqual([{ text: `${namepsace}:intro` }]);
    expect(LostAtSeaEncounter.dialogue.encounterOptionsDialogue.title).toBe(`${namepsace}:title`);
    expect(LostAtSeaEncounter.dialogue.encounterOptionsDialogue.description).toBe(`${namepsace}:description`);
    expect(LostAtSeaEncounter.dialogue.encounterOptionsDialogue.query).toBe(`${namepsace}:query`);
    expect(LostAtSeaEncounter.options.length).toBe(3);
  });

  it("should not run below wave 11", async () => {
    game.override.startingWave(10);

    await game.runToMysteryEncounter();

    const { currentBattle } = game.scene;
    expect(currentBattle).toBeDefined();
    expect(currentBattle.mysteryEncounter).toBeUndefined();
  });

  it("should not run above wave 179", async () => {
    game.override.startingWave(180);

    await game.runToMysteryEncounter();

    const { currentBattle } = game.scene;
    expect(currentBattle).toBeDefined();
    expect(currentBattle.mysteryEncounter).toBeUndefined();
  });

  it("should set the correct dialog tokens during initialization", () => {
    vi.spyOn(game.scene, "currentBattle", "get").mockReturnValue({ mysteryEncounter: LostAtSeaEncounter } as Battle);

    const { onInit } = LostAtSeaEncounter;

    expect(LostAtSeaEncounter.onInit).toBeDefined();

    const onInitResult = onInit(game.scene);

    expect(LostAtSeaEncounter.dialogueTokens?.damagePercentage).toBe("25");
    expect(LostAtSeaEncounter.dialogueTokens?.option1RequiredMove).toBe(Moves[Moves.SURF]);
    expect(LostAtSeaEncounter.dialogueTokens?.option2RequiredMove).toBe(Moves[Moves.FLY]);
    expect(onInitResult).toBe(true);
  });

  describe("Option 1 - Surf", () => {
    it("should have the correct properties", () => {
      const option1 = LostAtSeaEncounter.options[0];
      expect(option1.optionMode).toBe(EncounterOptionMode.DISABLED_OR_DEFAULT);
      expect(option1.dialogue).toBeDefined();
      expect(option1.dialogue).toStrictEqual({
        buttonLabel: `${namepsace}:option:1:label`,
        disabledButtonLabel: `${namepsace}:option:1:label_disabled`,
        buttonTooltip: `${namepsace}:option:1:tooltip`,
        disabledButtonTooltip: `${namepsace}:option:1:tooltip_disabled`,
        selected: [
          {
            text: `${namepsace}:option:1:selected`,
          },
        ],
      });
    });
  });

  describe("Option 2 - Fly", () => {
    it("should have the correct properties", () => {
      const option2 = LostAtSeaEncounter.options[1];

      expect(option2.optionMode).toBe(EncounterOptionMode.DISABLED_OR_DEFAULT);
      expect(option2.dialogue).toBeDefined();
      expect(option2.dialogue).toStrictEqual({
        buttonLabel: `${namepsace}:option:2:label`,
        disabledButtonLabel: `${namepsace}:option:2:label_disabled`,
        buttonTooltip: `${namepsace}:option:2:tooltip`,
        disabledButtonTooltip: `${namepsace}:option:2:tooltip_disabled`,
        selected: [
          {
            text: `${namepsace}:option:2:selected`,
          },
        ],
      });
    });
  });

  describe("Option 3 - Wander aimlessy", () => {
    it("should have the correct properties", () => {
      const option3 = LostAtSeaEncounter.options[2];

      expect(option3.optionMode).toBe(EncounterOptionMode.DEFAULT);
      expect(option3.dialogue).toBeDefined();
      expect(option3.dialogue).toStrictEqual({
        buttonLabel: `${namepsace}:option:3:label`,
        buttonTooltip: `${namepsace}:option:3:tooltip`,
        selected: [
          {
            text: `${namepsace}:option:3:selected`,
          },
        ],
      });
    });

    it("should apply 25% damage to all Pokemon", async () => {
      game.override.startingWave(33);

      workaround_reInitSceneWithOverrides(game);
      await game.runToMysteryEncounter([Species.ABRA]);

      game.onNextPrompt("MysteryEncounterPhase", Mode.MESSAGE, () => {
        const uiHandler = game.scene.ui.getHandler<MysteryEncounterUiHandler>();
        uiHandler.processInput(Button.ACTION);
      });
      game.onNextPrompt("MysteryEncounterPhase", Mode.MYSTERY_ENCOUNTER, () => {
        const uiHandler = game.scene.ui.getHandler<MysteryEncounterUiHandler>();
        uiHandler.unblockInput();
        uiHandler.processInput(Button.DOWN);
        uiHandler.processInput(Button.ACTION);
      });

      /** There is some inconsistency in the phase order here. Probably because of the workaround */
      if (game.isCurrentPhase(MessagePhase)) {
        game.onNextPrompt("MessagePhase", Mode.MESSAGE, () => {
          const uiHandler = game.scene.ui.getHandler<MysteryEncounterUiHandler>();
          uiHandler.processInput(Button.ACTION);
        });
        await game.phaseInterceptor.run(MessagePhase);
      }

      await game.phaseInterceptor.run(MysteryEncounterPhase);

      const { encounteredEvents } = game.scene.mysteryEncounterData;
      expect(encounteredEvents.some(([type, tier]) => type === MysteryEncounterType.LOST_AT_SEA && tier === MysteryEncounterTier.COMMON)).toBe(true);

      game.onNextPrompt("MysteryEncounterOptionSelectedPhase", Mode.MESSAGE, () => {
        const uiHandler = game.scene.ui.getHandler<MysteryEncounterUiHandler>();
        uiHandler.processInput(Button.ACTION);
      });
      await game.phaseInterceptor.run(MysteryEncounterOptionSelectedPhase);

      const party = game.scene.getParty();
      party.forEach((pkm) => {
        const maxHp = pkm.getMaxHp();
        const msg = `${pkm.name} should have receivd 25% damage: ${pkm.hp} / ${maxHp} HP`;
        expect(pkm.hp, msg).toBe(maxHp - Math.floor(maxHp * 0.25));
      });
    });
  });
});

/*
// Import necessary dependencies for testing
import { describe, it, expect } from "vitest";
import { LostAtSeaEncounter } from "../lost-at-sea-encounter";
import BattleScene from "../../../battle-scene";

describe("Lost At Sea Encounter Tests", () => {
  it("should set the correct encounter properties", () => {
    // Test the properties of the LostAtSeaEncounter object
    // For example, test the encounter type, tier, scene wave range requirement, etc.
    // You can use expect statements to check if the properties are set correctly
  });

  it("should handle the guiding pokemon phase correctly", () => {
    // Create a mock BattleScene object for testing
    const scene = new BattleScene(); // You may need to customize this based on your actual implementation

    // Call the handlePokemongGuidingYouPhase function with the scene
    handlePokemongGuidingYouPhase(scene);

    // Use expect statements to verify the behavior of the function
    // For example, check if the function sets the correct EXP value or handles cases where no guide pokemon is found
  });
});*/