import type { Point } from "../../domain/area";

export type TokenProblem =
  "no-canvas" | "no-attacker" | "many-attackers" | "no-target" | "many-targets";

export function attackerToken(): Token | TokenProblem {
  if (!canvas?.tokens) return "no-canvas";
  const owned = canvas.tokens.controlled.filter((token) => token.isOwner && token.actor);
  if (owned.length > 1) return "many-attackers";
  return owned[0] ?? "no-attacker";
}

export function targetedTokens(): Token[] {
  return [...game.user.targets].filter((token) => token.actor);
}

export function singleTarget(): Token | TokenProblem {
  const targets = targetedTokens();
  if (targets.length > 1) return "many-targets";
  return targets[0] ?? "no-target";
}

function gridSize(): number {
  return canvas?.grid.size ?? 100;
}

export function restingCenter(token: Token): Point {
  const { x, y, width, height } = token.document;
  const size = gridSize();
  return { x: x + (width * size) / 2, y: y + (height * size) / 2 };
}

export function distanceBetween(a: Token, b: Token): number {
  if (!canvas) return Number.NaN;
  return canvas.grid.measurePath([restingCenter(a), restingCenter(b)]).distance;
}

export function squareSize(): number {
  return canvas?.scene?.grid.distance ?? 2;
}

export function pixelsPerUnit(): number {
  return gridSize() / squareSize();
}

export function distanceToPoint(token: Token, point: Point): number {
  if (!canvas) return Number.NaN;
  return canvas.grid.measurePath([restingCenter(token), point]).distance;
}

export function tokenForUuid(uuid: string): Token | null {
  const placeables = canvas?.tokens?.placeables ?? [];
  return (
    placeables.find((token) => token.document.uuid === uuid) ??
    placeables.find((token) => token.actor?.uuid === uuid) ??
    null
  );
}
