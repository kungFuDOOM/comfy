// Player movement: smoothed analog/keyboard movement, plus tap/click-to-move with BFS pathfinding.
import { MAP_H, MAP_W, TS, isWalkable } from './world';
import { state } from './state';
import type { Facing } from './art/characters';

export const player = {
  x: state.px,
  y: state.py,
  facing: 'down' as Facing,
  moving: false,
  running: false, // true while a run input is actually carrying the player
  path: [] as { x: number; y: number }[],
  onArrive: null as null | (() => void),
  faceTile: null as null | { x: number; y: number },
};

const SPEED = 100; // click-to-move pace
const WALK = 96;
const RUN = 192; // 2x WALK
const ACCEL = 12; // 1/s smoothing toward the target velocity
const DECEL = 18;
const HALF = 7;
let vx = 0, vy = 0;

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
  let hitX = false, hitY = false;
  if (dx) { if (!blockedAt(player.x + dx, player.y)) player.x += dx; else hitX = true; }
  if (dy) { if (!blockedAt(player.x, player.y + dy)) player.y += dy; else hitY = true; }
  if (hitX) vx = 0;
  if (hitY) vy = 0;
}

/**
 * mx,my: world-space move vector (|v| <= 1). Keyboard gives a unit vector; sticks give analog tilt
 * (small tilt = slow walk, full tilt = run). Velocity eases in/out for every input type.
 */
export function updatePlayer(dt: number, axisX: number, axisY: number, run = false, analog = false) {
  let mx = axisX, my = axisY;
  let speed = 0;
  const mag = Math.hypot(mx, my);
  const input = mag > 0.001;
  if (input) {
    // any manual input takes over from a click path
    if (player.path.length) cancelPath();
    mx /= mag; my /= mag;
    if (analog) {
      // tilt scales speed; a full tilt is a brisk walk. Only the run button reaches RUN.
      const tilt = Math.min(1, Math.max(0.3, mag / 0.8));
      speed = run ? RUN * Math.min(1, Math.max(0.6, mag / 0.5)) : WALK * tilt;
    } else speed = run ? RUN : WALK;
  } else if (player.path.length) {
    const tgt = player.path[0];
    const dx = tgt.x - player.x, dy = tgt.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      player.path.shift();
      if (!player.path.length) { arrive(); player.moving = false; vx = vy = 0; player.running = false; return; }
    } else {
      mx = dx / d; my = dy / d;
      // click-to-move is direct (no easing, so it can't overshoot waypoints)
      vx = mx * SPEED; vy = my * SPEED;
      player.moving = true; player.running = false;
      faceMove(mx, my);
      tryMove(vx * dt, vy * dt);
      return;
    }
  }
  const k = 1 - Math.exp(-(input ? ACCEL : DECEL) * dt);
  vx += (mx * speed - vx) * k;
  vy += (my * speed - vy) * k;
  if (!input && Math.hypot(vx, vy) < 4) { vx = vy = 0; }
  player.moving = Math.hypot(vx, vy) > 8;
  player.running = run && input && Math.hypot(vx, vy) > WALK * 1.15;
  if (input) faceMove(mx, my);
  if (vx || vy) tryMove(vx * dt, vy * dt);
}

function faceMove(mx: number, my: number) {
  if (Math.abs(mx) > Math.abs(my) + 0.2) player.facing = mx < 0 ? 'left' : 'right';
  else if (Math.abs(my) > 0.01) player.facing = my < 0 ? 'up' : 'down';
}

export function frontTile() {
  const t = tileOf();
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing];
  return { x: t.x + d[0], y: t.y + d[1] };
}
