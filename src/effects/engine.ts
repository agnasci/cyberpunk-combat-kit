import type { Point } from "../domain/area";
import {
  DEFAULT_CUES,
  isCueKey,
  parseCombatEvent,
  parseCueSteps,
  reducedMotion,
  resolveCue,
  type CombatEventName,
  type CueStep,
} from "../domain/cues";
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
  if (at.at === "source") {
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
  const steps = resolveCue(event.name, event.qualifiers, [
    Object.fromEntries(registered),
    DEFAULT_CUES,
  ]);
  const reduced = reducedMotion(settings.motion, prefersReducedMotion());
  const audible = settings.sounds && anyVisible(anchors);
  for (const step of steps) {
    if (step.type === "synth") {
      if (audible) playSynth(step.sound, step.volume * settings.volume);
      continue;
    }
    if (step.type === "sound") {
      if (audible) playFile(step.src, step.volume * settings.volume);
      continue;
    }
    if (!settings.visuals) continue;
    const size = anchors.gridSize * step.scale * settings.intensity;
    for (const placement of placements(step, anchors, size)) {
      if (step.type === "procedural") {
        playProcedural(step.effect, placement, reduced);
        continue;
      }
      const stretch = step.at === "path";
      if (reduced || !playSequencerSprite(step.src, placement, stretch, step.duration)) {
        void playSprite(step.src, placement, stretch, step.duration, reduced);
      }
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
  return true;
}

export function unregisterCue(key: string): void {
  registered.delete(key);
}
