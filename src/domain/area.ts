export interface Point {
  x: number;
  y: number;
}

export type AreaShape =
  | { t: "rect"; x: number; y: number; distance: number; direction: 45 }
  | { t: "circle"; x: number; y: number; distance: number; direction: 0 }
  | { t: "ray"; x: number; y: number; distance: number; direction: number; width: number };

export function explosionSquare(center: Point, sideUnits: number, pixelsPerUnit: number) {
  const half = (sideUnits * pixelsPerUnit) / 2;
  return {
    t: "rect",
    x: center.x - half,
    y: center.y - half,
    distance: Math.hypot(sideUnits, sideUnits),
    direction: 45,
  } satisfies AreaShape;
}

export function shellArea(
  origin: Point,
  toward: Point,
  reachUnits: number,
  startUnits: number,
  pixelsPerUnit: number,
) {
  const angle = Math.atan2(toward.y - origin.y, toward.x - origin.x);
  const offset = startUnits * pixelsPerUnit;
  return {
    t: "ray",
    x: origin.x + Math.cos(angle) * offset,
    y: origin.y + Math.sin(angle) * offset,
    distance: reachUnits,
    direction: (angle * 180) / Math.PI,
    width: reachUnits,
  } satisfies AreaShape;
}

export function circleArea(center: Point, radiusUnits: number) {
  return {
    t: "circle",
    x: center.x,
    y: center.y,
    distance: radiusUnits,
    direction: 0,
  } satisfies AreaShape;
}

export function areaContains(area: AreaShape, pixelsPerUnit: number, point: Point): boolean {
  const dx = point.x - area.x;
  const dy = point.y - area.y;
  if (area.t === "circle") return Math.hypot(dx, dy) <= area.distance * pixelsPerUnit;
  if (area.t === "rect") {
    const side = (area.distance / Math.SQRT2) * pixelsPerUnit;
    return dx >= 0 && dx <= side && dy >= 0 && dy <= side;
  }
  const angle = (area.direction * Math.PI) / 180;
  const along = dx * Math.cos(angle) + dy * Math.sin(angle);
  const across = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return (
    along >= 0 &&
    along <= area.distance * pixelsPerUnit &&
    Math.abs(across) <= (area.width * pixelsPerUnit) / 2
  );
}

export function withinSquare(
  center: Point,
  sideUnits: number,
  pixelsPerUnit: number,
  point: Point,
) {
  const half = (sideUnits * pixelsPerUnit) / 2;
  return Math.abs(point.x - center.x) <= half && Math.abs(point.y - center.y) <= half;
}
