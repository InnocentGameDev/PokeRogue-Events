import BattleScene from "../battle-scene";
import MysteryEncounterIntroVisuals, { MysteryEncounterSpriteConfig } from "../field/mystery-encounter-intro";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import MysteryEncounterDialogue, {
  allMysteryEncounterDialogue
} from "./mystery-encounters/dialogue/mystery-encounter-dialogue";
import MysteryEncounterOption from "./mystery-encounter-option";
import { EncounterPokemonRequirement, EncounterSceneRequirement } from "./mystery-encounter-requirements";
import * as Utils from "../utils";
import {EnemyPartyConfig} from "#app/data/mystery-encounters/mystery-encounter-utils";
import { PlayerPokemon } from "#app/field/pokemon";

export enum MysteryEncounterVariant {
  DEFAULT,
  TRAINER_BATTLE,
  WILD_BATTLE,
  BOSS_BATTLE,
  NO_BATTLE
}

export enum MysteryEncounterTier {
  COMMON, // 32/64 odds
  UNCOMMON, // 16/64 odds
  RARE, // 10/64 odds
  SUPER_RARE, // 6/64 odds
  ULTRA_RARE // Not currently used
}

export default interface MysteryEncounter {
  /**
   * Required params
   */
  encounterType: MysteryEncounterType;
  options: [MysteryEncounterOption, MysteryEncounterOption, ...MysteryEncounterOption[]];
  spriteConfigs: MysteryEncounterSpriteConfig[];
  /**
   * Optional params
   */
  encounterTier?: MysteryEncounterTier;
  requirements?: EncounterSceneRequirement[];
  protagonistPokemonRequirements?: EncounterPokemonRequirement[];
  supportPokemonRequirements ?: EncounterPokemonRequirement[]; // A list of requirements that must ALL be met by a subset of pokemon to trigger the event
  excludeProtagonistFromSupportRequirements?: boolean;
  // Protagonist Pokemon is a single pokemon randomly selected from a set of pokemon that meet ALL protagonist pokemon requirements
  protagonistPokemon?: PlayerPokemon;
  // Support Pokemon are pokemon that meet ALL support pokemon requirements.
  // Note that an individual requirement may require multiple pokemon, but the resulting pokemon after all support requirements are met may be lower than expected
  // If the protagonist pokemon and supporting pokemon are the same and ExcexcludeProtagonistFromSupportRequirements flag is true, protagonist pokemon may be promoted from support pool
  supportingPokemon?: PlayerPokemon[];
  doEncounterRewards?: (scene: BattleScene) => boolean;
  onInit?: (scene: BattleScene) => boolean;
  hideBattleIntroMessage?: boolean;

  /**
   * Post-construct / Auto-populated params
   */

  /**
   * Dialogue object containing all the dialogue, messages, tooltips, etc. for an encounter
   */
  dialogue?: MysteryEncounterDialogue;
  /**
   * Data used for setting up/initializing enemy party in battles
   * Can store multiple configs so that one can be chosen based on option selected
   */
  enemyPartyConfigs?: EnemyPartyConfig[];
  /**
   * Object instance containing sprite data for an encounter when it is being spawned
   * Otherwise, will be undefined
   * You probably shouldn't do anything with this unless you have a very specific need
   */
  introVisuals?: MysteryEncounterIntroVisuals;

  /**
   * Flags
   */

  /**
   * Can be set for uses programatic dialogue during an encounter (storing the name of one of the party's pokemon, etc.)
   * Example use: see MYSTERIOUS_CHEST
   */
  dialogueTokens?: [RegExp, string][];
  /**
   * Should be set depending upon option selected as part of an encounter
   * For example, if there is no battle as part of the encounter/selected option, should be set to NO_BATTLE
   * Defaults to DEFAULT
   */
  encounterVariant?: MysteryEncounterVariant;
  /**
   * Flag for checking if it's the first time a shop is being shown for an encounter.
   * Defaults to true so that the first shop does not override the specified rewards.
   * Will be set to false after a shop is shown (so can't reroll same rarity items for free)
   */
  lockEncounterRewardTiers?: boolean;
  /**
   * Will be set by option select handlers automatically, and can be used to refer to which option was chosen by later phases
   */
  selectedOption?: MysteryEncounterOption;
  /**
   * Can be set to true or false depending on the type of encounter
   * Defaults to false
   */
  catchAllowed?: boolean;
  /**
   * Can be set higher or lower based on the type of battle or exp gained for an option/encounter
   * Defaults to 1
   */
  expMultiplier?: number;

