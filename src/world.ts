// The island: tile map, areas, stations, walkability. Rendering lives in src/render/.
import { AREA_LIST, BARRIERS, barrierById, type AreaId, type BarrierId } from './areas';
import { hash } from './art/draw';
import { isAreaOpen } from './state';
import { NODES, NODE_SPECS, VILLAGERS, type NodeDef } from './data';

export const TS = 32;
export const MAP_W = 96;
export const MAP_H = 80;
/** The original 60x44 island was re-seated inside this one: every old tile coordinate moved by this much. */
export const TOWN_OFFSET = { x: 18, y: 22 };
/** Bumped when the map layout changes in a way that moves saved positions. */
export const MAP_VERSION = 2;
export const T = { Water: 0, Sand: 1, Grass: 2, Path: 3, Hill: 4, Soil: 5, Lawn: 6, Plaza: 7, Bridge: 8 } as const;

const terrain = new Uint8Array(MAP_W * MAP_H);
const solid = new Uint8Array(MAP_W * MAP_H);
const reserved = new Uint8Array(MAP_W * MAP_H);
const region = new Uint8Array(MAP_W * MAP_H);
const idx = (x: number, y: number) => y * MAP_W + x;
const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;

export const terrainAt = (x: number, y: number) => (inMap(x, y) ? terrain[idx(x, y)] : T.Water);
export const isSolidTile = (x: number, y: number) => !inMap(x, y) || terrain[idx(x, y)] === T.Water || solid[idx(x, y)] === 1;

// ---- Regions ----
const AREA_ORDER: AreaId[] = ['town', 'blossom', 'pond', 'meadow', 'lighthouse', 'farbeach'];
/** Which area a tile belongs to. Walls of blossom trees run along every border; barriers sit in the gaps. */
function regionOf(x: number, y: number): number {
  if (y <= 21) { // north of the river
    if (x <= 27) return 1;
    if (x >= 73) return 3;
    return y <= 11 ? 4 : 2;
  }
  if (x <= 20) return 1;
  if (x >= 76) return y <= 56 ? 3 : 5;
  return 0;
}
export const areaAt = (x: number, y: number): AreaId => (inMap(x, y) ? AREA_ORDER[region[idx(x, y)]] : 'town');

