import { attackBlocker, type AttackBlocker } from "./attack-rules";
import { CHOKE_ROUNDS_TO_KNOCKOUT, type GrappleRole } from "./grapple";
import {
  areaFor,
  attackProfile,
  modeBlocker,
  SUPPRESSION_RANGE,
  withinRange,
  type AimLocation,
  type AttackMode,
  type ModeBlocker,
  type ModeWeapon,
} from "./modes";
import {
  breachBlocker,
  breachDv,
  jackInBlocker,
  netActions,
  quickhackBlocker,
  type NetIntrusion,
} from "./quickhack";
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
  | { kind: "net"; action: MenuNetAction; quickhackId?: string; runnerUuid?: string }
  | { kind: "reload"; weaponId: string }
  | { kind: "target" };

export type MenuNetAction = "jackIn" | "breach" | "quickhack" | "jackOut" | "forceOut";

export interface MenuQuickhack {
  id: string;
  name: string;
  tier: number;
  dv: number;
  requiresUnaware: boolean;
}

export interface MenuIntruder {
  runnerUuid: string;
  name: string;
}

export interface MenuNet {
  rank: number;
  hasNeuroport: boolean;
  inRange: boolean;
  visible: boolean;
  locked: boolean;
  intrusion: NetIntrusion | null;
  passwalls: number;
  turn: string | null;
  quickhacks: readonly MenuQuickhack[];
  intruders: readonly MenuIntruder[];
  targetUuid: string;
}

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
  magazineMax?: number | null;
}

export function canReload(weapon: MenuWeapon): boolean {
  return (
    weapon.magazine !== null &&
    typeof weapon.magazineMax === "number" &&
    weapon.magazine < weapon.magazineMax
  );
}

function reloadEntry(weapon: MenuWeapon, label: MenuText): MenuEntry {
  return entry(`${weapon.id}:reload`, label, {
    hint: { key: "CCK.Menu.Ammo", data: { ammo: `${weapon.magazine}/${weapon.magazineMax}` } },
    action: { kind: "reload", weaponId: weapon.id },
  });
}

export type DvValue = number | null | "no-table";

export interface MenuGrapple {
  role: GrappleRole;
  partnerIsTarget: boolean;
  chokeStreak?: number;
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
  net?: MenuNet | null;
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
  if (mode === "suppressive") {
    return { inRange: withinRange(input.distance, SUPPRESSION_RANGE), noTable: false, hint: null };
  }
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
      children: [
        ...menuModes(weapon).map((mode) => modeEntry(input, weapon, mode)),
        ...(canReload(weapon) ? [reloadEntry(weapon, { key: "CCK.Menu.Reload" })] : []),
      ],
    },
  );
}

function grappleEntries(input: MenuInput): MenuEntry[] {
  const own = input.grapple;
  const pick = (
    action: MenuGrappleAction,
    disabled: MenuText | null = null,
    hint: MenuText | null = null,
  ) =>
    entry(
      `grapple:${action}`,
      { key: `CCK.Menu.Grapple-${action}` },
      {
        disabled,
        hint,
        action: disabled ? null : { kind: "grapple", action },
      },
    );
  if (own && (input.self || own.partnerIsTarget)) {
    const streak = own.chokeStreak ?? 0;
    const choking =
      streak > 0
        ? {
            key: "CCK.Menu.ChokeRounds",
            data: { rounds: String(streak), limit: String(CHOKE_ROUNDS_TO_KNOCKOUT) },
          }
        : null;
    if (own.role === "attacker") {
      return [pick("choke", null, choking), pick("throw"), pick("release")];
    }
    return [pick("escape", null, choking)];
  }
  if (input.self || own || input.targetGrappled) return [];
  const reach = meleeInReach(input.distance, input.squareSize);
  return [pick("grab", reach ? null : { key: "CCK.Menu.Why-out-of-range" })];
}

function why(blocker: string | null): MenuText | null {
  return blocker ? { key: `CCK.Menu.Why-${blocker}` } : null;
}

function netPick(
  id: string,
  label: MenuText,
  action: MenuAction & { kind: "net" },
  disabled: MenuText | null = null,
  hint: MenuText | null = null,
): MenuEntry {
  return entry(id, label, { disabled, hint, action: disabled ? null : action });
}

function forceOutEntries(net: MenuNet, self: boolean): MenuEntry[] {
  const intruders = self
    ? net.intruders
    : net.intruders.filter((intruder) => intruder.runnerUuid === net.targetUuid);
  return intruders.map((intruder) =>
    netPick(
      `net:forceOut:${intruder.runnerUuid}`,
      self
        ? { key: "CCK.Menu.Net-forceOutFrom", data: { name: intruder.name } }
        : { key: "CCK.Menu.Net-forceOut" },
      { kind: "net", action: "forceOut", runnerUuid: intruder.runnerUuid },
    ),
  );
}

