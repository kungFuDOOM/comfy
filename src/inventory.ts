import { sfx } from './audio';
import { ITEMS } from './data';
import { changed, toast } from './bus';
import { state } from './state';

export const count = (id: string) => state.inv[id] ?? 0;
export const isTool = (id: string) => ITEMS[id]?.kind === 'tool';

export const BAG_SLOTS = 24;
export const BANK_SLOTS = 48;
export const bagStacks = () => Object.keys(state.inv).length;
export const bankStacks = () => Object.keys(state.bank).length;
export const bankCount = (id: string) => state.bank[id] ?? 0;

/**
 * Add to the bag. A full bag still stacks onto existing items; a brand-new stack goes to the chest instead
 * (with a toast), and only if both are full does it stay in the bag over capacity. Nothing is ever lost.
 */
export function addItem(id: string, n = 1) {
  if (count(id) === 0 && bagStacks() >= BAG_SLOTS) {
    if (bankCount(id) > 0 || bankStacks() < BANK_SLOTS) {
      state.bank[id] = bankCount(id) + n;
      toast(`Your bag is full — ${ITEMS[id]?.name ?? id} went into the Softkeep Chest at home.`);
      changed();
      return;
    }
    toast('Your bag and chest are both full! Visit the Softkeep Chest to tidy up.');
  }
  state.inv[id] = count(id) + n;
  if (!state.hotbar.includes(id)) {
    const free = state.hotbar.indexOf(null);
    if (free >= 0) state.hotbar[free] = id;
  }
  changed();
}

/** Move up to `n` of an item between the bag and the chest. Returns how many moved. */
export function moveStack(id: string, n: number, to: 'bank' | 'bag'): number {
  const from = to === 'bank' ? state.inv : state.bank, dest = to === 'bank' ? state.bank : state.inv;
  const cap = to === 'bank' ? BANK_SLOTS : BAG_SLOTS;
  const have = from[id] ?? 0;
  if (!have || (to === 'bank' && isTool(id))) return 0;
  if (!dest[id] && Object.keys(dest).length >= cap) {
    toast(to === 'bank' ? 'The chest is full.' : 'Your bag is full — make some room first.');
    return 0;
  }
  const m = Math.min(have, n);
  from[id] = have - m;
  if (from[id] <= 0) {
    delete from[id];
    if (to === 'bank') state.hotbar = state.hotbar.map((s) => (s === id ? null : s));
  }
  dest[id] = (dest[id] ?? 0) + m;
  if (to === 'bag' && !state.hotbar.includes(id)) {
    const free = state.hotbar.indexOf(null);
    if (free >= 0) state.hotbar[free] = id;
  }
  changed();
  return m;
}

/** Send bag stacks beyond the slot cap (from older saves) to the chest. Returns how many stacks moved. */
export function tidyBag(): number {
  let moved = 0;
  const movable = Object.keys(state.inv).filter((id) => !isTool(id)).reverse();
  for (const id of movable) {
    if (bagStacks() <= BAG_SLOTS) break;
    if (moveStack(id, state.inv[id], 'bank')) moved++;
  }
  return moved;
}

export function removeItem(id: string, n = 1): boolean {
  if (isTool(id) || count(id) < n) return false;
  state.inv[id] = count(id) - n;
  if (state.inv[id] <= 0) {
    delete state.inv[id];
    state.hotbar = state.hotbar.map((s) => (s === id ? null : s));
  }
  changed();
  return true;
}

export const selectedItem = (): string | null => state.hotbar[state.sel] ?? null;

export function selectSlot(i: number) {
  const next = (i + 9) % 9;
  if (next !== state.sel) sfx.tick();
  state.sel = next;
  changed();
}

export function assignHotbar(id: string) {
  const prev = state.hotbar.indexOf(id);
  if (prev >= 0) state.hotbar[prev] = state.hotbar[state.sel];
  state.hotbar[state.sel] = id;
  changed();
}

export function earn(n: number) { state.coins += n; if (n > 0) sfx.coin(); changed(); }
export function spend(n: number): boolean {
  if (state.coins < n) return false;
  state.coins -= n;
  if (n > 0) sfx.spend();
  changed();
  return true;
}

export function sellable(id: string) {
  return !!ITEMS[id]?.sell && count(id) > 0;
}
