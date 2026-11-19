import type { Point } from "./area";

export const COMBAT_EVENTS = [
  "attack.fire",
  "attack.hit",
  "attack.miss",
  "attack.dodged",
  "attack.critical",
  "area.place",
  "area.detonate",
  "damage.applied",
  "actor.mortallyWounded",
  "actor.dead",
  "grapple.start",
  "grapple.end",
  "quickhack.jackIn",
  "quickhack.success",
  "quickhack.fail",
  "quickhack.forceOut",
] as const;
export type CombatEventName = (typeof COMBAT_EVENTS)[number];

export const PROCEDURAL_EFFECTS = [
  "flash",
  "tracer",
  "impact",
  "explosion",
  "miss",
  "critical",
  "flatline",
] as const;
export type ProceduralEffect = (typeof PROCEDURAL_EFFECTS)[number];

export const SYNTH_SOUNDS = [
  "shot",
  "burst",
  "launch",
  "swing",
  "impact",
  "ricochet",
  "whoosh",
  "explosion",
  "alarm",
  "flatline",
  "grab",
] as const;
export type SynthSound = (typeof SYNTH_SOUNDS)[number];

export const ANCHORS = ["source", "target", "point", "path"] as const;
export type Anchor = (typeof ANCHORS)[number];

export type CueStep =
  | { type: "procedural"; effect: ProceduralEffect; at: Anchor; scale: number }
  | { type: "synth"; sound: SynthSound; volume: number }
  | { type: "sound"; src: string; volume: number }
  | { type: "sprite"; src: string; at: Anchor; scale: number; duration: number };

export type CueMap = Readonly<Record<string, readonly CueStep[]>>;

export interface CombatEvent {
  name: CombatEventName;
  sceneId: string;
  source: string | null;
  targets: string[];
  point: Point | null;
  qualifiers: string[];
}

export type MotionSetting = "auto" | "reduce" | "full";

const LIMITS = { targets: 50, qualifiers: 5, steps: 8, id: 64, src: 256 } as const;
const QUALIFIER = /^[A-Za-z0-9-]{1,32}$/;
const SOUND_EXTENSIONS = ["ogg", "mp3", "wav"];
const SPRITE_EXTENSIONS = ["webm", "webp", "png", "svg"];

function procedural(effect: ProceduralEffect, at: Anchor, scale = 1): CueStep {
  return { type: "procedural", effect, at, scale };
}

function synth(sound: SynthSound, volume = 1): CueStep {
  return { type: "synth", sound, volume };
}

export const DEFAULT_CUES: CueMap = {
  "attack.fire": [procedural("flash", "source"), procedural("tracer", "path"), synth("shot")],
  "attack.fire:melee": [synth("swing", 0.8)],
  "attack.fire:thrown": [procedural("tracer", "path", 0.6), synth("swing", 0.8)],
  "attack.fire:autofire": [
    procedural("flash", "source", 1.2),
    procedural("tracer", "path"),
    synth("burst"),
  ],
  "attack.fire:suppressive": [procedural("flash", "source", 1.2), synth("burst")],
  "attack.fire:shell": [
    procedural("flash", "source", 1.5),
    procedural("tracer", "path", 1.5),
    synth("shot", 1.2),
  ],
  "attack.fire:explosion": [
    procedural("flash", "source"),
    procedural("tracer", "path"),
    synth("launch"),
  ],
  "attack.hit": [procedural("impact", "target"), synth("impact")],
  "attack.miss": [procedural("miss", "target"), synth("ricochet", 0.6)],
  "attack.miss:melee": [procedural("miss", "target"), synth("whoosh", 0.6)],
  "attack.dodged": [procedural("miss", "target"), synth("whoosh", 0.7)],
  "attack.critical": [procedural("critical", "target"), synth("alarm", 0.5)],
  "area.detonate": [procedural("explosion", "point"), synth("explosion")],
  "actor.mortallyWounded": [procedural("flatline", "target"), synth("flatline", 0.4)],
  "grapple.start": [procedural("impact", "target", 0.6), synth("grab")],
  "grapple.end": [synth("whoosh", 0.5)],
};

export function cueKeys(name: CombatEventName, qualifiers: readonly string[]): string[] {
  return [...qualifiers.map((qualifier) => `${name}:${qualifier}`), name];
}

