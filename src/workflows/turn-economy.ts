import {
  checkMove,
  forceSpend,
  FULL_ACTION,
  runAndMove,
  spendAction,
  squaresMoved,
  turnPlate,
} from "../domain/turn-budget";
import { MODULE_ID } from "../constants";
import { actionEconomy } from "../integrations/foundry/settings";
import {
  combatantOf,
  combatantsOfActor,
  gridSquares,
  isProne,
  moveStat,
  readBudget,
  runningCombat,
  writeBudget,
} from "../integrations/foundry/turn-store";
import { squareSize } from "../integrations/foundry/tokens";
import { decorateTracker } from "../ui/turn-badge";
import { warn } from "./combat-common";

let onBudgetChange: () => void = () => undefined;

export function setBudgetListener(listener: () => void): void {
  onBudgetChange = listener;
}

const economy = actionEconomy;

function subjectCombatant(actor: Actor, token?: Token): Combatant | null {
  if (token) return combatantOf(token.document);
  return combatantsOfActor(actor)[0] ?? null;
}

export function actionGate(actor: Actor, cost: number, token?: Token): boolean {
  if (economy() !== "enforce") return true;
  const combatant = subjectCombatant(actor, token);
  if (!combatant) return true;
  if (spendAction(readBudget(combatant), cost) !== "no-action") return true;
  warn("CCK.Turn.no-action", { name: combatant.name });
  return false;
}

export async function chargeAction(actor: Actor, cost: number, token?: Token): Promise<void> {
  if (economy() === "off") return;
  const combatant = subjectCombatant(actor, token);
  if (!combatant) return;
  await writeBudget(combatant, forceSpend(readBudget(combatant), cost));
}

export async function resetBudget(combatant: Combatant): Promise<void> {
  await combatant.setFlag(MODULE_ID, "turn", null);
}

function movedSquares(token: TokenDocument, changes: Record<string, unknown>): number {
  const x = typeof changes.x === "number" ? changes.x : token.x;
  const y = typeof changes.y === "number" ? changes.y : token.y;
  const { size, gridless } = gridSquares();
  return squaresMoved(x - token.x, y - token.y, size, gridless);
}

async function offerRun(
  token: TokenDocument,
  combatant: Combatant,
  changes: Record<string, unknown>,
  squares: number,
): Promise<void> {
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("CCK.Turn.RunTitle") },
    content: `<p>${game.i18n.format("CCK.Turn.RunPrompt", {
      name: combatant.name,
      move: String(moveStat(combatant.actor)),
    })}</p>`,
    buttons: [
      { action: "run", label: game.i18n.localize("CCK.Turn.Run"), default: true },
      { action: "cancel", label: game.i18n.localize("CCK.Turn.Stay") },
    ],
    rejectClose: false,
  });
  if (choice !== "run") return;
  const budget = runAndMove(readBudget(combatant), squares);
  if (budget === "run-needs-action") return warn("CCK.Turn.no-action", { name: combatant.name });
  await writeBudget(combatant, budget);
  const position: Record<string, unknown> = {};
  if (typeof changes.x === "number") position.x = changes.x;
  if (typeof changes.y === "number") position.y = changes.y;
  await token.update(position, { cckRun: true });
}

function guardMove(
  token: TokenDocument,
  changes: Record<string, unknown>,
  options: Record<string, unknown>,
): boolean {
  const mode = economy();
  if (mode === "off" || options.cckRun === true) return true;
  if (typeof changes.x !== "number" && typeof changes.y !== "number") return true;
  const combatant = combatantOf(token);
  if (!combatant) return true;
  const squares = movedSquares(token, changes);
  if (squares <= 0) return true;
  const budget = readBudget(combatant);
  const actor = combatant.actor;
  const check = checkMove(budget, moveStat(actor), squares, isProne(actor));
  if (check.ok) {
    void writeBudget(combatant, check.budget);
    return true;
  }
  if (mode === "track") {
    const ran = check.canRun ? runAndMove(budget, squares) : "run-needs-action";
    const next = ran === "run-needs-action" ? { ...budget, moved: budget.moved + squares } : ran;
    void writeBudget(combatant, next);
    return true;
  }
  if (check.canRun) {
    void offerRun(token, combatant, changes, squares);
    return false;
  }
  warn(`CCK.Turn.${check.problem}`, { name: combatant.name, squares: String(squares) });
  return false;
}

function proneEffect(effect: ActiveEffect): Actor | null {
  if (!effect.statuses?.has("prone")) return null;
  const parent = effect.parent as Actor | undefined;
  return parent && "itemTypes" in parent ? parent : null;
}

function trackerRoot(html: unknown): HTMLElement | null {
  if (html instanceof HTMLElement) return html;
  const first = (html as { 0?: unknown } | null)?.[0];
  return first instanceof HTMLElement ? first : null;
}

function decorate(html: unknown): void {
  const root = trackerRoot(html);
  const combat = runningCombat();
  if (!root || !combat || economy() === "off") return;
  const units = canvas?.scene?.grid.units ?? "";
  const badges = combat.combatants.contents.map((combatant) => {
    const plate = turnPlate(moveStat(combatant.actor), readBudget(combatant));
    const meters = Math.round(plate.left * squareSize());
    return {
      combatantId: combatant.id,
      move: `${game.i18n.localize("CCK.Turn.Move")} ${meters} ${units}`.trim(),
      action: plate.action,
      over: plate.over,
    };
  });
  decorateTracker(root, badges, game.user.isGM, (id) => {
    const combatant = combat.combatants.get(id);
    if (combatant) void resetBudget(combatant);
  });
}

export function initTurnEconomy(): void {
  Hooks.on("renderCombatTracker", (...args: unknown[]) => decorate(args[1]));
  Hooks.on("preUpdateToken", (...args: unknown[]) => {
    const [token, changes, options] = args as [
      TokenDocument,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    return guardMove(token, changes, options) ? undefined : false;
  });
  Hooks.on("preDeleteActiveEffect", (...args: unknown[]) => {
    const actor = proneEffect(args[0] as ActiveEffect);
    if (!actor || game.user.isGM) return undefined;
    return actionGate(actor, FULL_ACTION) ? undefined : false;
  });
  Hooks.on("deleteActiveEffect", (...args: unknown[]) => {
    const [effect, , userId] = args as [ActiveEffect, unknown, string];
    const actor = proneEffect(effect);
    if (actor && userId === game.user.id) void chargeAction(actor, FULL_ACTION);
  });
  for (const hook of [
    "updateCombat",
    "updateCombatant",
    "deleteCombat",
    "createCombatant",
    "deleteCombatant",
  ] as const) {
    Hooks.on(hook, () => onBudgetChange());
  }
}
