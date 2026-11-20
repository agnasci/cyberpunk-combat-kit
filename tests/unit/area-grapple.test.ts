import { describe, expect, it } from "vitest";
import {
  areaContains,
  circleArea,
  explosionSquare,
  shellArea,
  withinSquare,
} from "../../src/domain/area";
import {
  activeChokeStreak,
  chokeOutcome,
  contestWon,
  nextChokeStreak,
  type GrappleLink,
} from "../../src/domain/grapple";

describe("área de explosão (RULES §4; p. 174: quadrado de 10 m centrado no alvo)", () => {
  const pixelsPerUnit = 50;
  const area = explosionSquare({ x: 650, y: 650 }, 10, pixelsPerUnit);

  it("monta o template retangular a partir do centro", () => {
    expect(area).toMatchObject({ t: "rect", x: 400, y: 400, direction: 45 });
    expect(area.distance).toBeCloseTo(14.142, 3);
  });

  it("sabe quem está dentro", () => {
    expect(areaContains(area, pixelsPerUnit, { x: 650, y: 650 })).toBe(true);
    expect(areaContains(area, pixelsPerUnit, { x: 890, y: 410 })).toBe(true);
    expect(areaContains(area, pixelsPerUnit, { x: 950, y: 650 })).toBe(false);
  });

  it("errando, o ponto de queda fica dentro dos 10 m em volta do ponto mirado", () => {
    expect(withinSquare({ x: 650, y: 650 }, 10, pixelsPerUnit, { x: 900, y: 400 })).toBe(true);
    expect(withinSquare({ x: 650, y: 650 }, 10, pixelsPerUnit, { x: 950, y: 650 })).toBe(false);
  });
});

describe("cartucho de espingarda (p. 174: à frente, até 6 m)", () => {
  const pixelsPerUnit = 50;
  const area = shellArea({ x: 0, y: 0 }, { x: 500, y: 0 }, 6, 1, pixelsPerUnit);

  it("começa na borda do atirador e vai 6 m na direção apontada", () => {
    expect(area).toMatchObject({ t: "ray", x: 50, y: 0, distance: 6, width: 6, direction: 0 });
  });

  it("pega quem está à frente, não quem está ao lado ou atrás", () => {
    expect(areaContains(area, pixelsPerUnit, { x: 150, y: 0 })).toBe(true);
    expect(areaContains(area, pixelsPerUnit, { x: 340, y: 140 })).toBe(true);
    expect(areaContains(area, pixelsPerUnit, { x: 0, y: 100 })).toBe(false);
    expect(areaContains(area, pixelsPerUnit, { x: -100, y: 0 })).toBe(false);
    expect(areaContains(area, pixelsPerUnit, { x: 400, y: 0 })).toBe(false);
  });

  it("gira com a direção", () => {
    const down = shellArea({ x: 0, y: 0 }, { x: 0, y: 500 }, 6, 1, pixelsPerUnit);
    expect(areaContains(down, pixelsPerUnit, { x: 0, y: 200 })).toBe(true);
    expect(areaContains(down, pixelsPerUnit, { x: 200, y: 0 })).toBe(false);
  });
});

describe("fogo supressivo (p. 174: até 25 m)", () => {
  it("círculo em volta do atirador", () => {
    const area = circleArea({ x: 0, y: 0 }, 25);
    expect(areaContains(area, 50, { x: 1250, y: 0 })).toBe(true);
    expect(areaContains(area, 50, { x: 1000, y: 1000 })).toBe(false);
  });
});

describe("agarrão (RULES §5; p. 178)", () => {
  const link: GrappleLink = {
    role: "defender",
    partnerUuid: "t",
    chokeStreak: 0,
    lastChokeRound: null,
  };

  it("quem age precisa superar (empate favorece quem resiste)", () => {
    expect(contestWon(15, 14)).toBe(true);
    expect(contestWon(14, 14)).toBe(false);
  });

  it("estrangular: dano do BODY direto; de mais de 1 PV para menos de 0 fica com 1 e desmaia", () => {
    expect(chokeOutcome(20, 6, 1)).toEqual({ hpAfter: 14, knockedOut: false, streak: 1 });
    expect(chokeOutcome(4, 6, 1)).toEqual({ hpAfter: 1, knockedOut: true, streak: 1 });
    expect(chokeOutcome(6, 6, 1)).toEqual({ hpAfter: 0, knockedOut: false, streak: 1 });
    expect(chokeOutcome(1, 6, 1)).toEqual({ hpAfter: -5, knockedOut: false, streak: 1 });
  });

  it("três rodadas seguidas estrangulando desmaiam o alvo", () => {
    expect(chokeOutcome(30, 2, 3).knockedOut).toBe(true);
  });

  it("rodadas mostradas zeram quando uma rodada passou sem estrangular (E9-05)", () => {
    const choking = { ...link, chokeStreak: 2, lastChokeRound: 4 };
    expect(activeChokeStreak(choking, 4)).toBe(2);
    expect(activeChokeStreak(choking, 5)).toBe(2);
    expect(activeChokeStreak(choking, 6)).toBe(0);
    expect(activeChokeStreak({ ...link, chokeStreak: 2 }, null)).toBe(2);
  });

  it("conta rodadas seguidas pelo tracker; sem combate conta cada uso", () => {
    expect(nextChokeStreak(link, 3)).toBe(1);
    expect(nextChokeStreak({ ...link, chokeStreak: 1, lastChokeRound: 3 }, 4)).toBe(2);
    expect(nextChokeStreak({ ...link, chokeStreak: 2, lastChokeRound: 3 }, 5)).toBe(1);
    expect(nextChokeStreak({ ...link, chokeStreak: 2 }, null)).toBe(3);
  });
});
