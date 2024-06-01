import BattleScene from "../battle-scene";
import { PostBiomeChangeAbAttr, applyAbAttrs } from "../data/ability";
import MysteryEncounter from "../data/mystery-encounter";
import { getRandomWeatherType } from "../data/weather";
import { EncounterPhase } from "../phases";

export class MysteryEncounterPhase extends EncounterPhase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  doEncounter(): void {
    this.scene.playBgm(undefined, true);
  }

  getMysteryEncounter(): MysteryEncounter {
    return this.scene.currentBattle.mysteryEncounter;
  }
}


export class NewBiomeMysteryEncounterPhase extends EncounterPhase {
  doEncounter(): void {
    this.scene.playBgm(undefined, true);

    for (const pokemon of this.scene.getParty()) {
      if (pokemon) {
        pokemon.resetBattleData();
      }
    }

    this.scene.arena.trySetWeather(getRandomWeatherType(this.scene.arena), false);

    for (const pokemon of this.scene.getParty().filter(p => p.isOnField())) {
      applyAbAttrs(PostBiomeChangeAbAttr, pokemon, null);
    }

    const enemyField = this.scene.getEnemyField();
    this.scene.tweens.add({
      targets: [this.scene.arenaEnemy, enemyField].flat(),
      x: "+=300",
      duration: 2000,
      onComplete: () => {
        if (!this.tryOverrideForBattleSpec()) {
          this.doEncounterCommon();
        }
      }
    });
  }
}
