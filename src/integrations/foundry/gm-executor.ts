import { chokeOutcome, nextChokeStreak } from "../../domain/grapple";
import {
  parseGmRequest,
  type DamageResult,
  type GmRequest,
  type NetRequest,
} from "../../domain/gm-request";
import type { PackQuickhack } from "../../domain/pack";
import {
  awareAfterQuickhack,
  intrusionBy,
  isLocked,
  lockFor,
  quickhackBlocker,
  turnKey,
} from "../../domain/quickhack";
import { countPart, interfaceRank } from "../cpr/net-adapter";
import { applyNativeDamage, reverseNativeDamage, setHitPointsDirect } from "../cpr/damage-adapter";
import { rollCriticalInjury } from "../cpr/injury-adapter";
import { hitPoints } from "../cpr/weapon-adapter";
import {
  clearStatuses,
  endGrapple,
  grappleLink,
  setStatus,
  startGrapple,
  writeLink,
} from "./grapple-store";
import { applyQuickhack, dropIntrusion, netState, saveIntrusion } from "./net-store";
import { quickhackSettings } from "./settings";
import { registerHandler, request, type RequestResult } from "./socket";
import { executorId, userCanOwn } from "./users";

const KIND = "gm";
const TIMEOUT_MS = 15000;

export type GmError = "no-gm" | "timeout" | "invalid" | "forbidden" | "not-found" | "failed";

export type GmResult = { ok: true; result: DamageResult | null } | { ok: false; error: GmError };

interface Resolved {
  actor: Actor;
  token: TokenDocument | null;
}

function asResolved(value: unknown): Resolved | null {
  const doc = value as { documentName?: string; actor?: Actor | null } | null;
  if (doc?.documentName === "Token") {
    const token = value as TokenDocument;
    return token.actor ? { actor: token.actor, token } : null;
  }
  const actor = value as Partial<Actor> | null;
  if (typeof actor?.uuid === "string" && typeof actor.testUserPermission === "function") {
    return { actor: actor as Actor, token: null };
  }
  return null;
}

async function resolve(uuid: string): Promise<Resolved> {
  const resolved = asResolved(await fromUuid(uuid));
  if (!resolved) throw new Error("not-found");
  return resolved;
}

function requireToken(resolved: Resolved): TokenDocument {
  if (!resolved.token) throw new Error("invalid");
  return resolved.token;
}

async function partnerOf(token: TokenDocument): Promise<TokenDocument | null> {
  const link = grappleLink(token);
  if (!link) return null;
  const partner = asResolved(await fromUuid(link.partnerUuid));
  return partner?.token ?? null;
}

async function choke(
  attacker: TokenDocument,
  target: Resolved,
  body: number,
  round: number | null,
) {
  const defender = requireToken(target);
  const link = grappleLink(defender);
  if (grappleLink(attacker)?.partnerUuid !== defender.uuid || !link) throw new Error("invalid");
  const streak = nextChokeStreak(link, round);
  const outcome = chokeOutcome(hitPoints(target.actor), body, streak);
  const result = await setHitPointsDirect(target.actor, outcome.hpAfter);
  await writeLink(defender, { ...link, chokeStreak: streak, lastChokeRound: round });
  const statuses = outcome.knockedOut ? await setStatus(target.actor, "unconscious") : [];
  return { ...result, knockedOut: outcome.knockedOut, chokeStreak: streak, statuses };
}

let quickhackSource: () => readonly PackQuickhack[] = () => [];

export function setQuickhackSource(source: () => readonly PackQuickhack[]): void {
  quickhackSource = source;
}

function passwalls(actor: Actor): number {
  return countPart(actor, "selfIce", quickhackSettings());
}

