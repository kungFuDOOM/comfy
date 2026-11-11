// The island: tile map, areas, stations, walkability. Rendering lives in src/render/.
import { hash } from './art/draw';

export const TS = 32;
export const MAP_W = 60;
export const MAP_H = 44;
export const T = { Water: 0, Sand: 1, Grass: 2, Path: 3, Hill: 4, Soil: 5, Lawn: 6, Plaza: 7 } as const;

const terrain = new Uint8Array(MAP_W * MAP_H);
const solid = new Uint8Array(MAP_W * MAP_H);
const reserved = new Uint8Array(MAP_W * MAP_H);
const idx = (x: number, y: number) => y * MAP_W + x;
const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;

export const terrainAt = (x: number, y: number) => (inMap(x, y) ? terrain[idx(x, y)] : T.Water);
export const isSolidTile = (x: number, y: number) => !inMap(x, y) || terrain[idx(x, y)] === T.Water || solid[idx(x, y)] === 1;

// ---- Areas ----
export const AREAS = {
  yard: { x0: 10, y0: 29, x1: 19, y1: 32 }, // decorating zone
  garden: { x0: 18, y0: 20, x1: 21, y1: 22 }, // small farming plot
  meadow: { x0: 6, y0: 8, x1: 22, y1: 16 },
  hill: { cx: 45, cy: 10, rx: 7.5, ry: 6 },
};
const inRect = (r: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
export const inYard = (x: number, y: number) => inRect(AREAS.yard, x, y);
export const isPlotTile = (x: number, y: number) => inRect(AREAS.garden, x, y);
export const inMeadow = (x: number, y: number) => inRect(AREAS.meadow, x, y) && terrainAt(x, y) === T.Grass;

export type StationId = 'cafe' | 'boutique' | 'market' | 'grove';
export interface Station { id: StationId; x: number; y: number; w: number; label: string; prompt: string }
export const stations: Station[] = [
  { id: 'cafe', x: 23, y: 13, w: 1, label: 'Puddle & Pip Café', prompt: 'Brew & shop the pantry' },
  { id: 'boutique', x: 36, y: 13, w: 1, label: 'Spot & Bow Boutique', prompt: 'Browse outfits & decor' },
  { id: 'market', x: 29, y: 14, w: 2, label: 'Tuppence Cart', prompt: 'Buy seeds, sell goods' },
  { id: 'grove', x: 45, y: 9, w: 1, label: 'Afterglow Grove', prompt: 'View the lantern grove' },
];
export const GROVE = { x: 45 * TS + TS / 2, y: 9 * TS + TS / 2 };

// ---- Objects ----
export interface Building { id: 'cafe' | 'boutique' | 'house'; x0: number; y0: number; x1: number; y1: number }
export const buildings: Building[] = [
  { id: 'cafe', x0: 20, y0: 8, x1: 26, y1: 12 },
  { id: 'boutique', x0: 33, y0: 8, x1: 39, y1: 12 },
  { id: 'house', x0: 9, y0: 23, x1: 13, y1: 26 },
];
export interface Prop { x: number; y: number; type: 'fence' | 'table' | 'mannequin' | 'fountain' | 'lamp' | 'sign' | 'rock'; text?: string; v?: number }
export const props: Prop[] = [];
export const trees: { x: number; y: number; v: number }[] = [];
export const flowers: { x: number; y: number; ox: number; oy: number; c: string; k: number }[] = [];
export const glows: { x: number; y: number; r: number; c: string }[] = [];

function fill(x0: number, y0: number, x1: number, y1: number, t: number, mark = true) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inMap(x, y) || terrain[idx(x, y)] === T.Water) continue;
    terrain[idx(x, y)] = t;
    if (mark) reserved[idx(x, y)] = 1;
  }
}
const block = (x: number, y: number) => { if (inMap(x, y)) { solid[idx(x, y)] = 1; reserved[idx(x, y)] = 1; } };
const rand = (() => { let s = 90210; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

export function buildWorld() {
  // island shape + shoreline
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const nx = (x + 0.5 - 30) / 29.5, ny = (y + 0.5 - 22) / 21.5;
    const r = Math.hypot(nx, ny) + Math.sin(x * 0.7) * 0.02 + Math.cos(y * 0.6) * 0.02 + Math.sin((x + y) * 0.3) * 0.02;
    terrain[idx(x, y)] = r < 0.85 ? T.Grass : r < 0.93 ? T.Sand : T.Water;
  }
  // hillside (lantern grove)
  const h = AREAS.hill;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (terrain[idx(x, y)] === T.Grass && ((x - h.cx) / h.rx) ** 2 + ((y - h.cy) / h.ry) ** 2 < 1) terrain[idx(x, y)] = T.Hill;
  }
  // paths
  fill(22, 16, 38, 17, T.Path);
  fill(22, 14, 24, 15, T.Path);
  fill(35, 14, 36, 15, T.Path);
  fill(29, 15, 30, 15, T.Path);
  fill(27, 18, 33, 22, T.Plaza);
  fill(12, 17, 21, 18, T.Path);
  fill(14, 19, 15, 28, T.Path);
  fill(39, 16, 44, 17, T.Path);
  fill(43, 10, 44, 15, T.Path);
  fill(44, 10, 45, 10, T.Path);
  fill(30, 23, 31, 38, T.Path);
  // garden + yard
  fill(18, 20, 21, 22, T.Soil);
  fill(10, 29, 19, 32, T.Lawn);
  for (let x = 9; x <= 20; x++) for (const y of [28, 33]) { fill(x, y, x, y, T.Lawn); }
  for (let y = 28; y <= 33; y++) for (const x of [9, 20]) { fill(x, y, x, y, T.Lawn); }
  // gardens fences (gate gaps at the west of the garden and top of the yard)
  const fence = (x0: number, y0: number, x1: number, y1: number, gaps: string[]) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      if (gaps.includes(`${x},${y}`)) continue;
      props.push({ type: 'fence', x, y }); block(x, y);
    }
  };
  fill(17, 19, 22, 23, T.Grass);
  fill(18, 20, 21, 22, T.Soil);
  fence(17, 19, 22, 23, ['17,21']);
  fence(9, 28, 20, 33, ['14,28', '15,28']);
  // buildings
  for (const b of buildings) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { block(x, y); }
  // stations + props
  for (const s of stations) for (let i = 0; i < s.w; i++) block(s.x + i, s.y);
  for (const p of [[21, 14], [26, 14]]) { props.push({ type: 'table', x: p[0], y: p[1] }); block(p[0], p[1]); }
  for (const p of [[34, 14], [38, 14]]) { props.push({ type: 'mannequin', x: p[0], y: p[1], v: p[0] === 34 ? 0 : 1 }); block(p[0], p[1]); }
  props.push({ type: 'fountain', x: 30, y: 20 }); block(30, 20);
  for (const p of [[26, 15], [33, 15], [27, 23], [33, 23], [43, 17], [16, 24]]) { props.push({ type: 'lamp', x: p[0], y: p[1] }); block(p[0], p[1]); }
  const signs: [number, number, string][] = [
    [13, 27, 'Your Yard'], [16, 20, 'Garden'], [42, 15, 'To the Grove'], [8, 13, 'Ribbon Meadow'],
    [29, 38, 'Dewdrop Shore'], [34, 24, 'Sugarlily Square'],
  ];
  for (const [x, y, text] of signs) { props.push({ type: 'sign', x, y, text }); reserved[idx(x, y)] = 1; }
  // glows (night lamps / windows)
  for (const p of props) if (p.type === 'lamp') glows.push({ x: p.x * TS + 16, y: p.y * TS - 6, r: 70, c: '255,220,170' });
  for (const b of buildings) {
    const X = b.x0 * TS, W = (b.x1 - b.x0 + 1) * TS, Y = b.y0 * TS + (b.id === 'house' ? 56 : 88);
    glows.push({ x: X + 46, y: Y + 20, r: 60, c: '255,226,160' }, { x: X + W - 46, y: Y + 20, r: 60, c: '255,226,160' });
  }
  // rocks on beaches, flowers, trees
  const dilate = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (reserved[idx(x, y)]) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, y + dy)) dilate[idx(x + dx, y + dy)] = 1;
  }
  const FLOWER_COLS = ['#ffffff', '#ffc2da', '#e6d4ff', '#fff3a8', '#ffb3cf'];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrain[idx(x, y)];
    if (t === T.Water) {
      continue;
    }
    if (t !== T.Grass && t !== T.Hill) continue;
    const meadow = inMeadow(x, y);
    if (!reserved[idx(x, y)] && hash(x, y) > (meadow ? 0.55 : 0.82)) {
      flowers.push({ x, y, ox: 6 + rand() * 20, oy: 8 + rand() * 18, c: FLOWER_COLS[(rand() * FLOWER_COLS.length) | 0], k: (rand() * 3) | 0 });
    }
    if (!dilate[idx(x, y)] && hash(x * 7 + 3, y * 13 + 1) > (t === T.Hill ? 0.88 : meadow ? 0.95 : 0.9) && Math.hypot(x - 30, y - 24) > 3) {
      trees.push({ x, y, v: (hash(x, y) * 1000) | 0 }); block(x, y);
    }
  }
}

export function isWalkable(x: number, y: number) { return !isSolidTile(x, y); }

