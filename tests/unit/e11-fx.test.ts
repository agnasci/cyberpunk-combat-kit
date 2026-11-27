import { describe, expect, it } from "vitest";
import {
  attackQualifiers,
  cueKeys,
  parseCueSteps,
  persistentCues,
  pickVariant,
  qualifierSlug,
  statusQualifiers,
  withoutSources,
  type CueMap,
} from "../../src/domain/cues";
import { missingModules, parseManifest, withActiveModules } from "../../src/domain/pack";

const FOLDER = "cck-packs/demo";

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "demo",
    version: "1.0.0",
    title: "Demo",
    requires: ["anim-lib"],
    assets: { bang: "sounds/bang.flac" },
    external: {
      bolt: [
        "modules/anim-lib/Bolt_A_05ft_600x400.webm",
        "modules/anim-lib/Bolt_A_30ft_1600x400.webm",
      ],
    },
    cues: {
      "attack.fire:ammo-rifle-basic": [
        {
          type: "sprite",
          asset: "bolt",
          at: "path",
          template: [200, 200, 200],
          fallback: "tracer",
        },
        { type: "sound", asset: "bang", startTime: 1000, delay: 50, repeat: 3, repeatDelay: 100 },
      ],
    },
    ...overrides,
  };
}

describe("E11-01 assets externos", () => {
  it("aceita arquivos de módulos listados em requires", () => {
    const result = parseManifest(manifest(), FOLDER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.requires).toEqual(["anim-lib"]);
    const [sprite, sound] = result.pack.cues["attack.fire:ammo-rifle-basic"] ?? [];
    expect(sprite).toMatchObject({ type: "sprite", template: [200, 200, 200], fallback: "tracer" });
    expect(sprite?.type === "sprite" && sprite.src).toHaveLength(2);
    expect(sound).toMatchObject({
      src: ["cck-packs/demo/sounds/bang.flac"],
      startTime: 1000,
      delay: 50,
      repeat: 3,
      repeatDelay: 100,
    });
  });

  it.each([
    [{ external: { bolt: "modules/outro/a.webm" } }, "bad-asset-path"],
    [{ external: { bolt: "modules/anim-lib/../x.webm" } }, "bad-asset-path"],
    [{ external: { bolt: "https://x.y/a.webm" } }, "bad-asset-path"],
    [{ external: { bolt: "worlds/anim-lib/a.webm" } }, "bad-asset-path"],
    [{ external: { bang: "modules/anim-lib/a.webm" } }, "duplicate"],
    [{ requires: "anim-lib" }, "bad-requires"],
    [{ requires: ["bad id!"] }, "bad-requires"],
  ])("recusa %j", (overrides, code) => {
    const result = parseManifest(manifest(overrides), FOLDER);
    expect(result.ok ? [] : result.errors.map((error) => error.code)).toContain(code);
  });

  it("módulo inativo: some o arquivo dele e fica a reserva procedural", () => {
    const result = parseManifest(manifest(), FOLDER);
    if (!result.ok) throw new Error("manifest");
    expect(missingModules(result.pack, new Set(["anim-lib"]))).toEqual([]);
    expect(missingModules(result.pack, new Set())).toEqual(["anim-lib"]);
    const steps = withActiveModules(result.pack, new Set()).cues["attack.fire:ammo-rifle-basic"];
    expect(steps?.map((step) => step.type)).toEqual(["procedural", "sound"]);
    expect(steps?.[0]).toMatchObject({ effect: "tracer", at: "target" });
  });

  it("sem reserva o passo sai", () => {
    const steps = parseCueSteps([{ type: "sprite", src: "modules/a/x.webm", at: "target" }]) ?? [];
    expect(withoutSources(steps, () => true)).toEqual([]);
  });
});

