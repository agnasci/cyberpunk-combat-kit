import { attackBlocker, type AttackBlocker } from "./attack-rules";
import type { GrappleRole } from "./grapple";
import {
  areaFor,
  attackProfile,
  modeBlocker,
  type AimLocation,
  type AttackMode,
  type ModeBlocker,
  type ModeWeapon,
} from "./modes";
import { meleeInReach } from "./range";

export const MENU_MODES: readonly AttackMode[] = [
  "single",
  "aimed",
  "autofire",
  "suppressive",
  "thrown",
];
export const AIM_LOCATIONS: readonly AimLocation[] = ["head", "heldItem", "leg"];

export type MenuGrappleAction = "grab" | "choke" | "throw" | "release" | "escape";

export type MenuAction =
  | { kind: "attack"; weaponId: string; mode: AttackMode; location?: AimLocation }
  | { kind: "grapple"; action: MenuGrappleAction }
  | { kind: "target" };

export interface MenuText {
  key: string;
  data?: Record<string, string>;
}

export interface MenuEntry {
  id: string;
  label: MenuText;
  hint: MenuText | null;
  disabled: MenuText | null;
  action: MenuAction | null;
  children: MenuEntry[];
}

export interface MenuWeapon extends ModeWeapon {
  id: string;
  name: string;
  equipped: boolean;
}

export type DvValue = number | null | "no-table";

export interface MenuGrapple {
  role: GrappleRole;
  partnerIsTarget: boolean;
}

export interface MenuInput {
  self: boolean;
  attackerProblem: string | null;
  weapons: readonly MenuWeapon[];
  dvs: Readonly<Record<string, DvValue>>;
  distance: number;
  squareSize: number;
  grapple: MenuGrapple | null;
  targetGrappled: boolean;
  targeted: boolean;
}

export interface MenuModel {
  distance: number | null;
  entries: MenuEntry[];
}

export function dvKey(weaponId: string, mode: AttackMode): string {
  return `${weaponId}:${mode}`;
}

export function menuModes(weapon: ModeWeapon): AttackMode[] {
  return MENU_MODES.filter((mode) => {
    const blocker = modeBlocker(weapon, attackProfile(weapon, mode));
    return blocker === null || blocker === "no-ammo-mode";
  });
}

export function needsDv(weapon: ModeWeapon, mode: AttackMode): boolean {
  const profile = attackProfile(weapon, mode);
  if (profile.mode === "suppressive" || profile.area === "explosion") return false;
  return profile.dvSource !== "none";
}

function entry(id: string, label: MenuText, extra: Partial<MenuEntry> = {}): MenuEntry {
  return { id, label, hint: null, disabled: null, action: null, children: [], ...extra };
}

function modeLabel(weapon: ModeWeapon, mode: AttackMode): MenuText {
  if (mode === "single") {
    const area = areaFor(weapon);
    if (area !== "none") return { key: `CCK.Menu.Mode-${area}` };
    return { key: weapon.kind === "melee" ? "CCK.Menu.Mode-melee" : "CCK.Menu.Mode-single" };
  }
  return { key: `CCK.Menu.Mode-${mode}` };
}

type Blocker = AttackBlocker | ModeBlocker | "no-table";

interface RangeCheck {
  inRange: boolean;
  noTable: boolean;
  hint: MenuText | null;
}

function rangeCheck(input: MenuInput, weapon: MenuWeapon, mode: AttackMode): RangeCheck {
  if (!needsDv(weapon, mode)) {
    if (attackProfile(weapon, mode).dvSource !== "none") {
      return { inRange: true, noTable: false, hint: null };
    }
    return {
      inRange: meleeInReach(input.distance, input.squareSize),
      noTable: false,
      hint: { key: "CCK.Menu.Reach" },
    };
  }
  const dv = input.dvs[dvKey(weapon.id, mode)];
  if (dv === "no-table") return { inRange: false, noTable: true, hint: null };
  if (dv === undefined || dv === null) return { inRange: false, noTable: false, hint: null };
  return { inRange: true, noTable: false, hint: { key: "CCK.Menu.Dv", data: { dv: String(dv) } } };
}

function blockerFor(weapon: MenuWeapon, mode: AttackMode, range: RangeCheck): Blocker | null {
  const profile = attackProfile(weapon, mode);
  const modeProblem = modeBlocker(weapon, profile);
  if (modeProblem) return modeProblem;
  if (range.noTable) return "no-table";
  return attackBlocker({
    hasWeapon: true,
    equipped: weapon.equipped,
    kind: profile.bullets > 0 ? "ranged" : "melee",
    magazine: weapon.magazine,
    inRange: range.inRange,
  });
}

