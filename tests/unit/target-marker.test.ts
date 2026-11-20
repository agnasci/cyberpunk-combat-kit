import { describe, expect, it } from "vitest";
import { LOCK_MS, lockProgress, markerFrame, parseCssColor } from "../../src/domain/target-marker";

describe("mira do alvo marcado (D40)", () => {
  it("parada: cantos chanfrados a 6 px do token, setas e etiqueta, sem anel", () => {
    const frame = markerFrame(100, 100, 0, null);
    expect(frame.brackets[0]).toEqual([
      [-6, 19],
      [-6, 0],
      [0, -6],
      [19, -6],
    ]);
    expect(frame.chevrons).toHaveLength(4);
    expect(frame.chevrons[0]?.[0]).toEqual([50, -9]);
    expect(frame.label).toEqual([-6, -26]);
    expect(frame.locked).toBe(true);
    expect(frame.alpha).toBe(1);
  });

  it("travamento: cantos vêm de fora, piscam e só travam ao fim", () => {
    const start = markerFrame(100, 100, 0, { sinceLock: 0, clock: 0 });
    expect(start.brackets[0]?.[2]).toEqual([-28, -34]);
    expect(start.locked).toBe(false);
    expect(markerFrame(100, 100, 0, { sinceLock: 50, clock: 50 }).alpha).toBeLessThan(1);
    expect(lockProgress({ sinceLock: LOCK_MS, clock: 0 })).toBe(1);
    expect(markerFrame(100, 100, 0, { sinceLock: LOCK_MS, clock: 0 }).locked).toBe(true);
  });

  it("depois de travar os cantos respiram", () => {
    const breathing = markerFrame(100, 100, 0, { sinceLock: 5000, clock: 400 });
    expect(breathing.brackets[0]?.[0]?.[0]).toBeCloseTo(-8);
  });

  it("losangos de outros usuários abaixo do token, espalhados como as bolinhas do Foundry", () => {
    expect(markerFrame(100, 100, 1, null).pips).toEqual([[50, 124]]);
    expect(markerFrame(100, 100, 2, null).pips.map(([x]) => x)).toEqual([58, 42]);
  });
});

describe("cor do tema", () => {
  it("lê hexadecimal e rgb", () => {
    expect(parseCssColor(" #22d3ee")).toBe(0x22d3ee);
    expect(parseCssColor("#fff")).toBe(0xffffff);
    expect(parseCssColor("rgb(34 211 238 / 0.45)")).toBe(0x22d3ee);
    expect(parseCssColor("rgb(255, 0, 0)")).toBe(0xff0000);
    expect(parseCssColor("var(--x)")).toBeNull();
  });
});
