// Player preferences that live outside the save file (they survive "New Game").
const KEY = 'comfy.settings.v1';

export interface Settings {
  /** Master volume 0..1. Nothing plays audio yet; the audio pass can read this and subscribe to changes. */
  volume: number;
}

const settings: Settings = { volume: 0.8 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const v = Number((JSON.parse(raw) as Partial<Settings>).volume);
    if (Number.isFinite(v)) settings.volume = Math.max(0, Math.min(1, v));
  }
} catch { /* storage unavailable: defaults are fine */ }

const listeners = new Set<(v: number) => void>();

export const getVolume = () => settings.volume;

export function setVolume(v: number) {
  settings.volume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  listeners.forEach((f) => f(settings.volume));
}

/** Subscribe to volume changes; returns an unsubscribe function. */
export function onVolumeChange(fn: (v: number) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
