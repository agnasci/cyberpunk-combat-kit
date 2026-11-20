export interface TurnBadge {
  combatantId: string;
  move: string;
  action: number;
  over: boolean;
}

function diamond(action: number): string {
  const state = action >= 2 ? "full" : action === 1 ? "half" : "spent";
  return `<span class="cck-turn-badge__action cck-turn-badge__action--${state}"></span>`;
}

export function decorateTracker(
  root: HTMLElement,
  badges: TurnBadge[],
  canReset: boolean,
  onReset: (combatantId: string) => void,
): void {
  root.querySelectorAll(".cck-turn-badge").forEach((element) => element.remove());
  for (const badge of badges) {
    const row = root.querySelector(`li.combatant[data-combatant-id="${badge.combatantId}"]`);
    const anchor = row?.querySelector(".token-name") ?? row;
    if (!anchor) continue;
    const element = document.createElement("div");
    element.className = `cck-turn-badge${badge.over ? " cck-turn-badge--over" : ""}`;
    element.innerHTML = `<span class="cck-turn-badge__move">${badge.move}</span>${diamond(badge.action)}`;
    element.title = game.i18n.localize(canReset ? "CCK.Turn.BadgeReset" : "CCK.Turn.Badge");
    if (canReset) {
      element.classList.add("cck-turn-badge--reset");
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onReset(badge.combatantId);
      });
    }
    anchor.append(element);
  }
}
