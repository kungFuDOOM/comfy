// Original compositions for Hushbell, written as data for the sequencer (see sequencer.ts for the pattern syntax).
// Every melody, progression and rhythm here was written for this game; nothing is borrowed from other works.
//
// Structure of each track: a harmony `prog` (one chord per bar) drives generated accompaniment (arpeggios, stabs,
// bass, pad) while melodies are written out by hand as 16-step bars (`name:steps`, 16 steps = one bar).
// Polish notes for later passes: voicings, per-part gains, more variation bars, a B-section per track.
import { noteToMidi, type Track } from './sequencer';

type Chord = { root: number; notes: number[] };
const C = (root: string, notes: string): Chord => ({ root: noteToMidi(root), notes: notes.split(' ').map(noteToMidi) });

const bars = (n: number, s: string) => Array.from({ length: n }, () => s).join(' ');
const rest = (n: number) => bars(n, '.:16');
const note = (m: number) => 'm' + m;

/** Arpeggio from a template of chord-tone indices (index >= chord size climbs an octave). */
function arp(prog: Chord[], tmpl: string): string {
  const t = tmpl.trim().split(/\s+/);
  return prog.map((c) => t.map((x) => {
    if (x === '.' || x === '-') return x;
    const i = Number(x);
    return note(c.notes[i % c.notes.length] + 12 * Math.floor(i / c.notes.length));
  }).join(' ')).join(' | ');
}
/** The whole chord struck on the listed steps of each bar. */
function stab(prog: Chord[], steps: number[], octave = 0): string {
  return prog.map((c) => Array.from({ length: 16 }, (_, i) => (steps.includes(i) ? c.notes.map((n) => note(n + octave)).join('+') : '.')).join(' ')).join(' | ');
}
/** Bass from a template: r root, 5 fifth, 8 octave. */
function bassline(prog: Chord[], tmpl: string): string {
  const off: Record<string, number> = { r: 0, '5': 7, '8': 12 };
  const t = tmpl.trim().split(/\s+/);
  return prog.map((c) => t.map((x) => (x in off ? note(c.root + off[x]) : x)).join(' ')).join(' | ');
}
/** One sustained chord per bar. */
const pad = (prog: Chord[], octave = -12) => prog.map((c) => c.notes.map((n) => note(n + octave)).join('+') + ':16').join(' | ');

const h = (lo: number, hi: number) => (hr: number) => hr >= lo && hr < hi;

