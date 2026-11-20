import { MODULE_ID } from "../../constants";
import type { DamageResult } from "../../domain/gm-request";
import type { PackQuickhack } from "../../domain/pack";
import {
  expiryFor,
  hasExpired,
  intrusionBy,
  parseExpiry,
  parseNetState,
  pruneLocks,
  withIntrusion,
  withoutIntrusion,
  type NetIntrusion,
  type NetLock,
  type NetState,
} from "../../domain/quickhack";
import { setHitPointsDirect } from "../cpr/damage-adapter";
import { criticalInjuryData } from "../cpr/net-adapter";
import { hitPoints } from "../cpr/weapon-adapter";

const STATE_FLAG = "net";
const EXPIRY_FLAG = "netExpiry";
const ONGOING_FLAG = "netOngoing";
const ONGOING_ICON = "icons/svg/fire.svg";

export interface Ongoing {
  formula: string;
  name: string;
}

export function netState(token: TokenDocument): NetState {
  return parseNetState(token.getFlag(MODULE_ID, STATE_FLAG));
}

export async function writeNetState(token: TokenDocument, state: NetState): Promise<void> {
  if (state.intrusions.length === 0 && state.locks.length === 0) {
    await token.unsetFlag(MODULE_ID, STATE_FLAG);
    return;
  }
  await token.setFlag(MODULE_ID, STATE_FLAG, state);
}

export async function saveIntrusion(token: TokenDocument, intrusion: NetIntrusion): Promise<void> {
  const state = netState(token);
  const locks = pruneLocks(state.locks, game.time.worldTime);
  await writeNetState(token, withIntrusion({ ...state, locks }, intrusion));
}

export async function dropIntrusion(
  token: TokenDocument,
  runnerUuid: string,
  lock: NetLock | null,
): Promise<boolean> {
  const state = netState(token);
  if (!intrusionBy(state, runnerUuid)) return false;
  await writeNetState(token, withoutIntrusion(state, runnerUuid, lock, game.time.worldTime));
  return true;
}

function currentCombat(): { id: string; round: number } | null {
  const combat = game.combat;
  return combat?.started ? { id: combat.id, round: combat.round } : null;
}

async function markExpiry(document: unknown, rounds: number | null): Promise<void> {
  const expiry = expiryFor(currentCombat(), rounds);
  const target = document as { setFlag?: (scope: string, key: string, value: unknown) => unknown };
  if (expiry && typeof target.setFlag === "function") {
    await target.setFlag(MODULE_ID, EXPIRY_FLAG, expiry);
  }
}

async function rollTotal(formula: string): Promise<number> {
  const roll = await new Roll(formula).evaluate();
  return Math.max(0, Math.round(roll.total));
}

export async function directDamage(actor: Actor, formula: string): Promise<DamageResult> {
  const rolled = await rollTotal(formula);
  const result = await setHitPointsDirect(actor, hitPoints(actor) - rolled);
  return { ...result, rolled };
}

function noChange(actor: Actor, note: string): DamageResult {
  const hp = hitPoints(actor);
  return { hpBefore: hp, hpAfter: hp, hpReduction: 0, ablation: 0, location: "body", note };
}

export async function applyQuickhack(
  actor: Actor,
  quickhack: PackQuickhack,
): Promise<DamageResult> {
  const effect = quickhack.effect;
  switch (effect.type) {
    case "damage": {
      if (!effect.ongoing) {
        return { ...(await directDamage(actor, effect.formula)), note: "CCK.Net.Applied-damage" };
      }
      const ongoing: Ongoing = { formula: effect.formula, name: quickhack.name };
      await actor.createEmbeddedDocuments("ActiveEffect", [
        {
          name: quickhack.name,
          img: quickhack.icon ?? ONGOING_ICON,
          flags: { [MODULE_ID]: { [ONGOING_FLAG]: ongoing } },
        },
      ]);
      return noChange(actor, "CCK.Net.Applied-ongoing");
    }
    case "status": {
      if (!CONFIG.statusEffects.some((status) => status.id === effect.status)) {
        return noChange(actor, "CCK.Net.StatusMissing");
      }
      const had = actor.statuses?.has(effect.status) === true;
      const created = await actor.toggleStatusEffect(effect.status, { active: true });
      await markExpiry(created, effect.rounds);
      return { ...noChange(actor, "CCK.Net.Applied-status"), statuses: had ? [] : [effect.status] };
    }
    case "criticalInjury": {
      const data = await criticalInjuryData(effect.injury);
      if (!data) return noChange(actor, "CCK.Net.InjuryMissing");
      const [item] = await actor.createEmbeddedDocuments("Item", [data]);
      await markExpiry(item, effect.rounds);
      return noChange(actor, "CCK.Net.Applied-criticalInjury");
    }
    case "guided":
      return noChange(actor, "CCK.Net.Guided");
  }
}

function ongoingOf(effect: ActiveEffect): Ongoing | null {
  const value = effect.getFlag(MODULE_ID, ONGOING_FLAG) as Partial<Ongoing> | undefined;
  return typeof value?.formula === "string" && typeof value.name === "string"
    ? { formula: value.formula, name: value.name }
    : null;
}

export function ongoingEffects(actor: Actor): Ongoing[] {
  return actor.effects.map(ongoingOf).filter((entry): entry is Ongoing => entry !== null);
}

function expired(document: { getFlag(scope: string, key: string): unknown }, combat: Combat) {
  const expiry = parseExpiry(document.getFlag(MODULE_ID, EXPIRY_FLAG));
  return expiry !== null && hasExpired(expiry, { id: combat.id, round: combat.round });
}

export async function removeExpired(actor: Actor, combat: Combat): Promise<void> {
  const effects = actor.effects.filter((effect) => expired(effect, combat)).map((e) => e.id);
  if (effects.length > 0) await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
  const items = (actor.itemTypes.criticalInjury ?? [])
    .filter((item) => expired(item, combat))
    .map((item) => item.id);
  if (items.length > 0) await actor.deleteEmbeddedDocuments("Item", items);
}
