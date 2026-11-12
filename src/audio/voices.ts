// Soft synth voices for a cozy island band: mallets, a breathy flute, a round bass, and light percussion.
// Each note is a handful of oscillators and filters — no samples, no per-note convolution.
import type { AudioGraph } from './engine';

export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type PitchedVoice = 'marimba' | 'kalimba' | 'pluck' | 'flute' | 'bass' | 'pad';
export type DrumVoice = 'kick' | 'hat' | 'shaker' | 'click' | 'tom';
export type VoiceName = PitchedVoice | DrumVoice;

export const isDrum = (v: VoiceName): v is DrumVoice => v === 'kick' || v === 'hat' || v === 'shaker' || v === 'click' || v === 'tom';

interface Note { g: AudioGraph; out: AudioNode; t: number; midi: number; dur: number; vel: number }

function env(g: GainNode, t: number, peak: number, attack: number, decay: number, floor = 0.0001) {
  g.gain.setValueAtTime(floor, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(floor, t + attack + decay);
}

function osc(ctx: AudioContext, type: OscillatorType, hz: number, t: number, stop: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = hz;
  o.start(t); o.stop(stop);
  return o;
}

/** How long a mallet rings. Short written notes stay bouncy; held ones bloom a little. */
function ring(dur: number, base: number, max: number) {
  return Math.max(base, Math.min(max, dur * 0.85));
}

/** A mallet hit: sine body, a short bright partial, and a tiny downward pitch scoop. */
function mallet(n: Note, o: { partial: number; partialGain: number; decay: number; partialDecay: number; peak: number; scoop?: number }) {
  const { g, out, t, midi, vel } = n;
  const { ctx } = g;
  const f = midiHz(midi);
  const end = t + o.decay + 0.15;
  const body = ctx.createOscillator();
  body.type = 'sine';
  const scoop = o.scoop ?? 1.01;
  body.frequency.setValueAtTime(f * scoop, t);
  body.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  const a = ctx.createGain();
  env(a, t, o.peak * vel, 0.003, o.decay);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(4800, Math.max(900, f * 7));
  body.connect(a).connect(lp).connect(out);
  body.start(t); body.stop(end);

  const p = osc(ctx, 'sine', f * o.partial, t, t + o.partialDecay + 0.04);
  const pg = ctx.createGain();
  env(pg, t, o.partialGain * vel, 0.002, o.partialDecay);
  p.connect(pg).connect(out);
}

/** Wooden bar: round fundamental, a quick 4th that dies like a mallet click. */
function marimba(n: Note) {
  const decay = ring(n.dur, 0.26, 0.62);
  mallet(n, { partial: 3.97, partialGain: 0.1, decay, partialDecay: 0.07, peak: 0.3, scoop: 1.014 });
}

/** Thumb piano: glassy inharmonic tines, a longer ring than the marimba. */
function kalimba(n: Note) {
  const { g, out, t, midi, vel } = n;
  const { ctx } = g;
  const f = midiHz(midi);
  const decay = ring(n.dur, 0.55, 1.55);
  const end = t + decay + 0.2;
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(f * 1.008, t);
  body.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  const a = ctx.createGain();
  env(a, t, 0.28 * vel, 0.004, decay);
  body.connect(a).connect(out);
  body.start(t); body.stop(end);
  // tine partials sit sharp of the harmonic series, which is what makes a kalimba shimmer
  for (const [ratio, gain, d] of [[2.93, 0.1, 0.22], [5.15, 0.06, 0.1]] as const) {
    const p = osc(ctx, 'sine', f * ratio, t, t + d + 0.04);
    const pg = ctx.createGain();
    env(pg, t, gain * vel, 0.002, d);
    p.connect(pg).connect(out);
  }
}

/** Soft nylon pluck: a short pitch dip, a closing low-pass, and a tiny pick click. */
function pluck(n: Note) {
  const { g, out, t, midi, vel } = n;
  const { ctx } = g;
  const f = midiHz(midi);
  const decay = ring(n.dur, 0.16, 0.38);
  const end = t + decay + 0.08;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(6400, f * 8), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(280, f * 1.4), t + decay);
  const a = ctx.createGain();
  env(a, t, 0.24 * vel, 0.003, decay);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f * 1.03, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  o.connect(lp);
  osc(ctx, 'sine', f, t, end).connect(lp);
  lp.connect(a).connect(out);
  o.start(t); o.stop(end);
  const click = ctx.createBufferSource();
  click.buffer = g.noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = Math.min(3200, f * 3); bp.Q.value = 3;
  const cg = ctx.createGain();
  env(cg, t, 0.035 * vel, 0.001, 0.02);
  click.connect(bp).connect(cg).connect(out);
  click.start(t, Math.random(), 0.03);
}

