// Home decorating rules: place, move, rotate and pick up pieces on the room grid, plus wallpaper and floor.
// No rendering or DOM here (render/homeRoom.ts draws the room, ui/homeUi.ts is the decorate-mode UI).
import { changed } from './bus';
import { ITEMS } from './data';
import { FLOORS, HOME_D, HOME_W, WALLPAPERS, isFlat } from './homeData';
import { addItem, count, removeItem } from './inventory';
import { moment } from './lanterns';
import { player } from './player';
import { bump } from './quests';
import { defaultHome, state, type HomeItem, type HomeSave } from './state';

export const inRoom = (x: number, y: number) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < HOME_W && y < HOME_D;

/** Make a loaded `home` safe: bad ids fall back to defaults, items outside the grid, unknown, or stacked on one cell are dropped. */
export function normalizeHome(raw: unknown): HomeSave {
  const base = defaultHome();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<HomeSave>;
  const out: HomeSave = {
    wall: WALLPAPERS.some((w) => w.id === r.wall) ? r.wall! : base.wall,
    floor: FLOORS.some((f) => f.id === r.floor) ? r.floor! : base.floor,
    items: [],
  };
  if (Array.isArray(r.items)) {
    for (const it of r.items) {
      if (!it || typeof it.id !== 'string' || ITEMS[it.id]?.kind !== 'decor') continue;
      const x = Number(it.x), y = Number(it.y);
      if (!inRoom(x, y) || cellTaken(out.items, it.id, x, y)) continue;
      out.items.push({ id: it.id, x, y, rot: ((Math.round(Number(it.rot)) || 0) % 4 + 4) % 4 });
    }
  }
  return out;
}

/** Is the cell's layer for this piece already used? A flat piece only conflicts with another flat piece. */
function cellTaken(items: HomeItem[], id: string, x: number, y: number, ignore?: HomeItem) {
  return items.some((o) => o !== ignore && o.x === x && o.y === y && isFlat(o.id) === isFlat(id));
}

/** Everything in a cell, standing piece first (so taps can cycle through a rug and what sits on it, and a standing piece wins a tap). */
export const homeItemsAt = (x: number, y: number) => state.home.items.filter((o) => o.x === x && o.y === y).sort((a, b) => Number(isFlat(a.id)) - Number(isFlat(b.id)));

export const canPlaceAt = (id: string, x: number, y: number, ignore?: HomeItem) => inRoom(x, y) && !cellTaken(state.home.items, id, x, y, ignore);

/** Decor in the bag (placed pieces are no longer counted there). */
export const ownedDecor = () => Object.keys(state.inv).filter((id) => ITEMS[id]?.kind === 'decor' && count(id) > 0);

export function placeHome(id: string, x: number, y: number, rot: number): HomeItem | null {
  if (!canPlaceAt(id, x, y) || !removeItem(id)) return null;
  const it: HomeItem = { id, x, y, rot: ((rot % 4) + 4) % 4 };
  state.home.items.push(it);
  bump('placed');
  moment('decor', player.x, player.y);
  changed();
  return it;
}

export function moveHome(it: HomeItem, x: number, y: number): boolean {
  if (!canPlaceAt(it.id, x, y, it)) return false;
  it.x = x; it.y = y;
  changed();
  return true;
}

export function rotateHome(it: HomeItem, dir = 1) { it.rot = (((it.rot + dir) % 4) + 4) % 4; changed(); }

export function pickUpHome(it: HomeItem) {
  const i = state.home.items.indexOf(it);
  if (i < 0) return;
  state.home.items.splice(i, 1);
  addItem(it.id);
}

export function setWall(id: string) { if (WALLPAPERS.some((w) => w.id === id)) { state.home.wall = id; changed(); } }
export function setFloor(id: string) { if (FLOORS.some((f) => f.id === id)) { state.home.floor = id; changed(); } }

/** Put every piece back in the bag. */
export function clearHome() {
  for (const it of [...state.home.items]) pickUpHome(it);
}
