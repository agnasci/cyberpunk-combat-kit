import { contestWon } from "../domain/grapple";
import { meleeInReach } from "../domain/range";
import { resolutionAudience } from "../domain/routing";
import { rollSkill } from "../integrations/cpr/attack-adapter";
import { combatantSnapshot, findSkill, SKILLS } from "../integrations/cpr/weapon-adapter";
import { requestGm } from "../integrations/foundry/gm-executor";
import { grappleLink } from "../integrations/foundry/grapple-store";
import { postResolution } from "./announce";
import {
  attackerToken,
  distanceBetween,
  singleTarget,
  squareSize,
} from "../integrations/foundry/tokens";
import { executorId } from "../integrations/foundry/users";
import { newState, type Outcome, type TargetResult } from "../ui/resolution-card";
import { speakerFor, targetEntry, warn } from "./combat-common";
import { cueGrapple, cueOutcomes } from "./combat-cues";
import { requestDefense } from "./defense";

export type GrappleAction = "grab" | "choke" | "throw" | "release" | "escape";

export interface GrappleOptions {
  action: GrappleAction;
  skipDialog?: boolean;
}

interface Actorish {
  token: Token;
  actor: Actor;
}

function acting(): Actorish | null {
  const token = attackerToken();
  if (typeof token === "string") {
    warn(`CCK.Attack.${token}`);
    return null;
  }
  if (!token.actor) return null;
  if (!executorId()) {
    warn("CCK.Gm.no-gm");
    return null;
  }
  return { token, actor: token.actor };
}

async function contest(
  self: Actorish,
  opponent: Actorish,
  skipDialog: boolean,
): Promise<{ mine: number; theirs: number } | null> {
  const skill = findSkill(self.actor, "brawling");
  if (!skill) {
    warn("CCK.Attack.no-skill", { skill: SKILLS.brawling });
    return null;
  }
  const mine = await rollSkill(skill, { actor: self.actor, tokenId: self.token.id, skipDialog });
  if (!mine) return null;
  const answer = await requestDefense(opponent.actor, {
    purpose: "grapple",
    skill: "brawling",
    optional: false,
    attackerName: self.actor.name,
    defenderUuid: opponent.actor.uuid,
    defenderTokenId: opponent.token.id,
    weaponName: game.i18n.localize("CCK.Mode.grapple"),
    dv: null,
  });
  if (answer.choice !== "rolled") {
    warn("CCK.Attack.no-defense", { defender: opponent.actor.name });
    return null;
  }
  return { mine: mine.total, theirs: answer.total };
}

async function postGrappleCard(
  self: Actorish,
  mode: string,
  target: TargetResult,
  attackTotal: number | null,
  partnerIsNpc: boolean,
): Promise<void> {
  const attacker = combatantSnapshot(self.actor);
  await postResolution(
    newState({
      attackerUuid: self.token.document.uuid,
      attackerName: attacker.name,
      weaponName: game.i18n.localize("CCK.Mode.grapple"),
      mode,
      distance: null,
      attackTotal,
      dv: null,
      damageTotal: null,
      multiplier: null,
      critical: false,
      targets: [target],
    }),
    speakerFor(self),
    resolutionAudience(attacker.isNpc, partnerIsNpc),
  );
}

function tokenObject(uuid: string): Token | null {
  const placeables = canvas?.tokens?.placeables ?? [];
  return placeables.find((token) => token.document.uuid === uuid) ?? null;
}

async function grab(self: Actorish, skipDialog: boolean): Promise<void> {
  const targetToken = singleTarget();
  if (typeof targetToken === "string") return warn(`CCK.Attack.${targetToken}`);
  if (!targetToken.actor) return warn("CCK.Attack.no-target");
  if (!meleeInReach(distanceBetween(self.token, targetToken), squareSize())) {
    return warn("CCK.Attack.out-of-range");
  }
  if (grappleLink(self.token.document) || grappleLink(targetToken.document)) {
    return warn("CCK.Grapple.already");
  }
  const opponent = { token: targetToken, actor: targetToken.actor };
  const result = await contest(self, opponent, skipDialog);
  if (!result) return;
  const won = contestWon(result.mine, result.theirs);
  let target: TargetResult = {
    ...targetEntry(targetToken.document.uuid, targetToken.actor.name),
    defense: { kind: "contest", total: result.theirs },
    outcome: won ? "won" : "lost",
  };
  if (won) {
    const started = await requestGm({
      op: "grappleStart",
      attackerUuid: self.token.document.uuid,
      targetUuid: targetToken.document.uuid,
    });
    if (!started.ok) target = { ...target, error: `CCK.Gm.${started.error}` };
    else cueGrapple("grapple.start", self.token, targetToken);
  }
  await postGrappleCard(self, "grab", target, result.mine, !targetToken.actor.hasPlayerOwner);
}