function quickhackEntries(net: MenuNet): MenuEntry[] {
  if (net.quickhacks.length === 0) {
    const none = { key: "CCK.Menu.Why-no-quickhacks" };
    return [entry("net:none", none, { disabled: none })];
  }
  return [...net.quickhacks]
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
    .map((hack) =>
      netPick(
        `net:hack:${hack.id}`,
        { key: "CCK.Menu.Net-quickhack", data: { name: hack.name } },
        { kind: "net", action: "quickhack", quickhackId: hack.id },
        why(
          quickhackBlocker({
            rank: net.rank,
            tier: hack.tier,
            intrusion: net.intrusion,
            passwalls: net.passwalls,
            inRange: net.inRange,
            turn: net.turn,
            requiresUnaware: hack.requiresUnaware,
          }),
        ),
        { key: "CCK.Menu.Dv", data: { dv: String(hack.dv) } },
      ),
    );
}

function runnerEntries(net: MenuNet): MenuEntry[] {
  if (net.rank <= 0) return [];
  if (!net.intrusion) {
    const blocker = jackInBlocker({ ...net, linked: false });
    return [
      netPick(
        "net:jackIn",
        { key: "CCK.Menu.Net-jackIn" },
        { kind: "net", action: "jackIn" },
        why(blocker),
      ),
    ];
  }
  const entries: MenuEntry[] = [];
  const dv = breachDv(net.passwalls);
  if (dv !== null && net.intrusion.breached < net.passwalls) {
    entries.push(
      netPick(
        "net:breach",
        {
          key: "CCK.Menu.Net-breach",
          data: { left: String(net.passwalls - net.intrusion.breached) },
        },
        { kind: "net", action: "breach" },
        why(breachBlocker(net.intrusion, net.passwalls, net.inRange)),
        { key: "CCK.Menu.Dv", data: { dv: String(dv) } },
      ),
    );
  }
  entries.push(
    entry(
      "net:quickhacks",
      { key: "CCK.Menu.Net-quickhacks" },
      { children: quickhackEntries(net) },
    ),
    netPick("net:jackOut", { key: "CCK.Menu.Net-jackOut" }, { kind: "net", action: "jackOut" }),
  );
  return entries;
}

function netEntries(input: MenuInput): MenuEntry[] {
  const net = input.net;
  if (!net) return [];
  const children = [...forceOutEntries(net, input.self), ...(input.self ? [] : runnerEntries(net))];
  if (children.length === 0) return [];
  const hint =
    net.rank > 0
      ? { key: "CCK.Menu.NetActions", data: { count: String(netActions(net.rank)) } }
      : null;
  const status = net.intrusion
    ? { key: net.intrusion.aware ? "CCK.Menu.Net-aware" : "CCK.Menu.Net-unaware" }
    : null;
  return [entry("net", { key: "CCK.Menu.Net" }, { hint: status ?? hint, children })];
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
    const reloads = input.self
      ? input.weapons.filter((weapon) => weapon.equipped && canReload(weapon))
      : [];
    if (reloads.length > 0) {
      entries.push(
        entry(
          "reload",
          { key: "CCK.Menu.Reload" },
          {
            children: reloads.map((weapon) =>
              reloadEntry(weapon, { key: "CCK.Menu.Weapon", data: { name: weapon.name } }),
            ),
          },
        ),
      );
    }
    const grapple = grappleEntries(input);
    if (grapple.length > 0) {
      entries.push(entry("grapple", { key: "CCK.Menu.Grapple" }, { children: grapple }));
    }
    entries.push(...netEntries(input));
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

export function targetToggles(input: {
  button: number;
  enabled: boolean;
  modifier: boolean;
}): boolean {
  return input.button === 0 && input.enabled && input.modifier;
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

export interface DrawerItem {
  id: string;
  label: MenuText[];
  hint: MenuText | null;
  disabled: MenuText | null;
  action: MenuAction | null;
}

export interface DrawerSection {
  id: string;
  title: MenuText | null;
  items: DrawerItem[];
}

function drawerItems(entry: MenuEntry, prefix: MenuText[]): DrawerItem[] {
  const label = [...prefix, entry.label];
  if (entry.children.length === 0 || entry.disabled) {
    return [
      { id: entry.id, label, hint: entry.hint, disabled: entry.disabled, action: entry.action },
    ];
  }
  return entry.children.flatMap((child) => drawerItems(child, label));
}

export function drawerSections(entries: readonly MenuEntry[]): DrawerSection[] {
  const sections: DrawerSection[] = [];
  const loose: DrawerItem[] = [];
  for (const entry of entries) {
    if (entry.children.length === 0) {
      loose.push(...drawerItems(entry, []));
      continue;
    }
    sections.push({
      id: entry.id,
      title: entry.label,
      items: entry.children.flatMap((child) => drawerItems(child, [])),
    });
  }
  if (loose.length > 0) sections.push({ id: "other", title: null, items: loose });
  return sections;
}
