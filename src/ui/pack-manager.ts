import {
  missingModules,
  normalizeFolder,
  type ContentPack,
  type ManifestResult,
  type PackEntry,
} from "../domain/pack";
import { codePackList } from "../effects/packs";
import {
  activeModuleIds,
  fetchManifest,
  overlappingAnimationModules,
  packEntries,
  pickFolder,
  savePackEntries,
} from "../integrations/foundry/pack-store";

interface Row extends PackEntry {
  result: ManifestResult | null;
}

function t(key: string, data?: Record<string, string>): string {
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
  const button = element("button", "cck-packs__icon");
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  const glyph = element("i", `fas ${icon}`);
  glyph.setAttribute("aria-hidden", "true");
  button.append(glyph);
  button.addEventListener("click", onClick);
  return button;
}

function missingNote(pack: ContentPack): string[] {
  const missing = missingModules(pack, activeModuleIds());
  return missing.length > 0 ? [t("CCK.Packs.Missing", { modules: missing.join(", ") })] : [];
}

export function resultLines(result: ManifestResult | null): { ok: boolean; lines: string[] } {
  if (!result) return { ok: false, lines: [t("CCK.Packs.Checking")] };
  if (!result.ok) {
    return {
      ok: false,
      lines: result.errors.map((error) => t(`CCK.Packs.Error-${error.code}`, { at: error.at })),
    };
  }
  const { pack } = result;
  return {
    ok: true,
    lines: [
      t("CCK.Packs.Summary", {
        title: pack.title,
        id: pack.id,
        version: pack.version,
        cues: String(Object.keys(pack.cues).length),
        quickhacks: String(pack.quickhacks.length),
      }),
      ...missingNote(pack),
    ],
  };
}

function statusBlock(result: ManifestResult | null): HTMLElement {
  const { ok, lines } = resultLines(result);
  const block = element("div", `cck-packs__status ${ok ? "" : "cck-packs__status--bad"}`);
  const list = element("ul", "cck-packs__lines");
  for (const line of lines.slice(0, 6)) list.append(element("li", "", line));
  if (lines.length > 6)
    list.append(element("li", "", t("CCK.Packs.More", { count: String(lines.length - 6) })));
  block.append(list);
  return block;
}

function mount(root: HTMLElement, rows: Row[]): void {
  const render = () => {
    root.replaceChildren();
    root.append(element("p", "cck-packs__hint", t("CCK.Packs.Hint")));
    const list = element("ol", "cck-packs__list");
    if (rows.length === 0) list.append(element("li", "cck-packs__empty", t("CCK.Packs.Empty")));
    rows.forEach((row, index) => {
      const item = element("li", "cck-packs__row");
      const head = element("div", "cck-packs__head");
      const label = element("label", "cck-packs__toggle");
      const box = element("input", "");
      box.type = "checkbox";
      box.checked = row.enabled;
      box.disabled = !row.result?.ok;
      box.addEventListener("change", () => {
        row.enabled = box.checked;
      });
      label.append(box, element("span", "cck-packs__folder", row.folder));
      head.append(
        label,
        iconButton("fa-arrow-up", t("CCK.Packs.Up"), () => {
          if (index === 0) return;
          rows.splice(index - 1, 0, ...rows.splice(index, 1));
          render();
        }),
        iconButton("fa-rotate", t("CCK.Packs.Recheck"), () => {
          row.result = null;
          render();
          void fetchManifest(row.folder).then((result) => {
            row.result = result;
            if (!result.ok) row.enabled = false;
            render();
          });
        }),
        iconButton("fa-trash", t("CCK.Packs.Remove"), () => {
          rows.splice(index, 1);
          render();
        }),
      );
      item.append(head, statusBlock(row.result));
      list.append(item);
    });
    const add = element("button", "cck-packs__add", t("CCK.Packs.Add"));
    add.type = "button";
    add.addEventListener("click", () => {
      void pickFolder(null).then(async (picked) => {
        const folder = picked ? normalizeFolder(picked) : null;
        if (!picked) return;
        if (!folder)
          return void ui.notifications.warn(t("CCK.Packs.Error-bad-folder", { at: picked }));
        if (rows.some((row) => row.folder === folder)) {
          return void ui.notifications.warn(t("CCK.Packs.Duplicate"));
        }
        const row: Row = { folder, enabled: false, result: null };
        rows.push(row);
        render();
        row.result = await fetchManifest(folder);
        row.enabled = row.result.ok;
        render();
      });
    });
    root.append(list, add);
    const overlapping = overlappingAnimationModules();
    if (overlapping.length > 0) {
      root.append(
        element(
          "p",
          "cck-packs__warn",
          t("CCK.Packs.Overlap", { modules: overlapping.join(", ") }),
        ),
      );
    }
    const code = codePackList();
    if (code.length > 0) {
      root.append(element("h4", "cck-packs__subtitle", t("CCK.Packs.Code")));
      const codeList = element("ul", "cck-packs__list");
      for (const pack of code) {
        const item = element("li", "cck-packs__row");
        item.append(statusBlock({ ok: true, pack }));
        codeList.append(item);
      }
      root.append(codeList);
    }
  };
  render();
}

export async function openPackManager(): Promise<void> {
  if (!game.user.isGM) return;
  const rows: Row[] = packEntries().map((entry) => ({ ...entry, result: null }));
  let refresh: (() => void) | null = null;
  void Promise.all(
    rows.map(async (row) => {
      row.result = await fetchManifest(row.folder);
      if (!row.result.ok) row.enabled = false;
    }),
  ).then(() => refresh?.());
  const choice = await foundry.applications.api.DialogV2.wait({
    classes: ["cck-app"],
    window: { title: t("CCK.Packs.Title") },
    position: { width: 560 },
    content: `<div class="cck-packs"></div>`,
    buttons: [
      { action: "save", label: t("CCK.Packs.Save"), icon: "fas fa-save", default: true },
      { action: "cancel", label: t("CCK.Packs.Cancel"), icon: "fas fa-times" },
    ],
    rejectClose: false,
    render: (_event, html) => {
      const root = html.querySelector<HTMLElement>(".cck-packs");
      if (!root || root.dataset.mounted) return;
      root.dataset.mounted = "true";
      refresh = () => mount(root, rows);
      refresh();
    },
  });
  if (choice !== "save") return;
  await savePackEntries(rows.map((row) => ({ folder: row.folder, enabled: row.enabled })));
  ui.notifications.info(t("CCK.Packs.Saved"));
}
