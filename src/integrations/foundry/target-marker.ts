import { reducedMotion } from "../../domain/cues";
import {
  markerFrame,
  parseCssColor,
  type MarkerFrame,
  type MarkerLine,
} from "../../domain/target-marker";
import { MODULE_ID } from "../../constants";
import { panelPalette } from "../panel/panel-bridge";
import { effectSettings, prefersReducedMotion } from "./settings";
import { attackerToken, distanceBetween } from "./tokens";

interface Layer {
  graphics: PixiGraphics;
  label: PixiText;
  lockedAt: number;
}

interface MarkerColors {
  accent: number;
  strong: number;
  ink: number;
}

const OUTLINE = 0x05070b;
const FALLBACK: MarkerColors = { accent: 0x22d3ee, strong: 0x7ee8f7, ink: 0x05070b };
const STATIC_REFRESH_MS = 500;
const layers = new WeakMap<Token, Layer>();
let colors = FALLBACK;
let colorsReadAt = -Infinity;
let staticDrawnAt = -Infinity;

function cssColor(name: string): number | null {
  return parseCssColor(getComputedStyle(document.documentElement).getPropertyValue(name));
}

function readColors(): MarkerColors {
  const palette = panelPalette();
  const pick = (panel: string | undefined, css: string, fallback: number) =>
    (panel ? parseCssColor(panel) : null) ?? cssColor(css) ?? fallback;
  return {
    accent: pick(palette?.accent, "--cck-accent", FALLBACK.accent),
    strong: pick(palette?.accentStrong, "--cck-accent-strong", FALLBACK.strong),
    ink: pick(palette?.accentInk, "--cck-accent-ink", FALLBACK.ink),
  };
}

export function hudMarkerOn(): boolean {
  return game.settings.get(MODULE_ID, "targetMarker") !== false;
}

function animationOn(): boolean {
  if (game.settings.get(MODULE_ID, "targetAnimation") === false) return false;
  return !reducedMotion(effectSettings().motion, prefersReducedMotion());
}

function layerFor(token: Token): Layer {
  const existing = layers.get(token);
  if (existing && !existing.graphics.destroyed && existing.graphics.parent === token) {
    return existing;
  }
  const graphics = new PIXI.Graphics();
  const label = new PreciseText("", {
    fontFamily: "Tektur, Jost, sans-serif",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    fill: colors.ink,
  });
  graphics.addChild(label);
  token.addChild(graphics);
  const layer = { graphics, label, lockedAt: 0 };
  layers.set(token, layer);
  return layer;
}

function stroke(graphics: PixiGraphics, lines: readonly MarkerLine[]): void {
  for (const line of lines) {
    const [first, ...rest] = line;
    if (!first) continue;
    graphics.moveTo(first[0], first[1]);
    for (const point of rest) graphics.lineTo(point[0], point[1]);
  }
}

function strokeArcs(graphics: PixiGraphics, frame: MarkerFrame): void {
  const [cx, cy] = frame.center;
  for (const arc of frame.arcs) {
    if (arc.end <= arc.start) continue;
    graphics.moveTo(cx + Math.cos(arc.start) * arc.radius, cy + Math.sin(arc.start) * arc.radius);
    graphics.arc(cx, cy, arc.radius, arc.start, arc.end);
  }
}

function pass(
  graphics: PixiGraphics,
  frame: MarkerFrame,
  width: number,
  color: number,
  alpha: number,
): void {
  graphics.lineStyle(width, color, alpha * frame.alpha);
  stroke(graphics, frame.brackets);
  strokeArcs(graphics, frame);
}

function labelText(token: Token): string {
  const label = game.i18n.localize("CCK.Target.Label");
  const attacker = attackerToken();
  if (typeof attacker === "string" || attacker === token) return label;
  const distance = distanceBetween(attacker, token);
  if (!Number.isFinite(distance)) return label;
  const units = canvas?.scene?.grid.units ?? "";
  return `${label} · ${Math.round(distance)} ${units}`.trim();
}

