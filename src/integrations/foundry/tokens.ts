import type { Point } from "../../domain/area";
import { chooseAttacker } from "../../domain/routing";

export type TokenProblem =
  "no-canvas" | "no-attacker" | "many-attackers" | "no-target" | "many-targets";

export function attackerToken(): Token | TokenProblem {
  if (!canvas?.tokens) return "no-canvas";
  const owned = canvas.tokens.controlled.filter((token) => token.isOwner && token.actor);
  const character = game.user.character;
  const characterTokens = character
    ? canvas.tokens.placeables.filter((token) => token.isOwner && token.actor?.id === character.id)
    : [];
  return chooseAttacker(owned, characterTokens);
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

export function tokenFromRef(ref: Token | TokenDocument | string): Token | null {
  const placeables = canvas?.tokens?.placeables ?? [];
  if (typeof ref === "string") {
    return (
      placeables.find((token) => token.document.uuid === ref || token.id === ref) ??
      placeables.find((token) => token.actor?.uuid === ref) ??
      null
    );
  }
  const id = "documentName" in ref ? ref.id : ref.document.id;
  return placeables.find((token) => token.id === id && token.actor) ?? null;
}

export function ownedToken(ref: Token | TokenDocument | string): Token | TokenProblem {
  if (!canvas?.tokens) return "no-canvas";
  const token = tokenFromRef(ref);
  return token?.isOwner && token.actor ? token : "no-attacker";
}

export function chosenTarget(
  ref: Token | TokenDocument | string | undefined,
): Token | TokenProblem {
  if (ref === undefined) return singleTarget();
  return tokenFromRef(ref) ?? "no-target";
}
