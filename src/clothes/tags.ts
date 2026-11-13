// Styling-contest tags: a small vocabulary of "vibes" every wardrobe piece carries. Most are derived from what the piece
// already says about itself (style, print, shape, extras, colour), so all 400+ pieces are tagged without a table per
// item; a piece can add its own with `tags`. Pure data and a pure function, nothing saved.
import type { ClothDef, PatternId, StyleId } from './types';

export interface TagDef { id: string; label: string; icon: string }
export const TAGS: TagDef[] = [
  { id: 'goth', label: 'Goth', icon: '🦇' }, { id: 'spooky', label: 'Spooky-cute', icon: '👻' }, { id: 'dark', label: 'Dark', icon: '🖤' },
  { id: 'pastel', label: 'Pastel', icon: '🍬' }, { id: 'picnic', label: 'Picnic', icon: '🧺' }, { id: 'western', label: 'Cowgirl', icon: '🤠' },
  { id: 'rodeo', label: 'Rodeo', icon: '🐎' }, { id: 'boots', label: 'Boots', icon: '🥾' }, { id: 'earthy', label: 'Earthy', icon: '🌾' },
  { id: 'cozy', label: 'Cozy', icon: '🧶' }, { id: 'cafe', label: 'Café', icon: '☕' }, { id: 'soft', label: 'Soft', icon: '☁️' },
  { id: 'sweet', label: 'Sweet', icon: '🍰' }, { id: 'cute', label: 'Cute', icon: '🍓' }, { id: 'neat', label: 'Neat', icon: '📎' },
  { id: 'beach', label: 'Beachy', icon: '🏖️' }, { id: 'summer', label: 'Summery', icon: '🌞' }, { id: 'sunny', label: 'Sunny', icon: '🌼' },
  { id: 'sailor', label: 'Sailor', icon: '⚓' }, { id: 'fairy', label: 'Fairy', icon: '🧚' }, { id: 'floral', label: 'Floral', icon: '🌸' },
  { id: 'magic', label: 'Magical', icon: '🔮' }, { id: 'cottage', label: 'Cottagecore', icon: '🌼' }, { id: 'winter', label: 'Wintry', icon: '❄️' },
  { id: 'glam', label: 'Glam', icon: '✨' }, { id: 'party', label: 'Party', icon: '🎉' }, { id: 'fancy', label: 'Fancy', icon: '👑' },
  { id: 'frilly', label: 'Frilly', icon: '🎀' }, { id: 'edgy', label: 'Edgy', icon: '⛓️' }, { id: 'classic', label: 'Classic', icon: '📻' },
  { id: 'active', label: 'Sporty', icon: '🏐' }, { id: 'cool', label: 'Cool', icon: '😎' }, { id: 'rainy', label: 'Rainy-day', icon: '☔' },
  { id: 'sleepy', label: 'Sleepy', icon: '🌙' }, { id: 'spotted', label: 'Spotted', icon: '🐆' }, { id: 'retro', label: 'Retro', icon: '🪩' },
];
export const tagLabel = (id: string) => TAGS.find((t) => t.id === id)?.label ?? id;
export const tagIcon = (id: string) => TAGS.find((t) => t.id === id)?.icon ?? '✿';

const STYLE_TAGS: Record<StyleId, string[]> = {
  cozy: ['cozy', 'soft'], cottage: ['cottage', 'picnic', 'floral', 'soft'], kawaii: ['cute', 'sweet', 'pastel'], lolita: ['frilly', 'sweet', 'fancy'],
  preppy: ['neat', 'classic'], sporty: ['active'], street: ['cool'], y2k: ['glam', 'cool', 'retro'], grunge: ['edgy', 'dark'], punk: ['edgy', 'dark', 'cool'],
  goth: ['goth', 'dark', 'spooky', 'edgy'], pastelgoth: ['goth', 'pastel', 'spooky', 'cute'], witchy: ['magic', 'spooky', 'dark'],
  fairy: ['fairy', 'magic', 'floral', 'soft'], princess: ['fancy', 'glam', 'sweet'], boho: ['earthy', 'floral', 'picnic'], western: ['western', 'rodeo', 'earthy'],
  vintage: ['classic', 'retro', 'picnic'], disco: ['glam', 'party', 'retro'], business: ['neat', 'classic', 'fancy'], sailor: ['sailor', 'beach', 'neat'],
  beach: ['beach', 'summer', 'sunny'], winter: ['winter', 'cozy'], rainy: ['rainy', 'cozy'], pajama: ['sleepy', 'cozy', 'soft'], costume: ['cute', 'party'],
  cafe: ['cafe', 'cozy', 'neat', 'sweet'], holiday: ['party', 'sweet', 'cozy'], party: ['party', 'glam', 'sweet'], cheetah: ['spotted', 'cool'],
};

