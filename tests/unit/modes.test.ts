import { describe, expect, it } from "vitest";
import {
  aimedApplyLocation,
  aimedEffect,
  areaFor,
  attackProfile,
  autofireMax,
  autofireMultiplier,
  autofireTableName,
  modeBlocker,
  preferredWeapon,
  suppressionFails,
  withinRange,
  type ModeWeapon,
} from "../../src/domain/modes";

const rifle: ModeWeapon = {
  kind: "ranged",
  weaponType: "assaultRifle",
  ammoVariety: "rifle",
  autofireMax: 4,
  suppressive: true,
  magazine: 25,
};
const pistol: ModeWeapon = {
  ...rifle,
  weaponType: "heavyPistol",
  autofireMax: 0,
  suppressive: false,
  magazine: 8,
};
const shotgunShells: ModeWeapon = { ...pistol, weaponType: "shotgun", ammoVariety: "shotgunShell" };
const launcher: ModeWeapon = {
  ...pistol,
  weaponType: "grenadeLauncher",
  ammoVariety: "grenade",
  magazine: 2,
};
const knife: ModeWeapon = {
  ...pistol,
  kind: "melee",
  weaponType: "lightMelee",
  ammoVariety: null,
  magazine: null,
};
const fists: ModeWeapon = { ...knife, weaponType: "unarmed" };

describe("arma de arremesso do sistema (E9-02)", () => {
  const star: ModeWeapon = { ...knife, weaponType: "thrownWeapon" };

  it("arma branca do tipo arremesso só pode ser arremessada", () => {
    expect(modeBlocker(star, attackProfile(star, "single"))).toBe("thrown-only");
    expect(modeBlocker(star, attackProfile(star, "aimed"))).toBe("thrown-only");
    expect(modeBlocker(star, attackProfile(star, "thrown"))).toBeNull();
  });

  it("arremesso à distância sem pente não esbarra em munição", () => {
    const molotov: ModeWeapon = { ...pistol, weaponType: "thrownWeapon", magazine: null };
    expect(modeBlocker(molotov, attackProfile(molotov, "single"))).toBeNull();
  });

  it("prefere a equipada pronta para uso", () => {
    const empty = { ...pistol, magazine: 0, equipped: true, id: "a" };
    const ready = { ...pistol, equipped: true, id: "b" };
    const stored = { ...pistol, equipped: false, id: "c" };
    expect(preferredWeapon([stored, empty, ready])?.id).toBe("b");
    expect(preferredWeapon([stored, empty])?.id).toBe("a");
    expect(preferredWeapon([stored])).toBeNull();
  });
});

describe("tiro mirado (RULES §4; livro base p. 171)", () => {
  it("usa a rolagem mirada nativa e o dano mirado", () => {
    expect(attackProfile(pistol, "aimed")).toMatchObject({
      nativeType: "aimed",
      damageType: "aimed",
    });
  });

  it("não vale com cartucho de espingarda nem explosivo", () => {
    expect(modeBlocker(shotgunShells, attackProfile(shotgunShells, "aimed"))).toBe("mode-aimed");
    expect(modeBlocker(launcher, attackProfile(launcher, "aimed"))).toBe("mode-aimed");
    expect(modeBlocker(knife, attackProfile(knife, "aimed"))).toBeNull();
  });

  it("cabeça dobra pelo sistema; perna e item seguram dano no corpo", () => {
    expect(aimedApplyLocation("head")).toBe("head");
    expect(aimedApplyLocation("leg")).toBe("body");
    expect(aimedApplyLocation("heldItem")).toBe("body");
  });

  it("efeito extra só se ao menos 1 ponto passar da armadura", () => {
    expect(aimedEffect("leg", 0)).toBeNull();
    expect(aimedEffect("leg", 1)).toBe("broken-leg");
    expect(aimedEffect("heldItem", 3)).toBe("drop-item");
    expect(aimedEffect("head", 2)).toBe("double-head");
  });
});

