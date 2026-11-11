import { defaultState, state, type SaveData } from './state';

const KEY = 'comfy.save.v1';

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultState();
    Object.assign(state, base, data);
    state.daily = { ...base.daily, ...(data.daily ?? {}) };
    if (!Array.isArray(state.hotbar) || state.hotbar.length !== 9) state.hotbar = base.hotbar;
    return true;
  } catch {
    return false;
  }
}

export function saveGame() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode); the game still works */
  }
}

export function resetGame() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  location.reload();
}
