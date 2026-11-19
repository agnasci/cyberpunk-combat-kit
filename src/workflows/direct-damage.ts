import { DIRECT_MODE, parseDamageInput } from "../domain/api-input";
import { mortallyWounded } from "../domain/cues";
import type { DamageResult } from "../domain/gm-request";
import { resolutionAudience } from "../domain/routing";
import { emitCue } from "../effects/engine";
import { attackerToken, chosenTarget, ownedToken } from "../integrations/foundry/tokens";
import { executorId } from "../integrations/foundry/users";
import { newState } from "../ui/resolution-card";
import { postResolution } from "./announce";
import { applyTo, targetEntry, warn, type TokenRef } from "./combat-common";

export interface DamageOptions {
  attacker?: TokenRef;
  target?: TokenRef;
  damage: number;
  location?: "body" | "head";
  ablation?: number;
  bonusDamage?: number;
  ignoreArmor?: boolean;
  lethal?: boolean;
  label?: string;
  card?: boolean;
}

export type DamageOutcome =
  { ok: true; result: DamageResult | null } | { ok: false; error: string };

function refused(error: string, key: string): DamageOutcome {
  warn(key);
  return { ok: false, error };
}

function cueDamage(source: Token, target: Token, applied: DamageResult): void {
  if (applied.hpReduction <= 0) return;
  const base = { source: source.id, targets: [target.id], qualifiers: [DIRECT_MODE] };
  emitCue({ ...base, name: "damage.applied" });
  if (mortallyWounded(applied.hpBefore, applied.hpAfter)) {
    emitCue({ ...base, name: "actor.mortallyWounded" });
  }
}

export async function applyDamage(options: DamageOptions): Promise<DamageOutcome> {
  const input = parseDamageInput(options);
  if (!input.ok) {
    console.warn(`cyberpunk-combat-kit | applyDamage: ${input.error}`);
    return refused(input.error, "CCK.Api.BadDamage");
  }
  const source = options.attacker === undefined ? attackerToken() : ownedToken(options.attacker);
  if (typeof source === "string") return refused(source, `CCK.Attack.${source}`);
  const target = chosenTarget(options.target);
  if (typeof target === "string") return refused(target, `CCK.Attack.${target}`);
  const sourceActor = source.actor;
  const targetActor = target.actor;
  if (!sourceActor || !targetActor) return refused("no-target", "CCK.Attack.no-target");
  if (!executorId()) return refused("no-gm", "CCK.Gm.no-gm");

  const entry = await applyTo(
    source.document.uuid,
    { ...targetEntry(target.document.uuid, targetActor.name), outcome: "applied" },
    input.damage,
    "direct",
  );
  if (entry.error) return { ok: false, error: entry.error };
  if (entry.applied) cueDamage(source, target, entry.applied);
  if (input.card) {
    await postResolution(
      newState({
        attackerUuid: source.document.uuid,
        attackerName: sourceActor.name,
        weaponName: input.label ?? game.i18n.localize("CCK.Api.DirectDamage"),
        mode: DIRECT_MODE,
        distance: null,
        attackTotal: null,
        dv: null,
        damageTotal: input.damage.damage,
        multiplier: null,
        critical: false,
        targets: [entry],
      }),
      ChatMessage.getSpeaker({ actor: sourceActor, token: source.document }),
      resolutionAudience(!sourceActor.hasPlayerOwner, !targetActor.hasPlayerOwner),
    );
  }
  return { ok: true, result: entry.applied };
}
