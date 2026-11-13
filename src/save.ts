import { defaultBonds, defaultState, state, type SaveData } from './state';
import { TOWN_OFFSET, MAP_VERSION } from './world';
import { migrateWardrobe } from './clothes/migrate';

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
    // fields added after the first release: old saves get fresh defaults, existing data stays untouched
    for (const k of ['skills', 'bank', 'nodes', 'questLog', 'unlocked', 'events'] as const) {
      const v = state[k] as unknown;
      if (!v || typeof v !== 'object' || Array.isArray(v)) (state as unknown as Record<string, unknown>)[k] = {};
    }
    normalizeFriendship(data);
    // outfits became a slot-based wardrobe: map the old outfit / owned outfits onto worn slots + owned clothes
    Object.assign(state, migrateWardrobe(data as Parameters<typeof migrateWardrobe>[0]));
    delete (state as unknown as Record<string, unknown>).outfit;
    delete (state as unknown as Record<string, unknown>).ownedOutfits;
    if (!state.regionSeen || typeof state.regionSeen !== 'object' || Array.isArray(state.regionSeen)) state.regionSeen = {};
    if (!Array.isArray(state.partyHats)) state.partyHats = [];
    if ((data.mapV ?? 1) < MAP_VERSION) migrateMap();
    state.mapV = MAP_VERSION;
    return true;
  } catch {
    return false;
  }
}

/** Friendship came later: saves without `bonds` (or with a damaged one) get a fresh one; points are clamped to what a heart scale allows. */
function normalizeFriendship(data: Partial<SaveData>) {
  const base = defaultBonds();
  const b = (data.bonds && typeof data.bonds === 'object' ? data.bonds : {}) as Partial<SaveData['bonds']>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const known: SaveData['bonds']['known'] = {};
  if (b.known && typeof b.known === 'object' && !Array.isArray(b.known)) {
    for (const [id, k] of Object.entries(b.known)) known[id] = { love: list(k?.love), like: list(k?.like), dislike: list(k?.dislike) };
  }
  const letters = Array.isArray(b.letters)
    ? b.letters.filter((l) => l && typeof l.id === 'string' && typeof l.from === 'string').map((l) => ({ id: l.id, from: l.from, at: Number(l.at) || 0, read: !!l.read, taken: !!l.taken }))
    : base.letters;
  state.bonds = { known, letters, sent: list(b.sent), wished: list(b.wished), attended: list(b.attended) };
  if (!state.friend || typeof state.friend !== 'object' || Array.isArray(state.friend)) state.friend = {};
  for (const k of Object.keys(state.friend)) {
    const v = Number(state.friend[k]);
    state.friend[k] = Number.isFinite(v) ? Math.max(0, Math.min(200, v)) : 0;
  }
}

/**
 * The island grew: the old 60x44 map now sits inside the bigger one, shifted by TOWN_OFFSET tiles. Saved positions
 * move with it (the player, decor, garden plots and collectibles). Whether the player landed somewhere blocked or in
 * a still-locked area is sorted out by placePlayer() when the game starts.
 */
function migrateMap() {
  const ox = TOWN_OFFSET.x, oy = TOWN_OFFSET.y;
  state.px += ox * 32; state.py += oy * 32;
  state.decor = (state.decor ?? []).map((d) => ({ ...d, x: d.x + ox, y: d.y + oy }));
  const plots: SaveData['plots'] = {};
  for (const [k, v] of Object.entries(state.plots ?? {})) {
    const [x, y] = k.split(',').map(Number);
    plots[`${x + ox},${y + oy}`] = v;
  }
  state.plots = plots;
  state.spawns = (state.spawns ?? []).map((s) => ({ ...s, x: s.x + ox * 32, y: s.y + oy * 32 }));
  state.nodes = {}; // node ids belong to the old layout; everything simply starts ready
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
