import type { AttackKind } from "../../domain/attack-rules";
import { autofireMax, preferredWeapon, type ModeWeapon } from "../../domain/modes";
import { dvBandsFromResults, type DvBand } from "../../domain/range";

export const SKILLS = {
  evasion: "Evasion",
  concentration: "Concentration",
  brawling: "Brawling",
  athletics: "Athletics",
} as const;
export type SkillKey = keyof typeof SKILLS;
export const THROWN_DV_TABLE = "DV Thrown Weapon";
const DV_TABLE_SETTING = "dvRollTableCompendium";

export interface WeaponSnapshot extends ModeWeapon {
  id: string;
  name: string;
  equipped: boolean;
  dvTable: string;
  magazineMax: number | null;
  img: string | null;
}

export interface CombatantSnapshot {
  uuid: string;
  name: string;
  ref: number;
  body: number;
  isNpc: boolean;
}

interface LoadableItem {
  _getLoadedAmmoProp?: (prop: string) => unknown;
}

function loadedAmmoVariety(item: Item): string | null {
  const reader = (item as Item & LoadableItem)._getLoadedAmmoProp;
  if (typeof reader !== "function") return null;
  const variety = reader.call(item, "variety");
  return typeof variety === "string" && variety.length > 0 ? variety : null;
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
  const weaponType = field(system, "weaponType");
  const type = typeof weaponType === "string" ? weaponType : "";
  const max = kind === "ranged" ? numberAt(system, "magazine", "max") : null;
  const usesAmmo = max !== null && max > 0;
  return {
    id: item.id,
    name: item.name,
    img: typeof item.img === "string" && item.img ? item.img : null,
    kind,
    weaponType: type,
    equipped: field(system, "equipped") === "equipped",
    magazine: usesAmmo ? numberAt(system, "magazine", "value") : null,
    magazineMax: usesAmmo ? max : null,
    dvTable: typeof dvTable === "string" ? dvTable : "",
    ammoVariety: kind === "ranged" ? loadedAmmoVariety(item) : null,
    autofireMax: autofireMax(type, numberAt(system, "fireModes", "autoFire") ?? 0),
    suppressive: field(field(system, "fireModes"), "suppressiveFire") === true,
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
  return preferredWeapon(weapons);
}

export function combatantSnapshot(actor: Actor): CombatantSnapshot {
  return {
    uuid: actor.uuid,
    name: actor.name,
    ref: numberAt(actor.system, "stats", "ref", "value") ?? 0,
    body: numberAt(actor.system, "stats", "body", "value") ?? 0,
    isNpc: !actor.hasPlayerOwner,
  };
}

interface ReloadableItem {
  reload?: () => Promise<unknown>;
}

export async function reloadWeapon(item: Item): Promise<boolean> {
  const reload = (item as Item & ReloadableItem).reload;
  if (typeof reload !== "function") return false;
  await reload.call(item);
  return true;
}

export function findItem(actor: Actor, id: string): Item | undefined {
  return actor.items.find((item) => item.id === id);
}

export function findSkill(actor: Actor, skill: SkillKey): Item | undefined {
  return actor.items.find((item) => item.type === "skill" && item.name === SKILLS[skill]);
}

export function findEvasion(actor: Actor): Item | undefined {
  return findSkill(actor, "evasion");
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

let dvTables: Promise<Map<string, DvBand[]>> | null = null;

function isRollTable(value: unknown): value is RollTable {
  return typeof field(value, "name") === "string" && field(value, "results") !== undefined;
}

async function readDvTables(): Promise<Map<string, DvBand[]>> {
  const packId = game.settings.get(game.system.id, DV_TABLE_SETTING);
  const pack = typeof packId === "string" ? game.packs.get(packId) : undefined;
  if (!pack) return new Map();
  const tables = (await pack.getDocuments()).filter(isRollTable);
  return new Map(
    tables.map((table) => [
      table.name,
      dvBandsFromResults(
        table.results.contents.map((result) => ({ range: result.range, text: result.text })),
      ),
    ]),
  );
}

export function preloadDvTables(): Promise<Map<string, DvBand[]>> {
  dvTables ??= readDvTables().catch(() => {
    dvTables = null;
    return new Map<string, DvBand[]>();
  });
  return dvTables;
}

export async function loadDvBands(tableName: string): Promise<DvBand[] | null> {
  if (!tableName) return null;
  return (await preloadDvTables()).get(tableName) ?? null;
}
