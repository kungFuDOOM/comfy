// Player movement: keyboard, plus tap/click-to-move with BFS pathfinding.
import { MAP_H, MAP_W, TS, isWalkable } from './world';
import { state } from './state';
import type { Facing } from './art/characters';

export const player = {
  x: state.px,
  y: state.py,
  facing: 'down' as Facing,
  moving: false,
  path: [] as { x: number; y: number }[],
  onArrive: null as null | (() => void),
  faceTile: null as null | { x: number; y: number },
};

const SPEED = 104;
const HALF = 7;

function blockedAt(x: number, y: number) {
  const l = Math.floor((x - HALF) / TS), r = Math.floor((x + HALF) / TS);
  const t = Math.floor((y - 6) / TS), b = Math.floor((y - 1) / TS);
  return !isWalkable(l, t) || !isWalkable(r, t) || !isWalkable(l, b) || !isWalkable(r, b);
}

export function placePlayer() {
  player.x = state.px;
  player.y = state.py;
  player.facing = state.facing;
  if (blockedAt(player.x, player.y)) { player.x = 30 * TS + 16; player.y = 24 * TS; }
}

export function cancelPath() {
  player.path = [];
  player.onArrive = null;
  player.faceTile = null;
}

export const tileOf = () => ({ x: Math.floor(player.x / TS), y: Math.floor((player.y - 4) / TS) });

/** BFS from the player tile. Goal = any of the candidate tiles. Returns the path or null. */
export function findPath(goals: { x: number; y: number }[]): { x: number; y: number }[] | null {
  const s = tileOf();
  const goalSet = new Set(goals.filter((g) => isWalkable(g.x, g.y)).map((g) => g.y * MAP_W + g.x));
  if (!goalSet.size) return null;
  const prev = new Int32Array(MAP_W * MAP_H).fill(-2);
  const start = s.y * MAP_W + s.x;
  prev[start] = -1;
  const q = [start];
  let found = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (goalSet.has(cur)) { found = cur; break; }
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || !isWalkable(nx, ny)) continue;
      const ni = ny * MAP_W + nx;
      if (prev[ni] !== -2) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (found < 0) return null;
  const path: { x: number; y: number }[] = [];
  for (let c = found; c !== start; c = prev[c]) path.push({ x: (c % MAP_W) * TS + TS / 2, y: ((c / MAP_W) | 0) * TS + TS - 4 });
  return path.reverse();
}

export function walkTo(goals: { x: number; y: number }[], onArrive?: () => void, faceTile?: { x: number; y: number }): boolean {
  const path = findPath(goals);
  if (!path) return false;
  player.path = path;
  player.onArrive = onArrive ?? null;
  player.faceTile = faceTile ?? null;
  if (!path.length) arrive();
  return true;
}

function arrive() {
  if (player.faceTile) faceToward(player.faceTile.x * TS + TS / 2, player.faceTile.y * TS + TS / 2);
  const cb = player.onArrive;
  player.path = []; player.onArrive = null; player.faceTile = null;
  cb?.();
}

export function faceToward(wx: number, wy: number) {
  const dx = wx - player.x, dy = wy - (player.y - 10);
  player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
}

function tryMove(dx: number, dy: number) {
  if (dx && !blockedAt(player.x + dx, player.y)) player.x += dx;
  if (dy && !blockedAt(player.x, player.y + dy)) player.y += dy;
}

export function updatePlayer(dt: number, axisX: number, axisY: number) {
  let mx = axisX, my = axisY;
  if (mx || my) {
    // keyboard takes over from any click path
    if (player.path.length) cancelPath();
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
  } else if (player.path.length) {
    const tgt = player.path[0];
    const dx = tgt.x - player.x, dy = tgt.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      player.path.shift();
      if (!player.path.length) { arrive(); player.moving = false; return; }
    } else { mx = dx / d; my = dy / d; }
  }
  player.moving = !!(mx || my);
  if (!player.moving) return;
  if (Math.abs(mx) > Math.abs(my) + 0.2) player.facing = mx < 0 ? 'left' : 'right';
  else if (Math.abs(my) > 0.01) player.facing = my < 0 ? 'up' : 'down';
  tryMove(mx * SPEED * dt, my * SPEED * dt);
}

export function frontTile() {
  const t = tileOf();
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing];
  return { x: t.x + d[0], y: t.y + d[1] };
}
