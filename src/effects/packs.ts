import {
  parseManifest,
  withActiveModules,
  type ContentPack,
  type ManifestResult,
  type PackEntry,
} from "../domain/pack";
import {
  activeModuleIds,
  cueOverrides,
  fetchManifest,
  packEntries,
  personalPackFolder,
} from "../integrations/foundry/pack-store";
import { setCueOverrides, setPackCues } from "./engine";

export interface WorldPack extends PackEntry {
  result: ManifestResult | null;
}

let worldPacks: WorldPack[] = [];
const codePacks = new Map<string, ContentPack>();
let generation = 0;

export function activePacks(): ContentPack[] {
  const active: ContentPack[] = [];
  const add = (pack: ContentPack) => {
    if (!active.some((other) => other.id === pack.id)) active.push(pack);
  };
  for (const entry of worldPacks) if (entry.enabled && entry.result?.ok) add(entry.result.pack);
  for (const pack of codePacks.values()) add(pack);
  return active;
}

function apply(): void {
  const modules = activeModuleIds();
  setPackCues(
    activePacks()
      .filter((pack) => pack.kinds.includes("cues"))
      .map((pack) => ({ id: pack.id, cues: withActiveModules(pack, modules).cues })),
  );
  setCueOverrides(cueOverrides());
}

export function applyOverrides(): void {
  setCueOverrides(cueOverrides());
}

export async function reloadPacks(): Promise<void> {
  const current = ++generation;
  const loaded = await Promise.all(
    packEntries().map(async (entry) => ({
      ...entry,
      result: entry.enabled ? await fetchManifest(entry.folder) : null,
    })),
  );
  if (current !== generation) return;
  worldPacks = loaded;
  apply();
}

export function worldPackStatus(): WorldPack[] {
  return worldPacks;
}

export function codePackList(): ContentPack[] {
  return [...codePacks.values()];
}

export function registerPack(manifest: unknown, folder: string): ManifestResult {
  const result = parseManifest(manifest, folder);
  if (result.ok) {
    codePacks.set(result.pack.id, result.pack);
    apply();
  }
  return result;
}

export function unregisterPack(id: string): void {
  if (codePacks.delete(id)) apply();
}

export async function initPacks(): Promise<void> {
  const personal = personalPackFolder();
  if (personal) {
    const result = await fetchManifest(personal);
    if (result.ok) codePacks.set(result.pack.id, result.pack);
    else console.warn("cyberpunk-combat-kit | personal pack", result.errors);
  }
  await reloadPacks();
}
