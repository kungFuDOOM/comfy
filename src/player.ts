// Player movement: smoothed analog/keyboard movement, plus tap/click-to-move with A* pathfinding.
import { MAP_H, MAP_W, TS, areaAt, isWalkable } from './world';
import { isAreaOpen, state } from './state';
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

// Walk and run, in px/s. Walk is 73, 25% quicker than the old 58 (about one 32px tile every 0.44s).
// Run stays 132 — about 1.8× a walk — and only happens while Shift, gamepad B, or the on-screen run button is held.
// A full stick still tops out at a walk. Tap-to-walk uses these same two paces.
const WALK = 73;
const RUN = 132;
const SPEED = WALK; // tap-to-walk strolls at the keyboard pace, and runs while a run button is held
const ACCEL = 12; // 1/s smoothing toward a walk
const RUN_ACCEL = 20; // 1/s while she breaks into a run
const DECEL = 18;
const HALF = 7;
let vx = 0, vy = 0, stuck = 0;

function blockedAt(x: number, y: number) {
  const l = Math.floor((x - HALF) / TS), r = Math.floor((x + HALF) / TS);
  const t = Math.floor((y - 6) / TS), b = Math.floor((y - 1) / TS);
  return !isWalkable(l, t) || !isWalkable(r, t) || !isWalkable(l, b) || !isWalkable(r, b);
}

export function placePlayer() {
  player.x = state.px;
  player.y = state.py;
  player.facing = state.facing;
  // landed in water, a wall, or an area that is still locked (e.g. an old save): back to the square
  if (blockedAt(player.x, player.y) || !isAreaOpen(areaAt(Math.floor(player.x / TS), Math.floor((player.y - 4) / TS)))) { player.x = 48 * TS + 16; player.y = 46 * TS; }
}

export function cancelPath() {
  player.path = [];
  player.onArrive = null;
  player.faceTile = null;
}

export const tileOf = () => ({ x: Math.floor(player.x / TS), y: Math.floor((player.y - 4) / TS) });

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Binary min-heap keyed by f-score, for A*. */
class Heap {
  private n: number[] = []; private f: number[] = [];
  get size() { return this.n.length; }
  push(node: number, f: number) {
    let i = this.n.length; this.n.push(node); this.f.push(f);
    while (i > 0) { const p = (i - 1) >> 1; if (this.f[p] <= this.f[i]) break; this.swap(i, p); i = p; }
  }
  pop() {
    const top = this.n[0], ln = this.n.pop()!, lf = this.f.pop()!;
    if (this.n.length) {
      this.n[0] = ln; this.f[0] = lf;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.n.length && this.f[l] < this.f[m]) m = l;
        if (r < this.n.length && this.f[r] < this.f[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.n[a], this.n[b]] = [this.n[b], this.n[a]]; [this.f[a], this.f[b]] = [this.f[b], this.f[a]];
  }
}

/** A* on the 4-connected tile grid from the player tile to the nearest of the candidate tiles. Returns waypoints (world px) or null. */
export function findPath(goals: { x: number; y: number }[], from?: { x: number; y: number }): { x: number; y: number }[] | null {
  // `from` (world px, feet position) lets other walkers (the pet) reuse the same A*; default is the player
  const s = from ? { x: Math.floor(from.x / TS), y: Math.floor((from.y - 4) / TS) } : tileOf();
  if (from && !isWalkable(s.x, s.y)) return null;
  const gl = goals.filter((g) => isWalkable(g.x, g.y));
  if (!gl.length) return null;
  const goalSet = new Set(gl.map((g) => g.y * MAP_W + g.x));
  const h = (x: number, y: number) => { let best = Infinity; for (const g of gl) best = Math.min(best, Math.abs(g.x - x) + Math.abs(g.y - y)); return best; };
  const N = MAP_W * MAP_H;
  const prev = new Int32Array(N).fill(-2);
  const cost = new Float32Array(N).fill(Infinity);
  const closed = new Uint8Array(N);
  const start = s.y * MAP_W + s.x;
  prev[start] = -1; cost[start] = 0;
  const open = new Heap();
  open.push(start, h(s.x, s.y));
  let found = -1;
  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (goalSet.has(cur)) { found = cur; break; }
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || !isWalkable(nx, ny)) continue;
      const ni = ny * MAP_W + nx, c = cost[cur] + 1;
      if (c >= cost[ni]) continue;
      cost[ni] = c; prev[ni] = cur;
      open.push(ni, c + h(nx, ny));
    }
  }
  if (found < 0) return null;
  const path: { x: number; y: number }[] = [];
  for (let c = found; c !== start; c = prev[c]) path.push({ x: (c % MAP_W) * TS + TS / 2, y: ((c / MAP_W) | 0) * TS + TS - 4 });
  return smoothPath(path.reverse(), from?.x ?? player.x, from?.y ?? player.y);
}

