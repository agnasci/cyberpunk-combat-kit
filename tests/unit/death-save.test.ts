import { describe, expect, it } from "vitest";
import { npcDeathSaves } from "../../src/domain/death-save";

describe("Death Save dos PdMs pelo tracker", () => {
  it("só PdMs mortalmente feridos e não derrotados", () => {
    const base = { npc: true, mortallyWounded: true, defeated: false };
    expect(
      npcDeathSaves([
        { ...base, id: "a" },
        { ...base, id: "b", npc: false },
        { ...base, id: "c", mortallyWounded: false },
        { ...base, id: "d", defeated: true },
        { ...base, id: "e" },
      ]),
    ).toEqual(["a", "e"]);
  });

  it("lista vazia sem candidatos", () => {
    expect(npcDeathSaves([])).toEqual([]);
  });
});
