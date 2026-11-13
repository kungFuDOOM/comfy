// The Collection Log: a scrapbook of every fish, bug, shell, forageable, gem, outfit piece and furniture item the
// player has ever obtained, grouped into named sets that pay a reward when complete.
//
// How it stays correct without touching every place that hands out items: syncCollection() looks at what the player
// holds (bag, chest, placed decor, found collectibles, wardrobe) and records anything new. It runs on every game
// 'change', and once at load, which is also the backfill for saves from before the log existed.
import { sfx } from './audio';
import { bus, changed, toast } from './bus';
import { CLOTHES, clothById } from './clothes';
import { ITEMS, SHOP_DECOR } from './data';
import { eventById } from './events';
import { addItem, bankCount, count, earn } from './inventory';
import { PARTY_HAT, STAR_HAT } from './regions';
import { state } from './state';
import { grantCloth, howToGet } from './wardrobe';

// ---------- categories ----------
export type CatId = 'fish' | 'bug' | 'shell' | 'forage' | 'gem' | 'outfit' | 'furniture';
export interface CatDef { id: CatId; name: string; icon: string; blurb: string }
export const CATS: CatDef[] = [
  { id: 'fish', name: 'Fish', icon: '🐟', blurb: 'Everything shy that swims around Sugarlily Isle.' },
  { id: 'bug', name: 'Bugs', icon: '🐞', blurb: 'Tiny friends who pop out while you forage.' },
  { id: 'shell', name: 'Shells', icon: '🐚', blurb: 'Treasures the tide leaves on the sand.' },
  { id: 'forage', name: 'Forage', icon: '🍓', blurb: 'Berries, blossoms, beans and woodland bits.' },
  { id: 'gem', name: 'Gems & Ore', icon: '💎', blurb: 'Glints in the sand, the sap and the hillside.' },
  { id: 'outfit', name: 'Outfits', icon: '👗', blurb: 'Every piece that has ever been in your wardrobe.' },
  { id: 'furniture', name: 'Furniture', icon: '🛋️', blurb: 'Decor you have owned for your yard.' },
];
export const catById = (id: CatId) => CATS.find((c) => c.id === id)!;

// ---------- entries ----------
export interface Entry {
  /** Item id, or `c:` + wardrobe id for outfit pieces. */
  id: string;
  cat: CatId;
  name: string;
  /** Where to find it, shown on the silhouette. */
  hint: string;
}

const FISH = ['minnow', 'pebble_guppy', 'tadpole', 'perch', 'peach_carp', 'lace_betta', 'koi', 'lavender_ray', 'sugar_seahorse'];
const BUGS = ['puff_bee', 'dot_ladybug', 'sugar_snail', 'bean_beetle', 'moth', 'glow_fly', 'wisp_dragonfly'];
const SHELLS = ['shell', 'conch', 'sand_dollar', 'cowrie', 'pearlshell', 'swirl_whelk', 'starfish'];
const FORAGE = ['blossom', 'puffberry', 'lucky_clover', 'sweet_mushroom', 'glowberry', 'moonpetal', 'beans', 'rare_beans', 'twig', 'button'];
const GEMS = ['sea_glass', 'honey_amber', 'candy_copper', 'rose_quartz', 'moonstone', 'twinkle_geode', 'frost_opal'];
const SET_DECOR = ['d_fishbowl', 'd_forage_basket', 'd_gem_stand', 'd_cafe_sign'];