// ---- Areas ----
export const AREAS = {
  yard: { x0: 28, y0: 51, x1: 37, y1: 54 }, // decorating zone
  garden: { x0: 36, y0: 42, x1: 39, y1: 44 }, // small farming plot
  meadow: { x0: 24, y0: 30, x1: 40, y1: 38 }, // Ribbon Meadow, the starter meadow next to town
  hill: { cx: 63, cy: 32, rx: 7.5, ry: 6 },
  /** The Hush Bell overlook: a small raised hill with the lighthouse on it. */
  cape: { cx: 50, cy: 7, rx: 10, ry: 3.8 },
  pond: { cx: 38, cy: 17, rx: 6, ry: 3.2 },
};
const inRect = (r: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
export const inYard = (x: number, y: number) => inRect(AREAS.yard, x, y);
export const isPlotTile = (x: number, y: number) => inRect(AREAS.garden, x, y);
/** Open meadow ground: Ribbon Meadow by town, or anywhere in Sprinkle Meadow. */
export const inMeadow = (x: number, y: number) => (inRect(AREAS.meadow, x, y) || (inMap(x, y) && region[idx(x, y)] === 3)) && terrainAt(x, y) === T.Grass;

export type StationId = 'cafe' | 'boutique' | 'market' | 'grove' | 'chest';
export interface Station { id: StationId; x: number; y: number; w: number; label: string; prompt: string }
export const stations: Station[] = [
  { id: 'cafe', x: 41, y: 35, w: 1, label: 'Puddle & Pip Café', prompt: 'Brew & shop the pantry' },
  { id: 'boutique', x: 54, y: 35, w: 1, label: 'Spot & Bow Boutique', prompt: 'Browse outfits & decor' },
  { id: 'market', x: 47, y: 36, w: 2, label: 'Tuppence Cart', prompt: 'Buy seeds, sell goods' },
  { id: 'grove', x: 63, y: 31, w: 1, label: 'Afterglow Grove', prompt: 'View the lantern grove' },
  { id: 'chest', x: 34, y: 49, w: 1, label: 'Softkeep Chest', prompt: 'Keep your things safe' },
];
const nodeIdx = (n: NodeDef) => idx(n.x, n.y);
/** Gathering nodes on a walkable tile (bushes, shrubs, patches) block it; shell beds are flat and fish spots sit in the water. */
export const nodeBlocks = (n: NodeDef) => n.kind !== 'shell' && n.kind !== 'fish';
export const GROVE = { x: 63 * TS + TS / 2, y: 31 * TS + TS / 2 };

// ---- Objects ----
export interface Building { id: 'cafe' | 'boutique' | 'house'; x0: number; y0: number; x1: number; y1: number }
export const buildings: Building[] = [
  { id: 'cafe', x0: 38, y0: 30, x1: 44, y1: 34 },
  { id: 'boutique', x0: 51, y0: 30, x1: 57, y1: 34 },
  { id: 'house', x0: 27, y0: 45, x1: 31, y1: 48 },
];
export interface Prop { x: number; y: number; type: 'fence' | 'table' | 'mannequin' | 'fountain' | 'lamp' | 'sign' | 'rock' | 'lighthouse' | 'picnic' | 'easel' | 'cakestand'; text?: string; v?: number }
export const props: Prop[] = [];
export const trees: { x: number; y: number; v: number }[] = [];
export const flowers: { x: number; y: number; ox: number; oy: number; c: string; k: number }[] = [];
export const glows: { x: number; y: number; r: number; c: string }[] = [];
/** Beach parasols (scenery, but the pole blocks its tile). v picks the canopy colors. Filled by buildWorld. */
export const PARASOLS: { x: number; y: number; v: number }[] = [];

function fill(x0: number, y0: number, x1: number, y1: number, t: number, mark = true) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inMap(x, y) || terrain[idx(x, y)] === T.Water) continue;
    terrain[idx(x, y)] = t;
    if (mark) reserved[idx(x, y)] = 1;
  }
}
const block = (x: number, y: number) => { if (inMap(x, y)) { solid[idx(x, y)] = 1; reserved[idx(x, y)] = 1; } };
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rand = rng(90210);

// ---- Barriers (locked until the player opens them) ----
const open = new Set<BarrierId>();
export const barrierOpen = (id: BarrierId) => open.has(id);
/** Open or close a barrier: its tiles stop (or start) blocking, and a mended bridge becomes walkable deck. */
export function setBarrierOpen(id: BarrierId, on: boolean) {
  const b = barrierById(id);
  if (on) open.add(id); else open.delete(id);
  for (const t of b.tiles) {
    solid[idx(t.x, t.y)] = on ? 0 : 1;
    if (b.kind === 'bridge') terrain[idx(t.x, t.y)] = on ? T.Bridge : T.Water;
  }
}
/** Is this tile one of a still-standing barrier's tiles? */
export const barrierAtTile = (x: number, y: number) => BARRIERS.find((b) => !open.has(b.id) && b.tiles.some((t) => t.x === x && t.y === y));

