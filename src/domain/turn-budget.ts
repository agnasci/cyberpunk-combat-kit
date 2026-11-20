export type EconomyMode = "off" | "track" | "enforce";
export type BudgetProblem = "no-action" | "no-move" | "prone" | "run-needs-action";

export interface TurnBudget {
  round: number;
  moved: number;
  halves: number;
  ran: boolean;
}

export type MoveCheck =
  | { ok: true; budget: TurnBudget; running: boolean }
  | { ok: false; problem: BudgetProblem; canRun: boolean };

export const FULL_ACTION = 2;
export const ECONOMY_MODES: readonly EconomyMode[] = ["off", "track", "enforce"];

export function economyMode(value: unknown): EconomyMode {
  return ECONOMY_MODES.find((mode) => mode === value) ?? "enforce";
}

export function freshBudget(round: number): TurnBudget {
  return { round, moved: 0, halves: 0, ran: false };
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function budgetFor(stored: unknown, round: number): TurnBudget {
  if (stored === null || typeof stored !== "object") return freshBudget(round);
  const data = stored as Record<string, unknown>;
  if (data.round !== round) return freshBudget(round);
  return {
    round,
    moved: count(data.moved),
    halves: Math.min(FULL_ACTION, count(data.halves)),
    ran: data.ran === true,
  };
}

export function moveAllowance(move: number, budget: TurnBudget): number {
  return Math.max(0, move) * (budget.ran ? 2 : 1);
}

export function actionLeft(budget: TurnBudget): number {
  return FULL_ACTION - budget.halves;
}

export function attackCost(mode: string, rof: number): number {
  return mode === "single" && rof >= 2 ? 1 : FULL_ACTION;
}

export function spendAction(budget: TurnBudget, cost: number): TurnBudget | "no-action" {
  if (cost > actionLeft(budget)) return "no-action";
  return { ...budget, halves: budget.halves + cost };
}

export function forceSpend(budget: TurnBudget, cost: number): TurnBudget {
  return { ...budget, halves: Math.min(FULL_ACTION, budget.halves + cost) };
}

export function run(budget: TurnBudget): TurnBudget | "run-needs-action" {
  if (budget.ran || budget.halves > 0) return "run-needs-action";
  return { ...budget, halves: FULL_ACTION, ran: true };
}

export function checkMove(
  budget: TurnBudget,
  move: number,
  squares: number,
  prone: boolean,
): MoveCheck {
  if (squares <= 0) return { ok: true, budget, running: false };
  if (prone) return { ok: false, problem: "prone", canRun: false };
  const total = budget.moved + squares;
  if (total <= moveAllowance(move, budget)) {
    return { ok: true, budget: { ...budget, moved: total }, running: false };
  }
  const ran = run(budget);
  const canRun = ran !== "run-needs-action" && total <= moveAllowance(move, ran);
  return { ok: false, problem: "no-move", canRun };
}

export function runAndMove(budget: TurnBudget, squares: number): TurnBudget | "run-needs-action" {
  const ran = run(budget);
  return ran === "run-needs-action" ? ran : { ...ran, moved: ran.moved + squares };
}

export function squaresMoved(dx: number, dy: number, size: number, gridless: boolean): number {
  if (size <= 0) return 0;
  const squares = gridless
    ? Math.hypot(dx, dy) / size
    : Math.max(Math.abs(dx), Math.abs(dy)) / size;
  return gridless ? Math.ceil(squares - 0.05) : Math.round(squares);
}

export interface TurnPlate {
  segments: number;
  base: number;
  used: number;
  left: number;
  over: boolean;
  action: number;
}

export function turnPlate(move: number, budget: TurnBudget): TurnPlate {
  const base = Math.max(0, move);
  const allowance = moveAllowance(move, budget);
  const segments = Math.max(allowance, base);
  return {
    segments,
    base,
    used: Math.min(budget.moved, segments),
    left: Math.max(0, allowance - budget.moved),
    over: budget.moved > allowance,
    action: actionLeft(budget),
  };
}
