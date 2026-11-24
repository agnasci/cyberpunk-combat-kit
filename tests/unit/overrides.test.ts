import { describe, expect, it } from "vitest";
import { DEFAULT_CUES, resolveCue } from "../../src/domain/cues";
import {
  choicesFor,
  editorKeys,
  overrideLayer,
  overrideSteps,
  parseOverrides,
  sourceChoice,
  type CueSource,
} from "../../src/domain/overrides";

const pack: CueSource = {
  id: "exemplo",
  cues: {
    "attack.hit": [
      {
        type: "sound",
        src: ["cck-packs/exemplo/hit.ogg"],
        volume: 1,
        startTime: 0,
        delay: 0,
        repeat: 1,
        repeatDelay: 0,
      },
    ],
    "attack.fire:shotgun": [{ type: "synth", sound: "burst", volume: 1 }],
  },
};
const sources: CueSource[] = [pack, { id: "default", cues: DEFAULT_CUES }];

describe("associações do mestre", () => {
  it("lê só entradas válidas e descarta as que não mudam nada", () => {
    expect(
      parseOverrides({
        "attack.hit": { choice: "none" },
        "attack.miss": { choice: "auto", sound: "" },
        "attack.boom": { choice: "none" },
        "attack.dodged": { choice: "auto", sound: "https://x.y/a.ogg" },
        "attack.critical": { choice: "outro|attack.hit" },
        "area.detonate": { choice: "auto", sound: "sons/bum.ogg", volume: 9 },
      }),
    ).toEqual({
      "attack.hit": { choice: "none", sound: null, volume: 1 },
      "attack.critical": { choice: "outro|attack.hit", sound: null, volume: 1 },
      "area.detonate": { choice: "auto", sound: "sons/bum.ogg", volume: 1.5 },
    });
  });

  it("silenciar vence pacote e padrão", () => {
    const layer = overrideLayer(
      { "attack.hit": { choice: "none", sound: null, volume: 1 } },
      sources,
    );
    expect(resolveCue("attack.hit", [], [layer, pack.cues, DEFAULT_CUES])).toEqual([]);
  });

  it("trocar o som mantém o visual do efeito escolhido", () => {
    const steps = overrideSteps(
      "area.detonate",
      { choice: "auto", sound: "sons/bum.ogg", volume: 0.5 },
      sources,
    );
    expect(steps).toEqual([
      { type: "procedural", effect: "explosion", at: "point", scale: 1 },
      {
        type: "sound",
        src: ["sons/bum.ogg"],
        volume: 0.5,
        startTime: 0,
        delay: 0,
        repeat: 1,
        repeatDelay: 0,
      },
    ]);
  });

  it("usar o cue de outra chave ou de outra fonte", () => {
    const steps = overrideSteps(
      "attack.fire",
      { choice: sourceChoice("exemplo", "attack.fire:shotgun"), sound: null, volume: 1 },
      sources,
    );
    expect(steps).toEqual([{ type: "synth", sound: "burst", volume: 1 }]);
  });

  it("fonte que sumiu (pacote desligado) não muda nada", () => {
    expect(
      overrideSteps("attack.hit", { choice: "sumiu|attack.hit", sound: null, volume: 1 }, sources),
    ).toBeNull();
  });

  it("a lista do editor tem todos os eventos e as chaves dos pacotes", () => {
    const keys = editorKeys(sources, {});
    expect(keys).toContain("quickhack.jackIn");
    expect(keys).toContain("attack.fire:shotgun");
    expect(keys).toContain("attack.fire:melee");
    expect(choicesFor("attack.fire", sources)).toContain(
      sourceChoice("exemplo", "attack.fire:shotgun"),
    );
    expect(choicesFor("attack.hit", sources)).not.toContain(
      sourceChoice("exemplo", "attack.fire:shotgun"),
    );
  });
});
