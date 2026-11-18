import type { DamageApplication } from "../../domain/attack-rules";
import type { DamageResult } from "../../domain/gm-request";
import { armorAblation, hitPoints } from "./weapon-adapter";

interface DamageableActor {
  _applyDamage(
    damage: number,
    bonusDamage: number,
    location: string,
    ablation: number,
    ammoVariety: string,
    ignoreArmorPercent: number,
    ignoreBelowSP: number,
    damageLethal: boolean,
    formData: Record<string, boolean>,
  ): Promise<void>;
  _reverseDamage(
    hpReduction: number,
    location: string,
    ablation: number,
    shieldAblation: number,
  ): Promise<void>;
}

const NATIVE_REDUCTION_DEFAULTS = {
  damageReductionRole: true,
  damageReductionAE: true,
  useShield: true,
  brainDamageReduction: true,
};

function damageable(actor: Actor): Actor & DamageableActor {
  return actor as Actor & DamageableActor;
}

export async function applyNativeDamage(
  actor: Actor,
  damage: DamageApplication,
): Promise<DamageResult> {
  const hpBefore = hitPoints(actor);
  const ablationBefore = armorAblation(actor, damage.location);
  await damageable(actor)._applyDamage(
    damage.damage,
    damage.bonusDamage,
    damage.location,
    damage.ablation,
    damage.ammoVariety,
    damage.ignoreArmorPercent,
    damage.ignoreBelowSP,
    damage.lethal,
    { ...NATIVE_REDUCTION_DEFAULTS },
  );
  const hpAfter = hitPoints(actor);
  return {
    hpBefore,
    hpAfter,
    hpReduction: Math.max(hpBefore - hpAfter, 0),
    ablation: Math.max(armorAblation(actor, damage.location) - ablationBefore, 0),
    location: damage.location,
  };
}

export async function setHitPointsDirect(actor: Actor, hpAfter: number): Promise<DamageResult> {
  const hpBefore = hitPoints(actor);
  await actor.update({ "system.derivedStats.hp.value": hpAfter });
  return {
    hpBefore,
    hpAfter,
    hpReduction: Math.max(hpBefore - hpAfter, 0),
    ablation: 0,
    location: "body",
  };
}

export async function reverseNativeDamage(
  actor: Actor,
  hpReduction: number,
  location: "body" | "head",
  ablation: number,
): Promise<DamageResult> {
  const hpBefore = hitPoints(actor);
  await damageable(actor)._reverseDamage(hpReduction, location, ablation, 0);
  const hpAfter = hitPoints(actor);
  return { hpBefore, hpAfter, hpReduction, ablation, location };
}
