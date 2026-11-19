import type { Placement } from "./fx-canvas";

interface SequencerEffect {
  file(src: string): SequencerEffect;
  atLocation(point: { x: number; y: number }): SequencerEffect;
  stretchTo(point: { x: number; y: number }): SequencerEffect;
  size(size: number, options?: { gridUnits?: boolean }): SequencerEffect;
  duration(ms: number): SequencerEffect;
  locally(local?: boolean): SequencerEffect;
}

interface SequencerSequence {
  effect(): SequencerEffect;
  play(): Promise<unknown>;
}

type SequenceClass = new () => SequencerSequence;

function sequenceClass(): SequenceClass | null {
  if (!game.modules.get("sequencer")?.active) return null;
  const candidate = (globalThis as { Sequence?: unknown }).Sequence;
  return typeof candidate === "function" ? (candidate as SequenceClass) : null;
}

export function sequencerActive(): boolean {
  return sequenceClass() !== null;
}

export function playSequencerSprite(
  src: string,
  placement: Placement,
  stretch: boolean,
  duration: number,
): boolean {
  const Sequence = sequenceClass();
  if (!Sequence) return false;
  const sequence = new Sequence();
  const effect = sequence.effect().file(src).locally(true).duration(duration);
  if (stretch) effect.atLocation(placement.from).stretchTo(placement.to);
  else effect.atLocation(placement.to).size(placement.size);
  void sequence.play().catch(() => undefined);
  return true;
}
