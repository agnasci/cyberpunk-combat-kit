import { describe, expect, it } from "vitest";
import { parseDamageInput, resolutionHook } from "../../src/domain/api-input";

describe("parseDamageInput", () => {
  it("fills defaults for a plain damage value", () => {
    const input = parseDamageInput({ damage: 12 });
    expect(input).toEqual({
      ok: true,
      damage: {
        damage: 12,
        bonusDamage: 0,
        location: "body",
        ablation: 1,
        ammoVariety: "",
        ignoreArmorPercent: 0,
        ignoreBelowSP: 0,
        lethal: true,
      },
      label: null,
      card: true,
    });
  });

  it("keeps the options a macro can set", () => {
    const input = parseDamageInput({
      damage: 8,
      location: "head",
      ablation: 0,
      bonusDamage: 5,
      ignoreArmor: true,
      lethal: false,
      label: " Trap ",
      card: false,
    });
    expect(input.ok && input.damage).toMatchObject({
      location: "head",
      ablation: 0,
      bonusDamage: 5,
      ignoreArmorPercent: 100,
      lethal: false,
    });
    expect(input.ok && [input.label, input.card]).toEqual(["Trap", false]);
  });

  it.each([
    [null, "not-object"],
    [{}, "bad-damage"],
    [{ damage: -1 }, "bad-damage"],
    [{ damage: 2.5 }, "bad-damage"],
    [{ damage: 501 }, "bad-damage"],
    [{ damage: 3, location: "leg" }, "bad-location"],
    [{ damage: 3, ablation: 21 }, "bad-ablation"],
    [{ damage: 3, bonusDamage: "5" }, "bad-bonus"],
    [{ damage: 3, label: 7 }, "bad-label"],
    [{ damage: 3, label: "x".repeat(61) }, "bad-label"],
  ])("refuses %j", (value, error) => {
    expect(parseDamageInput(value)).toEqual({ ok: false, error });
  });
});

describe("resolutionHook", () => {
  it("splits attacks from netrunning and skips direct damage", () => {
    expect(resolutionHook("single")).toBe("cckAttackResolved");
    expect(resolutionHook("grapple")).toBe("cckAttackResolved");
    expect(resolutionHook("explosion")).toBe("cckAttackResolved");
    expect(resolutionHook("quickhack")).toBe("cckQuickhackResolved");
    expect(resolutionHook("jackIn")).toBe("cckQuickhackResolved");
    expect(resolutionHook("ongoing")).toBe("cckQuickhackResolved");
    expect(resolutionHook("direct")).toBeNull();
  });
});
