// Old saves had one "outfit" id (+ owned outfit ids and one handmade accessory). Map them onto the slot-based wardrobe.
// Anything they owned or wore keeps being owned and worn, including the cheetah pieces.
import { clothById } from './index';
import { START_WORN, startClothes } from './start';
import type { Slot } from './types';

const SLOTS: Slot[] = ['hat', 'top', 'bottom', 'dress', 'shoes', 'bag', 'face'];
interface Map1 { own: string[]; wear: Partial<Record<Slot, string>> }
const OLD: Record<string, Map1> = {
  cozy: { own: [], wear: {} },
  peony: { own: ['peony_pinafore', 'pink_bow'], wear: { dress: 'peony_pinafore', hat: 'pink_bow' } },
  strawberry: { own: ['strawberry_overalls', 'strawberry_beret'], wear: { top: 'cream_tee', bottom: 'strawberry_overalls', hat: 'strawberry_beret' } },
  spotted_sun: { own: ['sun_dress', 'spotted_sun'], wear: { dress: 'sun_dress', hat: 'spotted_sun' } },
  cheetah_coat: { own: ['cheetah_coat'], wear: { dress: 'cheetah_coat' } },
  rose_cheetah: { own: ['rose_cheetah', 'pink_bow'], wear: { dress: 'rose_cheetah', hat: 'pink_bow' } },
};

interface Raw { outfit?: string; ownedOutfits?: string[]; worn?: Partial<Record<Slot, string | null>>; ownedClothes?: string[] }

/** Returns the wardrobe fields for a loaded save (new saves pass straight through, cleaned up). */
export function migrateWardrobe(raw: Raw): { worn: Record<Slot, string | null>; ownedClothes: string[] } {
  const owned = new Set<string>(startClothes());
  for (const id of raw.ownedClothes ?? []) if (clothById(id)) owned.add(id);
  let worn: Record<Slot, string | null> = { ...START_WORN };
  if (raw.worn && typeof raw.worn === 'object') {
    worn = { hat: null, top: null, bottom: null, dress: null, shoes: null, bag: null, face: null };
    for (const s of SLOTS) { const id = raw.worn[s]; worn[s] = id && clothById(id)?.slot === s ? id : null; }
  } else {
    for (const o of raw.ownedOutfits ?? ['cozy']) for (const id of OLD[o]?.own ?? []) owned.add(id);
    const w = OLD[raw.outfit ?? 'cozy'];
    if (w) {
      for (const id of w.own) owned.add(id);
      Object.assign(worn, w.wear);
      if (w.wear.dress) { worn.top = null; worn.bottom = null; }
    }
  }
  // wearing something implies owning it (e.g. an item removed from sale); dress and top/bottom stay exclusive
  for (const s of SLOTS) if (worn[s]) owned.add(worn[s]!);
  if (worn.dress) { worn.top = null; worn.bottom = null; } else { worn.top ??= START_WORN.top; worn.bottom ??= START_WORN.bottom; }
  return { worn, ownedClothes: [...owned] };
}
