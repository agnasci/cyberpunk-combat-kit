import { describe, expect, it } from "vitest";
import {
  attackQualifiers,
  cueKeys,
  DEFAULT_CUES,
  isCueKey,
  isSafeAssetPath,
  mortallyWounded,
  parseCombatEvent,
  parseCueSteps,
  reducedMotion,
  resolveCue,
  type CueMap,
} from "../../src/domain/cues";

const event = {
  name: "attack.fire",
  sceneId: "scene1",
  source: "tokA",
  targets: ["tokB"],
  point: null,
  qualifiers: ["heavyPistol", "single", "ranged"],
};

describe("cue resolution", () => {
  it("tries qualifiers from most specific to the bare event", () => {
    expect(cueKeys("attack.fire", ["shotgun", "shell"])).toEqual([
      "attack.fire:shotgun+shell",
      "attack.fire:shotgun",
      "attack.fire:shell",
      "attack.fire",
    ]);
  });

  it("tries the weapon type combined with each other qualifier first", () => {
    expect(cueKeys("attack.fire", ["assaultRifle", "autofire", "ranged"]).slice(0, 2)).toEqual([
      "attack.fire:assaultRifle+autofire",
      "attack.fire:assaultRifle+ranged",
    ]);
    expect(cueKeys("attack.hit", [])).toEqual(["attack.hit"]);
  });

  it("lets a combined key win over the form default and the type alone", () => {
    const own = [{ type: "synth", sound: "burst", volume: 1 }] as const;
    const pack: CueMap = { "attack.fire:smg+autofire": own, "attack.fire:smg": [] };
    expect(resolveCue("attack.fire", ["smg", "autofire"], [pack, DEFAULT_CUES])).toBe(own);
  });

  it("accepts combined cue keys of at most two qualifiers", () => {
    expect(isCueKey("attack.fire:smg+autofire")).toBe(true);
    expect(isCueKey("attack.fire:smg+autofire+ranged")).toBe(false);
    expect(isCueKey("attack.fire:smg+")).toBe(false);
  });

  it("prefers a specific default over a generic registered cue", () => {
    const registered: CueMap = { "attack.fire": [{ type: "synth", sound: "shot", volume: 1 }] };
    const steps = resolveCue("attack.fire", ["melee"], [registered, DEFAULT_CUES]);
    expect(steps).toBe(DEFAULT_CUES["attack.fire:melee"]);
  });

  it("prefers a registered cue over the default for the same key", () => {
    const own = [{ type: "synth", sound: "alarm", volume: 1 }] as const;
    const steps = resolveCue("attack.hit", [], [{ "attack.hit": own }, DEFAULT_CUES]);
    expect(steps).toBe(own);
  });

  it("returns nothing for events without cues", () => {
    expect(resolveCue("damage.applied", [], [DEFAULT_CUES])).toEqual([]);
  });

  it("builds qualifiers from the attack profile", () => {
    expect(
      attackQualifiers({ weaponType: "shotgun", mode: "single", area: "shell", melee: false }),
    ).toEqual(["shotgun", "shell", "ranged"]);
    expect(
      attackQualifiers({ weaponType: "lightMelee", mode: "thrown", area: "none", melee: true }),
    ).toEqual(["lightMelee", "thrown", "ranged"]);
    expect(attackQualifiers({ weaponType: "", mode: "single", area: "none", melee: true })).toEqual(
      ["single", "melee"],
    );
  });
});

describe("combat event payload", () => {
  it("accepts a well formed event", () => {
    expect(parseCombatEvent(event)).toEqual(event);
  });

  it("rejects unknown events, bad ids and bad points", () => {
    expect(parseCombatEvent({ ...event, name: "attack.nuke" })).toBeNull();
    expect(parseCombatEvent({ ...event, sceneId: "" })).toBeNull();
    expect(parseCombatEvent({ ...event, targets: [42] })).toBeNull();
    expect(parseCombatEvent({ ...event, point: { x: "1", y: 2 } })).toBeNull();
    expect(parseCombatEvent({ ...event, qualifiers: ["a b"] })).toBeNull();
    expect(parseCombatEvent({ ...event, targets: Array(51).fill("t") })).toBeNull();
  });

  it("keeps only coordinates from the point", () => {
    const parsed = parseCombatEvent({ ...event, point: { x: 1, y: 2, t: "rect" } });
    expect(parsed?.point).toEqual({ x: 1, y: 2 });
  });
});

describe("cue steps from code", () => {
  it("accepts known steps and fills defaults", () => {
    expect(
      parseCueSteps([
        { type: "procedural", effect: "impact", at: "target" },
        { type: "sound", src: "modules/x/shot.ogg", volume: 3 },
        { type: "sprite", src: "modules/x/spark.webm", at: "path" },
      ]),
    ).toEqual([
      { type: "procedural", effect: "impact", at: "target", scale: 1 },
      {
        type: "sound",
        src: ["modules/x/shot.ogg"],
        volume: 1.5,
        startTime: 0,
        delay: 0,
        repeat: 1,
        repeatDelay: 250,
      },
      {
        type: "sprite",
        src: ["modules/x/spark.webm"],
        at: "path",
        scale: 1,
        duration: null,
        template: null,
        opacity: 1,
        playbackRate: 1,
        randomOffset: false,
        persist: false,
        fallback: null,
        delay: 0,
        repeat: 1,
        repeatDelay: 250,
      },
    ]);
  });

  it("rejects unsafe paths, wrong types and empty lists", () => {
    expect(parseCueSteps([])).toBeNull();
    expect(parseCueSteps([{ type: "sound", src: "../secret.ogg" }])).toBeNull();
    expect(parseCueSteps([{ type: "sound", src: "https://x.y/a.ogg" }])).toBeNull();
    expect(parseCueSteps([{ type: "sound", src: "a.webm" }])).toBeNull();
    expect(parseCueSteps([{ type: "sprite", src: "a.png", at: "everywhere" }])).toBeNull();
    expect(parseCueSteps([{ type: "script", src: "a.js" }])).toBeNull();
  });

  it("checks paths and keys", () => {
    expect(isSafeAssetPath("icons/svg/explosion.svg", ["svg"])).toBe(true);
    expect(isSafeAssetPath("/icons/a.svg", ["svg"])).toBe(false);
    expect(isSafeAssetPath("C:/a.svg", ["svg"])).toBe(false);
    expect(isCueKey("attack.fire:shotgun")).toBe(true);
    expect(isCueKey("attack.fire:a:b")).toBe(false);
    expect(isCueKey("boom")).toBe(false);
  });
});

describe("client rules", () => {
  it("follows the system only when the setting is auto", () => {
    expect(reducedMotion("auto", true)).toBe(true);
    expect(reducedMotion("auto", false)).toBe(false);
    expect(reducedMotion("reduce", false)).toBe(true);
    expect(reducedMotion("full", true)).toBe(false);
  });

  it("detects the crossing into mortally wounded (HP below 1)", () => {
    expect(mortallyWounded(5, 0)).toBe(true);
    expect(mortallyWounded(1, -3)).toBe(true);
    expect(mortallyWounded(0, -2)).toBe(false);
    expect(mortallyWounded(10, 1)).toBe(false);
  });
});
