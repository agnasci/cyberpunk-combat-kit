export type CardAudience = "public" | "gm" | { users: string[] };

export function resolutionAudience(attackerIsNpc: boolean, defenderIsNpc: boolean): CardAudience {
  return attackerIsNpc && defenderIsNpc ? "gm" : "public";
}
