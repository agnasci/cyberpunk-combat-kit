import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = resolve("scripts/import-aa.mjs");
let root = "";

function write(path: string, content: string): void {
  const full = join(root, path);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

const LIB = "modules/fx-lib/Library/Generic";

function fixtures(): void {
  write(
    "system/modules/system/config.js",
    `const CPR = {};
CPR.weaponTypes = { zapper: "T.weapon.zapper", bigClub: "T.weapon.bigClub" };
CPR.ammoVarieties = { zapCell: "T.variety.zapCell", boomBall: "T.variety.boomBall" };
CPR.ammoTypes = { plain: "T.type.plain", spicy: "T.type.spicy" };
CPR.other = () => 1;
export default CPR;
`,
  );
  write(
    "system/lang/en.json",
    JSON.stringify({
      "T.weapon.zapper": "Zapper",
      "T.weapon.bigClub": "Big Club Weapon",
      "T.variety.zapCell": "Zap Cells",
      "T.variety.boomBall": "Boom Balls",
      "T.type.plain": "Plain",
      "T.type.spicy": "Spicy",
    }),
  );
  write(
    "db.js",
    `const DEMODB = {};
export async function init(path) {
  const BASE = \`\${path}/Library/\`;
  const prefix = (str) => (strs, ...exprs) => \`\${BASE}\${str}/\${strs.reduce((a, c, i) => a + exprs[i - 1] + c)}\`
  const lg = prefix('Generic')
  DEMODB.range = {
    _template: 'ranged',
    weapon: {
      dart: {
        '01': {
          red: { '05ft': [lg\`Dart_01_Red_05ft_600x400.webm\`], '30ft': [lg\`Dart_01_Red_30ft_1600x400.webm\`] },
          blue: { '05ft': [lg\`Dart_01_Blue_05ft_600x400.webm\`] },
        },
      },
    },
  };
  DEMODB.melee = { weapon: { swing: { '01': { white: [lg\`Swing_01_White_800x600.webm\`] } } } };
  DEMODB.static = { generic: { boom: { '01': { orange: [lg\`Boom_01_Orange_400x400.webm\`] } } } };
}
export { DEMODB }
`,
  );
  for (const file of [
    "Dart_01_Red_05ft_600x400.webm",
    "Dart_01_Red_30ft_1600x400.webm",
    "Swing_01_White_800x600.webm",
    "Boom_01_Orange_400x400.webm",
    "Glow_01_Green_200x200.webm",
  ]) {
    write(`modules/fx-lib/Library/Generic/${file}`, "x");
  }
  write("sounds/Zap One.wav", "x");
  write("sounds/boom.flac", "x");
  const video = (
    dbSection: string,
    menuType: string,
    animation: string,
    variant: string,
    color: string,
  ) => ({
    dbSection,
    menuType,
    animation,
    variant,
    color,
    enableCustom: false,
    customPath: "",
  });
  write(
    "export.json",
    JSON.stringify({
      version: 5,
      melee: [
        {
          label: "Big Club",
          primary: {
            video: video("melee", "weapon", "swing", "01", "white"),
            sound: { enable: false },
          },
        },
        {
          label: "Shiny Stick",
          primary: {
            video: video("melee", "weapon", "nothing", "01", "white"),
            sound: { enable: false },
          },
        },
      ],
      range: [
        {
          label: "Zap Cell (Spicy)",
          primary: {
            video: video("range", "weapon", "dart", "01", "green"),
            sound: { enable: true, file: "assets/Sounds/Zap%20One.wav", volume: 0.75, delay: 0 },
            options: { repeat: 3, repeatDelay: 120 },
          },
        },
        {
          label: "Zap Cell (Plain) No Template",
          primary: { video: video("range", "weapon", "dart", "01", "red") },
        },
        {
          label: "Mystery (Odd)",
          primary: { video: video("range", "weapon", "dart", "01", "red") },
        },
      ],
      preset: [
        {
          label: "Boom Ball (Plain)",
          presetType: "proToTemp",
          data: {
            projectile: {
              ...video("range", "weapon", "dart", "01", "red"),
              sound: { enable: true, file: "x/boom.flac", startTime: 1000 },
            },
            preExplosion: { enable: false },
            explosion: {
              ...video("static", "generic", "boom", "01", "orange"),
              options: { scale: 1.2 },
              sound: { enable: false },
            },
          },
        },
      ],
      aefx: [
        {
          label: "Glowing Bright",
          activeEffectType: "ontoken",
          primary: {
            video: {
              enableCustom: true,
              customPath: "modules/other-lib/Library/Generic/Glow_01_Green_200x200.webm",
            },
            options: { size: 1.5, opacity: 0.6, persistent: true },
          },
        },
      ],
      templatefx: [{ label: "Ignored" }],
    }),
  );
}

function run(extra: string[] = []) {
  return spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--export",
      join(root, "export.json"),
      "--sounds",
      join(root, "sounds"),
      "--animations",
      join(root, "db.js"),
      "--modules",
      join(root, "modules"),
      "--system",
      join(root, "system"),
      "--module",
      "fx-lib",
      "--id",
      "demo-aa",
      "--out",
      join(root, "out"),
      ...extra,
    ],
    { encoding: "utf8" },
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cck-aa-"));
  fixtures();
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("conversor de exportação de animações (E11-06)", () => {
  it("gera pacote com chaves de munição, tipo de arma, item e estado", () => {
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    const pack = JSON.parse(readFileSync(join(root, "out/cck-pack.json"), "utf8"));
    expect(pack.requires).toEqual(["fx-lib"]);
    expect(Object.keys(pack.cues).sort()).toEqual([
      "area.detonate:ammo-boomBall-plain",
      "attack.fire:ammo-boomBall-plain",
      "attack.fire:ammo-zapCell-spicy",
      "attack.fire:bigClub",
      "attack.fire:item-mystery-odd",
      "attack.fire:item-shiny-stick",
      "status.active:glowing-bright",
    ]);
    const [sprite, sound] = pack.cues["attack.fire:ammo-zapCell-spicy"];
    expect(sprite).toMatchObject({
      type: "sprite",
      at: "path",
      template: [200, 200, 200],
      repeat: 3,
      repeatDelay: 120,
    });
    expect(pack.external[sprite.asset]).toEqual([
      `${LIB}/Dart_01_Red_05ft_600x400.webm`,
      `${LIB}/Dart_01_Red_30ft_1600x400.webm`,
    ]);
    expect(sound).toMatchObject({ type: "sound", volume: 0.75 });
    expect(pack.assets[sound.asset]).toBe("sounds/zap-one.wav");
    expect(existsSync(join(root, "out/sounds/zap-one.wav"))).toBe(true);
    expect(pack.cues["attack.fire:bigClub"][0]).toMatchObject({ template: [200, 300, 300] });
    expect(pack.cues["attack.fire:item-shiny-stick"]).toEqual([
      { type: "procedural", effect: "impact", at: "target", scale: 1 },
    ]);
    expect(pack.cues["area.detonate:ammo-boomBall-plain"][0]).toMatchObject({
      at: "point",
      scale: 6,
    });
    expect(pack.cues["attack.fire:ammo-boomBall-plain"][1]).toMatchObject({ startTime: 1000 });
    expect(pack.cues["status.active:glowing-bright"][0]).toMatchObject({
      persist: true,
      scale: 1.5,
      opacity: 0.6,
    });
  });

  it("relatório explica cada substituição e o que ficou de fora", () => {
    run();
    const report = JSON.parse(readFileSync(join(root, "out/import-report.json"), "utf8"));
    const notes = report.videos.map((entry: { note: string }) => entry.note);
    expect(notes).toContain("color:red");
    expect(notes).toContain("module");
    expect(notes).toContain("no-key");
    expect(report.ammoUnmatched).toEqual(["range:Mystery (Odd)"]);
    expect(report.byItemName).toEqual(["melee:Shiny Stick"]);
    expect(report.skipped.map((entry: { reason: string }) => entry.reason)).toEqual([
      "covered-by-preset",
      "menu-not-supported",
    ]);
  });

  it("ajustes trocam chaves e vídeos e removem entradas", () => {
    write(
      "overrides.json",
      JSON.stringify({
        keys: { "range:Mystery (Odd)": null, "melee:Shiny Stick": "quickhack.jackIn" },
        videos: { "melee.weapon.nothing.01.white": "melee.weapon.swing.01.white" },
        extra: {
          "attack.fire:ammo-zapCell-spicy+autofire": {
            from: "attack.fire:ammo-zapCell-spicy",
            sound: "boom.flac",
            at: "spray",
            repeat: 15,
            repeatDelay: 90,
          },
          "attack.fire:x+autofire": { from: "attack.fire:none", sound: "boom.flac" },
        },
      }),
    );
    expect(run(["--overrides", join(root, "overrides.json")]).status).toBe(0);
    const pack = JSON.parse(readFileSync(join(root, "out/cck-pack.json"), "utf8"));
    expect(pack.cues["attack.fire:item-mystery-odd"]).toBeUndefined();
    expect(pack.cues["quickhack.jackIn"][0]).toMatchObject({ type: "sprite" });
    const burst = pack.cues["attack.fire:ammo-zapCell-spicy+autofire"];
    expect(burst.map((step: { type: string }) => step.type)).toEqual(["sprite", "sound"]);
    expect(burst[0]).toMatchObject({ at: "spray", repeat: 15, repeatDelay: 90 });
    expect(pack.assets[burst[1].asset]).toBe("sounds/boom.flac");
    expect(pack.cues["attack.fire:x+autofire"]).toBeUndefined();
  });

  it("mesma entrada gera o mesmo arquivo", () => {
    run();
    const first = readFileSync(join(root, "out/cck-pack.json"), "utf8");
    run();
    expect(readFileSync(join(root, "out/cck-pack.json"), "utf8")).toBe(first);
  });

  it("falha com mensagem clara sem argumentos ou sem o módulo", () => {
    const missing = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("--export");
    rmSync(join(root, "modules"), { recursive: true });
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("fx-lib");
  });
});
