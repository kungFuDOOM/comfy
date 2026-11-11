// Soft synth voices, all built from a few oscillators and filters. Each takes (graph, destination, when, ...).
// Kept deliberately light: 2-3 nodes per note, no per-note convolvers. A polish pass can voice these further.
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

/** Wooden mallet: a sine plus a quick overtone at ~4x, short and round. */
function marimba({ g, out, t, midi, vel }: Note) {
  const { ctx } = g, f = midiHz(midi), end = t + 0.9;
  const a = ctx.createGain(); env(a, t, 0.5 * vel, 0.004, 0.55);
  osc(ctx, 'sine', f, t, end).connect(a);
  const b = ctx.createGain(); env(b, t, 0.18 * vel, 0.002, 0.09);
  osc(ctx, 'sine', f * 4.02, t, t + 0.2).connect(b);
  a.connect(out); b.connect(out);
}

/** Thumb piano: bright, glassy, a little longer ring than the marimba. */
function kalimba({ g, out, t, midi, vel }: Note) {
  const { ctx } = g, f = midiHz(midi), end = t + 1.6;
  const a = ctx.createGain(); env(a, t, 0.42 * vel, 0.003, 1.15);
  osc(ctx, 'sine', f, t, end).connect(a);
  const b = ctx.createGain(); env(b, t, 0.2 * vel, 0.002, 0.28);
  osc(ctx, 'sine', f * 5.4, t, t + 0.4).connect(b);
  const c = ctx.createGain(); env(c, t, 0.12 * vel, 0.002, 0.5);
  osc(ctx, 'triangle', f * 2, t, t + 0.7).connect(c);
  a.connect(out); b.connect(out); c.connect(out);
}

/** Soft pluck: triangle through a closing low-pass. */
function pluck({ g, out, t, midi, vel }: Note) {
  const { ctx } = g, f = midiHz(midi), end = t + 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(7000, f * 8), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + 0.35);
  const a = ctx.createGain(); env(a, t, 0.4 * vel, 0.004, 0.45);
  osc(ctx, 'triangle', f, t, end).connect(lp);
  osc(ctx, 'sine', f * 2, t, end).connect(lp);
  lp.connect(a); a.connect(out);
}

/** Breathy flute-ish lead: sine + soft triangle, delayed vibrato, a puff of filtered noise on the attack. */
function flute({ g, out, t, midi, dur, vel }: Note) {
  const { ctx } = g, f = midiHz(midi);
  const hold = Math.max(0.18, dur), end = t + hold + 0.35;
  const a = ctx.createGain();
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(0.3 * vel, t + 0.07);
  a.gain.setValueAtTime(0.3 * vel, t + hold * 0.85);
  a.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.3);
  const o1 = osc(ctx, 'sine', f, t, end), o2 = osc(ctx, 'triangle', f, t, end);
  const m2 = ctx.createGain(); m2.gain.value = 0.25;
  o1.connect(a); o2.connect(m2).connect(a);
  const lfo = osc(ctx, 'sine', 5.2, t, end);
  const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + hold * 0.7);
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  const n = ctx.createBufferSource(); n.buffer = g.noise;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
  const ng = ctx.createGain(); env(ng, t, 0.05 * vel, 0.02, 0.12);
  n.connect(bp).connect(ng).connect(out); n.start(t, Math.random(), 0.2);
  a.connect(out);
}

/** Round, gentle bass: sine with a touch of triangle. */
function bass({ g, out, t, midi, dur, vel }: Note) {
  const { ctx } = g, f = midiHz(midi), len = Math.min(0.5, Math.max(0.2, dur));
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
  const a = ctx.createGain(); env(a, t, 0.5 * vel, 0.008, len);
  osc(ctx, 'sine', f, t, t + len + 0.1).connect(lp);
  const tri = ctx.createGain(); tri.gain.value = 0.35;
  osc(ctx, 'triangle', f, t, t + len + 0.1).connect(tri).connect(lp);
  lp.connect(a); a.connect(out);
}

/** Slow warm pad: two detuned triangles under a low-pass, swelling in and out over the held length. */
function pad({ g, out, t, midi, dur, vel }: Note) {
  const { ctx } = g, f = midiHz(midi), end = t + dur + 0.9;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const a = ctx.createGain();
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(0.1 * vel, t + Math.min(0.9, dur * 0.4));
  a.gain.setValueAtTime(0.1 * vel, t + Math.max(0.1, dur - 0.1));
  a.gain.linearRampToValueAtTime(0.0001, end);
  const o1 = osc(ctx, 'triangle', f, t, end), o2 = osc(ctx, 'triangle', f * 1.004, t, end);
  o1.connect(lp); o2.connect(lp); lp.connect(a); a.connect(out);
}

const PITCHED: Record<PitchedVoice, (n: Note) => void> = { marimba, kalimba, pluck, flute, bass, pad };

function noiseHit(g: AudioGraph, out: AudioNode, t: number, kind: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
  const { ctx } = g;
  const n = ctx.createBufferSource(); n.buffer = g.noise;
  const f = ctx.createBiquadFilter(); f.type = kind; f.frequency.value = freq; f.Q.value = q;
  const a = ctx.createGain(); env(a, t, peak, 0.002, decay);
  n.connect(f).connect(a).connect(out);
  n.start(t, Math.random() * 1.5, decay + 0.05);
}

function drum(g: AudioGraph, out: AudioNode, v: DrumVoice, t: number, vel: number) {
  const { ctx } = g;
  switch (v) {
    case 'kick': { // soft thump
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      const a = ctx.createGain(); env(a, t, 0.7 * vel, 0.003, 0.2);
      o.connect(a).connect(out); o.start(t); o.stop(t + 0.3);
      break;
    }
    case 'hat': noiseHit(g, out, t, 'highpass', 7500, 0.7, 0.12 * vel, 0.04); break;
    case 'shaker': noiseHit(g, out, t, 'bandpass', 5200, 1.2, 0.2 * vel, 0.07); break;
    case 'click': { // wooden rim tick
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
      const a = ctx.createGain(); env(a, t, 0.3 * vel, 0.001, 0.05);
      o.connect(a).connect(out); o.start(t); o.stop(t + 0.1);
      break;
    }
    case 'tom': {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.16);
      const a = ctx.createGain(); env(a, t, 0.4 * vel, 0.003, 0.22);
      o.connect(a).connect(out); o.start(t); o.stop(t + 0.35);
      break;
    }
  }
}

/** Play one note / hit. `dur` is seconds (matters for flute, pad and bass). */
export function playVoice(g: AudioGraph, out: AudioNode, v: VoiceName, t: number, midi: number, dur: number, vel: number) {
  if (isDrum(v)) drum(g, out, v, t, vel);
  else PITCHED[v]({ g, out, t, midi, dur, vel });
}