const PATTERN_TAGS: Partial<Record<PatternId, string[]>> = {
  gingham: ['picnic', 'sweet'], checker: ['picnic', 'retro'], plaid: ['cozy', 'western'], bats: ['goth', 'spooky', 'dark'], moons: ['magic', 'sleepy'],
  stars: ['magic', 'glam'], flowers: ['floral', 'cottage'], strawberry: ['sweet', 'cute', 'picnic'], cherry: ['sweet', 'cute', 'picnic'], hearts: ['sweet', 'cute'],
  lace: ['frilly', 'fancy'], polka: ['sweet', 'retro'], stripes: ['sailor', 'neat'], sprinkles: ['sweet', 'party'], rainbow: ['party', 'cute'],
  bubbles: ['beach', 'cute'], snowflakes: ['winter'], scales: ['beach'], cheetah: ['spotted'], cheetahpink: ['spotted'], argyle: ['classic', 'cozy'], clouds: ['soft', 'sleepy'],
};

const SHAPE_TAGS: Record<string, string[]> = {
  sunhat: ['sunny', 'summer', 'picnic'], basket: ['picnic', 'cottage'], tote: ['picnic'], flowercrown: ['floral', 'fairy'], tiara: ['fancy', 'glam'],
  cowboy: ['western', 'rodeo'], cowboyboot: ['western', 'rodeo', 'boots'], boot: ['boots'], rainboot: ['boots', 'rainy'], umbrella: ['rainy'], bandana: ['western', 'picnic'],
  witch: ['magic', 'spooky'], batbow: ['goth', 'spooky'], platform: ['goth', 'edgy'], sandal: ['beach', 'summer'], sailor: ['sailor', 'beach'], sailordress: ['sailor', 'beach'],
  overalls: ['earthy', 'cottage'], tutu: ['frilly', 'party'], gown: ['fancy', 'glam'], ballgown: ['fancy', 'glam'], pinafore: ['cottage', 'cafe'], smock: ['cottage', 'earthy'],
  cardigan: ['cozy', 'soft'], sweater: ['cozy'], beanie: ['cozy', 'winter'], earmuffs: ['winter', 'cozy'], raincoat: ['rainy'], coat: ['winter'], sleepmask: ['sleepy'],
  slipper: ['sleepy', 'cozy'], lunchbox: ['cafe', 'picnic', 'cute'], beret: ['classic'], cateye: ['classic', 'glam'], purse: ['fancy'], satchel: ['neat', 'classic'],
  bow: ['sweet', 'cute'], headband: ['sweet'], mary: ['sweet', 'classic'], ballet: ['sweet', 'frilly'], hightop: ['cool'], sneaker: ['active', 'cool'],
};

const DECO_TAGS: Record<string, string[]> = {
  studs: ['edgy'], fringe: ['western', 'earthy'], cape: ['magic', 'spooky'], wings: ['fairy', 'magic'], moonbrooch: ['magic'], moon: ['magic'], ghost: ['spooky'],
  sailor: ['sailor'], bunnyears: ['cute'], bearears: ['cute'], pearls: ['fancy'], jewel: ['glam'], sparkle: ['glam'], bow: ['sweet'], ribbon: ['sweet'], ruffle: ['frilly'],
  apron: ['cafe'], fur: ['winter'], scarf: ['winter', 'cozy'], hood: ['cozy'], butterfly: ['fairy', 'cute'], heart: ['sweet'], hearts: ['sweet'], cherry: ['sweet'],
};

/** Colour-derived tags: very dark pieces read as "dark", light soft colours as "pastel". */
function colourTags(hex: string): string[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [];
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.32) return ['dark'];
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
  return lum > 0.72 && hi - lo < 90 ? ['pastel'] : [];
}

const cache = new Map<string, readonly string[]>();
/** Every contest tag a piece carries (deduplicated, stable order). */
export function tagsOf(c: ClothDef): readonly string[] {
  const hit = cache.get(c.id);
  if (hit) return hit;
  const out = new Set<string>();
  const add = (l?: readonly string[]) => l?.forEach((t) => out.add(t));
  add(STYLE_TAGS[c.style]);
  if (c.pattern) add(PATTERN_TAGS[c.pattern]);
  if (c.trimPattern) add(PATTERN_TAGS[c.trimPattern]?.filter((t) => t === 'spotted'));
  add(SHAPE_TAGS[c.shape]);
  c.deco?.forEach((d) => add(DECO_TAGS[d]));
  add(colourTags(c.color));
  add(c.tags);
  const list = [...out];
  cache.set(c.id, list);
  return list;
}
