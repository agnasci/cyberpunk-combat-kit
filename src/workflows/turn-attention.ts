import { activeCombatant } from "../integrations/foundry/turn-store";
import { turnPanelHighlight } from "../integrations/foundry/settings";
import { panelSubject, setPanelAttention } from "../integrations/panel/panel-bridge";

const SOURCE = "cyberpunk-combat-kit.turn";

function subjectInTurn(): boolean {
  const combatant = activeCombatant();
  const subject = panelSubject();
  if (!combatant || !subject) return false;
  if (subject.token && combatant.tokenId) return subject.token.id === combatant.tokenId;
  return combatant.actorId !== null && combatant.actorId === subject.actor.id;
}

export function refreshTurnAttention(): void {
  setPanelAttention(SOURCE, turnPanelHighlight() && subjectInTurn());
}

export function initTurnAttention(): void {
  for (const hook of ["updateCombat", "deleteCombat"] as const) {
    Hooks.on(hook, () => refreshTurnAttention());
  }
  for (const hook of ["ccpSubjectChanged", "ccpReady"] as const) {
    Hooks.on(hook, () => refreshTurnAttention());
  }
  refreshTurnAttention();
}
