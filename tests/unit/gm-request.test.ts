import { describe, expect, it } from "vitest";
import {
  chooseExecutor,
  chooseResponder,
  isUndoable,
  parseGmRequest,
} from "../../src/domain/gm-request";
import { resolutionAudience } from "../../src/domain/routing";

const damage = {
  damage: 19,
  bonusDamage: 0,
  location: "body",
  ablation: 1,
  ammoVariety: "heavyPistol",
  ignoreArmorPercent: 0,
  ignoreBelowSP: 0,
  lethal: true,
};

describe("pedido ao executor do mestre (D04)", () => {
  it("aceita aplicar dano com valores válidos", () => {
    expect(
      parseGmRequest({ op: "applyDamage", attackerUuid: "Actor.a", targetUuid: "Actor.b", damage }),
    ).toEqual({ op: "applyDamage", attackerUuid: "Actor.a", targetUuid: "Actor.b", damage });
  });

  it("recusa números fora do limite, negativos, fracionários ou de outro tipo", () => {
    const base = { op: "applyDamage", attackerUuid: "Actor.a", targetUuid: "Actor.b" };
    expect(parseGmRequest({ ...base, damage: { ...damage, damage: -1 } })).toBeNull();
    expect(parseGmRequest({ ...base, damage: { ...damage, damage: 2.5 } })).toBeNull();
    expect(parseGmRequest({ ...base, damage: { ...damage, damage: 9999 } })).toBeNull();
    expect(parseGmRequest({ ...base, damage: { ...damage, location: "brain" } })).toBeNull();
    expect(parseGmRequest({ ...base, damage: { ...damage, lethal: "sim" } })).toBeNull();
    expect(parseGmRequest({ ...base, damage: null })).toBeNull();
  });

  it("recusa operação desconhecida ou sem uuids", () => {
    expect(parseGmRequest({ op: "deleteActor", attackerUuid: "a", targetUuid: "b" })).toBeNull();
    expect(parseGmRequest({ op: "applyDamage", targetUuid: "b", damage })).toBeNull();
    expect(parseGmRequest("applyDamage")).toBeNull();
  });

  it("aceita desfazer com redução e ablação", () => {
    expect(
      parseGmRequest({
        op: "reverseDamage",
        attackerUuid: "Actor.a",
        targetUuid: "Actor.b",
        hpReduction: 13,
        location: "body",
        ablation: 1,
      }),
    ).toEqual({
      op: "reverseDamage",
      attackerUuid: "Actor.a",
      targetUuid: "Actor.b",
      hpReduction: 13,
      location: "body",
      ablation: 1,
    });
  });
});

describe("escolha do executor e de quem responde à defesa", () => {
  const users = [
    { id: "gmB", isGM: true, active: true },
    { id: "gmA", isGM: true, active: true },
    { id: "gmZ", isGM: true, active: false },
    { id: "p1", isGM: false, active: true },
  ];

  it("um único mestre ativo: o de menor id", () => {
    expect(chooseExecutor(users)).toBe("gmA");
    expect(chooseExecutor(users.filter((user) => !user.isGM))).toBeNull();
  });

  it("defesa vai ao jogador dono ativo, de preferência o do personagem", () => {
    const owners = [
      { id: "gmA", isGM: true, active: true, owner: true, characterMatches: false },
      { id: "p1", isGM: false, active: true, owner: true, characterMatches: false },
      { id: "p2", isGM: false, active: true, owner: true, characterMatches: true },
    ];
    expect(chooseResponder(owners)).toBe("p2");
    expect(chooseResponder(owners.filter((user) => user.id !== "p2"))).toBe("p1");
  });

  it("sem jogador dono ativo, responde o mestre executor", () => {
    expect(
      chooseResponder([
        { id: "gmA", isGM: true, active: true, owner: true, characterMatches: false },
        { id: "p1", isGM: false, active: false, owner: true, characterMatches: true },
      ]),
    ).toBe("gmA");
  });
});

describe("desfazer dano", () => {
  const base = {
    hpBefore: 40,
    hpAfter: 40,
    hpReduction: 0,
    ablation: 0,
    location: "body",
  } as const;

  it("só oferece desfazer quando PV ou armadura mudaram", () => {
    expect(isUndoable(null)).toBe(false);
    expect(isUndoable(base)).toBe(false);
    expect(isUndoable({ ...base, hpReduction: 6 })).toBe(true);
    expect(isUndoable({ ...base, ablation: 1 })).toBe(true);
  });
});

describe("roteamento padrão do card de resolução (R13)", () => {
  it("só PdM contra PdM fica com o mestre", () => {
    expect(resolutionAudience(true, true)).toBe("gm");
    expect(resolutionAudience(true, false)).toBe("public");
    expect(resolutionAudience(false, true)).toBe("public");
    expect(resolutionAudience(false, false)).toBe("public");
  });
});

describe("pedidos do agarrão ao executor", () => {
  it("aceita estrangular e derrubar com BODY inteiro", () => {
    expect(
      parseGmRequest({ op: "choke", attackerUuid: "T.a", targetUuid: "T.b", body: 6, round: 2 }),
    ).toEqual({ op: "choke", attackerUuid: "T.a", targetUuid: "T.b", body: 6, round: 2 });
    expect(
      parseGmRequest({ op: "choke", attackerUuid: "T.a", targetUuid: "T.b", body: 6, round: null }),
    ).toMatchObject({ round: null });
    expect(
      parseGmRequest({ op: "throwDown", attackerUuid: "T.a", targetUuid: "T.b", body: 6 }),
    ).toEqual({ op: "throwDown", attackerUuid: "T.a", targetUuid: "T.b", body: 6 });
  });

  it("recusa BODY inválido ou rodada inválida", () => {
    expect(
      parseGmRequest({ op: "choke", attackerUuid: "a", targetUuid: "b", body: -1, round: 1 }),
    ).toBeNull();
    expect(
      parseGmRequest({ op: "choke", attackerUuid: "a", targetUuid: "b", body: 6, round: "x" }),
    ).toBeNull();
  });

  it("aceita começar e terminar agarrão", () => {
    expect(parseGmRequest({ op: "grappleStart", attackerUuid: "a", targetUuid: "b" })).toEqual({
      op: "grappleStart",
      attackerUuid: "a",
      targetUuid: "b",
    });
    expect(parseGmRequest({ op: "grappleEnd", attackerUuid: "a", targetUuid: "b" })).not.toBeNull();
  });

  it("pedidos de rede: Jack In, Breach, Quickhack, Jack Out e Force Out", () => {
    const base = { attackerUuid: "a", targetUuid: "b" };
    expect(parseGmRequest({ ...base, op: "netJackIn", aware: false })).toEqual({
      ...base,
      op: "netJackIn",
      aware: false,
    });
    expect(parseGmRequest({ ...base, op: "netJackIn" })).toBeNull();
    for (const op of ["netBreach", "netJackOut", "netForceOut"]) {
      expect(parseGmRequest({ ...base, op })).toEqual({ ...base, op });
    }
    expect(
      parseGmRequest({ ...base, op: "netHack", quickhackId: "exemplo", success: true }),
    ).toEqual({ ...base, op: "netHack", quickhackId: "exemplo", success: true });
    expect(
      parseGmRequest({ ...base, op: "netHack", quickhackId: "../x", success: true }),
    ).toBeNull();
    expect(parseGmRequest({ ...base, op: "netHack", quickhackId: "q", success: "sim" })).toBeNull();
  });
});
