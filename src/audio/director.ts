// Music director: decides which track should be playing and crossfades between them.
//   mood  = what the game is doing ('menu' | 'intro' | 'town' | 'off')
//   place = a panel we are standing "inside" ('cafe' | 'boutique'), which overrides the town music
// In 'town' mood the track follows the real-time clock (src/time.ts phases).
import { getClock, type Phase } from '../time';
import { whenAudioReady, getGraph, setMusicWarmth, type AudioGraph } from './engine';
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
const FADE = { town: 4, place: 1.6, scene: 2 };

let mood: Mood = 'off';
let place: Place | null = null;
let playing: { id: string; player: TrackPlayer } | null = null;
/** One player per track, kept for the whole session so a theme resumes instead of restarting at bar 1. */
const pool = new Map<string, TrackPlayer>();
const parkTimers = new Map<TrackPlayer, number>();
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
  pool.forEach((p) => p.pump(until));
}

function ensureTimer() {
  if (!timer) timer = window.setInterval(pumpAll, 30);
}

function clearPark(p: TrackPlayer) {
  const id = parkTimers.get(p);
  if (id) { window.clearTimeout(id); parkTimers.delete(p); }
}

/** Fade a track out, then park it on its current step so the next visit continues. */
function park(p: TrackPlayer, seconds: number) {
  p.fadeTo(0, seconds);
  clearPark(p);
  const id = window.setTimeout(() => {
    parkTimers.delete(p);
    if (playing?.player !== p) p.suspend();
  }, seconds * 1000 + 80);
  parkTimers.set(p, id);
}

function acquire(g: AudioGraph, id: string): TrackPlayer {
  let p = pool.get(id);
  if (!p) {
    p = new TrackPlayer(g, compile(id), hourNow, g.ctx.currentTime);
    pool.set(id, p);
  }
  return p;
}

function crossfade(g: AudioGraph, id: string, seconds: number) {
  // already this theme: leave the clock alone (the town tick calls this every second)
  if (playing?.id === id && !playing.player.suspended) return;
  const old = playing && playing.player !== pool.get(id) ? playing : null;
  const player = acquire(g, id);
  clearPark(player);
  const waking = player.suspended;
  player.resume(g.ctx.currentTime + 0.06);
  playing = { id, player };
  player.pump(g.ctx.currentTime + 0.18);
  player.fadeTo(1, old || !waking ? seconds : 0.8);
  if (old) park(old.player, seconds);
  ensureTimer();
}

function apply(seconds: number) {
  whenAudioReady((g) => {
    const want = wanted(); // re-evaluate: the world may have moved on before the first gesture
    if (!want) { if (playing) { park(playing.player, seconds); playing = null; } return; }
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

/** A shop panel opened: its interior theme takes over until leavePlace(). Reopening resumes mid-phrase. */
export function enterPlace(p: Place) {
  if (place === p) return;
  place = p;
  apply(FADE.place);
}
export function leavePlace() {
  if (!place) return;
  place = null;
  apply(FADE.place);
}

/** How "sleepy" the music should sound at an hour: 0 by day, easing up through dusk to 1 late at night. */
function warmthFor(h: number): number {
  const ramp = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
  if (h >= 5 && h < 17) return h < 7 ? 0.25 * (1 - ramp((h - 5) / 2)) : 0;
  if (h < 5) return 1;
  return h < 22 ? ramp((h - 17) / 5) : 1;
}

/** Cheap per-frame hook: re-checks the clock about once a second so day -> evening -> night crossfade on their own. */
export function updateDirector(dt: number) {
  clockT += dt;
  if (clockT < 1) return;
  clockT = 0;
  setMusicWarmth(warmthFor(hourNow()));
  if (mood === 'town' && !place) apply(FADE.town);
}
