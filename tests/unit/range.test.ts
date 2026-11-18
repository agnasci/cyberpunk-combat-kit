import { describe, expect, it } from "vitest";
import {
  dvBandsFromResults,
  dvForDistance,
  meleeInReach,
  parseDvText,
} from "../../src/domain/range";

const bands = dvBandsFromResults([
  { range: [7, 12], text: "15" },
  { range: [0, 6], text: "13" },
  { range: [13, 25], text: "20" },
  { range: [201, 400], text: "N/A" },
]);

describe("DV por distância (RULES §3, p. 171–174; tabela do sistema)", () => {
  it("lê o texto da tabela do sistema", () => {
    expect(parseDvText("13")).toBe(13);
    expect(parseDvText("N/A")).toBeNull();
    expect(parseDvText("")).toBeNull();
  });

  it("ordena as faixas e acha a DV pela distância em metros", () => {
    expect(bands.map((band) => band.min)).toEqual([0, 7, 13, 201]);
    expect(dvForDistance(bands, 0)).toBe(13);
    expect(dvForDistance(bands, 6)).toBe(13);
    expect(dvForDistance(bands, 7)).toBe(15);
    expect(dvForDistance(bands, 20)).toBe(20);
  });

  it("arredonda distância fracionária para cima antes de procurar a faixa", () => {
    expect(dvForDistance(bands, 6.2)).toBe(15);
  });

  it("devolve null fora da tabela ou em faixa N/A", () => {
    expect(dvForDistance(bands, 300)).toBeNull();
    expect(dvForDistance(bands, 120)).toBeNull();
    expect(dvForDistance(bands, -1)).toBeNull();
    expect(dvForDistance(bands, Number.NaN)).toBeNull();
  });
});

describe("alcance corpo a corpo (RULES §5, p. 176–181)", () => {
  it("exige o alvo a até um quadrado", () => {
    expect(meleeInReach(2, 2)).toBe(true);
    expect(meleeInReach(4, 2)).toBe(false);
  });
});
