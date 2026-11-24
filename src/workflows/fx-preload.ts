import { attackQualifiers, resolveCue, stepSources } from "../domain/cues";
import { areaFor } from "../domain/modes";
import { currentLayers, onLayersChanged } from "../effects/engine";
import { weaponsOf } from "../integrations/cpr/weapon-adapter";
import { preloadTextures } from "../integrations/foundry/fx-canvas";
import { effectSettings } from "../integrations/foundry/settings";

const PRELOAD_DELAY_MS = 1500;
const MAX_PRELOAD = 60;
const SPRITE = /\.(webm|webp|png|svg)$/i;
let timer: number | null = null;

function sceneSources(): string[] {
  const layers = currentLayers();
  const found = new Set<string>();
  for (const token of canvas?.tokens?.placeables ?? []) {
    if (!token.actor) continue;
    for (const weapon of weaponsOf(token.actor)) {
      const qualifiers = attackQualifiers({
        weaponType: weapon.weaponType,
        mode: "single",
        area: areaFor(weapon),
        melee: weapon.kind === "melee",
        itemName: weapon.name,
        ammoVariety: weapon.ammoVariety,
        ammoType: weapon.ammoType,
      });
      for (const name of ["attack.fire", "attack.hit", "area.detonate"] as const) {
        for (const step of resolveCue(name, qualifiers, layers)) {
          for (const src of stepSources(step)) if (SPRITE.test(src)) found.add(src);
        }
      }
    }
  }
  return [...found].slice(0, MAX_PRELOAD);
}

function preload(): void {
  timer = null;
  if (!effectSettings().visuals) return;
  void preloadTextures(sceneSources());
}

function schedule(): void {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(preload, PRELOAD_DELAY_MS);
}

export function initFxPreload(): void {
  Hooks.on("canvasReady", schedule);
  onLayersChanged(schedule);
  schedule();
}
