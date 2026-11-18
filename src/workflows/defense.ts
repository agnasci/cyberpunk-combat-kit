import type { AttackKind } from "../domain/attack-rules";
import { rollEvasion } from "../integrations/cpr/attack-adapter";
import { findEvasion } from "../integrations/cpr/weapon-adapter";
import { registerHandler, request } from "../integrations/foundry/socket";
import { userCanOwn } from "../integrations/foundry/users";
import { askDefense } from "../ui/defense-prompt";

const KIND = "defense";
const TIMEOUT_MS = 60000;

export interface DefenseRequest {
  attackerName: string;
  defenderUuid: string;
  defenderTokenId: string | null;
  weaponName: string;
  kind: AttackKind;
  dv: number | null;
}

export type DefenseAnswer =
  { choice: "dodge"; total: number } | { choice: "none" } | { choice: "no-answer" };

function isActor(value: unknown): value is Actor {
  const actor = value as Partial<Actor> | null;
  return typeof actor?.uuid === "string" && typeof actor.testUserPermission === "function";
}

function parseRequest(payload: unknown): DefenseRequest | null {
  const data = payload as Partial<DefenseRequest> | null;
  if (
    typeof data?.attackerName !== "string" ||
    typeof data.defenderUuid !== "string" ||
    typeof data.weaponName !== "string" ||
    (data.kind !== "ranged" && data.kind !== "melee")
  ) {
    return null;
  }
  return {
    attackerName: data.attackerName,
    defenderUuid: data.defenderUuid,
    defenderTokenId: typeof data.defenderTokenId === "string" ? data.defenderTokenId : null,
    weaponName: data.weaponName,
    kind: data.kind,
    dv: typeof data.dv === "number" ? data.dv : null,
  };
}

async function answerDefense(payload: unknown): Promise<DefenseAnswer> {
  const data = parseRequest(payload);
  if (!data) throw new Error("invalid");
  const defender = await fromUuid(data.defenderUuid);
  if (!isActor(defender) || !userCanOwn(game.user.id, defender)) throw new Error("forbidden");
  const choice = await askDefense({
    attackerName: data.attackerName,
    defenderName: defender.name,
    weaponName: data.weaponName,
    kind: data.kind,
    dv: data.dv,
  });
  if (choice === "none") return { choice: "none" };
  const evasion = findEvasion(defender);
  if (!evasion) throw new Error("no-evasion");
  const roll = await rollEvasion(evasion, {
    actor: defender,
    tokenId: data.defenderTokenId,
    skipDialog: false,
  });
  return roll ? { choice: "dodge", total: roll.total } : { choice: "none" };
}

export function initDefense(): void {
  registerHandler(KIND, answerDefense);
}

export async function requestDefense(
  responder: string,
  defenseRequest: DefenseRequest,
): Promise<DefenseAnswer> {
  const result = await request(KIND, responder, defenseRequest, TIMEOUT_MS);
  if (!result.ok) {
    if (result.error !== "timeout") console.error(`cyberpunk-combat-kit | ${result.error}`);
    return { choice: "no-answer" };
  }
  const answer = result.value as Partial<DefenseAnswer> | null;
  if (answer?.choice === "dodge" && typeof answer.total === "number") {
    return { choice: "dodge", total: answer.total };
  }
  return answer?.choice === "none" ? { choice: "none" } : { choice: "no-answer" };
}