  /**
   * Generic property to set any custom data required for the encounter
   */
  misc?: any;
}

/**
 * MysteryEncounter class that defines the logic for a single encounter
 * These objects will be saved as part of session data any time the player is on a floor with an encounter
 * Unless you know what you're doing, you should use MysteryEncounterBuilder to create an instance for this class
 */
export default class MysteryEncounter implements MysteryEncounter {
  constructor(encounter: MysteryEncounter) {
    if (!Utils.isNullOrUndefined(encounter)) {
      Object.assign(this, encounter);
    }
    this.encounterTier = this.encounterTier ? this.encounterTier : MysteryEncounterTier.COMMON;
    this.dialogue = allMysteryEncounterDialogue[this.encounterType];
    this.encounterVariant = MysteryEncounterVariant.DEFAULT;
    this.requirements = this.requirements ? this.requirements : [];
    this.hideBattleIntroMessage = !!this.hideBattleIntroMessage;

    // Reset any dirty flags or encounter data
    this.lockEncounterRewardTiers = true;
    this.dialogueTokens = [];
    this.enemyPartyConfigs = [];
    this.introVisuals = null;
    this.misc = null;
    this.expMultiplier = 1;
  }

  /**
   * Checks if the current scene state meets the requirements for the MysteryEncounter to spawn
   * This is used to filter the pool of encounters down to only the ones with all requirements met
   * @param scene
   * @returns
   */
  meetsRequirements?(scene: BattleScene) {
    const sceneReq =  !this.requirements.some(requirement => !requirement.meetsRequirement(scene));
    const suppReqs = this.meetsSupportingRequirementAndSupportingPokemonSelected(scene); // support is checked first to handle cases of protagonist overlapping with support
    const proReqs = this.meetsProtagonistRequirementAndProtagonistPokemonSelected(scene);
    return sceneReq && suppReqs && proReqs;
  }

  private meetsProtagonistRequirementAndProtagonistPokemonSelected?(scene: BattleScene) {
    if (!this.protagonistPokemonRequirements) {
      const activeMon = scene.getParty().filter(p => p.isActive());
      if (activeMon.length > 0) {
        this.protagonistPokemon =  activeMon[0];
      }
      return true;
    }
    let qualified:PlayerPokemon[] = scene.getParty();
    for (const req of this.protagonistPokemonRequirements) {
      console.log(req);
      if (req.meetsRequirement(scene)) {
        if (req instanceof EncounterPokemonRequirement)  {
          qualified = qualified.filter(pkmn => req.queryParty(scene.getParty()).includes(pkmn));
        }
      } else {
        this.protagonistPokemon = null;
        return false;
      }
    }

    if (qualified.length === 0) {
      return false;
    }

    if (this.excludeProtagonistFromSupportRequirements && this.supportingPokemon) {
      const trueProtagonistPool = [];
      const overlap = [];
      for (const qp of qualified) {
        if (!this.supportingPokemon.includes(qp)) {
          trueProtagonistPool.push(qp);
        } else {
          overlap.push(qp);
        }

      }
      if (trueProtagonistPool.length > 0) {
        // always choose from the non-overlapping pokemon first
        this.protagonistPokemon =  trueProtagonistPool[Utils.randSeedInt(trueProtagonistPool.length, 0)];
        return true;
      } else {
        // if there are multiple overlapping pokemon, we're okay - just choose one and take it out of the supporting pokemon pool
        if (overlap.length > 1 || (this.supportingPokemon.length - overlap.length >= 1)) {
          // is this working?
          this.protagonistPokemon = overlap[Utils.randSeedInt(overlap.length, 0)];
          this.supportingPokemon = this.supportingPokemon.filter((supp)=> supp !== this.protagonistPokemon);
          return true;
        }
        console.log("Mystery Encounter Edge Case: Requirement not met due to protagonist pokemon overlapping with support pokemon. There's no valid protagonist pokemon left.");
        return false;
      }
    } else {
      // this means we CAN have the same pokemon be a protagonist and supporting pokemon, so just choose any qualifying one randomly.
      this.protagonistPokemon = qualified[Utils.randSeedInt(qualified.length, 0)];
      return true;
    }
  }

