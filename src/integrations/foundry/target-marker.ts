import { markerShape, parseCssColor, type MarkerLine } from "../../domain/target-marker";
import { MODULE_ID } from "../../constants";

const FALLBACK_COLOR = 0x22d3ee;
const OUTLINE_COLOR = 0x05070b;
const layers = new WeakMap<Token, PixiGraphics>();

function layerFor(token: Token): PixiGraphics {
  const existing = layers.get(token);
  if (existing && !existing.destroyed && existing.parent === token) return existing;
  const graphics = new PIXI.Graphics();
  token.addChild(graphics);
  layers.set(token, graphics);
  return graphics;
}

function accentColor(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--cck-accent");
  return parseCssColor(value) ?? FALLBACK_COLOR;
}

export function hudMarkerOn(): boolean {
  return game.settings.get(MODULE_ID, "targetMarker") !== false;
}

function strokeLines(
  graphics: PixiGraphics,
  lines: readonly MarkerLine[],
  width: number,
  color: number,
  alpha: number,
): void {
  graphics.lineStyle(width, color, alpha);
  for (const line of lines) {
    const [first, ...rest] = line;
    if (!first) continue;
    graphics.moveTo(first[0], first[1]);
    for (const point of rest) graphics.lineTo(point[0], point[1]);
  }
}

function drawDiamond(graphics: PixiGraphics, x: number, y: number, color: number): void {
  const size = 5;
  graphics
    .lineStyle(1.5, OUTLINE_COLOR, 1)
    .beginFill(color, 1)
    .moveTo(x, y - size)
    .lineTo(x + size, y)
    .lineTo(x, y + size)
    .lineTo(x - size, y)
    .lineTo(x, y - size)
    .endFill();
}

function drawMarker(token: Token): void {
  const on = hudMarkerOn();
  if (token.target) token.target.renderable = !on;
  const graphics = on ? layerFor(token) : layers.get(token);
  if (!graphics || graphics.destroyed) return;
  graphics.clear();
  if (!on) return;
  const users = [...token.targeted];
  if (users.length === 0) return;
  const others = users.filter((user) => user !== game.user);
  const shape = markerShape(token.w, token.h, others.length);
  if (others.length < users.length) {
    const color = accentColor();
    const lines = [...shape.brackets, ...shape.ticks];
    strokeLines(graphics, lines, 9, color, 0.18);
    strokeLines(graphics, lines, 5, OUTLINE_COLOR, 0.85);
    strokeLines(graphics, lines, 2.5, color, 1);
  }
  others.forEach((user, index) => {
    const pip = shape.pips[index];
    if (pip) drawDiamond(graphics, pip[0], pip[1], Number(user.color));
  });
}

export function refreshTargetMarkers(): void {
  for (const token of canvas?.tokens?.placeables ?? []) {
    token.renderFlags.set({ refreshTarget: true });
  }
}

export function initTargetMarker(): void {
  Hooks.on("refreshToken", (...args: unknown[]) => {
    const [token, flags] = args as [Token, Record<string, boolean> | undefined];
    if (flags?.refreshTarget || flags?.refreshSize) drawMarker(token);
  });
  refreshTargetMarkers();
}