function drawLabel(layer: Layer, frame: MarkerFrame, token: Token): void {
  const { graphics, label } = layer;
  label.text = labelText(token);
  label.style.fill = colors.ink;
  const [x, y] = frame.label;
  const width = label.width + 12;
  const height = 17;
  const cut = 5;
  graphics
    .lineStyle(1, OUTLINE, 0.8)
    .beginFill(colors.accent, 0.92)
    .drawPolygon([
      x,
      y,
      x + width,
      y,
      x + width,
      y + height - cut,
      x + width - cut,
      y + height,
      x,
      y + height,
    ])
    .endFill();
  label.x = x + 6;
  label.y = y + (height - label.height) / 2;
  label.visible = true;
}

function drawPips(
  graphics: PixiGraphics,
  frame: MarkerFrame,
  others: User[],
  now: number | null,
): void {
  const size = 5 + (now === null ? 0 : Math.sin(now / 380) * 0.9);
  others.forEach((user, index) => {
    const pip = frame.pips[index];
    if (!pip) return;
    const [x, y] = pip;
    graphics
      .lineStyle(1.5, OUTLINE, 1)
      .beginFill(Number(user.color), 1)
      .drawPolygon([x, y - size, x + size, y, x, y + size, x - size, y])
      .endFill();
  });
}

function clearLayer(layer: Layer | undefined): void {
  if (!layer || layer.graphics.destroyed) return;
  layer.graphics.clear();
  layer.label.visible = false;
}

function drawMarker(token: Token, now: number): void {
  const on = hudMarkerOn();
  if (token.target) token.target.renderable = !on;
  if (!on) return clearLayer(layers.get(token));
  const users = [...token.targeted];
  if (users.length === 0) {
    const layer = layers.get(token);
    clearLayer(layer);
    if (layer) layer.lockedAt = 0;
    return;
  }
  const layer = layerFor(token);
  const mine = users.includes(game.user);
  if (!mine) layer.lockedAt = 0;
  else if (layer.lockedAt === 0) layer.lockedAt = now;
  const others = users.filter((user) => user !== game.user);
  const animated = animationOn();
  const frame = markerFrame(
    token.w,
    token.h,
    others.length,
    animated ? { sinceLock: now - layer.lockedAt, clock: now } : null,
  );
  const { graphics } = layer;
  graphics.clear();
  layer.label.visible = false;
  if (mine) {
    pass(graphics, frame, 9, colors.accent, 0.16);
    pass(graphics, frame, 4.5, OUTLINE, 0.8);
    pass(graphics, frame, 2.2, colors.accent, 1);
    graphics.lineStyle(1.5, colors.accent, 0.7 * frame.alpha);
    stroke(graphics, frame.ringTicks);
    graphics.lineStyle(1.2, OUTLINE, 0.9 * frame.alpha).beginFill(colors.strong, frame.alpha);
    for (const chevron of frame.chevrons) {
      graphics.drawPolygon(chevron.flatMap(([x, y]) => [x, y]));
    }
    graphics.endFill();
    if (frame.locked) drawLabel(layer, frame, token);
  }
  drawPips(graphics, frame, others, animated ? now : null);
}

function markedTokens(): Token[] {
  return (canvas?.tokens?.placeables ?? []).filter(
    (token) => token.targeted.size > 0 || layers.has(token),
  );
}

function tick(): void {
  const now = performance.now();
  if (now - colorsReadAt >= STATIC_REFRESH_MS) {
    colors = readColors();
    colorsReadAt = now;
  }
  if (!animationOn() && now - staticDrawnAt < STATIC_REFRESH_MS) return;
  staticDrawnAt = now;
  for (const token of markedTokens()) drawMarker(token, now);
}

export function refreshTargetMarkers(): void {
  colorsReadAt = -Infinity;
  for (const token of canvas?.tokens?.placeables ?? []) {
    token.renderFlags.set({ refreshTarget: true });
  }
}

export function initTargetMarker(): void {
  colors = readColors();
  Hooks.on("refreshToken", (...args: unknown[]) => {
    const [token, flags] = args as [Token, Record<string, boolean> | undefined];
    if (flags?.refreshTarget || flags?.refreshSize) drawMarker(token, performance.now());
  });
  Hooks.on("ccpRendered", () => {
    colorsReadAt = -Infinity;
  });
  canvas?.app.ticker.add(tick);
  refreshTargetMarkers();
}
