// Sound effects, synthesized on demand. Every function is a safe no-op until audio is unlocked and running.
// Wired to real game events (panels, movement, pickups, pips, gifts, dialogue); see the call sites.
import { getGraph, type AudioGraph } from './engine';
import { midiHz } from './voices';

function live(): AudioGraph | null {
  const g = getGraph();
  return g && g.ctx.state === 'running' ? g : null;
}

interface ToneOpts { type?: OscillatorType; peak?: number; slideTo?: number; attack?: number }
function tone(g: AudioGraph, t: number, hz: number, dur: number, o: ToneOpts = {}) {
  const { ctx } = g;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(hz, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  const a = ctx.createGain();
  const atk = o.attack ?? 0.004;
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(o.peak ?? 0.3, t + atk);
  a.gain.exponentialRampToValueAtTime(0.0001, t + atk + dur);
  osc.connect(a).connect(g.sfxIn);
  osc.start(t); osc.stop(t + atk + dur + 0.05);
}

function puff(g: AudioGraph, t: number, freq: number, q: number, peak: number, dur: number) {
  const { ctx } = g;
  const n = ctx.createBufferSource(); n.buffer = g.noise;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const a = ctx.createGain();
  a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(peak, t + 0.005); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(a).connect(g.sfxIn);
  n.start(t, Math.random() * 1.5, dur + 0.05);
}

const last: Record<string, number> = {};
/** Drop a repeat of `key` that arrives sooner than `ms` after the previous one. */
function gate(key: string, ms: number): boolean {
  const now = performance.now();
  if (now - (last[key] ?? -1e9) < ms) return false;
  last[key] = now;
  return true;
}

const M = (n: number) => midiHz(n);

export type FootSurface = 'grass' | 'path' | 'sand';
/** Per-speaker blip pitch (MIDI). Unknown speakers hash to something in the same cheerful range. */
const BLIP_BASE: Record<string, number> = { mimsy: 76, zuzu: 83, bramble: 67, nimbus: 72 };
function baseFor(id: string): number {
  if (id in BLIP_BASE) return BLIP_BASE[id];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return 66 + (Math.abs(h) % 14);
}

export const sfx = {
  /** Light tick for hovering / tab hops / hotbar changes. */
  tick() {
    const g = live(); if (!g || !gate('tick', 40)) return;
    tone(g, g.ctx.currentTime, M(88), 0.05, { type: 'triangle', peak: 0.12 });
  },
  /** Confirm / button press. */
  confirm() {
    const g = live(); if (!g || !gate('confirm', 50)) return;
    const t = g.ctx.currentTime;
    tone(g, t, M(79), 0.1, { type: 'triangle', peak: 0.2 });
    tone(g, t + 0.06, M(86), 0.16, { type: 'sine', peak: 0.2 });
  },
  /** Panel opens. */
  open() {
    const g = live(); if (!g || !gate('open', 80)) return;
    const t = g.ctx.currentTime;
    tone(g, t, M(72), 0.14, { type: 'sine', peak: 0.2, slideTo: M(79) });
    tone(g, t + 0.05, M(84), 0.12, { type: 'triangle', peak: 0.1 });
  },
  /** Panel closes / cancel. */
  back() {
    const g = live(); if (!g || !gate('back', 80)) return;
    const t = g.ctx.currentTime;
    tone(g, t, M(81), 0.09, { type: 'triangle', peak: 0.18 });
    tone(g, t + 0.06, M(74), 0.14, { type: 'sine', peak: 0.18 });
  },
  /** Collectible picked up: three quick rising sparkles. */
  pickup() {
    const g = live(); if (!g) return;
    const t = g.ctx.currentTime;
    [84, 88, 91, 96].forEach((m, i) => tone(g, t + i * 0.055, M(m), 0.22, { type: 'sine', peak: 0.2 }));
    tone(g, t, M(72), 0.25, { type: 'triangle', peak: 0.1 });
  },
  /** Earning pips: bright double ching. */
  coin() {
    const g = live(); if (!g || !gate('coin', 60)) return;
    const t = g.ctx.currentTime;
    tone(g, t, M(95), 0.18, { type: 'triangle', peak: 0.18 });
    tone(g, t, M(95) * 2.76, 0.08, { type: 'sine', peak: 0.06 });
    tone(g, t + 0.08, M(100), 0.32, { type: 'triangle', peak: 0.2 });
    tone(g, t + 0.08, M(100) * 2.76, 0.12, { type: 'sine', peak: 0.06 });
  },
  /** Spending pips: a softer, falling pair. */
  spend() {
    const g = live(); if (!g || !gate('coin', 60)) return;
    const t = g.ctx.currentTime;
    tone(g, t, M(98), 0.14, { type: 'triangle', peak: 0.16 });
    tone(g, t + 0.08, M(91), 0.22, { type: 'triangle', peak: 0.16 });
  },
  /** Giving a gift or serving a drink: a warm little major chord with a sparkle. */
  gift() {
    const g = live(); if (!g) return;
    const t = g.ctx.currentTime;
    [72, 76, 79, 84].forEach((m, i) => tone(g, t + i * 0.07, M(m), 0.6, { type: 'sine', peak: 0.17 }));
    [96, 100].forEach((m, i) => tone(g, t + 0.3 + i * 0.07, M(m), 0.3, { type: 'triangle', peak: 0.1 }));
  },
  /** A drink finished brewing / a quest was completed. */
  ding() {
    const g = live(); if (!g) return;
    const t = g.ctx.currentTime;
    tone(g, t, M(88), 0.5, { type: 'sine', peak: 0.2 });
    tone(g, t, M(88) * 2.76, 0.18, { type: 'sine', peak: 0.06 });
    tone(g, t + 0.12, M(95), 0.6, { type: 'sine', peak: 0.18 });
  },
  quest() {
    const g = live(); if (!g) return;
    const t = g.ctx.currentTime;
    [72, 76, 79, 84, 88].forEach((m, i) => tone(g, t + i * 0.08, M(m), 0.42, { type: 'triangle', peak: 0.15 }));
  },
  /** One footstep. `alt` alternates feet; run = quicker, snappier. */
  step(surface: FootSurface = 'grass', alt = false, run = false) {
    const g = live(); if (!g || !gate('step', 90)) return;
    const t = g.ctx.currentTime, k = run ? 1.15 : 1, d = alt ? 1 : 0.92;
    if (surface === 'path') {
      puff(g, t, 1800 * d, 1.4, 0.07 * k, 0.045);
      tone(g, t, 190 * d, 0.05, { type: 'sine', peak: 0.06 * k, slideTo: 120 });
    } else if (surface === 'sand') {
      puff(g, t, 2600 * d, 0.7, 0.06 * k, 0.09);
    } else {
      puff(g, t, 650 * d, 0.9, 0.09 * k, 0.07);
      tone(g, t, 150 * d, 0.06, { type: 'sine', peak: 0.05 * k, slideTo: 90 });
    }
  },
  /** One dialogue letter-tick. Each speaker has their own pitch; `i` (character index) adds a little melody. */
  blip(speaker: string, i = 0) {
    const g = live(); if (!g || !gate('blip', 38)) return;
    const base = baseFor(speaker), steps = [0, 2, 4, 2, 5, 3, 7, 4];
    const m = base + steps[(i * 3 + speaker.length) % steps.length] + (Math.random() < 0.15 ? 12 : 0);
    tone(g, g.ctx.currentTime, M(m), 0.055, { type: 'square', peak: 0.045 });
    tone(g, g.ctx.currentTime, M(m), 0.07, { type: 'triangle', peak: 0.1 });
  },
};
