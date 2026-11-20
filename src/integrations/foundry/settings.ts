import { MODULE_ID } from "../../constants";
import { clamp, type MotionSetting } from "../../domain/cues";

export interface EffectSettings {
  visuals: boolean;
  sounds: boolean;
  volume: number;
  intensity: number;
  motion: MotionSetting;
}

const MOTION_CHOICES: MotionSetting[] = ["auto", "reduce", "full"];

export function registerEffectSettings(): void {
  const client = { scope: "client", config: true } as const;
  game.settings.register(MODULE_ID, "fxVisuals", {
    ...client,
    name: "CCK.Settings.Visuals",
    hint: "CCK.Settings.VisualsHint",
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "fxSounds", {
    ...client,
    name: "CCK.Settings.Sounds",
    hint: "CCK.Settings.SoundsHint",
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "fxVolume", {
    ...client,
    name: "CCK.Settings.Volume",
    hint: "CCK.Settings.VolumeHint",
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.7,
  });
  game.settings.register(MODULE_ID, "fxIntensity", {
    ...client,
    name: "CCK.Settings.Intensity",
    hint: "CCK.Settings.IntensityHint",
    type: Number,
    range: { min: 0.25, max: 1.5, step: 0.25 },
    default: 1,
  });
  game.settings.register(MODULE_ID, "fxMotion", {
    ...client,
    name: "CCK.Settings.Motion",
    hint: "CCK.Settings.MotionHint",
    type: String,
    choices: Object.fromEntries(
      MOTION_CHOICES.map((choice) => [choice, `CCK.Settings.Motion-${choice}`]),
    ),
    default: "auto",
  });
}

export function effectSettings(): EffectSettings {
  const motion = game.settings.get(MODULE_ID, "fxMotion");
  return {
    visuals: game.settings.get(MODULE_ID, "fxVisuals") !== false,
    sounds: game.settings.get(MODULE_ID, "fxSounds") !== false,
    volume: clamp(Number(game.settings.get(MODULE_ID, "fxVolume")), 0, 1),
    intensity: clamp(Number(game.settings.get(MODULE_ID, "fxIntensity")), 0.25, 1.5),
    motion: MOTION_CHOICES.find((choice) => choice === motion) ?? "auto",
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type MenuModifier = "alt" | "ctrl" | "shift";
const MODIFIER_CHOICES: MenuModifier[] = ["alt", "ctrl", "shift"];
export type TargetModifier = MenuModifier | "off";
const TARGET_CHOICES: TargetModifier[] = ["alt", "ctrl", "shift", "off"];

export function registerMenuSettings(): void {
  const client = { scope: "client", config: true } as const;
  game.settings.register(MODULE_ID, "menuModifier", {
    ...client,
    name: "CCK.Settings.MenuModifier",
    hint: "CCK.Settings.MenuModifierHint",
    type: String,
    choices: Object.fromEntries(
      MODIFIER_CHOICES.map((choice) => [choice, `CCK.Settings.Modifier-${choice}`]),
    ),
    default: "alt",
  });
  game.settings.register(MODULE_ID, "targetModifier", {
    ...client,
    name: "CCK.Settings.TargetModifier",
    hint: "CCK.Settings.TargetModifierHint",
    type: String,
    choices: Object.fromEntries(
      TARGET_CHOICES.map((choice) => [choice, `CCK.Settings.Modifier-${choice}`]),
    ),
    default: "alt",
  });
  game.settings.register(MODULE_ID, "menuAlways", {
    ...client,
    name: "CCK.Settings.MenuAlways",
    hint: "CCK.Settings.MenuAlwaysHint",
    type: Boolean,
    default: false,
  });
}

export function targetModifier(): TargetModifier {
  const value = game.settings.get(MODULE_ID, "targetModifier");
  return TARGET_CHOICES.find((choice) => choice === value) ?? "alt";
}

export function menuSettings(): { modifier: MenuModifier; always: boolean } {
  const modifier = game.settings.get(MODULE_ID, "menuModifier");
  return {
    modifier: MODIFIER_CHOICES.find((choice) => choice === modifier) ?? "alt",
    always: game.settings.get(MODULE_ID, "menuAlways") === true,
  };
}

export function settingsMenuType(open: () => void): new () => { render(force?: boolean): unknown } {
  return class extends foundry.applications.api.ApplicationV2 {
    override render(): this {
      open();
      return this;
    }
  };
}

export interface QuickhackSettings {
  enabled: boolean;
  neuroport: string[];
  selfIce: string[];
}

function terms(value: unknown): string[] {
  return typeof value === "string"
    ? value
        .split(",")
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
    : [];
}

export function registerQuickhackSettings(): void {
  const world = { scope: "world", config: true } as const;
  game.settings.register(MODULE_ID, "quickhacks", {
    ...world,
    name: "CCK.Settings.Quickhacks",
    hint: "CCK.Settings.QuickhacksHint",
    type: Boolean,
    default: false,
    requiresReload: true,
  });
  game.settings.register(MODULE_ID, "neuroportNames", {
    ...world,
    name: "CCK.Settings.NeuroportNames",
    hint: "CCK.Settings.NeuroportNamesHint",
    type: String,
    default: "Neuroport",
  });
  game.settings.register(MODULE_ID, "selfIceNames", {
    ...world,
    name: "CCK.Settings.SelfIceNames",
    hint: "CCK.Settings.SelfIceNamesHint",
    type: String,
    default: "Self-ICE",
  });
}

export function quickhackSettings(): QuickhackSettings {
  return {
    enabled: game.settings.get(MODULE_ID, "quickhacks") === true,
    neuroport: terms(game.settings.get(MODULE_ID, "neuroportNames")),
    selfIce: terms(game.settings.get(MODULE_ID, "selfIceNames")),
  };
}
