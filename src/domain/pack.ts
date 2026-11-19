import { isCueKey, isSafeAssetPath, parseCueSteps, type CueMap, type CueStep } from "./cues";

export const MANIFEST_FILE = "cck-pack.json";
export const MANIFEST_MAX_BYTES = 256 * 1024;
export const PACK_KINDS = ["cues", "quickhacks"] as const;
export type PackKind = (typeof PACK_KINDS)[number];
export const ASSET_EXTENSIONS = ["ogg", "mp3", "wav", "webm", "webp", "png", "svg", "json"];
export const QUICKHACK_EFFECTS = ["damage", "status", "criticalInjury", "guided"] as const;
export type QuickhackEffect = (typeof QUICKHACK_EFFECTS)[number];

const LIMITS = { assets: 200, cues: 200, quickhacks: 100, title: 80, folder: 160 } as const;
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
  effect: QuickhackEffect;
}

export interface ContentPack {
  id: string;
  version: string;
  title: string;
  kinds: PackKind[];
  folder: string;
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

function resolveAssets(value: unknown, folder: string, errors: PackError[]): Map<string, string> {
  const assets = new Map<string, string>();
  if (value === undefined) return assets;
  if (!isRecord(value)) {
    errors.push({ code: "bad-asset-key", at: "assets" });
    return assets;
  }
  const entries = Object.entries(value);
  if (entries.length > LIMITS.assets) errors.push({ code: "too-many", at: "assets" });
  for (const [key, path] of entries.slice(0, LIMITS.assets)) {
    if (!ASSET_KEY.test(key)) {
      errors.push({ code: "bad-asset-key", at: `assets.${key}` });
      continue;
    }
    const full = `${folder}/${String(path)}`;
    if (!isSafeAssetPath(path, ASSET_EXTENSIONS) || !isSafeAssetPath(full, ASSET_EXTENSIONS)) {
      errors.push({ code: "bad-asset-path", at: `assets.${key}` });
      continue;
    }
    assets.set(key, full);
  }
  return assets;
}

function withAssets(
  steps: unknown,
  assets: Map<string, string>,
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
  assets: Map<string, string>,
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

function parseQuickhack(
  value: unknown,
  assets: Map<string, string>,
  folder: string,
): PackQuickhack | null {
  if (!isRecord(value) || !isRecord(value.effect)) return null;
  const id = typeof value.id === "string" && ASSET_KEY.test(value.id) ? value.id : null;
  const name = text(value.name, LIMITS.title);
  const tier = integer(value.tier, 1, 10);
  const dv = integer(value.dv, 1, 40);
  const effect = value.effect.type;
  if (!id || !name || tier === null || dv === null) return null;
  if (typeof effect !== "string" || !(QUICKHACK_EFFECTS as readonly string[]).includes(effect)) {
    return null;
  }
  let icon: string | null = null;
  if (value.icon !== undefined) {
    const key = typeof value.icon === "string" ? assets.get(value.icon) : undefined;
    const direct = `${folder}/${String(value.icon)}`;
    if (key) icon = key;
    else if (
      isSafeAssetPath(value.icon, ASSET_EXTENSIONS) &&
      isSafeAssetPath(direct, ASSET_EXTENSIONS)
    ) {
      icon = direct;
    } else return null;
  }
  return { id, name, tier, dv, icon, effect: effect as QuickhackEffect };
}

function parseQuickhacks(
  value: unknown,
  assets: Map<string, string>,
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
  const assets = resolveAssets(value.assets, folder, errors);
  const cues = kinds.includes("cues") ? parseCues(value.cues, assets, errors) : {};
  const quickhacks = kinds.includes("quickhacks")
    ? parseQuickhacks(value.quickhacks, assets, folder, errors)
    : [];
  if (errors.length > 0 || !id || !version || !title) return { ok: false, errors };
  return { ok: true, pack: { id, version, title, kinds, folder, cues, quickhacks } };
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
