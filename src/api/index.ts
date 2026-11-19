import { emitCue, registerCue, unregisterCue, type CueInput } from "../effects/engine";
import { attack } from "../workflows/attack";
import type { AttackOptions } from "../workflows/combat-common";
import { grapple, type GrappleOptions } from "../workflows/grapple";

export interface CombatKitApi {
  version: 1;
  attack(options?: AttackOptions): Promise<void>;
  grapple(options: GrappleOptions): Promise<void>;
  effects: {
    register(key: string, steps: unknown): boolean;
    unregister(key: string): void;
    play(input: CueInput): void;
  };
}

export function createApi(): CombatKitApi {
  return {
    version: 1,
    attack,
    grapple,
    effects: { register: registerCue, unregister: unregisterCue, play: emitCue },
  };
}
