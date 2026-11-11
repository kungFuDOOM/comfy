// The island: tile map, areas, stations, and world rendering. All art is code-drawn.
import { cheetahPattern } from './art/cheetah';
import { circle, ellipse, hash, rr, star } from './art/draw';
import type { Season } from './time';

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
interface Building { id: 'cafe' | 'boutique' | 'house'; x0: number; y0: number; x1: number; y1: number }
const buildings: Building[] = [
  { id: 'cafe', x0: 20, y0: 8, x1: 26, y1: 12 },
  { id: 'boutique', x0: 33, y0: 8, x1: 39, y1: 12 },
  { id: 'house', x0: 9, y0: 23, x1: 13, y1: 26 },
];
interface Prop { x: number; y: number; type: 'fence' | 'table' | 'mannequin' | 'fountain' | 'lamp' | 'sign' | 'rock'; text?: string; v?: number }
const props: Prop[] = [];
const trees: { x: number; y: number; v: number }[] = [];
const flowers: { x: number; y: number; ox: number; oy: number; c: string; k: number }[] = [];
const shore = new Uint8Array(MAP_W * MAP_H);
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
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terrainAt(x + dx, y + dy) !== T.Water) shore[idx(x, y)] = 1;
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

// ---------- Rendering ----------
const SAND = '#fbe9d2';
function tileColor(t: number, x: number, y: number, s: Season): string {
  const alt = hash(x, y) > 0.5;
  switch (t) {
    case T.Sand: return alt ? SAND : '#f8e2c8';
    case T.Grass: return alt ? s.grass : s.grassAlt;
    case T.Hill: return alt ? s.hill : s.grass;
    case T.Path: return alt ? '#f6ddc9' : '#f2d5c0';
    case T.Soil: return '#ecd5be';
    case T.Lawn: return (x + y) % 2 === 0 ? '#c8ecbb' : '#bde6ae';
    case T.Plaza: return (x + y) % 2 === 0 ? '#fbd5e2' : '#fde9ef';
    default: return '#bfe6f2';
  }
}

export interface View { x0: number; y0: number; x1: number; y1: number } // tile bounds, visible

