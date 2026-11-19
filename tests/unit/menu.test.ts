import { describe, expect, it } from "vitest";
import {
  buildMenu,
  dvKey,
  menuModes,
  menuOpens,
  moveFocus,
  needsDv,
  type MenuEntry,
  type MenuInput,
  type MenuNet,
  type MenuWeapon,
} from "../../src/domain/menu";

const pistol: MenuWeapon = {
  id: "pistol",
  name: "Pistola",
  equipped: true,
  kind: "ranged",
  weaponType: "heavyPistol",
  ammoVariety: "basic",
  autofireMax: 0,
  suppressive: false,
  magazine: 8,
};

const smg: MenuWeapon = {
  ...pistol,
  id: "smg",
  name: "SMG",
  weaponType: "smg",
  autofireMax: 3,
  suppressive: true,
  magazine: 30,
};

const knife: MenuWeapon = {
  ...pistol,
  id: "knife",
  name: "Faca",
  kind: "melee",
  weaponType: "lightMelee",
  ammoVariety: null,
  magazine: null,
};

const grenade: MenuWeapon = {
  ...pistol,
  id: "gl",
  weaponType: "grenadeLauncher",
  ammoVariety: "grenade",
};

function input(overrides: Partial<MenuInput> = {}): MenuInput {
  return {
    self: false,
    attackerProblem: null,
    weapons: [pistol],
    dvs: { [dvKey("pistol", "single")]: 15, [dvKey("pistol", "aimed")]: 15 },
    distance: 12,
    squareSize: 2,
    grapple: null,
    targetGrappled: false,
    targeted: false,
    ...overrides,
  };
}

function find(entries: MenuEntry[], id: string): MenuEntry | undefined {
  for (const entry of entries) {
    if (entry.id === id) return entry;
    const child = find(entry.children, id);
    if (child) return child;
  }
  return undefined;
}

describe("modos no menu (mesmos bloqueios de modes.ts)", () => {
  it("pistola: simples e mirado; SMG ganha automático e supressivo", () => {
    expect(menuModes(pistol)).toEqual(["single", "aimed"]);
    expect(menuModes(smg)).toEqual(["single", "aimed", "autofire", "suppressive"]);
  });

  it("arma branca pode ser arremessada; explosivo não pode ser mirado", () => {
    expect(menuModes(knife)).toEqual(["single", "aimed", "thrown"]);
    expect(menuModes(grenade)).toEqual(["single"]);
  });

  it("supressivo e explosivo não medem DV até o alvo; corpo a corpo também não", () => {
    expect(needsDv(smg, "suppressive")).toBe(false);
    expect(needsDv(grenade, "single")).toBe(false);
    expect(needsDv(knife, "single")).toBe(false);
    expect(needsDv(knife, "thrown")).toBe(true);
    expect(needsDv(smg, "autofire")).toBe(true);
  });
});

