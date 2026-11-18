import type { DamageApplication } from "./attack-rules";

export interface ApplyDamageRequest {
  op: "applyDamage";
  attackerUuid: string;
  targetUuid: string;
  damage: DamageApplication;
}

export interface ReverseDamageRequest {
  op: "reverseDamage";
  attackerUuid: string;
  targetUuid: string;
  hpReduction: number;
  location: "body" | "head";
  ablation: number;
}

export interface ChokeRequest {
  op: "choke";
  attackerUuid: string;
  targetUuid: string;
  body: number;
  round: number | null;
}

export interface ThrowDownRequest {
  op: "throwDown";
  attackerUuid: string;
  targetUuid: string;
  body: number;
}

export interface GrappleStartRequest {
  op: "grappleStart";
  attackerUuid: string;
  targetUuid: string;
}

export interface GrappleEndRequest {
  op: "grappleEnd";
  attackerUuid: string;
  targetUuid: string;
}

export type GmRequest =
  | ApplyDamageRequest
  | ReverseDamageRequest
  | ChokeRequest
  | ThrowDownRequest
  | GrappleStartRequest
  | GrappleEndRequest;

export interface DamageResult {
  hpBefore: number;
  hpAfter: number;
  hpReduction: number;
  ablation: number;
  location: "body" | "head";
  knockedOut?: boolean;
}

export function isUndoable(result: DamageResult | null): boolean {
  return !!result && (result.hpReduction > 0 || result.ablation > 0);
}

const LIMITS = {
  damage: 500,
  bonusDamage: 50,
  ablation: 20,
  percent: 100,
  belowSP: 100,
  hp: 1000,
  text: 60,
  body: 30,
  round: 100000,
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function intIn(value: unknown, max: number): number | null {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max
    ? (value as number)
    : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
}

function location(value: unknown): "body" | "head" | null {
  return value === "body" || value === "head" ? value : null;
}

function parseDamage(value: unknown): DamageApplication | null {
  const data = record(value);
  if (!data) return null;
  const damage = intIn(data.damage, LIMITS.damage);
  const bonusDamage = intIn(data.bonusDamage, LIMITS.bonusDamage);
  const where = location(data.location);
  const ablation = intIn(data.ablation, LIMITS.ablation);
  const ignoreArmorPercent = intIn(data.ignoreArmorPercent, LIMITS.percent);
  const ignoreBelowSP = intIn(data.ignoreBelowSP, LIMITS.belowSP);
  const ammoVariety =
    typeof data.ammoVariety === "string" && data.ammoVariety.length <= LIMITS.text
      ? data.ammoVariety
      : null;
  if (
    damage === null ||
    bonusDamage === null ||
    where === null ||
    ablation === null ||
    ignoreArmorPercent === null ||
    ignoreBelowSP === null ||
    ammoVariety === null ||
    typeof data.lethal !== "boolean"
  ) {
    return null;
  }
  return {
    damage,
    bonusDamage,
    location: where,
    ablation,
    ammoVariety,
    ignoreArmorPercent,
    ignoreBelowSP,
    lethal: data.lethal,
  };
}

export function parseGmRequest(value: unknown): GmRequest | null {
  const data = record(value);
  if (!data) return null;
  const attackerUuid = uuid(data.attackerUuid);
  const targetUuid = uuid(data.targetUuid);
  if (!attackerUuid || !targetUuid) return null;
  if (data.op === "applyDamage") {
    const damage = parseDamage(data.damage);
    return damage ? { op: "applyDamage", attackerUuid, targetUuid, damage } : null;
  }
  if (data.op === "reverseDamage") {
    const hpReduction = intIn(data.hpReduction, LIMITS.hp);
    const where = location(data.location);
    const ablation = intIn(data.ablation, LIMITS.ablation);
    if (hpReduction === null || where === null || ablation === null) return null;
    return {
      op: "reverseDamage",
      attackerUuid,
      targetUuid,
      hpReduction,
      location: where,
      ablation,
    };
  }
  if (data.op === "choke" || data.op === "throwDown") {
    const body = intIn(data.body, LIMITS.body);
    if (body === null) return null;
    if (data.op === "throwDown") return { op: "throwDown", attackerUuid, targetUuid, body };
    const round = data.round === null ? null : intIn(data.round, LIMITS.round);
    if (round === null && data.round !== null) return null;
    return { op: "choke", attackerUuid, targetUuid, body, round };
  }
  if (data.op === "grappleStart" || data.op === "grappleEnd") {
    return { op: data.op, attackerUuid, targetUuid };
  }
  return null;
}

export interface UserSummary {
  id: string;
  isGM: boolean;
  active: boolean;
}

export function chooseExecutor(users: readonly UserSummary[]): string | null {
  const ids = users
    .filter((user) => user.isGM && user.active)
    .map((user) => user.id)
    .sort();
  return ids[0] ?? null;
}

export interface OwnerSummary extends UserSummary {
  owner: boolean;
  characterMatches: boolean;
}

export function chooseResponder(users: readonly OwnerSummary[]): string | null {
  const players = users.filter((user) => user.active && !user.isGM && user.owner);
  const assigned = players.find((user) => user.characterMatches);
  return assigned?.id ?? players[0]?.id ?? chooseExecutor(users);
}
