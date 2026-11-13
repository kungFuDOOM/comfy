// The wardrobe: what you own, what you wear (or are just trying on), the boutique's daily stock, and how
// the unsold pieces (quest, skill, crafting) are earned. Item data lives in clothes/; pictures in render/ + art/.
import { sfx } from './audio';
import { bus, changed, toast } from './bus';
import { CLOTHES, clothById, lookKey, type ClothDef, type Look, type Slot } from './clothes';
import { RECIPES, ITEMS, QUESTS } from './data';
import { twirl } from './dressing';
import { count, spend } from './inventory';
import { moment } from './lanterns';
import { player } from './player';
import { bump } from './quests';
import { LOG_QUESTS } from './questlog';
import { skillLevel, skillName } from './skills';
import { state } from './state';
import { getClock } from './time';
import { areaById } from './areas';
import { isMaxed, villagerById } from './friends';
import { dateRange, eventById, eventPhase } from './events';

export { lookKey };
const SLOT_IDS: Slot[] = ['hat', 'top', 'bottom', 'dress', 'shoes', 'bag', 'face'];

export const owns = (id: string) => state.ownedClothes.includes(id);
export const isWorn = (id: string) => SLOT_IDS.some((s) => state.worn[s] === id);

/** Add an item to the wardrobe (quietly unless `say`). */
export function grantCloth(id: string, say = true) {
  const c = clothById(id);
  if (!c || owns(id)) return false;
  state.ownedClothes.push(id);
  if (say) toast(`New in your wardrobe: ${c.name} ✿`);
  return true;
}

// ---------- looks ----------
type Worn = Record<Slot, string | null>;
const FALLBACK = { top: 'cream_tee', bottom: 'petal_skirt' } as const;

/** Resolve worn ids into a drawable look (a missing top / bottom falls back to a plain cream tee / pastel skirt). */
export function resolveLook(w: Worn): Look {
  const d = (s: Slot) => clothById(w[s]) ?? undefined;
  return {
    hat: d('hat'), dress: d('dress'), shoes: d('shoes'), bag: d('bag'), face: d('face'),
    top: d('top') ?? clothById(FALLBACK.top)!, bottom: d('bottom') ?? clothById(FALLBACK.bottom)!,
  };
}

/** Put `c` on `w`: a dress takes off top + bottom; a top or bottom takes off the dress. */
export function equipOn(w: Worn, c: ClothDef): Worn {
  const n = { ...w, [c.slot]: c.id } as Worn;
  if (c.slot === 'dress') { n.top = null; n.bottom = null; }
  else if (c.slot === 'top' || c.slot === 'bottom') n.dress = null;
  return n;
}
/** After a dress comes off (or when a top / bottom is missing) fill the basics back in. */
function tidy(w: Worn): Worn {
  if (!w.dress) { w.top ??= FALLBACK.top; w.bottom ??= FALLBACK.bottom; }
  return w;
}

/** A try-on that has not been bought or worn: the whole look being previewed, and the piece last tapped. */
export const preview = { look: null as Worn | null, sel: null as string | null };
export const previewing = () => preview.look !== null;
export const currentLook = (): Look => resolveLook(preview.look ?? state.worn);
/** The piece the dressing panel is looking at: the last one tapped, else what is worn. */
export function selectedCloth(): ClothDef | undefined {
  return clothById(preview.sel) ?? clothById(state.worn.dress ?? state.worn.top ?? state.worn.hat);
}

const triedThisSession = new Set<string>();
/** Try an item on in the boutique (free). Counts for the "Window Shopping" quest. */
export function tryOn(id: string) {
  const c = clothById(id);
  if (!c) return;
  preview.look = equipOn(preview.look ?? { ...state.worn }, c);
  preview.sel = id;
  bump('tried');
  twirl();
  if (!triedThisSession.has(id)) { triedThisSession.add(id); moment('outfit', player.x, player.y); }
  changed();
}
/** Look at an owned or locked item in the wardrobe without counting quests or lanterns. */
export function previewItem(id: string) {
  const c = clothById(id);
  if (!c) return;
  preview.look = equipOn(preview.look ?? { ...state.worn }, c);
  preview.sel = id;
  twirl();
  changed();
}
export function endPreview() { preview.look = null; preview.sel = null; changed(); }

/** Wear an owned item. Tapping a worn hat / shoes / bag / face piece again takes it off. */
export function wearItem(id: string) {
  const c = clothById(id);
  if (!c || !owns(id)) return;
  state.worn = tidy(equipOn(state.worn, c));
  preview.look = null; preview.sel = id;
  bump('tried');
  twirl();
  changed();
}
const OPTIONAL: Slot[] = ['hat', 'shoes', 'bag', 'face'];
export const canTakeOff = (s: Slot) => OPTIONAL.includes(s);
export function takeOff(slot: Slot) {
  if (!canTakeOff(slot)) return;
  state.worn = { ...state.worn, [slot]: null };
  if (preview.look) preview.look = { ...preview.look, [slot]: null };
  twirl();
  changed();
}
/** Wear everything in the current try-on look, if it is all owned. */
export function lookIsOwned(): boolean {
  return !!preview.look && SLOT_IDS.every((s) => !preview.look![s] || owns(preview.look![s]!));
}
export function wearPreview() {
  if (!preview.look || !lookIsOwned()) return;
  state.worn = tidy({ ...preview.look });
  preview.look = null;
  twirl();
  changed();
}

