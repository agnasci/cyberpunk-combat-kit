import { MODULE_ID } from "../constants";
import type { AttackKind, Defense } from "../domain/attack-rules";
import { isUndoable, type DamageResult } from "../domain/gm-request";
import type { CardAudience } from "../domain/routing";
import { gmRecipients } from "../integrations/foundry/users";

export const RESOLUTION_TEMPLATE = `modules/${MODULE_ID}/templates/resolution-card.hbs`;
const FLAG = "resolution";

export interface ResolutionDamage {
  total: number;
  critical: boolean;
  applied: DamageResult | null;
  error: string | null;
}

export interface ResolutionState {
  attackerUuid: string;
  attackerName: string;
  targetUuid: string;
  targetName: string;
  weaponName: string;
  kind: AttackKind;
  distance: number | null;
  attackTotal: number;
  defense: Defense;
  hit: boolean;
  damage: ResolutionDamage | null;
  undone: boolean;
}

const DEFENSE_LABELS: Record<Defense["kind"], string> = {
  dv: "CCK.Card.DefenseDv",
  dodge: "CCK.Card.DefenseDodge",
  evasion: "CCK.Card.DefenseEvasion",
};

function renderState(state: ResolutionState): Promise<string> {
  return renderTemplate(RESOLUTION_TEMPLATE, {
    ...state,
    distance: state.distance === null ? null : Math.round(state.distance * 10) / 10,
    defenseLabel: DEFENSE_LABELS[state.defense.kind],
    defenseValue: state.defense.kind === "dv" ? state.defense.value : state.defense.total,
    canUndo: !state.undone && isUndoable(state.damage?.applied ?? null),
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
  return state && typeof state.attackerUuid === "string" ? state : null;
}

export async function markUndone(message: ChatMessage, state: ResolutionState): Promise<void> {
  const next = { ...state, undone: true };
  await message.update({
    content: await renderState(next),
    [`flags.${MODULE_ID}.${FLAG}`]: next,
  });
}

export type UndoHandler = (message: ChatMessage, state: ResolutionState) => Promise<void>;

function rootOf(html: JQuery | HTMLElement): HTMLElement | undefined {
  return html instanceof HTMLElement ? html : html[0];
}

export function bindResolutionCards(onUndo: UndoHandler): void {
  Hooks.on("renderChatMessage", (message, html) => {
    const state = resolutionOf(message);
    const button = rootOf(html)?.querySelector<HTMLButtonElement>("[data-cck-action='undo']");
    if (!state || !button) return;
    if (!game.user.isGM && !message.isOwner) {
      button.remove();
      return;
    }
    button.addEventListener("click", () => {
      button.disabled = true;
      void onUndo(message, state).finally(() => {
        button.disabled = false;
      });
    });
  });
}