/** Where to find each item, in friendly words. Spots are named the way the island names them. */
const HINTS: Record<string, string> = {
  minnow: 'Cast a line at a Puddle Spot: the south shore and the pond.',
  pebble_guppy: 'Sometimes bites at Puddle Spots, the shallow fishing ripples.',
  tadpole: 'A rare nibble at Puddle Spots. Keep casting.',
  perch: 'Ribbon Spots, out past the shallows. Needs Fishing 6 and the Dew-line Rod.',
  peach_carp: 'Sometimes bites at Ribbon Spots (Fishing 6, Dew-line Rod).',
  lace_betta: 'A rare nibble at Ribbon Spots (Fishing 6, Dew-line Rod).',
  koi: 'Moonlit Spots in the deepest water. Needs Fishing 12 and the Dew-line Rod.',
  lavender_ray: 'Sometimes bites at Moonlit Spots (Fishing 12, Dew-line Rod).',
  sugar_seahorse: 'A very rare nibble at Moonlit Spots (Fishing 12, Dew-line Rod).',
  puff_bee: 'Daytime. Gather from Ribbon Blossom Patches and one may buzz out.',
  dot_ladybug: 'Pick berries from a bush and one may tumble out.',
  sugar_snail: 'Gather twigs at a Sugarwood Stump. Sometimes one rides along.',
  bean_beetle: 'Pick coffee cherries from a Coffee Shrub.',
  moth: 'Drifts around the island at dusk and at night.',
  glow_fly: 'Evening and night. Gather from berry bushes and blossom patches.',
  wisp_dragonfly: 'Gather from Moonpetal Patches (Foraging 6) and look up.',
  shell: 'Dig at Shell Beds, or spot them lying on any beach.',
  conch: 'Dig at Shell Beds on the shore.',
  sand_dollar: 'Dig at Shell Beds on the shore.',
  cowrie: 'Dig at Shell Beds on the shore.',
  pearlshell: 'Rosepearl Beds on the Pearl Shore. Needs Foraging 7.',
  swirl_whelk: 'Dig at Rosepearl Beds (Foraging 7).',
  starfish: 'Dig at Rosepearl Beds (Foraging 7). It naps under the shells.',
  blossom: 'Ribbon Blossom Patches and the flower meadows.',
  puffberry: 'Puffberry Bushes in Ribbon Meadow, or grow them in your garden.',
  lucky_clover: 'Gather from blossom or moonpetal patches. Always a surprise.',
  sweet_mushroom: 'Gather twigs at a Sugarwood Stump and look closely.',
  glowberry: 'Lanternberry Bushes. Needs Foraging 8.',
  moonpetal: 'Moonpetal Patches. Needs Foraging 6.',
  beans: 'Coffee Shrubs, or the café pantry. Needs Foraging 2 to pick.',
  rare_beans: 'Starfreckle Shrubs. Needs Foraging 9.',
  twig: 'Sugarwood Stumps around the meadows.',
  button: 'Lying around the grove hillside, most often in snowy Snowfluff weather.',
  sea_glass: 'Glints on beaches, or dig it up at Shell Beds.',
  honey_amber: 'A rare glint inside Sugarwood Stumps when you gather twigs.',
  candy_copper: 'Glints on the hillside above town.',
  rose_quartz: 'Dig at Rosepearl Beds (Foraging 7), or find it on the hillside.',
  moonstone: 'Sometimes snagged while fishing at Ribbon and Moonlit Spots.',
  twinkle_geode: 'Glints on the hillside after dark.',
  frost_opal: 'Rare hillside glints, most often in snowy Snowfluff weather.',
  d_fishbowl: 'Complete the Moonlit Catch set.',
  d_forage_basket: 'Complete the Moonlit Pantry set.',
  d_gem_stand: 'Complete the Sparkle Pebbles set.',
  d_cafe_sign: 'Complete the Cozy Cafe Set.',
};

function decorHint(id: string): string {
  const it = ITEMS[id];
  if (it.event) { const e = eventById(it.event); return `Seasonal: ${e?.name ?? 'a seasonal event'}, earned only while it runs.`; }
  if (it.buy) return `Sold at Spot & Bow, on the Decor shelf, for ${it.buy} pips.`;
  return HINTS[id] ?? 'Earned somewhere on the island.';
}

let built: Entry[] | null = null;
const byKey = new Map<string, Entry>();