function modeEntry(input: MenuInput, weapon: MenuWeapon, mode: AttackMode): MenuEntry {
  const id = `${weapon.id}:${mode}`;
  const range = rangeCheck(input, weapon, mode);
  const blocker = blockerFor(weapon, mode, range);
  const disabled = blocker ? { key: `CCK.Menu.Why-${blocker}` } : null;
  const label = modeLabel(weapon, mode);
  if (mode !== "aimed") {
    return entry(id, label, {
      hint: range.hint,
      disabled,
      action: disabled ? null : { kind: "attack", weaponId: weapon.id, mode },
    });
  }
  const locations = AIM_LOCATIONS.map((location) =>
    entry(
      `${id}:${location}`,
      { key: `CCK.Menu.Aim-${location}` },
      { action: { kind: "attack", weaponId: weapon.id, mode, location } },
    ),
  );
  return entry(id, label, { hint: range.hint, disabled, children: disabled ? [] : locations });
}

function weaponEntry(input: MenuInput, weapon: MenuWeapon): MenuEntry {
  const ammo =
    weapon.magazine === null
      ? null
      : { key: "CCK.Menu.Ammo", data: { ammo: String(weapon.magazine) } };
  return entry(
    `weapon:${weapon.id}`,
    { key: "CCK.Menu.Weapon", data: { name: weapon.name } },
    {
      hint: ammo,
      children: menuModes(weapon).map((mode) => modeEntry(input, weapon, mode)),
    },
  );
}

function grappleEntries(input: MenuInput): MenuEntry[] {
  const own = input.grapple;
  const pick = (action: MenuGrappleAction, disabled: MenuText | null = null) =>
    entry(
      `grapple:${action}`,
      { key: `CCK.Menu.Grapple-${action}` },
      {
        disabled,
        action: disabled ? null : { kind: "grapple", action },
      },
    );
  if (own && (input.self || own.partnerIsTarget)) {
    if (own.role === "attacker") return [pick("choke"), pick("throw"), pick("release")];
    return [pick("escape")];
  }
  if (input.self || own || input.targetGrappled) return [];
  const reach = meleeInReach(input.distance, input.squareSize);
  return [pick("grab", reach ? null : { key: "CCK.Menu.Why-out-of-range" })];
}

export function buildMenu(input: MenuInput): MenuModel {
  const entries: MenuEntry[] = [];
  if (input.attackerProblem) {
    entries.push(
      entry(
        "problem",
        { key: `CCK.Menu.Why-${input.attackerProblem}` },
        {
          disabled: { key: `CCK.Menu.Why-${input.attackerProblem}` },
        },
      ),
    );
  } else {
    if (!input.self) {
      const equipped = input.weapons.filter((weapon) => weapon.equipped);
      if (equipped.length === 0) {
        entries.push(
          entry(
            "no-weapon",
            { key: "CCK.Menu.Why-no-weapon" },
            {
              disabled: { key: "CCK.Menu.Why-no-weapon" },
            },
          ),
        );
      }
      entries.push(...equipped.map((weapon) => weaponEntry(input, weapon)));
    }
    const grapple = grappleEntries(input);
    if (grapple.length > 0) {
      entries.push(entry("grapple", { key: "CCK.Menu.Grapple" }, { children: grapple }));
    }
  }
  if (!input.self) {
    entries.push(
      entry(
        "target",
        { key: input.targeted ? "CCK.Menu.Untarget" : "CCK.Menu.Target" },
        {
          action: { kind: "target" },
        },
      ),
    );
  }
  if (entries.length === 0) {
    entries.push(
      entry("nothing", { key: "CCK.Menu.Nothing" }, { disabled: { key: "CCK.Menu.Nothing" } }),
    );
  }
  return {
    distance: !input.self && Number.isFinite(input.distance) ? input.distance : null,
    entries,
  };
}

export function menuOpens(input: {
  button: number;
  owner: boolean;
  modifier: boolean;
  always: boolean;
  controlled: boolean;
}): boolean {
  if (input.button !== 2) return false;
  if (input.modifier) return true;
  if (!input.owner) return true;
  return input.always && !input.controlled;
}

export function moveFocus(index: number, enabled: readonly boolean[], step: 1 | -1): number {
  const count = enabled.length;
  if (count === 0) return -1;
  for (let offset = 1; offset <= count; offset += 1) {
    const next = (((index + step * offset) % count) + count) % count;
    if (enabled[next]) return next;
  }
  return index;
}
