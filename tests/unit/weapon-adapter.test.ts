import { describe, expect, it } from "vitest";
import {
  armorAblation,
  combatantSnapshot,
  findEvasion,
  hitPoints,
  pickWeapon,
  weaponSnapshot,
} from "../../src/integrations/cpr/weapon-adapter";
import {
  actor,
  emptyPistol,
  evasion,
  heavyPistol,
  item,
  knife,
  vest,
} from "../fixtures/cpr-actors";

describe("snapshot de arma (campos do CPR v0.92.4, docs/COMPATIBILITY.md)", () => {
  it("lê arma à distância com pente e tabela de DV", () => {
    expect(weaponSnapshot(heavyPistol)).toEqual({
      id: "pistol0000000001",
      name: "Pistola sintética",
      img: null,
      kind: "ranged",
      weaponType: "",
      equipped: true,
      magazine: 8,
      magazineMax: 8,
      rof: 1,
      dvTable: "DV Pistol",
      ammoVariety: null,
      autofireMax: 0,
      suppressive: false,
    });
  });

  it("lê tipo, modos de fogo e a munição carregada", () => {
    const rifle = item({
      id: "rifle00000000001",
      name: "Fuzil sintético",
      type: "weapon",
      system: {
        isRanged: true,
        equipped: "equipped",
        weaponType: "assaultRifle",
        dvTable: "DV Assault Rifle",
        magazine: { value: 25, max: 25 },
        fireModes: { autoFire: 0, suppressiveFire: true },
      },
    });
    const loaded = Object.assign(rifle, { _getLoadedAmmoProp: () => "rifle" });
    expect(weaponSnapshot(loaded)).toMatchObject({
      weaponType: "assaultRifle",
      autofireMax: 4,
      suppressive: true,
      ammoVariety: "rifle",
    });
  });

  it("arma branca não tem pente", () => {
    expect(weaponSnapshot(knife)).toMatchObject({ kind: "melee", magazine: null, equipped: true });
  });

  it("arma de arremesso à distância sem pente não usa munição (E9-02)", () => {
    const molotov = item({
      id: "molotov000000001",
      name: "Garrafa incendiária",
      type: "weapon",
      system: {
        isRanged: true,
        equipped: "equipped",
        weaponType: "thrownWeapon",
        dvTable: "DV Thrown Weapon",
        magazine: { value: 0, max: 0 },
      },
    });
    expect(weaponSnapshot(molotov)).toMatchObject({
      kind: "ranged",
      magazine: null,
      magazineMax: null,
    });
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

  it("sem id prefere uma equipada com munição à primeira vazia (E9-02)", () => {
    const empty = item({
      id: "pistol0000000003",
      name: "Pistola vazia equipada",
      type: "weapon",
      system: {
        isRanged: true,
        equipped: "equipped",
        dvTable: "DV Pistol",
        magazine: { value: 0, max: 8 },
      },
    });
    expect(pickWeapon(actor({ items: [empty, heavyPistol] }))?.id).toBe("pistol0000000001");
    expect(pickWeapon(actor({ items: [empty] }))?.id).toBe("pistol0000000003");
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
