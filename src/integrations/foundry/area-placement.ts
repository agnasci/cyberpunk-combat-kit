import { MODULE_ID } from "../../constants";
import { areaContains, type AreaShape, type Point } from "../../domain/area";
import { pixelsPerUnit, restingCenter } from "./tokens";

const ACTIVE_COLOR = "#ff2a6d";
const BLOCKED_COLOR = "#7a7a7a";
const LINGER_MS = 4000;
let placing = false;

export function placementActive(): boolean {
  return placing;
}

function templateData(area: AreaShape, color = ACTIVE_COLOR): Record<string, unknown> {
  return {
    ...area,
    fillColor: color,
    borderColor: color,
    user: game.user.id,
    flags: { [MODULE_ID]: { area: true } },
  };
}

export function snapToCenter(point: Point): Point {
  return canvas ? canvas.grid.getCenterPoint(point) : point;
}

export function hasLineOfSight(from: Point, to: Point): boolean {
  return !CONFIG.Canvas.polygonBackends.sight.testCollision(from, to, {
    type: "sight",
    mode: "any",
  });
}

export function tokensInArea(
  area: AreaShape,
  options: { exclude?: Token; sightFrom?: Point } = {},
): Token[] {
  const scale = pixelsPerUnit();
  return (canvas?.tokens?.placeables ?? []).filter((token) => {
    if (!token.actor || token === options.exclude) return false;
    const center = restingCenter(token);
    if (!areaContains(area, scale, center)) return false;
    return !options.sightFrom || hasLineOfSight(options.sightFrom, center);
  });
}

export async function showArea(area: AreaShape): Promise<MeasuredTemplateDocument | null> {
  const scene = canvas?.scene;
  if (!scene || !game.user.can("TEMPLATE_CREATE")) return null;
  const [template] = await scene.createEmbeddedDocuments("MeasuredTemplate", [templateData(area)]);
  return template ?? null;
}

async function deleteArea(template: MeasuredTemplateDocument): Promise<void> {
  if (!canvas?.scene?.templates.get(template.id)) return;
  await template.delete().catch(() => undefined);
}

export function removeArea(template: MeasuredTemplateDocument | null): void {
  if (template) window.setTimeout(() => void deleteArea(template), LINGER_MS);
}

export async function removeLeftoverAreas(): Promise<void> {
  const scene = canvas?.scene;
  if (!scene || !game.user.isGM) return;
  const ids = scene.templates
    .filter((template) => template.getFlag(MODULE_ID, "area") === true)
    .map((template) => template.id);
  if (ids.length > 0) await scene.deleteEmbeddedDocuments("MeasuredTemplate", ids);
}

function worldPoint(event: PointerEvent): Point | null {
  if (!canvas) return null;
  const view = canvas.app.view;
  const bounds = view.getBoundingClientRect();
  const screen = canvas.app.screen;
  return canvas.stage.worldTransform.applyInverse({
    x: ((event.clientX - bounds.left) * screen.width) / bounds.width,
    y: ((event.clientY - bounds.top) * screen.height) / bounds.height,
  });
}

export async function placeArea(
  make: (point: Point) => AreaShape,
  initial: Point,
  allowed: (point: Point) => boolean = () => true,
): Promise<AreaShape | null> {
  const scene = canvas?.scene;
  const layer = canvas?.templates?.preview;
  if (!canvas || !scene || !layer) return null;
  canvas.hud?.token?.clear();
  const view = canvas.app.view;
  let point = initial;
  const document = new CONFIG.MeasuredTemplate.documentClass(templateData(make(point)), {
    parent: scene,
  });
  const preview = new CONFIG.MeasuredTemplate.objectClass(document);
  layer.addChild(preview);
  const redraw = () => {
    document.updateSource(templateData(make(point), allowed(point) ? ACTIVE_COLOR : BLOCKED_COLOR));
    preview.renderFlags.set({ refresh: true });
  };
  await preview.draw();
  redraw();

  placing = true;
  return new Promise((resolve) => {
    let finished = false;
    const finish = (result: AreaShape | null) => {
      if (finished) return;
      finished = true;
      placing = false;
      view.removeEventListener("pointermove", move, true);
      view.removeEventListener("pointerdown", press, true);
      view.removeEventListener("contextmenu", cancel, true);
      window.removeEventListener("keydown", key, true);
      Hooks.off("canvasTearDown", teardown);
      preview.destroy();
      resolve(result);
    };
    const move = (event: PointerEvent) => {
      const next = worldPoint(event);
      if (!next) return;
      point = next;
      redraw();
    };
    const press = (event: PointerEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.button !== 0) return finish(null);
      move(event);
      if (allowed(point)) finish(make(point));
    };
    const cancel = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel(event);
    };
    const teardown = Hooks.on("canvasTearDown", () => finish(null));
    view.addEventListener("pointermove", move, true);
    view.addEventListener("pointerdown", press, true);
    view.addEventListener("contextmenu", cancel, true);
    window.addEventListener("keydown", key, true);
  });
}