// ---------------------------------------------------------------- Main menu: "Pink Morning Doorbell"
// F major, a bouncy kalimba tune (motif: up the F triad, then step back down) over a tumbling marimba arpeggio.
const menuProg = [
  C('f2', 'f4 a4 c5'), C('d3', 'd4 f4 a4'), C('bb2', 'bb3 d4 f4'), C('c3', 'c4 e4 g4'),
  C('f2', 'f4 a4 c5'), C('a2', 'a3 c4 e4'), C('bb2', 'bb3 d4 f4'), C('c3', 'c4 e4 g4'),
];
export const MENU: Track = {
  id: 'menu', bpm: 96, swing: 0.1,
  parts: [
    { voice: 'kalimba', gain: 0.85, pattern: `
      f5:2 a5:2 c6:2 a5:2 f5:2 g5:2 a5:4 | d5:2 f5:2 a5:2 f5:2 d6:4 c6:2 a5:2 |
      bb5:2 d6:2 f6:2 d6:2 c6:2 bb5:2 a5:4 | g5:2 c6:2 e6:2 c6:2 d6:2 c6:2 bb5:2 g5:2 |
      f5:2 a5:2 c6:2 f6:2 e6:2 d6:2 c6:4 | e5:2 a5:2 c6:2 a5:2 e6:4 d6:2 c6:2 |
      d6:2 f6:2 d6:2 bb5:2 a5:2 bb5:2 c6:4 | d6:2 c6:2 bb5:2 g5:2 a5:6 .:2` },
    { voice: 'marimba', gain: 0.4, pattern: arp(menuProg, '0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .') },
    { voice: 'bass', gain: 0.8, pattern: bassline(menuProg, 'r . . 5 . . r . . . 5 . . 8 . .') },
    { voice: 'pad', gain: 0.9, pattern: pad(menuProg) },
    { voice: 'kick', gain: 0.55, pattern: 'X . . . . . . . x . . x . . . .' },
    { voice: 'shaker', gain: 0.6, pattern: 'o . x . o . x . o . x . o . x .' },
    { voice: 'click', gain: 0.5, pattern: '. . . . x . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Intro: "Balloon Drift"
// G major, slow and floating: a flute line over harp-like plucks; the shaker only joins for the second half.
const introProg = [
  C('g2', 'g3 d4 g4 b4'), C('e2', 'e3 b3 e4 g4'), C('c3', 'c4 e4 g4 d5'), C('d3', 'd4 f#4 a4 d5'),
  C('g2', 'g3 d4 g4 b4'), C('e2', 'e3 b3 e4 g4'), C('c3', 'c4 e4 g4 d5'), C('d3', 'd4 f#4 a4 d5'),
];
export const INTRO: Track = {
  id: 'intro', bpm: 76,
  parts: [
    { voice: 'flute', gain: 0.9, pattern: `
      d5:4 g5:4 b5:6 a5:2 | g5:6 e5:2 b4:8 | e5:4 g5:4 c6:6 b5:2 | a5:4 f#5:4 d5:8 |
      d5:4 g5:4 b5:4 d6:4 | e6:6 d6:2 b5:8 | c6:4 b5:4 g5:4 e5:4 | a5:6 f#5:2 d5:8` },
    { voice: 'pluck', gain: 0.5, pattern: arp(introProg, '0 . 1 . 2 . 3 . 2 . 1 . 2 . 3 .') },
    { voice: 'kalimba', gain: 0.45, pattern: rest(4) + ' ' + arp(introProg.slice(4), '. . . . 5 . . . . . . 7 . . . .') },
    { voice: 'bass', gain: 0.7, pattern: bassline(introProg, 'r . . . . . . . 5 . . . . . . .') },
    { voice: 'pad', gain: 1, pattern: pad(introProg) },
    { voice: 'shaker', gain: 0.45, pattern: rest(4) + ' ' + bars(4, 'o . o . o . o . o . o . o . o .') },
  ],
};

// ---------------------------------------------------------------- Town, day: "Sugarlily Stroll"
// C major, a skippy marimba tune with a kalimba counter-line that appears in the afternoon, a flute dawn layer
// before ten, and percussion that thickens toward midday.
const dayProg = [
  C('c3', 'c4 e4 g4 b4'), C('e3', 'e4 g4 b4 d5'), C('f2', 'f4 a4 c5'), C('g2', 'g4 c5 d5'),
  C('c3', 'c4 e4 g4 b4'), C('a2', 'a3 c4 e4 g4'), C('d3', 'd4 f4 a4 c5'), C('g2', 'g3 b3 d4 g4'),
];
export const DAY: Track = {
  id: 'day', bpm: 108, swing: 0.12,
  parts: [
    { voice: 'marimba', gain: 0.85, pattern: `
      e5:2 g5:1 e5:1 c5:2 .:2 d5:2 e5:2 g5:4 | b4:2 e5:2 g5:2 e5:2 b5:4 g5:2 e5:2 |
      a5:2 c6:1 a5:1 f5:2 .:2 g5:2 a5:2 c6:4 | d6:2 b5:2 g5:2 b5:2 d6:4 .:2 g5:2 |
      e6:2 d6:1 c6:1 g5:2 .:2 e5:2 g5:2 c6:4 | c6:2 a5:2 e5:2 a5:2 c6:4 b5:2 a5:2 |
      d6:2 f6:1 d6:1 a5:2 .:2 f5:2 a5:2 d6:4 | b5:2 a5:2 g5:2 f5:2 e5:2 d5:2 g5:4` },
    { voice: 'flute', gain: 0.5, when: h(5, 10), pattern: ['g5', 'g5', 'a5', 'g5', 'g5', 'e5', 'f5', 'd5'].map((n) => n + ':16').join(' | ') },
    { voice: 'pluck', gain: 0.32, pattern: arp(dayProg, '0 . . 1 . . 2 . 0 . . 1 . . 2 .') },
    { voice: 'kalimba', gain: 0.4, when: h(13, 24), pattern: arp(dayProg, '. . . 4 . . . . . . 5 . . . 6 .') },
    { voice: 'bass', gain: 0.8, pattern: bassline(dayProg, 'r . . 5 . . 8 . r . . 5 . . 8 5') },
    { voice: 'kick', gain: 0.5, when: h(10, 24), pattern: 'X . . . . . . . x . . . . . . .' },
    { voice: 'shaker', gain: 0.55, pattern: 'o . x . o . x . o . x . o . x .' },
    { voice: 'hat', gain: 0.5, when: h(12, 17), pattern: '. . . x . . . x . . . x . . . x' },
    { voice: 'click', gain: 0.5, when: h(10, 24), pattern: '. . . . x . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Town, evening: "Lantern Hour"
// D major, swung and glowing: a flute melody that reaches up for the leading tone, kalimba arpeggios, soft heartbeat.
const eveProg = [
  C('d3', 'd4 f#4 a4 c#5'), C('b2', 'b3 d4 f#4 a4'), C('g2', 'g3 b3 d4 f#4'), C('a2', 'a3 c#4 e4 a4'),
  C('d3', 'd4 f#4 a4 c#5'), C('f#2', 'f#3 a3 c#4 e4'), C('g2', 'g3 b3 d4 f#4'), C('a2', 'a3 c#4 e4 a4'),
];
export const EVENING: Track = {
  id: 'evening', bpm: 84, swing: 0.22,
  parts: [
    { voice: 'flute', gain: 0.85, pattern: `
      f#5:4 a5:2 d6:2 c#6:4 a5:4 | b5:4 d6:2 b5:2 f#5:8 | g5:4 b5:2 d6:2 e6:4 d6:4 | c#6:6 b5:2 a5:8 |
      f#5:4 a5:2 d6:2 e6:4 f#6:4 | c#6:4 a5:4 f#5:8 | b5:4 a5:2 g5:2 f#5:4 e5:4 | e5:4 a5:4 c#6:8` },
    { voice: 'kalimba', gain: 0.5, pattern: arp(eveProg, '0 . 1 . 2 . 3 . 2 . 1 . 0 . 1 .') },
    { voice: 'bass', gain: 0.75, pattern: bassline(eveProg, 'r . . . . . . . 5 . . . r . . .') },
    { voice: 'pad', gain: 1, pattern: pad(eveProg) },
    { voice: 'kick', gain: 0.4, pattern: 'x . . . . . . . . . x . . . . .' },
    { voice: 'shaker', gain: 0.45, pattern: 'o . x . o . x . o . x . o . x .' },
    { voice: 'click', gain: 0.4, pattern: '. . . . . . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Town, night: "Starlit Hollow"
// A minor lullaby: very sparse kalimba, slow pad, and a few high marimba twinkles. Late-night hours go quieter still.
const nightProg = [
  C('a2', 'a3 c4 e4 g4'), C('f2', 'f3 a3 c4 e4'), C('c3', 'c4 e4 g4 b4'), C('g2', 'g3 b3 d4 e4'),
  C('a2', 'a3 c4 e4 g4'), C('f2', 'f3 a3 c4 e4'), C('c3', 'c4 e4 g4 b4'), C('g2', 'g3 b3 d4 e4'),
];
export const NIGHT: Track = {
  id: 'night', bpm: 66,
  parts: [
    { voice: 'kalimba', gain: 0.8, pattern: `
      e5:4 .:2 a5:2 c6:8 | a5:4 .:2 g5:2 f5:8 | g5:4 .:2 e5:2 c5:8 | d5:4 .:2 g5:2 b5:8 |
      c6:4 b5:2 a5:2 e5:8 | f5:4 a5:2 c6:2 a5:8 | g5:4 e5:2 d5:2 c5:8 | d5:4 b4:2 d5:2 g5:8` },
    { voice: 'marimba', gain: 0.32, when: (hr) => hr >= 5 && hr < 23, pattern: arp(nightProg, '. . . . . . . . . . 8 . . . 6 .') },
    { voice: 'pad', gain: 1.1, pattern: pad(nightProg) },
    { voice: 'bass', gain: 0.6, pattern: bassline(nightProg, 'r - - - - - - - - - - - - - - -') },
    { voice: 'shaker', gain: 0.3, when: h(20, 23), pattern: 'o . . . . . . . o . . . . . . .' },
  ],
};

// ---------------------------------------------------------------- Café: "Steam & Saucers"
// Swung C major with jazzy seventh chords: a mellow marimba tune, offbeat plucked comping, brushed shaker.
const cafeProg = [
  C('c3', 'e4 g4 b4'), C('a2', 'c4 e4 g4'), C('d3', 'f4 a4 c5'), C('g2', 'f4 b4 d5'),
  C('e3', 'g4 b4 d5'), C('a2', 'g4 c#5 e5'), C('d3', 'f4 a4 c5'), C('g2', 'f4 b4 d5'),
];
export const CAFE: Track = {
  id: 'cafe', bpm: 88, swing: 0.28,
  parts: [
    { voice: 'marimba', gain: 0.85, pattern: `
      e5:3 g5:1 b5:4 .:2 a5:2 g5:4 | a5:3 g5:1 e5:4 .:2 c5:2 e5:4 |
      f5:3 a5:1 c6:4 .:2 a5:2 f5:4 | g5:2 f5:2 d5:4 .:2 b4:2 d5:4 |
      g5:3 b5:1 d6:4 .:2 b5:2 g5:4 | e5:3 g5:1 c#6:4 .:2 a5:2 e5:4 |
      d5:2 f5:2 a5:4 .:2 c6:2 a5:4 | b5:4 d6:4 f6:6 .:2` },
    { voice: 'pluck', gain: 0.33, pattern: stab(cafeProg, [3, 10]) },
    { voice: 'bass', gain: 0.8, pattern: bassline(cafeProg, 'r . . . 5 . . . 8 . . . 5 . . .') },
    { voice: 'kick', gain: 0.35, pattern: 'o . . . . . . . . . x . . . . .' },
    { voice: 'shaker', gain: 0.5, pattern: 'x . o . x . o . x . o . x . o .' },
    { voice: 'click', gain: 0.45, pattern: '. . . . x . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Boutique: "Runway Bounce"
// Brisk G major with staccato marimba, hand-clap clicks and a hopping bass; sparkle kalimba joins in the second half.
const boutProg = [
  C('g2', 'g3 b3 d4 g4'), C('e2', 'e3 g3 b3 e4'), C('c3', 'c4 e4 g4'), C('d3', 'd4 f#4 a4'),
  C('g2', 'g3 b3 d4 g4'), C('b2', 'b3 d4 f#4'), C('c3', 'c4 e4 g4'), C('d3', 'd4 f#4 a4'),
];
export const BOUTIQUE: Track = {
  id: 'boutique', bpm: 112,
  parts: [
    { voice: 'marimba', gain: 0.85, pattern: `
      b5:1 d6:1 b5:1 g5:1 .:2 a5:2 b5:2 d6:6 | e6:1 d6:1 b5:1 g5:1 .:2 b5:2 e6:2 g6:6 |
      g5:1 c6:1 e6:1 c6:1 .:2 g5:2 c6:2 e6:6 | f#6:1 e6:1 d6:1 a5:1 .:2 f#5:2 a5:2 d6:6 |
      d6:2 b5:2 g5:2 b5:2 d6:4 .:2 g6:2 | f#6:2 d6:2 b5:2 d6:2 f#6:4 .:2 b5:2 |
      e6:2 c6:2 g5:2 c6:2 e6:2 d6:2 c6:4 | a5:2 d6:2 f#6:2 a6:2 g6:2 f#6:2 d6:4` },
    { voice: 'pluck', gain: 0.3, pattern: stab(boutProg, [2, 6, 10, 14]) },
    { voice: 'kalimba', gain: 0.4, pattern: rest(4) + ' ' + arp(boutProg.slice(4), '. . 4 . . . 5 . . . 4 . . . 6 .') },
    { voice: 'bass', gain: 0.8, pattern: bassline(boutProg, 'r . r . . . 5 . r . r . . . 5 8') },
    { voice: 'kick', gain: 0.55, pattern: 'X . . . . . x . X . . . . . . .' },
    { voice: 'hat', gain: 0.5, pattern: 'o . x . o . x . o . x . o . x .' },
    { voice: 'click', gain: 0.6, pattern: '. . . . X . . . . . . . X . . .' },
  ],
};

export const TRACKS: Record<string, Track> = { menu: MENU, intro: INTRO, day: DAY, evening: EVENING, night: NIGHT, cafe: CAFE, boutique: BOUTIQUE };
export type TrackId = keyof typeof TRACKS;