describe("montagem do menu", () => {
  it("mostra a DV da tabela e as três partes do tiro mirado", () => {
    const menu = buildMenu(input());
    expect(menu.distance).toBe(12);
    expect(find(menu.entries, "pistol:single")?.hint).toEqual({
      key: "CCK.Menu.Dv",
      data: { dv: "15" },
    });
    expect(find(menu.entries, "pistol:single")?.action).toEqual({
      kind: "attack",
      weaponId: "pistol",
      mode: "single",
    });
    const aimed = find(menu.entries, "pistol:aimed");
    expect(aimed?.children.map((entry) => entry.action)).toEqual([
      { kind: "attack", weaponId: "pistol", mode: "aimed", location: "head" },
      { kind: "attack", weaponId: "pistol", mode: "aimed", location: "heldItem" },
      { kind: "attack", weaponId: "pistol", mode: "aimed", location: "leg" },
    ]);
  });

  it("DV nula na tabela (N/A) é fora de alcance", () => {
    const menu = buildMenu(input({ dvs: { [dvKey("pistol", "single")]: null } }));
    const single = find(menu.entries, "pistol:single");
    expect(single?.disabled).toEqual({ key: "CCK.Menu.Why-out-of-range" });
    expect(single?.action).toBeNull();
  });

  it("sem tabela de DV e sem munição desabilitam com o motivo", () => {
    const noTable = buildMenu(input({ dvs: { [dvKey("pistol", "single")]: "no-table" } }));
    expect(find(noTable.entries, "pistol:single")?.disabled?.key).toBe("CCK.Menu.Why-no-table");
    const empty = buildMenu(input({ weapons: [{ ...pistol, magazine: 0 }] }));
    expect(find(empty.entries, "pistol:single")?.disabled?.key).toBe("CCK.Menu.Why-no-ammo");
  });

  it("automático com menos de 10 balas aparece bloqueado", () => {
    const menu = buildMenu(
      input({
        weapons: [{ ...smg, magazine: 5 }],
        dvs: { [dvKey("smg", "single")]: 15, [dvKey("smg", "autofire")]: 17 },
      }),
    );
    expect(find(menu.entries, "smg:autofire")?.disabled?.key).toBe("CCK.Menu.Why-no-ammo-mode");
    expect(find(menu.entries, "smg:suppressive")?.disabled?.key).toBe("CCK.Menu.Why-no-ammo-mode");
  });

  it("corpo a corpo depende de estar a um quadrado", () => {
    const near = buildMenu(input({ weapons: [knife], distance: 2, dvs: {} }));
    expect(find(near.entries, "knife:single")?.disabled).toBeNull();
    const far = buildMenu(input({ weapons: [knife], distance: 4, dvs: {} }));
    expect(find(far.entries, "knife:single")?.disabled?.key).toBe("CCK.Menu.Why-out-of-range");
    expect(find(far.entries, "grapple:grab")?.disabled?.key).toBe("CCK.Menu.Why-out-of-range");
  });

  it("armas não equipadas ficam de fora", () => {
    const menu = buildMenu(input({ weapons: [{ ...pistol, equipped: false }] }));
    expect(find(menu.entries, "weapon:pistol")).toBeUndefined();
    expect(find(menu.entries, "no-weapon")?.disabled).not.toBeNull();
  });

  it("sem atacante válido mostra o motivo e ainda deixa marcar o alvo", () => {
    const menu = buildMenu(input({ attackerProblem: "no-attacker" }));
    expect(menu.entries.map((entry) => entry.id)).toEqual(["problem", "target"]);
    expect(find(menu.entries, "target")?.label.key).toBe("CCK.Menu.Target");
    const marked = buildMenu(input({ attackerProblem: "no-attacker", targeted: true }));
    expect(find(marked.entries, "target")?.label.key).toBe("CCK.Menu.Untarget");
  });

  it("agarrão: quem agarra o alvo pode estrangular, derrubar e soltar", () => {
    const menu = buildMenu(
      input({ distance: 2, grapple: { role: "attacker", partnerIsTarget: true } }),
    );
    expect(find(menu.entries, "grapple")?.children.map((entry) => entry.id)).toEqual([
      "grapple:choke",
      "grapple:throw",
      "grapple:release",
    ]);
  });

  it("agarrão: quem é agarrado só pode escapar; ninguém agarra quem já está agarrado", () => {
    const held = buildMenu(input({ grapple: { role: "defender", partnerIsTarget: true } }));
    expect(find(held.entries, "grapple")?.children.map((entry) => entry.id)).toEqual([
      "grapple:escape",
    ]);
    const busy = buildMenu(input({ distance: 2, targetGrappled: true }));
    expect(find(busy.entries, "grapple")).toBeUndefined();
  });

  it("no próprio token: só ações de agarrão, sem armas nem alvo", () => {
    const menu = buildMenu(
      input({ self: true, grapple: { role: "defender", partnerIsTarget: false } }),
    );
    expect(menu.entries.map((entry) => entry.id)).toEqual(["grapple"]);
    expect(menu.distance).toBeNull();
    expect(buildMenu(input({ self: true })).entries.map((entry) => entry.id)).toEqual(["nothing"]);
  });
});

describe("quando o menu abre (D10)", () => {
  const base = { button: 2, owner: false, modifier: false, always: false, controlled: false };

  it("token alheio abre sem tecla; só o botão direito", () => {
    expect(menuOpens(base)).toBe(true);
    expect(menuOpens({ ...base, button: 0 })).toBe(false);
  });

  it("dono ou mestre mantém o HUD; com a tecla abre o menu", () => {
    expect(menuOpens({ ...base, owner: true })).toBe(false);
    expect(menuOpens({ ...base, owner: true, modifier: true })).toBe(true);
  });

  it("opção sempre: abre em token não selecionado, não no selecionado", () => {
    expect(menuOpens({ ...base, owner: true, always: true })).toBe(true);
    expect(menuOpens({ ...base, owner: true, always: true, controlled: true })).toBe(false);
  });
});

describe("foco por teclado", () => {
  it("pula itens desabilitados e dá a volta", () => {
    const enabled = [true, false, true, true];
    expect(moveFocus(0, enabled, 1)).toBe(2);
    expect(moveFocus(3, enabled, 1)).toBe(0);
    expect(moveFocus(0, enabled, -1)).toBe(3);
    expect(moveFocus(-1, enabled, 1)).toBe(0);
    expect(moveFocus(4, enabled, -1)).toBe(3);
  });

  it("sem itens habilitados fica onde está; lista vazia dá -1", () => {
    expect(moveFocus(1, [false, false], 1)).toBe(1);
    expect(moveFocus(0, [], 1)).toBe(-1);
  });
});