/** Every log entry in display order (built once; the catalog never changes while the game runs). */
export function allEntries(): Entry[] {
  if (built) return built;
  const out: Entry[] = [];
  const items = (ids: string[], cat: CatId, hint: (id: string) => string) => { for (const id of ids) if (ITEMS[id]) out.push({ id, cat, name: ITEMS[id].name, hint: hint(id) }); };
  const hinted = (id: string) => HINTS[id] ?? 'Out and about on the island.';
  items(FISH, 'fish', hinted); items(BUGS, 'bug', hinted); items(SHELLS, 'shell', hinted); items(FORAGE, 'forage', hinted); items(GEMS, 'gem', hinted);
  for (const c of CLOTHES) out.push({ id: `c:${c.id}`, cat: 'outfit', name: c.name, hint: howToGet(c) });
  const decor = Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'decor');
  const ordered = [...SHOP_DECOR, ...SET_DECOR, ...decor.filter((id) => !SHOP_DECOR.includes(id) && !SET_DECOR.includes(id))];
  items(ordered, 'furniture', decorHint);
  built = out;
  for (const e of out) byKey.set(e.id, e);
  return out;
}
export const entryById = (id: string): Entry | undefined => { allEntries(); return byKey.get(id); };
export const entriesIn = (cat: CatId) => allEntries().filter((e) => e.cat === cat);

export const hasEntry = (id: string) => (state.collection.got[id] ?? 0) > 0;
export const isFresh = (id: string) => state.collection.fresh.includes(id);

export interface Progress { have: number; total: number; pct: number }
function progressOf(ids: string[]): Progress {
  let have = 0;
  for (const id of ids) if (hasEntry(id)) have++;
  const total = ids.length;
  return { have, total, pct: total ? Math.floor((have / total) * 100) : 0 };
}
export const catProgress = (cat: CatId): Progress => progressOf(entriesIn(cat).map((e) => e.id));
/** The overall figure is the average of the categories, so 400+ outfit pieces do not drown out everything else. */
export function overallProgress(): { pct: number; have: number; total: number } {
  let sum = 0, have = 0, total = 0;
  for (const c of CATS) { const p = catProgress(c.id); sum += p.have / Math.max(1, p.total); have += p.have; total += p.total; }
  return { pct: Math.floor((sum / CATS.length) * 100), have, total };
}

// ---------- sets ----------
export interface Reward { pips?: number; title?: string; decor?: string; cloth?: string }
export interface SetDef {
  id: string;
  name: string;
  cat: CatId | 'grand';
  blurb: string;
  /** Entry ids that must all have been obtained (or, for the grand set, the ids of the other sets). */
  members: string[];
  reward: Reward;
}

