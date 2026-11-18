const ALL_ACTIONS_KEY = "bonuses.allActions";
const ADD_MODE = 2;
const MISC_CATEGORY = "misc";

function marked(
  effect: { getFlag(scope: string, key: string): unknown },
  scope: string,
  flag: string,
) {
  return effect.getFlag(scope, flag) === true;
}

export async function addAllActionsPenalty(
  actor: Actor,
  options: { name: string; value: number; scope: string; flag: string },
): Promise<void> {
  if (actor.effects.some((effect) => marked(effect, options.scope, options.flag))) return;
  await actor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: options.name,
      img: "icons/svg/net.svg",
      changes: [{ key: ALL_ACTIONS_KEY, mode: ADD_MODE, value: String(options.value) }],
      flags: {
        [options.scope]: { [options.flag]: true },
        [game.system.id]: {
          changes: {
            cats: [MISC_CATEGORY],
            situational: [{ isSituational: false, onByDefault: false }],
          },
        },
      },
    },
  ]);
}

export async function removeMarkedEffects(
  actor: Actor,
  scope: string,
  flag: string,
): Promise<void> {
  const ids = actor.effects
    .filter((effect) => marked(effect, scope, flag))
    .map((effect) => effect.id);
  if (ids.length > 0) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}
