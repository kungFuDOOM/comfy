// Collectibles that spawn around the island: shells, ribbon blossoms, steam-moths, starlit buttons.
import { sfx } from './audio';
import { circle, ellipse } from './art/draw';
import { drawItem } from './art/icons';
import { changed, toast } from './bus';
import { ITEMS } from './data';
import { addItem } from './inventory';
import { moment } from './lanterns';
import { bump } from './quests';
import { grantXp } from './skills';
import { state } from './state';
import { getClock } from './time';
import { isAreaOpen } from './state';
import { MAP_H, MAP_W, T, TS, areaAt, inMeadow, isSolidTile, terrainAt } from './world';

const MAX = 16;
let timer = 0;

function pickKind(): string | null {
  const c = getClock();
  const night = c.phase === 'evening' || c.phase === 'night';
  const s = c.season.id;
  const w: [string, number][] = [
    ['shell', 3 * (s === 'sunsip' ? 1.8 : 1)],
    ['blossom', 3 * (s === 'blossom' ? 2 : 1)],
    ['moth', night ? 3 * (s === 'sunsip' ? 1.5 : 1) : 0],
    ['button', 1.5 * (s === 'snowfluff' ? 2.5 : 1)],
  ];
  let total = w.reduce((a, b) => a + b[1], 0), r = Math.random() * total;
  for (const [k, v] of w) { if ((r -= v) <= 0 && v > 0) return k; }
  return null;
}

function tileFits(kind: string, x: number, y: number): boolean {
  const t = terrainAt(x, y);
  if (isSolidTile(x, y) || !isAreaOpen(areaAt(x, y))) return false;
  switch (kind) {
    case 'shell': return t === T.Sand;
    case 'blossom': return inMeadow(x, y);
    case 'moth': return t === T.Grass || t === T.Path || t === T.Lawn || t === T.Plaza;
    case 'button': return t === T.Hill;
  }
  return false;
}

// spawns must be reachable: no water/unwalkable tile in the 4 neighbours
const reachable = (x: number, y: number) =>
  !isSolidTile(x + 1, y) && !isSolidTile(x - 1, y) && !isSolidTile(x, y + 1) && !isSolidTile(x, y - 1);

export function spawnOne(px = -999, py = -999): boolean {
  const kind = pickKind();
  if (!kind) return false;
  for (let i = 0; i < 60; i++) {
    // the island is big: spawn within a few screens of the player (anywhere when called without a position)
    const near = px > -900;
    const x = near ? Math.round(px / TS + (Math.random() * 2 - 1) * 24) : (Math.random() * MAP_W) | 0;
    const y = near ? Math.round(py / TS + (Math.random() * 2 - 1) * 18) : (Math.random() * MAP_H) | 0;
    if (!tileFits(kind, x, y) || !reachable(x, y)) continue;
    const wx = x * TS + 8 + Math.random() * 16, wy = y * TS + 14 + Math.random() * 14;
    if (Math.hypot(wx - px, wy - py) < 4 * TS) continue;
    if (state.spawns.some((s) => Math.hypot(s.x - wx, s.y - wy) < 20)) continue;
    state.spawns.push({ item: kind, x: wx, y: wy });
    return true;
  }
  return false;
}

export function updateCollect(dt: number, px: number, py: number) {
  // drop spawns saved on tiles that are now water/solid (e.g. after the map changed)
  for (let i = state.spawns.length - 1; i >= 0; i--) {
    const s = state.spawns[i];
    if (!tileFits(s.item, Math.floor(s.x / TS), Math.floor(s.y / TS))) state.spawns.splice(i, 1);
  }
  timer -= dt;
  if (timer <= 0) {
    timer = 7 + Math.random() * 6;
    if (state.spawns.length < MAX) spawnOne(px, py);
    // night moths fade away in daylight
    const c = getClock();
    if (c.phase !== 'evening' && c.phase !== 'night') {
      const i = state.spawns.findIndex((s) => s.item === 'moth');
      if (i >= 0) state.spawns.splice(i, 1);
    }
  }
  for (let i = state.spawns.length - 1; i >= 0; i--) {
    const s = state.spawns[i];
    if (Math.hypot(s.x - px, s.y - 8 - py) < 15) {
      state.spawns.splice(i, 1);
      addItem(s.item);
      state.found[s.item] = (state.found[s.item] ?? 0) + 1;
      const first = state.found[s.item] === 1;
      toast(first ? `New find! ${ITEMS[s.item].name} added to your collection ✿` : `Found a ${ITEMS[s.item].name}`);
      sfx.pickup();
      bump('collected');
      grantXp('foraging', 3);
      moment('collect', s.x, s.y);
      changed();
    }
  }
}

export function drawSpawn(ctx: CanvasRenderingContext2D, s: { item: string; x: number; y: number }, t: number) {
  const bob = Math.sin(t * 2.5 + s.x) * 2;
  ellipse(ctx, s.x, s.y, 6, 2, 'rgba(100,70,100,0.18)');
  ctx.save();
  ctx.translate(s.x - 8, s.y - 18 + bob - (s.item === 'moth' ? Math.sin(t * 3 + s.y) * 3 + 6 : 0));
  ctx.scale(0.5, 0.5);
  drawItem(ctx, s.item);
  ctx.restore();
  const a = 0.5 + Math.sin(t * 4 + s.x) * 0.4;
  circle(ctx, s.x + 7, s.y - 22 + bob, 1.4, `rgba(255,255,255,${a})`);
}