async function partnerAction(self: Actorish, action: "choke" | "throw"): Promise<void> {
  const link = grappleLink(self.token.document);
  if (link?.role !== "attacker") return warn("CCK.Grapple.not-attacker");
  const partner = tokenObject(link.partnerUuid);
  if (!partner?.actor) return warn("CCK.Gm.not-found");
  const body = combatantSnapshot(self.actor).body;
  const round = game.combat?.started ? game.combat.round : null;
  const result = await requestGm(
    action === "choke"
      ? {
          op: "choke",
          attackerUuid: self.token.document.uuid,
          targetUuid: link.partnerUuid,
          body,
          round,
        }
      : {
          op: "throwDown",
          attackerUuid: self.token.document.uuid,
          targetUuid: link.partnerUuid,
          body,
        },
  );
  const outcome: Outcome = "applied";
  const applied = result.ok ? result.result : null;
  const entry = {
    ...targetEntry(link.partnerUuid, partner.actor.name),
    outcome,
    applied,
    error: result.ok ? null : `CCK.Gm.${result.error}`,
  };
  if (result.ok) cueOutcomes(self.token, ["grapple", "melee"], [entry], false);
  if (result.ok && action === "throw") cueGrapple("grapple.end", self.token, partner);
  const effect =
    action === "throw"
      ? "CCK.Grapple.Prone"
      : applied?.knockedOut
        ? "CCK.Grapple.KnockedOut"
        : null;
  await postGrappleCard(self, action, { ...entry, effect }, null, !partner.actor.hasPlayerOwner);
}

async function release(self: Actorish): Promise<void> {
  const link = grappleLink(self.token.document);
  if (link?.role !== "attacker") return warn("CCK.Grapple.not-attacker");
  const result = await requestGm({
    op: "grappleEnd",
    attackerUuid: self.token.document.uuid,
    targetUuid: link.partnerUuid,
  });
  if (!result.ok) return warn(`CCK.Gm.${result.error}`);
  const partner = tokenObject(link.partnerUuid);
  cueGrapple("grapple.end", self.token, partner ?? undefined);
  ui.notifications.info(game.i18n.localize("CCK.Grapple.Released"));
}

async function escape(self: Actorish, skipDialog: boolean): Promise<void> {
  const link = grappleLink(self.token.document);
  if (link?.role !== "defender") return warn("CCK.Grapple.not-defender");
  const partner = tokenObject(link.partnerUuid);
  if (!partner?.actor) return warn("CCK.Gm.not-found");
  const result = await contest(self, { token: partner, actor: partner.actor }, skipDialog);
  if (!result) return;
  const won = contestWon(result.mine, result.theirs);
  let target: TargetResult = {
    ...targetEntry(link.partnerUuid, partner.actor.name),
    defense: { kind: "contest", total: result.theirs },
    outcome: won ? "won" : "lost",
  };
  if (won) {
    const ended = await requestGm({
      op: "grappleEnd",
      attackerUuid: self.token.document.uuid,
      targetUuid: link.partnerUuid,
    });
    if (!ended.ok) target = { ...target, error: `CCK.Gm.${ended.error}` };
    else cueGrapple("grapple.end", self.token, partner);
  }
  await postGrappleCard(self, "escape", target, result.mine, !partner.actor.hasPlayerOwner);
}

export async function grapple(options: GrappleOptions): Promise<void> {
  const self = acting();
  if (!self) return;
  const skipDialog = options.skipDialog ?? false;
  switch (options.action) {
    case "grab":
      return grab(self, skipDialog);
    case "choke":
    case "throw":
      return partnerAction(self, options.action);
    case "release":
      return release(self);
    case "escape":
      return escape(self, skipDialog);
  }
}
