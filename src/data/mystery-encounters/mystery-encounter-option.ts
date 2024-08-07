import { OptionTextDisplay } from "#app/data/mystery-encounters/mystery-encounter-dialogue";
import { Moves } from "#app/enums/moves";
import Pokemon, { PlayerPokemon } from "#app/field/pokemon";
import BattleScene from "#app/battle-scene";
import * as Utils from "#app/utils";
import { Type } from "../type";
import { EncounterPokemonRequirement, EncounterSceneRequirement, MoneyRequirement, TypeRequirement } from "./mystery-encounter-requirements";
import { CanLearnMoveRequirement, CanLearnMoveRequirementOptions } from "./requirements/can-learn-move-requirement";
import { isNullOrUndefined } from "#app/utils";
import { MysteryEncounterOptionMode } from "#enums/mystery-encounter-option-mode";


export type OptionPhaseCallback = (scene: BattleScene) => Promise<void | boolean>;

export default interface MysteryEncounterOption {
  optionMode: MysteryEncounterOptionMode;

  hasDexProgress?: boolean;

  requirements?: EncounterSceneRequirement[];
  primaryPokemonRequirements?: EncounterPokemonRequirement[];
  secondaryPokemonRequirements?: EncounterPokemonRequirement[];
  primaryPokemon?: PlayerPokemon;
  secondaryPokemon?: PlayerPokemon[];
  excludePrimaryFromSecondaryRequirements?: boolean;

  /**
   * Dialogue object containing all the dialogue, messages, tooltips, etc. for this option
   * Will be populated on MysteryEncounter initialization
   */
  dialogue?: OptionTextDisplay;

  // Executes before any following dialogue or business logic from option. Usually this will be for calculating dialogueTokens or performing scene/data updates
  onPreOptionPhase?: OptionPhaseCallback;
  // Business logic for option
  onOptionPhase?: OptionPhaseCallback;
  // Executes after the encounter is over. Usually this will be for calculating dialogueTokens or performing data updates
  onPostOptionPhase?: OptionPhaseCallback;
}

export default class MysteryEncounterOption implements MysteryEncounterOption {
  constructor(option: MysteryEncounterOption) {
    Object.assign(this, option);
    this.hasDexProgress = !isNullOrUndefined(this.hasDexProgress) ? this.hasDexProgress : false;
    this.requirements = this.requirements ? this.requirements : [];
    this.primaryPokemonRequirements = this.primaryPokemonRequirements ? this.primaryPokemonRequirements : [];
    this.secondaryPokemonRequirements = this.secondaryPokemonRequirements ? this.secondaryPokemonRequirements : [];
  }

  hasRequirements?() {
    return this.requirements.length > 0 || this.primaryPokemonRequirements.length > 0 || this.secondaryPokemonRequirements.length > 0;
  }

  meetsRequirements?(scene: BattleScene) {
    return !this.requirements.some(requirement => !requirement.meetsRequirement(scene)) &&
      this.meetsSupportingRequirementAndSupportingPokemonSelected(scene) &&
      this.meetsPrimaryRequirementAndPrimaryPokemonSelected(scene);
  }

  pokemonMeetsPrimaryRequirements?(scene: BattleScene, pokemon: Pokemon) {
    return !this.primaryPokemonRequirements.some(req => !req.queryParty(scene.getParty()).map(p => p.id).includes(pokemon.id));
  }

  meetsPrimaryRequirementAndPrimaryPokemonSelected?(scene: BattleScene) {
    if (!this.primaryPokemonRequirements) {
      return true;
    }
    let qualified: PlayerPokemon[] = scene.getParty();
    for (const req of this.primaryPokemonRequirements) {
      if (req.meetsRequirement(scene)) {
        if (req instanceof EncounterPokemonRequirement) {
          qualified = qualified.filter(pkmn => req.queryParty(scene.getParty()).includes(pkmn));
        }
      } else {
        this.primaryPokemon = null;
        return false;
      }
    }

    if (qualified.length === 0) {
      return false;
    }

    if (this.excludePrimaryFromSecondaryRequirements && this.secondaryPokemon) {
      const truePrimaryPool = [];
      const overlap = [];
      for (const qp of qualified) {
        if (!this.secondaryPokemon.includes(qp)) {
          truePrimaryPool.push(qp);
        } else {
          overlap.push(qp);
        }

      }
      if (truePrimaryPool.length > 0) {
        // always choose from the non-overlapping pokemon first
        this.primaryPokemon = truePrimaryPool[Utils.randSeedInt(truePrimaryPool.length, 0)];
        return true;
      } else {
        // if there are multiple overlapping pokemon, we're okay - just choose one and take it out of the supporting pokemon pool
        if (overlap.length > 1 || (this.secondaryPokemon.length - overlap.length >= 1)) {
          // is this working?
          this.primaryPokemon = overlap[Utils.randSeedInt(overlap.length, 0)];
          this.secondaryPokemon = this.secondaryPokemon.filter((supp) => supp !== this.primaryPokemon);
          return true;
        }
        console.log("Mystery Encounter Edge Case: Requirement not met due to primay pokemon overlapping with support pokemon. There's no valid primary pokemon left.");
        return false;
      }
    } else {
      // Just pick the first qualifying Pokemon
      this.primaryPokemon = qualified[0];
      return true;
    }
  }