describe("E11-02 variantes e opções do sprite", () => {
  const sources = [
    "modules/a/Bullet_01_90ft_4000x400.webm",
    "modules/a/Bullet_01_05ft_600x400.webm",
    "modules/a/Bullet_01_30ft_1600x400.webm",
    "modules/a/Bullet_01_15ft_1000x400.webm",
  ];

  it("escolhe a menor variante que cobre a distância", () => {
    expect(pickVariant(sources, 3)).toContain("05ft");
    expect(pickVariant(sources, 6.6)).toContain("15ft");
    expect(pickVariant(sources, 30)).toContain("30ft");
    expect(pickVariant(sources, 65)).toContain("90ft");
    expect(pickVariant(sources, 400)).toContain("90ft");
    expect(pickVariant(["modules/a/x.webm"], 50)).toBe("modules/a/x.webm");
    expect(pickVariant([], 5)).toBeNull();
  });

  it("valida template, reserva e limites", () => {
    expect(
      parseCueSteps([{ type: "sprite", src: "a.webm", at: "path", template: [0, 1, 1] }]),
    ).toBeNull();
    expect(
      parseCueSteps([{ type: "sprite", src: "a.webm", at: "path", template: [1, 2] }]),
    ).toBeNull();
    expect(
      parseCueSteps([{ type: "sprite", src: "a.webm", at: "path", fallback: "boom" }]),
    ).toBeNull();
    expect(
      parseCueSteps([{ type: "sprite", src: Array(9).fill("a.webm"), at: "path" }]),
    ).toBeNull();
    const [step] =
      parseCueSteps([
        { type: "sprite", src: "a.webm", at: "target", opacity: 3, playbackRate: 9, repeat: 99 },
      ]) ?? [];
    expect(step).toMatchObject({ opacity: 1, playbackRate: 4, repeat: 20 });
  });
});

describe("E11-03 som", () => {
  it("aceita FLAC e lista de variações", () => {
    const [step] =
      parseCueSteps([{ type: "sound", src: ["a/1.flac", "a/2.mp3"], startTime: 99999 }]) ?? [];
    expect(step).toMatchObject({ src: ["a/1.flac", "a/2.mp3"], startTime: 10000 });
  });
});

describe("E11-04 qualificadores de munição e item", () => {
  it("vêm antes do tipo de arma", () => {
    expect(
      attackQualifiers({
        weaponType: "heavyPistol",
        mode: "single",
        area: "none",
        melee: false,
        itemName: "Pistola Ação",
        ammoVariety: "heavyPistol",
        ammoType: "armorPiercing",
      }),
    ).toEqual([
      "item-pistola-acao",
      "ammo-heavyPistol-armorPiercing",
      "ammo-heavyPistol",
      "heavyPistol",
      "single",
      "ranged",
    ]);
  });

  it("chaves: identidades com cada forma, depois sozinhas, depois as formas", () => {
    expect(
      cueKeys("attack.fire", ["item-x", "ammo-rifle-basic", "assaultRifle", "autofire"]),
    ).toEqual([
      "attack.fire:item-x+autofire",
      "attack.fire:item-x",
      "attack.fire:ammo-rifle-basic+autofire",
      "attack.fire:ammo-rifle-basic",
      "attack.fire:assaultRifle+autofire",
      "attack.fire:assaultRifle",
      "attack.fire:autofire",
      "attack.fire",
    ]);
  });

  it("sem item nem munição fica como antes (D38)", () => {
    expect(cueKeys("attack.fire", ["smg", "autofire", "ranged"])).toEqual([
      "attack.fire:smg+autofire",
      "attack.fire:smg+ranged",
      "attack.fire:smg",
      "attack.fire:autofire",
      "attack.fire:ranged",
      "attack.fire",
    ]);
  });

  it("slug", () => {
    expect(qualifierSlug("  Slice N' Dice!  ")).toBe("slice-n-dice");
    expect(qualifierSlug("On Fire (Mild)")).toBe("on-fire-mild");
    expect(qualifierSlug("x".repeat(80))).toHaveLength(40);
  });
});

describe("E11-05 efeitos persistentes", () => {
  const loop = parseCueSteps([
    { type: "sprite", src: "modules/a/loop.webm", at: "target", persist: true },
    { type: "sound", src: "a/x.ogg" },
  ]);
  const layers: CueMap[] = [{ "status.active:prone": loop ?? [], "status.active": loop ?? [] }];

  it("estados e nomes de efeito viram qualificadores", () => {
    expect(statusQualifiers(new Set(["prone", "dead"]), ["On Fire (Mild)", "prone"])).toEqual([
      "prone",
      "dead",
      "on-fire-mild",
    ]);
  });

  it("só a chave exata e só passos persistentes", () => {
    expect(persistentCues(["prone"], layers).map((cue) => cue.id)).toEqual(["prone#0"]);
    expect(persistentCues(["dead"], layers)).toEqual([]);
  });

  it("no máximo 4 por token", () => {
    const many: CueMap[] = [
      Object.fromEntries(
        ["a", "b", "c", "d", "e"].map((id) => [`status.active:${id}`, loop ?? []]),
      ),
    ];
    expect(persistentCues(["a", "b", "c", "d", "e"], many)).toHaveLength(4);
  });
});
