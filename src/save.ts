import { defaultBonds, defaultMerchant, defaultState, defaultStyle, defaultTalk, emptyCollection, state, type SaveData } from './state';
import { normalizeHome } from './home';
import { TOWN_OFFSET, MAP_VERSION } from './world';
import { migrateWardrobe } from './clothes/migrate';
import { sanitizePet, sanitizePetCare } from './petData';
import { sanitizeErrands } from './errandData';
import { ITEMS, SKILLS, VILLAGERS } from './data';
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
    state.seenCutscenes = sanitizeSeen(data.seenCutscenes); // saves from before the cutscene registry: nothing seen yet; junk is dropped
    state.photos = sanitizePhotos(data.photos); // saves from before photo mode have no album
    state.style = sanitizeStyle(data.style);
    state.home = normalizeHome(data.home); // saves from before home decorating: an empty, default-styled room
    state.pet = sanitizePet(data.pet); // saves from before pets: no pet yet; anything malformed is dropped
    state.petCare = sanitizePetCare(data.petCare); // saves from before Pet Care: fresh counters
    state.errands = sanitizeErrands(data.errands, { item: (id) => !!ITEMS[id], skill: (id) => SKILLS.some((k) => k.id === id), giver: (id) => VILLAGERS.some((v) => v.id === id) }); // saves from before the bulletin board: empty, it posts on the first tick
    state.collection = sanitizeCollection(data.collection);
    state.talk = sanitizeTalk(data.talk); // saves from before the conversation rework: nothing said yet
    state.advent = sanitizeAdvent(data.advent); // saves from before the advent calendar: no doors opened yet
    state.today = sanitizeToday(data.today); // saves from before the Today card: no streak, not shown yet
    if ((data.mapV ?? 1) < MAP_VERSION) migrateMap();
    state.mapV = MAP_VERSION;
    return true;
  } catch {
    return false;
  }
}

/** Unique strings only; anything else (missing, not an array, odd entries) becomes an empty / shorter list. */
function sanitizeSeen(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 60))].slice(0, 200);
}

/** Has this cutscene been watched (or skipped) in a real play? */
export const hasSeenCutscene = (id: string) => state.seenCutscenes.includes(id);
/** Remember a cutscene as seen (idempotent) and write the save. Previews never call this. */
export function markCutsceneSeen(id: string) {
  if (!state.seenCutscenes.includes(id)) { state.seenCutscenes.push(id); saveGame(); }
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

/** Conversation memory is optional in old saves and trusted no further than its shape; lists are capped. */
function sanitizeTalk(raw: unknown): SaveData['talk'] {
  const t = defaultTalk();
  if (!raw || typeof raw !== 'object') return t;
  const r = raw as Partial<Record<keyof SaveData['talk'], unknown>>;
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
  const strs = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length < 80) : []).slice(-max);
  for (const [id, list] of Object.entries(obj(r.recent))) t.recent[id] = strs(list, 36);
  for (const [id, snap] of Object.entries(obj(r.since))) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj(snap))) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    t.since[id] = out;
  }
  t.once = [...new Set(strs(r.once, 400))];
  for (const [id, g] of Object.entries(obj(r.gift))) {
    const { item, taste, day } = obj(g);
    if (typeof item === 'string' && typeof taste === 'string' && typeof day === 'string') t.gift[id] = { item, taste, day };
  }
  // reply indexes only (which pill they picked), never the words; a missing map is an empty one
  for (const [id, bag] of Object.entries(obj(r.answers))) {
    const out: Record<string, number> = {};
    for (const [q, v] of Object.entries(obj(bag))) {
      if (q.length < 80 && typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 8) out[q] = v;
    }
    const keys = Object.keys(out).slice(0, 12);
    if (keys.length) t.answers[id] = Object.fromEntries(keys.map((k) => [k, out[k]]));
  }
  return t;
}

/** Today-card progress is optional in old saves. Junk becomes a fresh note; a gap in the streak is not punished here. */
function sanitizeToday(raw: unknown): SaveData['today'] {
  const out: SaveData['today'] = { lastShown: '', streak: 0, lastDay: '' };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<SaveData['today']>;
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(v) ? v : '');
  out.lastShown = day(r.lastShown);
  out.lastDay = day(r.lastDay);
  if (typeof r.streak === 'number' && Number.isFinite(r.streak) && r.streak > 0 && r.streak < 100000) out.streak = Math.floor(r.streak);
  return out;
}

/** Advent progress is optional in old saves. Only door numbers 1–24 and a sane year are kept. */
function sanitizeAdvent(raw: unknown): SaveData['advent'] {
  const out: SaveData['advent'] = { opened: [], year: 0 };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<SaveData['advent']>;
  if (typeof r.year === 'number' && Number.isInteger(r.year) && r.year >= 2000 && r.year <= 9999) out.year = r.year;
  if (!Array.isArray(r.opened)) return out;
  const seen = new Set<number>();
  for (const n of r.opened) {
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 24) seen.add(n);
  }
  out.opened = [...seen].sort((a, b) => a - b);
  return out;
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