export function buyCloth(id: string): boolean {
  const c = clothById(id);
  if (!c || owns(id) || c.src.k !== 'shop') return false;
  if (!spend(c.price)) { toast('Not enough pips yet.'); return false; }
  state.ownedClothes.push(id);
  state.worn = tidy(equipOn(state.worn, c));
  preview.look = null; preview.sel = id;
  toast(`You bought the ${c.name}! ✿`);
  twirl();
  moment('outfit', player.x, player.y);
  changed();
  return true;
}

// ---------- the boutique's daily stock ----------
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const STOCK_SLOTS: Slot[] = ['dress', 'top', 'bottom', 'hat', 'dress', 'shoes', 'top', 'bag', 'hat', 'bottom', 'face', 'dress'];
let stockDay = '', stockCache: ClothDef[] = [];

/** 10–16 pieces that change every (real) day, picked from colour families so the colour dots have friends. */
export function dailyStock(): ClothDef[] {
  const day = getClock().dayKey;
  if (day === stockDay) return stockCache;
  const rnd = rng(hash('hushbell-stock-' + day));
  const bySlot = new Map<Slot, Map<string, ClothDef[]>>();
  for (const c of CLOTHES) {
    if (c.src.k !== 'shop') continue;
    const m = bySlot.get(c.slot) ?? new Map<string, ClothDef[]>();
    (m.get(c.group) ?? m.set(c.group, []).get(c.group)!).push(c);
    bySlot.set(c.slot, m);
  }
  const pools = new Map<Slot, ClothDef[][]>();
  for (const [s, m] of bySlot) {
    const arr = [...m.values()];
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    pools.set(s, arr);
  }
  const out: ClothDef[] = [];
  for (const s of STOCK_SLOTS) {
    if (out.length >= 12) break;
    const fam = pools.get(s)?.pop();
    if (!fam) continue;
    const take = fam.slice(0, 3);
    if (out.length + take.length > 16) continue;
    out.push(...take);
  }
  stockDay = day; stockCache = out;
  return out;
}

// ---------- earning the unsold pieces ----------
/** Short, friendly "how to get it" text for something not (yet) in the wardrobe. */
export function howToGet(c: ClothDef): string {
  const s = c.src;
  switch (s.k) {
    case 'start': return 'Everyone starts with this one';
    case 'shop': return `Sold at Spot & Bow · ${c.price} pips`;
    case 'quest': {
      const q = LOG_QUESTS.find((x) => x.id === s.quest)?.title ?? QUESTS.find((x) => x.id === s.quest)?.title ?? 'a quest';
      return `Reward for “${q}”`;
    }
    case 'skill': return `Reach ${skillName(s.skill)} level ${s.level}`;
    case 'craft': { const r = RECIPES.find((x) => x.id === s.recipe); return `Craft it at the Crafting Table${r ? ` (Crafting level ${r.level})` : ''}`; }
    case 'event': return eventHowTo(s.event);
    case 'friend': return `Reach 10 hearts with ${villagerById(s.friend)?.name.split(' ')[0] ?? 'a friend'} (Journal › Friends)`;
    case 'region': return s.area === 'all' ? 'Complete all six regions' : `Complete ${areaById(s.area).name} (Journal › Island)`;
  }
}
function eventHowTo(id: string): string {
  const e = eventById(id);
  if (!e) return 'A seasonal event exclusive';
  return eventPhase(e) === 'active' ? `${e.name} exclusive: earn it from the event activities (Journal › Events)` : `${e.name} exclusive, only earned during the event (${dateRange(e)})`;
}
export const isSold = (c: ClothDef) => c.src.k === 'shop';

function earned(c: ClothDef): boolean {
  const s = c.src;
  switch (s.k) {
    case 'quest': return state.questLog[s.quest] === 'done' || !!state.quests[s.quest];
    case 'skill': return skillLevel(s.skill) >= s.level;
    case 'craft': return count(s.recipe) > 0;
    case 'friend': return isMaxed(s.friend);
    default: return false;
  }
}
let refreshing = false;
/** Hand out any quest / skill / crafting pieces that have been earned since last time. */
export function refreshEarned(announce = true) {
  if (refreshing) return;
  refreshing = true;
  let any = false;
  for (const c of CLOTHES) if (!owns(c.id) && earned(c)) { grantCloth(c.id, announce); any = true; }
  refreshing = false;
  if (any) { if (announce) sfx.quest(); changed(); }
}
bus.on('change', () => refreshEarned());
void ITEMS;
