// Tansy Packlewick, the traveling merchant: who she is, when she visits, what she can sell and what she says.
// Pure data + save sanitising. The visit / stock logic is in merchant.ts, the stall in render/merchant3d.ts.
import { clothById } from './clothes';
import { ITEMS } from './data';
import type { MerchantSave, MerchantStock } from './state';

export const MERCHANT = {
  id: 'tansy',
  name: 'Tansy Packlewick',
  species: 'Wandering Alpaca',
  personality: 'Gentle gossip. Collects postcards, shiny buttons and good stories.',
  stall: "Tansy's Travelling Treasures",
  sign: "Tansy's Treasures",
} as const;

/** Visit days (Date#getDay: 3 = Wednesday, 6 = Saturday) and opening hours, on the real clock. */
export const VISIT_DAYS = [3, 6];
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 20;
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface Offer { kind: 'item' | 'cloth'; ref: string; qty: number; price: number }

/** Everything she can ever bring. Each visit a seeded handful is picked from these (see merchant.ts). */
export const OFFERS: { decor: Offer[]; cloth: Offer[]; seeds: Offer[] } = {
  decor: [
    { kind: 'item', ref: 'd_m_musicbox', qty: 1, price: 260 },
    { kind: 'item', ref: 'd_m_cloudlamp', qty: 1, price: 220 },
    { kind: 'item', ref: 'd_m_teapot', qty: 1, price: 340 },
    { kind: 'item', ref: 'd_m_globe', qty: 1, price: 280 },
    { kind: 'item', ref: 'd_m_moonswing', qty: 1, price: 320 },
  ],
  cloth: [
    { kind: 'cloth', ref: 'tm_bell_peddler_hat', qty: 1, price: 240 },
    { kind: 'cloth', ref: 'tm_patchwork_dress', qty: 1, price: 380 },
    { kind: 'cloth', ref: 'tm_postcard_cardigan', qty: 1, price: 300 },
    { kind: 'cloth', ref: 'tm_traveler_pack', qty: 1, price: 260 },
    { kind: 'cloth', ref: 'tm_cloud_hopper', qty: 1, price: 280 },
    { kind: 'cloth', ref: 'tm_stargazer_specs', qty: 1, price: 220 },
  ],
  seeds: [
    { kind: 'item', ref: 'seed_glowberry', qty: 3, price: 120 },
    { kind: 'item', ref: 'seed_moonpetal', qty: 3, price: 150 },
    { kind: 'item', ref: 'seed_cottonbloom', qty: 6, price: 80 },
    { kind: 'item', ref: 'seed_puffberry', qty: 8, price: 60 },
  ],
};

/** Her lines. {n} is the player's visit count with her; the shop picks by situation. */
export const LINES = {
  first: [
    'Oh! A new face on a very old road. I am Tansy, and this is my stall. Everything here came a long way to meet you.',
  ],
  hello: [
    'Back again! I saved the shiniest things for you.',
    'Look who found my little stall. Have a peek, take your time.',
    'The road was bumpy, but the cart rolled in just fine. What catches your eye?',
  ],
  morning: ['Good morning! I only just unpacked, so everything is still dewy.'],
  evening: ['The lanterns are lovely at this hour. Things look prettier in lantern light, I find.'],
  bought: ['A wonderful choice! It practically wanted to go home with you.', 'Wrapped in a ribbon, of course. Enjoy it!', 'Oh, that one is a favorite of mine. Treat it kindly.'],
  broke: ['Ah, the pips are a little shy today. No rush, I will be back soon enough.', 'Not quite enough pips yet. Come back after a good day of gathering!'],
  gone: ['Sold to a lovely someone (you!). Maybe next time I will find another.'],
  closing: ['Oh, look at the time! I am packing up the cart for tonight.'],
  gossip: [
    'On the road I heard a bell humming in a lighthouse. It sounded sleepy, but happy.',
    'I swear the café smells of cinnamon three islands away. Brioche is quite famous out there.',
    'Dottie once sold a hat to a seagull. I am told it was a bargain.',
    'The Pastel Sea sparkles more when the lanterns are out. Sailors set their courses by them now.',
    'Never carry more than you can hug. That is my only travel rule.',
    'Some seeds only sprout for someone patient. I sell those on purpose.',
  ],
  bye: ['Safe, soft travels! I will be back before you know it.', 'Come again! The road always leads back to a place like this.', 'See you next time. Keep something shiny for me!'],
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Read a saved merchant defensively: anything malformed (or naming an item that no longer exists) is dropped. */
export function sanitizeMerchant(raw: unknown, base: MerchantSave): MerchantSave {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const r = raw as Partial<Record<keyof MerchantSave, unknown>>;
  const stock: MerchantStock[] = [];
  if (Array.isArray(r.stock)) {
    for (const e of r.stock as Partial<MerchantStock>[]) {
      if (!e || typeof e.ref !== 'string' || (e.kind !== 'item' && e.kind !== 'cloth')) continue;
      if (e.kind === 'item' ? !ITEMS[e.ref] : !clothById(e.ref)) continue;
      stock.push({ kind: e.kind, ref: e.ref, qty: isNum(e.qty) ? Math.max(1, Math.floor(e.qty)) : 1, price: isNum(e.price) ? Math.max(0, Math.floor(e.price)) : 100, left: isNum(e.left) ? Math.max(0, Math.floor(e.left)) : 0 });
    }
  }
  return {
    visit: typeof r.visit === 'string' ? r.visit : '',
    stock,
    met: isNum(r.met) ? Math.max(0, Math.floor(r.met)) : 0,
    spent: isNum(r.spent) ? Math.max(0, Math.floor(r.spent)) : 0,
    seen: typeof r.seen === 'string' ? r.seen : '',
    talked: typeof r.talked === 'string' ? r.talked : '',
  };
}
