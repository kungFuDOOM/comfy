import { defaultBonds, defaultMerchant, defaultState, defaultStyle, emptyCollection, state, type SaveData } from './state';
import { normalizeHome } from './home';
import { TOWN_OFFSET, MAP_VERSION } from './world';
import { migrateWardrobe } from './clothes/migrate';
import { sanitizePet } from './petData';
import { sanitizeMerchant } from './merchantData';

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
    // café shifts: older saves have no cafe / daily.shifts. Keep only finite numbers; a mid-day load keeps today's count.
    const cafe = (data.cafe && typeof data.cafe === 'object' ? data.cafe : {}) as Partial<Record<keyof typeof base.cafe, unknown>>;
    state.cafe = base.cafe;
    for (const k of Object.keys(base.cafe) as (keyof typeof base.cafe)[]) { const v = cafe[k]; if (typeof v === 'number' && Number.isFinite(v)) state.cafe[k] = v; }
    if (typeof state.daily.shifts !== 'number' || !Number.isFinite(state.daily.shifts)) state.daily.shifts = 0;
    state.merchant = sanitizeMerchant(data.merchant, defaultMerchant()); // saves from before the merchant: nobody has visited yet
    if (!state.regionSeen || typeof state.regionSeen !== 'object' || Array.isArray(state.regionSeen)) state.regionSeen = {};
    if (!Array.isArray(state.partyHats)) state.partyHats = [];
    state.photos = sanitizePhotos(data.photos); // saves from before photo mode have no album
    state.style = sanitizeStyle(data.style);
    state.home = normalizeHome(data.home); // saves from before home decorating: an empty, default-styled room
    state.pet = sanitizePet(data.pet); // saves from before pets: no pet yet; anything malformed is dropped
    state.collection = sanitizeCollection(data.collection);
    if ((data.mapV ?? 1) < MAP_VERSION) migrateMap();
    state.mapV = MAP_VERSION;
    return true;
  } catch {
    return false;
  }
}

export const MAX_PHOTOS = 12;
const MAX_THUMB_CHARS = 60000; // a ~160px JPEG is ~8-15k chars; anything much bigger is not one of ours

/** Keep only well-formed album entries (a data:image thumbnail of sane size), newest first, within the cap. */
function sanitizePhotos(v: unknown): SaveData['photos'] {
  if (!Array.isArray(v)) return [];
  const out: SaveData['photos'] = [];
  for (const p of v) {
    if (!p || typeof p !== 'object') continue;
    const { at, thumb, note } = p as Record<string, unknown>;
    if (typeof thumb !== 'string' || !thumb.startsWith('data:image/') || thumb.length > MAX_THUMB_CHARS) continue;
    out.push({ at: Number.isFinite(Number(at)) ? Number(at) : 0, thumb, note: typeof note === 'string' ? note.slice(0, 30) : '' });
  }
  return out.slice(0, MAX_PHOTOS);
}

/** Styling contests came later: a missing or damaged record becomes an empty one; only valid tiers and day keys are kept. */
function sanitizeStyle(raw: unknown): SaveData['style'] {
  const out = defaultStyle();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<SaveData['style']>;
  if (r.ribbons && typeof r.ribbons === 'object' && !Array.isArray(r.ribbons)) {
    for (const [k, v] of Object.entries(r.ribbons)) if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3) out.ribbons[k] = v;
  }
  if (r.hosted && typeof r.hosted === 'object' && !Array.isArray(r.hosted)) {
    for (const [k, v] of Object.entries(r.hosted)) if (typeof v === 'string') out.hosted[k] = v;
  }
  if (typeof r.entries === 'number' && Number.isFinite(r.entries) && r.entries > 0) out.entries = Math.floor(r.entries);
  return out;
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

/** Collection Log data is optional in old saves, and is trusted no further than its shape. */
function sanitizeCollection(raw: unknown): SaveData['collection'] {
  const c = emptyCollection();
  if (!raw || typeof raw !== 'object') return c;
  const r = raw as Partial<Record<keyof SaveData['collection'], unknown>>;
  if (r.got && typeof r.got === 'object' && !Array.isArray(r.got)) {
    for (const [k, v] of Object.entries(r.got)) if (typeof v === 'number' && Number.isFinite(v)) c.got[k] = v;
  }
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  c.done = strs(r.done); c.fresh = strs(r.fresh); c.titles = strs(r.titles);
  c.title = typeof r.title === 'string' && c.titles.includes(r.title) ? r.title : null;
  return c;
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
