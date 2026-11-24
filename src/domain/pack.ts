import {
  isCueKey,
  isSafeAssetPath,
  parseCueSteps,
  withoutSources,
  type CueMap,
  type CueStep,
} from "./cues";

export const MANIFEST_FILE = "cck-pack.json";
export const MANIFEST_MAX_BYTES = 512 * 1024;
export const PACK_KINDS = ["cues", "quickhacks"] as const;
export type PackKind = (typeof PACK_KINDS)[number];
export const ASSET_EXTENSIONS = ["ogg", "mp3", "wav", "flac", "webm", "webp", "png", "svg", "json"];
export const QUICKHACK_EFFECTS = ["damage", "status", "criticalInjury", "guided"] as const;
export type QuickhackEffectType = (typeof QUICKHACK_EFFECTS)[number];
export const MAX_EFFECT_ROUNDS = 1200;
const FORMULA = /^(\d{1,2}d(4|6|8|10|12)|\d{1,3})([+-]\d{1,3})?$/;
const STATUS_ID = /^[A-Za-z0-9_.-]{1,40}$/;

export type QuickhackEffect =
  | { type: "damage"; formula: string; ongoing: boolean }
  | { type: "status"; status: string; rounds: number | null }
  | { type: "criticalInjury"; injury: string; rounds: number | null }
  | { type: "guided" };

const LIMITS = {
  assets: 400,
  cues: 400,
  quickhacks: 100,
  title: 80,
  folder: 160,
  requires: 10,
  variants: 8,
} as const;
const MODULE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const PACK_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const RESERVED_SOURCES = ["default", "code"];
const ASSET_KEY = /^[A-Za-z0-9_-]{1,48}$/;
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}(-[A-Za-z0-9.-]{1,24})?$/;
const FOLDER = /^[A-Za-z0-9 _.()-]+(\/[A-Za-z0-9 _.()-]+)*$/;

export interface PackQuickhack {
  id: string;
  name: string;
  tier: number;
  dv: number;
  icon: string | null;
  alerts: boolean;
  requiresUnaware: boolean;
  effect: QuickhackEffect;
}

export interface ContentPack {
  id: string;
  version: string;
  title: string;
  kinds: PackKind[];
  folder: string;
  requires: string[];
  cues: CueMap;
  quickhacks: PackQuickhack[];
}

export type PackErrorCode =
  | "not-object"
  | "not-found"
  | "bad-id"
  | "bad-version"
  | "bad-title"
  | "bad-kinds"
  | "bad-folder"
  | "bad-asset-key"
  | "bad-asset-path"
  | "too-many"
  | "bad-cue-key"
  | "bad-cue"
  | "unknown-asset"
  | "bad-quickhack"
  | "bad-requires"
  | "duplicate";

export interface PackError {
  code: PackErrorCode;
  at: string;
}

export type ManifestResult = { ok: true; pack: ContentPack } | { ok: false; errors: PackError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

export function normalizeFolder(folder: string): string | null {
  const trimmed = folder.trim().replace(/\/+$/, "");
  if (trimmed.length === 0 || trimmed.length > LIMITS.folder) return null;
  if (trimmed.split("/").some((part) => part === "." || part === "..")) return null;
  return FOLDER.test(trimmed) ? trimmed : null;
}

export function manifestPath(folder: string): string {
  return `${folder}/${MANIFEST_FILE}`;
}

function parseRequires(value: unknown, errors: PackError[]): string[] {
  if (value === undefined) return [];
  const valid =
    Array.isArray(value) &&
    value.length <= LIMITS.requires &&
    value.every((id) => typeof id === "string" && MODULE_ID_PATTERN.test(id));
  if (!valid) {
    errors.push({ code: "bad-requires", at: "requires" });
    return [];
  }
  return [...new Set(value as string[])];
}

function pathList(value: unknown): unknown[] | null {
  const list: unknown[] = Array.isArray(value) ? value : [value];
  return list.length > 0 && list.length <= LIMITS.variants ? list : null;
}

export function externalModule(path: string): string | null {
  const [root, id] = path.split("/");
  return root === "modules" && id && MODULE_ID_PATTERN.test(id) ? id : null;
}

function resolveAssets(
  value: unknown,
  folder: string,
  errors: PackError[],
  assets: Map<string, string[]>,
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push({ code: "bad-asset-key", at: "assets" });
    return;
  }
  const entries = Object.entries(value);
  if (entries.length > LIMITS.assets) errors.push({ code: "too-many", at: "assets" });
  for (const [key, raw] of entries.slice(0, LIMITS.assets)) {
    if (!ASSET_KEY.test(key)) {
      errors.push({ code: "bad-asset-key", at: `assets.${key}` });
      continue;
    }
    const list = pathList(raw);
    const full = list?.map((path) => `${folder}/${String(path)}`);
    const safe =
      list?.every((path) => isSafeAssetPath(path, ASSET_EXTENSIONS)) &&
      full?.every((path) => isSafeAssetPath(path, ASSET_EXTENSIONS));
    if (!safe || !full) {
      errors.push({ code: "bad-asset-path", at: `assets.${key}` });
      continue;
    }
    assets.set(key, full);
  }
}

