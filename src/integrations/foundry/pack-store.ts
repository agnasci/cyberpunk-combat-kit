import { MODULE_ID } from "../../constants";
import { parseOverrides, type CueOverride } from "../../domain/overrides";
import {
  manifestPath,
  normalizeFolder,
  parseManifestText,
  parsePackEntries,
  type ManifestResult,
  type PackEntry,
} from "../../domain/pack";

const PACKS = "packs";
const OVERRIDES = "cueOverrides";
const PERSONAL_FLAG = "personalPack";
const PERSONAL_LIST_FLAG = "personalPacks";

export function registerPackSettings(handlers: { packs: () => void; overrides: () => void }): void {
  const world = { scope: "world", config: false, type: Object } as const;
  game.settings.register(MODULE_ID, PACKS, {
    ...world,
    name: "CCK.Packs.Title",
    default: [],
    onChange: handlers.packs,
  });
  game.settings.register(MODULE_ID, OVERRIDES, {
    ...world,
    name: "CCK.Cues.Title",
    default: {},
    onChange: handlers.overrides,
  });
}

export function packEntries(): PackEntry[] {
  return parsePackEntries(game.settings.get(MODULE_ID, PACKS));
}

export async function savePackEntries(entries: PackEntry[]): Promise<void> {
  await game.settings.set(MODULE_ID, PACKS, entries);
}

export function cueOverrides(): Record<string, CueOverride> {
  return parseOverrides(game.settings.get(MODULE_ID, OVERRIDES));
}

export async function saveCueOverrides(overrides: Record<string, CueOverride>): Promise<void> {
  await game.settings.set(MODULE_ID, OVERRIDES, overrides);
}

export async function fetchManifest(folder: string): Promise<ManifestResult> {
  const normalized = normalizeFolder(folder);
  if (!normalized) return { ok: false, errors: [{ code: "bad-folder", at: folder }] };
  try {
    const response = await fetch(foundry.utils.getRoute(manifestPath(normalized)), {
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, errors: [{ code: "not-found", at: normalized }] };
    return parseManifestText(await response.text(), normalized);
  } catch {
    return { ok: false, errors: [{ code: "not-found", at: normalized }] };
  }
}

const OVERLAPPING_MODULES = ["autoanimations"];

export function activeModuleIds(): Set<string> {
  const ids = new Set<string>();
  for (const module of game.modules.values()) if (module.active) ids.add(module.id);
  return ids;
}

export function overlappingAnimationModules(): string[] {
  return OVERLAPPING_MODULES.filter((id) => game.modules.get(id)?.active);
}

export function personalPackFolders(): string[] {
  const flags = game.modules.get(MODULE_ID)?.flags?.[MODULE_ID];
  const record =
    flags !== null && typeof flags === "object" ? (flags as Record<string, unknown>) : {};
  const list = Array.isArray(record[PERSONAL_LIST_FLAG])
    ? (record[PERSONAL_LIST_FLAG] as unknown[])
    : [record[PERSONAL_FLAG]];
  return list.flatMap((path) => {
    if (typeof path !== "string") return [];
    const folder = normalizeFolder(`modules/${MODULE_ID}/${path}`);
    return folder ? [folder] : [];
  });
}

function pick(type: "folder" | "audio", current: string | null): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    const picker = new FilePicker({
      type,
      current: current ?? "",
      callback: (path: string, app: { activeSource?: string }) => {
        finish(app.activeSource === "data" || app.activeSource === "public" ? path : null);
      },
    });
    void picker.render(true);
    Hooks.once("closeFilePicker", () => window.setTimeout(() => finish(null), 0));
  });
}

export function pickFolder(current: string | null): Promise<string | null> {
  return pick("folder", current);
}

export function pickAudio(current: string | null): Promise<string | null> {
  return pick("audio", current);
}
