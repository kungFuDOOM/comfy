// The traveling merchant, Tansy Packlewick. She visits the island on certain days of the real calendar (Wednesdays and
// Saturdays, 9 AM to 8 PM), sets up a stall by Sugarlily Square and sells a rotating handful of rare things for pips.
// The stock is rolled once per visit day from a seeded shuffle and saved with its sold counts, so reloading never
// re-rolls it. The visit schedule itself is pure calendar, so there is nothing to migrate.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { clothById } from './clothes';
import { ITEMS } from './data';
import { addItem, spend } from './inventory';
import { CLOSE_HOUR, DAY_NAMES, LINES, MERCHANT, OFFERS, OPEN_HOUR, VISIT_DAYS, type Offer } from './merchantData';
import { STALL_TILES } from './merchantLayout';
import { player } from './player';
import { state, type MerchantStock } from './state';
import { getClock, today } from './time';
import { grantCloth, hash, owns, rng } from './wardrobe';
import { setDynamicBlock, TS } from './world';

/** ?merchant=1 keeps her stall open all day, every day (for testing). */
const forced = new URLSearchParams(location.search).has('merchant');

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** Is today one of her days? */
export const isVisitDay = (d = today()) => forced || VISIT_DAYS.includes(d.getDay());
/** Is her stall open right now? */
export function merchantPresent(): boolean {
  if (forced) return true;
  const h = getClock().hour;
  return isVisitDay() && h >= OPEN_HOUR && h < CLOSE_HOUR;
}

const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
export const closingText = () => hourText(CLOSE_HOUR);

/** When she is next around, in words ("today from 9 AM", "tomorrow (Saturday)", "Wednesday"). */
export function nextVisitText(): string {
  const base = today();
  if (isVisitDay(base) && getClock().hour < OPEN_HOUR) return `today from ${hourText(OPEN_HOUR)}`;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    if (isVisitDay(d)) return i === 1 ? `tomorrow (${DAY_NAMES[d.getDay()]})` : DAY_NAMES[d.getDay()];
  }
  return 'soon';
}

/** "Wednesdays and Saturdays", for the help text. */
export const visitDaysText = () => VISIT_DAYS.map((d) => DAY_NAMES[d] + 's').join(' and ');

/** Roll one visit's stock: two outfit pieces you do not own, two decor pieces and two seed bundles, shuffled by the day. */
function rollStock(day: string): MerchantStock[] {
  const rnd = rng(hash('hushbell-merchant-' + day));
  const shuffled = <T>(a: T[]) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const cloth = shuffled(OFFERS.cloth.filter((o) => !owns(o.ref))).slice(0, 2);
  const decor = shuffled(OFFERS.decor).slice(0, 4 - cloth.length); // fewer outfits left to offer: a little more decor
  const seeds = shuffled(OFFERS.seeds).slice(0, 2);
  const row = (o: Offer, left: number): MerchantStock => ({ kind: o.kind, ref: o.ref, qty: o.qty, price: o.price, left });
  return [...cloth.map((o) => row(o, 1)), ...decor.map((o) => row(o, 2)), ...seeds.map((o) => row(o, 3))];
}

/** Make sure today's stock exists (rolled the first time she is seen on a visit day). Returns it. */
export function visitStock(): MerchantStock[] {
  const key = getClock().dayKey;
  const m = state.merchant;
  if (m.visit !== key || !m.stock.length) { m.visit = key; m.stock = rollStock(key); }
  return m.stock;
}

export const stockName = (s: MerchantStock) => (s.kind === 'cloth' ? clothById(s.ref)?.name : ITEMS[s.ref]?.name) ?? s.ref;
export const stockDesc = (s: MerchantStock) => (s.kind === 'cloth' ? clothById(s.ref)?.desc : ITEMS[s.ref]?.desc) ?? '';
/** Outfits you already own cannot be bought twice. */
export const stockOwned = (s: MerchantStock) => s.kind === 'cloth' && owns(s.ref);

export type BuyResult = 'ok' | 'closed' | 'gone' | 'poor' | 'owned';
export function buyStock(s: MerchantStock): BuyResult {
  if (!merchantPresent()) return 'closed';
  if (s.left <= 0) return 'gone';
  if (stockOwned(s)) return 'owned';
  if (!spend(s.price)) return 'poor';
  s.left--;
  state.merchant.spent += s.price;
  if (s.kind === 'cloth') grantCloth(s.ref);
  else { addItem(s.ref, s.qty); toast(`Bought ${s.qty > 1 ? s.qty + ' × ' : ''}${ITEMS[s.ref]?.name ?? s.ref}.`); }
  changed();
  return 'ok';
}

/** The first hello of a visit counts as meeting her. */
export function meetToday() {
  const m = state.merchant, key = getClock().dayKey;
  if (m.talked !== key) { m.talked = key; m.met++; }
}

/** What she opens with (by whether you have met, and the time of day). */
export function greeting(): string {
  if (state.merchant.met <= 1 && state.merchant.spent === 0) return pick(LINES.first);
  const ph = getClock().phase;
  return pick(ph === 'morning' ? [...LINES.hello, ...LINES.morning] : ph === 'evening' || ph === 'night' ? [...LINES.hello, ...LINES.evening] : LINES.hello);
}
export const line = (k: Exclude<keyof typeof LINES, 'first' | 'hello'>) => pick(LINES[k]);

// ---- the stall in the world ----
let wasPresent: boolean | null = null;
let blocked = false;

/** Call every half second (and once when the game starts): opens / closes the stall, blocks its counter and announces arrivals. */
export function tickMerchant() {
  const present = merchantPresent();
  if (present) visitStock();
  // the counter is solid while she is here (but never closes in on a player standing right where it goes)
  if (present !== blocked) {
    const px = Math.floor(player.x / TS), py = Math.floor((player.y - 4) / TS);
    if (!present || !STALL_TILES.some((t) => t.x === px && t.y === py)) {
      for (const t of STALL_TILES) setDynamicBlock(t.x, t.y, present);
      blocked = present;
    }
  }
  if (present && state.merchant.seen !== state.merchant.visit) {
    state.merchant.seen = state.merchant.visit;
    toast(`🎪 ${MERCHANT.name}, the traveling merchant, has set up her stall by Sugarlily Square! Open until ${closingText()}.`);
    sfx.unlock();
  } else if (wasPresent && !present) {
    toast(`${MERCHANT.name} packed up her cart and rolled on. She will be back ${nextVisitText()}.`);
  }
  wasPresent = present;
}