describe("netrunning no menu (R09)", () => {
  const net = (extra: Partial<MenuNet> = {}): MenuNet => ({
    rank: 2,
    hasNeuroport: true,
    inRange: true,
    visible: true,
    locked: false,
    intrusion: null,
    passwalls: 0,
    turn: "c:1",
    quickhacks: [
      { id: "b", name: "Beta", tier: 2, dv: 8, requiresUnaware: false },
      { id: "a", name: "Alfa", tier: 1, dv: 6, requiresUnaware: false },
      { id: "c", name: "Gama", tier: 3, dv: 10, requiresUnaware: false },
    ],
    intruders: [],
    targetUuid: "Token.alvo",
    ...extra,
  });
  const linked = {
    runnerUuid: "Token.eu",
    runnerActorUuid: "Actor.eu",
    runnerName: "Eu",
    aware: false,
    breached: 0,
    lastHack: null,
  };

  it("desligado ou sem Interface: nenhum vestígio", () => {
    expect(find(buildMenu(input()).entries, "net")).toBeUndefined();
    expect(find(buildMenu(input({ net: null })).entries, "net")).toBeUndefined();
    expect(find(buildMenu(input({ net: net({ rank: 0 }) })).entries, "net")).toBeUndefined();
  });

  it("sem ligação: Jack In com o motivo do bloqueio", () => {
    const ok = find(buildMenu(input({ net: net() })).entries, "net:jackIn");
    expect(ok?.action).toEqual({ kind: "net", action: "jackIn" });
    const far = find(buildMenu(input({ net: net({ inRange: false }) })).entries, "net:jackIn");
    expect(far?.disabled?.key).toBe("CCK.Menu.Why-out-of-range");
    const noPort = buildMenu(input({ net: net({ hasNeuroport: false }) })).entries;
    expect(find(noPort, "net:jackIn")?.disabled?.key).toBe("CCK.Menu.Why-no-neuroport");
    const locked = buildMenu(input({ net: net({ locked: true }) })).entries;
    expect(find(locked, "net:jackIn")?.disabled?.key).toBe("CCK.Menu.Why-locked");
  });

  it("ligado: Breach antes dos Quickhacks, níveis acima do rank bloqueados", () => {
    const entries = buildMenu(input({ net: net({ intrusion: linked, passwalls: 1 }) })).entries;
    expect(find(entries, "net:breach")?.hint).toEqual({ key: "CCK.Menu.Dv", data: { dv: "6" } });
    expect(find(entries, "net:hack:a")?.disabled?.key).toBe("CCK.Menu.Why-breach-needed");
    const open = buildMenu(
      input({ net: net({ intrusion: { ...linked, breached: 1 }, passwalls: 1 }) }),
    ).entries;
    expect(find(open, "net:breach")).toBeUndefined();
    expect(find(open, "net:quickhacks")?.children.map((child) => child.id)).toEqual([
      "net:hack:a",
      "net:hack:b",
      "net:hack:c",
    ]);
    expect(find(open, "net:hack:a")?.action).toEqual({
      kind: "net",
      action: "quickhack",
      quickhackId: "a",
    });
    expect(find(open, "net:hack:c")?.disabled?.key).toBe("CCK.Menu.Why-tier-locked");
    expect(find(open, "net:jackOut")?.action).toEqual({ kind: "net", action: "jackOut" });
  });

  it("um Quickhack por alvo por turno", () => {
    const done = { ...linked, lastHack: "c:1" };
    const entries = buildMenu(input({ net: net({ intrusion: done }) })).entries;
    expect(find(entries, "net:hack:a")?.disabled?.key).toBe("CCK.Menu.Why-once-per-turn");
  });

  it("sem pacote de Quickhacks: o menu explica", () => {
    const entries = buildMenu(input({ net: net({ intrusion: linked, quickhacks: [] }) })).entries;
    expect(find(entries, "net:none")?.disabled?.key).toBe("CCK.Menu.Why-no-quickhacks");
  });

  it("Force Out contra quem invadiu: no próprio token ou no token do Netrunner", () => {
    const intruders = [{ runnerUuid: "Token.alvo", name: "Runner" }];
    const own = buildMenu(input({ self: true, net: net({ rank: 0, intruders }) })).entries;
    expect(find(own, "net:forceOut:Token.alvo")?.label).toEqual({
      key: "CCK.Menu.Net-forceOutFrom",
      data: { name: "Runner" },
    });
    const there = buildMenu(input({ net: net({ rank: 0, intruders }) })).entries;
    expect(find(there, "net:forceOut:Token.alvo")?.action).toEqual({
      kind: "net",
      action: "forceOut",
      runnerUuid: "Token.alvo",
    });
    const other = buildMenu(input({ net: net({ rank: 0, intruders, targetUuid: "Token.x" }) }));
    expect(find(other.entries, "net")).toBeUndefined();
  });
});
