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
  setTargetMarkerListener,
  setTurnListener,
  settingsMenuType,
} from "./integrations/foundry/settings";
import { registerPackSettings } from "./integrations/foundry/pack-store";
import { initSocket } from "./integrations/foundry/socket";
import { initTargetMarker, refreshTargetMarkers } from "./integrations/foundry/target-marker";
import { initTurnIndicator, refreshTurnIndicator } from "./integrations/foundry/turn-indicator";
import { openCueEditor } from "./ui/cue-editor";
import { openPackManager } from "./ui/pack-manager";
import { bindResolutionCards, RESOLUTION_TEMPLATE } from "./ui/resolution-card";
import { detonatePending } from "./workflows/area";
import { undoTarget } from "./workflows/combat-common";
import { initDefense } from "./workflows/defense";
import { initFxPreload } from "./workflows/fx-preload";
import { initStatusEffects } from "./workflows/status-fx";
import { initPanelSlots } from "./workflows/panel-slots";
import { initQuickMenu, registerQuickFireTool } from "./workflows/quick-menu";
import { availableQuickhacks, initQuickhacks } from "./workflows/quickhack";
import { initNpcDeathSaves } from "./workflows/npc-death-saves";
import { initTurnAttention, refreshTurnAttention } from "./workflows/turn-attention";
import { initTurnEconomy, setBudgetListener } from "./workflows/turn-economy";

Hooks.once("init", () => {
  registerEffectSettings();
  registerMenuSettings();
  setTargetMarkerListener(refreshTargetMarkers);
  setTurnListener(() => {
    refreshTurnIndicator();
    refreshTurnAttention();
    ui.combat?.render();
  });
  setBudgetListener(() => {
    refreshTurnIndicator();
    refreshTargetMarkers();
  });
  registerQuickFireTool();
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
  initStatusEffects();
  initFxPreload();
  void initPacks();
  initQuickMenu();
  initQuickhacks();
  initPanelSlots();
  initTargetMarker();
  initTurnEconomy();
  initNpcDeathSaves();
  initTurnAttention();
  initTurnIndicator();
  Hooks.on("canvasReady", () => refreshTurnIndicator());
  Hooks.on("updateActor", () => refreshTurnIndicator());
  void preloadDvTables();
  void removeLeftoverAreas();
  const module = game.modules.get(MODULE_ID);
  const api = createApi();
  if (module) module.api = api;
  Hooks.callAll("cckReady", api);
  console.info(`${MODULE_ID} | ${game.i18n.localize("CCK.Ready")}`);
});
