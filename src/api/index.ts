import type { ContentPack, ManifestResult } from "../domain/pack";
import { emitCue, registerCue, unregisterCue, type CueInput } from "../effects/engine";
import { activePacks, registerPack, unregisterPack } from "../effects/packs";
import { API_VERSION } from "../domain/api-input";
import { attack } from "../workflows/attack";
import { applyDamage, type DamageOptions, type DamageOutcome } from "../workflows/direct-damage";
import type { AttackOptions } from "../workflows/combat-common";
import { grapple, type GrappleOptions } from "../workflows/grapple";
import { availableQuickhacks, quickhack, type QuickhackOptions } from "../workflows/quickhack";
import type { PackQuickhack } from "../domain/pack";

export interface CombatKitApi {
  version: typeof API_VERSION;
  attack(options?: AttackOptions): Promise<void>;
  applyDamage(options: DamageOptions): Promise<DamageOutcome>;
  grapple(options: GrappleOptions): Promise<void>;
  effects: {
    register(key: string, steps: unknown): boolean;
    unregister(key: string): void;
    play(input: CueInput): void;
  };
  packs: {
    register(manifest: unknown, folder: string): ManifestResult;
    unregister(id: string): void;
    active(): ContentPack[];
  };
  quickhacks: {
    run(options: QuickhackOptions): Promise<void>;
    list(): PackQuickhack[];
  };
}

export function createApi(): CombatKitApi {
  return Object.freeze({
    version: API_VERSION,
    attack,
    applyDamage,
    grapple,
    effects: { register: registerCue, unregister: unregisterCue, play: emitCue },
    packs: { register: registerPack, unregister: unregisterPack, active: activePacks },
    quickhacks: { run: quickhack, list: availableQuickhacks },
  });
}
