// Tiny step sequencer. A Track is a set of Parts; each Part is a text pattern on a 16th-note grid.
//
// Pitched pattern tokens (space separated, `|` is ignored so bars can be drawn):
//   c5        a note (letter, optional # or b, octave)        c5:4  held for 4 steps
//   e4+g4+c5  a chord (all notes at once)                     m64   raw MIDI number
//   .         a rest (also `.:3`)                             -     tie: extend the previous note by one step
// Drum pattern tokens: `x` hit, `X` accent, `o` ghost, `.` rest.
// A Part loops on its own length, so a 1-bar drum pattern can sit under an 8-bar melody.
import type { AudioGraph } from './engine';
import { isDrum, playVoice, type VoiceName } from './voices';

export interface Part {
  voice: VoiceName;
  pattern: string;
  /** Mix level 0..1. */
  gain?: number;
  /** Only plays while this returns true for the current real-clock hour (hourly variation). */
  when?: (hour: number) => boolean;
}

export interface Track {
  id: string;
  bpm: number;
  /** 0..~0.35: delay applied to every odd 16th step. */
  swing?: number;
  parts: Part[];
}

interface Ev { len: number; notes: number[]; vel: number }
interface CompiledPart { part: Part; steps: number; at: (Ev | undefined)[] }
export interface CompiledTrack { track: Track; steps: number; parts: CompiledPart[] }

const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function noteToMidi(s: string): number {
  if (/^m\d+$/.test(s)) return Number(s.slice(1));
  const m = /^([a-g])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error(`bad note "${s}"`);
  return SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
}

function compilePart(part: Part): CompiledPart {
  const toks = part.pattern.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);
  const drum = isDrum(part.voice);
  const at: (Ev | undefined)[] = [];
  let last: Ev | undefined;
  for (const tok of toks) {
    const [body, lenS] = tok.split(':');
    const len = lenS ? Math.max(1, Number(lenS)) : 1;
    let ev: Ev | undefined;
    if (body === '-') {
      if (last) last.len += 1;
      at.push(undefined);
      continue;
    }
    if (body !== '.') {
      if (drum) ev = { len: 1, notes: [60], vel: body === 'X' ? 1 : body === 'o' ? 0.4 : 0.72 };
      else ev = { len, notes: body.split('+').map(noteToMidi), vel: 1 };
    }
    last = ev;
    at.push(ev);
    for (let i = 1; i < len; i++) at.push(undefined);
  }
  return { part, steps: at.length, at };
}

export function compileTrack(track: Track): CompiledTrack {
  const parts = track.parts.map(compilePart);
  return { track, steps: Math.max(...parts.map((p) => p.steps)), parts };
}

/** Plays one compiled track from step 0, looping forever, into its own fade-able gain. */
export class TrackPlayer {
  readonly out: GainNode;
  private next: number;
  private step = 0;
  private stepDur: number;
  stopped = false;

  constructor(private g: AudioGraph, readonly ct: CompiledTrack, private hour: () => number, startAt: number) {
    this.out = g.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(g.musicIn);
    this.next = startAt;
    this.stepDur = 60 / ct.track.bpm / 4;
  }

  /** Schedule everything that falls inside the lookahead window. */
  pump(until: number) {
    if (this.stopped) return;
    const { track } = this.ct, swing = (track.swing ?? 0) * this.stepDur;
    while (this.next < until) {
      const t = this.next + (this.step % 2 === 1 ? swing : 0);
      const h = this.hour();
      for (const cp of this.ct.parts) {
        const ev = cp.at[this.step % cp.steps];
        if (!ev || (cp.part.when && !cp.part.when(h))) continue;
        const vel = ev.vel * (cp.part.gain ?? 0.8) * (0.93 + Math.random() * 0.14);
        const dur = ev.len * this.stepDur;
        for (const m of ev.notes) playVoice(this.g, this.out, cp.part.voice, t, m, dur, vel);
      }
      this.next += this.stepDur;
      this.step = (this.step + 1) % this.ct.steps;
    }
  }

  fadeTo(level: number, seconds: number) {
    const { gain } = this.out, now = this.g.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level, now + Math.max(0.05, seconds));
  }

  stop() {
    this.stopped = true;
    try { this.out.disconnect(); } catch { /* already gone */ }
  }
}