function resolveExternal(
  value: unknown,
  requires: readonly string[],
  errors: PackError[],
  assets: Map<string, string[]>,
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push({ code: "bad-asset-key", at: "external" });
    return;
  }
  const entries = Object.entries(value);
  if (entries.length + assets.size > LIMITS.assets) {
    errors.push({ code: "too-many", at: "external" });
  }
  for (const [key, raw] of entries.slice(0, LIMITS.assets)) {
    const at = `external.${key}`;
    if (!ASSET_KEY.test(key)) {
      errors.push({ code: "bad-asset-key", at });
      continue;
    }
    if (assets.has(key)) {
      errors.push({ code: "duplicate", at });
      continue;
    }
    const list = pathList(raw);
    const valid = list?.every((path) => {
      if (!isSafeAssetPath(path, ASSET_EXTENSIONS)) return false;
      const id = externalModule(path);
      return id !== null && requires.includes(id);
    });
    if (!valid || !list) {
      errors.push({ code: "bad-asset-path", at });
      continue;
    }
    assets.set(key, list as string[]);
  }
}

function withAssets(
  steps: unknown,
  assets: Map<string, string[]>,
  at: string,
  errors: PackError[],
): unknown {
  if (!Array.isArray(steps)) return steps;
  return steps.map((step, index) => {
    if (!isRecord(step) || step.asset === undefined) return step;
    const src = typeof step.asset === "string" ? assets.get(step.asset) : undefined;
    if (!src) {
      errors.push({ code: "unknown-asset", at: `${at}[${index}]` });
      return step;
    }
    const rest: Record<string, unknown> = { ...step };
    delete rest.asset;
    return { ...rest, src };
  });
}

function parseCues(
  value: unknown,
  assets: Map<string, string[]>,
  errors: PackError[],
): Record<string, CueStep[]> {
  const cues: Record<string, CueStep[]> = {};
  if (value === undefined) return cues;
  if (!isRecord(value)) {
    errors.push({ code: "bad-cue", at: "cues" });
    return cues;
  }
  const entries = Object.entries(value);
  if (entries.length > LIMITS.cues) errors.push({ code: "too-many", at: "cues" });
  for (const [key, steps] of entries.slice(0, LIMITS.cues)) {
    const at = `cues.${key}`;
    if (!isCueKey(key)) {
      errors.push({ code: "bad-cue-key", at });
      continue;
    }
    const before = errors.length;
    const parsed = parseCueSteps(withAssets(steps, assets, at, errors));
    if (errors.length > before) continue;
    if (!parsed) {
      errors.push({ code: "bad-cue", at });
      continue;
    }
    cues[key] = parsed;
  }
  return cues;
}

function integer(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

function rounds(value: unknown): number | null | undefined {
  if (value === undefined) return null;
  return integer(value, 1, MAX_EFFECT_ROUNDS) ?? undefined;
}

function parseEffect(value: Record<string, unknown>): QuickhackEffect | null {
  switch (value.type) {
    case "damage": {
      const formula = typeof value.formula === "string" ? value.formula.replace(/\s+/g, "") : "";
      if (!FORMULA.test(formula)) return null;
      if (value.ongoing !== undefined && typeof value.ongoing !== "boolean") return null;
      return { type: "damage", formula, ongoing: value.ongoing === true };
    }
    case "status": {
      const duration = rounds(value.rounds);
      if (typeof value.status !== "string" || !STATUS_ID.test(value.status)) return null;
      return duration === undefined
        ? null
        : { type: "status", status: value.status, rounds: duration };
    }
    case "criticalInjury": {
      const duration = rounds(value.rounds);
      const injury = text(value.injury, LIMITS.title);
      return injury && duration !== undefined
        ? { type: "criticalInjury", injury, rounds: duration }
        : null;
    }
    case "guided":
      return { type: "guided" };
    default:
      return null;
  }
}

function optionalFlag(value: unknown, fallback: boolean): boolean | null {
  if (value === undefined) return fallback;
  return typeof value === "boolean" ? value : null;
}

function parseQuickhack(
  value: unknown,
  assets: Map<string, string[]>,
  folder: string,
): PackQuickhack | null {
  if (!isRecord(value) || !isRecord(value.effect)) return null;
  const id = typeof value.id === "string" && ASSET_KEY.test(value.id) ? value.id : null;
  const name = text(value.name, LIMITS.title);
  const tier = integer(value.tier, 1, 10);
  const dv = integer(value.dv, 1, 40);
  const effect = parseEffect(value.effect);
  const alerts = optionalFlag(value.alerts, true);
  const requiresUnaware = optionalFlag(value.requiresUnaware, false);
  if (!id || !name || tier === null || dv === null || !effect) return null;
  if (alerts === null || requiresUnaware === null) return null;
  let icon: string | null = null;
  if (value.icon !== undefined) {
    const key = typeof value.icon === "string" ? assets.get(value.icon)?.[0] : undefined;
    const direct = `${folder}/${String(value.icon)}`;
    if (key) icon = key;
    else if (
      isSafeAssetPath(value.icon, ASSET_EXTENSIONS) &&
      isSafeAssetPath(direct, ASSET_EXTENSIONS)
    ) {
      icon = direct;
    } else return null;
  }
  return { id, name, tier, dv, icon, alerts, requiresUnaware, effect };
}

function parseQuickhacks(
  value: unknown,
  assets: Map<string, string[]>,
  folder: string,
  errors: PackError[],
): PackQuickhack[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push({ code: "bad-quickhack", at: "quickhacks" });
    return [];
  }
  if (value.length > LIMITS.quickhacks) errors.push({ code: "too-many", at: "quickhacks" });
  const result: PackQuickhack[] = [];
  value.slice(0, LIMITS.quickhacks).forEach((entry, index) => {
    const parsed = parseQuickhack(entry, assets, folder);
    if (!parsed) errors.push({ code: "bad-quickhack", at: `quickhacks[${index}]` });
    else if (result.some((other) => other.id === parsed.id)) {
      errors.push({ code: "duplicate", at: `quickhacks[${index}]` });
    } else result.push(parsed);
  });
  return result;
}