let built = false;
export function buildWorld() {
  if (built) return; // the menu / intro may build the island before the game starts
  built = true;
  // island shape: a soft, lumpy blob
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const nx = (x + 0.5 - 49) / 44, ny = (y + 0.5 - 41) / 37, th = Math.atan2(ny, nx);
    // lumps and bays, a cape to the north (the lighthouse) and a bulge to the south-east (the far beach)
    const wob = 1 + Math.sin(3 * th + 0.8) * 0.05 + Math.sin(5 * th + 2) * 0.035 + Math.sin(9 * th) * 0.018
      - 0.11 * Math.exp(-((th + Math.PI / 2) ** 2) / 0.3) - 0.1 * Math.exp(-((th - 0.75) ** 2) / 0.2);
    const r = Math.hypot(nx, ny) * wob + Math.sin(x * 0.7) * 0.02 + Math.cos(y * 0.6) * 0.02 + Math.sin((x + y) * 0.3) * 0.02;
    terrain[idx(x, y)] = r < 0.85 ? T.Grass : r < 0.93 ? T.Sand : T.Water;
    region[idx(x, y)] = regionOf(x, y);
  }
  smoothShore();
  computeShoreDist();
  widenBeaches();
  // the river between town and the pond country, the pond itself, and the hills
  for (let y = 22; y <= 23; y++) for (let x = 21; x <= 75; x++) terrain[idx(x, y)] = T.Water;
  const pd = AREAS.pond;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (region[idx(x, y)] === 2 && terrain[idx(x, y)] !== T.Water && ((x + 0.5 - pd.cx) / pd.rx) ** 2 + ((y + 0.5 - pd.cy) / pd.ry) ** 2 < 1) terrain[idx(x, y)] = T.Water;
  }
  const hills: [{ cx: number; cy: number; rx: number; ry: number }, number][] = [[AREAS.hill, 0], [AREAS.cape, 4]];
  for (const [h, reg] of hills) {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (terrain[idx(x, y)] === T.Grass && region[idx(x, y)] === reg && ((x - h.cx) / h.rx) ** 2 + ((y - h.cy) / h.ry) ** 2 < 1) terrain[idx(x, y)] = T.Hill;
    }
  }
  // roads: the town as before (shifted), plus a spur to each gate and on to each area's friend
  fill(40, 38, 56, 39, T.Path);
  fill(40, 36, 42, 37, T.Path);
  fill(53, 36, 54, 37, T.Path);
  fill(47, 37, 48, 37, T.Path);
  fill(45, 40, 51, 44, T.Plaza);
  fill(30, 39, 39, 40, T.Path);
  fill(32, 41, 33, 50, T.Path);
  fill(57, 38, 62, 39, T.Path);
  fill(61, 32, 62, 37, T.Path);
  fill(62, 32, 63, 32, T.Path);
  fill(48, 45, 49, 63, T.Path);
  // gate roads
  fill(8, 39, 29, 40, T.Path); // west: logs -> Blossom Grove
  fill(63, 38, 84, 39, T.Path); // east: Meadow Gate -> Sprinkle Meadow
  fill(50, 62, 84, 63, T.Path); // south-east: Seaside Gate -> Pearl Shore
  fill(47, 24, 48, 35, T.Path); // north: the bridge
  fill(47, 13, 48, 21, T.Path); // pond country
  fill(48, 12, 51, 13, T.Path); // up to the fog
  fill(49, 8, 50, 11, T.Path); // overlook
  // garden + yard
  fill(36, 42, 39, 44, T.Soil);
  fill(28, 51, 37, 54, T.Lawn);
  for (let x = 27; x <= 38; x++) for (const y of [50, 55]) fill(x, y, x, y, T.Lawn);
  for (let y = 50; y <= 55; y++) for (const x of [27, 38]) fill(x, y, x, y, T.Lawn);
  // garden fences (gate gaps at the west of the garden and top of the yard)
  const fence = (x0: number, y0: number, x1: number, y1: number, gaps: string[]) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      if (gaps.includes(`${x},${y}`)) continue;
      props.push({ type: 'fence', x, y }); block(x, y);
    }
  };
  fill(35, 41, 40, 45, T.Grass);
  fill(36, 42, 39, 44, T.Soil);
  fence(35, 41, 40, 45, ['35,43']);
  fence(27, 50, 38, 55, ['32,50', '33,50']);
  // buildings
  for (const b of buildings) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { block(x, y); }
  // stations + props
  for (const s of stations) for (let i = 0; i < s.w; i++) block(s.x + i, s.y);
  // station models are wider than their tile: café counter + chalkboard, boutique rail, grove plinth
  for (const [x, y] of [[40, 35], [42, 35], [43, 35], [53, 35], [55, 35], [62, 31], [64, 31]]) block(x, y);
  for (const p of [[39, 36], [44, 36]]) { props.push({ type: 'table', x: p[0], y: p[1] }); block(p[0], p[1]); }
  for (const p of [[52, 36], [56, 36]]) { props.push({ type: 'mannequin', x: p[0], y: p[1], v: p[0] === 52 ? 0 : 1 }); block(p[0], p[1]); }
  props.push({ type: 'fountain', x: 48, y: 42 });
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) block(48 + dx, 42 + dy); // basin is ~2.2 tiles wide
  for (const p of [[44, 37], [51, 37], [45, 45], [51, 45], [61, 39], [34, 46]]) { props.push({ type: 'lamp', x: p[0], y: p[1] }); block(p[0], p[1]); }
  const signs: [number, number, string][] = [
    [31, 49, 'Your Yard'], [34, 42, 'Garden'], [60, 37, 'To the Grove'], [26, 35, 'Ribbon Meadow'],
    [47, 60, 'Dewdrop Shore'], [52, 46, 'Sugarlily Square'],
  ];
  for (const a of AREA_LIST) {
    if (!a.barrier || !a.sign) continue;
    const b = barrierById(a.barrier);
    // the sign stands just on the town side of each gate (the fog sign is on the pond side)
    const spots: Record<string, [number, number]> = { logs: [22, 38], bridge: [46, 25], fog: [47, 13], meadowgate: [74, 37], beachgate: [74, 61] };
    const [sx, sy] = spots[b.id];
    signs.push([sx, sy, a.sign]);
  }
  for (const [x, y, text] of signs) { props.push({ type: 'sign', x, y, text }); block(x, y); }
  // barriers: everything starts locked
  for (const b of BARRIERS) for (const t of b.tiles) { solid[idx(t.x, t.y)] = 1; reserved[idx(t.x, t.y)] = 1; }
  // scenery for the new friends and the lighthouse
  props.push({ type: 'lighthouse', x: 50, y: 6 });
  for (let y = 5; y <= 7; y++) for (let x = 49; x <= 51; x++) block(x, y);
  const scenery: [Prop['type'], number, number, number][] = [
    ['picnic', 84, 36, 0], ['easel', 11, 38, 0], ['cakestand', 46, 14, 0],
  ];
  for (const [type, x, y, v] of scenery) { props.push({ type, x, y, v }); block(x, y); }
  // beach parasols: one on the south shore, one on each far beach
  addParasol(52, 2, 0);
  addParasol(66, 2, 1);
  addParasol(84, 5, 0);
  for (const p of PARASOLS) block(p.x, p.y);
  for (const v of VILLAGERS) reserved[idx(v.home.x, v.home.y)] = 1; // keep trees off every friend's front door
  placeNodes();
  // glows (night lamps / windows)
  for (const p of props) if (p.type === 'lamp') glows.push({ x: p.x * TS + 16, y: p.y * TS - 6, r: 70, c: '255,220,170' });
  for (const b of buildings) {
    const X = b.x0 * TS, W = (b.x1 - b.x0 + 1) * TS, Y = b.y0 * TS + (b.id === 'house' ? 56 : 88);
    glows.push({ x: X + 46, y: Y + 20, r: 60, c: '255,226,160' }, { x: X + W - 46, y: Y + 20, r: 60, c: '255,226,160' });
  }
  glows.push({ x: 50 * TS + 16, y: 4 * TS + 8, r: 130, c: '255,236,170' }); // the lighthouse lamp
  // walls of blossom trees along every border between areas (barriers sit in the gaps)
  const wall: { x: number; y: number }[] = [];
  const gateTile = new Set(BARRIERS.flatMap((b) => b.tiles.map((t) => idx(t.x, t.y))));
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrain[idx(x, y)];
    if (t === T.Water || gateTile.has(idx(x, y))) continue;
    const r = region[idx(x, y)];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const qx = x + dx, qy = y + dy;
      if (!inMap(qx, qy) || terrain[idx(qx, qy)] === T.Water) continue;
      if (region[idx(qx, qy)] < r) { wall.push({ x, y }); break; }
    }
  }
  // rocks on beaches, flowers, trees
  const dilate = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (reserved[idx(x, y)]) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, y + dy)) dilate[idx(x + dx, y + dy)] = 1;
  }
  const FLOWER_COLS = ['#ffffff', '#ffc2da', '#e6d4ff', '#fff3a8', '#ffb3cf'];
  const FLOWER_T = [0.82, 0.58, 0.8, 0.45, 0.8, 0.82]; // by region: how thickly flowers grow
  const TREE_T = [0.9, 0.62, 0.88, 0.97, 0.95, 1.1];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrain[idx(x, y)], rg = region[idx(x, y)];
    if (t !== T.Grass && t !== T.Hill) continue;
    const ribbon = inRect(AREAS.meadow, x, y);
    if (!reserved[idx(x, y)] && hash(x, y) > (ribbon ? 0.55 : FLOWER_T[rg])) {
      flowers.push({ x, y, ox: 6 + rand() * 20, oy: 8 + rand() * 18, c: FLOWER_COLS[(rand() * FLOWER_COLS.length) | 0], k: (rand() * 3) | 0 });
    }
    if (!dilate[idx(x, y)] && hash(x * 7 + 3, y * 13 + 1) > (t === T.Hill && rg === 0 ? 0.88 : ribbon ? 0.95 : TREE_T[rg]) && Math.hypot(x - 48, y - 46) > 3) {
      trees.push({ x, y, v: (hash(x, y) * 1000) | 0 }); block(x, y);
    }
  }
  for (const b of BARRIERS) if (isAreaOpen(b.area)) setBarrierOpen(b.id, true); // a save may already have opened some
  for (const w of wall) {
    if (solid[idx(w.x, w.y)]) continue;
    // beside a barrier the wall is a low pink picket fence instead of tall trees, so the barrier stays easy to see
    const near = BARRIERS.find((b) => b.tiles.some((t) => Math.abs(t.x - w.x) <= 3 && Math.abs(t.y - w.y) <= 3));
    if (near) props.push({ type: 'fence', x: w.x, y: w.y, v: near.axis === 'ew' ? 1 : 0 });
    else trees.push({ x: w.x, y: w.y, v: (hash(w.x, w.y) * 1000) | 0 });
    block(w.x, w.y);
  }
  computeShoreDist();
}

