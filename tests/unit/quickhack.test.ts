import { describe, expect, it } from "vitest";
import {
  awareAfterQuickhack,
  breachBlocker,
  breachDv,
  checkPassed,
  expiryFor,
  firewallDv,
  forceOutSucceeds,
  hasExpired,
  inJackInRange,
  intrusionBy,
  isLocked,
  jackInBlocker,
  lockFor,
  LOCK_SECONDS,
  netActions,
  netAudience,
  parseExpiry,
  parseNetState,
  quickhackBlocker,
  targetStaysUnaware,
  tierAllowed,
  turnKey,
  withIntrusion,
  withoutIntrusion,
  type NetIntrusion,
  type QuickhackCheck,
} from "../../src/domain/quickhack";

const intrusion = (extra: Partial<NetIntrusion> = {}): NetIntrusion => ({
  runnerUuid: "Scene.s.Token.runner",
  runnerActorUuid: "Actor.runner",
  runnerName: "Runner",
  aware: false,
  breached: 0,
  lastHack: null,
  ...extra,
});

const jackIn = {
  rank: 4,
  hasNeuroport: true,
  inRange: true,
  visible: true,
  locked: false,
  linked: false,
};

describe("Jack In (CEMK p. 16 e 26)", () => {
  it("alcance de 50 m = 25 quadrados de 2 m", () => {
    expect(inJackInRange(50, 2)).toBe(true);
    expect(inJackInRange(50.5, 2)).toBe(false);
    expect(inJackInRange(Number.NaN, 2)).toBe(false);
  });

  it("exige Interface, Neuroport, alvo visível, alcance e ausência de bloqueio", () => {
    expect(jackInBlocker(jackIn)).toBeNull();
    expect(jackInBlocker({ ...jackIn, rank: 0 })).toBe("no-interface");
    expect(jackInBlocker({ ...jackIn, hasNeuroport: false })).toBe("no-neuroport");
    expect(jackInBlocker({ ...jackIn, visible: false })).toBe("not-visible");
    expect(jackInBlocker({ ...jackIn, inRange: false })).toBe("out-of-range");
    expect(jackInBlocker({ ...jackIn, locked: true })).toBe("locked");
    expect(jackInBlocker({ ...jackIn, linked: true })).toBe("linked");
  });

  it("firewall básico: DV6 para Interface 1 e 2; a partir de 3 passa direto", () => {
    expect(firewallDv(1)).toBe(6);
    expect(firewallDv(2)).toBe(6);
    expect(firewallDv(3)).toBeNull();
  });

  it("o alvo só fica sem saber se o Netrunner supera a VON (empate alerta)", () => {
    expect(targetStaysUnaware(14, 13)).toBe(true);
    expect(targetStaysUnaware(13, 13)).toBe(false);
  });
});

describe("Ações NET e níveis (livro base p. 197; CEMK p. 25)", () => {
  it("ações NET por rank de Interface", () => {
    expect([0, 1, 3, 4, 6, 7, 9, 10].map(netActions)).toEqual([0, 2, 2, 3, 3, 4, 4, 5]);
  });

  it("nível do Quickhack até o rank de Interface", () => {
    expect(tierAllowed(1, 1)).toBe(true);
    expect(tierAllowed(2, 1)).toBe(false);
    expect(tierAllowed(4, 4)).toBe(true);
    expect(tierAllowed(1, 0)).toBe(false);
  });
});

describe("Breach (CEMK p. 16)", () => {
  it("DV sobe 2 por Self-ICE: 6, 8, 10", () => {
    expect([0, 1, 2, 3].map(breachDv)).toEqual([null, 6, 8, 10]);
  });

  it("um Passwall por Self-ICE; sem ligação ou já vencido não há o que quebrar", () => {
    expect(breachBlocker(null, 1, true)).toBe("not-linked");
    expect(breachBlocker(intrusion(), 2, true)).toBeNull();
    expect(breachBlocker(intrusion({ breached: 2 }), 2, true)).toBe("nothing-to-breach");
    expect(breachBlocker(intrusion(), 0, true)).toBe("nothing-to-breach");
    expect(breachBlocker(intrusion(), 1, false)).toBe("out-of-range");
  });
});

