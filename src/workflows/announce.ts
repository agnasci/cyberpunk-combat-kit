import { resolutionHook } from "../domain/api-input";
import { isUndoable, type DamageResult } from "../domain/gm-request";
import type { CardAudience } from "../domain/routing";
import { postResolutionCard, type ResolutionState } from "../ui/resolution-card";

export type DamageSource = "attack" | "quickhack" | "ongoing" | "direct";

export interface DamageEvent {
  attackerUuid: string;
  targetUuid: string;
  source: DamageSource;
  result: DamageResult;
}

export function announceDamage(event: DamageEvent): void {
  if (!isUndoable(event.result)) return;
  Hooks.callAll("cckDamageApplied", structuredClone(event));
}

export async function postResolution(
  state: ResolutionState,
  speaker: unknown,
  audience: CardAudience,
): Promise<void> {
  await postResolutionCard(state, speaker, audience);
  const hook = resolutionHook(state.mode);
  if (hook) Hooks.callAll(hook, structuredClone(state));
}
