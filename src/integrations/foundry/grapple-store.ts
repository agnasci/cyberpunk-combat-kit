import { MODULE_ID } from "../../constants";
import { GRAPPLE_PENALTY, type GrappleLink } from "../../domain/grapple";
import { addAllActionsPenalty, removeMarkedEffects } from "../cpr/effect-adapter";

const FLAG = "grapple";

export type StatusId = "prone" | "unconscious";

export function grappleLink(token: TokenDocument): GrappleLink | null {
  const link = token.getFlag(MODULE_ID, FLAG) as GrappleLink | undefined;
  return link && typeof link.partnerUuid === "string" ? link : null;
}

export async function writeLink(token: TokenDocument, link: GrappleLink): Promise<void> {
  await token.setFlag(MODULE_ID, FLAG, link);
}

async function addPenalty(actor: Actor): Promise<void> {
  await addAllActionsPenalty(actor, {
    name: game.i18n.localize("CCK.Grapple.Effect"),
    value: GRAPPLE_PENALTY,
    scope: MODULE_ID,
    flag: FLAG,
  });
}

async function removePenalty(actor: Actor): Promise<void> {
  await removeMarkedEffects(actor, MODULE_ID, FLAG);
}

export async function startGrapple(
  attacker: TokenDocument,
  defender: TokenDocument,
): Promise<void> {
  await writeLink(attacker, {
    role: "attacker",
    partnerUuid: defender.uuid,
    chokeStreak: 0,
    lastChokeRound: null,
  });
  await writeLink(defender, {
    role: "defender",
    partnerUuid: attacker.uuid,
    chokeStreak: 0,
    lastChokeRound: null,
  });
  for (const token of [attacker, defender]) if (token.actor) await addPenalty(token.actor);
}

export async function endGrapple(
  token: TokenDocument,
  partner: TokenDocument | null,
): Promise<void> {
  for (const entry of [token, partner]) {
    if (!entry) continue;
    await entry.unsetFlag(MODULE_ID, FLAG);
    if (entry.actor) await removePenalty(entry.actor);
  }
}

export async function setStatus(actor: Actor, status: StatusId): Promise<string[]> {
  if (actor.statuses?.has(status)) return [];
  await actor.toggleStatusEffect(status, { active: true });
  return [status];
}

export async function clearStatuses(actor: Actor, statuses: readonly string[]): Promise<void> {
  for (const status of statuses) {
    if (!actor.statuses?.has(status)) continue;
    if (!CONFIG.statusEffects.some((effect) => effect.id === status)) continue;
    await actor.toggleStatusEffect(status, { active: false });
  }
}
