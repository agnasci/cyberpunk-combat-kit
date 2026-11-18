import { parseGmRequest, type DamageResult, type GmRequest } from "../../domain/gm-request";
import { applyNativeDamage, reverseNativeDamage } from "../cpr/damage-adapter";
import { registerHandler, request, type RequestResult } from "./socket";
import { executorId, userCanOwn } from "./users";

const KIND = "gm";
const TIMEOUT_MS = 15000;

export type GmError = "no-gm" | "timeout" | "invalid" | "forbidden" | "not-found" | "failed";

export type GmResult = { ok: true; result: DamageResult } | { ok: false; error: GmError };

function isActor(value: unknown): value is Actor {
  const actor = value as Partial<Actor> | null;
  return typeof actor?.uuid === "string" && typeof actor.testUserPermission === "function";
}

async function execute(payload: unknown, senderId: string): Promise<DamageResult> {
  if (!game.user.isGM) throw new Error("forbidden");
  const parsed = parseGmRequest(payload);
  if (!parsed) throw new Error("invalid");
  const attacker = await fromUuid(parsed.attackerUuid);
  const target = await fromUuid(parsed.targetUuid);
  if (!isActor(attacker) || !isActor(target)) throw new Error("not-found");
  if (!userCanOwn(senderId, attacker)) throw new Error("forbidden");
  if (parsed.op === "applyDamage") return applyNativeDamage(target, parsed.damage);
  return reverseNativeDamage(target, parsed.hpReduction, parsed.location, parsed.ablation);
}

const KNOWN_ERRORS: readonly GmError[] = ["timeout", "invalid", "forbidden", "not-found"];

function toGmResult(result: RequestResult): GmResult {
  if (result.ok) return { ok: true, result: result.value as DamageResult };
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
