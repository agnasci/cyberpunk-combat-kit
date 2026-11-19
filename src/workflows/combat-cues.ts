import type { Point } from "../domain/area";
import { attackQualifiers, mortallyWounded, type CombatEventName } from "../domain/cues";
import { emitCue } from "../effects/engine";
import { tokenForUuid } from "../integrations/foundry/tokens";
import type { Outcome, TargetResult } from "../ui/resolution-card";
import type { AttackContext } from "./combat-common";

const OUTCOME_EVENTS: Partial<Record<Outcome, CombatEventName>> = {
  hit: "attack.hit",
  miss: "attack.miss",
  dodged: "attack.dodged",
  applied: "attack.hit",
};

export function qualifiersFor(context: AttackContext): string[] {
  return attackQualifiers({
    weaponType: context.weapon.weaponType,
    mode: context.profile.mode,
    area: context.profile.area,
    melee: context.profile.dvSource === "none",
  });
}

export function cueFire(context: AttackContext, targets: Token[], point: Point | null = null) {
  emitCue({
    name: "attack.fire",
    source: context.token.id,
    targets: targets.map((token) => token.id),
    point,
    qualifiers: qualifiersFor(context),
  });
}

export function cueArea(name: "area.place" | "area.detonate", point: Point, source?: Token) {
  emitCue({ name, point, source: source?.id ?? null });
}

export function cueGrapple(name: "grapple.start" | "grapple.end", source: Token, target?: Token) {
  emitCue({ name, source: source.id, targets: target ? [target.id] : [] });
}

export function cueOutcomes(
  source: Token | null,
  qualifiers: string[],
  targets: readonly TargetResult[],
  critical: boolean,
): void {
  for (const target of targets) {
    const token = tokenForUuid(target.uuid);
    const name = OUTCOME_EVENTS[target.outcome];
    if (!token || !name) continue;
    const base = { source: source?.id ?? null, targets: [token.id], qualifiers };
    emitCue({ ...base, name });
    if (name === "attack.hit" && critical) emitCue({ ...base, name: "attack.critical" });
    const applied = target.applied;
    if (!applied || applied.hpReduction <= 0) continue;
    emitCue({ ...base, name: "damage.applied" });
    if (mortallyWounded(applied.hpBefore, applied.hpAfter)) {
      emitCue({ ...base, name: "actor.mortallyWounded" });
    }
  }
}
