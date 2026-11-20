import { autofireTableName, type AimLocation } from "../domain/modes";
import { dvForDistance } from "../domain/range";
import { rollAttack, rollSkill, type NativeRollResult } from "../integrations/cpr/attack-adapter";
import {
  findSkill,
  loadDvBands,
  SKILLS,
  THROWN_DV_TABLE,
} from "../integrations/cpr/weapon-adapter";
import { attackCost } from "../domain/turn-budget";
import { warn, type AttackContext } from "./combat-common";
import { chargeAction } from "./turn-economy";

export type DvLookup = (distance: number) => number | null;

export async function dvLookup(
  context: Pick<AttackContext, "profile" | "weapon">,
): Promise<DvLookup | "no-table"> {
  const { profile, weapon } = context;
  if (profile.dvSource === "fixed") return () => profile.fixedDv;
  if (profile.dvSource === "none") return () => null;
  const table =
    profile.dvSource === "autofire-table"
      ? autofireTableName(weapon.dvTable)
      : profile.dvSource === "thrown-table"
        ? THROWN_DV_TABLE
        : weapon.dvTable;
  const bands = await loadDvBands(table);
  return bands ? (distance) => dvForDistance(bands, distance) : "no-table";
}

export async function dvFor(
  context: AttackContext,
  distance: number,
): Promise<number | null | "no-table"> {
  const lookup = await dvLookup(context);
  return lookup === "no-table" ? lookup : lookup(distance);
}

export function actionCost(context: Pick<AttackContext, "profile" | "weapon">): number {
  return attackCost(context.profile.mode, context.weapon.rof);
}

export async function nativeAttack(
  context: AttackContext,
  location?: AimLocation,
): Promise<NativeRollResult | null> {
  const { profile, item, roll } = context;
  if (profile.nativeType === "athletics") {
    const skill = findSkill(context.actor, "athletics");
    if (!skill) {
      warn("CCK.Attack.no-skill", { skill: SKILLS.athletics });
      return null;
    }
    return charged(context, await rollSkill(skill, roll));
  }
  const result = await rollAttack(item, profile.nativeType, roll, (native) => {
    if (profile.nativeType === "aimed") native.location = location ?? "head";
  });
  return charged(context, result);
}

function charged(context: AttackContext, result: NativeRollResult | null): NativeRollResult | null {
  if (result) void chargeAction(context.actor, actionCost(context), context.token);
  return result;
}
