import { describe, expect, it } from "vitest";
import { DEFAULT_CUES, parseCueSteps, resolveCue, withoutSources } from "../../src/domain/cues";
import { parseGmRequest } from "../../src/domain/gm-request";
import { combatJustStarted, initiativeToRoll } from "../../src/domain/initiative";

describe("rajada e supressivo com várias balas (E12)", () => {
  it("efeito procedural aceita repetição e o anchor spray", () => {
    const [step] =
      parseCueSteps([
        { type: "procedural", effect: "tracer", at: "spray", repeat: 30, repeatDelay: 60 },
      ]) ?? [];
    expect(step).toEqual({
      type: "procedural",
      effect: "tracer",
      at: "spray",
      scale: 1,
      delay: 0,
      repeat: 20,
      repeatDelay: 60,
    });
  });

  it("procedural sem opções de tempo continua igual", () => {
    expect(parseCueSteps([{ type: "procedural", effect: "impact", at: "target" }])).toEqual([
      { type: "procedural", effect: "impact", at: "target", scale: 1 },
    ]);
  });

  it("padrões: rajada repete o traço, supressivo espalha", () => {
    const auto = resolveCue("attack.fire", ["smg", "autofire", "ranged"], [DEFAULT_CUES]);
    expect(
      auto.find((step) => step.type === "procedural" && step.effect === "tracer"),
    ).toMatchObject({ at: "path", repeat: 10 });
    const suppress = resolveCue("attack.fire", ["smg", "suppressive", "ranged"], [DEFAULT_CUES]);
    expect(
      suppress.find((step) => step.type === "procedural" && step.effect === "tracer"),
    ).toMatchObject({ at: "spray", repeat: 10 });
  });

  it("sprite sem arquivo vira reserva com a mesma repetição", () => {
    const steps =
      parseCueSteps([
        {
          type: "sprite",
          src: "a.webm",
          at: "spray",
          fallback: "tracer",
          repeat: 12,
          repeatDelay: 200,
        },
      ]) ?? [];
    expect(withoutSources(steps, () => true)).toEqual([
      {
        type: "procedural",
        effect: "tracer",
        at: "spray",
        scale: 1,
        delay: 0,
        repeat: 12,
        repeatDelay: 200,
      },
    ]);
  });

  it("acerto, erro e esquiva não tocam som por padrão", () => {
    for (const name of ["attack.hit", "attack.miss", "attack.dodged"] as const) {
      for (const qualifiers of [[], ["melee"]]) {
        const steps = resolveCue(name, qualifiers, [DEFAULT_CUES]);
        expect(steps.some((step) => step.type === "synth")).toBe(false);
      }
    }
  });
});

describe("lembrete de iniciativa (E12)", () => {
  const rows = [
    { id: "pc", initiative: null, owner: true, activePlayerOwner: true, defeated: false },
    { id: "npc", initiative: null, owner: false, activePlayerOwner: false, defeated: false },
    { id: "away", initiative: null, owner: false, activePlayerOwner: false, defeated: false },
    { id: "done", initiative: 14, owner: true, activePlayerOwner: true, defeated: false },
    { id: "dead", initiative: null, owner: false, activePlayerOwner: false, defeated: true },
  ];

  it("jogador vê só os seus sem iniciativa; mestre vê quem não tem jogador conectado", () => {
    expect(initiativeToRoll(rows, false)).toEqual(["pc"]);
    expect(initiativeToRoll(rows, true)).toEqual(["npc", "away"]);
  });

  it("só quando a rodada vai de 0 para 1", () => {
    expect(combatJustStarted(1, 0)).toBe(true);
    expect(combatJustStarted(1, undefined)).toBe(true);
    expect(combatJustStarted(1, 2)).toBe(false);
    expect(combatJustStarted(2, 1)).toBe(false);
    expect(combatJustStarted(undefined, 0)).toBe(false);
  });
});

describe("pedido de lesão crítica ao mestre (E12)", () => {
  const base = { attackerUuid: "Actor.a", targetUuid: "Actor.b" };
  it("aceita só tabela do corpo ou da cabeça", () => {
    expect(parseGmRequest({ ...base, op: "criticalInjury", table: "head" })).toEqual({
      ...base,
      op: "criticalInjury",
      table: "head",
    });
    expect(parseGmRequest({ ...base, op: "criticalInjury", table: "leg" })).toBeNull();
    expect(parseGmRequest({ ...base, op: "criticalInjury" })).toBeNull();
  });
});
