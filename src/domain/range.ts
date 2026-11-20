export interface DvBand {
  min: number;
  max: number;
  dv: number | null;
}

export interface DvTableResult {
  range: readonly [number, number];
  text: string;
}

export function parseDvText(text: string): number | null {
  const value = Number.parseInt(text.trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function dvBandsFromResults(results: readonly DvTableResult[]): DvBand[] {
  return results
    .map((result) => ({ min: result.range[0], max: result.range[1], dv: parseDvText(result.text) }))
    .sort((a, b) => a.min - b.min);
}

export function dvForDistance(bands: readonly DvBand[], distance: number): number | null {
  if (!Number.isFinite(distance) || distance < 0) return null;
  const rounded = Math.ceil(distance);
  const band = bands.find((entry) => rounded >= entry.min && rounded <= entry.max);
  return band ? band.dv : null;
}

export function meleeInReach(distance: number, squareSize: number): boolean {
  return Number.isFinite(distance) && distance <= squareSize;
}

export interface GridBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function reachDistance(a: GridBox, b: GridBox, squareSize: number): number {
  const gapX = Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width));
  const gapY = Math.max(0, b.y - (a.y + a.height), a.y - (b.y + b.height));
  return (Math.round(Math.max(gapX, gapY)) + 1) * squareSize;
}
