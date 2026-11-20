import type { NativeDamageRoll } from "../../domain/attack-rules";

const SYSTEM_ROOT = "/systems/cyberpunk-red-core/modules";

export interface CprRoll {
  resultTotal: number;
  faces: number[];
  luck?: number;
  bonusDamage?: number;
  isAimed?: boolean;
  location?: string;
  autofireMultiplier?: number;
  autofireMultiplierMax?: number;
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
  location: string;
}

export type Prepare = (roll: CprRoll) => void;

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
  prepare?: Prepare,
): Promise<CprRoll | null> {
  const { chat, utils } = await loadSystem();
  let roll = item.createRoll(type, options.actor, info) as CprRoll;
  prepare?.(roll);
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
  return {
    total: roll.resultTotal,
    faces: [...roll.faces],
    critical: roll.wasCritical(),
    location: roll.location ?? "body",
  };
}

export async function rollAttack(
  weapon: Item,
  type: "attack" | "aimed" | "autofire" | "suppressive",
  options: NativeRollOptions,
  prepare?: Prepare,
): Promise<NativeRollResult | null> {
  const roll = await runNativeRoll(weapon, type, undefined, options, prepare);
  return roll ? summary(roll) : null;
}

export async function rollSkill(
  skill: Item,
  options: NativeRollOptions,
): Promise<NativeRollResult | null> {
  const roll = await runNativeRoll(skill, "skill", undefined, options);
  return roll ? summary(roll) : null;
}

export async function rollRole(
  role: Item,
  options: NativeRollOptions,
  prepare: Prepare,
): Promise<NativeRollResult | null> {
  const roll = await runNativeRoll(
    role,
    "roleAbility",
    { rollSubType: "mainRoleAbility" },
    options,
    prepare,
  );
  return roll ? summary(roll) : null;
}

interface StatRollActor {
  createRoll(type: "stat", name: string): CprRoll | undefined;
}

export async function rollStat(
  stat: string,
  options: NativeRollOptions,
): Promise<NativeRollResult | null> {
  const { chat, utils } = await loadSystem();
  const roll = (options.actor as Actor & StatRollActor).createRoll("stat", stat);
  if (!roll) return null;
  const keepRolling = await roll.handleRollDialog(
    syntheticEvent(options.skipDialog),
    options.actor,
    null,
  );
  if (!keepRolling) return null;
  await roll.roll();
  await spendLuck(options.actor, roll);
  roll.entityData = {
    actor: options.actor.id,
    token: options.tokenId,
    tokens: utils.getUserTargetedOrSelected("targeted"),
  };
  await chat.RenderRollCard(roll);
  return summary(roll);
}

interface DeathSaveActor {
  createRoll(type: "deathsave", name: string): CprRoll | undefined;
  processDeathSave?(roll: CprRoll): string;
}

export async function rollDeathSave(actor: Actor, tokenId: string | null): Promise<boolean> {
  const { chat } = await loadSystem();
  const native = actor as Actor & DeathSaveActor;
  if (typeof native.processDeathSave !== "function") return false;
  const title = game.i18n.localize("CPR.characterSheet.leftPane.deathSave.title");
  const roll = native.createRoll("deathsave", title);
  if (!roll) return false;
  const keepRolling = await roll.handleRollDialog(syntheticEvent(true), actor, null);
  if (!keepRolling) return false;
  await roll.roll();
  (roll as CprRoll & { saveResult?: string }).saveResult = native.processDeathSave(roll);
  roll.entityData = { actor: actor.id, token: tokenId, tokens: [] };
  await chat.RenderRollCard(roll);
  return true;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export type NativeDamage = NativeDamageRoll & { faces: number[] };

export async function rollDamage(
  weapon: Item,
  damageType: "attack" | "aimed" | "autofire",
  options: NativeRollOptions,
  prepare?: Prepare,
): Promise<NativeDamage | null> {
  const roll = await runNativeRoll(weapon, "damage", { damageType }, options, prepare);
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
