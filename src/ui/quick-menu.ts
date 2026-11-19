import { moveFocus, type MenuAction, type MenuEntry, type MenuText } from "../domain/menu";

export interface QuickMenuView {
  title: string;
  subtitle: string | null;
  entries: MenuEntry[];
}

const MARGIN = 8;

function text(value: MenuText): string {
  return value.data ? game.i18n.format(value.key, value.data) : game.i18n.localize(value.key);
}

function span(className: string, content: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = content;
  return element;
}

function itemButton(entry: MenuEntry): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cck-menu__item";
  button.setAttribute("role", "menuitem");
  button.append(span("cck-menu__label", text(entry.label)));
  const note =
    entry.disabled && entry.disabled.key !== entry.label.key ? entry.disabled : entry.hint;
  if (note) button.append(span("cck-menu__hint", text(note)));
  if (entry.disabled) {
    button.setAttribute("aria-disabled", "true");
    button.classList.add("cck-menu__item--disabled");
  }
  if (entry.children.length > 0) {
    button.setAttribute("aria-haspopup", "menu");
    button.classList.add("cck-menu__item--group");
  }
  return button;
}

function clampInto(menu: HTMLElement, x: number, y: number): void {
  const { width, height } = menu.getBoundingClientRect();
  const left = Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN));
  const top = Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

export function openQuickMenu(
  view: QuickMenuView,
  position: { x: number; y: number },
  choose: (action: MenuAction) => void,
): () => void {
  const previousFocus = document.activeElement;
  const menu = document.createElement("nav");
  menu.className = "cck-menu";
  menu.setAttribute("aria-label", view.title);
  const header = document.createElement("header");
  header.className = "cck-menu__header";
  header.append(span("cck-menu__title", view.title));
  if (view.subtitle) header.append(span("cck-menu__subtitle", view.subtitle));
  const list = document.createElement("div");
  list.className = "cck-menu__list";
  list.setAttribute("role", "menu");
  menu.append(header, list);

  const stack: { entries: MenuEntry[]; parent: MenuEntry | null; focus: number }[] = [
    { entries: view.entries, parent: null, focus: 0 },
  ];
  let rows: { button: HTMLButtonElement; entry: MenuEntry | null }[] = [];
  let focus = -1;
  let closed = false;

  const enabled = () => rows.map((row) => row.entry === null || row.entry.disabled === null);
  const setFocus = (index: number) => {
    focus = index;
    rows[index]?.button.focus();
  };
  const render = (initial: number) => {
    const level = stack[stack.length - 1];
    if (!level) return;
    list.replaceChildren();
    rows = [];
    if (level.parent) {
      const back = itemButton({
        id: "back",
        label: level.parent.label,
        hint: null,
        disabled: null,
        action: null,
        children: [],
      });
      back.classList.add("cck-menu__item--back");
      rows.push({ button: back, entry: null });
    }
    for (const entry of level.entries) rows.push({ button: itemButton(entry), entry });
    rows.forEach((row, index) => {
      row.button.addEventListener("click", () => activate(index));
      row.button.addEventListener("pointerenter", () => {
        if (enabled()[index]) setFocus(index);
      });
      list.append(row.button);
    });
    clampInto(menu, position.x, position.y);
    const flags = enabled();
    setFocus(flags[initial] ? initial : moveFocus(initial, flags, 1));
  };
  const back = () => {
    if (stack.length <= 1) return close();
    stack.pop();
    render(stack[stack.length - 1]?.focus ?? 0);
  };
  const activate = (index: number) => {
    const row = rows[index];
    if (!row) return;
    if (!row.entry) return back();
    const entry = row.entry;
    if (entry.disabled) return;
    if (entry.children.length > 0) {
      const level = stack[stack.length - 1];
      if (level) level.focus = index;
      stack.push({ entries: entry.children, parent: entry, focus: 0 });
      return render(1);
    }
    if (entry.action) {
      const action = entry.action;
      close();
      choose(action);
    }
  };
  const keydown = (event: KeyboardEvent) => {
    event.stopPropagation();
    const target = rows.findIndex((row) => row.button === event.target);
    if (target >= 0) focus = target;
    const flags = enabled();
    switch (event.key) {
      case "ArrowDown":
      case "Tab":
        event.preventDefault();
        return setFocus(moveFocus(focus, flags, event.shiftKey && event.key === "Tab" ? -1 : 1));
      case "ArrowUp":
        event.preventDefault();
        return setFocus(moveFocus(focus, flags, -1));
      case "Home":
        event.preventDefault();
        return setFocus(moveFocus(-1, flags, 1));
      case "End":
        event.preventDefault();
        return setFocus(moveFocus(flags.length, flags, -1));
      case "ArrowRight":
        event.preventDefault();
        if (rows[focus]?.entry?.children.length) activate(focus);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        return activate(focus);
      case "ArrowLeft":
      case "Backspace":
        event.preventDefault();
        if (stack.length > 1) back();
        return;
      case "Escape":
        event.preventDefault();
        return back();
    }
  };
  const outside = (event: PointerEvent) => {
    if (!menu.contains(event.target as Node | null)) close();
  };
  const blockContext = (event: Event) => event.preventDefault();
  const teardown = Hooks.on("canvasTearDown", () => close());
  const pan = Hooks.on("canvasPan", () => close());

  function close(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener("pointerdown", outside, true);
    window.removeEventListener("resize", close);
    Hooks.off("canvasTearDown", teardown);
    Hooks.off("canvasPan", pan);
    const hadFocus = menu.contains(document.activeElement);
    menu.remove();
    if (!hadFocus) return;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  menu.addEventListener("keydown", keydown);
  menu.addEventListener("contextmenu", blockContext);
  document.addEventListener("pointerdown", outside, true);
  window.addEventListener("resize", close);
  document.body.append(menu);
  render(0);
  return close;
}
