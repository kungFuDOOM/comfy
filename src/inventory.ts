import { sfx } from './audio';
import { ITEMS } from './data';
import { changed } from './bus';
import { state } from './state';

export const count = (id: string) => state.inv[id] ?? 0;
export const isTool = (id: string) => ITEMS[id]?.kind === 'tool';

export function addItem(id: string, n = 1) {
  state.inv[id] = count(id) + n;
  if (!state.hotbar.includes(id)) {
    const free = state.hotbar.indexOf(null);
    if (free >= 0) state.hotbar[free] = id;
  }
  changed();
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
