// Collectibles that spawn around the island: shells, ribbon blossoms, steam-moths, starlit buttons.
import { playFx } from './actions';
import { sfx } from './audio';
import { circle, ellipse } from './art/draw';
import { drawItem } from './art/icons';
import { changed, toast } from './bus';
import { EVENT_COLLECTIBLES, ITEMS } from './data';
import { bumpEvent, eventItemOpen, getActiveEvents } from './events';
import { addItem } from './inventory';
import { moment } from './lanterns';
import { bump } from './quests';
import { grantXp } from './skills';
import { state } from './state';
import { getClock } from './time';
import { isRainyTime } from './weather';
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
    // rainy-day finds: they only come out in the rain (and while the rainbow is up)
    ['frog', isRainyTime() ? 3 : 0],
    ['snail', isRainyTime() ? 3 : 0],
    // gems and ore: glints on the shore and the hillside
    ['sea_glass', 0.8],
    ['candy_copper', 0.9],
    ['rose_quartz', 0.35],
    ['twinkle_geode', night ? 0.7 : 0],
    ['frost_opal', 0.3 * (s === 'snowfluff' ? 4 : 1)],
  ];
  // seasonal finds join the pool while their event is on
  for (const e of getActiveEvents()) for (const id of EVENT_COLLECTIBLES[e.id] ?? []) if (eventItemOpen(id)) w.push([id, ITEMS[id].findWeight ?? 3]);
  let total = w.reduce((a, b) => a + b[1], 0), r = Math.random() * total;
  for (const [k, v] of w) { if ((r -= v) <= 0 && v > 0) return k; }
  return null;
}

function tileFits(kind: string, x: number, y: number): boolean {
  const t = terrainAt(x, y);
  if (ITEMS[kind]?.event && !eventItemOpen(kind)) return false; // seasonal finds vanish when their event ends (and wait for their chapter)
  if (isSolidTile(x, y) || !isAreaOpen(areaAt(x, y))) return false;
  switch (kind) {
    case 'shell': return t === T.Sand;
    case 'blossom': return inMeadow(x, y);
    case 'moth': return t === T.Grass || t === T.Path || t === T.Lawn || t === T.Plaza;
    case 'button': return t === T.Hill;
    case 'frog': return t === T.Grass || t === T.Lawn || t === T.Sand;
    case 'snail': return t === T.Grass || t === T.Hill || t === T.Lawn;
    case 'button': case 'candy_copper': case 'rose_quartz': case 'twinkle_geode': case 'frost_opal': return t === T.Hill;
    case 'sea_glass': return t === T.Sand;
    case 'pumpkin': case 'apple': return t === T.Grass || (kind === 'pumpkin' && t === T.Lawn);
    // dry, walkable ground only: never water, the bridge, soil beds or anything solid (checked above)
    case 'ornament': return t === T.Grass || t === T.Lawn || t === T.Path || t === T.Plaza || t === T.Hill || t === T.Sand;
  }
  return false;
}

// spawns must be reachable: no water/unwalkable tile in the 4 neighbours
const reachable = (x: number, y: number) =>
  !isSolidTile(x + 1, y) && !isSolidTile(x - 1, y) && !isSolidTile(x, y + 1) && !isSolidTile(x, y - 1);

/** Frogs sit close to the water: some pond, river or sea within a few tiles. */
function nearWater(x: number, y: number, r = 4): boolean {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (terrainAt(x + dx, y + dy) === T.Water) return true;
  return false;
}

export function spawnOne(px = -999, py = -999): boolean {
  const kind = pickKind();
  if (!kind) return false;
  for (let i = 0; i < 60; i++) {
    // the island is big: spawn within a few screens of the player (anywhere when called without a position)
    const near = px > -900;
    const x = near ? Math.round(px / TS + (Math.random() * 2 - 1) * 24) : (Math.random() * MAP_W) | 0;
    const y = near ? Math.round(py / TS + (Math.random() * 2 - 1) * 18) : (Math.random() * MAP_H) | 0;
    if (!tileFits(kind, x, y) || !reachable(x, y) || (kind === 'frog' && !nearWater(x, y))) continue;
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
    const rainy = isRainyTime();
    timer = rainy ? 3.5 + Math.random() * 3 : 7 + Math.random() * 6; // the island is livelier in the rain
    if (state.spawns.length < MAX) spawnOne(px, py);
    // night moths fade away in daylight
    const c = getClock();
    if (c.phase !== 'evening' && c.phase !== 'night') {
      const i = state.spawns.findIndex((s) => s.item === 'moth' || s.item === 'twinkle_geode');
      if (i >= 0) state.spawns.splice(i, 1);
    }
    // frogs and snails hop / slide away once the weather clears
    if (!rainy) {
      const i = state.spawns.findIndex((s) => s.item === 'frog' || s.item === 'snail');
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
      toast(first ? `New find! ${ITEMS[s.item].name} ✿` : `Found a ${ITEMS[s.item].name}`);
      sfx.pickup();
      playFx('pickup', s.x, s.y);
      bump('collected');
      const ev = ITEMS[s.item].event;
      if (ev) bumpEvent(ev, 'gathered');
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
