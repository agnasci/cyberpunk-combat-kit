import { persistentCues, reducedMotion, statusQualifiers } from "../domain/cues";
import { currentLayers, onLayersChanged } from "../effects/engine";
import { attachLoop, type LoopHandle } from "../integrations/foundry/fx-canvas";
import {
  effectSettings,
  prefersReducedMotion,
  statusEffectsEnabled,
  watchStatusSetting,
} from "../integrations/foundry/settings";

const DEBOUNCE_MS = 100;
const shown = new Map<string, LoopHandle | null>();
let timer: number | null = null;

function tokenQualifiers(token: Token): string[] {
  const actor = token.actor;
  if (!actor) return [];
  const names = actor.effects.filter((effect) => !effect.disabled).map((effect) => effect.name);
  return statusQualifiers(actor.statuses ?? [], names);
}

function desired(): Map<string, { tokenId: string; src: string; scale: number; opacity: number }> {
  const wanted = new Map<
    string,
    { tokenId: string; src: string; scale: number; opacity: number }
  >();
  const settings = effectSettings();
  if (!settings.visuals || !statusEffectsEnabled()) return wanted;
  const layers = currentLayers();
  for (const token of canvas?.tokens?.placeables ?? []) {
    for (const cue of persistentCues(tokenQualifiers(token), layers)) {
      const src = cue.step.src[0];
      if (!src) continue;
      wanted.set(`${token.id}|${cue.id}|${src}`, {
        tokenId: token.id,
        src,
        scale: cue.step.scale * settings.intensity,
        opacity: cue.step.opacity,
      });
    }
  }
  return wanted;
}

function reconcile(): void {
  timer = null;
  const wanted = desired();
  for (const [key, handle] of shown) {
    if (wanted.has(key)) continue;
    handle?.stop();
    shown.delete(key);
  }
  const reduced = reducedMotion(effectSettings().motion, prefersReducedMotion());
  for (const [key, entry] of wanted) {
    if (shown.has(key)) continue;
    shown.set(key, null);
    void attachLoop(entry.tokenId, entry.src, entry.scale, entry.opacity, reduced).then(
      (handle) => {
        if (shown.has(key) && shown.get(key) === null) shown.set(key, handle);
        else handle?.stop();
      },
    );
  }
}

export function refreshStatusEffects(): void {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(reconcile, DEBOUNCE_MS);
}

function clearAll(): void {
  for (const handle of shown.values()) handle?.stop();
  shown.clear();
}

export function initStatusEffects(): void {
  Hooks.on("canvasTearDown", clearAll);
  Hooks.on("canvasReady", refreshStatusEffects);
  for (const hook of [
    "createActiveEffect",
    "updateActiveEffect",
    "deleteActiveEffect",
    "createToken",
    "deleteToken",
  ] as const) {
    Hooks.on(hook, refreshStatusEffects);
  }
  Hooks.on("updateToken", () => refreshStatusEffects());
  Hooks.on("updateActor", () => refreshStatusEffects());
  watchStatusSetting(refreshStatusEffects);
  onLayersChanged(refreshStatusEffects);
  refreshStatusEffects();
}
