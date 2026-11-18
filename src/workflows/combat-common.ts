import { damageApplicationFrom, type DamageApplication } from "../domain/attack-rules";
import { isUndoable } from "../domain/gm-request";
import type { AimLocation, AttackMode, AttackProfile } from "../domain/modes";
import type { NativeDamage, NativeRollOptions } from "../integrations/cpr/attack-adapter";
import type { CombatantSnapshot, WeaponSnapshot } from "../integrations/cpr/weapon-adapter";

export interface AttackOptions {
  weaponId?: string;
  mode?: AttackMode;
  location?: AimLocation;
  skipDialog?: boolean;
}

export interface AttackContext {
  token: Token;
  actor: Actor;
  attacker: CombatantSnapshot;
  weapon: WeaponSnapshot;
  item: Item;
  profile: AttackProfile;
  roll: NativeRollOptions;
}

export function speakerFor(context: { actor: Actor; token: Token }): unknown {
  return ChatMessage.getSpeaker({ actor: context.actor, token: context.token.document });
}
import { requestGm } from "../integrations/foundry/gm-executor";
import { updateCard, type ResolutionState, type TargetResult } from "../ui/resolution-card";

export function warn(key: string, data?: Record<string, string>): void {
  ui.notifications.warn(data ? game.i18n.format(key, data) : game.i18n.localize(key));
}

export function applicationFor(damage: NativeDamage, ignoreArmor: boolean): DamageApplication {
  const application = damageApplicationFrom(damage);
  return ignoreArmor ? application : { ...application, ignoreArmorPercent: 0 };
}

export async function applyTo(
  attackerUuid: string,
  target: TargetResult,
  application: DamageApplication,
): Promise<TargetResult> {
  const result = await requestGm({
    op: "applyDamage",
    attackerUuid,
    targetUuid: target.uuid,
    damage: application,
  });
  if (!result.ok) warn(`CCK.Gm.${result.error}`);
  return {
    ...target,
    applied: result.ok ? result.result : null,
    error: result.ok ? null : `CCK.Gm.${result.error}`,
  };
}

export async function undoTarget(
  message: ChatMessage,
  state: ResolutionState,
  index: number,
): Promise<void> {
  const target = state.targets[index];
  const applied = target?.applied ?? null;
  if (!target || target.undone || !applied || !isUndoable(applied)) return;
  const result = await requestGm({
    op: "reverseDamage",
    attackerUuid: state.attackerUuid,
    targetUuid: target.uuid,
    hpReduction: applied.hpReduction,
    location: applied.location,
    ablation: applied.ablation,
  });
  if (!result.ok) return warn(`CCK.Gm.${result.error}`);
  const targets = state.targets.map((entry, position) =>
    position === index ? { ...entry, undone: true } : entry,
  );
  await updateCard(message, { ...state, targets });
}

export function targetEntry(uuid: string, name: string): TargetResult {
  return {
    uuid,
    name,
    defense: null,
    outcome: "miss",
    applied: null,
    error: null,
    effect: null,
    undone: false,
  };
}
