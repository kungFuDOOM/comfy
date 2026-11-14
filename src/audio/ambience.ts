// Weather ambience: soft, sparse raindrop plinks (no noise bed, no whoosh). Silent until audio is unlocked; follows the SFX volume.
import { getGraph, type AudioGraph } from './engine';

const DROP_PEAK = 0.05;   // loudest single drop; well under the music
const MIN_LEVEL = 0.01;   // below this the rain fades out and scheduling stops
const AHEAD = 0.6;        // seconds of drops scheduled in advance on the audio clock
const TICK_MS = 250;

let master: GainNode | null = null;
let timer: number | null = null;
let level = 0;
let nextT = 0;     // audio-clock time of the next drop
let silentAt = 0;  // when the fade-out has finished and the timer can stop

/** One tiny water drip: a short sine blip with a quick downward slide and a light random pan. */
function drop(g: AudioGraph, t: number, vol: number) {
  const { ctx } = g;
  const hz = 1400 + Math.random() * 1800;
  const osc = ctx.createOscillator();
  osc.type = Math.random() < 0.7 ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(hz, t);
  osc.frequency.exponentialRampToValueAtTime(hz * (0.72 + Math.random() * 0.1), t + 0.06);
  const a = ctx.createGain();
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(vol, t + 0.003);
  a.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  const pan = ctx.createStereoPanner(); pan.pan.value = (Math.random() * 2 - 1) * 0.6;
  osc.connect(a).connect(pan).connect(master!);
  osc.start(t); osc.stop(t + 0.1);
}

function tick() {
  const g = getGraph();
  if (!g || !master) return;
  const now = g.ctx.currentTime;
  if (level < MIN_LEVEL) {
    if (now > silentAt) { clearInterval(timer!); timer = null; }
    return;
  }
  if (nextT < now) nextT = now + 0.05;
  // light rain ~1.5 drops/s, full rain ~5/s; random spacing, never a machine gun
  const rate = 1.5 + level * 3.5;
  while (nextT < now + AHEAD) {
    drop(g, nextT, DROP_PEAK * (0.35 + 0.65 * level) * (0.5 + Math.random() * 0.5));
    nextT += Math.max(0.09, -Math.log(1 - Math.random()) / rate);
  }
}

/** level 0..1: how much rain to hear. Cheap to call every few frames. */
export function setRainLevel(l: number) {
  const g = getGraph();
  if (!g || g.ctx.state !== 'running') return;
  level = l;
  const on = l >= MIN_LEVEL;
  if (!master) {
    if (!on) return;
    master = g.ctx.createGain(); master.gain.value = 0;
    master.connect(g.sfxIn);
  }
  master.gain.setTargetAtTime(on ? 1 : 0, g.ctx.currentTime, 0.6);
  if (on) {
    silentAt = g.ctx.currentTime + 3;
    if (timer === null) { nextT = 0; timer = window.setInterval(tick, TICK_MS); }
  } else if (timer !== null) silentAt = Math.min(silentAt, g.ctx.currentTime + 3);
}
