import { combatJustStarted, initiativeToRoll } from "../domain/initiative";
import { initiativePrompt } from "../integrations/foundry/settings";

const open = new Set<string>();

function escape(text: string): string {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function pendingIds(combat: Combat): string[] {
  return initiativeToRoll(
    combat.combatants.contents.map((combatant) => ({
      id: combatant.id,
      initiative: combatant.initiative ?? null,
      owner: combatant.isOwner,
      activePlayerOwner: (combatant.players ?? []).some((user) => user.active),
      defeated: combatant.defeated === true,
    })),
    game.user.isGM,
  );
}

async function promptFor(combat: Combat): Promise<void> {
  if (!initiativePrompt() || open.has(combat.id)) return;
  const ids = pendingIds(combat);
  if (ids.length === 0) return;
  const names = ids
    .map((id) => combat.combatants.get(id)?.name ?? "")
    .map((name) => `<li>${escape(name)}</li>`)
    .join("");
  const intro = game.i18n.localize(
    game.user.isGM ? "CCK.Initiative.PromptGm" : "CCK.Initiative.Prompt",
  );
  open.add(combat.id);
  try {
    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("CCK.Initiative.Title") },
      content: `<p>${intro}</p><ul>${names}</ul>`,
      buttons: [
        { action: "roll", label: game.i18n.localize("CCK.Initiative.Roll"), default: true },
        { action: "later", label: game.i18n.localize("CCK.Initiative.Later") },
      ],
      rejectClose: false,
    });
    if (choice !== "roll") return;
    const still = pendingIds(combat);
    if (still.length > 0) await combat.rollInitiative(still);
  } finally {
    open.delete(combat.id);
  }
}

export function initInitiativePrompt(): void {
  Hooks.on("updateCombat", (...args: unknown[]) => {
    const [combat, changes] = args as [Combat, Record<string, unknown>];
    if (!combatJustStarted(changes.round, combat.previous?.round)) return;
    void promptFor(combat);
  });
}
