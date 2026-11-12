// Original compositions for Hushbell, written as data for the sequencer (see sequencer.ts for the pattern syntax).
// Every melody, progression and rhythm here was written for this game; nothing is borrowed from other works.
//
// Each track is 16 bars: an 8-bar A section and an answering 8-bar B section, so the loop has a place to go.
// A harmony `prog` (one chord per bar) drives the accompaniment. Melodies are 16-step bars (`name:steps`).
import { noteToMidi, type Track } from './sequencer';

type Chord = { root: number; notes: number[] };
const C = (root: string, notes: string): Chord => ({ root: noteToMidi(root), notes: notes.split(' ').map(noteToMidi) });

const bars = (n: number, s: string) => Array.from({ length: n }, () => s).join(' ');
const rest = (n: number) => bars(n, '.:16');
const note = (m: number) => 'm' + m;
const join = (a: string, b: string) => a + ' | ' + b;

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
const shaker = 'o . x . o . x . o . x . o . x .';
const shakerB = 'o . x . o x . x o . x . o . x x';

// ---------------------------------------------------------------- Main menu: "Pink Morning Doorbell"
// F major. A tumbles up the triad; B answers from Bb and walks home to F.
const menuA = [
  C('f2', 'f4 a4 c5'), C('d3', 'd4 f4 a4'), C('bb2', 'bb3 d4 f4'), C('c3', 'c4 e4 g4'),
  C('f2', 'f4 a4 c5'), C('a2', 'a3 c4 e4'), C('bb2', 'bb3 d4 f4'), C('c3', 'c4 e4 g4'),
];
const menuB = [
  C('bb2', 'bb3 d4 f4'), C('f2', 'f4 a4 c5'), C('c3', 'c4 e4 g4'), C('d3', 'd4 f4 a4'),
  C('bb2', 'bb3 d4 f4'), C('g2', 'g3 bb3 d4'), C('f2', 'f4 a4 c5'), C('c3', 'c4 e4 g4'),
];
const menuProg = [...menuA, ...menuB];
export const MENU: Track = {
  id: 'menu', bpm: 96, swing: 0.1,
  parts: [
    { voice: 'kalimba', gain: 0.62, pattern: `
      f5:2 a5:2 c6:2 a5:2 f5:2 g5:2 a5:4 | d5:2 f5:2 a5:2 f5:2 d6:4 c6:2 a5:2 |
      bb5:2 d6:2 f6:2 d6:2 c6:2 bb5:2 a5:4 | g5:2 c6:2 e6:2 c6:2 d6:2 c6:2 bb5:2 g5:2 |
      f5:2 a5:2 c6:2 f6:2 e6:2 d6:2 c6:4 | e5:2 a5:2 c6:2 a5:2 e6:4 d6:2 c6:2 |
      d6:2 f6:2 d6:2 bb5:2 a5:2 bb5:2 c6:4 | d6:2 c6:2 bb5:2 g5:2 a5:6 .:2 |
      d6:2 c6:2 a5:2 f5:2 d6:4 c6:2 .:2 | a5:2 f5:2 a5:2 c6:2 f5:4 .:2 a5:2 |
      g5:2 e5:2 g5:2 c6:2 e6:4 d6:2 .:2 | f5:2 a5:2 d6:2 a5:2 f5:2 d5:2 a5:4 |
      bb5:2 d6:2 f6:2 d6:2 bb5:2 a5:2 g5:4 | a5:2 bb5:2 c6:2 d6:2 e6:4 d6:2 .:2 |
      c6:2 a5:2 f5:2 a5:2 c6:2 bb5:2 a5:4 | g5:2 a5:2 bb5:2 c6:2 f5:6 .:2` },
    { voice: 'marimba', gain: 0.28, pattern: join(arp(menuA, '0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .'), arp(menuB, '0 . 2 . 1 . 3 . 2 . 0 . 1 . 2 .')) },
    { voice: 'bass', gain: 0.48, pattern: join(bassline(menuA, 'r . . 5 . . r . . . 5 . . 8 . .'), bassline(menuB, 'r . 5 . 8 . r . . 5 . . r . 8 .')) },
    { voice: 'pad', gain: 0.5, pattern: pad(menuProg) },
    { voice: 'kick', gain: 0.32, pattern: 'X . . . . . . . x . . x . . . .' },
    { voice: 'shaker', gain: 0.3, pattern: join(shaker, shakerB) },
    { voice: 'click', gain: 0.28, pattern: '. . . . x . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Intro: "Balloon Drift"
// G major, slow. A floats; B lifts through Em and settles back onto D.
const introA = [
  C('g2', 'g3 d4 g4 b4'), C('e2', 'e3 b3 e4 g4'), C('c3', 'c4 e4 g4 d5'), C('d3', 'd4 f#4 a4 d5'),
  C('g2', 'g3 d4 g4 b4'), C('e2', 'e3 b3 e4 g4'), C('c3', 'c4 e4 g4 d5'), C('d3', 'd4 f#4 a4 d5'),
];
const introB = [
  C('e2', 'e3 b3 e4 g4'), C('c3', 'c4 e4 g4'), C('g2', 'g3 d4 g4 b4'), C('d3', 'd4 f#4 a4'),
  C('a2', 'a3 c4 e4 g4'), C('d3', 'd4 f#4 a4 c5'), C('g2', 'g3 d4 g4 b4'), C('d3', 'd4 f#4 a4 d5'),
];
const introProg = [...introA, ...introB];
export const INTRO: Track = {
  id: 'intro', bpm: 76,
  parts: [
    { voice: 'flute', gain: 0.58, pattern: `
      d5:4 g5:4 b5:6 a5:2 | g5:6 e5:2 b4:8 | e5:4 g5:4 c6:6 b5:2 | a5:4 f#5:4 d5:8 |
      d5:4 g5:4 b5:4 d6:4 | e6:6 d6:2 b5:8 | c6:4 b5:4 g5:4 e5:4 | a5:6 f#5:2 d5:8 |
      b5:6 a5:2 g5:8 | e5:4 g5:4 b5:6 a5:2 | c6:4 b5:4 g5:8 | a5:4 f#5:4 d5:8 |
      g5:4 b5:4 d6:6 c6:2 | b5:4 g5:4 e5:8 | a5:4 g5:4 f#5:4 e5:4 | d5:4 g5:4 b5:8` },
    { voice: 'pluck', gain: 0.32, pattern: join(arp(introA, '0 . 1 . 2 . 3 . 2 . 1 . 2 . 3 .'), arp(introB, '0 . . 2 . . 3 . . . 1 . . . 2 .')) },
    { voice: 'kalimba', gain: 0.3, pattern: rest(4) + ' ' + arp(introA.slice(4), '. . . . 5 . . . . . . 7 . . . .') + ' | ' + arp(introB, '. . 4 . . . 5 . . . . . 6 . . .') },
    { voice: 'bass', gain: 0.42, pattern: bassline(introProg, 'r . . . . . . . 5 . . . . . . .') },
    { voice: 'pad', gain: 0.55, pattern: pad(introProg) },
    { voice: 'shaker', gain: 0.26, pattern: rest(4) + ' ' + bars(12, 'o . o . o . o . o . o . o . o .') },
  ],
};

// ---------------------------------------------------------------- Town, day: "Sugarlily Stroll"
// C major. A skips along; B climbs to the top of the phrase and hops home.
const dayA = [
  C('c3', 'c4 e4 g4 b4'), C('e3', 'e4 g4 b4 d5'), C('f2', 'f4 a4 c5'), C('g2', 'g4 c5 d5'),
  C('c3', 'c4 e4 g4 b4'), C('a2', 'a3 c4 e4 g4'), C('d3', 'd4 f4 a4 c5'), C('g2', 'g3 b3 d4 g4'),
];
const dayB = [
  C('c3', 'c4 e4 g4'), C('a2', 'a3 c4 e4'), C('f2', 'f3 a3 c4'), C('g2', 'g3 b3 d4'),
  C('c3', 'c4 e4 g4 c5'), C('e3', 'e4 g4 b4'), C('d3', 'd4 f4 a4'), C('g2', 'g3 b3 d4 g4'),
];
const dayProg = [...dayA, ...dayB];
export const DAY: Track = {
  id: 'day', bpm: 108, swing: 0.12,
  parts: [
    { voice: 'marimba', gain: 0.58, pattern: `
      e5:2 g5:1 e5:1 c5:2 .:2 d5:2 e5:2 g5:4 | b4:2 e5:2 g5:2 e5:2 b5:4 g5:2 e5:2 |
      a5:2 c6:1 a5:1 f5:2 .:2 g5:2 a5:2 c6:4 | d6:2 b5:2 g5:2 b5:2 d6:4 .:2 g5:2 |
      e6:2 d6:1 c6:1 g5:2 .:2 e5:2 g5:2 c6:4 | c6:2 a5:2 e5:2 a5:2 c6:4 b5:2 a5:2 |
      d6:2 f6:1 d6:1 a5:2 .:2 f5:2 a5:2 d6:4 | b5:2 a5:2 g5:2 f5:2 e5:2 d5:2 g5:4 |
      g5:2 c6:1 e6:1 g6:2 .:2 e6:2 c6:2 g5:4 | a5:2 c6:2 e6:2 c6:2 a5:4 g5:2 e5:2 |
      f5:2 a5:1 c6:1 f6:2 .:2 d6:2 c6:2 a5:2 .:2 | b5:2 d6:2 g6:2 d6:2 b5:2 g5:2 d5:4 |
      e5:2 g5:2 c6:2 e6:2 g6:4 e6:2 c6:2 | d6:2 b5:2 g5:2 e5:2 c6:4 a5:2 g5:2 |
      a5:2 f5:2 d5:2 f5:2 a5:2 c6:2 f6:4 | d5:2 g5:2 b5:2 d6:2 g5:6 .:2` },
    { voice: 'flute', gain: 0.32, when: h(5, 10), pattern: ['g5', 'g5', 'a5', 'g5', 'g5', 'e5', 'f5', 'd5', 'e5', 'c5', 'f5', 'd5', 'g5', 'e5', 'f5', 'd5'].map((n) => n + ':16').join(' | ') },
    { voice: 'pluck', gain: 0.24, pattern: join(arp(dayA, '0 . . 1 . . 2 . 0 . . 1 . . 2 .'), arp(dayB, '0 . 2 . . 1 . 3 . 0 . 2 . . 1 .')) },
    { voice: 'kalimba', gain: 0.28, when: h(13, 24), pattern: join(arp(dayA, '. . . 4 . . . . . . 5 . . . 6 .'), arp(dayB, '. . 4 . . . 5 . . . 6 . . . 4 .')) },
    { voice: 'bass', gain: 0.46, pattern: join(bassline(dayA, 'r . . 5 . . 8 . r . . 5 . . 8 5'), bassline(dayB, 'r . 5 . 8 . r . r . 5 . . . 8 .')) },
    { voice: 'kick', gain: 0.28, when: h(10, 24), pattern: 'X . . . . . . . x . . . . . . .' },
    { voice: 'shaker', gain: 0.3, pattern: join(shaker, shakerB) },
    { voice: 'hat', gain: 0.26, when: h(12, 17), pattern: '. . . x . . . x . . . x . . . x' },
    { voice: 'click', gain: 0.26, when: h(10, 24), pattern: '. . . . x . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Town, evening: "Lantern Hour"
// D major, swung. A reaches for the leading tone; B opens up and lands softly.
const eveA = [
  C('d3', 'd4 f#4 a4 c#5'), C('b2', 'b3 d4 f#4 a4'), C('g2', 'g3 b3 d4 f#4'), C('a2', 'a3 c#4 e4 a4'),
  C('d3', 'd4 f#4 a4 c#5'), C('f#2', 'f#3 a3 c#4 e4'), C('g2', 'g3 b3 d4 f#4'), C('a2', 'a3 c#4 e4 a4'),
];
const eveB = [
  C('b2', 'b3 d4 f#4 a4'), C('g2', 'g3 b3 d4'), C('e2', 'e3 g3 b3 d4'), C('a2', 'a3 c#4 e4'),
  C('d3', 'd4 f#4 a4'), C('b2', 'b3 d4 f#4'), C('e2', 'e3 g3 b3'), C('a2', 'a3 c#4 e4 a4'),
];
const eveProg = [...eveA, ...eveB];
export const EVENING: Track = {
  id: 'evening', bpm: 84, swing: 0.2,
  parts: [
    { voice: 'flute', gain: 0.55, pattern: `
      f#5:4 a5:2 d6:2 c#6:4 a5:4 | b5:4 d6:2 b5:2 f#5:8 | g5:4 b5:2 d6:2 e6:4 d6:4 | c#6:6 b5:2 a5:8 |
      f#5:4 a5:2 d6:2 e6:4 f#6:4 | c#6:4 a5:4 f#5:8 | b5:4 a5:2 g5:2 f#5:4 e5:4 | e5:4 a5:4 c#6:8 |
      a5:4 d6:4 f#6:6 e6:2 | d6:4 b5:4 g5:8 | b5:4 d6:4 e6:6 d6:2 | c#6:4 a5:4 f#5:8 |
      d6:4 c#6:2 b5:2 a5:4 g5:4 | f#5:4 a5:4 d6:8 | e6:4 d6:4 b5:4 g5:4 | f#5:4 a5:4 d6:8` },
    { voice: 'kalimba', gain: 0.36, pattern: join(arp(eveA, '0 . 1 . 2 . 3 . 2 . 1 . 0 . 1 .'), arp(eveB, '0 . . 2 . . 1 . 3 . . 2 . . 1 .')) },
    { voice: 'bass', gain: 0.44, pattern: bassline(eveProg, 'r . . . . . . . 5 . . . r . . .') },
    { voice: 'pad', gain: 0.52, pattern: pad(eveProg) },
    { voice: 'kick', gain: 0.24, pattern: 'x . . . . . . . . . x . . . . .' },
    { voice: 'shaker', gain: 0.26, pattern: shaker },
    { voice: 'click', gain: 0.22, pattern: '. . . . . . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Town, night: "Starlit Hollow"
// A minor lullaby. A is sparse; B drifts higher, then lays the phrase down on G so A can return.
const nightA = [
  C('a2', 'a3 c4 e4 g4'), C('f2', 'f3 a3 c4 e4'), C('c3', 'c4 e4 g4 b4'), C('g2', 'g3 b3 d4 e4'),
  C('a2', 'a3 c4 e4 g4'), C('f2', 'f3 a3 c4 e4'), C('c3', 'c4 e4 g4 b4'), C('g2', 'g3 b3 d4 e4'),
];
const nightB = [
  C('a2', 'a3 c4 e4'), C('f2', 'f3 a3 c4'), C('d2', 'd3 f3 a3 c4'), C('e2', 'e3 g3 b3'),
  C('a2', 'a3 c4 e4 g4'), C('d3', 'd4 f4 a4'), C('e2', 'e3 g3 b3 e4'), C('g2', 'g3 b3 d4'),
];
const nightProg = [...nightA, ...nightB];
export const NIGHT: Track = {
  id: 'night', bpm: 66,
  parts: [
    { voice: 'kalimba', gain: 0.55, pattern: `
      e5:4 .:2 a5:2 c6:8 | a5:4 .:2 g5:2 f5:8 | g5:4 .:2 e5:2 c5:8 | d5:4 .:2 g5:2 b5:8 |
      c6:4 b5:2 a5:2 e5:8 | f5:4 a5:2 c6:2 a5:8 | g5:4 e5:2 d5:2 c5:8 | d5:4 b4:2 d5:2 g5:8 |
      a5:6 .:2 c6:8 | e6:4 .:4 c6:4 b5:4 | a5:6 .:2 g5:8 | e5:4 .:4 d5:4 c5:4 |
      e5:8 .:4 a5:4 | c6:4 .:4 a5:4 g5:4 | e5:6 .:2 d5:8 | b4:4 d5:4 g5:8` },
    { voice: 'marimba', gain: 0.2, when: (hr) => hr >= 5 && hr < 23, pattern: arp(nightProg, '. . . . . . . . . . 8 . . . 6 .') },
    { voice: 'pad', gain: 0.58, pattern: pad(nightProg) },
    { voice: 'bass', gain: 0.36, pattern: bassline(nightProg, 'r - - - - - - - - - - - - - - -') },
    { voice: 'shaker', gain: 0.18, when: h(20, 23), pattern: 'o . . . . . . . o . . . . . . .' },
  ],
};

// ---------------------------------------------------------------- Café: "Steam & Saucers"
// Swung C major. A is the saunter; B is a little turnaround that walks back to the top.
const cafeA = [
  C('c3', 'e4 g4 b4'), C('a2', 'c4 e4 g4'), C('d3', 'f4 a4 c5'), C('g2', 'f4 b4 d5'),
  C('e3', 'g4 b4 d5'), C('a2', 'g4 c#5 e5'), C('d3', 'f4 a4 c5'), C('g2', 'f4 b4 d5'),
];
const cafeB = [
  C('c3', 'e4 g4 c5'), C('a2', 'c4 e4 a4'), C('d3', 'f4 a4 d5'), C('g2', 'f4 b4 d5'),
  C('c3', 'e4 g4 c5'), C('a2', 'a3 c#4 e4 g4'), C('d3', 'f4 a4 c5'), C('g2', 'f4 b4 d5'),
];
const cafeProg = [...cafeA, ...cafeB];
export const CAFE: Track = {
  id: 'cafe', bpm: 88, swing: 0.26,
  parts: [
    { voice: 'marimba', gain: 0.55, pattern: `
      e5:3 g5:1 b5:4 .:2 a5:2 g5:4 | a5:3 g5:1 e5:4 .:2 c5:2 e5:4 |
      f5:3 a5:1 c6:4 .:2 a5:2 f5:4 | g5:2 f5:2 d5:4 .:2 b4:2 d5:4 |
      g5:3 b5:1 d6:4 .:2 b5:2 g5:4 | e5:3 g5:1 c#6:4 .:2 a5:2 e5:4 |
      d5:2 f5:2 a5:4 .:2 c6:2 a5:4 | b5:4 d6:4 f6:6 .:2 |
      c6:3 e6:1 g6:4 .:2 e6:2 c6:4 | a5:3 c6:1 e6:4 .:2 c6:2 a5:4 |
      f5:3 a5:1 d6:4 .:2 a5:2 f5:4 | g5:3 b5:1 d6:4 .:2 b5:2 g5:4 |
      e5:3 g5:1 c6:4 .:2 g5:2 e5:4 | a5:2 c#6:2 e6:4 .:2 d6:2 c#6:2 .:2 |
      d6:2 c6:2 a5:2 f5:4 .:2 a5:2 .:2 | b5:3 d6:1 f6:4 .:2 d6:2 b5:4` },
    { voice: 'pluck', gain: 0.22, pattern: join(stab(cafeA, [3, 10]), stab(cafeB, [2, 6, 11])) },
    { voice: 'bass', gain: 0.46, pattern: join(bassline(cafeA, 'r . . . 5 . . . 8 . . . 5 . . .'), bassline(cafeB, 'r . 5 . 8 . 5 . r . 5 . r 5 8 .')) },
    { voice: 'kick', gain: 0.22, pattern: 'o . . . . . . . . . x . . . . .' },
    { voice: 'shaker', gain: 0.28, pattern: 'x . o . x . o . x . o . x . o .' },
    { voice: 'click', gain: 0.24, pattern: '. . . . x . . . . . . . x . . .' },
  ],
};

// ---------------------------------------------------------------- Boutique: "Runway Bounce"
// Brisk G major. A is the strut; B hops up an octave and spins back to D.
const boutA = [
  C('g2', 'g3 b3 d4 g4'), C('e2', 'e3 g3 b3 e4'), C('c3', 'c4 e4 g4'), C('d3', 'd4 f#4 a4'),
  C('g2', 'g3 b3 d4 g4'), C('b2', 'b3 d4 f#4'), C('c3', 'c4 e4 g4'), C('d3', 'd4 f#4 a4'),
];
const boutB = [
  C('g2', 'g3 b3 d4'), C('e2', 'e3 g3 b3'), C('c3', 'c4 e4 g4'), C('d3', 'd4 f#4 a4'),
  C('g2', 'g3 b3 d4 g4'), C('b2', 'b3 d4 f#4 a4'), C('c3', 'c4 e4 g4 c5'), C('d3', 'd4 f#4 a4 d5'),
];
const boutProg = [...boutA, ...boutB];
export const BOUTIQUE: Track = {
  id: 'boutique', bpm: 112,
  parts: [
    { voice: 'marimba', gain: 0.55, pattern: `
      b5:1 d6:1 b5:1 g5:1 .:2 a5:2 b5:2 d6:6 | e6:1 d6:1 b5:1 g5:1 .:2 b5:2 e6:2 g6:6 |
      g5:1 c6:1 e6:1 c6:1 .:2 g5:2 c6:2 e6:6 | f#6:1 e6:1 d6:1 a5:1 .:2 f#5:2 a5:2 d6:6 |
      d6:2 b5:2 g5:2 b5:2 d6:4 .:2 g6:2 | f#6:2 d6:2 b5:2 d6:2 f#6:4 .:2 b5:2 |
      e6:2 c6:2 g5:2 c6:2 e6:2 d6:2 c6:4 | a5:2 d6:2 f#6:2 a6:2 g6:2 f#6:2 d6:4 |
      g6:1 b6:1 d7:1 b6:1 .:2 g6:2 b6:2 d7:4 .:2 | e6:1 g6:1 b6:1 e7:1 .:2 d7:2 b6:2 g6:6 |
      c6:2 e6:2 g6:2 e6:2 c6:4 g6:4 | a6:1 f#6:1 d6:1 a5:1 .:2 d6:2 f#6:2 a6:6 |
      b5:2 d6:2 g6:2 b6:2 d7:4 g6:2 b6:2 | f#6:2 d6:2 b5:2 f#5:2 a5:4 d6:2 f#6:2 |
      e6:2 g6:2 c7:2 g6:2 e6:4 c6:2 e6:2 | f#6:2 a6:2 d7:2 a6:2 g6:2 f#6:2 d6:4` },
    { voice: 'pluck', gain: 0.2, pattern: join(stab(boutA, [2, 6, 10, 14]), stab(boutB, [0, 4, 8, 12])) },
    { voice: 'kalimba', gain: 0.28, pattern: rest(4) + ' ' + arp(boutA.slice(4), '. . 4 . . . 5 . . . 4 . . . 6 .') + ' | ' + arp(boutB, '. . 4 . . . 5 . . . 6 . . . 4 .') },
    { voice: 'bass', gain: 0.46, pattern: join(bassline(boutA, 'r . r . . . 5 . r . r . . . 5 8'), bassline(boutB, 'r . 5 . 8 . r . r . 8 . 5 . r 8')) },
    { voice: 'kick', gain: 0.3, pattern: 'X . . . . . x . X . . . . . . .' },
    { voice: 'hat', gain: 0.26, pattern: join(shaker, shakerB) },
    { voice: 'click', gain: 0.3, pattern: '. . . . X . . . . . . . X . . .' },
  ],
};

export const TRACKS: Record<string, Track> = { menu: MENU, intro: INTRO, day: DAY, evening: EVENING, night: NIGHT, cafe: CAFE, boutique: BOUTIQUE };
export type TrackId = keyof typeof TRACKS;
