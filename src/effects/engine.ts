import type { Point } from "../domain/area";
import {
  DEFAULT_CUES,
  FEET_PER_METER,
  isCueKey,
  parseCombatEvent,
  parseCueSteps,
  pickVariant,
  reducedMotion,
  resolveCue,
  type CombatEventName,
  type CueMap,
  type CueStep,
  type ProceduralStep,
  type SpriteStep,
  type StepTiming,
} from "../domain/cues";
import { overrideLayer, type CueOverride, type CueSource } from "../domain/overrides";
import { playFile, playSynth } from "../integrations/foundry/fx-audio";
import {
  pageHidden,
  playProcedural,
  playSprite,
  currentSceneId,
  initCanvasEffects,
  sceneAnchors,
  type Placement,
  type SceneAnchors,
} from "../integrations/foundry/fx-canvas";
import { playSequencerSprite } from "../integrations/foundry/fx-sequencer";
import { effectSettings, prefersReducedMotion } from "../integrations/foundry/settings";
import { broadcast, listen } from "../integrations/foundry/socket";

const KIND = "fx";
const registered = new Map<string, CueStep[]>();
let packSources: CueSource[] = [];
let overrides: Record<string, CueOverride> = {};
let layers: CueMap[] = [DEFAULT_CUES];
const layerListeners = new Set<() => void>();

export function currentLayers(): readonly CueMap[] {
  return layers;
}

export function onLayersChanged(listener: () => void): void {
  layerListeners.add(listener);
}

export function cueSources(): CueSource[] {
  return [
    ...packSources,
    { id: "code", cues: Object.fromEntries(registered) },
    { id: "default", cues: DEFAULT_CUES },
  ];
}

function rebuildLayers(): void {
  const sources = cueSources();
  layers = [overrideLayer(overrides, sources), ...sources.map((source) => source.cues)];
  for (const listener of layerListeners) listener();
}

export function setPackCues(sources: CueSource[]): void {
  packSources = sources;
  rebuildLayers();
}

export function setCueOverrides(next: Record<string, CueOverride>): void {
  overrides = next;
  rebuildLayers();
}

export interface CueInput {
  name: CombatEventName;
  source?: string | null;
  targets?: string[];
  point?: Point | null;
  qualifiers?: string[];
}

function placements(at: CueStep & { at: string }, anchors: SceneAnchors, size: number) {
  const { source, targets, point } = anchors;
  const result: Placement[] = [];
  const add = (from: Point, to: Point) => result.push({ from, to, size });
  if (at.at === "source" || at.at === "spray") {
    if (source?.visible) add(source.point, source.point);
    return result;
  }
  if (at.at === "point") {
    if (point?.visible) add(point.point, point.point);
    return result;
  }
  const ends = targets.length > 0 ? targets : point ? [point] : [];
  for (const end of ends) {
    if (at.at === "target") {
      if (end.visible) add(source?.point ?? end.point, end.point);
    } else if (source && (source.visible || end.visible)) {
      add(source.point, end.point);
    }
  }
  return result;
}

const SPRAY_REACH = { min: 4, max: 10 } as const;

function schedule(timing: Partial<StepTiming>, run: () => void): void {
  const repeat = timing.repeat ?? 1;
  const delay = timing.delay ?? 0;
  const gap = timing.repeatDelay ?? 0;
  for (let index = 0; index < repeat; index += 1) {
    const wait = delay + index * gap;
    if (wait <= 0) run();
    else window.setTimeout(run, wait);
  }
}

function randomOf<T>(list: readonly T[]): T | undefined {
  return list[Math.floor(Math.random() * list.length)];
}

function jitter(placement: Placement, gridSize: number): Placement {
  const reach = gridSize * 0.2;
  const dx = (Math.random() * 2 - 1) * reach;
  const dy = (Math.random() * 2 - 1) * reach;
  return { ...placement, to: { x: placement.to.x + dx, y: placement.to.y + dy } };
}

function sprayed(placement: Placement, gridSize: number): Placement {
  const angle = Math.random() * Math.PI * 2;
  const reach = gridSize * (SPRAY_REACH.min + Math.random() * (SPRAY_REACH.max - SPRAY_REACH.min));
  const to = {
    x: placement.from.x + Math.cos(angle) * reach,
    y: placement.from.y + Math.sin(angle) * reach,
  };
  return { ...placement, to };
}