describe("fogo automático (RULES §4; p. 173)", () => {
  it("gasta 10 balas, usa a tabela própria e exige arma capaz", () => {
    const profile = attackProfile(rifle, "autofire");
    expect(profile).toMatchObject({
      bullets: 10,
      dvSource: "autofire-table",
      nativeType: "autofire",
    });
    expect(modeBlocker(rifle, profile)).toBeNull();
    expect(modeBlocker({ ...rifle, magazine: 9 }, profile)).toBe("no-ammo-mode");
    expect(modeBlocker(pistol, attackProfile(pistol, "autofire"))).toBe("mode-autofire");
  });

  it("nome da tabela do sistema", () => {
    expect(autofireTableName("DV SMG")).toBe("DV SMG (Autofire)");
    expect(autofireTableName("DV Assault Rifle (Autofire)")).toBe("DV Assault Rifle (Autofire)");
  });

  it("máximo pela arma, com padrão do sistema quando a ficha traz 0", () => {
    expect(autofireMax("smg", 0)).toBe(3);
    expect(autofireMax("assaultRifle", 0)).toBe(4);
    expect(autofireMax("assaultRifle", 5)).toBe(5);
    expect(autofireMax("heavyPistol", 0)).toBe(0);
  });

  it("multiplicador = quanto superou a defesa, limitado pela arma (exemplo da p. 173: 21 contra 17 = ×4)", () => {
    expect(autofireMultiplier(21, 17, 4)).toBe(4);
    expect(autofireMultiplier(21, 17, 3)).toBe(3);
    expect(autofireMultiplier(18, 17, 4)).toBe(1);
  });
});

describe("áreas (RULES §4; p. 174)", () => {
  it("cartucho de espingarda: DV fixa 13", () => {
    expect(areaFor(shotgunShells)).toBe("shell");
    expect(attackProfile(shotgunShells, "single")).toMatchObject({
      area: "shell",
      dvSource: "fixed",
      fixedDv: 13,
    });
  });

  it("granada e foguete explodem", () => {
    expect(areaFor(launcher)).toBe("explosion");
    expect(areaFor({ ...launcher, ammoVariety: "rocket" })).toBe("explosion");
    expect(areaFor(pistol)).toBe("none");
  });

  it("alcance de 6 m para o cartucho e de 25 m para o supressivo", () => {
    expect(withinRange(6, 6)).toBe(true);
    expect(withinRange(8, 6)).toBe(false);
    expect(withinRange(Number.NaN, 25)).toBe(false);
  });
});

describe("fogo supressivo (RULES §4; p. 174)", () => {
  it("exige arma com supressivo e 10 balas, sem dano", () => {
    const profile = attackProfile(rifle, "suppressive");
    expect(profile).toMatchObject({ damageType: null, bullets: 10 });
    expect(modeBlocker(pistol, attackProfile(pistol, "suppressive"))).toBe("mode-suppressive");
  });

  it("falha quem não supera o ataque (empate favorece quem resiste)", () => {
    expect(suppressionFails(18, 17)).toBe(true);
    expect(suppressionFails(18, 18)).toBe(false);
  });
});

describe("arremesso (RULES §5; p. 178)", () => {
  it("arma branca arremessada usa Atletismo, tabela de arremesso e não ignora armadura", () => {
    const profile = attackProfile(knife, "thrown");
    expect(profile).toMatchObject({
      nativeType: "athletics",
      dvSource: "thrown-table",
      ignoreArmor: false,
    });
    expect(modeBlocker(knife, profile)).toBeNull();
  });

  it("não vale para desarmado nem para arma de fogo", () => {
    expect(modeBlocker(fists, attackProfile(fists, "thrown"))).toBe("mode-thrown");
    expect(modeBlocker(pistol, attackProfile(pistol, "thrown"))).toBe("mode-thrown");
  });
});

describe("Artes Marciais exigem ao menos 1 ponto na perícia (RULES §5, p. 178)", () => {
  const martial: ModeWeapon = { ...fists, weaponType: "martialArts" };
  it("bloqueia sem a perícia e libera com ela", () => {
    expect(modeBlocker({ ...martial, skillLevel: 0 }, attackProfile(martial, "single"))).toBe(
      "no-martial-arts",
    );
    expect(modeBlocker({ ...martial, skillLevel: 2 }, attackProfile(martial, "single"))).toBeNull();
    expect(modeBlocker({ ...fists, skillLevel: 0 }, attackProfile(fists, "single"))).toBeNull();
  });
});
