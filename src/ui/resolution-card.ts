import { MODULE_ID } from "../constants";
import type { Defense } from "../domain/attack-rules";
import { isUndoable, type DamageResult } from "../domain/gm-request";
import type { CardAudience } from "../domain/routing";
import { gmRecipients } from "../integrations/foundry/users";

export const RESOLUTION_TEMPLATE = `modules/${MODULE_ID}/templates/resolution-card.hbs`;
const FLAG = "resolution";
const STATE_VERSION = 2;

export type Outcome =
  "hit" | "miss" | "dodged" | "resisted" | "seek-cover" | "no-answer" | "won" | "lost" | "applied";

export interface TargetResult {
  uuid: string;
  name: string;
  defense: Defense | null;
  outcome: Outcome;
  applied: DamageResult | null;
  error: string | null;
  effect: string | null;
  undone: boolean;
}

export interface PendingDetonation {
  center: { x: number; y: number };
  attackerTokenUuid: string;
  weaponId: string;
  attackTotal: number;
}

export interface ResolutionState {
  version: typeof STATE_VERSION;
  attackerUuid: string;
  attackerName: string;
  weaponName: string;
  mode: string;
  distance: number | null;
  attackTotal: number | null;
  dv: number | null;
  damageTotal: number | null;
  multiplier: number | null;
  critical: boolean;
  notes: string[];
  targets: TargetResult[];
  pending: PendingDetonation | null;
}

const DEFENSE_LABELS: Record<Defense["kind"], string> = {
  dv: "CCK.Card.DefenseDv",
  dodge: "CCK.Card.DefenseDodge",
  evasion: "CCK.Card.DefenseEvasion",
  resist: "CCK.Card.DefenseResist",
  contest: "CCK.Card.DefenseContest",
};

const BAD_FOR_TARGET: readonly Outcome[] = ["hit", "seek-cover", "lost", "applied"];

export function newState(
  base: Omit<ResolutionState, "version" | "notes" | "targets" | "pending"> &
    Partial<Pick<ResolutionState, "notes" | "targets" | "pending">>,
): ResolutionState {
  return {
    version: STATE_VERSION,
    notes: [],
    targets: [],
    pending: null,
    ...base,
  };
}

function targetView(target: TargetResult) {
  const defense = target.defense;
  return {
    ...target,
    tone: BAD_FOR_TARGET.includes(target.outcome) ? "bad" : "good",
    outcomeLabel: `CCK.Outcome.${target.outcome}`,
    defenseLabel: defense ? DEFENSE_LABELS[defense.kind] : null,
    defenseValue: defense ? (defense.kind === "dv" ? defense.value : defense.total) : null,
    canUndo: !target.undone && isUndoable(target.applied),
  };
}

function renderState(state: ResolutionState): Promise<string> {
  return renderTemplate(RESOLUTION_TEMPLATE, {
    ...state,
    modeLabel: `CCK.Mode.${state.mode}`,
    distance: state.distance === null ? null : Math.round(state.distance * 10) / 10,
    targets: state.targets.map(targetView),
    canDetonate: state.pending !== null,
  });
}

export async function postResolutionCard(
  state: ResolutionState,
  speaker: unknown,
  audience: CardAudience,
): Promise<void> {
  await ChatMessage.create({
    content: await renderState(state),
    speaker,
    whisper: audience === "gm" ? gmRecipients() : [],
    flags: { [MODULE_ID]: { [FLAG]: state } },
  });
}

export function resolutionOf(message: ChatMessage): ResolutionState | null {
  const state = message.getFlag(MODULE_ID, FLAG) as ResolutionState | undefined;
  return state?.version === STATE_VERSION && Array.isArray(state.targets) ? state : null;
}

export async function updateCard(message: ChatMessage, state: ResolutionState): Promise<void> {
  await message.update({
    content: await renderState(state),
    [`flags.${MODULE_ID}.${FLAG}`]: state,
  });
}

export interface CardHandlers {
  undo(message: ChatMessage, state: ResolutionState, index: number): Promise<void>;
  detonate(message: ChatMessage, state: ResolutionState): Promise<void>;
}

function rootOf(html: JQuery | HTMLElement): HTMLElement | undefined {
  return html instanceof HTMLElement ? html : html[0];
}

function bindButton(button: HTMLButtonElement, action: () => Promise<void>): void {
  button.addEventListener("click", () => {
    button.disabled = true;
    void action().finally(() => {
      button.disabled = false;
    });
  });
}

export function bindResolutionCards(handlers: CardHandlers): void {
  Hooks.on("renderChatMessage", (message, html) => {
    const state = resolutionOf(message);
    const root = rootOf(html);
    if (!state || !root) return;
    const canEdit = game.user.isGM || message.isOwner;
    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-cck-action='undo']")) {
      if (!canEdit) {
        button.remove();
        continue;
      }
      const index = Number(button.dataset.cckIndex);
      bindButton(button, () => handlers.undo(message, state, index));
    }
    const detonate = root.querySelector<HTMLButtonElement>("[data-cck-action='detonate']");
    if (!detonate) return;
    if (!game.user.isGM) detonate.remove();
    else bindButton(detonate, () => handlers.detonate(message, state));
  });
}
