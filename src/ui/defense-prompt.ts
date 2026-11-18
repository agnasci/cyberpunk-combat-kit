export type DefensePurpose = "ranged" | "melee" | "area" | "suppression" | "grapple";

export interface DefensePromptData {
  purpose: DefensePurpose;
  optional: boolean;
  attackerName: string;
  defenderName: string;
  weaponName: string;
  dv: number | null;
}

const HINTS: Record<DefensePurpose, string> = {
  ranged: "CCK.Defense.RangedHint",
  melee: "CCK.Defense.MeleeHint",
  area: "CCK.Defense.AreaHint",
  suppression: "CCK.Defense.SuppressionHint",
  grapple: "CCK.Defense.GrappleHint",
};

function escape(text: string): string {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function format(key: string, data: Record<string, string>): string {
  const safe = Object.fromEntries(
    Object.entries(data).map(([name, value]) => [name, escape(value)]),
  );
  return game.i18n.format(key, safe);
}

export async function askDefense(data: DefensePromptData): Promise<boolean> {
  const intro = format("CCK.Defense.Intro", {
    attacker: data.attackerName,
    defender: data.defenderName,
    weapon: data.weaponName,
  });
  const detail = format(HINTS[data.purpose], { dv: String(data.dv ?? "?") });
  const buttons = data.optional
    ? [
        { action: "roll", label: game.i18n.localize("CCK.Defense.Dodge"), default: true },
        { action: "skip", label: game.i18n.localize("CCK.Defense.NoDodge") },
      ]
    : [{ action: "roll", label: game.i18n.localize("CCK.Defense.RollDefense"), default: true }];
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("CCK.Defense.Title") },
    content: `<div class="cck-defense"><p>${intro}</p><p>${detail}</p></div>`,
    buttons,
    rejectClose: false,
  });
  return choice === "roll";
}
