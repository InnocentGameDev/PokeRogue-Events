import BattleScene from "#app/battle-scene.js";
import { MysteryEncounterType } from "#app/enums/mystery-encounter-type.js";
import MysteryEncounter, {
  MysteryEncounterBuilder,
  MysteryEncounterTier,
} from "../mystery-encounter";
import { MysteryEncounterOptionBuilder } from "../mystery-encounter-option";
import { WaveCountRequirement } from "../mystery-encounter-requirements";

/**
 * @see {@link https://github.com/AsdarDevelops/PokeRogue-Events/issues/9|GitHub Issue}
 */
export const GettingLostAtSeaEncounter: MysteryEncounter =
  new MysteryEncounterBuilder()
    .withEncounterType(MysteryEncounterType.GETTING_LOST_AT_SEA)
    .withEncounterTier(MysteryEncounterTier.COMMON)
    .withSceneRequirement(new WaveCountRequirement([11, 179])) // waves 61 to 179
    .withIntroSpriteConfigs([
      {
        spriteKey: "PRAS- Surf FG.png",
        fileRoot: "battle_anims",
        repeat: true,
      },
      {
        spriteKey: "PRAS- Surf FG.png",
        fileRoot: "battle_anims",
        repeat: true,
      },
    ])
    .withOption(
      new MysteryEncounterOptionBuilder()
        .withOptionPhase(async (scene: BattleScene) => {})
        .build()
    )
    .build();