  meetsSupportingRequirementAndSupportingPokemonSelected?(scene: BattleScene) {
    if (!this.secondaryPokemonRequirements) {
      this.secondaryPokemon = [];
      return true;
    }

    let qualified: PlayerPokemon[] = scene.getParty();
    for (const req of this.secondaryPokemonRequirements) {
      if (req.meetsRequirement(scene)) {
        if (req instanceof EncounterPokemonRequirement) {
          qualified = qualified.filter(pkmn => req.queryParty(scene.getParty()).includes(pkmn));

        }
      } else {
        this.secondaryPokemon = [];
        return false;
      }
    }
    this.secondaryPokemon = qualified;
    return true;
  }
}


export class MysteryEncounterOptionBuilder implements Partial<MysteryEncounterOption> {
  optionMode?: MysteryEncounterOptionMode;
  requirements?: EncounterSceneRequirement[] = [];
  primaryPokemonRequirements?: EncounterPokemonRequirement[] = [];
  secondaryPokemonRequirements ?: EncounterPokemonRequirement[] = [];
  excludePrimaryFromSecondaryRequirements?: boolean;
  isDisabledOnRequirementsNotMet?: boolean;
  onPreOptionPhase?: OptionPhaseCallback;
  onOptionPhase?: OptionPhaseCallback;
  onPostOptionPhase?: OptionPhaseCallback;
  dialogue?: OptionTextDisplay;

  withOptionMode(optionMode: MysteryEncounterOptionMode): this & Pick<MysteryEncounterOption, "optionMode"> {
    return Object.assign(this, { optionMode });
  }

  withHasDexProgress(hasDexProgress: boolean): this & Required<Pick<MysteryEncounterOption, "hasDexProgress">> {
    return Object.assign(this, { hasDexProgress: hasDexProgress });
  }

  withSceneRequirement(requirement: EncounterSceneRequirement): this & Required<Pick<MysteryEncounterOption, "requirements">> {
    if (requirement instanceof EncounterPokemonRequirement) {
      Error("Incorrectly added pokemon requirement as scene requirement.");
    }

    this.requirements.push(requirement);
    return Object.assign(this, { requirements: this.requirements });
  }

  withSceneMoneyRequirement(requiredMoney: number, scalingMultiplier?: number) {
    return this.withSceneRequirement(new MoneyRequirement(requiredMoney, scalingMultiplier));
  }

  withPreOptionPhase(onPreOptionPhase: OptionPhaseCallback): this & Required<Pick<MysteryEncounterOption, "onPreOptionPhase">> {
    return Object.assign(this, { onPreOptionPhase: onPreOptionPhase });
  }

  withOptionPhase(onOptionPhase: OptionPhaseCallback): this & Required<Pick<MysteryEncounterOption, "onOptionPhase">> {
    return Object.assign(this, { onOptionPhase: onOptionPhase });
  }

  withPostOptionPhase(onPostOptionPhase: OptionPhaseCallback): this & Required<Pick<MysteryEncounterOption, "onPostOptionPhase">> {
    return Object.assign(this, { onPostOptionPhase: onPostOptionPhase });
  }

  build(this: MysteryEncounterOption) {
    return new MysteryEncounterOption(this);
  }

  withPrimaryPokemonRequirement(requirement: EncounterPokemonRequirement): this & Required<Pick<MysteryEncounterOption, "primaryPokemonRequirements">> {
    if (requirement instanceof EncounterSceneRequirement) {
      Error("Incorrectly added scene requirement as pokemon requirement.");
    }

    this.primaryPokemonRequirements.push(requirement);
    return Object.assign(this, { primaryPokemonRequirements: this.primaryPokemonRequirements });
  }

  /**
   * Player is required to have certain type/s of pokemon in his party (with optional min number of pokemons with that type)
   *
   * @param type the required type/s
   * @param excludeFainted whether to exclude fainted pokemon
   * @param minNumberOfPokemon number of pokemons to have that type
   * @param invertQuery
   * @returns
   */
  withPokemonTypeRequirement(type: Type | Type[], excludeFainted?: boolean, minNumberOfPokemon?: number, invertQuery?: boolean) {
    return this.withPrimaryPokemonRequirement(new TypeRequirement(type, excludeFainted, minNumberOfPokemon, invertQuery));
  }

  /**
   * Player is required to have a pokemon that can learn a certain move/moveset
   *
   * @param move the required move/moves
   * @param options see {@linkcode CanLearnMoveRequirementOptions}
   * @returns
   */
  withPokemonCanLearnMoveRequirement(move: Moves | Moves[], options?: CanLearnMoveRequirementOptions) {
    return this.withPrimaryPokemonRequirement(new CanLearnMoveRequirement(move, options));
  }

  withSecondaryPokemonRequirement(requirement: EncounterPokemonRequirement, excludePrimaryFromSecondaryRequirements: boolean = true): this & Required<Pick<MysteryEncounterOption, "secondaryPokemonRequirements">> {
    if (requirement instanceof EncounterSceneRequirement) {
      Error("Incorrectly added scene requirement as pokemon requirement.");
    }

    this.secondaryPokemonRequirements.push(requirement);
    this.excludePrimaryFromSecondaryRequirements = excludePrimaryFromSecondaryRequirements;
    return Object.assign(this, { secondaryPokemonRequirements: this.secondaryPokemonRequirements });
  }

  /**
   * Se the full dialogue object to the option. Will override anything already set
   *
   * @param dialogue see {@linkcode OptionTextDisplay}
   * @returns
   */
  withDialogue(dialogue: OptionTextDisplay) {
    this.dialogue = dialogue;
    return this;
  }
}
