// Yard decorating: place decor on the tile you're facing, or pick it back up.
import { startAct } from './actions';
import { changed, toast } from './bus';
import { ITEMS } from './data';
import { addItem, removeItem, selectedItem } from './inventory';
import { moment } from './lanterns';
import { bump } from './quests';
import { state } from './state';
import { TS, inYard } from './world';

export const decorAt = (x: number, y: number) => state.decor.find((d) => d.x === x && d.y === y);

export function decorHint(x: number, y: number): string {
  const d = decorAt(x, y);
  if (d) return `Pick up ${ITEMS[d.id].name}`;
  const sel = selectedItem();
  return sel && ITEMS[sel]?.kind === 'decor' ? `Place ${ITEMS[sel].name}` : 'Select a decor item to place here';
}

export function useYard(x: number, y: number) {
  if (!inYard(x, y)) return;
  const existing = decorAt(x, y);
  const sel = selectedItem();
  if (existing) {
    state.decor.splice(state.decor.indexOf(existing), 1);
    addItem(existing.id);
    toast(`Picked up ${ITEMS[existing.id].name}`);
    startAct('place', 0.95, { tx: x * TS + TS / 2, ty: y * TS + TS / 2 });
  } else if (sel && ITEMS[sel]?.kind === 'decor' && removeItem(sel)) {
    state.decor.push({ id: sel, x, y });
    toast(`Placed ${ITEMS[sel].name}`);
    startAct('place', 0.95, { tx: x * TS + TS / 2, ty: y * TS + TS / 2 });
    bump('placed');
    moment('decor', x * TS + TS / 2, y * TS + TS / 2);
  } else toast('Buy decor at the boutique, then select it on your hotbar.');
  changed();
}
