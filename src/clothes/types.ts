// The wardrobe's vocabulary: slots, styles, patterns and what a clothing item is. Pure data, no game logic.
import type { SkillId } from '../data';
import type { AreaId } from '../areas';

export type Slot = 'hat' | 'top' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'face';
export const SLOTS: { id: Slot; label: string; icon: string }[] = [
  { id: 'dress', label: 'Dresses', icon: '👗' },
  { id: 'top', label: 'Tops', icon: '👚' },
  { id: 'bottom', label: 'Bottoms', icon: '🩳' },
  { id: 'hat', label: 'Hats', icon: '🎀' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'bag', label: 'Bags', icon: '👜' },
  { id: 'face', label: 'Face', icon: '🕶️' },
];

export type StyleId =
  | 'cozy' | 'cottage' | 'kawaii' | 'lolita' | 'preppy' | 'sporty' | 'street' | 'y2k' | 'grunge' | 'punk'
  | 'goth' | 'pastelgoth' | 'witchy' | 'fairy' | 'princess' | 'boho' | 'western' | 'vintage' | 'disco'
  | 'business' | 'sailor' | 'beach' | 'winter' | 'rainy' | 'pajama' | 'costume' | 'cafe' | 'holiday' | 'party' | 'cheetah';
export const STYLES: { id: StyleId; label: string; icon: string }[] = [
  { id: 'cozy', label: 'Cozy knits', icon: '🧶' },
  { id: 'cottage', label: 'Cottagecore', icon: '🌼' },
  { id: 'kawaii', label: 'Kawaii', icon: '🍓' },
  { id: 'lolita', label: 'Lolita-inspired', icon: '🎀' },
  { id: 'preppy', label: 'Preppy / school', icon: '🎒' },
  { id: 'sporty', label: 'Sporty', icon: '🏐' },
  { id: 'street', label: 'Streetwear', icon: '🛹' },
  { id: 'y2k', label: 'Y2K', icon: '💿' },
  { id: 'grunge', label: 'Grunge', icon: '🖤' },
  { id: 'punk', label: 'Rocker / punk', icon: '🎸' },
  { id: 'goth', label: 'Goth', icon: '🦇' },
  { id: 'pastelgoth', label: 'Pastel goth', icon: '🌙' },
  { id: 'witchy', label: 'Witchy', icon: '🔮' },
  { id: 'fairy', label: 'Fairy / whimsigoth', icon: '🧚' },
  { id: 'princess', label: 'Princess', icon: '👑' },
  { id: 'boho', label: 'Boho', icon: '🌻' },
  { id: 'western', label: 'Cowgirl', icon: '🤠' },
  { id: 'vintage', label: 'Vintage 50s', icon: '📻' },
  { id: 'disco', label: 'Disco 70s', icon: '🪩' },
  { id: 'business', label: 'Business chic', icon: '💼' },
  { id: 'sailor', label: 'Sailor', icon: '⚓' },
  { id: 'beach', label: 'Beach', icon: '🏖️' },
  { id: 'winter', label: 'Winter', icon: '❄️' },
  { id: 'rainy', label: 'Rainy day', icon: '☔' },
  { id: 'pajama', label: 'Pajamas', icon: '🌙' },
  { id: 'costume', label: 'Costume', icon: '🐰' },
  { id: 'cafe', label: 'Café', icon: '☕' },
  { id: 'holiday', label: 'Holiday', icon: '🎄' },
  { id: 'party', label: 'Party hats', icon: '🎉' },
  { id: 'cheetah', label: 'Spotted', icon: '🐆' },
];
export const styleLabel = (id: StyleId) => STYLES.find((s) => s.id === id)!.label;

/** Fabric prints drawn in code (art/patterns.ts). 'cheetah' / 'cheetahpink' reuse the original spotted prints. */
export type PatternId =
  | 'gingham' | 'polka' | 'stripes' | 'stars' | 'moons' | 'clouds' | 'strawberry' | 'cherry' | 'hearts' | 'lace'
  | 'plaid' | 'sprinkles' | 'bats' | 'flowers' | 'checker' | 'argyle' | 'rainbow' | 'bubbles' | 'snowflakes' | 'scales'
  | 'cheetah' | 'cheetahpink';

/** How an item is earned. Anything but 'shop' is never sold. */
export type Source =
  | { k: 'start' }
  | { k: 'shop' }
  | { k: 'quest'; quest: string }
  | { k: 'skill'; skill: SkillId; level: number }
  | { k: 'craft'; recipe: string }
  | { k: 'region'; area: AreaId | 'all' }
  /** A best-friend gift: given once you reach 10 hearts with this villager (id). */
  | { k: 'friend'; friend: string }
  /** Café shift milestone: worked this many shifts at Puddle & Pip (shift.ts). */
  | { k: 'shift'; n: number }
  /** Exclusive to a seasonal event (events.ts): handed out by its activities while it is on, kept forever. */
  | { k: 'event'; event: string }
  /** Sold only by the traveling merchant (merchant.ts), on her visit days. */
  | { k: 'merchant' }
  /** Reward for completing a Collection Log set (collection.ts); `set` is the set id. */
  | { k: 'set'; set: string };

export interface ClothDef {
  id: string;
  name: string;
  slot: Slot;
  style: StyleId;
  /** Which model from the shape library (render/clothes3d.ts, art/clothes2d.ts) draws it. */
  shape: string;
  color: string;
  /** Second colour: hems, collars, bows, soles… */
  trim: string;
  pattern?: PatternId;
  /** Pattern ink colour (falls back to a darker `color`). */
  ink?: string;
  /** A pattern for the trim only (e.g. a spotted hat band). */
  trimPattern?: PatternId;
  /** Small shape-specific extras: 'bell', 'sparkle', 'collar', 'ruffle', 'bib', 'hood'… */
  deco?: string[];
  /** Colour-variant family: items sharing a group and slot show as colour dots on one tile. */
  group: string;
  /** Short colour label for the dot tooltip. */
  tint: string;
  desc: string;
  price: number;
  src: Source;
}

/** What the player is wearing right now, as full item definitions (fallbacks already filled in). */
export interface Look {
  hat?: ClothDef;
  top: ClothDef;
  bottom: ClothDef;
  dress?: ClothDef;
  shoes?: ClothDef;
  bag?: ClothDef;
  face?: ClothDef;
}
/** A short string that changes whenever the look does (cheap to compare each frame). */
export const lookKey = (l: Look) =>
  [l.hat?.id, l.dress ? l.dress.id : l.top.id + '+' + l.bottom.id, l.shoes?.id, l.bag?.id, l.face?.id].map((x) => x ?? '-').join('|');
