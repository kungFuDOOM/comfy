// The soft shore: continuous fields baked once from the tile map so the beach reads as one smooth, rounded surface.
// - sdf:   signed distance (tiles) to a smoothed, gently wobbly waterline; + on land, - in the sea
// - inland: signed distance (tiles) to the sand/grass border; + on grass and the rest of the island
// - height: the ground height those two imply (dry sand 0, dipping to the waterline, sloping under the sea, grass 0.05)
// The sand mesh (terrain.ts), the walk height (heightAtUnits) and the sea's foam texture (water.ts) all read these.
import { MAP_H, MAP_W, T, terrainAt } from '../world';

/** Texels per tile. */
export const SHORE_RES = 4;
/** Water rest height (water.ts mesh y). */
export const SEA_Y = -0.25;
const GRASS_Y = 0.05, FLOOR_Y = -0.88;

export interface ShoreField { w: number; h: number; sdf: Float32Array; inland: Float32Array; height: Float32Array }
let field: ShoreField | null = null;

const h2 = (x: number, y: number, s: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
/** Smooth value noise in [0,1]. */
function vnoise(x: number, y: number, s: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Bilinear upsample of a per-tile 0/1 mask to texels, two box blurs, a soft noise wobble -> rounded binary mask. */
function smoothMask(isOn: (x: number, y: number) => boolean, seed: number, wobble: number): Uint8Array {
  const R = SHORE_RES, w = MAP_W * R, h = MAP_H * R;
  const tile = new Float32Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) tile[y * MAP_W + x] = isOn(x, y) ? 1 : 0;
  const at = (x: number, y: number) => tile[Math.min(MAP_H - 1, Math.max(0, y)) * MAP_W + Math.min(MAP_W - 1, Math.max(0, x))];
  const f = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = (i + 0.5) / R - 0.5, py = (j + 0.5) / R - 0.5, x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
    f[j * w + i] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  }
  const tmp = new Float32Array(w * h), r = 2;
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let s = 0; for (let k = -r; k <= r; k++) s += f[j * w + Math.min(w - 1, Math.max(0, i + k))];
      tmp[j * w + i] = s / (2 * r + 1);
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let s = 0; for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, j + k)) * w + i];
      f[j * w + i] = s / (2 * r + 1);
    }
  }
  const m = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = (i + 0.5) / R, py = (j + 0.5) / R;
    const n = (vnoise(px * 0.35, py * 0.35, seed) - 0.5) * 0.7 + (vnoise(px * 1.1, py * 1.1, seed + 9) - 0.5) * 0.3;
    m[j * w + i] = f[j * w + i] + n * wobble > 0.5 ? 1 : 0;
  }
  return m;
}

/** Two-pass chamfer distance (texels) from every texel to the nearest texel where mask === want. */
function distTo(mask: Uint8Array, want: number, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h), D = Math.SQRT2, INF = 1e6;
  for (let i = 0; i < d.length; i++) d[i] = mask[i] === want ? 0 : INF;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i; let v = d[k];
    if (i > 0) v = Math.min(v, d[k - 1] + 1);
    if (j > 0) { v = Math.min(v, d[k - w] + 1); if (i > 0) v = Math.min(v, d[k - w - 1] + D); if (i < w - 1) v = Math.min(v, d[k - w + 1] + D); }
    d[k] = v;
  }
  for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
    const k = j * w + i; let v = d[k];
    if (i < w - 1) v = Math.min(v, d[k + 1] + 1);
    if (j < h - 1) { v = Math.min(v, d[k + w] + 1); if (i < w - 1) v = Math.min(v, d[k + w + 1] + D); if (i > 0) v = Math.min(v, d[k + w - 1] + D); }
    d[k] = v;
  }
  return d;
}

/** Signed distance in tiles (+ where mask is 1), lightly blurred to hide chamfer kinks. */
function signed(mask: Uint8Array, w: number, h: number, cap: number): Float32Array {
  const toOff = distTo(mask, 0, w, h), toOn = distTo(mask, 1, w, h);
  const s = new Float32Array(w * h);
  for (let i = 0; i < s.length; i++) s[i] = Math.max(-cap, Math.min(cap, (mask[i] ? toOff[i] - 0.5 : -(toOn[i] - 0.5)) / SHORE_RES));
  const o = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let t = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) t += s[Math.min(h - 1, Math.max(0, j + dy)) * w + Math.min(w - 1, Math.max(0, i + dx))];
    o[j * w + i] = t / 9;
  }
  return o;
}

const smooth01 = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Sand height from the distance to the waterline: a soft dip to the sea, then a gentle underwater slope (no cliff). */
const sandY = (s: number) => (s >= 0 ? SEA_Y * Math.exp(-s * 1.8) : Math.max(FLOOR_Y, SEA_Y + s * 0.38));
/** 0 = sand, 1 = grass, from the signed distance to the sand/grass border. */
const grassWeight = (g: number) => smooth01(-0.45, 0.6, g);

export function shoreField(): ShoreField {
  if (field) return field;
  const w = MAP_W * SHORE_RES, h = MAP_H * SHORE_RES;
  const isLand = (x: number, y: number) => { const t = terrainAt(x, y); return t !== T.Water && t !== T.Bridge; };
  const isInland = (x: number, y: number) => { const t = terrainAt(x, y); return t !== T.Water && t !== T.Bridge && t !== T.Sand; };
  const sdf = signed(smoothMask(isLand, 3, 0.22), w, h, 6);
  const inland = signed(smoothMask(isInland, 17, 0.3), w, h, 6);
  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) {
    const gw = grassWeight(inland[i]);
    height[i] = sandY(sdf[i]) * (1 - gw) + GRASS_Y * gw;
  }
  return (field = { w, h, sdf, inland, height });
}

/** Bilinear sample of one field at a world position (tile units). */
export function sampleField(a: Float32Array, ux: number, uz: number): number {
  const f = shoreField(), px = ux * SHORE_RES - 0.5, py = uz * SHORE_RES - 0.5;
  const x0 = Math.max(0, Math.min(f.w - 2, Math.floor(px))), y0 = Math.max(0, Math.min(f.h - 2, Math.floor(py)));
  const fx = Math.max(0, Math.min(1, px - x0)), fy = Math.max(0, Math.min(1, py - y0)), k = y0 * f.w + x0;
  return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + f.w] * (1 - fx) + a[k + f.w + 1] * fx) * fy;
}
export const shoreHeight = (ux: number, uz: number) => sampleField(shoreField().height, ux, uz);

// ---- which tiles the smooth mesh owns (the rest stay instanced boxes) ----
let owned: Uint8Array | null = null;
/** Sand, grass within two tiles of sand (the soft border), and sea within ~2 tiles of the shore (the underwater slope). */
export function isSmoothTile(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  if (!owned) {
    owned = new Uint8Array(MAP_W * MAP_H);
    const f = shoreField();
    for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
      const t = terrainAt(tx, ty);
      let on = t === T.Sand;
      if (t === T.Grass) {
        near: for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (terrainAt(tx + dx, ty + dy) === T.Sand) { on = true; break near; }
      } else if (t === T.Water) {
        // any texel in the tile close enough to the shore
        let best = -99;
        for (let j = 0; j < SHORE_RES; j++) for (let i = 0; i < SHORE_RES; i++) best = Math.max(best, f.sdf[(ty * SHORE_RES + j) * f.w + tx * SHORE_RES + i]);
        on = best > -2.4;
      }
      owned[ty * MAP_W + tx] = on ? 1 : 0;
    }
  }
  return owned[y * MAP_W + x] === 1;
}
