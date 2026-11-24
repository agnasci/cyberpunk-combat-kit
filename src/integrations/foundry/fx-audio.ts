import type { SynthSound } from "../../domain/cues";

interface Voice {
  context: AudioContext;
  output: AudioNode;
  start: number;
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function noiseBuffer(context: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  noiseBuffers.set(context, buffer);
  return buffer;
}

function envelope(voice: Voice, peak: number, attack: number, decay: number, at = 0): GainNode {
  const gain = voice.context.createGain();
  const start = voice.start + at;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  gain.connect(voice.output);
  return gain;
}

function noise(
  voice: Voice,
  options: {
    type: BiquadFilterType;
    from: number;
    to: number;
    q?: number;
    peak: number;
    attack?: number;
    decay: number;
    at?: number;
  },
): void {
  const { context } = voice;
  const start = voice.start + (options.at ?? 0);
  const attack = options.attack ?? 0.004;
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = options.type;
  filter.Q.value = options.q ?? 1;
  filter.frequency.setValueAtTime(options.from, start);
  filter.frequency.exponentialRampToValueAtTime(options.to, start + attack + options.decay);
  source.connect(filter).connect(envelope(voice, options.peak, attack, options.decay, options.at));
  source.start(start, Math.random());
  source.stop(start + attack + options.decay + 0.05);
}

function tone(
  voice: Voice,
  options: {
    type: OscillatorType;
    from: number;
    to: number;
    peak: number;
    attack?: number;
    decay: number;
    at?: number;
  },
): void {
  const { context } = voice;
  const start = voice.start + (options.at ?? 0);
  const attack = options.attack ?? 0.004;
  const oscillator = context.createOscillator();
  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(options.to, start + attack + options.decay);
  oscillator.connect(envelope(voice, options.peak, attack, options.decay, options.at));
  oscillator.start(start);
  oscillator.stop(start + attack + options.decay + 0.05);
}

function shot(voice: Voice, at = 0): void {
  noise(voice, { type: "bandpass", from: 2600, to: 500, q: 0.8, peak: 0.9, decay: 0.16, at });
  tone(voice, { type: "sine", from: 140, to: 45, peak: 0.8, decay: 0.14, at });
}

function whoosh(voice: Voice, peak: number, decay: number): void {
  noise(voice, { type: "bandpass", from: 350, to: 2200, q: 2, peak, attack: 0.06, decay });
}

const RECIPES: Record<SynthSound, (voice: Voice) => void> = {
  shot: (voice) => shot(voice),
  burst: (voice) => {
    for (let index = 0; index < 5; index += 1) shot(voice, index * 0.075);
  },
  launch: (voice) => {
    tone(voice, { type: "sine", from: 110, to: 40, peak: 0.9, decay: 0.25 });
    noise(voice, { type: "lowpass", from: 900, to: 200, peak: 0.5, decay: 0.3 });
  },
  swing: (voice) => whoosh(voice, 0.5, 0.18),
  whoosh: (voice) => whoosh(voice, 0.4, 0.3),
  impact: (voice) => {
    tone(voice, { type: "sine", from: 95, to: 38, peak: 0.9, decay: 0.16 });
    noise(voice, { type: "lowpass", from: 1400, to: 300, peak: 0.5, decay: 0.08 });
  },
  ricochet: (voice) => {
    tone(voice, { type: "triangle", from: 2600, to: 900, peak: 0.35, attack: 0.01, decay: 0.35 });
    noise(voice, { type: "highpass", from: 3000, to: 1500, peak: 0.2, decay: 0.05 });
  },
  explosion: (voice) => {
    noise(voice, { type: "lowpass", from: 1200, to: 120, peak: 1, attack: 0.01, decay: 1.5 });
    tone(voice, { type: "sine", from: 70, to: 28, peak: 1, attack: 0.01, decay: 1.1 });
  },
  alarm: (voice) => {
    tone(voice, { type: "square", from: 880, to: 880, peak: 0.25, decay: 0.12 });
    tone(voice, { type: "square", from: 660, to: 660, peak: 0.25, decay: 0.12, at: 0.16 });
  },
  flatline: (voice) => {
    tone(voice, { type: "sine", from: 1000, to: 1000, peak: 0.3, attack: 0.02, decay: 1.2 });
  },
  grab: (voice) => {
    tone(voice, { type: "sine", from: 80, to: 40, peak: 0.6, decay: 0.12 });
    noise(voice, { type: "bandpass", from: 900, to: 400, q: 1.5, peak: 0.3, decay: 0.12 });
  },
};

function interfaceContext(): (AudioContext & { gainNode?: GainNode }) | null {
  if (game.audio.locked) return null;
  const context = game.audio.interface;
  return context && context.state === "running" ? context : null;
}

export function audioUnlocked(): boolean {
  return interfaceContext() !== null;
}

export function playSynth(sound: SynthSound, volume: number): void {
  const context = interfaceContext();
  if (!context || volume <= 0) return;
  const master = context.createGain();
  master.gain.value = volume;
  master.connect(context.gainNode ?? context.destination);
  RECIPES[sound]({ context, output: master, start: context.currentTime + 0.01 });
  window.setTimeout(() => master.disconnect(), 3000);
}

export function playFile(src: string, volume: number, startMs = 0): void {
  const context = interfaceContext();
  if (!context || volume <= 0) return;
  void game.audio.play(src, { context, volume, offset: startMs / 1000 }).catch(() => undefined);
}
