import type { InjuryTable } from "../../domain/attack-rules";

const WAIT_MS = 12000;
const TABLE_PATTERNS: Record<InjuryTable, RegExp> = { body: /body/i, head: /head/i };

interface IndexEntry {
  _id: string;
  name: string;
}

interface InjuryPack {
  metadata: { id: string; label: string };
  getIndex(): Promise<{ contents: IndexEntry[] }>;
  getDocument(id: string): Promise<unknown>;
}

interface InjurySheet {
  _drawCriticalInjuryTable?(table: unknown, compendium: string, iteration: number): unknown;
  _rollCriticalInjury?(): unknown;
}

interface CreatedItem {
  name: string;
  type: string;
  parent?: { uuid?: string } | null;
}

function allPacks(): InjuryPack[] {
  const packs = game.packs as unknown as { values(): Iterable<InjuryPack> };
  return [...packs.values()];
}

function tablePackId(): string {
  return String(game.settings.get(game.system.id, "criticalInjuryRollTableCompendium") ?? "");
}

function waitForInjury(actor: Actor): Promise<string | null> {
  return new Promise((resolve) => {
    const finish = (name: string | null) => {
      Hooks.off("createItem", hook);
      window.clearTimeout(timer);
      resolve(name);
    };
    const hook = Hooks.on("createItem", (...args: unknown[]) => {
      const item = args[0] as CreatedItem;
      if (item.type === "criticalInjury" && item.parent?.uuid === actor.uuid) finish(item.name);
    });
    const timer = window.setTimeout(() => finish(null), WAIT_MS);
  });
}

async function systemTable(table: InjuryTable) {
  const packs = allPacks();
  const pack = packs.find((entry) => entry.metadata.id === tablePackId());
  if (!pack) return null;
  const entry = (await pack.getIndex()).contents.find((row) =>
    TABLE_PATTERNS[table].test(row.name),
  );
  if (!entry) return null;
  const injuries = packs.find((candidate) => candidate.metadata.label === entry.name);
  if (!injuries) return null;
  return { rollTable: await pack.getDocument(entry._id), compendium: injuries.metadata.id };
}

export async function rollCriticalInjury(actor: Actor, table: InjuryTable): Promise<string | null> {
  const sheet = (actor as unknown as { sheet?: InjurySheet | null }).sheet ?? null;
  if (!sheet) return null;
  const found = await systemTable(table);
  const created = waitForInjury(actor);
  if (found && typeof sheet._drawCriticalInjuryTable === "function") {
    await sheet._drawCriticalInjuryTable(found.rollTable, found.compendium, 0);
  } else if (typeof sheet._rollCriticalInjury === "function") {
    await sheet._rollCriticalInjury();
  } else {
    return null;
  }
  return created;
}
