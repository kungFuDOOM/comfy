// Audio engine: one lazily created AudioContext with a music bus and an SFX bus.
//   music voices -> musicBus -> (dry) -> master -> compressor -> destination
//                            \-> reverb send -/
//   sfx voices   -> sfxBus   -> master
// Everything is generated in code; there are no audio files.
import { getMusicVolume, getSfxVolume, onVolumeChange } from '../settings';

export interface AudioGraph {
  ctx: AudioContext;
  /** Where music voices connect (per-track gains sit in front of this). */
  musicIn: GainNode;
  sfxIn: GainNode;
  /** Shared white noise buffer (2 s) for hats, shakers, breath, steps. */
  noise: AudioBuffer;
}

let graph: AudioGraph | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let hiddenMute = false;
const readyFns: ((g: AudioGraph) => void)[] = [];

/** Music sits under the SFX in the mix; these are the 100% slider levels. */
const MUSIC_MAX = 0.55;
const SFX_MAX = 0.9;

export const getGraph = () => graph;
export const audioReady = () => graph !== null && graph.ctx.state === 'running';

/** Run `fn` once the context exists (immediately if it already does). */
export function whenAudioReady(fn: (g: AudioGraph) => void) {
  if (graph) fn(graph); else readyFns.push(fn);
}

function makeImpulse(ctx: AudioContext, seconds = 1.5, decay = 3.2): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return buf;
}

function build(): AudioGraph | null {
  const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  let ctx: AudioContext;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch { return null; }

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  master = ctx.createGain();
  master.gain.value = hiddenMute ? 0 : 1;
  master.connect(comp).connect(ctx.destination);

  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  applyVolumes(true);

  // a small cozy room for the music
  const musicIn = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  const verb = ctx.createConvolver();
  verb.buffer = makeImpulse(ctx);
  musicIn.connect(musicBus);
  musicIn.connect(verb).connect(wet).connect(musicBus);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  graph = { ctx, musicIn, sfxIn: sfxBus, noise };
  readyFns.splice(0).forEach((f) => f(graph!));
  return graph;
}

function applyVolumes(instant = false) {
  if (!graph && !musicBus) return;
  const ctx = graph?.ctx ?? musicBus!.context;
  const t = ctx.currentTime;
  // perceptual-ish curve so the low end of the slider is useful
  const mv = Math.pow(getMusicVolume(), 1.6) * MUSIC_MAX;
  const sv = Math.pow(getSfxVolume(), 1.6) * SFX_MAX;
  for (const [node, v] of [[musicBus, mv], [sfxBus, sv]] as [GainNode | null, number][]) {
    if (!node) continue;
    node.gain.cancelScheduledValues(t);
    if (instant) node.gain.value = v; else node.gain.setTargetAtTime(v, t, 0.04);
  }
}

function setHidden(hidden: boolean) {
  hiddenMute = hidden;
  if (!graph || !master) return;
  const { ctx } = graph;
  if (hidden) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    // suspend after the fade so the clock (and the sequencers' lookahead) stops with it
    window.setTimeout(() => { if (hiddenMute && ctx.state === 'running') void ctx.suspend(); }, 150);
  } else {
    void ctx.resume().then(() => {
      applyVolumes(true); // saved volumes come straight back
      master!.gain.cancelScheduledValues(ctx.currentTime);
      master!.gain.setTargetAtTime(1, ctx.currentTime, 0.08);
    }).catch(() => { /* needs a gesture; the unlock listeners will retry */ });
  }
}

let installed = false;
/** Call once at boot. Wires the unlock-on-first-gesture, tab-visibility and slider listeners. */
export function initAudio() {
  if (installed) return;
  installed = true;
  hiddenMute = document.hidden;

  const gesture = () => unlockAudio();
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const) {
    window.addEventListener(ev, gesture, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => setHidden(document.hidden));
  window.addEventListener('pagehide', () => setHidden(true));
  window.addEventListener('pageshow', () => setHidden(document.hidden));
  onVolumeChange(() => applyVolumes());
}

/**
 * Create / resume the context. Must run inside a user gesture (pointer, key, or a gamepad button press that the
 * input layer forwards here) for mobile Safari to allow sound.
 */
export function unlockAudio() {
  if (document.hidden) return;
  const g = graph ?? build();
  if (!g) return;
  if (g.ctx.state !== 'running') void g.ctx.resume().catch(() => { /* try again on the next gesture */ });
  // iOS wants a real node started inside the gesture
  if (!unlocked) {
    unlocked = true;
    const s = g.ctx.createBufferSource();
    s.buffer = g.ctx.createBuffer(1, 1, g.ctx.sampleRate);
    s.connect(g.ctx.destination);
    s.start(0);
  }
}
let unlocked = false;