function addParasol(x: number, fromBottom: number, v: number) {
  // the last sand tile above the sea in this column, a couple of tiles in from the waterline
  for (let y = MAP_H - 1; y > 0; y--) {
    if (terrain[idx(x, y)] === T.Sand) { PARASOLS.push({ x, y: y - fromBottom, v }); return; }
  }
}

/** Put every NODE_SPECS entry on a valid tile of its area: shells on sand, bushes on grass, fish in water by a bank. */
/** Within a tile of another area (where the tree walls will go). */
function onBorder(x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, y + dy) && region[idx(x + dx, y + dy)] !== region[idx(x, y)]) return true;
  return false;
}

function placeNodes() {
  const r = rng(4242);
  const counters: Record<string, number> = {};
  const taken: { x: number; y: number }[] = [];
  const walkableBank = (x: number, y: number) => inMap(x, y) && terrain[idx(x, y)] !== T.Water && !solid[idx(x, y)] && !reserved[idx(x, y)];
  for (const sp of NODE_SPECS) {
    const ai = AREA_ORDER.indexOf(sp.area);
    const cand: { x: number; y: number }[] = [];
    const [x0, y0, x1, y1] = sp.rect ?? [0, 0, MAP_W - 1, MAP_H - 1];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inMap(x, y) || region[idx(x, y)] !== ai || reserved[idx(x, y)]) continue;
      if (onBorder(x, y)) continue;
      const t = terrain[idx(x, y)];
      if (sp.on === 'grass' && t !== T.Grass && !(t === T.Hill && ai === 4)) continue;
      if (sp.on === 'sand' && (t !== T.Sand || shore[idx(x, y)] < 2)) continue;
      if (sp.on === 'water') {
        if (t !== T.Water || (y >= 22 && y <= 23 && x >= 21 && x <= 75)) continue; // not the river itself
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => walkableBank(x + dx, y + dy) && region[idx(x + dx, y + dy)] === ai)) continue;
      } else {
        // keep a free ring so the player can always walk up to it
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !walkableBank(x + dx, y + dy))) continue;
        if (t === T.Path || t === T.Plaza) continue;
      }
      cand.push({ x, y });
    }
    let made = 0;
    for (let tries = 0; tries < 400 && made < sp.n && cand.length; tries++) {
      const c = cand[(r() * cand.length) | 0];
      const gap = sp.on === 'grass' ? 3 : 2;
      if (taken.some((o) => Math.abs(o.x - c.x) < gap && Math.abs(o.y - c.y) < gap)) continue;
      const key = `${sp.kind}${sp.tier}`;
      const i = counters[key] ?? 0;
      counters[key] = i + 1;
      const n: NodeDef = { id: `${key}_${i}`, kind: sp.kind, tier: sp.tier, x: c.x, y: c.y };
      NODES.push(n);
      taken.push(c);
      if (nodeBlocks(n)) block(n.x, n.y); else reserved[nodeIdx(n)] = 1;
      made++;
    }
  }
}

