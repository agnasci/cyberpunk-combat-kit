import { rollSkill, rollStat, type NativeRollResult } from "../integrations/cpr/attack-adapter";
import { rollInterface } from "../integrations/cpr/net-adapter";
import { findSkill, SKILLS, type SkillKey } from "../integrations/cpr/weapon-adapter";
import { registerHandler, request } from "../integrations/foundry/socket";
import { responderId, userCanOwn } from "../integrations/foundry/users";
import { npcDefenseMode, skipRollDialogs } from "../integrations/foundry/settings";
import { defendsAutomatically } from "../domain/routing";
import { askDefense, type DefensePurpose } from "../ui/defense-prompt";

const KIND = "defense";
const TIMEOUT_MS = 60000;
const PURPOSES: readonly DefensePurpose[] = [
  "ranged",
  "melee",
  "area",
  "suppression",
  "grapple",
  "jackIn",
  "forceOut",
];
export type DefenseCheck = SkillKey | "will" | "interface";

function isCheck(value: unknown): value is DefenseCheck {
  return (
    value === "will" || value === "interface" || (typeof value === "string" && value in SKILLS)
  );
}

export interface DefenseRequest {
  purpose: DefensePurpose;
  skill: DefenseCheck;
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
    !isCheck(data.skill) ||
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

async function rollCheck(
  defender: Actor,
  data: DefenseRequest,
  skipDialog: boolean,
): Promise<NativeRollResult | null> {
  const options = { actor: defender, tokenId: data.defenderTokenId, skipDialog };
  if (data.skill === "will") return rollStat("will", options);
  if (data.skill === "interface") {
    return rollInterface(defender, game.i18n.localize("CCK.Net.Interface"), options);
  }
  const skill = findSkill(defender, data.skill);
  if (!skill) throw new Error(`no-skill:${SKILLS[data.skill]}`);
  return rollSkill(skill, options);
}

async function answerDefense(payload: unknown): Promise<DefenseAnswer> {
  const data = parseRequest(payload);
  if (!data) throw new Error("invalid");
  const defender = await fromUuid(data.defenderUuid);
  if (!isActor(defender) || !userCanOwn(game.user.id, defender)) throw new Error("forbidden");
  if (defendsAutomatically(npcDefenseMode(), defender.hasPlayerOwner)) {
    const roll = await rollCheck(defender, data, true);
    return roll ? { choice: "rolled", total: roll.total } : { choice: "declined" };
  }
  const wantsToRoll = await askDefense({
    purpose: data.purpose,
    optional: data.optional,
    attackerName: data.attackerName,
    defenderName: defender.name,
    weaponName: data.weaponName,
    dv: data.dv,
  });
  if (!wantsToRoll) return { choice: "declined" };
  const roll = await rollCheck(defender, data, skipRollDialogs());
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
