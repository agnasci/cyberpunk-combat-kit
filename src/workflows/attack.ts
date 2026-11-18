import {
  attackBlocker,
  canDodge,
  damageApplicationFrom,
  resolveAttack,
  type Defense,
} from "../domain/attack-rules";
import { isUndoable } from "../domain/gm-request";
import { dvForDistance, meleeInReach } from "../domain/range";
import { resolutionAudience } from "../domain/routing";
import { rollAttack, rollDamage, type NativeRollOptions } from "../integrations/cpr/attack-adapter";
import {
  combatantSnapshot,
  findItem,
  loadDvBands,
  pickWeapon,
  type WeaponSnapshot,
} from "../integrations/cpr/weapon-adapter";
import { requestGm } from "../integrations/foundry/gm-executor";
import { attackTokens, distanceBetween, squareSize } from "../integrations/foundry/tokens";
import { executorId, responderId } from "../integrations/foundry/users";
import {
  markUndone,
  postResolutionCard,
  type ResolutionDamage,
  type ResolutionState,
} from "../ui/resolution-card";
import { requestDefense } from "./defense";

export interface AttackOptions {
  weaponId?: string;
  skipDialog?: boolean;
}

function warn(key: string, data?: Record<string, string>): void {
  ui.notifications.warn(data ? game.i18n.format(key, data) : game.i18n.localize(key));
}

async function rangeCheck(
  weapon: WeaponSnapshot,
  distance: number,
): Promise<{ dv: number | null; inRange: boolean } | "no-table"> {
  if (weapon.kind === "melee") return { dv: null, inRange: meleeInReach(distance, squareSize()) };
  const bands = await loadDvBands(weapon.dvTable);
  if (!bands) return "no-table";
  const dv = dvForDistance(bands, distance);
  return { dv, inRange: dv !== null };
}

async function damageStep(
  weaponItem: Item,
  roll: NativeRollOptions,
  attackerUuid: string,
  targetUuid: string,
): Promise<ResolutionDamage | null> {
  const damage = await rollDamage(weaponItem, roll);
  if (!damage) return null;
  const result = await requestGm({
    op: "applyDamage",
    attackerUuid,
    targetUuid,
    damage: damageApplicationFrom(damage),
  });
  if (!result.ok) warn(`CCK.Gm.${result.error}`);
  return {
    total: damage.total,
    critical: damage.critical,
    applied: result.ok ? result.result : null,
    error: result.ok ? null : `CCK.Gm.${result.error}`,
  };
}

export async function attack(options: AttackOptions = {}): Promise<void> {
  const tokens = attackTokens();
  if (typeof tokens === "string") return warn(`CCK.Attack.${tokens}`);
  const attackerActor = tokens.attacker.actor;
  const targetActor = tokens.target.actor;
  if (!attackerActor || !targetActor) return warn("CCK.Attack.no-target");
  if (!executorId()) return warn("CCK.Gm.no-gm");

  const weapon = pickWeapon(attackerActor, options.weaponId);
  const weaponItem = weapon ? findItem(attackerActor, weapon.id) : undefined;
  const distance = distanceBetween(tokens.attacker, tokens.target);
  const range = weapon ? await rangeCheck(weapon, distance) : { dv: null, inRange: false };
  if (range === "no-table") return warn("CCK.Attack.no-table");
  const blocker = attackBlocker({
    hasWeapon: !!weapon && !!weaponItem,
    equipped: weapon?.equipped ?? false,
    kind: weapon?.kind ?? "melee",
    magazine: weapon?.magazine ?? null,
    inRange: range.inRange,
  });
  if (blocker || !weapon || !weaponItem) return warn(`CCK.Attack.${blocker ?? "no-weapon"}`);

  const rollOptions: NativeRollOptions = {
    actor: attackerActor,
    tokenId: tokens.attacker.id,
    skipDialog: options.skipDialog ?? false,
  };
  const attackRoll = await rollAttack(weaponItem, rollOptions);
  if (!attackRoll) return;

  const attacker = combatantSnapshot(attackerActor);
  const defender = combatantSnapshot(targetActor);
  let defense: Defense | null = range.dv === null ? null : { kind: "dv", value: range.dv };
  if (canDodge(weapon.kind, defender.ref)) {
    const responder = responderId(targetActor);
    const answer = responder
      ? await requestDefense(responder, {
          attackerName: attacker.name,
          defenderUuid: defender.uuid,
          defenderTokenId: tokens.target.id,
          weaponName: weapon.name,
          kind: weapon.kind,
          dv: range.dv,
        })
      : ({ choice: "no-answer" } as const);
    if (answer.choice === "dodge") {
      defense = { kind: weapon.kind === "melee" ? "evasion" : "dodge", total: answer.total };
    }
  }
  if (!defense) return warn("CCK.Attack.no-defense", { defender: defender.name });

  const outcome = resolveAttack(attackRoll.total, defense);
  const damage = outcome.hit
    ? await damageStep(weaponItem, rollOptions, attacker.uuid, defender.uuid)
    : null;

  const state: ResolutionState = {
    attackerUuid: attacker.uuid,
    attackerName: attacker.name,
    targetUuid: defender.uuid,
    targetName: defender.name,
    weaponName: weapon.name,
    kind: weapon.kind,
    distance: Number.isFinite(distance) ? distance : null,
    attackTotal: attackRoll.total,
    defense,
    hit: outcome.hit,
    damage,
    undone: false,
  };
  await postResolutionCard(
    state,
    ChatMessage.getSpeaker({ actor: attackerActor, token: tokens.attacker.document }),
    resolutionAudience(attacker.isNpc, defender.isNpc),
  );
}

export async function undoDamage(message: ChatMessage, state: ResolutionState): Promise<void> {
  const applied = state.damage?.applied ?? null;
  if (!applied || state.undone || !isUndoable(applied)) return;
  const result = await requestGm({
    op: "reverseDamage",
    attackerUuid: state.attackerUuid,
    targetUuid: state.targetUuid,
    hpReduction: applied.hpReduction,
    location: applied.location,
    ablation: applied.ablation,
  });
  if (!result.ok) return warn(`CCK.Gm.${result.error}`);
  await markUndone(message, state);
}
