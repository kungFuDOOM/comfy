// The edit: when each shot plays, the captions, the music sections and the sound cues (seconds).
const BAR2 = (60 / 108) * 8; // two bars of "Sugarlily Stroll": the montage cuts on the bar line
const A = 20.5;              // montage start
const m = (i) => A + i * BAR2;

const shots = [
  { id: 'frost-wide', start: 0, end: 5.5 },
  { id: 'frost-town', start: 5.5, end: 10 },
  { id: 'balloon', start: 10, end: 15 },
  { id: 'title-aerial', start: 15, end: A },
  { id: 'cafe', start: m(0), end: m(1) },
  { id: 'boutique', start: m(1), end: m(2) },
  { id: 'friends', start: m(2), end: m(3) },
  { id: 'forage', start: m(3), end: m(4) },
  { id: 'skills', start: m(4), end: m(5), still: true },
  { id: 'fish', start: m(5), end: m(6) },
  { id: 'unlock', start: m(6), end: m(7) },
  { id: 'seasons', start: m(7), end: m(8) },
  { id: 'grove', start: m(8), end: m(8) + 6 },
  { id: 'lighthouse', start: m(8) + 6, end: m(8) + 11 },
  { id: 'end', start: m(8) + 11, end: m(8) + 18 },
];
const END = shots[shots.length - 1].end;

// captions: kind 'story' (centered, italic), 'feature' (lower sticker), 'title', 'endcard', 'levelup'
const captions = [
  { id: 'c1', kind: 'story', text: 'The Long Frost came…', start: 0.8, end: 5.0 },
  { id: 'c2', kind: 'story', text: '…and Sugarlily Isle fell fast asleep.', start: 6.0, end: 9.6 },
  { id: 'c3', kind: 'story', text: 'Then one morning, someone new drifted in.', start: 10.6, end: 14.6 },
  { id: 'title', kind: 'title', start: 15.15, end: A - 0.15 },
  { id: 'f1', kind: 'feature', text: 'Brew cozy coffee at the café', start: m(0) + 0.3, end: m(1) - 0.25 },
  { id: 'f2', kind: 'feature', text: 'Dress up in pink & cheetah print', start: m(1) + 0.3, end: m(2) - 0.25 },
  { id: 'f3', kind: 'feature', text: 'Befriend sleepy animal neighbours', start: m(2) + 0.3, end: m(3) - 0.25 },
  { id: 'f4', kind: 'feature', text: 'Gather berries, petals & shells', start: m(3) + 0.3, end: m(4) - 0.25 },
  { id: 'lv1', kind: 'levelup', skill: 'foraging', level: 5, start: m(3) + 2.75, end: m(4) - 0.1 },
  { id: 'f5', kind: 'feature', align: 'right', text: 'Six soft skills · no combat, ever', start: m(4) + 0.3, end: m(5) - 0.25 },
  { id: 'f6', kind: 'feature', text: 'Fish, bake, brew & craft', start: m(5) + 0.3, end: m(6) - 0.25 },
  { id: 'lv2', kind: 'levelup', skill: 'fishing', level: 4, start: m(5) + 2.85, end: m(6) - 0.1 },
  { id: 'f7', kind: 'feature', text: 'Wake up new corners of the island', start: m(6) + 0.3, end: m(7) - 0.25 },
  { id: 'f8', kind: 'feature', text: 'Real seasons, on your real clock', start: m(7) + 0.3, end: m(8) - 0.25 },
  { id: 'c4', kind: 'story', text: 'Release Afterglow Lanterns into the night…', start: m(8) + 0.6, end: m(8) + 5.6 },
  { id: 'c5', kind: 'story', text: '…and ring the Hush Bell once more.', start: m(8) + 6.4, end: m(8) + 10.6 },
  { id: 'endcard', kind: 'endcard', start: m(8) + 11.6, end: END },
];

const music = [
  { track: 'night', start: 0, end: 10.8, fadeIn: 2.5, fadeOut: 1.8, hour: 22, gain: 1.1 },
  { track: 'intro', start: 9.4, end: 15.5, fadeIn: 1.4, fadeOut: 0.7, hour: 8 },
  { track: 'day', start: A - BAR2, end: m(8) + 0.25, fadeIn: 0.8, fadeOut: 0.6, hour: 14, gain: 1.35 },
  { track: 'evening', start: m(8), end: END, fadeIn: 0.6, fadeOut: 2.6, hour: 19.5 },
];

const cues = [
  { at: 15.0, sfx: 'bell', arg: 72 },
  { at: m(3) + 2.5, sfx: 'harvest' },
  { at: m(3) + 2.75, sfx: 'levelUp' },
  { at: m(4) + 0.05, sfx: 'open' },
  { at: m(5) + 2.6, sfx: 'harvest' },
  { at: m(5) + 2.85, sfx: 'levelUp' },
  { at: m(6) + 1.15, sfx: 'unlock' },
  { at: m(6) + 1.9, sfx: 'welcome' },
  { at: m(8) + 6.6, sfx: 'bell', arg: 67 },
  { at: m(8) + 11.6, sfx: 'bell', arg: 72 },
];

module.exports = { shots, captions, music, cues, END, FPS: 24 };
