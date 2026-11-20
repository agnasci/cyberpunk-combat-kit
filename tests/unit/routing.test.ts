import { describe, expect, it } from "vitest";
import { chooseAttacker, defendsAutomatically } from "../../src/domain/routing";

describe("defesa automática dos PdMs (F-01)", () => {
  it("só rola sozinho com o ajuste ligado e defensor sem jogador dono", () => {
    expect(defendsAutomatically("auto", false)).toBe(true);
    expect(defendsAutomatically("auto", true)).toBe(false);
    expect(defendsAutomatically("ask", false)).toBe(false);
  });
});

describe("quem ataca (F-01)", () => {
  it("o token selecionado vence; sem seleção, o token único do personagem", () => {
    expect(chooseAttacker(["a"], ["c"])).toBe("a");
    expect(chooseAttacker(["a", "b"], ["c"])).toBe("many-attackers");
    expect(chooseAttacker([], ["c"])).toBe("c");
    expect(chooseAttacker([], ["c", "d"])).toBe("no-attacker");
    expect(chooseAttacker([], [])).toBe("no-attacker");
  });
});
