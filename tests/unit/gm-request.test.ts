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