describe("Quickhack (CEMK p. 16–17)", () => {
  const check: QuickhackCheck = {
    rank: 2,
    tier: 2,
    intrusion: intrusion({ breached: 1 }),
    passwalls: 1,
    inRange: true,
    turn: "c:3",
    requiresUnaware: false,
  };

  it("passa quando ligado, sem Passwall pendente e com nível liberado", () => {
    expect(quickhackBlocker(check)).toBeNull();
  });

  it("bloqueios na ordem: ligação, alcance, Breach, nível, turno, alerta", () => {
    expect(quickhackBlocker({ ...check, intrusion: null })).toBe("not-linked");
    expect(quickhackBlocker({ ...check, inRange: false })).toBe("out-of-range");
    expect(quickhackBlocker({ ...check, passwalls: 2 })).toBe("breach-needed");
    expect(quickhackBlocker({ ...check, tier: 3 })).toBe("tier-locked");
    expect(
      quickhackBlocker({ ...check, intrusion: intrusion({ breached: 1, lastHack: "c:3" }) }),
    ).toBe("once-per-turn");
    expect(
      quickhackBlocker({
        ...check,
        requiresUnaware: true,
        intrusion: intrusion({ breached: 1, aware: true }),
      }),
    ).toBe("target-aware");
  });

  it("um por alvo por turno vale só em combate iniciado", () => {
    expect(turnKey({ id: "c", round: 3 })).toBe("c:3");
    expect(turnKey({ id: "c", round: 0 })).toBeNull();
    expect(turnKey(null)).toBeNull();
    const outside = intrusion({ breached: 1, lastHack: null });
    expect(quickhackBlocker({ ...check, turn: null, intrusion: outside })).toBeNull();
  });

  it("sucesso exige superar a DV", () => {
    expect(checkPassed(9, 8)).toBe(true);
    expect(checkPassed(8, 8)).toBe(false);
  });

  it("sucesso alerta o alvo, salvo definição que não alerta; falha não alerta", () => {
    expect(awareAfterQuickhack(false, true, true)).toBe(true);
    expect(awareAfterQuickhack(false, false, true)).toBe(false);
    expect(awareAfterQuickhack(false, true, false)).toBe(false);
    expect(awareAfterQuickhack(true, false, false)).toBe(true);
  });
});

describe("Force Out e bloqueio de 60 minutos (CEMK p. 16 e 26)", () => {
  it("o alvo precisa superar a Interface do Netrunner", () => {
    expect(forceOutSucceeds(15, 14)).toBe(true);
    expect(forceOutSucceeds(14, 14)).toBe(false);
  });

  it("expulso fica bloqueado por 3600 s de tempo de jogo", () => {
    const linked = withIntrusion(parseNetState({}), intrusion());
    const out = withoutIntrusion(linked, "Scene.s.Token.runner", lockFor("Actor.runner", 100), 100);
    expect(intrusionBy(out, "Scene.s.Token.runner")).toBeNull();
    expect(isLocked(out, "Actor.runner", 100)).toBe(true);
    expect(isLocked(out, "Actor.runner", 100 + LOCK_SECONDS - 1)).toBe(true);
    expect(isLocked(out, "Actor.runner", 100 + LOCK_SECONDS)).toBe(false);
    expect(isLocked(out, "Actor.outro", 100)).toBe(false);
  });

  it("Jack Out voluntário não bloqueia e limpa bloqueios vencidos", () => {
    const state = parseNetState({
      intrusions: [intrusion()],
      locks: [{ runnerActorUuid: "Actor.velho", until: 50 }],
    });
    const out = withoutIntrusion(state, "Scene.s.Token.runner", null, 100);
    expect(out).toEqual({ intrusions: [], locks: [] });
  });
});

describe("estado salvo e mensagens", () => {
  it("descarta entradas inválidas da flag", () => {
    const state = parseNetState({
      intrusions: [intrusion({ breached: 99 }), { runnerUuid: "x" }, "lixo"],
      locks: [{ runnerActorUuid: "Actor.a", until: "amanhã" }],
    });
    expect(state.intrusions).toHaveLength(1);
    expect(state.intrusions[0]?.breached).toBe(0);
    expect(state.locks).toEqual([]);
    expect(parseNetState(null)).toEqual({ intrusions: [], locks: [] });
  });

  it("substitui a ligação do mesmo Netrunner", () => {
    const state = withIntrusion(
      withIntrusion(parseNetState({}), intrusion()),
      intrusion({ aware: true }),
    );
    expect(state.intrusions).toEqual([intrusion({ aware: true })]);
  });

  it("alvo sem saber: card só para o Netrunner e o mestre", () => {
    expect(netAudience(false, false, true)).toBe("runner");
    expect(netAudience(true, false, true)).toBe("public");
    expect(netAudience(true, true, true)).toBe("gm");
  });

  it("duração em rodadas conta a partir da rodada atual do combate", () => {
    const expiry = expiryFor({ id: "c", round: 2 }, 20);
    expect(expiry).toEqual({ combatId: "c", round: 22 });
    expect(expiryFor(null, 20)).toBeNull();
    expect(expiryFor({ id: "c", round: 2 }, null)).toBeNull();
    if (!expiry) return;
    expect(hasExpired(expiry, { id: "c", round: 21 })).toBe(false);
    expect(hasExpired(expiry, { id: "c", round: 22 })).toBe(true);
    expect(hasExpired(expiry, { id: "outro", round: 99 })).toBe(false);
    expect(parseExpiry({ combatId: "c", round: 22 })).toEqual(expiry);
    expect(parseExpiry({ combatId: "c" })).toBeNull();
  });
});
