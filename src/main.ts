import { createApi } from "./api";
import { MODULE_ID, SYSTEM_ID, TESTED_SYSTEM_VERSION } from "./constants";
import { checkSystemCompatibility } from "./domain/compatibility";
import { initGmExecutor } from "./integrations/foundry/gm-executor";
import { initSocket } from "./integrations/foundry/socket";
import { bindResolutionCards, RESOLUTION_TEMPLATE } from "./ui/resolution-card";
import { undoDamage } from "./workflows/attack";
import { initDefense } from "./workflows/defense";

Hooks.once("init", () => {
  void loadTemplates([RESOLUTION_TEMPLATE]);
  bindResolutionCards(undoDamage);
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
  initDefense();
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = createApi();
  console.info(`${MODULE_ID} | ${game.i18n.localize("CCK.Ready")}`);
});