const C = (id: string) => `c:${id}`;
const hats = [...Object.values(PARTY_HAT), STAR_HAT].map(C);
const SET_LIST: SetDef[] = [
  { id: 'pond_friends', name: 'Pond Friends', cat: 'fish', blurb: 'Three small swimmers who share one puddle.', members: ['minnow', 'pebble_guppy', 'tadpole'], reward: { pips: 80, title: 'Pond Pal' } },
  { id: 'ribbon_waters', name: 'Ribbon Waters', cat: 'fish', blurb: 'Pretty fish with ribbon fins from the deeper shallows.', members: ['perch', 'peach_carp', 'lace_betta'], reward: { pips: 150, title: 'Ribbon Angler' } },
  { id: 'moonlit_catch', name: 'Moonlit Catch', cat: 'fish', blurb: 'The dreamy ones from the very deepest water.', members: ['koi', 'lavender_ray', 'sugar_seahorse'], reward: { pips: 200, decor: 'd_fishbowl', title: 'Moonlight Angler' } },
  { id: 'garden_buddies', name: 'Garden Buddies', cat: 'bug', blurb: 'Small helpers that hide in the bushes and stumps.', members: ['puff_bee', 'dot_ladybug', 'sugar_snail', 'bean_beetle'], reward: { pips: 100, title: 'Bug Whisperer' } },
  { id: 'dusk_sparklers', name: 'Dusk Sparklers', cat: 'bug', blurb: 'Glowing, fluttering friends of the evening.', members: ['moth', 'glow_fly', 'wisp_dragonfly'], reward: { pips: 120, cloth: 'cs_wisp_crown' } },
  { id: 'beach_treasures', name: 'Beach Treasures', cat: 'shell', blurb: 'The pretty shells every beachcomber hopes for.', members: ['shell', 'conch', 'sand_dollar', 'cowrie'], reward: { pips: 120, title: 'Beachcomber' } },
  { id: 'pearly_finds', name: 'Pearly Finds', cat: 'shell', blurb: 'Rosy, swirly shells from the far shore.', members: ['pearlshell', 'swirl_whelk', 'starfish'], reward: { pips: 150, cloth: 'cs_shell_clutch' } },
  { id: 'meadow_pickings', name: 'Meadow Pickings', cat: 'forage', blurb: 'Little treats from a long meadow stroll.', members: ['blossom', 'puffberry', 'lucky_clover', 'sweet_mushroom'], reward: { pips: 100, title: 'Meadow Picker' } },
  { id: 'moonlit_pantry', name: 'Moonlit Pantry', cat: 'forage', blurb: 'A forager\'s shelf, stocked with the good stuff.', members: ['glowberry', 'moonpetal', 'rare_beans', 'beans', 'twig', 'button'], reward: { pips: 150, decor: 'd_forage_basket' } },
  { id: 'sparkle_pebbles', name: 'Sparkle Pebbles', cat: 'gem', blurb: 'Four bright little stones for a display stand.', members: ['sea_glass', 'honey_amber', 'candy_copper', 'rose_quartz'], reward: { pips: 150, decor: 'd_gem_stand', title: 'Pebble Collector' } },
  { id: 'night_jewels', name: 'Night Jewels', cat: 'gem', blurb: 'Gems that only seem to show up after dark or in the snow.', members: ['moonstone', 'twinkle_geode', 'frost_opal'], reward: { pips: 200, cloth: 'cs_star_specs', title: 'Gem Hunter' } },
  { id: 'cafe_crew', name: 'Cafe Crew', cat: 'outfit', blurb: 'A full barista outfit, from beret to pastry box.', members: ['barista_shirt', 'apron_skirt', 'baker_beret', 'cake_box'].map(C), reward: { pips: 100, cloth: 'cs_latte_beret', title: 'Head Barista' } },
  { id: 'spotted_sampler', name: 'Spotted Sampler', cat: 'outfit', blurb: 'A little cheetah-print wardrobe, one spot at a time.', members: ['spotted_sun', 'spotted_flats', 'cheetah_purse', 'cheetah_cateye', 'spotted_skirt'].map(C), reward: { pips: 200, title: 'Spot On' } },
  { id: 'party_parade', name: 'Party Hat Parade', cat: 'outfit', blurb: 'Complete every region to wear every hat.', members: hats, reward: { pips: 400, title: 'Party Pro' } },
  { id: 'cozy_cafe_set', name: 'Cozy Cafe Set', cat: 'furniture', blurb: 'Everything for a snug corner with a latte.', members: ['d_lamp', 'd_teacup', 'd_pouf', 'd_shelf'], reward: { pips: 100, decor: 'd_cafe_sign' } },
  { id: 'spotted_salon', name: 'Spotted Salon', cat: 'furniture', blurb: 'Plush and spotted, for lounging in style.', members: ['d_rug', 'd_chair'], reward: { pips: 150, title: 'Spotted Style' } },
  { id: 'harvest_keepsakes', name: 'Harvest Keepsakes', cat: 'furniture', blurb: 'Decor from the Harvest Hush Feast.', members: ['d_cornucopia', 'd_haybale', 'd_pieshelf'], reward: { pips: 150, title: 'Harvest Host' } },
  { id: 'twinkle_keepsakes', name: 'Twinkle Keepsakes', cat: 'furniture', blurb: 'Decor from the Twinkle Season.', members: ['d_tw_tree', 'd_tw_cookies', 'd_tw_cocoa', 'd_tw_gifts', 'd_tw_star', 'd_tw_wreath'], reward: { pips: 250, title: 'Twinkle Keeper' } },
];
export const SETS: SetDef[] = [
  ...SET_LIST,
  { id: 'island_curator', name: 'Island Curator', cat: 'grand', blurb: 'Complete every other set. The whole island is in your scrapbook.', members: SET_LIST.map((s) => s.id), reward: { pips: 800, cloth: 'cs_curator_crown', title: 'Sugarlily Curator' } },
];
export const setById = (id: string) => SETS.find((s) => s.id === id);
export const setDone = (id: string) => state.collection.done.includes(id);

export function setProgress(s: SetDef): Progress {
  let have = 0;
  for (const m of s.members) if (s.cat === 'grand' ? setDone(m) : hasEntry(m)) have++;
  return { have, total: s.members.length, pct: Math.floor((have / s.members.length) * 100) };
}
/** The entry ids of a set (for the grand set: none, it is made of sets). */
export const setEntries = (s: SetDef) => (s.cat === 'grand' ? [] : s.members);
export const setsOf = (entryId: string) => SETS.filter((s) => s.members.includes(entryId));

