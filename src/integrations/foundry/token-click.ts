import { menuOpens } from "../../domain/menu";
import { placementActive } from "./area-placement";
import { menuSettings, type MenuModifier } from "./settings";

export interface TokenClick {
  token: Token;
  clientX: number;
  clientY: number;
}

const NAME_VISIBLE_TO_ALL = new Set([30, 50]);

function modifierHeld(event: PointerEvent, modifier: MenuModifier): boolean {
  if (modifier === "ctrl") return event.ctrlKey || event.metaKey;
  if (modifier === "shift") return event.shiftKey;
  return event.altKey;
}

function tokenAt(clientX: number, clientY: number): Token | null {
  if (!canvas?.tokens?.active) return null;
  const point = canvas.canvasCoordinatesFromClient({ x: clientX, y: clientY });
  return (
    [...canvas.tokens.placeables]
      .reverse()
      .find((token) => token.visible && token.actor && token.bounds.contains(point.x, point.y)) ??
    null
  );
}

export function visibleName(token: Token): string | null {
  if (game.user.isGM || token.isOwner) return token.name;
  return NAME_VISIBLE_TO_ALL.has(token.document.displayName) ? token.name : null;
}

export function sceneUnits(): string {
  return canvas?.scene?.grid.units ?? "";
}

export function onTokenRightClick(handler: (click: TokenClick) => void): () => void {
  const listener = (event: PointerEvent) => {
    if (event.button !== 2 || !canvas || event.target !== canvas.app.view) return;
    if (placementActive() || canvas.controls?.ruler?.active) return;
    const token = tokenAt(event.clientX, event.clientY);
    if (!token) return;
    const settings = menuSettings();
    const opens = menuOpens({
      button: event.button,
      owner: token.isOwner,
      modifier: modifierHeld(event, settings.modifier),
      always: settings.always,
      controlled: token.controlled,
    });
    if (!opens) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handler({ token, clientX: event.clientX, clientY: event.clientY });
  };
  document.addEventListener("pointerdown", listener, true);
  return () => document.removeEventListener("pointerdown", listener, true);
}

export function targetOnly(token: Token): void {
  token.setTarget(true, { releaseOthers: true, groupSelection: false });
}

export function toggleTarget(token: Token): void {
  token.setTarget(!token.isTargeted, { releaseOthers: false, groupSelection: false });
}
