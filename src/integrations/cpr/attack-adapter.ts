import type { NativeDamageRoll } from "../../domain/attack-rules";

const SYSTEM_ROOT = "/systems/cyberpunk-red-core/modules";

interface CprRoll {
  resultTotal: number;
  faces: number[];
  luck?: number;
  bonusDamage?: number;
  isAimed?: boolean;
  location?: string;
  rollCardExtraArgs?: Record<string, unknown>;
  entityData?: Record<string, unknown>;
  handleRollDialog(event: unknown, actor: Actor, item: Item | null): Promise<boolean>;
  roll(): Promise<unknown>;
  wasCritical(): boolean;
}

interface CprChat {
  RenderRollCard(roll: CprRoll): Promise<ChatMessage | undefined>;
}

interface CprSystemUtils {
  getUserTargetedOrSelected(kind: "targeted" | "selected"): unknown[];
}

let systemModules: Promise<{ chat: CprChat; utils: CprSystemUtils }> | null = null;

function loadSystem(): Promise<{ chat: CprChat; utils: CprSystemUtils }> {
  systemModules ??= Promise.all([
    import(/* @vite-ignore */ `${SYSTEM_ROOT}/chat/cpr-chat.js`),
    import(/* @vite-ignore */ `${SYSTEM_ROOT}/utils/cpr-systemUtils.js`),
  ]).then(([chat, utils]) => ({
    chat: (chat as { default: CprChat }).default,
    utils: (utils as { default: CprSystemUtils }).default,
  }));
  return systemModules;
}

export interface NativeRollOptions {
  actor: Actor;
  tokenId: string | null;
  skipDialog: boolean;
}

export interface NativeRollResult {
  total: number;
  faces: number[];
  critical: boolean;
}

function syntheticEvent(skipDialog: boolean): Record<string, unknown> {
  return { ctrlKey: skipDialog, metaKey: false, type: "cck" };
}

async function spendLuck(actor: Actor, roll: CprRoll): Promise<void> {
  if (!Number.isInteger(roll.luck) || (roll.luck ?? 0) <= 0) return;
  const stats = (actor.system as { stats?: { luck?: { value?: number } } }).stats;
  const current = stats?.luck?.value ?? 0;
  await actor.update({ "system.stats.luck.value": current - Math.min(roll.luck ?? 0, current) });
}

async function runNativeRoll(
  item: Item,
  type: string,
  info: Record<string, unknown> | undefined,
  options: NativeRollOptions,
): Promise<CprRoll | null> {
  const { chat, utils } = await loadSystem();
  let roll = item.createRoll(type, options.actor, info) as CprRoll;
  const keepRolling = await roll.handleRollDialog(
    syntheticEvent(options.skipDialog),
    options.actor,
    item,
  );
  if (!keepRolling) return null;
  roll = (await item.confirmRoll(roll)) as CprRoll;
  await roll.roll();
  await spendLuck(options.actor, roll);
  roll.entityData = {
    actor: options.actor.id,
    token: options.tokenId,
    item: item.id,
    tokens: utils.getUserTargetedOrSelected("targeted"),
  };
  await chat.RenderRollCard(roll);
  return roll;
}

function summary(roll: CprRoll): NativeRollResult {
  return { total: roll.resultTotal, faces: [...roll.faces], critical: roll.wasCritical() };
}

export async function rollAttack(
  weapon: Item,
  options: NativeRollOptions,
): Promise<NativeRollResult | null> {
  const roll = await runNativeRoll(weapon, "attack", undefined, options);
  return roll ? summary(roll) : null;
}

export async function rollEvasion(
  skill: Item,
  options: NativeRollOptions,
): Promise<NativeRollResult | null> {
  const roll = await runNativeRoll(skill, "skill", undefined, options);
  return roll ? summary(roll) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function rollDamage(
  weapon: Item,
  options: NativeRollOptions,
): Promise<(NativeDamageRoll & { faces: number[] }) | null> {
  const roll = await runNativeRoll(weapon, "damage", { damageType: "attack" }, options);
  if (!roll) return null;
  const extra = roll.rollCardExtraArgs ?? {};
  return {
    total: roll.resultTotal,
    faces: [...roll.faces],
    bonusDamage: count(roll.bonusDamage),
    critical: roll.wasCritical(),
    aimed: roll.isAimed === true,
    location: roll.location ?? "body",
    ammoType: text(extra.ammoType),
    ammoVariety: text(extra.ammoVariety),
    ablation: count(extra.ablationValue),
    ignoreArmorPercent: count(extra.ignoreArmorPercent),
    ignoreBelowSP: count(extra.ignoreBelowSP),
  };
}
