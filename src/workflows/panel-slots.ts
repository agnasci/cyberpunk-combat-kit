import { canReload, drawerSections, type MenuAction, type MenuText } from "../domain/menu";
import { pickWeapon, weaponsOf, type WeaponSnapshot } from "../integrations/cpr/weapon-adapter";
import {
  connectPanel,
  type PanelApi,
  type PanelSlotContext,
  type PanelSubject,
} from "../integrations/panel/panel-bridge";
import { singleTarget } from "../integrations/foundry/tokens";
import { skipRollDialogs } from "../integrations/foundry/settings";
import { attack } from "./attack";
import { warn } from "./combat-common";
import { menuViewFor, openMenuFor, reloadFor, runMenuAction } from "./quick-menu";

const RERENDER_MS = 120;
const TOOLTIP_CLASS = "cck-tooltip";

let drawerActions = new Map<string, MenuAction>();
let drawerGeneration = 0;

function text(value: MenuText): string {
  return value.data ? game.i18n.format(value.key, value.data) : game.i18n.localize(value.key);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  content?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function iconButton(action: string, icon: string, label: string): HTMLButtonElement {
  const button = element("button", "cck-pslot__icon");
  button.type = "button";
  button.dataset.slotAction = action;
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
  button.dataset.tooltipClass = TOOLTIP_CLASS;
  button.dataset.tooltipDirection = "UP";
  button.innerHTML = `<i class="${icon}" aria-hidden="true"></i>`;
  return button;
}

function tokenFor(subject: PanelSubject | null): Token | null {
  if (!subject) return null;
  const placeables = canvas?.tokens?.placeables ?? [];
  const byToken = subject.token
    ? placeables.find((token) => token.document.id === subject.token?.id)
    : undefined;
  return byToken ?? placeables.find((token) => token.actor?.uuid === subject.actor.uuid) ?? null;
}

function ensureControlled(subject: PanelSubject | null): boolean {
  const token = tokenFor(subject);
  if (!token) {
    warn("CCK.Panel.NoToken");
    return false;
  }
  if (!token.controlled) token.control({ releaseOthers: true });
  return true;
}

function activeWeapon(subject: PanelSubject | null): WeaponSnapshot | null {
  return subject ? pickWeapon(subject.actor) : null;
}

function renderBarEnd(context: PanelSlotContext): Node | null {
  const weapon = activeWeapon(context.subject);
  if (!weapon) return null;
  const button = element("button", "cck-pslot__weapon");
  button.type = "button";
  button.dataset.slotAction = "attack";
  button.dataset.tooltip = game.i18n.format("CCK.Panel.AttackWith", { weapon: weapon.name });
  button.dataset.tooltipClass = TOOLTIP_CLASS;
  button.dataset.tooltipDirection = "UP";
  if (weapon.img) {
    const icon = element("img", "");
    icon.src = weapon.img;
    icon.alt = "";
    button.append(icon);
  } else {
    button.innerHTML = `<i class="fa-solid fa-crosshairs" aria-hidden="true"></i>`;
  }
  button.append(element("span", "cck-pslot__weapon-name", weapon.name));
  if (weapon.magazine !== null) {
    const empty = weapon.magazine < 1 ? " cck-pslot__ammo--empty" : "";
    button.append(
      element("span", `cck-pslot__ammo${empty}`, `${weapon.magazine}/${weapon.magazineMax}`),
    );
  }
  return button;
}

function renderQuick(context: PanelSlotContext): Node | null {
  if (!context.subject) return null;
  const box = element("div", "cck-pslot__quick");
  if (activeWeapon(context.subject)) {
    box.append(
      iconButton("choose", "fa-solid fa-crosshairs", game.i18n.localize("CCK.Panel.Attack")),
    );
  }
  const weapon = activeWeapon(context.subject);
  if (weapon && canReload(weapon)) {
    box.append(
      iconButton(
        "reload",
        "fa-solid fa-rotate",
        game.i18n.format("CCK.Panel.Reload", { weapon: weapon.name }),
      ),
    );
  }
  box.append(iconButton("menu", "fa-solid fa-bars", game.i18n.localize("CCK.Panel.Menu")));
  return box;
}

function itemButton(path: string, label: string, hint: string | null, enabled: boolean) {
  const button = element("button", "cck-pslot__item");
  button.type = "button";
  button.append(element("span", "cck-pslot__label", label));
  if (hint) button.append(element("span", "cck-pslot__hint", hint));
  if (enabled) button.dataset.slotAction = path;
  else button.disabled = true;
  return button;
}

async function fillDrawer(box: HTMLElement, generation: number): Promise<void> {
  const target = singleTarget();
  if (typeof target === "string") {
    box.replaceChildren(element("p", "cck-pslot__empty", game.i18n.localize("CCK.Panel.NoTarget")));
    return;
  }
  const view = await menuViewFor(target);
  if (generation !== drawerGeneration) return;
  const actions = new Map<string, MenuAction>();
  const head = element("header", "cck-pslot__head");
  head.append(element("strong", "", view.title));
  if (view.subtitle) head.append(element("span", "cck-pslot__hint", view.subtitle));
  const nodes: Node[] = [head];
  for (const section of drawerSections(view.entries)) {
    const group = element("section", "cck-pslot__section");
    if (section.title) {
      const title = element("h3", "");
      if (section.icon) {
        const icon = element("img", "");
        icon.src = section.icon;
        icon.alt = "";
        title.append(icon);
      }
      title.append(text(section.title));
      group.append(title);
    }
    const grid = element("div", "cck-pslot__grid");
    for (const item of section.items) {
      const path = `item:${item.id}`;
      if (item.action) actions.set(path, item.action);
      const note =
        item.disabled && item.disabled.key !== item.label.at(-1)?.key ? item.disabled : item.hint;
      grid.append(
        itemButton(path, item.label.map(text).join(" · "), note ? text(note) : null, !!item.action),
      );
    }
    group.append(grid);
    nodes.push(group);
  }
  drawerActions = actions;
  box.dataset.target = target.document.uuid;
  box.replaceChildren(...nodes);
}

function renderDrawer(): Node {
  const box = element("div", "cck-pslot__drawer");
  box.append(element("p", "cck-pslot__empty", "…"));
  const generation = ++drawerGeneration;
  void fillDrawer(box, generation);
  return box;
}

function attackWith(subject: PanelSubject | null): void {
  const weapon = activeWeapon(subject);
  if (!weapon || !ensureControlled(subject)) return;
  void attack({ weaponId: weapon.id, mode: "single", skipDialog: skipRollDialogs() });
}

function reloadActive(subject: PanelSubject | null): void {
  const weapon = activeWeapon(subject);
  if (subject && weapon) void reloadFor(subject.actor, weapon.id);
}

function quickAttack(subject: PanelSubject | null, event: Event): void {
  const equipped = subject ? weaponsOf(subject.actor).filter((weapon) => weapon.equipped) : [];
  if (equipped.length > 1) return openMenu(subject, event);
  attackWith(subject);
}

function openMenu(subject: PanelSubject | null, event: Event): void {
  const target = singleTarget();
  if (typeof target === "string") return warn(`CCK.Attack.${target}`);
  if (!ensureControlled(subject)) return;
  const source = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const box =
    (event.target as HTMLElement | null)?.getBoundingClientRect() ??
    source?.getBoundingClientRect();
  void openMenuFor(target, { x: box?.left ?? 0, y: (box?.top ?? 0) - 8 });
}

function onAction(action: string, event: Event, context: PanelSlotContext): void {
  if (action === "attack") return attackWith(context.subject);
  if (action === "choose") return quickAttack(context.subject, event);
  if (action === "menu") return openMenu(context.subject, event);
  if (action === "reload") return reloadActive(context.subject);
  const menuAction = drawerActions.get(action);
  const target = singleTarget();
  if (!menuAction || typeof target === "string") return;
  if (!ensureControlled(context.subject)) return;
  void runMenuAction(menuAction, target);
}

function watch(api: PanelApi): void {
  const rerender = foundry.utils.debounce(
    () => api.requestRender(["bar-end", "quick", "drawer"]),
    RERENDER_MS,
  );
  const relevant = (actor: Actor | null | undefined) => {
    const subject = api.getSubject();
    return !!actor && !!subject && actor.uuid === subject.actor.uuid;
  };
  Hooks.on("targetToken", (user) => {
    if ((user as User).id === game.user.id) rerender();
  });
  Hooks.on("controlToken", () => rerender());
  Hooks.on("updateToken", () => rerender());
  Hooks.on("updateItem", (item) => {
    if (relevant((item as { parent?: Actor | null }).parent)) rerender();
  });
  Hooks.on("updateActor", (actor) => {
    if (relevant(actor as Actor)) rerender();
  });
}

export function initPanelSlots(): void {
  connectPanel((api) => {
    api.registerSlot({
      id: "cck-weapon",
      region: "bar-end",
      order: 10,
      render: renderBarEnd,
      onAction,
    });
    api.registerSlot({
      id: "cck-quick",
      region: "quick",
      order: 10,
      render: renderQuick,
      onAction,
    });
    api.registerSlot({
      id: "cck-drawer",
      region: "drawer",
      order: 10,
      label: game.i18n.localize("CCK.Panel.Combat"),
      icon: "fa-solid fa-crosshairs",
      render: renderDrawer,
      onAction,
    });
    watch(api);
  });
}