// ---- Shore ----
const shore = new Uint8Array(MAP_W * MAP_H);
/** Chebyshev distance (in tiles, capped at 9) from a land tile to the nearest water; 0 for water. 1 = waterline. */
export const shoreDist = (x: number, y: number) => (inMap(x, y) ? shore[idx(x, y)] : 0);
/** Tiles that already hold something (nodes, signs, stations, fences...), so scenery should stay off them. */
export const isReservedTile = (x: number, y: number) => !inMap(x, y) || reserved[idx(x, y)] === 1;

function computeShoreDist() {
  shore.fill(9);
  for (let i = 0; i < shore.length; i++) if (terrain[i] === T.Water) shore[i] = 0;
  for (let k = 1; k < 9; k++) for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (shore[idx(x, y)] !== 9) continue;
    near: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((inMap(x + dx, y + dy) ? shore[idx(x + dx, y + dy)] : 0) === k - 1) { shore[idx(x, y)] = k; break near; }
    }
  }
}

/** Long beaches: the far shore and the south shore get a deep band of sand instead of the usual three tiles. */
function widenBeaches() {
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, y);
    if (terrain[i] !== T.Grass) continue;
    const rg = region[i];
    const depth = rg === 5 ? 6 : rg === 0 && y >= 58 ? 5 : rg === 1 && x <= 12 ? 4 : 0;
    if (shore[i] <= depth) terrain[i] = T.Sand;
  }
}