async function executeNet(
  request: NetRequest,
  attacker: Resolved,
  target: Resolved,
): Promise<DamageResult | null> {
  if (!quickhackSettings().enabled) throw new Error("invalid");
  const actingToken = requireToken(attacker);
  const otherToken = requireToken(target);
  if (request.op === "netForceOut") {
    const lock = lockFor(target.actor.uuid, game.time.worldTime);
    if (!(await dropIntrusion(actingToken, otherToken.uuid, lock))) throw new Error("invalid");
    return null;
  }
  const state = netState(otherToken);
  const intrusion = intrusionBy(state, actingToken.uuid);
  switch (request.op) {
    case "netJackIn":
      if (intrusion || isLocked(state, attacker.actor.uuid, game.time.worldTime)) {
        throw new Error("invalid");
      }
      await saveIntrusion(otherToken, {
        runnerUuid: actingToken.uuid,
        runnerActorUuid: attacker.actor.uuid,
        runnerName: attacker.actor.name,
        aware: request.aware,
        breached: 0,
        lastHack: null,
      });
      return null;
    case "netBreach":
      if (!intrusion || intrusion.breached >= passwalls(target.actor)) throw new Error("invalid");
      await saveIntrusion(otherToken, { ...intrusion, breached: intrusion.breached + 1 });
      return null;
    case "netJackOut":
      if (!(await dropIntrusion(otherToken, actingToken.uuid, null))) throw new Error("invalid");
      return null;
    case "netHack": {
      const quickhack = quickhackSource().find((entry) => entry.id === request.quickhackId);
      if (!quickhack) throw new Error("not-found");
      const turn = turnKey(game.combat?.started ? game.combat : null);
      const blocker = quickhackBlocker({
        rank: interfaceRank(attacker.actor),
        tier: quickhack.tier,
        intrusion,
        passwalls: passwalls(target.actor),
        inRange: true,
        turn,
        requiresUnaware: quickhack.requiresUnaware,
      });
      if (blocker || !intrusion) throw new Error("invalid");
      await saveIntrusion(otherToken, {
        ...intrusion,
        lastHack: turn,
        aware: awareAfterQuickhack(intrusion.aware, quickhack.alerts, request.success),
      });
      return request.success ? applyQuickhack(target.actor, quickhack) : null;
    }
  }
}

async function execute(payload: unknown, senderId: string): Promise<DamageResult | null> {
  if (!game.user.isGM) throw new Error("forbidden");
  const parsed = parseGmRequest(payload);
  if (!parsed) throw new Error("invalid");
  const attacker = await resolve(parsed.attackerUuid);
  const target = await resolve(parsed.targetUuid);
  if (!userCanOwn(senderId, attacker.actor)) throw new Error("forbidden");
  switch (parsed.op) {
    case "applyDamage":
      return applyNativeDamage(target.actor, parsed.damage);
    case "reverseDamage": {
      const result = await reverseNativeDamage(
        target.actor,
        parsed.hpReduction,
        parsed.location,
        parsed.ablation,
      );
      await clearStatuses(target.actor, parsed.statuses);
      return { ...result, statuses: parsed.statuses };
    }
    case "criticalInjury": {
      const injury = await rollCriticalInjury(target.actor, parsed.table);
      if (!injury) throw new Error("failed");
      const hp = hitPoints(target.actor);
      return {
        hpBefore: hp,
        hpAfter: hp,
        hpReduction: 0,
        ablation: 0,
        location: parsed.table,
        injury,
      };
    }
    case "choke":
      return choke(requireToken(attacker), target, parsed.body, parsed.round);
    case "throwDown": {
      const attackerToken = requireToken(attacker);
      const defender = requireToken(target);
      if (grappleLink(attackerToken)?.partnerUuid !== defender.uuid) throw new Error("invalid");
      const result = await setHitPointsDirect(target.actor, hitPoints(target.actor) - parsed.body);
      await endGrapple(attackerToken, defender);
      const statuses = await setStatus(target.actor, "prone");
      return { ...result, statuses };
    }
    case "grappleStart":
      await startGrapple(requireToken(attacker), requireToken(target));
      return null;
    case "grappleEnd": {
      const token = requireToken(attacker);
      await endGrapple(token, await partnerOf(token));
      return null;
    }
    case "netJackIn":
    case "netBreach":
    case "netHack":
    case "netJackOut":
    case "netForceOut":
      return executeNet(parsed, attacker, target);
  }
}

const KNOWN_ERRORS: readonly GmError[] = ["timeout", "invalid", "forbidden", "not-found"];

function toGmResult(result: RequestResult): GmResult {
  if (result.ok) return { ok: true, result: (result.value as DamageResult | null) ?? null };
  const known = KNOWN_ERRORS.find((error) => error === result.error);
  if (!known) console.error(`cyberpunk-combat-kit | ${result.error}`);
  return { ok: false, error: known ?? "failed" };
}

export function initGmExecutor(): void {
  registerHandler(KIND, execute);
}

export async function requestGm(gmRequest: GmRequest): Promise<GmResult> {
  const gmId = executorId();
  if (!gmId) return { ok: false, error: "no-gm" };
  return toGmResult(await request(KIND, gmId, gmRequest, TIMEOUT_MS));
}
