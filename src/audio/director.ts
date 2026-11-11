// Music director: decides which track should be playing and crossfades between them.
//   mood  = what the game is doing ('menu' | 'intro' | 'town' | 'off')
//   place = a panel we are standing "inside" ('cafe' | 'boutique'), which overrides the town music
// In 'town' mood the track follows the real-time clock (src/time.ts phases).
import { getClock, type Phase } from '../time';
import { whenAudioReady, getGraph, type AudioGraph } from './engine';
import { compileTrack, TrackPlayer, type CompiledTrack } from './sequencer';
import { TRACKS } from './tracks';

export type Mood = 'menu' | 'intro' | 'town' | 'off';
export type Place = 'cafe' | 'boutique';

const compiled = new Map<string, CompiledTrack>();
const compile = (id: string) => {
  let c = compiled.get(id);
  if (!c) { c = compileTrack(TRACKS[id]); compiled.set(id, c); }
  return c;
};

const PHASE_TRACK: Record<Phase, string> = { morning: 'day', day: 'day', evening: 'evening', night: 'night' };
/** Crossfade seconds when going from one track to another. */
const FADE = { town: 4, place: 1.2, scene: 2 };

let mood: Mood = 'off';
let place: Place | null = null;
let playing: { id: string; player: TrackPlayer } | null = null;
const dying = new Set<TrackPlayer>();
let timer = 0;
let clockT = 0;

const hourNow = () => getClock().hour;

function wanted(): string | null {
  if (place) return place;
  if (mood === 'menu') return 'menu';
  if (mood === 'intro') return 'intro';
  if (mood === 'town') return PHASE_TRACK[getClock().phase];
  return null;
}

function pumpAll() {
  const g = getGraph();
  if (!g) return;
  const until = g.ctx.currentTime + 0.18;
  if (playing) playing.player.pump(until);
  dying.forEach((p) => p.pump(until));
}

function ensureTimer() {
  if (!timer) timer = window.setInterval(pumpAll, 30);
}

function retire(p: TrackPlayer, seconds: number) {
  p.fadeTo(0, seconds);
  dying.add(p);
  // never let more than two old tracks linger
  if (dying.size > 2) { const oldest = dying.values().next().value as TrackPlayer; oldest.stop(); dying.delete(oldest); }
  window.setTimeout(() => { p.stop(); dying.delete(p); }, seconds * 1000 + 400);
}

function crossfade(g: AudioGraph, id: string, seconds: number) {
  if (playing?.id === id) return;
  const old = playing;
  const player = new TrackPlayer(g, compile(id), hourNow, g.ctx.currentTime + 0.08);
  playing = { id, player };
  player.pump(g.ctx.currentTime + 0.18);
  player.fadeTo(1, old ? seconds : 0.8);
  if (old) retire(old.player, seconds);
  ensureTimer();
}

function apply(seconds: number) {
  whenAudioReady((g) => {
    const want = wanted(); // re-evaluate: the world may have moved on before the first gesture
    if (!want) { if (playing) { retire(playing.player, seconds); playing = null; } return; }
    crossfade(g, want, seconds);
  });
}

/** Set what the game is doing. 'town' follows the clock. */
export function setMood(m: Mood) {
  if (m === mood) return;
  const wasTown = mood === 'town';
  mood = m;
  place = null;
  apply(m === 'town' && wasTown ? FADE.town : FADE.scene);
}

/** A shop panel opened: its interior theme takes over until leavePlace(). */
export function enterPlace(p: Place) {
  place = p;
  apply(FADE.place);
}
export function leavePlace() {
  if (!place) return;
  place = null;
  apply(FADE.place);
}

/** Cheap per-frame hook: re-checks the clock about once a second so day -> evening -> night crossfade on their own. */
export function updateDirector(dt: number) {
  clockT += dt;
  if (clockT < 1) return;
  clockT = 0;
  if (mood === 'town' && !place) apply(FADE.town);
}
