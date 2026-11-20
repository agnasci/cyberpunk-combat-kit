import {
  buildMenu,
  dvKey,
  menuModes,
  needsDv,
  type DvValue,
  type MenuAction,
  type MenuGrapple,
  type MenuNet,
} from "../domain/menu";
import { activeChokeStreak, type GrappleLink } from "../domain/grapple";
import { attackProfile } from "../domain/modes";
import { findItem, reloadWeapon, weaponsOf } from "../integrations/cpr/weapon-adapter";
import { grappleLink } from "../integrations/foundry/grapple-store";
import {
  onTokenRightClick,
  onTokenTargetClick,
  sceneUnits,
  targetOnly,
  toggleTarget,
  visibleName,
  type TokenClick,
} from "../integrations/foundry/token-click";
import { attackerToken, distanceBetween, squareSize } from "../integrations/foundry/tokens";
import { openQuickMenu } from "../ui/quick-menu";
import { attack } from "./attack";
import { warn } from "./combat-common";
import { dvLookup } from "./attack-steps";
import { grapple } from "./grapple";
import {
  availableQuickhacks,
  awareIntruders,
  netView,
  quickhack,
  quickhacksEnabled,
} from "./quickhack";

function netInput(acting: Token | null, target: Token): MenuNet | null {
  if (!acting || !quickhacksEnabled()) return null;
  const self = acting === target;
  const view = self ? null : netView(acting, target);
  return {
    rank: view?.rank ?? 0,
    hasNeuroport: view?.hasNeuroport ?? false,
    inRange: view?.inRange ?? false,
    visible: view?.visible ?? false,
    locked: view?.locked ?? false,
    intrusion: view?.intrusion ?? null,
    passwalls: view?.passwalls ?? 0,
    turn: view?.turn ?? null,
    quickhacks: availableQuickhacks(),
    intruders: awareIntruders(acting).map((entry) => ({
      runnerUuid: entry.runnerUuid,
      name: entry.runnerName,
    })),
    targetUuid: target.document.uuid,
  };
}

async function dvTable(
  weapons: ReturnType<typeof weaponsOf>,
  distance: number,
): Promise<Record<string, DvValue>> {
  const dvs: Record<string, DvValue> = {};
  for (const weapon of weapons.filter((entry) => entry.equipped)) {
    for (const mode of menuModes(weapon).filter((entry) => needsDv(weapon, entry))) {
      const lookup = await dvLookup({ profile: attackProfile(weapon, mode), weapon });
      dvs[dvKey(weapon.id, mode)] = lookup === "no-table" ? lookup : lookup(distance);
    }
  }
  return dvs;
}

function formatDistance(distance: number | null): string | null {
  if (distance === null) return null;
  return game.i18n.format("CCK.Menu.Distance", {
    distance: String(Math.round(distance * 10) / 10),
    units: sceneUnits(),
  });
}

function chokeStreakOf(link: GrappleLink, own: TokenDocument | null): number {
  const defender =
    link.role === "defender"
      ? own
      : (canvas?.tokens?.placeables.find((token) => token.document.uuid === link.partnerUuid)
          ?.document ?? null);
  const defenderLink = defender ? grappleLink(defender) : null;
  if (!defenderLink) return 0;
  return activeChokeStreak(defenderLink, game.combat?.started ? game.combat.round : null);
}

export async function menuViewFor(target: Token) {
  const attacker = attackerToken();
  const problem = typeof attacker === "string" ? attacker : null;
  const acting = typeof attacker === "string" ? null : attacker;
  const self = acting === target;
  const weapons = acting?.actor ? weaponsOf(acting.actor) : [];
  const distance = acting && !self ? distanceBetween(acting, target) : Number.NaN;
  const link = acting ? grappleLink(acting.document) : null;
  const grappleState: MenuGrapple | null = link
    ? {
        role: link.role,
        partnerIsTarget: link.partnerUuid === target.document.uuid,
        chokeStreak: chokeStreakOf(link, acting?.document ?? null),
      }
    : null;
  const model = buildMenu({
    self,
    attackerProblem: problem,
    weapons,
    dvs: acting && !self ? await dvTable(weapons, distance) : {},
    distance,
    squareSize: squareSize(),
    grapple: grappleState,
    targetGrappled: grappleLink(target.document) !== null,
    targeted: target.isTargeted,
    net: netInput(acting, target),
  });
  return {
    title: visibleName(target) ?? game.i18n.localize("CCK.Menu.UnknownTarget"),
    subtitle: formatDistance(model.distance),
    entries: model.entries,
  };
}

export async function reloadFor(actor: Actor, weaponId: string): Promise<void> {
  const item = findItem(actor, weaponId);
  if (!item || !(await reloadWeapon(item))) warn("CCK.Attack.no-weapon");
}

async function reloadAttacker(weaponId: string): Promise<void> {
  const attacker = attackerToken();
  if (typeof attacker === "string") return warn(`CCK.Attack.${attacker}`);
  if (attacker.actor) await reloadFor(attacker.actor, weaponId);
}

export async function runMenuAction(action: MenuAction, target: Token): Promise<void> {
  switch (action.kind) {
    case "reload":
      return reloadAttacker(action.weaponId);
    case "target":
      return toggleTarget(target);
    case "attack":
      targetOnly(target);
      return attack({
        weaponId: action.weaponId,
        mode: action.mode,
        ...(action.location ? { location: action.location } : {}),
      });
    case "grapple":
      if (action.action === "grab") targetOnly(target);
      return grapple({ action: action.action });
    case "net":
      if (action.action !== "forceOut") targetOnly(target);
      return quickhack({
        action: action.action,
        ...(action.quickhackId ? { quickhackId: action.quickhackId } : {}),
        ...(action.runnerUuid ? { runnerUuid: action.runnerUuid } : {}),
      });
  }
}

let closeMenu: (() => void) | null = null;
let menuGeneration = 0;

export async function openMenuFor(target: Token, position: { x: number; y: number }) {
  closeMenu?.();
  closeMenu = null;
  const current = ++menuGeneration;
  const view = await menuViewFor(target);
  if (current !== menuGeneration) return;
  closeMenu = openQuickMenu(view, position, (action) => {
    void runMenuAction(action, target);
  });
}

export function initQuickMenu(): void {
  onTokenTargetClick();
  onTokenRightClick((click: TokenClick) => {
    void openMenuFor(click.token, { x: click.clientX, y: click.clientY });
  });
}
