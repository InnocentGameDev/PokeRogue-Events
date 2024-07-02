import { PlayerPokemon } from "#app/field/pokemon";
import * as Utils from "../utils";
import BattleScene from "../battle-scene";
import { EncounterPokemonRequirement, EncounterSceneRequirement } from "./mystery-encounter-requirements";

export default interface MysteryEncounterOption {
  requirements?: EncounterSceneRequirement[];
  protagonistPokemonRequirements?: EncounterPokemonRequirement[];
  supportPokemonRequirements ?: EncounterPokemonRequirement[];
  protagonistPokemon?: PlayerPokemon;
  supportingPokemon?: PlayerPokemon[];
  excludeProtagonistFromSupportRequirements?: boolean;
  // Executes before any following dialogue or business logic from option. Cannot be async. Usually this will be for calculating dialogueTokens or performing data updates
  onPreOptionPhase?: (scene: BattleScene) => Promise<void | boolean>;
  // Business logic for option
  onOptionPhase?: (scene: BattleScene) => Promise<void | boolean>;
  // Executes after the encounter is over. Cannot be async. Usually this will be for calculating dialogueTokens or performing data updates
  onPostOptionPhase?: (scene: BattleScene) => Promise<void | boolean>;
}

export default class MysteryEncounterOption implements MysteryEncounterOption {
  constructor(option: MysteryEncounterOption) {
    Object.assign(this, option);
    this.requirements = this.requirements ? this.requirements : [];
  }

  meetsRequirements?(scene: BattleScene) {
    return !this.requirements.some(requirement => !requirement.meetsRequirement(scene));
  }
  meetsProtagonistRequirementAndProtagonistPokemonSelected?(scene: BattleScene) {
    if (!this.protagonistPokemonRequirements) {
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

  meetsSupportingRequirementAndSupportingPokemonSelected?(scene: BattleScene) {
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
}


export class MysteryEncounterOptionBuilder implements Partial<MysteryEncounterOption> {
  requirements?: EncounterSceneRequirement[] = [];
  protagonistPokemonRequirements?: EncounterPokemonRequirement[] = [];
  supportPokemonRequirements ?: EncounterPokemonRequirement[] = [];
  excludeProtagonistFromSupportRequirements?: boolean;
  onPreOptionPhase?: (scene: BattleScene) => Promise<void | boolean>;
  onOptionPhase?: (scene: BattleScene) => Promise<void | boolean>;
  onPostOptionPhase?: (scene: BattleScene) => Promise<void | boolean>;

  withSceneRequirement(requirement: EncounterSceneRequirement): this & Required<Pick<MysteryEncounterOption, "requirements">> {
    this.requirements.push(requirement);
    return Object.assign(this, { requirements: this.requirements });
  }

  withPreOptionPhase(onPreOptionPhase: (scene: BattleScene) => Promise<void | boolean>): this & Required<Pick<MysteryEncounterOption, "onPreOptionPhase">> {
    return Object.assign(this, { onPreOptionPhase: onPreOptionPhase });
  }

  withOptionPhase(onOptionPhase: (scene: BattleScene) => Promise<void | boolean>): this & Required<Pick<MysteryEncounterOption, "onOptionPhase">> {
    return Object.assign(this, { onOptionPhase: onOptionPhase });
  }

  withPostOptionPhase(onPostOptionPhase: (scene: BattleScene) => Promise<void | boolean>): this & Required<Pick<MysteryEncounterOption, "onPostOptionPhase">> {
    return Object.assign(this, { onPostOptionPhase: onPostOptionPhase });
  }

  build(this: MysteryEncounterOption) {
    return new MysteryEncounterOption(this);
  }

  withProtagonistPokemonRequirement(requirement: EncounterPokemonRequirement): this & Required<Pick<MysteryEncounterOption, "protagonistPokemonRequirements">> {
    this.protagonistPokemonRequirements.push(requirement);
    return Object.assign(this, { protagonistPokemonRequirements: this.protagonistPokemonRequirements });
  }

  withSupportPokemonRequirement(requirement: EncounterPokemonRequirement,   excludeProtagonistFromSupportRequirements?: boolean): this & Required<Pick<MysteryEncounterOption, "supportPokemonRequirements">> {
    this.supportPokemonRequirements.push(requirement);
    this.excludeProtagonistFromSupportRequirements = excludeProtagonistFromSupportRequirements;
    return Object.assign(this, { supportPokemonRequirements: this.supportPokemonRequirements });
  }

}
