export type MarkerPoint = readonly [number, number];
export type MarkerLine = readonly MarkerPoint[];

export interface MarkerShape {
  brackets: MarkerLine[];
  ticks: MarkerLine[];
  pips: MarkerPoint[];
}

const OFFSET = 6;
const TICK = 8;
const PIP_GAP = 16;

export function markerShape(width: number, height: number, others: number): MarkerShape {
  const length = Math.max(12, Math.min(width, height) * 0.25);
  const chamfer = Math.min(6, length / 3);
  const left = -OFFSET;
  const top = -OFFSET;
  const right = width + OFFSET;
  const bottom = height + OFFSET;
  const corner = (x: number, y: number, sx: number, sy: number): MarkerLine => [
    [x, y + sy * length],
    [x, y + sy * chamfer],
    [x + sx * chamfer, y],
    [x + sx * length, y],
  ];
  const midX = width / 2;
  const midY = height / 2;
  const center = midX + (others % 2 === 0 ? PIP_GAP / 2 : 0);
  return {
    brackets: [
      corner(left, top, 1, 1),
      corner(right, top, -1, 1),
      corner(left, bottom, 1, -1),
      corner(right, bottom, -1, -1),
    ],
    ticks: [
      [
        [midX, top - TICK],
        [midX, top - 2],
      ],
      [
        [midX, bottom + 2],
        [midX, bottom + TICK],
      ],
      [
        [left - TICK, midY],
        [left - 2, midY],
      ],
      [
        [right + 2, midY],
        [right + TICK, midY],
      ],
    ],
    pips: Array.from({ length: others }, (_, index): MarkerPoint => {
      const offset = Math.floor((index + 1) / 2) * PIP_GAP;
      const sign = index % 2 === 0 ? 1 : -1;
      return [center + sign * offset, top - TICK - 8];
    }),
  };
}

export function parseCssColor(value: string): number | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
    return Number.parseInt(full, 16);
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(text);
  if (!rgb) return null;
  const [r, g, b] = rgb.slice(1, 4).map((part) => Math.min(255, Number(part)));
  return ((r ?? 0) << 16) + ((g ?? 0) << 8) + (b ?? 0);
}