export function drawGround(ctx: CanvasRenderingContext2D, v: View, s: Season, t: number) {
  for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
    const tt = terrainAt(x, y);
    const px = x * TS, py = y * TS;
    ctx.fillStyle = tileColor(tt, x, y, s);
    ctx.fillRect(px, py, TS + 0.5, TS + 0.5);
    if (tt === T.Water) {
      const w = (Math.sin(t * 1.4 + x * 0.9 + y * 0.6) + 1) / 2;
      if (hash(x + 11, y + 5) > 0.55) {
        ctx.strokeStyle = `rgba(255,255,255,${0.18 + w * 0.3})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        const ox = hash(x, y) * 12;
        ctx.beginPath(); ctx.moveTo(px + 6 + ox, py + 14 + w * 3); ctx.quadraticCurveTo(px + 14 + ox, py + 10 + w * 3, px + 22 + ox, py + 14 + w * 3); ctx.stroke();
      }
      if (inMap(x, y) && shore[idx(x, y)]) { ctx.fillStyle = `rgba(255,255,255,${0.25 + w * 0.15})`; ctx.fillRect(px, py, TS, TS); }
    } else if (tt === T.Sand) {
      if (hash(x + 2, y + 9) > 0.6) circle(ctx, px + hash(x, y) * 28 + 2, py + hash(y, x) * 28 + 2, 1.2, '#f0d3b0');
    } else if (tt === T.Grass || tt === T.Hill) {
      if (tt === T.Hill) { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(px, py, TS + 0.5, TS + 0.5); }
      if (hash(x + 5, y + 1) > 0.55) { // tufts
        ctx.strokeStyle = s.id === 'snowfluff' ? '#c9dce8' : 'rgba(110,180,110,0.35)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        const tx = px + 6 + hash(x, y + 3) * 20, ty = py + 10 + hash(x + 3, y) * 16;
        ctx.beginPath(); ctx.moveTo(tx - 2, ty); ctx.lineTo(tx - 3, ty - 4); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - 5); ctx.moveTo(tx + 2, ty); ctx.lineTo(tx + 3, ty - 4); ctx.stroke();
      }
    } else if (tt === T.Path) {
      if (hash(x + 8, y + 2) > 0.7) circle(ctx, px + hash(x, y) * 26 + 3, py + hash(y, x) * 26 + 3, 1.4, '#e8c6ae');
    } else if (tt === T.Plaza) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
    }
  }
  // stepping-stone circle around the lantern altar
  ctx.fillStyle = 'rgba(214,190,245,0.45)'; ctx.beginPath(); ctx.ellipse(GROVE.x, GROVE.y + 14, 74, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,245,0.7)';
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(GROVE.x + Math.cos(a) * 66, GROVE.y + 14 + Math.sin(a) * 34, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  // flowers
  for (const f of flowers) {
    if (f.x < v.x0 || f.x > v.x1 || f.y < v.y0 || f.y > v.y1) continue;
    const fx = f.x * TS + f.ox, fy = f.y * TS + f.oy, sway = Math.sin(t * 1.5 + f.x) * 0.8;
    ctx.strokeStyle = '#8fd09a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, fy + 4); ctx.lineTo(fx + sway, fy); ctx.stroke();
    if (s.id === 'snowfluff' && f.k === 0) { circle(ctx, fx + sway, fy, 2, '#fff'); continue; }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; circle(ctx, fx + sway + Math.cos(a) * 2, fy + Math.sin(a) * 2, 1.7, f.c); }
    circle(ctx, fx + sway, fy, 1.2, '#ffd36e');
  }
}

type Push = (y: number, fn: (ctx: CanvasRenderingContext2D) => void) => void;

export function collectWorldDrawables(push: Push, v: View, s: Season, t: number) {
  for (const tr of trees) {
    if (tr.x < v.x0 - 1 || tr.x > v.x1 + 1 || tr.y < v.y0 - 2 || tr.y > v.y1 + 1) continue;
    push(tr.y * TS + TS - 4, (c) => drawTree(c, tr.x, tr.y, tr.v, s, t));
  }
  for (const b of buildings) {
    if (b.x1 < v.x0 - 1 || b.x0 > v.x1 + 1 || b.y1 < v.y0 - 2 || b.y0 > v.y1 + 1) continue;
    push((b.y1 + 1) * TS - 2, (c) => drawBuilding(c, b, s));
  }
  for (const p of props) {
    if (p.x < v.x0 - 1 || p.x > v.x1 + 1 || p.y < v.y0 - 1 || p.y > v.y1 + 2) continue;
    push(p.y * TS + TS - 2, (c) => drawProp(c, p, t));
  }
  for (const st of stations) {
    if (st.x < v.x0 - 2 || st.x > v.x1 + 2 || st.y < v.y0 - 2 || st.y > v.y1 + 2) continue;
    push(st.y * TS + TS - 1, (c) => drawStation(c, st, t));
  }
}

function drawTree(c: CanvasRenderingContext2D, x: number, y: number, v: number, s: Season, t: number) {
  const cx = x * TS + TS / 2, by = y * TS + TS - 4;
  ellipse(c, cx, by, 13, 4, 'rgba(100,70,100,0.15)');
  rr(c, cx - 3.5, by - 18, 7, 18, 3); c.fillStyle = '#c99a7a'; c.fill();
  const sway = Math.sin(t * 1 + v) * 1.2;
  const col = v % 2 ? s.leaf : s.leafAlt;
  circle(c, cx - 10 + sway, by - 28, 12, col);
  circle(c, cx + 10 + sway, by - 28, 12, col);
  circle(c, cx + sway, by - 36, 14, col);
  circle(c, cx + sway, by - 26, 13, col);
  circle(c, cx - 5 + sway, by - 40, 4, 'rgba(255,255,255,0.35)');
  if (s.id === 'blossom') for (let i = 0; i < 4; i++) circle(c, cx + sway + ((v * (i + 3)) % 24) - 12, by - 22 - ((v * (i + 5)) % 22), 2, '#fff');
  if (s.id === 'snowfluff') ellipse(c, cx + sway, by - 47, 11, 4, 'rgba(255,255,255,0.9)');
}

function sign(c: CanvasRenderingContext2D, text: string, x: number, y: number, w = 0) {
  c.font = '700 11px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
  const tw = w || c.measureText(text).width + 14;
  rr(c, x - tw / 2, y, tw, 18, 7); c.fillStyle = '#fff7fb'; c.fill(); c.strokeStyle = '#ffb3cf'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = '#a8456f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y + 9.5);
}

function drawProp(c: CanvasRenderingContext2D, p: Prop, t: number) {
  const px = p.x * TS, py = p.y * TS, cx = px + TS / 2, by = py + TS;
  switch (p.type) {
    case 'fence':
      c.fillStyle = '#ffc3da'; c.fillRect(px, py + 15, TS, 4);
      c.fillStyle = '#fff';
      for (const k of [3, 11, 19, 27]) { rr(c, px + k - 2.5, py + 8, 5, 20, 2.5); c.fill(); c.strokeStyle = '#ffd0e2'; c.lineWidth = 1; c.stroke(); }
      break;
    case 'table':
      ellipse(c, cx, by - 4, 13, 4, 'rgba(100,70,100,0.15)');
      c.fillStyle = '#d9a5b3'; c.fillRect(cx - 2, by - 20, 4, 17);
      ellipse(c, cx, by - 21, 14, 6, '#fff'); ellipse(c, cx, by - 22, 12, 4.5, '#ffd0e2');
      circle(c, cx - 3, by - 24, 3, '#fff'); circle(c, cx - 3, by - 24, 1.4, '#8a5a44');
      break;
    case 'mannequin': {
      ellipse(c, cx, by - 3, 10, 3, 'rgba(100,70,100,0.15)');
      c.fillStyle = '#d9a5b3'; c.fillRect(cx - 1.5, by - 12, 3, 10);
      c.beginPath(); c.moveTo(cx - 8, by - 36); c.lineTo(cx + 8, by - 36); c.lineTo(cx + 12, by - 12); c.lineTo(cx - 12, by - 12); c.closePath();
      c.fillStyle = cheetahPattern(c, p.v ? 'pink' : 'classic', 0.4); c.fill(); c.strokeStyle = '#ff9ec0'; c.lineWidth = 1.2; c.stroke();
      circle(c, cx, by - 42, 5, '#fff3ea');
      break;
    }
    case 'fountain': {
      const cy = by - 18;
      ellipse(c, cx, cy + 6, 40, 20, 'rgba(100,70,100,0.12)');
      ellipse(c, cx, cy, 30, 15, '#ffe0ec'); ellipse(c, cx, cy, 26, 12, '#cfeefe');
      ellipse(c, cx, cy, 14, 5, '#e8f8ff');
      c.fillStyle = '#ffd0e2'; rr(c, cx - 5, cy - 22, 10, 22, 4); c.fill();
      star(c, cx, cy - 28, 7, '#ffd36e');
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.lineCap = 'round';
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx + d * 3, cy - 18); c.quadraticCurveTo(cx + d * 14, cy - 28 + Math.sin(t * 3) * 2, cx + d * 18, cy - 4); c.stroke(); }
      break;
    }
    case 'lamp':
      ellipse(c, cx, by - 2, 8, 3, 'rgba(100,70,100,0.15)');
      c.fillStyle = '#c99a7a'; c.fillRect(cx - 2, by - 34, 4, 33);
      circle(c, cx, by - 38, 7, '#fff3c4'); circle(c, cx, by - 38, 4.5, '#ffe38a');
      break;
    case 'sign':
      c.fillStyle = '#c99a7a'; c.fillRect(cx - 2, by - 22, 4, 20);
      sign(c, p.text ?? '', cx, by - 40);
      break;
    default: break;
  }
}

function drawStation(c: CanvasRenderingContext2D, st: Station, t: number) {
  const px = st.x * TS, by = st.y * TS + TS;
  switch (st.id) {
    case 'cafe': {
      // counter + striped awning
      rr(c, px - 14, by - 22, 60, 22, 6); c.fillStyle = '#e9b9a0'; c.fill(); c.strokeStyle = '#c98f7a'; c.lineWidth = 1.5; c.stroke();
      rr(c, px - 14, by - 30, 60, 10, 5); c.fillStyle = '#fff2e6'; c.fill();
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff9ec0'; c.beginPath(); c.arc(px - 9 + i * 10, by - 62, 6, 0, Math.PI); c.fill(); c.fillRect(px - 15 + i * 10, by - 72, 10, 10); }
      circle(c, px + 2, by - 36, 4.5, '#fff'); circle(c, px + 2, by - 36, 2.2, '#8a5a44');
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px + 2, by - 42); c.bezierCurveTo(px - 2, by - 48, px + 6, by - 52 + Math.sin(t * 2) * 2, px + 2, by - 58); c.stroke();
      sign(c, 'Café', px + 16, by - 96, 54);
      break;
    }
    case 'boutique': {
      rr(c, px - 4, by - 62, 40, 62, 8); c.fillStyle = '#ff9ec0'; c.fill(); c.strokeStyle = '#e57fa8'; c.lineWidth = 1.6; c.stroke();
      circle(c, px + 26, by - 30, 2.4, '#ffd36e');
      c.save(); rr(c, px - 10, by - 74, 52, 14, 5); c.clip();
      c.fillStyle = cheetahPattern(c, 'classic', 0.5); c.fillRect(px - 10, by - 74, 52, 14); c.restore();
      c.strokeStyle = '#ff9ec0'; c.lineWidth = 2; rr(c, px - 10, by - 74, 52, 14, 5); c.stroke();
      sign(c, 'Boutique', px + 16, by - 94, 70);
      break;
    }
    case 'market': {
      const w = st.w * TS;
      rr(c, px + 2, by - 24, w - 4, 24, 4); c.fillStyle = '#f7d5b8'; c.fill(); c.strokeStyle = '#d9a98a'; c.lineWidth = 1.5; c.stroke();
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#c3e8d6'; c.fillRect(px + i * (w / 8), by - 58, w / 8 + 0.5, 20); }
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#c3e8d6'; c.beginPath(); c.arc(px + i * (w / 8) + w / 16, by - 38, w / 16, 0, Math.PI); c.fill(); }
      circle(c, px + 14, by - 30, 5, '#ff8fb6'); circle(c, px + 26, by - 30, 5, '#ff8fb6'); circle(c, px + 40, by - 29, 5, '#fff');
      sign(c, 'Tuppence Cart', px + w / 2, by - 78);
      break;
    }
    case 'grove': {
      ellipse(c, px + 16, by - 2, 18, 6, 'rgba(100,70,100,0.15)');
      rr(c, px + 4, by - 16, 24, 16, 5); c.fillStyle = '#e8dcf5'; c.fill(); c.strokeStyle = '#c9a8e8'; c.lineWidth = 1.4; c.stroke();
      rr(c, px + 9, by - 32, 14, 17, 4); c.fillStyle = '#f3ecff'; c.fill(); c.stroke();
      circle(c, px + 16, by - 40, 7 + Math.sin(t * 2) * 0.6, '#fff3a8');
      circle(c, px + 16, by - 40, 4, '#ffe38a');
      sign(c, 'Afterglow Grove', px + 16, by - 66);
      break;
    }
  }
}

const BUILD_STYLE = {
  cafe: { wall: '#fff4e6', roof: '#e8a8a8', roof2: '#f2c2c2', name: 'Puddle & Pip Café' },
  boutique: { wall: '#ffe6f0', roof: '#ff9ec0', roof2: '#ffb8d3', name: 'Spot & Bow' },
  house: { wall: '#fff0e6', roof: '#c9a8e8', roof2: '#dac3f2', name: 'Home Sweet Nook' },
};

function drawBuilding(c: CanvasRenderingContext2D, b: Building, s: Season) {
  const st = BUILD_STYLE[b.id];
  const X = b.x0 * TS, Y = b.y0 * TS, W = (b.x1 - b.x0 + 1) * TS, H = (b.y1 - b.y0 + 1) * TS;
  ellipse(c, X + W / 2, Y + H - 2, W / 2 + 8, 8, 'rgba(100,70,100,0.15)');
  const roofH = b.id === 'house' ? 62 : 56;
  rr(c, X + 4, Y + roofH - 14, W - 8, H - roofH + 14, 10); c.fillStyle = st.wall; c.fill(); c.strokeStyle = 'rgba(200,140,160,0.5)'; c.lineWidth = 1.6; c.stroke();
  // roof
  c.beginPath(); c.moveTo(X - 8, Y + roofH); c.lineTo(X + 26, Y + 6); c.lineTo(X + W - 26, Y + 6); c.lineTo(X + W + 8, Y + roofH); c.closePath();
  c.fillStyle = st.roof; c.fill();
  c.strokeStyle = st.roof2; c.lineWidth = 3;
  for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(X + i * (W / 5) , Y + 8); c.lineTo(X + i * (W / 5) + (i - 2.5) * 8, Y + roofH); c.stroke(); }
  if (s.id === 'snowfluff') { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(X + 8, Y + roofH - 22); c.lineTo(X + 30, Y + 6); c.lineTo(X + W - 30, Y + 6); c.lineTo(X + W - 8, Y + roofH - 22); c.quadraticCurveTo(X + W / 2, Y + roofH - 14, X + 8, Y + roofH - 22); c.fill(); }
  for (let x = X - 4; x < X + W + 8; x += 18) { c.fillStyle = st.roof; c.beginPath(); c.arc(x + 2, Y + roofH, 9, 0, Math.PI); c.fill(); }
  if (b.id === 'boutique') { // cheetah trim band under the roof
    c.save(); c.beginPath(); c.rect(X - 6, Y + roofH + 8, W + 12, 12); c.clip();
    c.fillStyle = cheetahPattern(c, 'classic', 0.5); c.fillRect(X - 6, Y + roofH + 8, W + 12, 12); c.restore();
  }
  if (b.id === 'house') { // chimney + door
    rr(c, X + W - 40, Y - 8, 16, 30, 3); c.fillStyle = '#ffc3da'; c.fill();
    rr(c, X + W / 2 - 13, Y + H - 44, 26, 44, 8); c.fillStyle = '#ff9ec0'; c.fill(); circle(c, X + W / 2 + 7, Y + H - 22, 2, '#ffd36e');
  }
  // windows
  const wy = Y + (b.id === 'house' ? roofH + 8 : roofH + 28);
  const wh = b.id === 'house' ? 30 : 36;
  for (const wx of [X + 22, X + W - 66]) {
    rr(c, wx, wy, 44, wh, 10); c.fillStyle = '#d6f1ff'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(wx + 22, wy + 2); c.lineTo(wx + 22, wy + wh - 2); c.stroke();
    ellipse(c, wx + 12, wy + 9, 6, 3, 'rgba(255,255,255,0.7)');
  }
  if (b.id !== 'house') sign(c, st.name, X + W / 2, Y + 22, 0);
  else sign(c, st.name, X + W / 2, Y + 20, 0);
  if (b.id === 'cafe') { // roof cups
    circle(c, X + 40, Y + 30, 0.01, '#fff');
  }
}

// ---- Seasonal drifting particles (petals / leaves / snow / sparkles) ----
export interface Particle { x: number; y: number; vx: number; vy: number; r: number; p: number }
export function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), vx: 8 + Math.random() * 14, vy: 10 + Math.random() * 16, r: 1.6 + Math.random() * 2.2, p: Math.random() * 6 }));
}
export function drawParticles(ctx: CanvasRenderingContext2D, parts: Particle[], s: Season, cam: { x: number; y: number; w: number; h: number }, t: number, dt: number) {
  for (const p of parts) {
    p.x += (p.vx * dt) / cam.w; p.y += (p.vy * dt) / cam.h;
    if (p.x > 1) p.x -= 1;
    if (p.y > 1) p.y -= 1;
    const x = cam.x + p.x * cam.w + Math.sin(t + p.p) * 10, y = cam.y + p.y * cam.h;
    if (s.id === 'snowfluff') circle(ctx, x, y, p.r * 0.8, 'rgba(255,255,255,0.85)');
    else if (s.id === 'sunsip') { const a = 0.4 + Math.sin(t * 2 + p.p) * 0.3; circle(ctx, x, y, p.r * 0.7, `rgba(255,243,168,${a})`); }
    else {
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8 + p.p);
      ctx.fillStyle = s.petal; ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.5, p.r * 0.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}