/** Breathy flute: slow attack, a puff of air, and vibrato that arrives after the note has spoken. */
function flute({ g, out, t, midi, dur, vel }: Note) {
  const { ctx } = g;
  const f = midiHz(midi);
  const hold = Math.max(0.16, dur);
  const end = t + hold + 0.28;
  const a = ctx.createGain();
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(0.2 * vel, t + 0.08);
  a.gain.setValueAtTime(0.2 * vel, t + hold * 0.82);
  a.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.24);
  const o1 = osc(ctx, 'sine', f, t, end);
  const o2 = osc(ctx, 'sine', f * 2.01, t, end);
  const m2 = ctx.createGain();
  m2.gain.value = 0.12;
  o1.connect(a); o2.connect(m2).connect(a);
  const lfo = osc(ctx, 'sine', 4.6, t, end);
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f * 0.0045, t + Math.min(0.45, hold * 0.55));
  lfo.connect(lg); lg.connect(o1.frequency);
  const n = ctx.createBufferSource();
  n.buffer = g.noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = Math.max(700, f * 1.6); bp.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.linearRampToValueAtTime(0.03 * vel, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + hold * 0.7);
  n.connect(bp).connect(ng).connect(out);
  n.start(t, Math.random(), Math.min(0.6, hold));
  a.connect(out);
}

/** Round bass: sine sub with a quiet octave so it stays gentle under the mallets. */
function bass({ g, out, t, midi, dur, vel }: Note) {
  const { ctx } = g;
  const f = midiHz(midi);
  const len = Math.min(0.55, Math.max(0.18, dur * 0.9));
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 340;
  const a = ctx.createGain();
  env(a, t, 0.36 * vel, 0.012, len);
  osc(ctx, 'sine', f, t, t + len + 0.08).connect(lp);
  const up = ctx.createGain();
  up.gain.value = 0.16;
  osc(ctx, 'sine', f * 2, t, t + len * 0.6).connect(up).connect(lp);
  lp.connect(a).connect(out);
}

/** Slow warm pad: two detuned sines under a low-pass, swelling across the held length. */
function pad({ g, out, t, midi, dur, vel }: Note) {
  const { ctx } = g;
  const f = midiHz(midi);
  const end = t + dur + 0.8;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 780;
  const a = ctx.createGain();
  const peak = 0.038 * vel;
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(peak, t + Math.min(0.8, dur * 0.45));
  a.gain.setValueAtTime(peak, t + Math.max(0.12, dur - 0.12));
  a.gain.linearRampToValueAtTime(0.0001, end);
  const o1 = osc(ctx, 'sine', f, t, end);
  const o2 = osc(ctx, 'sine', f * 1.006, t, end);
  o1.connect(lp); o2.connect(lp); lp.connect(a); a.connect(out);
}

const PITCHED: Record<PitchedVoice, (n: Note) => void> = { marimba, kalimba, pluck, flute, bass, pad };

function noiseHit(g: AudioGraph, out: AudioNode, t: number, kind: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
  const { ctx } = g;
  const n = ctx.createBufferSource();
  n.buffer = g.noise;
  const f = ctx.createBiquadFilter();
  f.type = kind; f.frequency.value = freq; f.Q.value = q;
  const a = ctx.createGain();
  env(a, t, peak, 0.002, decay);
  n.connect(f).connect(a).connect(out);
  n.start(t, Math.random() * 1.5, decay + 0.05);
}

function drum(g: AudioGraph, out: AudioNode, v: DrumVoice, t: number, vel: number) {
  const { ctx } = g;
  switch (v) {
    case 'kick': {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(96, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
      const a = ctx.createGain();
      env(a, t, 0.42 * vel, 0.004, 0.16);
      o.connect(a).connect(out);
      o.start(t); o.stop(t + 0.24);
      break;
    }
    case 'hat': noiseHit(g, out, t, 'highpass', 9000, 0.6, 0.07 * vel, 0.03); break;
    case 'shaker': noiseHit(g, out, t, 'bandpass', 6400, 1.4, 0.11 * vel, 0.05); break;
    case 'click': {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1400, t);
      o.frequency.exponentialRampToValueAtTime(820, t + 0.03);
      const a = ctx.createGain();
      env(a, t, 0.16 * vel, 0.001, 0.035);
      o.connect(a).connect(out);
      o.start(t); o.stop(t + 0.07);
      noiseHit(g, out, t, 'highpass', 4000, 0.7, 0.04 * vel, 0.02);
      break;
    }
    case 'tom': {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(100, t + 0.14);
      const a = ctx.createGain();
      env(a, t, 0.28 * vel, 0.003, 0.18);
      o.connect(a).connect(out);
      o.start(t); o.stop(t + 0.28);
      break;
    }
    default: {
      const _never: never = v;
      return _never;
    }
  }
}

/** Play one note / hit. `dur` is seconds (flute, pad, bass, and how long mallets ring). */
export function playVoice(g: AudioGraph, out: AudioNode, v: VoiceName, t: number, midi: number, dur: number, vel: number) {
  if (isDrum(v)) drum(g, out, v, t, vel);
  else PITCHED[v]({ g, out, t, midi, dur, vel });
}
