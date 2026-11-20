export type CardAudience = "public" | "gm" | { users: string[] };

export function resolutionAudience(attackerIsNpc: boolean, defenderIsNpc: boolean): CardAudience {
  return attackerIsNpc && defenderIsNpc ? "gm" : "public";
}

export type NpcDefenseMode = "ask" | "auto";

export function defendsAutomatically(
  mode: NpcDefenseMode,
  defenderHasPlayerOwner: boolean,
): boolean {
  return mode === "auto" && !defenderHasPlayerOwner;
}

export function chooseAttacker<T>(
  controlled: readonly T[],
  characterTokens: readonly T[],
): T | "no-attacker" | "many-attackers" {
  if (controlled.length > 1) return "many-attackers";
  if (controlled.length === 1) return controlled[0] as T;
  return characterTokens.length === 1 ? (characterTokens[0] as T) : "no-attacker";
}
