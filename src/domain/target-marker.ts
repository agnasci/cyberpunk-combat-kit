export type MarkerPoint = readonly [number, number];
export type MarkerLine = readonly MarkerPoint[];

export interface MarkerArc {
  radius: number;
  start: number;
  end: number;
}

export interface MarkerTime {
  sinceLock: number;
  clock: number;
}

export interface MarkerFrame {
  center: MarkerPoint;
  brackets: MarkerLine[];
  chevrons: MarkerLine[];
  arcs: MarkerArc[];
  ringTicks: MarkerLine[];
  label: MarkerPoint;
  pips: MarkerPoint[];
  alpha: number;
  locked: boolean;
}

export const LOCK_MS = 420;
const OFFSET = 6;
const LOCK_TRAVEL = 28;
const BREATHE = 2;
const BREATHE_MS = 1600;
const RING_GAP = 12;
const RING_SPEED = Math.PI / 6;
const ARC_COUNT = 3;
const ARC_FILL = 0.55;
const PIP_GAP = 16;
const TAU = Math.PI * 2;

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

export function lockProgress(time: MarkerTime | null): number {
  if (!time) return 1;
  return easeOutCubic(Math.min(1, Math.max(0, time.sinceLock / LOCK_MS)));
}

function corner(x: number, y: number, sx: number, sy: number, length: number): MarkerLine {
  const chamfer = Math.min(6, length / 3);
  return [
    [x, y + sy * length],
    [x, y + sy * chamfer],
    [x + sx * chamfer, y],
    [x + sx * length, y],
  ];
}

function chevron(tip: MarkerPoint, dx: number, dy: number): MarkerLine {
  const depth = 8;
  const half = 5;
  const baseX = tip[0] - dx * depth;
  const baseY = tip[1] - dy * depth;
  return [tip, [baseX + dy * half, baseY + dx * half], [baseX - dy * half, baseY - dx * half], tip];
}

export function markerFrame(
  width: number,
  height: number,
  others: number,
  time: MarkerTime | null,
): MarkerFrame {
  const progress = lockProgress(time);
  const breathe = time ? Math.sin((time.clock / BREATHE_MS) * TAU) * BREATHE : 0;
  const offset = OFFSET + (1 - progress) * LOCK_TRAVEL + breathe;
  const length = Math.max(12, Math.min(width, height) * 0.25);
  const left = -offset;
  const top = -offset;
  const right = width + offset;
  const bottom = height + offset;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.hypot(width, height) / 2 + RING_GAP;
  const rotation = time ? (time.clock / 1000) * RING_SPEED : 0;
  const span = (TAU / ARC_COUNT) * ARC_FILL * progress;
  const flicker = time && progress < 1 ? (Math.floor(time.sinceLock / 45) % 2 ? 0.45 : 1) : 1;
  const tickTurn = -rotation / 2;
  const pipCenter = cx + (others % 2 === 0 ? PIP_GAP / 2 : 0);
  return {
    center: [cx, cy],
    brackets: [
      corner(left, top, 1, 1, length),
      corner(right, top, -1, 1, length),
      corner(left, bottom, 1, -1, length),
      corner(right, bottom, -1, -1, length),
    ],
    chevrons: [
      chevron([cx, top - 3], 0, 1),
      chevron([cx, bottom + 3], 0, -1),
      chevron([left - 3, cy], 1, 0),
      chevron([right + 3, cy], -1, 0),
    ],
    arcs: Array.from({ length: ARC_COUNT }, (_, index) => {
      const start = rotation + (index * TAU) / ARC_COUNT;
      return { radius, start, end: start + span };
    }),
    ringTicks: Array.from({ length: 4 }, (_, index): MarkerLine => {
      const angle = Math.PI / 4 + (index * Math.PI) / 2 + tickTurn;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [
        [cx + cos * (radius + 3), cy + sin * (radius + 3)],
        [cx + cos * (radius + 9), cy + sin * (radius + 9)],
      ];
    }),
    label: [left, top - 20],
    pips: Array.from({ length: others }, (_, index): MarkerPoint => {
      const step = Math.floor((index + 1) / 2) * PIP_GAP;
      const sign = index % 2 === 0 ? 1 : -1;
      return [pipCenter + sign * step, cy - radius - 12];
    }),
    alpha: flicker,
    locked: progress >= 1,
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
