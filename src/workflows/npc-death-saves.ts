import { npcDeathSaves } from "../domain/death-save";
import { rollDeathSave } from "../integrations/cpr/attack-adapter";
import { isMortallyWounded } from "../integrations/cpr/weapon-adapter";
import { runningCombat } from "../integrations/foundry/turn-store";
import { addDeathSaveButton } from "../ui/death-save-button";

let rolling = false;

function trackerRoot(html: unknown): HTMLElement | null {
  if (html instanceof HTMLElement) return html;
  const first = (html as { 0?: unknown } | null)?.[0];
  return first instanceof HTMLElement ? first : null;
}

async function rollAll(): Promise<void> {
  const combat = runningCombat();
  if (!combat || rolling) return;
  const combatants = combat.combatants.contents;
  const ids = npcDeathSaves(
    combatants.map((combatant) => ({
      id: combatant.id,
      npc: !!combatant.actor && !combatant.actor.hasPlayerOwner,
      mortallyWounded: !!combatant.actor && isMortallyWounded(combatant.actor),
      defeated: combatant.defeated === true,
    })),
  );
  if (ids.length === 0) {
    ui.notifications.info(game.i18n.localize("CCK.DeathSave.None"));
    return;
  }
  rolling = true;
  try {
    for (const id of ids) {
      const combatant = combat.combatants.get(id);
      if (combatant?.actor) await rollDeathSave(combatant.actor, combatant.tokenId);
    }
  } finally {
    rolling = false;
  }
}

export function initNpcDeathSaves(): void {
  Hooks.on("renderCombatTracker", (...args: unknown[]) => {
    const root = trackerRoot(args[1]);
    if (!root || !game.user.isGM || !runningCombat()) return;
    addDeathSaveButton(root, () => void rollAll());
  });
}
