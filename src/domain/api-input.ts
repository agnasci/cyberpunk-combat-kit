import type { DamageApplication } from "./attack-rules";

export const API_VERSION = 1;

export type DamageInputError =
  "not-object" | "bad-damage" | "bad-location" | "bad-ablation" | "bad-bonus" | "bad-label";

export type DamageInput =
  | { ok: true; damage: DamageApplication; label: string | null; card: boolean }
  | { ok: false; error: DamageInputError };

const MAX_DAMAGE = 500;
const MAX_BONUS = 50;
const MAX_ABLATION = 20;
const MAX_LABEL = 60;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function intIn(value: unknown, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max
    ? (value as number)
    : null;
}

export function parseDamageInput(value: unknown): DamageInput {
  const data = record(value);
  if (!data) return { ok: false, error: "not-object" };
  const damage = intIn(data.damage, -1, MAX_DAMAGE);
  if (damage === null || damage < 0) return { ok: false, error: "bad-damage" };
  const location = data.location ?? "body";
  if (location !== "body" && location !== "head") return { ok: false, error: "bad-location" };
  const ablation = intIn(data.ablation, 1, MAX_ABLATION);
  if (ablation === null) return { ok: false, error: "bad-ablation" };
  const bonusDamage = intIn(data.bonusDamage, 0, MAX_BONUS);
  if (bonusDamage === null) return { ok: false, error: "bad-bonus" };
  const label = typeof data.label === "string" ? data.label.trim() : "";
  if (data.label !== undefined && (typeof data.label !== "string" || label.length > MAX_LABEL)) {
    return { ok: false, error: "bad-label" };
  }
  return {
    ok: true,
    damage: {
      damage,
      bonusDamage,
      location,
      ablation,
      ammoVariety: "",
      ignoreArmorPercent: data.ignoreArmor === true ? 100 : 0,
      ignoreBelowSP: 0,
      lethal: data.lethal !== false,
    },
    label: label.length > 0 ? label : null,
    card: data.card !== false,
  };
}

const NET_MODES: readonly string[] = ["jackIn", "breach", "quickhack", "forceOut", "ongoing"];

export const DIRECT_MODE = "direct";

export type ResolutionHook = "cckAttackResolved" | "cckQuickhackResolved";

export function resolutionHook(mode: string): ResolutionHook | null {
  if (mode === DIRECT_MODE) return null;
  return NET_MODES.includes(mode) ? "cckQuickhackResolved" : "cckAttackResolved";
}
