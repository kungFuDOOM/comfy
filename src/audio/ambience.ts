// Weather ambience: a very soft rain hush (filtered noise loop). Silent until audio is unlocked; follows the SFX volume.
import { getGraph } from './engine';

let rain: { gain: GainNode } | null = null;
const PEAK = 0.035;

/** level 0..1: how much rain to hear. Cheap to call every few frames. */
export function setRainLevel(level: number) {
  const g = getGraph();
  if (!g || g.ctx.state !== 'running') return;
  if (!rain) {
    if (level < 0.01) return;
    const { ctx } = g;
    const src = ctx.createBufferSource(); src.buffer = g.noise; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; lp.Q.value = 0.4;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(hp).connect(lp).connect(gain).connect(g.sfxIn);
    src.start();
    rain = { gain };
  }
  rain.gain.gain.setTargetAtTime(level * PEAK, g.ctx.currentTime, 0.6);
}
