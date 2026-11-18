export type AttackKind = "ranged" | "melee";

export const RANGED_DODGE_MIN_REF = 8;
export const CRITICAL_SIXES = 2;

export type Defense =
  | { kind: "dv"; value: number }
  | { kind: "evasion"; total: number }
  | { kind: "dodge"; total: number }
  | { kind: "resist"; total: number }
  | { kind: "contest"; total: number };

export interface AttackOutcome {
  hit: boolean;
  attackTotal: number;
  defenseValue: number;
}

export function canDodge(kind: AttackKind, defenderRef: number): boolean {
  return kind === "melee" || defenderRef >= RANGED_DODGE_MIN_REF;
}

export function defenseValue(defense: Defense): number {
  return defense.kind === "dv" ? defense.value : defense.total;
}

export function resolveAttack(attackTotal: number, defense: Defense): AttackOutcome {
  const value = defenseValue(defense);
  return { hit: attackTotal > value, attackTotal, defenseValue: value };
}

export function isCriticalInjury(damageFaces: readonly number[]): boolean {
  return damageFaces.filter((face) => face === 6).length >= CRITICAL_SIXES;
}

export function remainingArmorAfterIgnore(sp: number, ignorePercent: number): number {
  if (ignorePercent <= 0) return sp;
  return Math.round(sp - sp * (ignorePercent / 100));
}

export type AttackBlocker = "no-weapon" | "not-equipped" | "no-ammo" | "out-of-range";

export interface AttackCheckInput {
  hasWeapon: boolean;
  equipped: boolean;
  kind: AttackKind;
  magazine: number | null;
  inRange: boolean;
}

export function attackBlocker(input: AttackCheckInput): AttackBlocker | null {
  if (!input.hasWeapon) return "no-weapon";
  if (!input.equipped) return "not-equipped";
  if (input.kind === "ranged" && input.magazine !== null && input.magazine < 1) return "no-ammo";
  if (!input.inRange) return "out-of-range";
  return null;
}

export interface NativeDamageRoll {
  total: number;
  bonusDamage: number;
  critical: boolean;
  aimed: boolean;
  location: string;
  ammoType: string | null;
  ammoVariety: string | null;
  ablation: number;
  ignoreArmorPercent: number;
  ignoreBelowSP: number;
}

export interface DamageApplication {
  damage: number;
  bonusDamage: number;
  location: "body" | "head";
  ablation: number;
  ammoVariety: string;
  ignoreArmorPercent: number;
  ignoreBelowSP: number;
  lethal: boolean;
}

export function damageApplicationFrom(roll: NativeDamageRoll): DamageApplication {
  return {
    damage: roll.total,
    bonusDamage: roll.critical ? roll.bonusDamage : 0,
    location: roll.aimed && roll.location === "head" ? "head" : "body",
    ablation: roll.ablation,
    ammoVariety: roll.ammoVariety ?? "",
    ignoreArmorPercent: roll.ignoreArmorPercent,
    ignoreBelowSP: roll.ignoreBelowSP,
    lethal: roll.ammoType !== "rubber",
  };
}
