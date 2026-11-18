import { chokeOutcome, nextChokeStreak } from "../../domain/grapple";
import { parseGmRequest, type DamageResult, type GmRequest } from "../../domain/gm-request";
import { applyNativeDamage, reverseNativeDamage, setHitPointsDirect } from "../cpr/damage-adapter";
import { hitPoints } from "../cpr/weapon-adapter";
import { endGrapple, grappleLink, setStatus, startGrapple, writeLink } from "./grapple-store";
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
  if (outcome.knockedOut) await setStatus(target.actor, "unconscious");
  return { ...result, knockedOut: outcome.knockedOut };
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
    case "reverseDamage":
      return reverseNativeDamage(
        target.actor,
        parsed.hpReduction,
        parsed.location,
        parsed.ablation,
      );
    case "choke":
      return choke(requireToken(attacker), target, parsed.body, parsed.round);
    case "throwDown": {
      const attackerToken = requireToken(attacker);
      const defender = requireToken(target);
      if (grappleLink(attackerToken)?.partnerUuid !== defender.uuid) throw new Error("invalid");
      const result = await setHitPointsDirect(target.actor, hitPoints(target.actor) - parsed.body);
      await endGrapple(attackerToken, defender);
      await setStatus(target.actor, "prone");
      return result;
    }
    case "grappleStart":
      await startGrapple(requireToken(attacker), requireToken(target));
      return null;
    case "grappleEnd": {
      const token = requireToken(attacker);
      await endGrapple(token, await partnerOf(token));
      return null;
    }
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
