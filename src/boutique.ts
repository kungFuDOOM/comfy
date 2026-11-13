// Boutique odds and ends: handmade head accessories (crafted pins that sit beside a hat) and decor shopping.
// Clothes themselves live in wardrobe.ts.
import { ITEMS } from './data';
import { changed, toast } from './bus';
import { addItem, count, spend } from './inventory';
import { twirl } from './dressing';
import { state } from './state';

/** Handmade accessories you own (crafted at the worktable) can be worn as a small visible prop. */
export const ownedAccessories = () => Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'accessory' && count(id) > 0);
/** The accessory shown on the player: only while it is still in the bag (gifting / selling it takes it off). */
export const currentAccessory = (): string | null => (state.accessory && count(state.accessory) > 0 ? state.accessory : null);
/** Wear an accessory, or take it off (tap the worn one again, or pass null). */
export function toggleAccessory(id: string | null) {
  state.accessory = id && currentAccessory() !== id ? id : null;
  twirl();
  changed();
}

export function buyDecor(id: string): boolean {
  const price = ITEMS[id].buy ?? 0;
  if (!spend(price)) { toast('Not enough pips yet.'); return false; }
  addItem(id);
  toast(`Bought ${ITEMS[id].name}. Decorate your home or yard with it!`);
  return true;
}
