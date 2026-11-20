import { budgetFor, type TurnBudget } from "../../domain/turn-budget";
import { MODULE_ID } from "../../constants";

const FLAG = "turn";

export function runningCombat(): Combat | null {
  const combat = game.combat;
  return combat?.started ? combat : null;
}

export function combatantOf(token: TokenDocument): Combatant | null {
  const combat = runningCombat();
  if (!combat) return null;
  const sceneId = token.parent?.id ?? null;
  return (
    combat.combatants.contents.find(
      (combatant) => combatant.tokenId === token.id && combatant.sceneId === sceneId,
    ) ?? null
  );
}

export function combatantsOfActor(actor: Actor): Combatant[] {
  const combat = runningCombat();
  if (!combat) return [];
  return combat.combatants.contents.filter((combatant) => combatant.actor === actor);
}

export function activeCombatant(): Combatant | null {
  return runningCombat()?.combatant ?? null;
}

export function readBudget(combatant: Combatant): TurnBudget {
  return budgetFor(combatant.getFlag(MODULE_ID, FLAG), runningCombat()?.round ?? 0);
}

export async function writeBudget(combatant: Combatant, budget: TurnBudget): Promise<void> {
  await combatant.setFlag(MODULE_ID, FLAG, budget);
}

export function moveStat(actor: Actor | null): number {
  const system = actor?.system as { stats?: { move?: { value?: unknown } } } | undefined;
  const value = Number(system?.stats?.move?.value);
  return Number.isFinite(value) ? value : 0;
}

export function isProne(actor: Actor | null): boolean {
  return actor?.statuses?.has("prone") === true;
}

export function gridSquares(): { size: number; gridless: boolean } {
  return { size: canvas?.grid.size ?? 100, gridless: canvas?.grid.isGridless ?? false };
}