/** Soften the noisy shoreline into a gentle beach: fill notches, drop lone sand spits, and keep at least three tiles of
 *  sand between the grass and the sea. */
function smoothShore() {
  const at = (x: number, y: number) => (inMap(x, y) ? terrain[idx(x, y)] : T.Water);
  const around = (x: number, y: number, f: (t: number) => boolean, ring = true) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && (ring || !dx || !dy) && f(at(x + dx, y + dy))) n++;
    }
    return n;
  };
  for (let pass = 0; pass < 2; pass++) {
    const next = terrain.slice();
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const i = idx(x, y), c = terrain[i];
      const land = around(x, y, (t) => t !== T.Water), land4 = around(x, y, (t) => t !== T.Water, false);
      const grass = around(x, y, (t) => t === T.Grass);
      if (c === T.Water && (land >= 5 || land4 >= 3)) next[i] = T.Sand;
      else if (c === T.Sand && (land <= 3 || land4 <= 1)) next[i] = T.Water;
      else if (c === T.Grass && grass <= 3) next[i] = T.Sand;
      else if (c === T.Sand && grass >= 6) next[i] = T.Grass;
    }
    terrain.set(next);
  }
  computeShoreDist();
  // three tiles of sand everywhere: a wet waterline, a damp band, then warm dry sand
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.Grass && shore[i] <= 3) terrain[i] = T.Sand;
}

export function isWalkable(x: number, y: number) { return !isSolidTile(x, y); }

/** Debug/test helper: the raw grids. Not used by the game. */
export const _debug = { terrain, solid, reserved, region, shore };
