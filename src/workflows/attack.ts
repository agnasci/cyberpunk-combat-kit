import {
  attackBlocker,
  canDodge,
  resolveAttack,
  type AttackKind,
  type Defense,
} from "../domain/attack-rules";
import {
  aimedEffect,
  attackProfile,
  autofireMultiplier,
  modeBlocker,
  type AimLocation,
} from "../domain/modes";
import { meleeInReach } from "../domain/range";
import { resolutionAudience } from "../domain/routing";
import { rollDamage } from "../integrations/cpr/attack-adapter";
import { combatantSnapshot, findItem, pickWeapon } from "../integrations/cpr/weapon-adapter";
import {
  attackerToken,
  distanceBetween,
  singleTarget,
  squareSize,
} from "../integrations/foundry/tokens";
import { executorId } from "../integrations/foundry/users";
import { newState, postResolutionCard, type TargetResult } from "../ui/resolution-card";
import { explosiveAttack, shellAttack } from "./area";
import { dvFor, nativeAttack } from "./attack-steps";
import {
  applicationFor,
  applyTo,
  speakerFor,
  targetEntry,
  warn,
  type AttackContext,
  type AttackOptions,
} from "./combat-common";
import { requestDefense } from "./defense";
import { suppressiveFire } from "./suppressive";

function buildContext(options: AttackOptions): AttackContext | null {
  const token = attackerToken();
  if (typeof token === "string") {
    warn(`CCK.Attack.${token}`);
    return null;
  }
  const actor = token.actor;
  if (!actor) return null;
  if (!executorId()) {
    warn("CCK.Gm.no-gm");
    return null;
  }
  const weapon = pickWeapon(actor, options.weaponId);
  const item = weapon ? findItem(actor, weapon.id) : undefined;
  if (!weapon || !item) {
    warn("CCK.Attack.no-weapon");
    return null;
  }
  const profile = attackProfile(weapon, options.mode ?? "single");
  const blocker = modeBlocker(weapon, profile);
  if (blocker) {
    warn(`CCK.Attack.${blocker}`);
    return null;
  }
  return {
    token,
    actor,
    attacker: combatantSnapshot(actor),
    weapon,
    item,
    profile,
    roll: { actor, tokenId: token.id, skipDialog: options.skipDialog ?? false },
  };
}

async function singleAttack(context: AttackContext, options: AttackOptions): Promise<void> {
  const targetToken = singleTarget();
  if (typeof targetToken === "string") return warn(`CCK.Attack.${targetToken}`);
  const targetActor = targetToken.actor;
  if (!targetActor) return warn("CCK.Attack.no-target");
  const { profile, weapon } = context;
  const kind: AttackKind = profile.dvSource === "none" ? "melee" : "ranged";
  const distance = distanceBetween(context.token, targetToken);
  const dv = await dvFor(context, distance);
  if (dv === "no-table") return warn("CCK.Attack.no-table");
  const blocker = attackBlocker({
    hasWeapon: true,
    equipped: weapon.equipped,
    kind: profile.bullets > 0 ? "ranged" : "melee",
    magazine: weapon.magazine,
    inRange: kind === "melee" ? meleeInReach(distance, squareSize()) : dv !== null,
  });
  if (blocker) return warn(`CCK.Attack.${blocker}`);

  const attackRoll = await nativeAttack(context, options.location);
  if (!attackRoll) return;
  const location = (attackRoll.location as AimLocation | undefined) ?? options.location ?? "head";
  const defender = combatantSnapshot(targetActor);
  let defense: Defense | null = dv === null ? null : { kind: "dv", value: dv };
  if (canDodge(kind, defender.ref)) {
    const answer = await requestDefense(targetActor, {
      purpose: kind,
      skill: "evasion",
      optional: kind === "ranged",
      attackerName: context.attacker.name,
      defenderUuid: defender.uuid,
      defenderTokenId: targetToken.id,
      weaponName: weapon.name,
      dv,
    });
    if (answer.choice === "rolled") {
      defense = { kind: kind === "melee" ? "evasion" : "dodge", total: answer.total };
    }
  }
  if (!defense) return warn("CCK.Attack.no-defense", { defender: defender.name });

  const outcome = resolveAttack(attackRoll.total, defense);
  let target: TargetResult = {
    ...targetEntry(defender.uuid, defender.name),
    defense,
    outcome: outcome.hit ? "hit" : "miss",
  };
  let damageTotal: number | null = null;
  let critical = false;
  let multiplier: number | null = null;
  if (outcome.hit && profile.damageType) {
    multiplier =
      profile.mode === "autofire"
        ? autofireMultiplier(outcome.attackTotal, outcome.defenseValue, weapon.autofireMax)
        : null;
    const damage = await rollDamage(context.item, profile.damageType, context.roll, (native) => {
      if (multiplier !== null) native.autofireMultiplier = multiplier;
      if (profile.mode === "aimed") native.location = location;
    });
    if (damage) {
      damageTotal = damage.total;
      critical = damage.critical;
      target = await applyTo(
        context.attacker.uuid,
        target,
        applicationFor(damage, profile.ignoreArmor),
      );
      if (profile.mode === "aimed") {
        const effect = aimedEffect(location, target.applied?.hpReduction ?? 0);
        target = { ...target, effect: effect ? `CCK.Aimed.${effect}` : null };
      }
    }
  }

  await postResolutionCard(
    newState({
      attackerUuid: context.attacker.uuid,
      attackerName: context.attacker.name,
      weaponName: weapon.name,
      mode: profile.mode === "aimed" ? `aimed-${location}` : profile.mode,
      distance: Number.isFinite(distance) ? distance : null,
      attackTotal: attackRoll.total,
      dv: null,
      damageTotal,
      multiplier,
      critical,
      targets: [target],
    }),
    speakerFor(context),
    resolutionAudience(context.attacker.isNpc, defender.isNpc),
  );
}

export async function attack(options: AttackOptions = {}): Promise<void> {
  const context = buildContext(options);
  if (!context) return;
  if (context.profile.mode === "suppressive") return suppressiveFire(context);
  if (context.profile.area === "shell") return shellAttack(context);
  if (context.profile.area === "explosion") return explosiveAttack(context);
  return singleAttack(context, options);
}