export function rewardText(r: Reward): string {
  const bits: string[] = [];
  if (r.pips) bits.push(`${r.pips} pips`);
  if (r.decor) bits.push(ITEMS[r.decor]?.name ?? r.decor);
  if (r.cloth) bits.push(clothById(r.cloth)?.name ?? r.cloth);
  if (r.title) bits.push(`the title “${r.title}”`);
  return bits.join(', ');
}

// ---------- titles ----------
export const currentTitle = (): string | null => (state.collection.title && state.collection.titles.includes(state.collection.title) ? state.collection.title : null);
export function setTitle(t: string | null) {
  state.collection.title = t && state.collection.titles.includes(t) ? t : null;
  changed();
}

/** Mark a page as looked at (drops its NEW sticker). Does not announce anything. */
export function markSeen(ids: string[]) {
  const f = state.collection.fresh;
  if (!f.length) return;
  const keep = f.filter((x) => !ids.includes(x));
  if (keep.length !== f.length) state.collection.fresh = keep;
}

// ---------- tracking ----------
function holding(id: string): boolean {
  if (id.startsWith('c:')) return state.ownedClothes.includes(id.slice(2));
  return count(id) > 0 || bankCount(id) > 0 || (state.found[id] ?? 0) > 0 || state.decor.some((d) => d.id === id);
}

let busy = false, again = false;
let seenClothes: unknown = null, seenClothesLen = -1;

/**
 * Record anything newly obtained, then pay out any set that just completed. Safe to call as often as you like.
 * `announce` = toast each new page (off for the quiet backfill at load).
 */
export function syncCollection(announce = true) {
  if (busy) { again = true; return; }
  // the very first look at a save (new game, or one from before the log) is a quiet backfill, not a shower of toasts
  if (!Object.keys(state.collection.got).length) announce = false;
  busy = true;
  try {
    do {
      again = false;
      const fresh = scan(announce);
      if (fresh.length) {
        if (announce && fresh.length <= 3) for (const e of fresh) toast(`Collection Log: ${e.name} added to your ${catById(e.cat).name} page ✿`);
        else if (announce) toast(`Collection Log: ${fresh.length} new pages filled in ✿`);
        changed();
      }
      completeSets();
    } while (again);
  } finally { busy = false; }
}

function scan(announce: boolean): Entry[] {
  const col = state.collection, now = Date.now(), fresh: Entry[] = [];
  const take = (id: string) => {
    if (col.got[id]) return;
    const e = entryById(id);
    if (!e) return;
    col.got[id] = now; fresh.push(e);
    if (announce) col.fresh.push(id); // the quiet backfill at load does not shower old saves with NEW stickers
  };
  for (const e of allEntries()) if (e.cat !== 'outfit' && holding(e.id)) take(e.id);
  // the wardrobe can hold 400+ pieces, so only look again when it changes
  if (seenClothes !== state.ownedClothes || seenClothesLen !== state.ownedClothes.length) {
    seenClothes = state.ownedClothes; seenClothesLen = state.ownedClothes.length;
    for (const id of state.ownedClothes) if (clothById(id)) take(`c:${id}`);
  }
  return fresh;
}

function completeSets() {
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const s of SETS) {
      if (setDone(s.id) || setProgress(s).have < s.members.length) continue;
      state.collection.done.push(s.id);
      payReward(s);
      bus.emit('setComplete', { id: s.id });
      progressed = true;
    }
  }
}

function payReward(s: SetDef) {
  const r = s.reward;
  if (r.title && !state.collection.titles.includes(r.title)) {
    state.collection.titles.push(r.title);
    if (!state.collection.title) state.collection.title = r.title;
  }
  if (r.cloth) grantCloth(r.cloth, false);
  if (r.decor) addItem(r.decor);
  if (r.pips) earn(r.pips);
  sfx.quest();
  toast(`Set complete: ${s.name}! You earned ${rewardText(r)} ✿`);
  changed();
}

bus.on('change', () => syncCollection());
