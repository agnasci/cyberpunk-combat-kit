import { describe, expect, it } from "vitest";
import {
  attackCost,
  budgetFor,
  checkMove,
  economyMode,
  freshBudget,
  runAndMove,
  spendAction,
  squaresMoved,
  turnPlate,
} from "../../src/domain/turn-budget";

describe("orçamento do turno (D41)", () => {
  it("zera ao mudar de rodada e ignora flag inválida", () => {
    expect(budgetFor({ round: 2, moved: 3, halves: 2, ran: false }, 3)).toEqual(freshBudget(3));
    expect(budgetFor({ round: 3, moved: 3, halves: 9, ran: true }, 3)).toEqual({
      round: 3,
      moved: 3,
      halves: 2,
      ran: true,
    });
    expect(budgetFor("x", 1)).toEqual(freshBudget(1));
  });

  it("modo padrão bloqueia; valores desconhecidos caem no padrão", () => {
    expect(economyMode("track")).toBe("track");
    expect(economyMode("nope")).toBe("enforce");
  });

  it("uma Ação: cadência 2 dá dois ataques simples, o resto gasta a Ação inteira", () => {
    expect(attackCost("single", 2)).toBe(1);
    expect(attackCost("aimed", 2)).toBe(2);
    expect(attackCost("single", 1)).toBe(2);
    const half = spendAction(freshBudget(1), 1);
    expect(half).not.toBe("no-action");
    if (half === "no-action") return;
    expect(spendAction(half, 1)).not.toBe("no-action");
    expect(spendAction(half, 2)).toBe("no-action");
  });

  it("movimento até o MOV em quadrados; além disso, só correndo", () => {
    const start = freshBudget(1);
    const walk = checkMove(start, 6, 4, false);
    expect(walk.ok && walk.budget.moved).toBe(4);
    if (!walk.ok) return;
    expect(checkMove(walk.budget, 6, 4, false)).toEqual({
      ok: false,
      problem: "no-move",
      canRun: true,
    });
    expect(checkMove(walk.budget, 6, 9, false)).toEqual({
      ok: false,
      problem: "no-move",
      canRun: false,
    });
    const ran = runAndMove(walk.budget, 4);
    expect(ran).toEqual({ round: 1, moved: 8, halves: 2, ran: true });
  });

  it("caído não anda e quem já agiu não corre", () => {
    expect(checkMove(freshBudget(1), 6, 1, true)).toEqual({
      ok: false,
      problem: "prone",
      canRun: false,
    });
    const acted = { ...freshBudget(1), moved: 6, halves: 2 };
    expect(checkMove(acted, 6, 1, false)).toEqual({ ok: false, problem: "no-move", canRun: false });
    expect(runAndMove(acted, 1)).toBe("run-needs-action");
  });

  it("quadrados: diagonal conta 1; sem grade arredonda para cima", () => {
    expect(squaresMoved(300, 200, 100, false)).toBe(3);
    expect(squaresMoved(-100, 0, 100, false)).toBe(1);
    expect(squaresMoved(150, 0, 100, true)).toBe(2);
  });

  it("placa: segmentos do MOV, extras ao correr, excesso marcado", () => {
    expect(turnPlate(6, { round: 1, moved: 2, halves: 0, ran: false })).toEqual({
      segments: 6,
      base: 6,
      used: 2,
      left: 4,
      over: false,
      action: 2,
    });
    expect(turnPlate(6, { round: 1, moved: 8, halves: 2, ran: true }).segments).toBe(12);
    expect(turnPlate(6, { round: 1, moved: 7, halves: 0, ran: false }).over).toBe(true);
  });
});
