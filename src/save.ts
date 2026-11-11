import { defaultState, state, type SaveData } from './state';

const KEY = 'comfy.save.v1';

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultState();
    // saves from before the intro existed have already "arrived"
    if (data.seenIntro === undefined) data.seenIntro = true;
    Object.assign(state, base, data);
    state.daily = { ...base.daily, ...(data.daily ?? {}) };
    if (!Array.isArray(state.hotbar) || state.hotbar.length !== 9) state.hotbar = base.hotbar;
    return true;
  } catch {
    return false;
  }
}

/** True when a saved island exists (show "Continue"). */
export function hasSave(): boolean {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

/** Start over in memory without reloading the page: fresh state, old save removed. */
export function newGame() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  const base = defaultState();
  for (const k of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[k];
  Object.assign(state, base);
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
