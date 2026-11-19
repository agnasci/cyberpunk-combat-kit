import { describe, expect, it } from "vitest";
import {
  manifestPath,
  normalizeFolder,
  parseManifest,
  parseManifestText,
  parsePackEntries,
  type ManifestResult,
} from "../../src/domain/pack";

const FOLDER = "cck-packs/exemplo";

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "exemplo",
    version: "1.0.0",
    title: "Pacote de exemplo",
    kinds: ["cues"],
    assets: { shot: "sounds/shot.ogg", spark: "fx/spark.webm" },
    cues: {
      "attack.fire:heavyPistol": [{ type: "sound", asset: "shot", volume: 0.8 }],
      "attack.hit": [{ type: "sprite", asset: "spark", at: "target" }],
    },
    ...overrides,
  };
}

function codes(result: ManifestResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}

describe("manifesto válido", () => {
  it("resolve os assets para caminhos dentro da pasta do pacote", () => {
    const result = parseManifest(manifest(), FOLDER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.cues["attack.fire:heavyPistol"]).toEqual([
      { type: "sound", src: "cck-packs/exemplo/sounds/shot.ogg", volume: 0.8 },
    ]);
    expect(result.pack.cues["attack.hit"]?.[0]).toMatchObject({
      type: "sprite",
      src: "cck-packs/exemplo/fx/spark.webm",
      at: "target",
    });
  });

  it("aceita passos próprios sem asset e kinds ausente vira cues", () => {
    const result = parseManifest(
      manifest({ kinds: undefined, cues: { "attack.miss": [{ type: "synth", sound: "whoosh" }] } }),
      FOLDER,
    );
    expect(result.ok && result.pack.kinds).toEqual(["cues"]);
  });

  it("quickhacks só com kinds quickhacks e ícone pelo asset", () => {
    const result = parseManifest(
      manifest({
        kinds: ["quickhacks"],
        assets: { icon: "icons/q.webp" },
        quickhacks: [
          {
            id: "exemplo",
            name: "Exemplo",
            tier: 1,
            dv: 6,
            icon: "icon",
            effect: { type: "guided" },
          },
        ],
      }),
      FOLDER,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.cues).toEqual({});
    expect(result.pack.quickhacks[0]?.icon).toBe("cck-packs/exemplo/icons/q.webp");
  });

  it("o caminho do manifesto fica na raiz da pasta; barra final é removida", () => {
    expect(normalizeFolder("cck-packs/exemplo/")).toBe(FOLDER);
    expect(manifestPath(FOLDER)).toBe("cck-packs/exemplo/cck-pack.json");
  });
});

describe("caminhos maliciosos", () => {
  it.each([
    ["../fora.ogg"],
    ["sounds/../../fora.ogg"],
    ["/etc/shot.ogg"],
    ["https://exemplo.com/shot.ogg"],
    ["data:audio/ogg;base64,AAAA"],
    ["sounds\\shot.ogg"],
  ])("recusa asset %s", (path) => {
    expect(codes(parseManifest(manifest({ assets: { shot: path } }), FOLDER))).toContain(
      "bad-asset-path",
    );
  });

  it("recusa src direto fora da regra dentro de um cue", () => {
    const result = parseManifest(
      manifest({ cues: { "attack.hit": [{ type: "sound", src: "https://x.y/a.ogg" }] } }),
      FOLDER,
    );
    expect(codes(result)).toContain("bad-cue");
  });

  it.each([["../fora"], ["/abs"], ["https://x"], ["a/./b"], [""], ["a\\b"]])(
    "recusa pasta %s",
    (folder) => {
      expect(codes(parseManifest(manifest(), folder))).toEqual(["bad-folder"]);
    },
  );
});

describe("tipos proibidos", () => {
  it.each([["script.js"], ["pagina.html"], ["som.flac"], ["imagem.gif"], ["sem-extensao"]])(
    "recusa %s",
    (path) => {
      expect(codes(parseManifest(manifest({ assets: { shot: path } }), FOLDER))).toContain(
        "bad-asset-path",
      );
    },
  );

  it("sprite com asset de áudio não passa (tipo errado para o passo)", () => {
    const result = parseManifest(
      manifest({ cues: { "attack.hit": [{ type: "sprite", asset: "shot", at: "target" }] } }),
      FOLDER,
    );
    expect(codes(result)).toContain("bad-cue");
  });
});

describe("chaves inválidas", () => {
  it("id, versão, título e kinds", () => {
    const result = parseManifest(
      manifest({ id: "Com Espaço", version: "1", title: "", kinds: ["armas"] }),
      FOLDER,
    );
    expect(codes(result)).toEqual(
      expect.arrayContaining(["bad-id", "bad-version", "bad-title", "bad-kinds"]),
    );
  });

  it("ids reservados das fontes internas", () => {
    expect(codes(parseManifest(manifest({ id: "default" }), FOLDER))).toContain("bad-id");
    expect(codes(parseManifest(manifest({ id: "code" }), FOLDER))).toContain("bad-id");
  });

  it("evento desconhecido, qualificador com símbolo e asset inexistente", () => {
    const result = parseManifest(
      manifest({
        cues: {
          "attack.boom": [{ type: "synth", sound: "shot" }],
          "attack.hit:a b": [{ type: "synth", sound: "shot" }],
          "attack.miss": [{ type: "sound", asset: "nada" }],
        },
      }),
      FOLDER,
    );
    expect(codes(result)).toEqual(["bad-cue-key", "bad-cue-key", "unknown-asset"]);
  });

  it("chave de asset inválida e quickhack repetido ou incompleto", () => {
    const result = parseManifest(
      manifest({
        kinds: ["cues", "quickhacks"],
        assets: { "com espaço": "a.ogg" },
        cues: {},
        quickhacks: [
          { id: "q", name: "Q", tier: 1, dv: 6, effect: { type: "damage" } },
          { id: "q", name: "Q", tier: 1, dv: 6, effect: { type: "damage" } },
          { id: "r", name: "R", tier: 0, dv: 6, effect: { type: "damage" } },
          { id: "s", name: "S", tier: 1, dv: 6, effect: { type: "explodir" } },
        ],
      }),
      FOLDER,
    );
    expect(codes(result)).toEqual(["bad-asset-key", "duplicate", "bad-quickhack", "bad-quickhack"]);
  });

  it("JSON quebrado, arquivo grande demais e raiz que não é objeto", () => {
    expect(codes(parseManifestText("{", FOLDER))).toEqual(["not-object"]);
    expect(codes(parseManifestText(" ".repeat(300 * 1024), FOLDER))).toEqual(["too-many"]);
    expect(codes(parseManifest([], FOLDER))).toEqual(["not-object"]);
  });

  it("limite de quantidade", () => {
    const cues = Object.fromEntries(
      Array.from({ length: 201 }, (_, index) => [
        `attack.hit:q${index}`,
        [{ type: "synth", sound: "shot" }],
      ]),
    );
    expect(codes(parseManifest(manifest({ cues }), FOLDER))).toContain("too-many");
  });
});

describe("lista salva no mundo", () => {
  it("ignora entradas inválidas e repetidas", () => {
    expect(
      parsePackEntries([
        { folder: "cck-packs/a/", enabled: true },
        { folder: "cck-packs/a", enabled: false },
        { folder: "../b", enabled: true },
        { folder: "cck-packs/c" },
        "lixo",
      ]),
    ).toEqual([
      { folder: "cck-packs/a", enabled: true },
      { folder: "cck-packs/c", enabled: false },
    ]);
    expect(parsePackEntries(null)).toEqual([]);
  });
});
