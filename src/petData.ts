// Pet companion data: kinds, coats, the pet accessory catalog and save sanitising.
// Pure data (no DOM / three / game imports) so state.ts and save.ts can use it safely.
// Pet accessories live in their OWN catalog and save fields; they never touch the player's clothing slots.

export type PetKind = 'kitten' | 'puppy';
export type PetSlot = 'head' | 'body';

export interface PetSave {
  kind: PetKind;
  /** The only free text we keep: the name she typed (sanitised, see cleanPetName). */
  name: string;
  coat: string;
  /** Owned pet accessory ids (see PET_ITEMS). */
  owned: string[];
  /** Currently worn accessory per slot (an owned id, or null). */
  worn: Record<PetSlot, string | null>;
}

export const PET_NAME_MAX = 14;

export const PET_KINDS: { id: PetKind; label: string; blurb: string }[] = [
  { id: 'kitten', label: 'Kitten', blurb: 'Soft paws, a swishy tail and very important naps.' },
  { id: 'puppy', label: 'Puppy', blurb: 'Floppy ears, a wiggly tail and a heart full of hops.' },
];

/** Coats are shared by both kinds. `body` is the main fur, `accent` the belly / muzzle / paws, `inner` the ears. */
export interface Coat { id: string; label: string; body: string; accent: string; inner: string; spots?: boolean }
export const PET_COATS: Coat[] = [
  { id: 'cream', label: 'Cream', body: '#fff0dc', accent: '#ffffff', inner: '#ffc3d6' },
  { id: 'peach', label: 'Peach', body: '#ffc9a6', accent: '#fff0e2', inner: '#ff9fb8' },
  { id: 'cloud', label: 'Cloud', body: '#efe8fb', accent: '#ffffff', inner: '#ffc3d6' },
  { id: 'cocoa', label: 'Cocoa', body: '#c9a28b', accent: '#f4e2d3', inner: '#f0a6b8' },
  // a tiny spotted accent (three small dots on the hip) is the only cheetah nod
  { id: 'honey', label: 'Honey', body: '#ffe3a1', accent: '#fff7de', inner: '#ffb3c6', spots: true },
];
export const coatById = (id: string): Coat => PET_COATS.find((c) => c.id === id) ?? PET_COATS[0];

export interface PetItem {
  id: string;
  name: string;
  slot: PetSlot;
  price: number;
  /** Main color, secondary color (trim / stripes). */
  c1: string;
  c2: string;
  shape: 'bow' | 'beret' | 'beanie' | 'sweater';
  blurb: string;
  /** Pet Care level that gifts this piece for free. Care pieces are never sold at the boutique. */
  care?: number;
}
export const PET_ITEMS: PetItem[] = [
  { id: 'pb_strawberry', name: 'Strawberry Bow', slot: 'head', price: 45, c1: '#ff8fb6', c2: '#ffffff', shape: 'bow', blurb: 'A plump pink bow with a cream knot.' },
  { id: 'pb_cloud', name: 'Cloudpuff Bow', slot: 'head', price: 45, c1: '#cdb8f5', c2: '#ffffff', shape: 'bow', blurb: 'Lavender loops, soft as a marshmallow.' },
  { id: 'ph_dewdrop', name: 'Dewdrop Beret', slot: 'head', price: 90, c1: '#ffc3d6', c2: '#ff8fb6', shape: 'beret', blurb: 'A tilted little beret with a stem on top.' },
  { id: 'ph_bellbeanie', name: 'Bell Beanie', slot: 'head', price: 110, c1: '#fff3d6', c2: '#ffb3c6', shape: 'beanie', blurb: 'Knit cream beanie with a pink pom.' },
  { id: 'ps_marshmallow', name: 'Marshmallow Knit', slot: 'body', price: 140, c1: '#ffd9e8', c2: '#ffffff', shape: 'sweater', blurb: 'Pink and cream stripes, extra snuggly.' },
  { id: 'ps_mint', name: 'Mint Cuddle Sweater', slot: 'body', price: 140, c1: '#bfeedd', c2: '#ffffff', shape: 'sweater', blurb: 'Fresh mint with a folded collar.' },
  // Pet Care rewards (see petcare.ts): given free as the skill levels up, never in the shop
  { id: 'pb_care', name: 'Gold-star Bow', slot: 'head', price: 0, c1: '#ffe38a', c2: '#ffffff', shape: 'bow', blurb: 'A shiny little thank-you for caring so well.', care: 3 },
  { id: 'ph_sunset', name: 'Sunset Beret', slot: 'head', price: 0, c1: '#ffb48a', c2: '#ff8fb6', shape: 'beret', blurb: 'Peach and rose, like the sky over the grove.', care: 8 },
  { id: 'ps_cuddle', name: 'Best-Friend Knit', slot: 'body', price: 0, c1: '#d9c8ff', c2: '#fff0f6', shape: 'sweater', blurb: 'Lavender stripes, knit with extra love.', care: 12 },
];
export const petItemById = (id: string | null | undefined): PetItem | undefined => PET_ITEMS.find((i) => i.id === id);

/** Trim, collapse spaces, drop anything that is not a letter / digit / space / apostrophe / hyphen / dot, cap the length. */
export function cleanPetName(raw: string): string {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '’.\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PET_NAME_MAX)
    .trim();
}

/** Turn whatever was in a save into a valid PetSave, or null (= no pet yet). Never throws. */
export function sanitizePet(raw: unknown): PetSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== 'kitten' && r.kind !== 'puppy') return null;
  // a valid pet whose name got mangled keeps living with a default name (never drop a real pet over its name)
  const name = cleanPetName(typeof r.name === 'string' ? r.name : '') || (r.kind === 'kitten' ? 'Mochi' : 'Biscuit');
  const coat = typeof r.coat === 'string' && PET_COATS.some((c) => c.id === r.coat) ? r.coat : PET_COATS[0].id;
  const owned = Array.isArray(r.owned) ? [...new Set(r.owned.filter((x): x is string => typeof x === 'string' && !!petItemById(x)))] : [];
  const w = (r.worn && typeof r.worn === 'object' ? r.worn : {}) as Record<string, unknown>;
  const pick = (slot: PetSlot): string | null => {
    const id = w[slot];
    return typeof id === 'string' && owned.includes(id) && petItemById(id)?.slot === slot ? id : null;
  };
  return { kind: r.kind, name, coat, owned, worn: { head: pick('head'), body: pick('body') } };
}

/** Daily Pet Care counters (XP only pays for the first few of each, so it stays cozy rather than a grind). */
export interface PetCare { day: string; pat: number; play: number; snack: number; sniff: number }
export const defaultPetCare = (): PetCare => ({ day: '', pat: 0, play: 0, snack: 0, sniff: 0 });
export function sanitizePetCare(raw: unknown): PetCare {
  const base = defaultPetCare();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(99, Math.floor(v))) : 0);
  return { day: typeof r.day === 'string' ? r.day : '', pat: num(r.pat), play: num(r.play), snack: num(r.snack), sniff: num(r.sniff) };
}
