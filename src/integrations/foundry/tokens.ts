export interface AttackTokens {
  attacker: Token;
  target: Token;
}

export type TokenProblem =
  "no-canvas" | "no-attacker" | "many-attackers" | "no-target" | "many-targets";

export function attackTokens(): AttackTokens | TokenProblem {
  if (!canvas?.tokens) return "no-canvas";
  const owned = canvas.tokens.controlled.filter((token) => token.isOwner && token.actor);
  if (owned.length === 0) return "no-attacker";
  if (owned.length > 1) return "many-attackers";
  const targets = [...game.user.targets].filter((token) => token.actor);
  if (targets.length === 0) return "no-target";
  if (targets.length > 1) return "many-targets";
  const [attacker] = owned;
  const [target] = targets;
  if (!attacker || !target) return "no-target";
  return { attacker, target };
}

function restingCenter(token: Token, gridSize: number): { x: number; y: number } {
  const { x, y, width, height } = token.document;
  return { x: x + (width * gridSize) / 2, y: y + (height * gridSize) / 2 };
}

export function distanceBetween(a: Token, b: Token): number {
  if (!canvas) return Number.NaN;
  const size = canvas.grid.size;
  return canvas.grid.measurePath([restingCenter(a, size), restingCenter(b, size)]).distance;
}

export function squareSize(): number {
  return canvas?.scene?.grid.distance ?? 2;
}