function playProceduralStep(
  step: ProceduralStep,
  base: Placement,
  anchors: SceneAnchors,
  reduced: boolean,
): void {
  const placement = step.at === "spray" ? sprayed(base, anchors.gridSize) : base;
  playProcedural(step.effect, placement, reduced);
}

function spriteSource(step: SpriteStep, placement: Placement, anchors: SceneAnchors) {
  if (step.at !== "path" && step.at !== "spray") return randomOf(step.src) ?? null;
  const pixels = Math.hypot(placement.to.x - placement.from.x, placement.to.y - placement.from.y);
  const meters = (pixels / anchors.gridSize) * anchors.gridDistance;
  return pickVariant(step.src, meters * FEET_PER_METER);
}

function playSpriteStep(
  step: SpriteStep,
  base: Placement,
  anchors: SceneAnchors,
  reduced: boolean,
): void {
  const aimed = step.at === "spray" ? sprayed(base, anchors.gridSize) : base;
  const placement = step.randomOffset ? jitter(aimed, anchors.gridSize) : aimed;
  const src = spriteSource(step, placement, anchors);
  if (!src) return;
  const stretch = step.at === "path" || step.at === "spray";
  const plain = step.template === null && step.opacity === 1 && step.playbackRate === 1 && !reduced;
  const duration = step.duration ?? 1000;
  if (plain && step.duration !== null && playSequencerSprite(src, placement, stretch, duration)) {
    return;
  }
  const options = {
    stretch,
    duration: step.duration,
    template: step.template,
    opacity: step.opacity,
    playbackRate: step.playbackRate,
    reduced,
  };
  void playSprite(src, placement, options).then((shown) => {
    if (!shown && step.fallback) {
      const at = stretch ? { ...placement, from: placement.to } : placement;
      playProcedural(step.fallback, at, reduced);
    }
  });
}

function anyVisible(anchors: SceneAnchors): boolean {
  const all = [anchors.source, anchors.point, ...anchors.targets];
  return all.some((anchor) => anchor?.visible);
}

function play(input: unknown): void {
  const event = parseCombatEvent(input);
  if (!event || pageHidden()) return;
  const settings = effectSettings();
  if (!settings.visuals && !settings.sounds) return;
  const anchors = sceneAnchors(event);
  if (!anchors) return;
  const steps = resolveCue(event.name, event.qualifiers, layers);
  const reduced = reducedMotion(settings.motion, prefersReducedMotion());
  const audible = settings.sounds && anyVisible(anchors);
  for (const step of steps) {
    if (step.type === "synth") {
      if (audible) playSynth(step.sound, step.volume * settings.volume);
      continue;
    }
    if (step.type === "sound") {
      if (!audible) continue;
      schedule(step, () => {
        const src = randomOf(step.src);
        if (src) playFile(src, step.volume * settings.volume, step.startTime);
      });
      continue;
    }
    if (step.type === "sprite" && step.persist) continue;
    if (!settings.visuals) continue;
    const size = anchors.gridSize * step.scale * settings.intensity;
    for (const placement of placements(step, anchors, size)) {
      if (step.type === "procedural") {
        schedule(step, () => playProceduralStep(step, placement, anchors, reduced));
        continue;
      }
      schedule(step, () => playSpriteStep(step, placement, anchors, reduced));
    }
  }
}

export function initEffects(): void {
  listen(KIND, (payload) => play(payload));
  initCanvasEffects();
}

export function emitCue(input: CueInput): void {
  const sceneId = currentSceneId();
  if (!sceneId) return;
  const event = parseCombatEvent({
    name: input.name,
    sceneId,
    source: input.source ?? null,
    targets: input.targets ?? [],
    point: input.point ?? null,
    qualifiers: input.qualifiers ?? [],
  });
  if (!event) return;
  broadcast(KIND, event);
  play(event);
}

export function registerCue(key: string, steps: unknown): boolean {
  const parsed = parseCueSteps(steps);
  if (!isCueKey(key) || !parsed) return false;
  registered.set(key, parsed);
  rebuildLayers();
  return true;
}

export function unregisterCue(key: string): void {
  registered.delete(key);
  rebuildLayers();
}