/** Can the player body walk the straight segment without touching a solid tile? */
function clearLine(x0: number, y0: number, x1: number, y1: number) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 4);
  for (let i = 1; i <= n; i++) { const t = i / n; if (blockedAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}

/** String-pull the staircase: skip waypoints whenever a straight line is clear, so the walk looks natural. */
function smoothPath(path: { x: number; y: number }[], startX: number, startY: number) {
  if (path.length < 2) return path;
  const out: { x: number; y: number }[] = [];
  let ax = startX, ay = startY, i = 0;
  while (i < path.length) {
    let j = i;
    while (j + 1 < path.length && clearLine(ax, ay, path[j + 1].x, path[j + 1].y)) j++;
    out.push(path[j]); ax = path[j].x; ay = path[j].y; i = j + 1;
  }
  return out;
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

/** Move with axis-separated collision so walls are slid along; small corner snags are nudged around. */
function tryMove(dx: number, dy: number) {
  let hitX = false, hitY = false;
  if (dx) { if (!blockedAt(player.x + dx, player.y)) player.x += dx; else hitX = true; }
  if (dy) { if (!blockedAt(player.x, player.y + dy)) player.y += dy; else hitY = true; }
  // clipped a corner head-on: slide sideways a few pixels if that clears it (doorways, tree rows)
  if (hitX && Math.abs(dy) < Math.abs(dx) * 0.5) nudge(dx, 0);
  if (hitY && Math.abs(dx) < Math.abs(dy) * 0.5) nudge(0, dy);
  if (hitX) vx = 0;
  if (hitY) vy = 0;
}

function nudge(dx: number, dy: number) {
  const step = Math.max(Math.abs(dx), Math.abs(dy));
  for (let o = 1; o <= 6; o++) {
    for (const sg of [1, -1]) {
      const px = dy ? sg * o : 0, py = dx ? sg * o : 0;
      if (!blockedAt(player.x + dx + px, player.y + dy + py) && !blockedAt(player.x + px, player.y + py)) {
        player.x += px * Math.min(1, step / 2); player.y += py * Math.min(1, step / 2);
        return;
      }
    }
  }
}

/**
 * mx,my: world-space move vector (|v| <= 1). Keyboard gives a unit vector; sticks give analog tilt
 * (small tilt = slow walk, full tilt = normal walk). Velocity eases in/out for every input type.
 */
export function updatePlayer(dt: number, axisX: number, axisY: number, run = false, analog = false) {
  let mx = axisX, my = axisY;
  let speed = 0;
  let wantsRun = false;
  const mag = Math.hypot(mx, my);
  const input = mag > 0.001;
  if (input) {
    // any manual input takes over from a click path
    if (player.path.length) cancelPath();
    mx /= mag; my /= mag;
    const m = Math.min(1, mag);
    // The stick only walks. Running is the run button, at any tilt.
    wantsRun = run;
    if (wantsRun) speed = RUN;
    else if (analog) speed = WALK * Math.max(0.25, m);
    else speed = WALK;
  } else if (player.path.length) {
    const tgt = player.path[0];
    const dx = tgt.x - player.x, dy = tgt.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      player.path.shift();
      if (!player.path.length) { arrive(); player.moving = false; vx = vy = 0; player.running = false; return; }
    } else {
      mx = dx / d; my = dy / d;
      // Direct pace (no easing). The step is capped at the remaining distance so a run frame can't sail past the point.
      // Run is the same hold as on foot: Shift, gamepad B, or the on-screen run button. Releasing it drops back to a walk.
      const pace = run ? RUN : SPEED;
      const step = Math.min(d, pace * dt);
      vx = mx * pace; vy = my * pace;
      player.moving = true; player.running = run;
      faceMove(mx, my);
      const bx = player.x, by = player.y;
      tryMove(mx * step, my * step);
      // wedged against something for a moment: give up cleanly instead of walking in place
      stuck = Math.hypot(player.x - bx, player.y - by) < step * 0.25 ? stuck + dt : 0;
      if (stuck > 0.5) { cancelPath(); player.moving = false; player.running = false; vx = vy = 0; stuck = 0; }
      return;
    }
  }
  const vel0 = Math.hypot(vx, vy);
  const rate = !input ? DECEL : wantsRun || vel0 > WALK * 1.3 ? RUN_ACCEL : ACCEL;
  const k = 1 - Math.exp(-rate * dt);
  vx += (mx * speed - vx) * k;
  vy += (my * speed - vy) * k;
  let vel = Math.hypot(vx, vy);
  if (!input && vel < 3) { vx = vy = 0; vel = 0; }
  player.moving = vel > 3;
  // Pose follows the run input once she's actually moving.
  player.running = input && wantsRun && vel > 6;
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