export function resolveCue(
  name: CombatEventName,
  qualifiers: readonly string[],
  layers: readonly CueMap[],
): readonly CueStep[] {
  for (const key of cueKeys(name, qualifiers)) {
    for (const layer of layers) {
      const steps = layer[key];
      if (steps) return steps;
    }
  }
  return [];
}

export function attackQualifiers(input: {
  weaponType: string;
  mode: string;
  area: string;
  melee: boolean;
}): string[] {
  const shape = input.area === "none" ? input.mode : input.area;
  const kind = input.melee && input.mode !== "thrown" ? "melee" : "ranged";
  return [input.weaponType, shape, kind].filter((value, index, all) => {
    return QUALIFIER.test(value) && all.indexOf(value) === index;
  });
}

export function mortallyWounded(hpBefore: number, hpAfter: number): boolean {
  return hpBefore >= 1 && hpAfter < 1;
}

export function reducedMotion(setting: MotionSetting, prefersReduced: boolean): boolean {
  return setting === "reduce" || (setting === "auto" && prefersReduced);
}

export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= LIMITS.id;
}

function isPoint(value: unknown): value is Point {
  return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function parseCombatEvent(value: unknown): CombatEvent | null {
  if (!isRecord(value) || !includes(COMBAT_EVENTS, value.name) || !isId(value.sceneId)) {
    return null;
  }
  const source = value.source === null ? null : isId(value.source) ? value.source : undefined;
  const targets = Array.isArray(value.targets) ? value.targets : [];
  const qualifiers = Array.isArray(value.qualifiers) ? value.qualifiers : [];
  const point = value.point === null ? null : isPoint(value.point) ? value.point : undefined;
  if (source === undefined || point === undefined) return null;
  if (targets.length > LIMITS.targets || !targets.every(isId)) return null;
  if (qualifiers.length > LIMITS.qualifiers) return null;
  if (!qualifiers.every((entry) => typeof entry === "string" && QUALIFIER.test(entry))) {
    return null;
  }
  return {
    name: value.name,
    sceneId: value.sceneId,
    source,
    targets: targets as string[],
    point: point && { x: point.x, y: point.y },
    qualifiers: qualifiers as string[],
  };
}

export function isSafeAssetPath(src: unknown, extensions: readonly string[]): src is string {
  if (typeof src !== "string" || src.length === 0 || src.length > LIMITS.src) return false;
  if (src.includes("..") || src.includes("\\") || src.startsWith("/") || /^[a-z]+:/i.test(src)) {
    return false;
  }
  const extension = src.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  return extensions.includes(extension);
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return value === undefined ? fallback : clamp(Number(value), min, max);
}

function parseStep(value: unknown): CueStep | null {
  if (!isRecord(value)) return null;
  switch (value.type) {
    case "procedural":
      if (!includes(PROCEDURAL_EFFECTS, value.effect) || !includes(ANCHORS, value.at)) return null;
      return procedural(value.effect, value.at, number(value.scale, 1, 0.1, 4));
    case "synth":
      if (!includes(SYNTH_SOUNDS, value.sound)) return null;
      return synth(value.sound, number(value.volume, 1, 0, 1.5));
    case "sound":
      if (!isSafeAssetPath(value.src, SOUND_EXTENSIONS)) return null;
      return { type: "sound", src: value.src, volume: number(value.volume, 1, 0, 1.5) };
    case "sprite":
      if (!isSafeAssetPath(value.src, SPRITE_EXTENSIONS) || !includes(ANCHORS, value.at)) {
        return null;
      }
      return {
        type: "sprite",
        src: value.src,
        at: value.at,
        scale: number(value.scale, 1, 0.1, 4),
        duration: number(value.duration, 1000, 100, 10000),
      };
    default:
      return null;
  }
}

export function parseCueSteps(value: unknown): CueStep[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > LIMITS.steps) return null;
  const steps = value.map(parseStep);
  return steps.every((step): step is CueStep => step !== null) ? steps : null;
}

export function isCueKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const [name, ...rest] = key.split(":");
  return includes(COMBAT_EVENTS, name) && rest.length <= 1 && rest.every((q) => QUALIFIER.test(q));
}
