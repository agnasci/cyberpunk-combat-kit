import { rollSkill } from "../integrations/cpr/attack-adapter";
import { findSkill, SKILLS, type SkillKey } from "../integrations/cpr/weapon-adapter";
import { registerHandler, request } from "../integrations/foundry/socket";
import { responderId, userCanOwn } from "../integrations/foundry/users";
import { askDefense, type DefensePurpose } from "../ui/defense-prompt";

const KIND = "defense";
const TIMEOUT_MS = 60000;
const PURPOSES: readonly DefensePurpose[] = ["ranged", "melee", "area", "suppression", "grapple"];

export interface DefenseRequest {
  purpose: DefensePurpose;
  skill: SkillKey;
  optional: boolean;
  attackerName: string;
  defenderUuid: string;
  defenderTokenId: string | null;
  weaponName: string;
  dv: number | null;
}

export type DefenseAnswer =
  { choice: "rolled"; total: number } | { choice: "declined" } | { choice: "no-answer" };

function isActor(value: unknown): value is Actor {
  const actor = value as Partial<Actor> | null;
  return typeof actor?.uuid === "string" && typeof actor.testUserPermission === "function";
}

function parseRequest(payload: unknown): DefenseRequest | null {
  const data = payload as Partial<DefenseRequest> | null;
  if (
    !data ||
    !PURPOSES.includes(data.purpose as DefensePurpose) ||
    typeof data.skill !== "string" ||
    !(data.skill in SKILLS) ||
    typeof data.attackerName !== "string" ||
    typeof data.defenderUuid !== "string" ||
    typeof data.weaponName !== "string"
  ) {
    return null;
  }
  return {
    purpose: data.purpose as DefensePurpose,
    skill: data.skill,
    optional: data.optional === true,
    attackerName: data.attackerName,
    defenderUuid: data.defenderUuid,
    defenderTokenId: typeof data.defenderTokenId === "string" ? data.defenderTokenId : null,
    weaponName: data.weaponName,
    dv: typeof data.dv === "number" ? data.dv : null,
  };
}

async function answerDefense(payload: unknown): Promise<DefenseAnswer> {
  const data = parseRequest(payload);
  if (!data) throw new Error("invalid");
  const defender = await fromUuid(data.defenderUuid);
  if (!isActor(defender) || !userCanOwn(game.user.id, defender)) throw new Error("forbidden");
  const wantsToRoll = await askDefense({
    purpose: data.purpose,
    optional: data.optional,
    attackerName: data.attackerName,
    defenderName: defender.name,
    weaponName: data.weaponName,
    dv: data.dv,
  });
  if (!wantsToRoll) return { choice: "declined" };
  const skill = findSkill(defender, data.skill);
  if (!skill) throw new Error(`no-skill:${SKILLS[data.skill]}`);
  const roll = await rollSkill(skill, {
    actor: defender,
    tokenId: data.defenderTokenId,
    skipDialog: false,
  });
  return roll ? { choice: "rolled", total: roll.total } : { choice: "declined" };
}

export function initDefense(): void {
  registerHandler(KIND, answerDefense);
}

export async function requestDefense(
  defender: Actor,
  defenseRequest: DefenseRequest,
): Promise<DefenseAnswer> {
  const responder = responderId(defender);
  if (!responder) return { choice: "no-answer" };
  const result = await request(KIND, responder, defenseRequest, TIMEOUT_MS);
  if (!result.ok) {
    if (result.error !== "timeout") console.error(`cyberpunk-combat-kit | ${result.error}`);
    return { choice: "no-answer" };
  }
  const answer = result.value as Partial<DefenseAnswer> | null;
  if (answer?.choice === "rolled" && typeof answer.total === "number") {
    return { choice: "rolled", total: answer.total };
  }
  return answer?.choice === "declined" ? { choice: "declined" } : { choice: "no-answer" };
}
