import type { Point } from "../../domain/area";
import type { CombatEvent, ProceduralEffect, SpriteTemplate } from "../../domain/cues";

export interface Anchor {
  point: Point;
  visible: boolean;
}

export interface SceneAnchors {
  source: Anchor | null;
  targets: Anchor[];
  point: Anchor | null;
  gridSize: number;
  gridDistance: number;
}

export interface Placement {
  from: Point;
  to: Point;
  size: number;
}

type Draw = (graphics: PixiGraphics, progress: number, placement: Placement) => void;

const EFFECT_Z_INDEX = 950;

const active = new Set<{ stop: () => void }>();

function tokenAnchor(id: string): Anchor | null {
  const token = canvas?.tokens?.placeables.find((entry) => entry.id === id);
  if (!token) return null;
  return { point: { x: token.center.x, y: token.center.y }, visible: token.isVisible };
}

function pointVisible(point: Point, gridSize: number): boolean {
  const visibility = canvas?.visibility;
  if (!visibility?.tokenVision) return true;
  return visibility.testVisibility(point, { tolerance: gridSize / 4 });
}

export function pageHidden(): boolean {
  return document.hidden;
}

export function sceneAnchors(event: CombatEvent): SceneAnchors | null {
  if (!canvas?.scene || canvas.scene.id !== event.sceneId) return null;
  const gridSize = canvas.grid.size;
  return {
    source: event.source ? tokenAnchor(event.source) : null,
    targets: event.targets.map(tokenAnchor).filter((entry): entry is Anchor => entry !== null),
    point: event.point
      ? { point: event.point, visible: pointVisible(event.point, gridSize) }
      : null,
    gridSize,
    gridDistance: canvas.scene.grid.distance || 2,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function sparks(graphics: PixiGraphics, at: Point, radius: number, count: number, seed: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = seed + (index * Math.PI * 2) / count;
    const inner = radius * 0.55;
    graphics.moveTo(at.x + Math.cos(angle) * inner, at.y + Math.sin(angle) * inner);
    graphics.lineTo(at.x + Math.cos(angle) * radius, at.y + Math.sin(angle) * radius);
  }
}

const EFFECTS: Record<ProceduralEffect, { duration: number; still: number; draw: Draw }> = {
  flash: {
    duration: 180,
    still: 0.3,
    draw(graphics, t, { from, size }) {
      const radius = size * 0.35 * (1 - t * 0.4);
      graphics
        .beginFill(0xfff4c2, 0.9 * (1 - t))
        .drawCircle(from.x, from.y, radius)
        .endFill();
      graphics.lineStyle(3, 0xffc94d, 1 - t);
      sparks(graphics, from, radius * 1.8, 6, 0.3);
    },
  },
  tracer: {
    duration: 240,
    still: 0.6,
    draw(graphics, t, { from, to, size }) {
      const head = easeOut(t);
      const tail = Math.max(0, head - 0.35);
      graphics.lineStyle(Math.max(2, size * 0.04), 0xffe08a, 0.95 * (1 - t * 0.5));
      graphics.moveTo(lerp(from.x, to.x, tail), lerp(from.y, to.y, tail));
      graphics.lineTo(lerp(from.x, to.x, head), lerp(from.y, to.y, head));
    },
  },
  impact: {
    duration: 420,
    still: 0.35,
    draw(graphics, t, { to, size }) {
      const radius = size * (0.15 + 0.45 * easeOut(t));
      graphics.lineStyle(Math.max(1, size * 0.06 * (1 - t)), 0xff2a6d, 1 - t);
      graphics.drawCircle(to.x, to.y, radius);
      graphics.lineStyle(2, 0xfff1f5, 1 - t);
      sparks(graphics, to, radius * 1.3, 7, 0.6);
    },
  },
  miss: {
    duration: 450,
    still: 0.4,
    draw(graphics, t, { to, size }) {
      const at = { x: to.x + size * 0.45, y: to.y - size * 0.3 };
      graphics.lineStyle(2, 0x9aa5b1, 1 - t);
      sparks(graphics, at, size * (0.1 + 0.2 * t), 5, 1.1);
      const shift = size * 0.15 * Math.sin(t * Math.PI * 6);
      graphics.lineStyle(0);
      graphics.beginFill(0x05d9e8, 0.5 * (1 - t));
      graphics.drawRect(to.x - size * 0.4 + shift, to.y - size * 0.05, size * 0.8, size * 0.06);
      graphics.endFill();
    },
  },
  explosion: {
    duration: 950,
    still: 0.3,
    draw(graphics, t, { to, size }) {
      const grow = easeOut(t);
      graphics.beginFill(0xff7a18, 0.75 * (1 - t)).drawCircle(to.x, to.y, size * 2.4 * grow);
      graphics.endFill();
      graphics.beginFill(0xfff4c2, 0.9 * Math.max(0, 1 - t * 2.5));
      graphics.drawCircle(to.x, to.y, size * 1.2 * grow).endFill();
      graphics.lineStyle(Math.max(2, size * 0.08 * (1 - t)), 0xff2a6d, 1 - t);
      graphics.drawCircle(to.x, to.y, size * 2.6 * grow);
    },
  },
  critical: {
    duration: 750,
    still: 0.3,
    draw(graphics, t, { to, size }) {
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
      graphics.lineStyle(Math.max(2, size * 0.05), 0xff003c, (1 - t) * (0.5 + 0.5 * pulse));
      graphics.drawCircle(to.x, to.y, size * (0.45 + 0.1 * pulse));
      graphics.drawCircle(to.x, to.y, size * (0.65 + 0.15 * t));
      graphics.lineStyle(0);
      for (let index = 0; index < 3; index += 1) {
        const offset = size * 0.12 * Math.sin(t * 20 + index * 2);
        graphics.beginFill(index % 2 ? 0x05d9e8 : 0xff2a6d, 0.6 * (1 - t));
        graphics.drawRect(to.x - size * 0.5 + offset, to.y + (index - 1) * size * 0.18, size, 4);
        graphics.endFill();
      }
    },
  },
  flatline: {
    duration: 1100,
    still: 0.9,
    draw(graphics, t, { to, size }) {
      const left = to.x - size * 0.7;
      const width = size * 1.4;
      const y = to.y - size * 0.75;
      const end = left + width * Math.min(1, t * 1.6);
      graphics.lineStyle(3, 0xff003c, Math.min(1, 2 * (1 - t)));
      graphics.moveTo(left, y);
      const blip = left + width * 0.35;
      if (end > blip) {
        graphics.lineTo(blip, y).lineTo(blip + size * 0.08, y - size * 0.3);
        graphics.lineTo(blip + size * 0.16, y + size * 0.2).lineTo(blip + size * 0.24, y);
      }
      graphics.lineTo(end, y);
    },
  },
};

function track(stop: () => void): () => void {
  const entry = { stop };
  active.add(entry);
  return () => {
    active.delete(entry);
    stop();
  };
}

export function playProcedural(
  effect: ProceduralEffect,
  placement: Placement,
  reduced: boolean,
): void {
  const layer = canvas?.interface;
  if (!layer) return;
  const spec = EFFECTS[effect];
  const graphics = new PIXI.Graphics();
  graphics.zIndex = EFFECT_Z_INDEX;
  layer.addChild(graphics);
  layer.sortChildren();
  const render = (progress: number) => {
    graphics.clear();
    spec.draw(graphics, progress, placement);
  };
  const remove = () => {
    layer.removeChild(graphics);
    graphics.destroy();
  };
  if (reduced) {
    render(spec.still);
    const timer = window.setTimeout(() => finish(), Math.max(400, spec.duration));
    const finish = track(() => {
      window.clearTimeout(timer);
      remove();
    });
    return;
  }
  const ticker = canvas.app.ticker;
  const started = performance.now();
  const tick = () => {
    const progress = (performance.now() - started) / spec.duration;
    if (progress >= 1) return finish();
    render(progress);
  };
  const finish = track(() => {
    ticker.remove(tick);
    remove();
  });
  render(0);
  ticker.add(tick);
}

function videoOf(texture: PixiTexture): HTMLVideoElement | null {
  const source = texture.baseTexture.resource?.source;
  return source instanceof HTMLVideoElement ? source : null;
}

export interface SpriteOptions {
  stretch: boolean;
  duration: number | null;
  template: SpriteTemplate | null;
  opacity: number;
  playbackRate: number;
  reduced: boolean;
}

const IMAGE_DURATION = 1000;
const MAX_DURATION = 10000;

function fitSprite(
  sprite: PixiSprite,
  texture: PixiTexture,
  placement: Placement,
  options: SpriteOptions,
) {
  const { from, to, size } = placement;
  if (!options.stretch) {
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(to.x, to.y);
    sprite.width = size;
    sprite.height = texture.width > 0 ? (size * texture.height) / texture.width : size;
    return;
  }
  const distance = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  sprite.position.set(from.x, from.y);
  sprite.rotation = Math.atan2(to.y - from.y, to.x - from.x);
  const template = options.template;
  const usable = template ? texture.width - template[1] - template[2] : 0;
  if (!template || usable <= 0 || texture.width <= 0) {
    sprite.anchor.set(0, 0.5);
    sprite.width = distance;
    sprite.height = size;
    return;
  }
  const scale = distance / usable;
  sprite.anchor.set(template[1] / texture.width, 0.5);
  sprite.width = texture.width * scale;
  sprite.height = texture.height * scale;
}

function playTime(video: HTMLVideoElement | null, options: SpriteOptions): number {
  if (options.duration !== null) return options.duration;
  if (!video || options.reduced || !Number.isFinite(video.duration) || video.duration <= 0) {
    return IMAGE_DURATION;
  }
  return Math.min(MAX_DURATION, (video.duration * 1000) / options.playbackRate);
}

export async function playSprite(
  src: string,
  placement: Placement,
  options: SpriteOptions,
): Promise<boolean> {
  const layer = canvas?.interface;
  const texture = await loadTexture(src).catch(() => null);
  if (!layer) return true;
  if (!texture) return false;
  const sprite = new PIXI.Sprite(texture);
  fitSprite(sprite, texture, placement, options);
  sprite.alpha = options.opacity;
  sprite.zIndex = EFFECT_Z_INDEX;
  layer.addChild(sprite);
  layer.sortChildren();
  const video = videoOf(texture);
  if (video) {
    video.loop = false;
    video.currentTime = 0;
    video.playbackRate = options.playbackRate;
    if (!options.reduced) void video.play().catch(() => undefined);
  }
  const timer = window.setTimeout(() => finish(), playTime(video, options));
  const finish = track(() => {
    window.clearTimeout(timer);
    video?.pause();
    layer.removeChild(sprite);
    sprite.destroy();
  });
  return true;
}

export async function preloadTextures(sources: readonly string[]): Promise<void> {
  for (const src of sources) await loadTexture(src).catch(() => null);
}

export interface LoopHandle {
  stop(): void;
}

export async function attachLoop(
  tokenId: string,
  src: string,
  scale: number,
  opacity: number,
  reduced: boolean,
): Promise<LoopHandle | null> {
  const layer = canvas?.interface;
  const texture = await loadTexture(src).catch(() => null);
  if (!layer || !texture) return null;
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  sprite.alpha = opacity;
  sprite.zIndex = EFFECT_Z_INDEX - 1;
  const video = videoOf(texture);
  if (video) {
    video.loop = true;
    if (!reduced) void video.play().catch(() => undefined);
  }
  layer.addChild(sprite);
  layer.sortChildren();
  const ticker = canvas.app.ticker;
  const follow = () => {
    const token = canvas?.tokens?.placeables.find((entry) => entry.id === tokenId);
    if (!token || sprite.destroyed) return;
    const width = token.w * scale;
    sprite.visible = token.isVisible;
    sprite.position.set(token.center.x, token.center.y);
    sprite.width = width;
    sprite.height = texture.width > 0 ? (width * texture.height) / texture.width : width;
  };
  follow();
  ticker.add(follow);
  const stop = track(() => {
    ticker.remove(follow);
    video?.pause();
    layer.removeChild(sprite);
    sprite.destroy();
  });
  return { stop };
}

function stopAllEffects(): void {
  for (const entry of [...active]) entry.stop();
  active.clear();
}

export function initCanvasEffects(): void {
  Hooks.on("canvasTearDown", stopAllEffects);
}

export function currentSceneId(): string | null {
  return canvas?.scene?.id ?? null;
}
