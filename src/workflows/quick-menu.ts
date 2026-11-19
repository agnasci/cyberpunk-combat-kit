import {
  buildMenu,
  dvKey,
  menuModes,
  needsDv,
  type DvValue,
  type MenuAction,
  type MenuGrapple,
} from "../domain/menu";
import { attackProfile } from "../domain/modes";
import { weaponsOf } from "../integrations/cpr/weapon-adapter";
import { grappleLink } from "../integrations/foundry/grapple-store";
import {
  onTokenRightClick,
  sceneUnits,
  targetOnly,
  toggleTarget,
  visibleName,
  type TokenClick,
} from "../integrations/foundry/token-click";
import { attackerToken, distanceBetween, squareSize } from "../integrations/foundry/tokens";
import { openQuickMenu } from "../ui/quick-menu";
import { attack } from "./attack";
import { dvLookup } from "./attack-steps";
import { grapple } from "./grapple";

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

async function viewFor(target: Token) {
  const attacker = attackerToken();
  const problem = typeof attacker === "string" ? attacker : null;
  const acting = typeof attacker === "string" ? null : attacker;
  const self = acting === target;
  const weapons = acting?.actor ? weaponsOf(acting.actor) : [];
  const distance = acting && !self ? distanceBetween(acting, target) : Number.NaN;
  const link = acting ? grappleLink(acting.document) : null;
  const grappleState: MenuGrapple | null = link
    ? { role: link.role, partnerIsTarget: link.partnerUuid === target.document.uuid }
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
  });
  return {
    title: visibleName(target) ?? game.i18n.localize("CCK.Menu.UnknownTarget"),
    subtitle: formatDistance(model.distance),
    entries: model.entries,
  };
}

async function run(action: MenuAction, target: Token): Promise<void> {
  switch (action.kind) {
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
  }
}

export function initQuickMenu(): void {
  let close: (() => void) | null = null;
  let generation = 0;
  const open = async (click: TokenClick) => {
    close?.();
    close = null;
    const current = ++generation;
    const view = await viewFor(click.token);
    if (current !== generation) return;
    close = openQuickMenu(view, { x: click.clientX, y: click.clientY }, (action) => {
      void run(action, click.token);
    });
  };
  onTokenRightClick((click) => void open(click));
}
