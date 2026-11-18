export function showPlacementHint(key: string): () => void {
  const hint = document.createElement("aside");
  hint.className = "cck-placement";
  hint.setAttribute("role", "status");
  const title = document.createElement("strong");
  title.textContent = game.i18n.localize(key);
  const controls = document.createElement("span");
  controls.textContent = game.i18n.localize("CCK.Area.Controls");
  hint.append(title, controls);
  document.body.append(hint);
  return () => hint.remove();
}
