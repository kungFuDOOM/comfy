// Boutique: outfits (pink and cheetah print) and decor.
import { OUTFITS, ITEMS } from './data';
import { changed, toast } from './bus';
import { addItem, spend } from './inventory';
import { moment } from './lanterns';
import { player } from './player';
import { bump } from './quests';
import { state } from './state';

export const outfitById = (id: string) => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
/** Temporary try-on shown while the boutique is open. */
export const preview = { id: null as string | null };
export const currentOutfit = () => outfitById(preview.id ?? state.outfit);
const triedThisSession = new Set<string>();

export function tryOn(id: string) {
  preview.id = id;
  bump('tried');
  if (!triedThisSession.has(id)) { triedThisSession.add(id); moment('outfit', player.x, player.y); }
  changed();
}

export function endPreview() { preview.id = null; changed(); }

export function buyOutfit(id: string): boolean {
  const o = outfitById(id);
  if (state.ownedOutfits.includes(id)) return false;
  if (!spend(o.price)) { toast('Not enough pips yet.'); return false; }
  state.ownedOutfits.push(id);
  state.outfit = id; preview.id = null;
  toast(`You bought the ${o.name}! ✿`);
  moment('outfit', player.x, player.y);
  changed();
  return true;
}

export function wear(id: string) {
  if (!state.ownedOutfits.includes(id)) return;
  state.outfit = id; preview.id = null;
  bump('tried');
  changed();
}

export function buyDecor(id: string): boolean {
  const price = ITEMS[id].buy ?? 0;
  if (!spend(price)) { toast('Not enough pips yet.'); return false; }
  addItem(id);
  toast(`Bought ${ITEMS[id].name}. Place it in your yard!`);
  return true;
}