  private meetsSupportingRequirementAndSupportingPokemonSelected?(scene: BattleScene) {
    if (!this.supportPokemonRequirements) {
      this.supportingPokemon = [];
      return true;
    }

    let qualified:PlayerPokemon[] = scene.getParty();
    for (const req of this.supportPokemonRequirements) {
      if (req.meetsRequirement(scene)) {
        if (req instanceof EncounterPokemonRequirement)  {
          qualified = qualified.filter(pkmn => req.queryParty(scene.getParty()).includes(pkmn));

        }
      } else {
        this.supportingPokemon = [];
        return false;
      }
    }
    this.supportingPokemon = qualified;
    return true;
  }

  /**
   * Initializes encounter intro sprites based on the sprite configs defined in spriteConfigs
   * @param scene
   */
  initIntroVisuals?(scene: BattleScene) {
    this.introVisuals = new MysteryEncounterIntroVisuals(scene, this);
  }
}

export class MysteryEncounterBuilder implements Partial<MysteryEncounter> {
  encounterType?: MysteryEncounterType;
  options?: [MysteryEncounterOption, MysteryEncounterOption, ...MysteryEncounterOption[]] = [null, null];
  spriteConfigs?: MysteryEncounterSpriteConfig[];

  dialogue?: MysteryEncounterDialogue;
  encounterTier?: MysteryEncounterTier;
  requirements?: EncounterSceneRequirement[] = [];
  protagonistPokemonRequirements?: EncounterPokemonRequirement[] = [];
  supportPokemonRequirements ?: EncounterPokemonRequirement[] = [];
  excludeProtagonistFromSupportRequirements?: boolean;
  dialogueTokens?: [RegExp, string][];
  doEncounterRewards?: (scene: BattleScene) => boolean;
  onInit?: (scene: BattleScene) => boolean;
  hideBattleIntroMessage?: boolean;
  enemyPartyConfigs?: EnemyPartyConfig[] = [];

  /**
   * REQUIRED
   */

  /**
   * Defines the type of encounter which is used as an identifier, should be tied to a unique MysteryEncounterType
   * @param encounterType
   * @returns this
   */
  withEncounterType(encounterType: MysteryEncounterType): this & Pick<MysteryEncounter, "encounterType"> {
    return Object.assign(this, { encounterType: encounterType });
  }

  /**
   * Defines an option for the encounter
   * There should be at least 2 options defined and no more than 4
   * @param option - MysteryEncounterOption to add, can use MysteryEncounterOptionBuilder to create instance
   * @returns
   */
  withOption(option: MysteryEncounterOption): this & Pick<MysteryEncounter, "options"> {
    if (this.options[0] === null) {
      return Object.assign(this, { options: [ option, this.options[0] ] });
    } else if (this.options[1] === null) {
      return Object.assign(this, { options: [this.options[0], option ] });
    } else {
      this.options.push(option);
      return Object.assign(this, { options: this.options });
    }
  }

  /**
   * Defines the sprites that will be shown on the enemy field when the encounter spawns
   * Can be one or more sprites, recommended not to exceed 4
   * @param spriteConfigs
   * @returns
   */
  withIntroSpriteConfigs(spriteConfigs: MysteryEncounterSpriteConfig[]): this & Pick<MysteryEncounter, "spriteConfigs"> {
    return Object.assign(this, { spriteConfigs: spriteConfigs });
  }

  /**
   * OPTIONAL
   */

  /**
   * Sets the rarity tier for an encounter
   * If not specified, defaults to COMMON
   * Tiers are:
   * COMMON 32/64 odds
   * UNCOMMON 16/64 odds
   * RARE 10/64 odds
   * SUPER_RARE 6/64 odds
   * ULTRA_RARE Not currently used
   * @param encounterTier
   * @returns
   */
  withEncounterTier(encounterTier: MysteryEncounterTier): this & Required<Pick<MysteryEncounter, "encounterTier">> {
    return Object.assign(this, { encounterTier: encounterTier });
  }

  /**
   * Specifies a requirement for an encounter
   * For example, passing requirement as "new WaveCountRequirement([2, 180])" would create a requirement that the encounter can only be spawned between waves 2 and 180
   * Existing Requirement objects are defined in mystery-encounter-requirements.ts, and more can always be created to meet a requirement need
   * @param requirement
   * @returns
   */
  withSceneRequirement(requirement: EncounterSceneRequirement): this & Required<Pick<MysteryEncounter, "requirements">> {
    if (requirement instanceof EncounterPokemonRequirement) {
      Error("Incorrectly added pokemon requirement as scene requirement.");
    }
    this.requirements.push(requirement);
    return Object.assign(this, { requirements: this.requirements });
  }

