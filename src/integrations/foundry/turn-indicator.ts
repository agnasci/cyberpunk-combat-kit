import { turnPlate, type TurnPlate } from "../../domain/turn-budget";
import { activeCombatant, moveStat, readBudget, runningCombat } from "./turn-store";
import { actionEconomy, turnIndicatorOn } from "./settings";
import { animationOn, hudColors } from "./target-marker";
import { squareSize } from "./tokens";

interface Plate {
  graphics: PixiGraphics;
  label: PixiText;
}

const OUTLINE = 0x05070b;
const SUPERSAMPLE = 3;
const SEGMENT = 5;
const SEGMENT_GAP = 2;
const HEIGHT = 18;
const PAD = 6;
const plates = new WeakMap<Token, Plate>();
let shown: Token | null = null;

function plateFor(token: Token): Plate {
  const existing = plates.get(token);
  if (existing && !existing.graphics.destroyed && existing.graphics.parent === token) {
    return existing;
  }
  const graphics = PIXI.smooth ? new PIXI.smooth.SmoothGraphics() : new PIXI.Graphics();
  const label = new PreciseText("", {
    fontFamily: "Tektur, Jost, sans-serif",
    fontSize: 11 * SUPERSAMPLE,
    fontWeight: "600",
    letterSpacing: 1.2 * SUPERSAMPLE,
    fill: 0xffffff,
  });
  label.scale.set(1 / SUPERSAMPLE, 1 / SUPERSAMPLE);
  graphics.addChild(label);
  token.addChild(graphics);
  const plate = { graphics, label };
  plates.set(token, plate);
  return plate;
}

function clearPlate(token: Token | null): void {
  const plate = token ? plates.get(token) : undefined;
  if (!plate || plate.graphics.destroyed) return;
  plate.graphics.clear();
  plate.label.visible = false;
}

function activeToken(): Token | null {
  const combatant = activeCombatant();
  if (!combatant?.tokenId || runningCombat()?.scene?.id !== canvas?.scene?.id) return null;
  return canvas?.tokens?.placeables.find((token) => token.id === combatant.tokenId) ?? null;
}

function labelFor(data: TurnPlate | null): string {
  if (!data) return game.i18n.localize("CCK.Turn.Label");
  const meters = Math.round(data.left * squareSize());
  const units = canvas?.scene?.grid.units ?? "";
  return `${game.i18n.localize("CCK.Turn.Move")} ${meters} ${units}`.trim();
}

function chamfered(x: number, y: number, width: number, height: number, cut: number): number[] {
  return [
    x + cut,
    y,
    x + width,
    y,
    x + width,
    y + height - cut,
    x + width - cut,
    y + height,
    x,
    y + height,
    x,
    y + cut,
  ];
}

function drawDiamond(graphics: PixiGraphics, x: number, y: number, action: number, color: number) {
  const r = 5;
  graphics
    .lineStyle(1.5, color, 1)
    .beginFill(color, action >= 2 ? 1 : 0)
    .drawPolygon([x, y - r, x + r, y, x, y + r, x - r, y])
    .endFill();
  if (action === 1) {
    graphics
      .lineStyle(0, color, 0)
      .beginFill(color, 1)
      .drawPolygon([x, y - r, x, y + r, x - r, y])
      .endFill();
  }
}

function drawPlate(token: Token, now: number): void {
  const combatant = activeCombatant();
  if (!combatant) return clearPlate(token);
  const economyOn = actionEconomy() !== "off";
  const data = economyOn ? turnPlate(moveStat(combatant.actor), readBudget(combatant)) : null;
  const { graphics, label } = plateFor(token);
  const colors = hudColors();
  label.text = labelFor(data);
  label.style.fill = colors.strong;
  const segmentsWidth = data ? data.segments * (SEGMENT + SEGMENT_GAP) - SEGMENT_GAP : 0;
  const extras = data ? PAD + segmentsWidth + PAD + 12 : 0;
  const width = PAD + label.width + extras + PAD;
  const nameplate = token.nameplate;
  const y = nameplate?.visible ? nameplate.y + nameplate.height + 4 : token.h + 16;
  const x = (token.w - width) / 2;
  const pulse = animationOn() ? 0.55 + 0.45 * Math.sin(now / 420) : 1;
  graphics.clear();
  graphics
    .lineStyle(6, colors.accent, 0.18 * pulse)
    .drawPolygon(chamfered(x, y, width, HEIGHT, 5))
    .lineStyle(1.5, colors.accent, 0.5 + 0.5 * pulse)
    .beginFill(OUTLINE, 0.88)
    .drawPolygon(chamfered(x, y, width, HEIGHT, 5))
    .endFill();
  label.x = x + PAD;
  label.y = y + (HEIGHT - label.height) / 2;
  label.visible = true;
  if (!data) return;
  let cursor = x + PAD + label.width + PAD;
  for (let index = 0; index < data.segments; index += 1) {
    const used = index < data.used;
    const color = data.over ? 0xff4d5e : index < data.base ? colors.accent : colors.strong;
    graphics
      .lineStyle(0, color, 0)
      .beginFill(color, used ? 0.22 : 1)
      .drawRect(cursor, y + 5, SEGMENT, HEIGHT - 10)
      .endFill();
    cursor += SEGMENT + SEGMENT_GAP;
  }
  drawDiamond(graphics, cursor + PAD + 1, y + HEIGHT / 2, data.action, colors.accent);
}

export function plateDrop(token: Token): number {
  if (token !== shown) return 0;
  const nameplate = token.nameplate;
  return nameplate?.visible ? nameplate.height + HEIGHT + 8 : HEIGHT + 8;
}

export function refreshTurnIndicator(): void {
  const next = turnIndicatorOn() ? activeToken() : null;
  if (shown && shown !== next) clearPlate(shown);
  shown = next;
  if (next) drawPlate(next, performance.now());
}

function tick(): void {
  if (shown && animationOn()) drawPlate(shown, performance.now());
}

export function initTurnIndicator(): void {
  Hooks.on("refreshToken", (...args: unknown[]) => {
    const [token] = args as [Token];
    if (token === shown) drawPlate(token, performance.now());
  });
  canvas?.app.ticker.add(tick);
  refreshTurnIndicator();
}
