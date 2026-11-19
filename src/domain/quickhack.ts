export const JACK_IN_RANGE_SQUARES = 25;
export const FIREWALL_DV = 6;
export const FIREWALL_FREE_RANK = 3;
export const LOCK_SECONDS = 3600;
const BREACH_BASE_DV = 4;
const BREACH_DV_PER_ICE = 2;
const MAX_ENTRIES = 50;

export interface NetIntrusion {
  runnerUuid: string;
  runnerActorUuid: string;
  runnerName: string;
  aware: boolean;
  breached: number;
  lastHack: string | null;
}

export interface NetLock {
  runnerActorUuid: string;
  until: number;
}

export interface NetState {
  intrusions: NetIntrusion[];
  locks: NetLock[];
}

export type NetBlocker =
  | "no-interface"
  | "no-neuroport"
  | "out-of-range"
  | "not-visible"
  | "locked"
  | "linked"
  | "not-linked"
  | "breach-needed"
  | "nothing-to-breach"
  | "tier-locked"
  | "once-per-turn"
  | "target-aware";

export type NetAudience = "public" | "gm" | "runner";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function shortText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 20
    ? value
    : 0;
}

function parseIntrusion(value: unknown): NetIntrusion | null {
  const data = record(value);
  if (!data) return null;
  const runnerUuid = shortText(data.runnerUuid);
  const runnerActorUuid = shortText(data.runnerActorUuid);
  const runnerName = shortText(data.runnerName);
  if (!runnerUuid || !runnerActorUuid || !runnerName) return null;
  return {
    runnerUuid,
    runnerActorUuid,
    runnerName,
    aware: data.aware === true,
    breached: count(data.breached),
    lastHack: shortText(data.lastHack),
  };
}

function parseLock(value: unknown): NetLock | null {
  const data = record(value);
  const runnerActorUuid = shortText(data?.runnerActorUuid);
  const until = data?.until;
  return runnerActorUuid && typeof until === "number" && Number.isFinite(until)
    ? { runnerActorUuid, until }
    : null;
}

export function parseNetState(value: unknown): NetState {
  const data = record(value);
  const list = (entry: unknown) => (Array.isArray(entry) ? entry.slice(0, MAX_ENTRIES) : []);
  return {
    intrusions: list(data?.intrusions)
      .map(parseIntrusion)
      .filter((entry): entry is NetIntrusion => entry !== null),
    locks: list(data?.locks)
      .map(parseLock)
      .filter((entry): entry is NetLock => entry !== null),
  };
}

export function intrusionBy(state: NetState, runnerUuid: string): NetIntrusion | null {
  return state.intrusions.find((entry) => entry.runnerUuid === runnerUuid) ?? null;
}

export function withIntrusion(state: NetState, intrusion: NetIntrusion): NetState {
  return {
    ...state,
    intrusions: [
      ...state.intrusions.filter((entry) => entry.runnerUuid !== intrusion.runnerUuid),
      intrusion,
    ],
  };
}

export function withoutIntrusion(
  state: NetState,
  runnerUuid: string,
  lock: NetLock | null,
  now: number,
): NetState {
  const locks = pruneLocks(state.locks, now).filter(
    (entry) => !lock || entry.runnerActorUuid !== lock.runnerActorUuid,
  );
  return {
    intrusions: state.intrusions.filter((entry) => entry.runnerUuid !== runnerUuid),
    locks: lock ? [...locks, lock] : locks,
  };
}

export function pruneLocks(locks: readonly NetLock[], now: number): NetLock[] {
  return locks.filter((entry) => entry.until > now);
}

export function lockFor(runnerActorUuid: string, now: number): NetLock {
  return { runnerActorUuid, until: now + LOCK_SECONDS };
}

export function isLocked(state: NetState, runnerActorUuid: string, now: number): boolean {
  return pruneLocks(state.locks, now).some((entry) => entry.runnerActorUuid === runnerActorUuid);
}