  withProtagonistPokemonRequirement(requirement: EncounterPokemonRequirement): this & Required<Pick<MysteryEncounter, "protagonistPokemonRequirements">> {
    this.protagonistPokemonRequirements.push(requirement);
    return Object.assign(this, { protagonistPokemonRequirements: this.protagonistPokemonRequirements });
  }

  // TODO: Maybe add an optional parameter for excluding protagonist pokemon from the support cast?
  // ex. if your only grass type pokemon, a snivy, is chosen as protagonist, if the support pokemon requires a grass type, the event won't trigger because
  // it's already been
  withSupportPokemonRequirement(requirement: EncounterPokemonRequirement, excludeProtagonistFromSupportRequirements:boolean = false): this & Required<Pick<MysteryEncounter, "supportPokemonRequirements">> {
    this.supportPokemonRequirements.push(requirement);
    this.excludeProtagonistFromSupportRequirements = excludeProtagonistFromSupportRequirements;
    return Object.assign(this, { excludeProtagonistFromSupportRequirements: this.excludeProtagonistFromSupportRequirements, supportPokemonRequirements: this.supportPokemonRequirements });
  }


  //TODO: Split this into withSceneRequirement and withProtagonistPokemonRequirement and withSupportingPokemonRequirement

  /**
   * Can set custom encounter rewards via this callback function
   * If rewards are always deterministic for an encounter, this is a good way to set them
   *
   * NOTE: If rewards are dependent on options selected, runtime data, etc.,
   * It may be better to programmatically set doEncounterRewards elsewhere.
   * For instance, doEncounterRewards could instead be set inside the onOptionPhase() callback function for a MysteryEncounterOption
   * Check other existing mystery encounters for examples on how to use this
   * @param doEncounterRewards - synchronous callback function to perform during rewards phase of the encounter
   * @returns
   */
  withRewards(doEncounterRewards: (scene: BattleScene) => boolean): this & Required<Pick<MysteryEncounter, "doEncounterRewards">> {
    return Object.assign(this, { doEncounterRewards: doEncounterRewards });
  }

  /**
   * Can be used to perform init logic before intro visuals are shown and before the MysteryEncounterPhase begins
   * Useful for performing things like procedural generation of intro sprites, etc.
   *
   * @param onInit - synchronous callback function to perform as soon as the encounter is selected for the next phase
   * @returns
   */
  withOnInit(onInit: (scene: BattleScene) => boolean): this & Required<Pick<MysteryEncounter, "onInit">> {
    return Object.assign(this, { onInit: onInit });
  }

  /**
   * Defines any enemies to use for a battle from the mystery encounter
   * @param enemyPartyConfig
   * @returns
   */
  withEnemyPartyConfig(enemyPartyConfig: EnemyPartyConfig): this & Required<Pick<MysteryEncounter, "enemyPartyConfigs">> {
    this.enemyPartyConfigs.push(enemyPartyConfig);
    return Object.assign(this, { enemyPartyConfigs: this.enemyPartyConfigs });
  }

  /**
   * Can set whether catching is allowed or not on the encounter
   * This flag can also be programmatically set inside option event functions or elsewhere
   * @param catchAllowed - if true, allows enemy pokemon to be caught during the encounter
   * @returns
   */
  withCatchAllowed(catchAllowed: boolean): this & Required<Pick<MysteryEncounter, "catchAllowed">> {
    return Object.assign(this, { catchAllowed: catchAllowed });
  }

  /**
   * Can set whether catching is allowed or not on the encounter
   * This flag can also be programmatically set inside option event functions or elsewhere
   * @param hideBattleIntroMessage - if true, will not show the trainerAppeared/wildAppeared/bossAppeared message for an encounter
   * @returns
   */
  withHideWildIntroMessage(hideBattleIntroMessage: boolean): this & Required<Pick<MysteryEncounter, "hideBattleIntroMessage">> {
    return Object.assign(this, { hideBattleIntroMessage: hideBattleIntroMessage });
  }

  build(this: MysteryEncounter) {
    return new MysteryEncounter(this);
  }
}
