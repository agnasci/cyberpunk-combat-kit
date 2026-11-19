import { MODULE_ID } from "../../constants";
import { rollRole, type NativeRollOptions, type NativeRollResult } from "./attack-adapter";

const NET_FLAG = "net";
const INJURY_PACKS = [
  "cyberpunk-red-core.core_critical-injuries-head",
  "cyberpunk-red-core.core_critical-injuries-body",
];

export type NetPart = "neuroport" | "selfIce";

export interface NetNames {
  neuroport: readonly string[];
  selfIce: readonly string[];
}

interface RoleSystem {
  rank?: unknown;
}

interface RoleInfo {
  roleInfo?: { activeNetRole?: unknown };
}

export function netRole(actor: Actor): Item | null {
  const id = (actor.system as RoleInfo).roleInfo?.activeNetRole;
  if (typeof id !== "string" || id.length === 0) return null;
  return (actor.itemTypes.role ?? []).find((role) => role.id === id) ?? null;
}

export function interfaceRank(actor: Actor): number {
  const role = netRole(actor);
  const rank = Number((role?.system as RoleSystem | undefined)?.rank);
  return Number.isInteger(rank) && rank > 0 ? rank : 0;
}

function isInstalled(item: Item): boolean {
  const system = item.system as { isInstalledInActor?: unknown; isInstalled?: unknown };
  return (system.isInstalledInActor ?? system.isInstalled) === true;
}

function matches(item: Item, part: NetPart, names: NetNames): boolean {
  const flag = item.getFlag(MODULE_ID, NET_FLAG);
  if (flag === part) return true;
  if (typeof flag === "string") return false;
  const name = item.name.toLowerCase();
  return names[part].some((term) => term.length > 0 && name.includes(term.toLowerCase()));
}

export function countPart(actor: Actor, part: NetPart, names: NetNames): number {
  return (actor.itemTypes.cyberware ?? []).filter(
    (item) => isInstalled(item) && matches(item, part, names),
  ).length;
}

export async function rollInterface(
  actor: Actor,
  title: string,
  options: NativeRollOptions,
): Promise<NativeRollResult | null> {
  const role = netRole(actor);
  if (!role) return null;
  const rank = interfaceRank(actor);
  return rollRole(role, options, (roll) => {
    const target = roll as unknown as { roleValue: number; rollTitle: string };
    target.roleValue = rank;
    target.rollTitle = title;
  });
}

function itemData(value: unknown): Record<string, unknown> | null {
  const doc = value as { toObject?: () => Record<string, unknown> } | null;
  return typeof doc?.toObject === "function" ? doc.toObject() : null;
}

export async function criticalInjuryData(name: string): Promise<Record<string, unknown> | null> {
  const wanted = name.trim().toLowerCase();
  for (const id of INJURY_PACKS) {
    const pack = game.packs.get(id);
    if (!pack) continue;
    const found = (await pack.getDocuments()).find(
      (doc) => (doc as { name?: string }).name?.toLowerCase() === wanted,
    );
    const data = itemData(found);
    if (data) {
      delete data._id;
      return data;
    }
  }
  return null;
}
