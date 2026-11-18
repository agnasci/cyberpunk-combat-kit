import { circleArea } from "../domain/area";
import { SUPPRESSION_RANGE, suppressionFails } from "../domain/modes";
import { resolutionAudience } from "../domain/routing";
import { combatantSnapshot } from "../integrations/cpr/weapon-adapter";
import { removeArea, showArea, tokensInArea } from "../integrations/foundry/area-placement";
import { restingCenter } from "../integrations/foundry/tokens";
import { newState, postResolutionCard, type TargetResult } from "../ui/resolution-card";
import { nativeAttack } from "./attack-steps";
import { speakerFor, targetEntry, warn, type AttackContext } from "./combat-common";
import { requestDefense } from "./defense";

export async function suppressiveFire(context: AttackContext): Promise<void> {
  if (!context.weapon.equipped) return warn("CCK.Attack.not-equipped");
  const origin = restingCenter(context.token);
  const area = circleArea(origin, SUPPRESSION_RANGE);
  const tokens = tokensInArea(area, { exclude: context.token, sightFrom: origin });
  if (tokens.length === 0) return warn("CCK.Area.empty");
  const template = await showArea(area);
  try {
    await suppress(context, tokens);
  } finally {
    removeArea(template);
  }
}

async function suppress(context: AttackContext, tokens: Token[]): Promise<void> {
  const attackRoll = await nativeAttack(context);
  if (!attackRoll) return;

  const targets = await Promise.all(
    tokens.map(async (token): Promise<TargetResult> => {
      const actor = token.actor as Actor;
      const snapshot = combatantSnapshot(actor);
      const entry = targetEntry(snapshot.uuid, snapshot.name);
      const answer = await requestDefense(actor, {
        purpose: "suppression",
        skill: "concentration",
        optional: false,
        attackerName: context.attacker.name,
        defenderUuid: snapshot.uuid,
        defenderTokenId: token.id,
        weaponName: context.weapon.name,
        dv: attackRoll.total,
      });
      if (answer.choice !== "rolled") return { ...entry, outcome: "no-answer" };
      return {
        ...entry,
        defense: { kind: "resist", total: answer.total },
        outcome: suppressionFails(attackRoll.total, answer.total) ? "seek-cover" : "resisted",
      };
    }),
  );

  const allNpc = tokens.every((token) => !token.actor?.hasPlayerOwner);
  await postResolutionCard(
    newState({
      attackerUuid: context.attacker.uuid,
      attackerName: context.attacker.name,
      weaponName: context.weapon.name,
      mode: "suppressive",
      distance: null,
      attackTotal: attackRoll.total,
      dv: null,
      damageTotal: null,
      multiplier: null,
      critical: false,
      notes: ["CCK.Suppression.Note"],
      targets,
    }),
    speakerFor(context),
    resolutionAudience(context.attacker.isNpc, allNpc),
  );
}
