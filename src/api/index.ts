import { attack, type AttackOptions } from "../workflows/attack";

export interface CombatKitApi {
  version: 1;
  attack(options?: AttackOptions): Promise<void>;
}

export function createApi(): CombatKitApi {
  return { version: 1, attack };
}
