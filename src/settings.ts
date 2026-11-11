// Player preferences that live outside the save file (they survive "New Game").
const KEY = 'comfy.settings.v1';

export interface Settings {
  /** Music volume 0..1. */
  music: number;
  /** Sound-effects volume 0..1. */
  sfx: number;
  /**
   * Legacy single "Volume" slider from before the audio update. Kept in the stored object so old and new builds
   * can share a save; on load it seeds both new sliders when they have not been set yet.
   */
  volume: number;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const num = (v: unknown): number | null => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? clamp(Number(v)) : null);

const settings: Settings = { music: 0.8, sfx: 0.8, volume: 0.8 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw) as Partial<Settings>;
    const legacy = num(o.volume);
    if (legacy !== null) settings.volume = legacy;
    // migration: an old save only has `volume`; both new sliders inherit it
    settings.music = num(o.music) ?? legacy ?? settings.music;
    settings.sfx = num(o.sfx) ?? legacy ?? settings.sfx;
  }
} catch { /* storage unavailable: defaults are fine */ }

export type VolumeChannel = 'music' | 'sfx';
type Listener = (channel: VolumeChannel, v: number) => void;
const listeners = new Set<Listener>();

export const getMusicVolume = () => settings.music;
export const getSfxVolume = () => settings.sfx;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export function setMusicVolume(v: number) {
  settings.music = clamp(v);
  settings.volume = settings.music; // keep the legacy field roughly meaningful for older builds
  save();
  listeners.forEach((f) => f('music', settings.music));
}

export function setSfxVolume(v: number) {
  settings.sfx = clamp(v);
  save();
  listeners.forEach((f) => f('sfx', settings.sfx));
}

/** Subscribe to Music / SFX slider changes; returns an unsubscribe function. */
export function onVolumeChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
