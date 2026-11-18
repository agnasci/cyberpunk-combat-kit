import { describe, expect, it } from "vitest";
import {
  armorAblation,
  combatantSnapshot,
  findEvasion,
  hitPoints,
  pickWeapon,
  weaponSnapshot,
} from "../../src/integrations/cpr/weapon-adapter";
import { actor, emptyPistol, evasion, heavyPistol, knife, vest } from "../fixtures/cpr-actors";

describe("snapshot de arma (campos do CPR v0.92.4, docs/COMPATIBILITY.md)", () => {
  it("lê arma à distância com pente e tabela de DV", () => {
    expect(weaponSnapshot(heavyPistol)).toEqual({
      id: "pistol0000000001",
      name: "Pistola sintética",
      kind: "ranged",
      equipped: true,
      magazine: 8,
      dvTable: "DV Pistol",
    });
  });

  it("arma branca não tem pente", () => {
    expect(weaponSnapshot(knife)).toMatchObject({ kind: "melee", magazine: null, equipped: true });
  });

  it("ignora item que não é arma", () => {
    expect(weaponSnapshot(evasion)).toBeNull();
  });
});

describe("escolha da arma", () => {
  const shooter = actor({ items: [emptyPistol, heavyPistol, knife, evasion] });

  it("sem id usa a primeira equipada", () => {
    expect(pickWeapon(shooter)?.id).toBe("pistol0000000001");
  });

  it("com id usa a pedida, mesmo desequipada, para o bloqueio avisar", () => {
    expect(pickWeapon(shooter, "pistol0000000002")).toMatchObject({ equipped: false, magazine: 0 });
    expect(pickWeapon(shooter, "inexistente")).toBeNull();
  });
});

describe("snapshot do combatente", () => {
  it("lê REF, PV, Evasão e se é PdM", () => {
    const npc = actor({ items: [evasion, vest], ref: 8, hp: 27, hasPlayerOwner: false });
    expect(combatantSnapshot(npc)).toMatchObject({ ref: 8, isNpc: true });
    expect(hitPoints(npc)).toBe(27);
    expect(findEvasion(npc)?.id).toBe("skill00000000001");
    expect(armorAblation(npc, "body")).toBe(2);
    expect(armorAblation(npc, "head")).toBe(0);
  });
});
