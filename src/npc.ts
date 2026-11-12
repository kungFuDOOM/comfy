// Villagers: wandering, dialogue, friendship hearts, gifts and serving drinks.
import { drawVillager, type Facing } from './art/characters';
import { sfx } from './audio';
import { bus, changed } from './bus';
import { ITEMS, VILLAGERS, type VillagerDef } from './data';
import { feastChat } from './events/pieLines';
import { pieReply } from './events/pieLines';
import { feastGathering, feastSeatFor } from './events/feastSeats';
import { removeItem } from './inventory';
import { moment } from './lanterns';
import { bump } from './quests';
import { ensureDaily, isAreaOpen, state } from './state';
import { getClock } from './time';
import { TS, areaAt, isWalkable } from './world';

export interface Npc { def: VillagerDef; x: number; y: number; tx: number; ty: number; wait: number; facing: Facing; moving: boolean; busy: boolean; /** At the feast table (seasonal event). */ seated?: boolean }
export const npcs: Npc[] = [];

/** Is this villager around right now? (Nimbus only drifts in at dusk.) */
export const isPresent = (n: Npc, phase = getClock().phase) => !n.def.phases || n.def.phases.includes(phase) || feastGathering();
/** Villagers currently on the island; use this for rendering, picking and interaction. */
export const presentNpcs = (): Npc[] => { const ph = getClock().phase; return npcs.filter((n) => isPresent(n, ph)); };

/** Is this friend living on the island yet? Friends from a gated area are absent until it opens. */
export const hasMovedIn = (def: VillagerDef) => !def.area || isAreaOpen(def.area);

/** Make the cast match what is unlocked: friends from opened areas appear at home, friends of locked ones vanish. */
export function syncNpcs() {
  for (const def of VILLAGERS) {
    const at = npcs.findIndex((n) => n.def.id === def.id);
    if (hasMovedIn(def)) {
      if (at >= 0) continue;
      const x = def.home.x * TS + TS / 2, y = def.home.y * TS + TS - 4;
      npcs.push({ def, x, y, tx: x, ty: y, wait: 1 + Math.random() * 3, facing: 'down', moving: false, busy: false });
    } else if (at >= 0) npcs.splice(at, 1);
  }
}
export const initNpcs = syncNpcs;

export function updateNpcs(dt: number) {
  for (const n of npcs) {
    // feast day: everyone is at the long table in the square (and goes home again afterwards)
    const seat = feastSeatFor(n.def.id);
    if (seat) {
      n.seated = true;
      n.x = n.tx = seat.x * TS; n.y = n.ty = seat.z * TS;
      n.facing = seat.face; n.moving = false;
      continue;
    }
    if (n.seated) { n.seated = false; n.x = n.tx = n.def.home.x * TS + TS / 2; n.y = n.ty = n.def.home.y * TS + TS - 4; n.wait = 2; }
    if (n.busy) { n.moving = false; continue; }
    const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
    if (d > 2) {
      const sp = 26 * dt;
      const nx = n.x + (dx / d) * sp, ny = n.y + (dy / d) * sp;
      if (isWalkable(Math.floor(nx / TS), Math.floor((ny - 4) / TS))) { n.x = nx; n.y = ny; n.moving = true; }
      else { n.tx = n.x; n.ty = n.y; n.moving = false; }
      n.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    } else {
      n.moving = false;
      n.wait -= dt;
      if (n.wait <= 0) {
        n.wait = 3 + Math.random() * 5;
        const r = n.def.radius;
        const gx = Math.floor(n.def.home.x + (Math.random() * 2 - 1) * r), gy = Math.floor(n.def.home.y + (Math.random() * 2 - 1) * r);
        // stay in the friend's own area, so nobody wanders through a barrier or a wall
        if (isWalkable(gx, gy) && areaAt(gx, gy) === areaAt(n.def.home.x, n.def.home.y)) { n.tx = gx * TS + TS / 2; n.ty = gy * TS + TS - 4; }
      }
    }
  }
}

export const hearts = (id: string) => Math.min(5, Math.floor((state.friend[id] ?? 0) / 20));
const tier = (id: string) => (hearts(id) >= 4 ? 2 : hearts(id) >= 2 ? 1 : 0);
export const talkedToday = (id: string) => ensureDaily().talked.includes(id);

function addFriend(id: string, pts: number) {
  state.friend[id] = Math.min(100, (state.friend[id] ?? 0) + pts);
  changed();
}

export interface Reply { text: string; gain: number }

export function talk(def: VillagerDef): Reply {
  const daily = ensureDaily();
  const first = !daily.talked.includes(def.id);
  if (first) {
    daily.talked.push(def.id);
    addFriend(def.id, 6);
    bump('talked');
  }
  const pool = feastGathering() && Math.random() < 0.6 ? feastChat(def.id) : Math.random() < 0.4 ? [def.phase[getClock().phase]] : def.lines[tier(def.id)];
  return { text: pool[(Math.random() * pool.length) | 0], gain: first ? 6 : 0 };
}

/** Give an item. Drinks count as serving (a café moment); anything else is a gift. */
export function give(def: VillagerDef, itemId: string): Reply | null {
  const item = ITEMS[itemId];
  if (!item || item.kind === 'tool' || item.kind === 'decor') return null;
  const daily = ensureDaily();
  const isDrink = item.kind === 'drink';
  const list = isDrink ? daily.served : daily.gifted;
  const npc = npcs.find((n) => n.def.id === def.id);
  const wx = npc?.x ?? 0, wy = npc?.y ?? 0;
  if (list.includes(def.id)) {
    return { text: isDrink ? "I'm all caffeinated for today, thank you! Maybe tomorrow?" : 'You are so sweet! One gift a day is plenty — I will cherish it.', gain: 0 };
  }
  if (!removeItem(itemId)) return null;
  list.push(def.id);
  sfx.gift();
  const loved = !!item.loved; // pies: every villager adores them
  const liked = loved || def.likes.includes(itemId);
  const gain = loved ? 30 : liked ? 20 : isDrink ? 8 : 4;
  addFriend(def.id, gain);
  if (isDrink) { bump('served'); moment('serve', wx, wy); }
  else { bump('gifted'); if (liked) moment('gift', wx, wy); else if (Math.random() < 0.3) moment('gift', wx, wy); }
  bus.emit('gift', { villager: def.id, item: itemId });
  if (loved) return { text: pieReply(def.id), gain };
  return { text: liked ? (isDrink ? def.loved : def.liked) : def.meh, gain };
}
export const drawNpc = (ctx: CanvasRenderingContext2D, n: Npc, t: number) =>
  drawVillager(ctx, n.def, n.x, n.y, t, n.facing, n.moving, 1, !talkedToday(n.def.id));
