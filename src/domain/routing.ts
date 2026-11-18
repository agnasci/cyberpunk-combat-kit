export type CardAudience = "public" | "gm";

export function resolutionAudience(attackerIsNpc: boolean, defenderIsNpc: boolean): CardAudience {
  return attackerIsNpc && defenderIsNpc ? "gm" : "public";
}
