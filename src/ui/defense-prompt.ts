import type { AttackKind } from "../domain/attack-rules";

export type DefenseChoice = "dodge" | "none";

export interface DefensePromptData {
  attackerName: string;
  defenderName: string;
  weaponName: string;
  kind: AttackKind;
  dv: number | null;
}

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

export async function askDefense(data: DefensePromptData): Promise<DefenseChoice> {
  const intro = format("CCK.Defense.Intro", {
    attacker: data.attackerName,
    defender: data.defenderName,
    weapon: data.weaponName,
  });
  const detail =
    data.kind === "melee"
      ? game.i18n.localize("CCK.Defense.MeleeHint")
      : format("CCK.Defense.RangedHint", { dv: String(data.dv ?? "?") });
  const buttons =
    data.kind === "melee"
      ? [{ action: "dodge", label: game.i18n.localize("CCK.Defense.RollDefense"), default: true }]
      : [
          { action: "dodge", label: game.i18n.localize("CCK.Defense.Dodge"), default: true },
          { action: "none", label: game.i18n.localize("CCK.Defense.NoDodge") },
        ];
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("CCK.Defense.Title") },
    content: `<div class="cck-defense"><p>${intro}</p><p>${detail}</p></div>`,
    buttons,
    rejectClose: false,
  });
  return choice === "dodge" ? "dodge" : "none";
}
