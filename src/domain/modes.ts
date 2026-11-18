import type { AttackKind } from "./attack-rules";

export type AttackMode = "single" | "aimed" | "autofire" | "suppressive" | "thrown";
export type AimLocation = "head" | "heldItem" | "leg";
export type AreaKind = "none" | "shell" | "explosion";
export type NativeAttackType = "attack" | "aimed" | "autofire" | "suppressive" | "athletics";

export const AUTOFIRE_BULLETS = 10;
export const SHELL_DV = 13;
export const SHELL_RANGE = 6;
export const EXPLOSION_SIDE = 10;
export const SUPPRESSION_RANGE = 25;
export const AUTOFIRE_DEFAULTS: Readonly<Record<string, number>> = {
  smg: 3,
  heavySmg: 3,
  assaultRifle: 4,
};
const EXPLOSIVE_AMMO = new Set(["grenade", "rocket"]);
const BODY_WEAPONS = new Set(["unarmed", "martialArts"]);

export interface ModeWeapon {
  kind: AttackKind;
  weaponType: string;
  ammoVariety: string | null;
  autofireMax: number;
  suppressive: boolean;
  magazine: number | null;
}

export interface AttackProfile {
  mode: AttackMode;
  nativeType: NativeAttackType;
  area: AreaKind;
  bullets: number;
  dvSource: "table" | "autofire-table" | "thrown-table" | "fixed" | "none";
  fixedDv: number | null;
  damageType: "attack" | "aimed" | "autofire" | null;
  ignoreArmor: boolean;
}

export type ModeBlocker =
  "mode-autofire" | "mode-suppressive" | "mode-aimed" | "mode-thrown" | "no-ammo-mode";

export function autofireMax(weaponType: string, autoFire: number): number {
  return autoFire > 0 ? autoFire : (AUTOFIRE_DEFAULTS[weaponType] ?? 0);
}

export function areaFor(weapon: ModeWeapon): AreaKind {
  if (weapon.ammoVariety && EXPLOSIVE_AMMO.has(weapon.ammoVariety)) return "explosion";
  if (weapon.weaponType === "shotgun" && weapon.ammoVariety === "shotgunShell") return "shell";
  return "none";
}

export function attackProfile(weapon: ModeWeapon, mode: AttackMode): AttackProfile {
  const area = mode === "single" || mode === "thrown" ? areaFor(weapon) : "none";
  const base: AttackProfile = {
    mode,
    nativeType: "attack",
    area,
    bullets: weapon.kind === "ranged" ? 1 : 0,
    dvSource: weapon.kind === "ranged" ? "table" : "none",
    fixedDv: null,
    damageType: "attack",
    ignoreArmor: true,
  };
  switch (mode) {
    case "aimed":
      return { ...base, nativeType: "aimed", damageType: "aimed" };
    case "autofire":
      return {
        ...base,
        nativeType: "autofire",
        bullets: AUTOFIRE_BULLETS,
        dvSource: "autofire-table",
        damageType: "autofire",
      };
    case "suppressive":
      return {
        ...base,
        nativeType: "suppressive",
        bullets: AUTOFIRE_BULLETS,
        dvSource: "none",
        damageType: null,
      };
    case "thrown":
      return {
        ...base,
        nativeType: "athletics",
        bullets: 0,
        dvSource: "thrown-table",
        ignoreArmor: false,
      };
    default:
      return area === "shell" ? { ...base, dvSource: "fixed", fixedDv: SHELL_DV } : base;
  }
}

export function modeBlocker(weapon: ModeWeapon, profile: AttackProfile): ModeBlocker | null {
  if (profile.mode === "autofire" && (weapon.kind !== "ranged" || weapon.autofireMax < 1)) {
    return "mode-autofire";
  }
  if (profile.mode === "suppressive" && (weapon.kind !== "ranged" || !weapon.suppressive)) {
    return "mode-suppressive";
  }
  if (profile.mode === "aimed" && areaFor(weapon) !== "none") return "mode-aimed";
  if (
    profile.mode === "thrown" &&
    (weapon.kind !== "melee" || BODY_WEAPONS.has(weapon.weaponType))
  ) {
    return "mode-thrown";
  }
  if (profile.bullets > 1 && (weapon.magazine ?? 0) < profile.bullets) return "no-ammo-mode";
  return null;
}

export function autofireTableName(dvTable: string): string {
  return dvTable.endsWith("(Autofire)") ? dvTable : `${dvTable} (Autofire)`;
}

export function autofireMultiplier(attackTotal: number, defenseValue: number, max: number): number {
  return Math.max(1, Math.min(attackTotal - defenseValue, max));
}

export type AimedEffect = "double-head" | "drop-item" | "broken-leg" | null;

export function aimedApplyLocation(location: AimLocation): "head" | "body" {
  return location === "head" ? "head" : "body";
}

export function aimedEffect(location: AimLocation, hpReduction: number): AimedEffect {
  if (hpReduction <= 0) return null;
  if (location === "head") return "double-head";
  return location === "leg" ? "broken-leg" : "drop-item";
}

export function suppressionFails(attackTotal: number, resistTotal: number): boolean {
  return attackTotal > resistTotal;
}

export function withinRange(distance: number, max: number): boolean {
  return Number.isFinite(distance) && distance <= max;
}
