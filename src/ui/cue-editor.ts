import { COMBAT_EVENTS } from "../domain/cues";
import {
  AUTO,
  choicesFor,
  editorKeys,
  isDefaultOverride,
  SILENCE,
  type CueOverride,
  type CueSource,
} from "../domain/overrides";
import { cueSources } from "../effects/engine";
import { activePacks } from "../effects/packs";
import { cueOverrides, pickAudio, saveCueOverrides } from "../integrations/foundry/pack-store";

function t(key: string, data?: Record<string, string>): string {
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

function sourceLabel(id: string): string {
  if (id === "default") return t("CCK.Cues.SourceDefault");
  if (id === "code") return t("CCK.Cues.SourceCode");
  return activePacks().find((pack) => pack.id === id)?.title ?? id;
}

function choiceLabel(choice: string): string {
  if (choice === AUTO) return t("CCK.Cues.Auto");
  if (choice === SILENCE) return t("CCK.Cues.Silence");
  const [source = "", key = ""] = choice.split("|");
  return `${sourceLabel(source)}: ${key}`;
}

function keyLabel(key: string): { name: string; qualifier: string | null } {
  const [event = key, qualifier] = key.split(":");
  const known = (COMBAT_EVENTS as readonly string[]).includes(event);
  return { name: known ? t(`CCK.Event.${event}`) : event, qualifier: qualifier ?? null };
}

function row(
  key: string,
  override: CueOverride,
  sources: readonly CueSource[],
  update: (next: CueOverride) => void,
): HTMLTableRowElement {
  const tr = document.createElement("tr");
  const label = keyLabel(key);
  const name = document.createElement("td");
  name.className = "cck-cues__key";
  name.textContent = label.name;
  if (label.qualifier) {
    const small = document.createElement("small");
    small.textContent = label.qualifier;
    name.append(document.createElement("br"), small);
  }
  name.title = key;

  const select = document.createElement("select");
  select.setAttribute("aria-label", t("CCK.Cues.EffectFor", { key }));
  const choices = choicesFor(key, sources);
  if (!choices.includes(override.choice)) choices.push(override.choice);
  for (const choice of choices) {
    const option = document.createElement("option");
    option.value = choice;
    option.textContent = choiceLabel(choice);
    option.selected = choice === override.choice;
    select.append(option);
  }
  select.addEventListener("change", () => update({ ...override, choice: select.value }));
  const effect = document.createElement("td");
  effect.append(select);

  const sound = document.createElement("td");
  sound.className = "cck-cues__sound";
  const path = document.createElement("span");
  path.className = "cck-cues__path";
  path.textContent = override.sound ?? t("CCK.Cues.NoSound");
  path.title = override.sound ?? "";
  const pick = document.createElement("button");
  pick.type = "button";
  pick.title = t("CCK.Cues.PickSound");
  pick.setAttribute("aria-label", t("CCK.Cues.PickSound"));
  pick.innerHTML = `<i class="fas fa-music" aria-hidden="true"></i>`;
  pick.addEventListener("click", () => {
    void pickAudio(override.sound).then((picked) => {
      if (picked) update({ ...override, sound: picked });
    });
  });
  sound.append(path, pick);
  if (override.sound) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.title = t("CCK.Cues.ClearSound");
    clear.setAttribute("aria-label", t("CCK.Cues.ClearSound"));
    clear.innerHTML = `<i class="fas fa-times" aria-hidden="true"></i>`;
    clear.addEventListener("click", () => update({ ...override, sound: null }));
    const volume = document.createElement("input");
    volume.type = "number";
    volume.min = "0";
    volume.max = "1.5";
    volume.step = "0.05";
    volume.value = String(override.volume);
    volume.className = "cck-cues__volume";
    volume.setAttribute("aria-label", t("CCK.Cues.Volume"));
    volume.addEventListener("change", () => {
      const value = Number(volume.value);
      update({
        ...override,
        volume: Number.isFinite(value) ? Math.min(1.5, Math.max(0, value)) : 1,
      });
    });
    sound.append(clear, volume);
  }
  tr.append(name, effect, sound);
  return tr;
}

function mount(root: HTMLElement, overrides: Record<string, CueOverride>): void {
  const sources = cueSources();
  const render = () => {
    root.replaceChildren();
    const hint = document.createElement("p");
    hint.className = "cck-cues__hint";
    hint.textContent = t("CCK.Cues.Hint");
    const table = document.createElement("table");
    table.className = "cck-cues__table";
    const head = document.createElement("tr");
    for (const key of ["CCK.Cues.Event", "CCK.Cues.Effect", "CCK.Cues.Sound"]) {
      const th = document.createElement("th");
      th.textContent = t(key);
      head.append(th);
    }
    const thead = document.createElement("thead");
    thead.append(head);
    const body = document.createElement("tbody");
    for (const key of editorKeys(sources, overrides)) {
      const current = overrides[key] ?? { choice: AUTO, sound: null, volume: 1 };
      body.append(
        row(key, current, sources, (next) => {
          if (isDefaultOverride(next)) Reflect.deleteProperty(overrides, key);
          else overrides[key] = next;
          render();
        }),
      );
    }
    table.append(thead, body);
    root.append(hint, table);
  };
  render();
}

export async function openCueEditor(): Promise<void> {
  if (!game.user.isGM) return;
  const overrides = { ...cueOverrides() };
  const choice = await foundry.applications.api.DialogV2.wait({
    classes: ["cck-app"],
    window: { title: t("CCK.Cues.Title") },
    position: { width: 720 },
    content: `<div class="cck-cues"></div>`,
    buttons: [
      { action: "save", label: t("CCK.Packs.Save"), icon: "fas fa-save", default: true },
      { action: "reset", label: t("CCK.Cues.Reset"), icon: "fas fa-undo" },
      { action: "cancel", label: t("CCK.Packs.Cancel"), icon: "fas fa-times" },
    ],
    rejectClose: false,
    render: (_event, html) => {
      const root = html.querySelector<HTMLElement>(".cck-cues");
      if (!root || root.dataset.mounted) return;
      root.dataset.mounted = "true";
      mount(root, overrides);
    },
  });
  if (choice === "reset") {
    await saveCueOverrides({});
    ui.notifications.info(t("CCK.Cues.ResetDone"));
    return;
  }
  if (choice !== "save") return;
  await saveCueOverrides(overrides);
  ui.notifications.info(t("CCK.Packs.Saved"));
}
