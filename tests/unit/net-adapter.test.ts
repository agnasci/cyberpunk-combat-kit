import { describe, expect, it } from "vitest";
import { countPart, interfaceRank } from "../../src/integrations/cpr/net-adapter";
import { actor, item } from "../fixtures/cpr-actors";

const names = { neuroport: ["Neuroport"], selfIce: ["Self-ICE"] };
const cyber = (id: string, name: string, installed = true, flags?: Record<string, unknown>) =>
  item({
    id,
    name,
    type: "cyberware",
    system: { isInstalled: installed },
    ...(flags ? { flags } : {}),
  });
const role = (id: string, rank: number) =>
  item({ id, name: "Função sintética", type: "role", system: { rank } });

describe("peças de rede no ator", () => {
  it("conta Neuroport e Self-ICE instalados pelo nome, sem diferenciar maiúsculas", () => {
    const target = actor({
      items: [
        cyber("c1", "Neuroport (modelo X)"),
        cyber("c2", "self-ice"),
        cyber("c3", "Self-ICE Mk2"),
        cyber("c4", "Self-ICE guardado", false),
      ],
    });
    expect(countPart(target, "neuroport", names)).toBe(1);
    expect(countPart(target, "selfIce", names)).toBe(2);
  });

  it("flag do item vence o nome", () => {
    const target = actor({
      items: [
        cyber("c1", "Porta genérica", true, { net: "neuroport" }),
        cyber("c2", "Neuroport de enfeite", true, { net: "selfIce" }),
      ],
    });
    expect(countPart(target, "neuroport", names)).toBe(1);
    expect(countPart(target, "selfIce", names)).toBe(1);
  });

  it("rank de Interface vem da função de rede ativa", () => {
    expect(interfaceRank(actor({ items: [role("r1", 4)], activeNetRole: "r1" }))).toBe(4);
    expect(interfaceRank(actor({ items: [role("r1", 4)] }))).toBe(0);
    expect(interfaceRank(actor({ items: [role("r1", 4)], activeNetRole: "outro" }))).toBe(0);
  });
});
