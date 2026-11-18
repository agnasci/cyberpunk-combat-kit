import { describe, expect, it } from "vitest";
import {
  attackBlocker,
  canDodge,
  damageApplicationFrom,
  isCriticalInjury,
  remainingArmorAfterIgnore,
  resolveAttack,
  type NativeDamageRoll,
} from "../../src/domain/attack-rules";

describe("quem pode esquivar (RULES §3, p. 173; §5, p. 177)", () => {
  it("à distância só com REF 8 ou mais", () => {
    expect(canDodge("ranged", 7)).toBe(false);
    expect(canDodge("ranged", 8)).toBe(true);
  });

  it("no corpo a corpo qualquer um defende", () => {
    expect(canDodge("melee", 2)).toBe(true);
  });
});

describe("resolução (RULES §2, p. 169–173: empate favorece o defensor)", () => {
  it("acerta só superando a DV", () => {
    expect(resolveAttack(16, { kind: "dv", value: 15 }).hit).toBe(true);
    expect(resolveAttack(15, { kind: "dv", value: 15 }).hit).toBe(false);
  });

  it("compara com o total da esquiva ou da defesa corpo a corpo", () => {
    expect(resolveAttack(14, { kind: "dodge", total: 14 })).toEqual({
      hit: false,
      attackTotal: 14,
      defenseValue: 14,
    });
    expect(resolveAttack(14, { kind: "evasion", total: 9 }).hit).toBe(true);
  });
});

describe("lesão crítica (RULES §7, p. 188: dois ou mais 6 no dano)", () => {
  it("exige pelo menos dois 6", () => {
    expect(isCriticalInjury([6, 5, 1])).toBe(false);
    expect(isCriticalInjury([6, 6])).toBe(true);
    expect(isCriticalInjury([6, 2, 6, 6])).toBe(true);
  });
});

describe("metade da armadura no corpo a corpo (RULES §5, p. 177 e 179: arredonda para cima)", () => {
  it("bate com o cálculo do _applyDamage", () => {
    expect(remainingArmorAfterIgnore(7, 50)).toBe(4);
    expect(remainingArmorAfterIgnore(11, 50)).toBe(6);
    expect(remainingArmorAfterIgnore(12, 50)).toBe(6);
    expect(remainingArmorAfterIgnore(7, 0)).toBe(7);
  });
});

describe("bloqueios antes de rolar", () => {
  const base = {
    hasWeapon: true,
    equipped: true,
    kind: "ranged",
    magazine: 8,
    inRange: true,
  } as const;

  it("aceita arma equipada com munição e alvo ao alcance", () => {
    expect(attackBlocker(base)).toBeNull();
  });

  it("recusa sem arma, desequipada, sem munição ou fora de alcance", () => {
    expect(attackBlocker({ ...base, hasWeapon: false })).toBe("no-weapon");
    expect(attackBlocker({ ...base, equipped: false })).toBe("not-equipped");
    expect(attackBlocker({ ...base, magazine: 0 })).toBe("no-ammo");
    expect(attackBlocker({ ...base, inRange: false })).toBe("out-of-range");
  });

  it("arma corpo a corpo não usa munição", () => {
    expect(attackBlocker({ ...base, kind: "melee", magazine: 0 })).toBeNull();
  });
});

describe("parâmetros do _applyDamage iguais ao card nativo", () => {
  const roll: NativeDamageRoll = {
    total: 19,
    bonusDamage: 5,
    critical: false,
    aimed: false,
    location: "body",
    ammoType: "basic",
    ammoVariety: "heavyPistol",
    ablation: 1,
    ignoreArmorPercent: 0,
    ignoreBelowSP: 0,
  };

  it("sem crítico não manda dano bônus", () => {
    expect(damageApplicationFrom(roll)).toEqual({
      damage: 19,
      bonusDamage: 0,
      location: "body",
      ablation: 1,
      ammoVariety: "heavyPistol",
      ignoreArmorPercent: 0,
      ignoreBelowSP: 0,
      lethal: true,
    });
  });

  it("com crítico manda o bônus; munição de borracha não é letal", () => {
    const applied = damageApplicationFrom({ ...roll, critical: true, ammoType: "rubber" });
    expect(applied.bonusDamage).toBe(5);
    expect(applied.lethal).toBe(false);
  });

  it("local só vira cabeça em tiro mirado", () => {
    expect(damageApplicationFrom({ ...roll, location: "head" }).location).toBe("body");
    expect(damageApplicationFrom({ ...roll, aimed: true, location: "head" }).location).toBe("head");
  });
});
