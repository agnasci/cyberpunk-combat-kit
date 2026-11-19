interface ItemFixture {
  id: string;
  name: string;
  type: string;
  system: unknown;
  flags?: Record<string, unknown>;
}

export function item(fixture: ItemFixture): Item {
  return {
    ...fixture,
    createRoll: () => ({}),
    confirmRoll: (roll: unknown) => roll,
    getFlag: (_scope: string, key: string) => fixture.flags?.[key],
  };
}

export const heavyPistol = item({
  id: "pistol0000000001",
  name: "Pistola sintética",
  type: "weapon",
  system: {
    isRanged: true,
    equipped: "equipped",
    dvTable: "DV Pistol",
    magazine: { value: 8, max: 8 },
  },
});

export const emptyPistol = item({
  id: "pistol0000000002",
  name: "Pistola vazia",
  type: "weapon",
  system: {
    isRanged: true,
    equipped: "carried",
    dvTable: "DV Pistol",
    magazine: { value: 0, max: 8 },
  },
});

export const knife = item({
  id: "knife00000000001",
  name: "Faca sintética",
  type: "weapon",
  system: { isRanged: false, equipped: "equipped", dvTable: "", ignoreArmorPercent: 50 },
});

export const evasion = item({ id: "skill00000000001", name: "Evasion", type: "skill", system: {} });

export const vest = item({
  id: "armor00000000001",
  name: "Colete sintético",
  type: "armor",
  system: {
    equipped: "equipped",
    bodyLocation: { sp: 7, ablation: 2 },
    headLocation: { sp: 0, ablation: 0 },
  },
});

export function actor(options: {
  items: Item[];
  ref?: number;
  hp?: number;
  hasPlayerOwner?: boolean;
  activeNetRole?: string;
}): Actor {
  const byType: Record<string, Item[]> = {};
  for (const entry of options.items) (byType[entry.type] ??= []).push(entry);
  return {
    id: "actor00000000001",
    uuid: "Actor.actor00000000001",
    name: "Ator sintético",
    type: "character",
    isOwner: true,
    hasPlayerOwner: options.hasPlayerOwner ?? true,
    system: {
      stats: { ref: { value: options.ref ?? 6 } },
      derivedStats: { hp: { value: options.hp ?? 40, max: 40 } },
      roleInfo: { activeNetRole: options.activeNetRole ?? null },
    },
    items: { find: (fn) => options.items.find(fn) },
    itemTypes: byType,
    testUserPermission: () => true,
    effects: [],
    createEmbeddedDocuments: async () => [],
    deleteEmbeddedDocuments: async () => [],
    toggleStatusEffect: async () => undefined,
    update: async () => undefined,
  };
}
