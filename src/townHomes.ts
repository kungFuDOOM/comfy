// Friend Moves In: the runtime side of the little town houses. A cottage exists only for a friend listed in the optional
// save field `movedIn` (plus, during a scene or a ?cutscene= preview, one stand-in that is never saved). Existing saves
// have no `movedIn`, so they get no extra houses. Pure state + collision: the model is drawn by render/townHomesLayer.ts.
import { state } from './state';
import { HOME_SIZE, TOWN_HOMES } from './townHomeData';
import { setDynamicBlock } from './world';

/** Friends who have moved into a town house (a real play only). Missing field = nobody yet. */
export const movedInIds = (): readonly string[] => state.movedIn ?? [];
export const isMovedIn = (id: string) => movedInIds().includes(id);

/** The friend whose house is shown only for a scene (the move-in scene's reveal, or a preview). Never saved. */
let standIn: string | null = null;
export const getStandInHome = () => standIn;
export const setStandInHome = (id: string | null) => { standIn = id; };

/** Every house to draw right now: the saved ones, plus the scene's stand-in. */
export const shownHomes = (): string[] => (standIn && !isMovedIn(standIn) ? [...movedInIds(), standIn] : [...movedInIds()]).filter((id) => !!TOWN_HOMES[id]);

/** The tile in front of a friend's door: where they stand and wander from once they live there. */
export function townHomeDoor(id: string): { x: number; y: number } | null {
  const h = TOWN_HOMES[id];
  return h ? { x: h.x + 1, y: h.y + HOME_SIZE } : null;
}

/** Is this tile under a moved-in friend's house? */
export function homeAtTile(x: number, y: number): string | null {
  for (const id of movedInIds()) {
    const h = TOWN_HOMES[id];
    if (h && x >= h.x && x < h.x + HOME_SIZE && y >= h.y && y < h.y + HOME_SIZE) return id;
  }
  return null;
}

/** Make the walls solid for every moved-in friend, so nobody walks through a cottage. Safe to call any time. */
export function syncTownHomeBlocks() {
  for (const id of Object.keys(TOWN_HOMES)) {
    const h = TOWN_HOMES[id], on = isMovedIn(id);
    for (let dy = 0; dy < HOME_SIZE; dy++) for (let dx = 0; dx < HOME_SIZE; dx++) setDynamicBlock(h.x + dx, h.y + dy, on);
  }
}
