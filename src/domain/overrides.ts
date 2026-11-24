import {
  clamp,
  COMBAT_EVENTS,
  isCueKey,
  isSafeAssetPath,
  SOUND_EXTENSIONS,
  type CueMap,
  type CueStep,
} from "./cues";

export const AUTO = "auto";
export const SILENCE = "none";
const LIMIT = 300;

export interface CueOverride {
  choice: string;
  sound: string | null;
  volume: number;
}

export interface CueSource {
  id: string;
  cues: CueMap;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sourceChoice(sourceId: string, key: string): string {
  return `${sourceId}|${key}`;
}

function splitChoice(choice: string): { sourceId: string; key: string } | null {
  const index = choice.indexOf("|");
  if (index <= 0) return null;
  return { sourceId: choice.slice(0, index), key: choice.slice(index + 1) };
}

function isChoice(value: unknown): value is string {
  if (value === AUTO || value === SILENCE) return true;
  if (typeof value !== "string" || value.length > 160) return false;
  const parts = splitChoice(value);
  return parts !== null && /^[a-z0-9][a-z0-9-]{0,47}$/.test(parts.sourceId) && isCueKey(parts.key);
}

export function isDefaultOverride(override: CueOverride): boolean {
  return override.choice === AUTO && override.sound === null;
}

export function parseOverride(value: unknown): CueOverride | null {
  if (!isRecord(value) || !isChoice(value.choice)) return null;
  const sound =
    value.sound === null || value.sound === undefined || value.sound === ""
      ? null
      : isSafeAssetPath(value.sound, SOUND_EXTENSIONS)
        ? value.sound
        : undefined;
  if (sound === undefined) return null;
  const override = {
    choice: value.choice,
    sound,
    volume: value.volume === undefined ? 1 : clamp(Number(value.volume), 0, 1.5),
  };
  return isDefaultOverride(override) ? null : override;
}

export function parseOverrides(value: unknown): Record<string, CueOverride> {
  if (!isRecord(value)) return {};
  const result: Record<string, CueOverride> = {};
  for (const [key, entry] of Object.entries(value).slice(0, LIMIT)) {
    const parsed = isCueKey(key) ? parseOverride(entry) : null;
    if (parsed) result[key] = parsed;
  }
  return result;
}

function exactSteps(key: string, sources: readonly CueSource[]): readonly CueStep[] | null {
  for (const source of sources) {
    const steps = source.cues[key];
    if (steps) return steps;
  }
  return null;
}

function baseSteps(
  key: string,
  override: CueOverride,
  sources: readonly CueSource[],
): readonly CueStep[] | null {
  if (override.choice === SILENCE) return [];
  if (override.choice === AUTO) return exactSteps(key, sources) ?? [];
  const parts = splitChoice(override.choice);
  const source = parts ? sources.find((entry) => entry.id === parts.sourceId) : undefined;
  return parts && source ? (source.cues[parts.key] ?? null) : null;
}

export function overrideSteps(
  key: string,
  override: CueOverride,
  sources: readonly CueSource[],
): CueStep[] | null {
  const base = baseSteps(key, override, sources);
  if (base === null) return null;
  if (!override.sound) return [...base];
  const visuals = base.filter((step) => step.type !== "sound" && step.type !== "synth");
  return [
    ...visuals,
    {
      type: "sound",
      src: [override.sound],
      volume: override.volume,
      startTime: 0,
      delay: 0,
      repeat: 1,
      repeatDelay: 0,
    },
  ];
}

export function overrideLayer(
  overrides: Readonly<Record<string, CueOverride>>,
  sources: readonly CueSource[],
): CueMap {
  const layer: Record<string, CueStep[]> = {};
  for (const [key, override] of Object.entries(overrides)) {
    const steps = overrideSteps(key, override, sources);
    if (steps) layer[key] = steps;
  }
  return layer;
}

export function editorKeys(
  sources: readonly CueSource[],
  overrides: Readonly<Record<string, CueOverride>>,
): string[] {
  const keys = new Set<string>(COMBAT_EVENTS);
  for (const source of sources) for (const key of Object.keys(source.cues)) keys.add(key);
  for (const key of Object.keys(overrides)) keys.add(key);
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function choicesFor(key: string, sources: readonly CueSource[]): string[] {
  const choices = [AUTO, SILENCE];
  for (const source of sources) {
    for (const candidate of Object.keys(source.cues)) {
      if (candidate.split(":")[0] === key.split(":")[0]) {
        choices.push(sourceChoice(source.id, candidate));
      }
    }
  }
  return choices;
}