export function netActions(rank: number): number {
  if (rank <= 0) return 0;
  if (rank >= 10) return 5;
  return 2 + Math.floor((rank - 1) / 3);
}

export function tierAllowed(tier: number, rank: number): boolean {
  return rank >= 1 && tier <= rank;
}

export function breachDv(selfIce: number): number | null {
  return selfIce > 0 ? BREACH_BASE_DV + BREACH_DV_PER_ICE * selfIce : null;
}

export function firewallDv(rank: number): number | null {
  return rank < FIREWALL_FREE_RANK ? FIREWALL_DV : null;
}

export function inJackInRange(distance: number, squareSize: number): boolean {
  return Number.isFinite(distance) && distance <= JACK_IN_RANGE_SQUARES * squareSize + 0.01;
}

export function turnKey(combat: { id: string; round: number } | null): string | null {
  return combat && combat.round > 0 ? `${combat.id}:${combat.round}` : null;
}

export function checkPassed(total: number, dv: number): boolean {
  return total > dv;
}

export function targetStaysUnaware(runnerTotal: number, targetTotal: number): boolean {
  return runnerTotal > targetTotal;
}

export function forceOutSucceeds(targetTotal: number, runnerTotal: number): boolean {
  return targetTotal > runnerTotal;
}

export function awareAfterQuickhack(aware: boolean, alerts: boolean, success: boolean): boolean {
  return aware || (success && alerts);
}

export interface JackInCheck {
  rank: number;
  hasNeuroport: boolean;
  inRange: boolean;
  visible: boolean;
  locked: boolean;
  linked: boolean;
}

export function jackInBlocker(check: JackInCheck): NetBlocker | null {
  if (check.rank <= 0) return "no-interface";
  if (check.linked) return "linked";
  if (!check.hasNeuroport) return "no-neuroport";
  if (!check.visible) return "not-visible";
  if (!check.inRange) return "out-of-range";
  if (check.locked) return "locked";
  return null;
}

export function breachBlocker(
  intrusion: NetIntrusion | null,
  passwalls: number,
  inRange: boolean,
): NetBlocker | null {
  if (!intrusion) return "not-linked";
  if (!inRange) return "out-of-range";
  return intrusion.breached >= passwalls ? "nothing-to-breach" : null;
}

export interface QuickhackCheck {
  rank: number;
  tier: number;
  intrusion: NetIntrusion | null;
  passwalls: number;
  inRange: boolean;
  turn: string | null;
  requiresUnaware: boolean;
}

export function quickhackBlocker(check: QuickhackCheck): NetBlocker | null {
  const intrusion = check.intrusion;
  if (!intrusion) return "not-linked";
  if (!check.inRange) return "out-of-range";
  if (intrusion.breached < check.passwalls) return "breach-needed";
  if (!tierAllowed(check.tier, check.rank)) return "tier-locked";
  if (check.turn !== null && intrusion.lastHack === check.turn) return "once-per-turn";
  if (check.requiresUnaware && intrusion.aware) return "target-aware";
  return null;
}

export function netAudience(
  aware: boolean,
  runnerIsNpc: boolean,
  targetIsNpc: boolean,
): NetAudience {
  if (runnerIsNpc && targetIsNpc) return "gm";
  return aware ? "public" : "runner";
}

export interface Expiry {
  combatId: string;
  round: number;
}

export function expiryFor(
  combat: { id: string; round: number } | null,
  rounds: number | null,
): Expiry | null {
  if (rounds === null || !combat || combat.round <= 0) return null;
  return { combatId: combat.id, round: combat.round + rounds };
}

export function parseExpiry(value: unknown): Expiry | null {
  const data = record(value);
  const combatId = shortText(data?.combatId);
  const round = data?.round;
  return combatId && typeof round === "number" && Number.isInteger(round)
    ? { combatId, round }
    : null;
}

export function hasExpired(expiry: Expiry, combat: { id: string; round: number }): boolean {
  return expiry.combatId === combat.id && combat.round >= expiry.round;
}
