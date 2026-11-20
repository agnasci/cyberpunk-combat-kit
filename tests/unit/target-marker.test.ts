import { describe, expect, it } from "vitest";
import { markerShape, parseCssColor } from "../../src/domain/target-marker";

describe("marcador de alvo no estilo do HUD (D40)", () => {
  it("quatro cantos chanfrados fora do token e quatro marcas no meio dos lados", () => {
    const shape = markerShape(100, 100, 0);
    expect(shape.brackets).toHaveLength(4);
    expect(shape.ticks).toHaveLength(4);
    expect(shape.brackets[0]).toEqual([
      [-6, 19],
      [-6, 0],
      [0, -6],
      [19, -6],
    ]);
    expect(shape.pips).toEqual([]);
  });
  it("losangos dos outros usuários espalhados acima do token, como as bolinhas do Foundry", () => {
    expect(markerShape(100, 100, 1).pips).toEqual([[50, -22]]);
    expect(markerShape(100, 100, 2).pips.map(([x]) => x)).toEqual([58, 42]);
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
