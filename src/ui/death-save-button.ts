export function addDeathSaveButton(root: HTMLElement, onClick: () => void): void {
  root.querySelectorAll(".cck-death-saves").forEach((element) => element.remove());
  const header = root.querySelector(".combat-tracker-header");
  if (!header) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cck-death-saves";
  button.innerHTML = `<i class="fas fa-heart-pulse"></i> ${game.i18n.localize("CCK.DeathSave.Button")}`;
  button.title = game.i18n.localize("CCK.DeathSave.Hint");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  header.append(button);
}