function parseKinds(value: unknown, errors: PackError[]): PackKind[] {
  if (value === undefined) return ["cues"];
  const valid =
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((kind) => (PACK_KINDS as readonly unknown[]).includes(kind));
  if (!valid) {
    errors.push({ code: "bad-kinds", at: "kinds" });
    return [];
  }
  return [...new Set(value as PackKind[])];
}

export function parseManifest(value: unknown, folderInput: string): ManifestResult {
  const folder = normalizeFolder(folderInput);
  if (!folder) return { ok: false, errors: [{ code: "bad-folder", at: "folder" }] };
  if (!isRecord(value)) return { ok: false, errors: [{ code: "not-object", at: "" }] };
  const errors: PackError[] = [];
  const id =
    typeof value.id === "string" && PACK_ID.test(value.id) && !RESERVED_SOURCES.includes(value.id)
      ? value.id
      : null;
  if (!id) errors.push({ code: "bad-id", at: "id" });
  const version =
    typeof value.version === "string" && VERSION.test(value.version) ? value.version : null;
  if (!version) errors.push({ code: "bad-version", at: "version" });
  const title = text(value.title, LIMITS.title);
  if (!title) errors.push({ code: "bad-title", at: "title" });
  const kinds = parseKinds(value.kinds, errors);
  const requires = parseRequires(value.requires, errors);
  const assets = new Map<string, string[]>();
  resolveAssets(value.assets, folder, errors, assets);
  resolveExternal(value.external, requires, errors, assets);
  const cues = kinds.includes("cues") ? parseCues(value.cues, assets, errors) : {};
  const quickhacks = kinds.includes("quickhacks")
    ? parseQuickhacks(value.quickhacks, assets, folder, errors)
    : [];
  if (errors.length > 0 || !id || !version || !title) return { ok: false, errors };
  return { ok: true, pack: { id, version, title, kinds, folder, requires, cues, quickhacks } };
}

export function missingModules(pack: ContentPack, active: ReadonlySet<string>): string[] {
  return pack.requires.filter((id) => !active.has(id));
}

export function withActiveModules(pack: ContentPack, active: ReadonlySet<string>): ContentPack {
  const missing = new Set(missingModules(pack, active));
  if (missing.size === 0) return pack;
  const absent = (src: string) => {
    const id = externalModule(src);
    return id !== null && missing.has(id);
  };
  const cues: Record<string, CueStep[]> = {};
  for (const [key, steps] of Object.entries(pack.cues)) {
    const kept = withoutSources(steps, absent);
    if (kept.length > 0) cues[key] = kept;
  }
  return { ...pack, cues };
}

export function parseManifestText(text: string, folder: string): ManifestResult {
  if (text.length > MANIFEST_MAX_BYTES) {
    return { ok: false, errors: [{ code: "too-many", at: MANIFEST_FILE }] };
  }
  try {
    return parseManifest(JSON.parse(text) as unknown, folder);
  } catch {
    return { ok: false, errors: [{ code: "not-object", at: MANIFEST_FILE }] };
  }
}

export interface PackEntry {
  folder: string;
  enabled: boolean;
}

export function parsePackEntries(value: unknown): PackEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: PackEntry[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.folder !== "string") continue;
    const folder = normalizeFolder(entry.folder);
    if (!folder || seen.has(folder)) continue;
    seen.add(folder);
    entries.push({ folder, enabled: entry.enabled === true });
  }
  return entries;
}

export function cueLayers(packs: readonly ContentPack[]): CueMap[] {
  return packs.filter((pack) => pack.kinds.includes("cues")).map((pack) => pack.cues);
}
