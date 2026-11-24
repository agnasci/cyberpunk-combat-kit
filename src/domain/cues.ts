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
  "status.active",
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

export interface StepTiming {
  delay: number;
  repeat: number;
  repeatDelay: number;
}

export type SpriteTemplate = readonly [number, number, number];

export interface SoundStep extends StepTiming {
  type: "sound";
  src: readonly string[];
  volume: number;
  startTime: number;
}

export interface SpriteStep extends StepTiming {
  type: "sprite";
  src: readonly string[];
  at: Anchor;
  scale: number;
  duration: number | null;
  template: SpriteTemplate | null;
  opacity: number;
  playbackRate: number;
  randomOffset: boolean;
  persist: boolean;
  fallback: ProceduralEffect | null;
}

export type CueStep =
  | { type: "procedural"; effect: ProceduralEffect; at: Anchor; scale: number }
  | { type: "synth"; sound: SynthSound; volume: number }
  | SoundStep
  | SpriteStep;

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

const LIMITS = { targets: 50, qualifiers: 8, steps: 8, id: 64, src: 256, variants: 8 } as const;
const QUALIFIER = /^[A-Za-z0-9-]{1,48}$/;
export const SOUND_EXTENSIONS = ["ogg", "mp3", "wav", "flac"];
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
  "quickhack.jackIn": [procedural("tracer", "path", 0.5), synth("alarm", 0.25)],
  "quickhack.success": [procedural("critical", "target", 0.7), synth("alarm", 0.4)],
  "quickhack.fail": [procedural("miss", "target", 0.7), synth("whoosh", 0.5)],
  "quickhack.forceOut": [procedural("flash", "target"), synth("whoosh", 0.6)],
};

const IDENTITY_PREFIXES = ["item-", "ammo-"];

function isPrefixed(qualifier: string): boolean {
  return IDENTITY_PREFIXES.some((prefix) => qualifier.startsWith(prefix));
}

export function cueKeys(name: CombatEventName, qualifiers: readonly string[]): string[] {
  const split = qualifiers.findIndex((qualifier) => !isPrefixed(qualifier));
  const identities = split < 0 ? [...qualifiers] : qualifiers.slice(0, split + 1);
  const forms = split < 0 ? [] : qualifiers.slice(split + 1);
  const keys: string[] = [];
  for (const identity of identities) {
    for (const form of forms) keys.push(`${name}:${identity}+${form}`);
    keys.push(`${name}:${identity}`);
  }
  for (const form of forms) keys.push(`${name}:${form}`);
  keys.push(name);
  return keys;
}

export function qualifierSlug(text: string, max = 40): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

export function feetVariant(src: string): number | null {
  const found = /_(\d{1,3})ft[_.]/i.exec(src);
  return found ? Number(found[1]) : null;
}

export function pickVariant(sources: readonly string[], distanceFeet: number): string | null {
  if (sources.length === 0) return null;
  const sized = sources
    .map((src) => ({ src, feet: feetVariant(src) }))
    .filter((entry): entry is { src: string; feet: number } => entry.feet !== null)
    .sort((a, b) => a.feet - b.feet);
  if (sized.length === 0) return sources[0] ?? null;
  const fit = sized.find((entry) => entry.feet >= distanceFeet);
  return (fit ?? sized[sized.length - 1])?.src ?? null;
}

export const FEET_PER_METER = 3.28084;

export const MAX_PERSISTENT_PER_TOKEN = 4;

export function statusQualifiers(
  statuses: Iterable<string>,
  effectNames: Iterable<string>,
): string[] {
  const out: string[] = [];
  const add = (value: string) => {
    if (value && QUALIFIER.test(value) && !out.includes(value)) out.push(value);
  };
  for (const status of statuses) add(status);
  for (const name of effectNames) add(qualifierSlug(name));
  return out;
}

export interface PersistentCue {
  id: string;
  step: SpriteStep;
}

