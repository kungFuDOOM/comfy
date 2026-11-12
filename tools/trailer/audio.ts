// Trailer soundtrack: the game's own synthesized music and sound effects, rendered offline (faster than real time)
// into a WAV with an OfflineAudioContext. Loaded into the dev build by tools/trailer/audio.cjs.
import { compileTrack, TrackPlayer } from '../../src/audio/sequencer';
import { TRACKS } from '../../src/audio/tracks';
import type { AudioGraph } from '../../src/audio/engine';

export interface Section { track: string; start: number; end: number; fadeIn: number; fadeOut: number; hour: number; gain?: number; offset?: number }
export interface Cue { at: number; sfx: string; arg?: unknown }

const SR = 48000;

function impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return buf;
}

/** The same bus layout as src/audio/engine.ts, built on an offline context. */
function buildGraph(ctx: OfflineAudioContext): AudioGraph {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  const master = ctx.createGain();
  master.connect(comp).connect(ctx.destination);
  const musicBus = ctx.createGain(); musicBus.gain.value = 0.3;
  const sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55;
  musicBus.connect(master); sfxBus.connect(master);
  const musicIn = ctx.createGain();
  const warm = ctx.createBiquadFilter(); warm.type = 'highshelf'; warm.frequency.value = 2800; warm.gain.value = -4;
  const wet = ctx.createGain(); wet.gain.value = 0.14;
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.3, 3.6);
  musicIn.connect(warm).connect(musicBus);
  musicIn.connect(verb).connect(wet).connect(musicBus);
  // the SFX get a touch of room too, so the bell rings out
  const sfxIn = ctx.createGain();
  const sverb = ctx.createConvolver(); sverb.buffer = impulse(ctx, 2.6, 2.4);
  const swet = ctx.createGain(); swet.gain.value = 0.22;
  sfxIn.connect(sfxBus); sfxIn.connect(sverb).connect(swet).connect(sfxBus);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return { ctx: ctx as unknown as AudioContext, musicIn, sfxIn, noise };
}

/** The game's sfx module, re-pointed at the offline graph (it normally reads the live engine's context). */
async function loadSfx(g: AudioGraph) {
  const url = new URL('/comfy/src/audio/sfx.ts', location.origin).href;
  let code = await (await fetch(url)).text();
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*engine\.ts[^"']*["'];?/, 'const getGraph = () => window.__offlineGraph;');
  code = code.replace(/from\s*["'](\/comfy\/[^"']+)["']/g, (_m, p) => `from "${location.origin}${p}"`);
  code = code.replace(/g\.ctx\.state\s*===\s*["']running["']/g, 'true');
  (window as unknown as { __offlineGraph: AudioGraph }).__offlineGraph = g;
  const mod = await import(/* @vite-ignore */ URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.sfx as Record<string, (...a: unknown[]) => void>;
}

/** The Hush Bell: a warm struck bell (inharmonic partials) with a sparkle of high twinkles. */
function hushBell(g: AudioGraph, t: number, root = 72, level = 0.55) {
  const { ctx } = g;
  const f0 = 440 * Math.pow(2, (root - 69) / 12);
  const partials: [number, number, number][] = [[0.5, 0.22, 5.5], [1, 0.3, 4.2], [1.19, 0.12, 3.2], [1.5, 0.1, 2.6], [2, 0.14, 2.4], [2.76, 0.08, 1.6], [3.9, 0.05, 1.1], [5.4, 0.03, 0.8]];
  for (const [ratio, amp, dec] of partials) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * ratio;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(amp * level, t + 0.006);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(a).connect(g.sfxIn);
    o.start(t); o.stop(t + dec + 0.05);
  }
  [96, 100, 103, 108].forEach((m, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
    const a = ctx.createGain(); const s = t + 0.18 + i * 0.11;
    a.gain.setValueAtTime(0.0001, s); a.gain.linearRampToValueAtTime(0.035 * level, s + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, s + 1.2);
    o.connect(a).connect(g.sfxIn); o.start(s); o.stop(s + 1.3);
  });
}

function toWav(buf: AudioBuffer): string {
  const ch = buf.numberOfChannels, n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { out.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 0x7fff, true); o += 2; }
  let bin = '';
  const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Render the whole soundtrack and return it as a base64 WAV. */
export async function renderSoundtrack(duration: number, sections: Section[], cues: Cue[]): Promise<string> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SR), SR);
  const g = buildGraph(ctx);
  const sfx = await loadSfx(g);

  for (const s of sections) {
    const ct = compileTrack(TRACKS[s.track]);
    // start the sequencer early by `offset` seconds so the section can begin mid-phrase if wanted
    const p = new TrackPlayer(g, ct, () => s.hour, s.start - (s.offset ?? 0));
    p.resume(s.start - (s.offset ?? 0));
    const lvl = s.gain ?? 1;
    const gn = p.out.gain;
    gn.cancelScheduledValues(0);
    gn.setValueAtTime(0, 0);
    gn.setValueAtTime(0, Math.max(0, s.start));
    gn.linearRampToValueAtTime(lvl, s.start + Math.max(0.01, s.fadeIn));
    gn.setValueAtTime(lvl, Math.max(s.start + s.fadeIn, s.end - s.fadeOut));
    gn.linearRampToValueAtTime(0, s.end);
    p.pump(s.end + 0.2);
    p.stopped = true;
  }

  for (const c of cues) {
    void ctx.suspend(c.at).then(() => {
      if (c.sfx === 'bell') hushBell(g, ctx.currentTime, (c.arg as number) ?? 72);
      else sfx[c.sfx]?.(c.arg);
      void ctx.resume();
    });
  }
  const buf = await ctx.startRendering();
  return toWav(buf);
}
