import type { AttackKind } from "../../domain/attack-rules";
import { dvBandsFromResults, type DvBand } from "../../domain/range";

export const EVASION_SKILL = "Evasion";
const DV_TABLE_SETTING = "dvRollTableCompendium";

export interface WeaponSnapshot {
  id: string;
  name: string;
  kind: AttackKind;
  equipped: boolean;
  magazine: number | null;
  dvTable: string;
}

export interface CombatantSnapshot {
  uuid: string;
  name: string;
  ref: number;
  isNpc: boolean;
}

function field(source: unknown, key: string): unknown {
  return source !== null && typeof source === "object"
    ? (source as Record<string, unknown>)[key]
    : undefined;
}

function numberAt(source: unknown, ...path: string[]): number | null {
  const value = path.reduce<unknown>((current, key) => field(current, key), source);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function weaponSnapshot(item: Item): WeaponSnapshot | null {
  if (item.type !== "weapon") return null;
  const system = item.system;
  const kind: AttackKind = field(system, "isRanged") === true ? "ranged" : "melee";
  const dvTable = field(system, "dvTable");
  return {
    id: item.id,
    name: item.name,
    kind,
    equipped: field(system, "equipped") === "equipped",
    magazine: kind === "ranged" ? numberAt(system, "magazine", "value") : null,
    dvTable: typeof dvTable === "string" ? dvTable : "",
  };
}

export function weaponsOf(actor: Actor): WeaponSnapshot[] {
  return (actor.itemTypes.weapon ?? [])
    .map(weaponSnapshot)
    .filter((weapon): weapon is WeaponSnapshot => weapon !== null);
}

export function pickWeapon(actor: Actor, weaponId?: string): WeaponSnapshot | null {
  const weapons = weaponsOf(actor);
  if (weaponId) return weapons.find((weapon) => weapon.id === weaponId) ?? null;
  return weapons.find((weapon) => weapon.equipped) ?? null;
}

export function combatantSnapshot(actor: Actor): CombatantSnapshot {
  return {
    uuid: actor.uuid,
    name: actor.name,
    ref: numberAt(actor.system, "stats", "ref", "value") ?? 0,
    isNpc: !actor.hasPlayerOwner,
  };
}

export function findItem(actor: Actor, id: string): Item | undefined {
  return actor.items.find((item) => item.id === id);
}

export function findEvasion(actor: Actor): Item | undefined {
  return actor.items.find((item) => item.type === "skill" && item.name === EVASION_SKILL);
}

export function hitPoints(actor: Actor): number {
  return numberAt(actor.system, "derivedStats", "hp", "value") ?? 0;
}

export function armorAblation(actor: Actor, location: "body" | "head"): number {
  const key = location === "head" ? "headLocation" : "bodyLocation";
  return (actor.itemTypes.armor ?? [])
    .filter((armor) => field(armor.system, "equipped") === "equipped")
    .reduce((max, armor) => Math.max(max, numberAt(armor.system, key, "ablation") ?? 0), 0);
}

const dvCache = new Map<string, DvBand[]>();

function isRollTable(value: unknown): value is RollTable {
  return typeof field(value, "name") === "string" && field(value, "results") !== undefined;
}

export async function loadDvBands(tableName: string): Promise<DvBand[] | null> {
  if (!tableName) return null;
  const cached = dvCache.get(tableName);
  if (cached) return cached;
  const packId = game.settings.get(game.system.id, DV_TABLE_SETTING);
  const pack = typeof packId === "string" ? game.packs.get(packId) : undefined;
  if (!pack) return null;
  const tables = (await pack.getDocuments()).filter(isRollTable);
  const table = tables.find((entry) => entry.name === tableName);
  if (!table) return null;
  const bands = dvBandsFromResults(
    table.results.contents.map((result) => ({ range: result.range, text: result.text })),
  );
  dvCache.set(tableName, bands);
  return bands;
}