export function persistentCues(
  qualifiers: readonly string[],
  layers: readonly CueMap[],
): PersistentCue[] {
  const result: PersistentCue[] = [];
  for (const qualifier of qualifiers) {
    const key = `status.active:${qualifier}`;
    const steps = layers.find((layer) => layer[key])?.[key] ?? [];
    steps.forEach((step, index) => {
      if (step.type === "sprite" && step.persist && result.length < MAX_PERSISTENT_PER_TOKEN) {
        result.push({ id: `${qualifier}#${index}`, step });
      }
    });
  }
  return result;
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
  itemName?: string | null;
  ammoVariety?: string | null;
  ammoType?: string | null;
}): string[] {
  const shape = input.area === "none" ? input.mode : input.area;
  const kind = input.melee && input.mode !== "thrown" ? "melee" : "ranged";
  const item = input.itemName ? qualifierSlug(input.itemName) : "";
  const variety = input.ammoVariety ?? "";
  const ammo = [
    variety && input.ammoType ? `ammo-${variety}-${input.ammoType}` : "",
    variety ? `ammo-${variety}` : "",
  ];
  return [item ? `item-${item}` : "", ...ammo, input.weaponType, shape, kind].filter(
    (value, index, all) => QUALIFIER.test(value) && all.indexOf(value) === index,
  );
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

function timing(value: Record<string, unknown>): StepTiming {
  return {
    delay: number(value.delay, 0, 0, 5000),
    repeat: Math.round(number(value.repeat, 1, 1, 10)),
    repeatDelay: number(value.repeatDelay, 250, 0, 5000),
  };
}

function sources(value: unknown, extensions: readonly string[]): string[] | null {
  const list: unknown[] = Array.isArray(value) ? value : [value];
  if (list.length === 0 || list.length > LIMITS.variants) return null;
  return list.every((src) => isSafeAssetPath(src, extensions)) ? (list as string[]) : null;
}

function template(value: unknown): SpriteTemplate | null | undefined {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  const parts = value.map((part) => Number(part));
  if (!parts.every((part) => Number.isFinite(part) && part >= 0 && part <= 4000)) return undefined;
  const [grid = 0, start = 0, end = 0] = parts;
  return grid > 0 ? [grid, start, end] : undefined;
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
    case "sound": {
      const list = sources(value.src, SOUND_EXTENSIONS);
      if (!list) return null;
      return {
        type: "sound",
        src: list,
        volume: number(value.volume, 1, 0, 1.5),
        startTime: number(value.startTime, 0, 0, 10000),
        ...timing(value),
      };
    }
    case "sprite": {
      const list = sources(value.src, SPRITE_EXTENSIONS);
      const shape = template(value.template);
      if (!list || shape === undefined || !includes(ANCHORS, value.at)) return null;
      if (value.fallback !== undefined && !includes(PROCEDURAL_EFFECTS, value.fallback)) {
        return null;
      }
      return {
        type: "sprite",
        src: list,
        at: value.at,
        scale: number(value.scale, 1, 0.1, 10),
        duration: value.duration === undefined ? null : number(value.duration, 1000, 100, 10000),
        template: shape,
        opacity: number(value.opacity, 1, 0.05, 1),
        playbackRate: number(value.playbackRate, 1, 0.25, 4),
        randomOffset: value.randomOffset === true,
        persist: value.persist === true,
        fallback: includes(PROCEDURAL_EFFECTS, value.fallback) ? value.fallback : null,
        ...timing(value),
      };
    }
    default:
      return null;
  }
}

export function stepSources(step: CueStep): readonly string[] {
  return step.type === "sound" || step.type === "sprite" ? step.src : [];
}

export function withoutSources(
  steps: readonly CueStep[],
  missing: (src: string) => boolean,
): CueStep[] {
  const kept: CueStep[] = [];
  for (const step of steps) {
    if (step.type !== "sound" && step.type !== "sprite") {
      kept.push(step);
      continue;
    }
    const src = step.src.filter((entry) => !missing(entry));
    if (src.length > 0) kept.push({ ...step, src });
    else if (step.type === "sprite" && step.fallback) {
      kept.push(procedural(step.fallback, step.at === "path" ? "target" : step.at, step.scale));
    }
  }
  return kept;
}

export function parseCueSteps(value: unknown): CueStep[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > LIMITS.steps) return null;
  const steps = value.map(parseStep);
  return steps.every((step): step is CueStep => step !== null) ? steps : null;
}

export function isCueKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const [name, ...rest] = key.split(":");
  if (!includes(COMBAT_EVENTS, name) || rest.length > 1) return false;
  const parts = rest[0]?.split("+") ?? [];
  return parts.length <= 2 && parts.every((part) => QUALIFIER.test(part));
}
