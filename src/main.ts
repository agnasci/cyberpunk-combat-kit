import { createApi } from "./api";
import { MODULE_ID, SYSTEM_ID, TESTED_SYSTEM_VERSION } from "./constants";
import { checkSystemCompatibility } from "./domain/compatibility";
import { initEffects } from "./effects/engine";
import { applyOverrides, initPacks, reloadPacks } from "./effects/packs";
import { removeLeftoverAreas } from "./integrations/foundry/area-placement";
import { preloadDvTables } from "./integrations/cpr/weapon-adapter";
import { initGmExecutor, setQuickhackSource } from "./integrations/foundry/gm-executor";
import {
  registerEffectSettings,
  registerMenuSettings,
  registerQuickhackSettings,
  settingsMenuType,
} from "./integrations/foundry/settings";
import { registerPackSettings } from "./integrations/foundry/pack-store";
import { initSocket } from "./integrations/foundry/socket";
import { openCueEditor } from "./ui/cue-editor";
import { openPackManager } from "./ui/pack-manager";
import { bindResolutionCards, RESOLUTION_TEMPLATE } from "./ui/resolution-card";
import { detonatePending } from "./workflows/area";
import { undoTarget } from "./workflows/combat-common";
import { initDefense } from "./workflows/defense";
import { initQuickMenu } from "./workflows/quick-menu";
import { availableQuickhacks, initQuickhacks } from "./workflows/quickhack";

Hooks.once("init", () => {
  registerEffectSettings();
  registerMenuSettings();
  registerQuickhackSettings();
  void loadTemplates([RESOLUTION_TEMPLATE]);
  bindResolutionCards({ undo: undoTarget, detonate: detonatePending });
  registerPackSettings({ packs: () => void reloadPacks(), overrides: applyOverrides });
  game.settings.registerMenu(MODULE_ID, "packManager", {
    name: "CCK.Packs.Title",
    label: "CCK.Packs.Open",
    hint: "CCK.Packs.MenuHint",
    icon: "fas fa-box-open",
    type: settingsMenuType(() => void openPackManager()),
    restricted: true,
  });
  game.settings.registerMenu(MODULE_ID, "cueEditor", {
    name: "CCK.Cues.Title",
    label: "CCK.Cues.Open",
    hint: "CCK.Cues.MenuHint",
    icon: "fas fa-sliders",
    type: settingsMenuType(() => void openCueEditor()),
    restricted: true,
  });
});

Hooks.once("ready", () => {
  const result = checkSystemCompatibility(game.system, SYSTEM_ID, TESTED_SYSTEM_VERSION);
  if (result.status === "wrong-system") {
    console.warn(`${MODULE_ID} | ${game.i18n.localize("CCK.Compat.WrongSystem")}`);
    return;
  }
  if (result.status === "untested-version") {
    console.warn(
      `${MODULE_ID} | ${game.i18n.format("CCK.Compat.UntestedVersion", {
        tested: result.tested,
        found: result.found,
      })}`,
    );
  }
  initSocket();
  initGmExecutor();
  setQuickhackSource(availableQuickhacks);
  initDefense();
  initEffects();
  void initPacks();
  initQuickMenu();
  initQuickhacks();
  void preloadDvTables();
  void removeLeftoverAreas();
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = createApi();
  console.info(`${MODULE_ID} | ${game.i18n.localize("CCK.Ready")}`);
});
