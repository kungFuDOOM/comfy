// 3D clothes: a shape library plus procedural fabrics. Each wardrobe item becomes a small cached model
// (merged geometry, a couple of draw calls) built the first time it is worn or tried on.
// Coordinates: hats and face pieces are in head space, body pieces in hip-relative torso space (front = +z),
// shoes in leg space, hand-held bags around the hand, back/hip bags in torso space.
import * as THREE from 'three';
import { patternTile } from '../art/patterns';
import { bodyR, BOTTOM_SHAPES, DRESS_SHAPES, TOP_SHAPES, type SleeveLen } from '../clothes/shapes';
import type { ClothDef, Look, PatternId } from '../clothes/types';
import { cheetahToon, makeToon, PALETTE } from './materials';
import { Batch, G, type Xf } from './util';

const DEG = Math.PI / 180;
const HA = 0.46, HB = 0.39, HC = 0.41; // head ellipsoid radii (same as actors.ts)
/** A point on the head surface. yaw 0 = straight ahead, pitch up; `out` pushes along the radius. */
const on = (yaw: number, pitch: number, out = 1): [number, number, number] => {
  const y = yaw * DEG, p = pitch * DEG;
  return [HA * Math.sin(y) * Math.cos(p) * out, HB * Math.sin(p) * out, HC * Math.cos(y) * Math.cos(p) * out];
};
const GOLD = PALETTE.gold;

// ---------- fabrics ----------
const fabrics = new Map<string, THREE.MeshToonMaterial>();
const texs = new Map<string, THREE.CanvasTexture>();
/** Shared toon material for a colour, optionally printed. Cheetah prints reuse the original spotted textures. */
export function fabric(color: string, pattern?: PatternId, ink?: string, double = false): THREE.MeshToonMaterial {
  if (pattern === 'cheetah' || pattern === 'cheetahpink') return cheetahToon(pattern === 'cheetah' ? 'classic' : 'pink');
  const key = `${color}|${pattern ?? ''}|${ink ?? ''}|${double ? 2 : 1}`;
  let m = fabrics.get(key);
  if (m) return m;
  m = makeToon(pattern ? '#ffffff' : color);
  if (pattern) {
    const tk = `${pattern}|${color}|${ink ?? ''}`;
    let t = texs.get(tk);
    if (!t) {
      t = new THREE.CanvasTexture(patternTile(pattern, color, ink));
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      texs.set(tk, t);
    }
    m.map = t;
  }
  if (double) m.side = THREE.DoubleSide;
  fabrics.set(key, m);
  return m;
}
/** The main fabric of an item. */
export const fabricOf = (c: ClothDef, double = false) => fabric(c.color, c.pattern, c.ink, double);

// ---------- piece builder: a vertex-coloured batch + a printed batch ----------
class Piece {
  solid = new Batch();
  pat = new Batch();
  trimPat = new Batch();
  /** Ready-made sub-models (e.g. a small bow) added next to the merged parts. */
  extras: THREE.Object3D[] = [];
  /** Wants a cape mesh behind the shoulders. */
  cape = false;
  constructor(readonly c: ClothDef, readonly uv = 3) {}
  /** Main-fabric part (printed if the item has a pattern). */
  f(geo: THREE.BufferGeometry, xf: Xf = {}) {
    if (this.c.pattern) this.pat.add(geo, '#ffffff', { uv: [this.uv, this.uv], ...xf });
    else this.solid.add(geo, this.c.color, xf);
    return this;
  }
  /** Accent part in the trim colour (or any colour). */
  t(geo: THREE.BufferGeometry, xf: Xf = {}, color = this.c.trim) { this.solid.add(geo, color, xf); return this; }
  /** Accent part wearing the trim's own print, if it has one. */
  tp(geo: THREE.BufferGeometry, xf: Xf = {}) {
    if (this.c.trimPattern) this.trimPat.add(geo, '#ffffff', { uv: [2, 1], ...xf });
    else this.solid.add(geo, this.c.trim, xf);
    return this;
  }
  group(): THREE.Group {
    const g = new THREE.Group();
    if (!this.solid.empty) g.add(this.solid.build());
    if (!this.pat.empty) g.add(this.pat.build(fabricOf(this.c)));
    if (!this.trimPat.empty) g.add(this.trimPat.build(fabric(this.c.trim, this.c.trimPattern)));
    for (const e of this.extras) g.add(e);
    return g;
  }
}

// ---------- little shared geometries ----------
function shapeGeo(draw: (s: THREE.Shape) => void, size: number) {
  const s = new THREE.Shape();
  draw(s);
  const g = new THREE.ShapeGeometry(s);
  g.scale(size, size, size);
  return g;
}
const heartGeo = (r: number) => shapeGeo((s) => {
  s.moveTo(0, -0.9); s.bezierCurveTo(-1.5, 0.2, -0.7, 1.1, 0, 0.4); s.bezierCurveTo(0.7, 1.1, 1.5, 0.2, 0, -0.9);
}, r);
const starGeo = (r: number) => shapeGeo((s) => {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.45 : 1;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
}, r);
const ring = (r: number, h: number, rb = r, seg = 20) => new THREE.CylinderGeometry(r, rb, h, seg, 1, true);

// ---------- hats (head space) ----------
type HatFn = (p: Piece, c: ClothDef, d: (k: string) => boolean) => void;
const bowParts = (p: Piece, k = 1, tails = false) => {
  for (const sx of [-1, 1]) {
    p.f(G.ball(0.12, 10), { x: sx * 0.11 * k, s: [1.05 * k, 0.8 * k, 0.5 * k], rz: sx * 0.25, uv: [0.6, 0.4] });
    if (tails) p.f(G.capsule(0.022 * k, 0.16 * k), { x: sx * 0.07 * k, y: -0.14 * k, rz: sx * 0.35 });
  }
  p.t(G.ball(0.055, 8), { s: k });
};
const HATS: Record<string, HatFn> = {
  bow(p, _c, d) { bowParts(p, 1.25, d('tails')); },
  beret(p, _c, d) {
    if (d('flat')) { p.f(G.cyl(0.24, 0.26, 0.14, 20), { y: 0 }); p.t(G.torus(0.25, 0.012, 20), { y: 0.07, rx: Math.PI / 2 }); if (d('ribbon')) p.t(G.ball(0.04, 8), { x: 0.2, y: 0.06, z: 0.12 }); return; }
    p.f(G.ball(0.3, 16), { s: [1, 0.42, 1] }); p.t(G.cyl(0.2, 0.22, 0.05), { y: -0.07 }); p.t(G.ball(0.035, 8), { y: 0.14 });
  },
  sunhat(p, c, d) {
    p.f(G.cyl(0.56, 0.6, 0.035, 24)); p.f(G.ball(0.3, 16), { y: 0.02, s: [1, 0.7, 1] });
    p.tp(ring(0.295, 0.09, 0.31), { y: 0.055 });
    if (d('ribbon')) for (const sx of [-1, 1]) p.t(G.capsule(0.022, 0.2), { x: sx * 0.3, y: -0.05, z: 0.3, rz: sx * 0.25 });
    void c;
  },
  cowboy(p, _c, d) {
    p.f(G.cyl(0.55, 0.55, 0.025, 24), { s: [1, 1, 0.9] });
    for (const sx of [-1, 1]) p.f(G.ball(0.16, 10), { x: sx * 0.5, y: 0.05, s: [1, 0.3, 1.4], rz: sx * 0.35 });
    p.f(G.cyl(0.2, 0.27, 0.26, 20), { y: 0.14 }); p.f(G.ball(0.17, 10), { y: 0.3, s: [1, 0.4, 1] });
    p.t(ring(0.275, 0.07, 0.28), { y: 0.05 });
    if (d('star')) p.t(starGeo(0.07), { x: 0, y: 0.06, z: 0.285 }, GOLD);
  },
  witch(p, _c, d) {
    p.f(G.cyl(0.5, 0.5, 0.03, 24)); p.f(G.cone(0.27, 0.45, 18), { y: 0.25 }); p.f(G.cone(0.15, 0.34, 14), { x: 0.07, y: 0.58, rz: -0.4 });
    p.t(ring(0.275, 0.08, 0.285), { y: 0.06 });
    if (d('buckle')) p.t(G.box(0.07, 0.07, 0.02), { y: 0.06, z: 0.285 }, GOLD);
  },
  party(p, c, d) {
    p.f(G.cone(0.25, 0.54, 20), { y: 0.27 });
    p.t(G.torus(0.245, 0.022, 20), { rx: Math.PI / 2 });
    if (d('star')) p.t(starGeo(0.15), { y: 0.62, z: 0.01 }, GOLD);
    else if (d('rainbowpom')) { p.t(G.ball(0.055, 8), { x: -0.05, y: 0.56 }, '#ff9ec0'); p.t(G.ball(0.055, 8), { x: 0.05, y: 0.56 }, '#9bd4ff'); p.t(G.ball(0.055, 8), { y: 0.62 }, '#ffe27a'); }
    else p.t(G.ball(0.075, 10), { y: 0.56 });
    if (d('bell')) { p.t(G.ball(0.045, 8), { x: 0.09, y: 0.5, z: 0.02 }, GOLD); p.t(G.cyl(0.006, 0.006, 0.06, 4), { x: 0.07, y: 0.54 }, GOLD); }
    if (d('pearls')) for (let i = 0; i < 7; i++) { const a = i * 0.9; p.t(G.ball(0.028, 8), { x: Math.cos(a) * 0.245, y: 0.02, z: Math.sin(a) * 0.245 }, '#fffafd'); }
    if (d('sparkle')) for (const [x, y, z, s] of [[-0.2, 0.42, 0.18, 0.05], [0.22, 0.3, 0.14, 0.04], [0.12, 0.7, 0.05, 0.045], [-0.06, 0.22, 0.26, 0.035]]) p.t(starGeo(s), { x, y, z }, '#fff3a8');
    void c;
  },
  catears(p, _c, d) {
    p.t(G.torus(0.46, 0.025, 28, Math.PI), { s: [1, 0.9, 1] });
    for (const sx of [-1, 1]) { p.f(G.cone(0.12, 0.24, 4), { x: sx * 0.24, y: 0.4, rz: -sx * 0.25, s: [1, 1, 0.5] }); p.t(G.cone(0.07, 0.15, 4), { x: sx * 0.24, y: 0.38, z: 0.03, rz: -sx * 0.25, s: [1, 1, 0.4] }); }
    void d;
  },
  bunnyears(p, _c, d) {
    p.t(G.torus(0.46, 0.025, 28, Math.PI), { s: [1, 0.9, 1] });
    const lop = d('lop');
    for (const sx of [-1, 1]) {
      p.f(G.capsule(0.07, 0.3), { x: sx * (lop ? 0.38 : 0.16), y: lop ? 0.4 : 0.64, z: -0.02, rz: sx * (lop ? 1.15 : 0.12), s: [1, 1, 0.55] });
      p.t(G.capsule(0.04, 0.22), { x: sx * (lop ? 0.38 : 0.16), y: lop ? 0.4 : 0.64, z: 0.02, rz: sx * (lop ? 1.15 : 0.12), s: [1, 1, 0.45] });
    }
  },
  flowercrown(p, c, d) {
    const cols = [c.trim, '#ffffff', c.trim, '#ffe27a'];
    p.f(G.torus(0.37, 0.022, 28), { y: 0.0, rx: Math.PI / 2, s: [1.04, 0.95, 1] });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, x = Math.cos(a) * 0.385, z = Math.sin(a) * 0.345;
      p.t(G.ball(0.062, 8), { x, y: 0.02, z, s: [1, 0.7, 1] }, cols[i % cols.length]);
      p.t(G.ball(0.026, 6), { x, y: 0.045, z }, i % 2 ? '#ffd86e' : '#ffffff');
      p.f(G.ball(0.04, 6), { x: Math.cos(a + 0.28) * 0.385, y: -0.005, z: Math.sin(a + 0.28) * 0.345, s: [1.3, 0.5, 0.8] });
    }
    if (d('sparkle')) p.t(starGeo(0.05), { x: 0.2, y: 0.12, z: 0.3 }, '#fff3a8');
  },
  beanie(p, c, d) {
    p.f(G.ball(0.5, 18), { y: 0.05, s: [1, 0.92, 1.0], uv: [4, 3] });
    p.t(G.torus(0.4, 0.07, 22), { y: -0.02, rx: Math.PI / 2, s: [1.1, 1.0, 1.1] });
    if (!d('ghost')) p.t(G.ball(0.1, 10), { y: 0.56 });
    else for (const sx of [-1, 1]) p.t(G.ball(0.03, 6), { x: sx * 0.09, y: 0.2, z: 0.46 }, '#4f2b40');
    void c;
  },
  acorn(p) {
    // a scaly acorn cap with a little stem, worn like a snug beret
    p.f(G.ball(0.46, 18), { y: 0.05, s: [1, 0.78, 1.0], uv: [3, 2] });
    p.t(G.torus(0.4, 0.05, 22), { y: -0.01, rx: Math.PI / 2, s: [1.12, 1.0, 1.12] });
    p.t(G.cyl(0.028, 0.04, 0.14, 8), { y: 0.44, rz: 0.2 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.t(G.ball(0.032, 6), { x: Math.cos(a) * 0.3, y: 0.2, z: Math.sin(a) * 0.3 }); }
  },
  bucket(p, _c, d) {
    p.f(G.cyl(0.3, 0.38, 0.22, 20), { y: 0.3 }); p.f(G.cyl(0.37, 0.56, 0.06, 24), { y: 0.17, s: [1, 1, 1.0] });
    if (d('long')) p.f(G.ball(0.3, 10), { y: 0.1, z: -0.4, s: [1.3, 0.2, 0.9] });
    p.t(G.torus(0.34, 0.02, 20), { y: 0.25, rx: Math.PI / 2 });
  },
  cap(p, _c, d) {
    const flat = d('flat');
    p.f(G.ball(0.44, 16), { y: 0.07, s: [1, flat ? 0.62 : 0.78, 1.04] });
    p.t(G.ball(0.2, 10), { y: 0.15, z: 0.42, s: [1.1, 0.16, 1.0], rx: 0.2 });
    if (!flat) p.t(G.ball(0.035, 8), { y: 0.42 }); else p.t(G.ball(0.03, 8), { y: 0.3 });
  },
  tiara(p, _c, d) {
    p.t(G.torus(0.43, 0.02, 28, Math.PI * 0.62), { y: 0.0, z: 0.05, rz: Math.PI * 0.19, rx: -0.2, s: [1, 0.95, 1] }, '#fff3b0');
    for (const [a, h] of [[70, 0.07], [90, 0.12], [110, 0.07]] as const) {
      const x = Math.cos(a * DEG) * 0.43, y = Math.sin(a * DEG) * 0.4;
      p.f(G.cone(0.025, h, 5), { x, y: y + h * 0.4, z: 0.06 });
    }
    if (d('moon')) { p.t(G.ball(0.05, 10), { y: 0.46, z: 0.1 }, '#d6c8f0'); p.t(G.ball(0.042, 10), { x: 0.02, y: 0.47, z: 0.125 }, '#ffffff'); }
    else if (d('pearls')) for (const x of [-0.12, 0, 0.12]) p.t(G.ball(0.035, 8), { x, y: 0.44 - Math.abs(x) * 0.5, z: 0.11 }, '#fffafd');
    else p.t(G.ball(0.04, 8), { y: 0.45, z: 0.11 });
  },
  headband(p, _c, d) {
    p.f(G.torus(0.46, 0.032, 28, Math.PI), { s: [1, 0.9, 1], z: -0.02 });
    if (d('bow')) { const g = new Piece(p.c); bowParts(g, 0.75); const m = g.group(); m.position.set(0.26, 0.34, 0.12); m.rotation.z = -0.5; p.extras.push(m); }
    if (d('cloud')) for (const [x, y, s] of [[-0.06, 0.45, 0.1], [0.05, 0.46, 0.12], [0.16, 0.43, 0.09]] as const) p.t(G.ball(s, 10), { x, y, z: 0 }, '#ffffff');
    if (d('stars')) for (const sx of [-1, 1]) { p.t(G.cyl(0.008, 0.008, 0.2, 4), { x: sx * 0.12, y: 0.52 }, GOLD); p.t(starGeo(0.075), { x: sx * 0.12, y: 0.64, z: 0.01 }, '#ffe27a'); }
  },
  earmuffs(p) {
    p.t(G.torus(0.46, 0.022, 28, Math.PI), { s: [1, 0.9, 1] }, '#ffffff');
    for (const sx of [-1, 1]) p.f(G.ball(0.14, 12), { x: sx * 0.47, y: 0.06, s: [0.7, 1, 1] });
  },
  froghood(p) {
    p.f(G.ball(0.52, 18), { y: 0.05, s: [1, 0.94, 1.0] });
    for (const sx of [-1, 1]) { p.t(G.ball(0.1, 10), { x: sx * 0.2, y: 0.45, z: 0.1 }, '#ffffff'); p.t(G.ball(0.05, 8), { x: sx * 0.2, y: 0.46, z: 0.18 }, '#4f2b40'); }
  },
  bearhood(p) {
    p.f(G.ball(0.52, 18), { y: 0.05, s: [1, 0.94, 1.0] });
    for (const sx of [-1, 1]) { p.f(G.ball(0.14, 10), { x: sx * 0.34, y: 0.5, z: -0.04, s: [1, 1, 0.6] }); p.t(G.ball(0.08, 8), { x: sx * 0.34, y: 0.5, z: 0.01, s: [1, 1, 0.5] }); }
  },
  bandana(p) {
    p.f(ring(0.47, 0.13, 0.43, 22), { y: 0.2 }); p.f(G.cone(0.2, 0.2, 3), { y: 0.33, z: 0.2, rx: 0.9, ry: 0.0 });
    p.f(G.cone(0.07, 0.22, 4), { x: -0.08, y: 0.16, z: -0.44, rx: -2.6 }); p.f(G.cone(0.07, 0.22, 4), { x: 0.08, y: 0.14, z: -0.44, rx: -2.9 });
    p.t(G.ball(0.045, 8), { y: 0.2, z: -0.43 });
  },
  santa(p) {
    p.f(G.cone(0.32, 0.55, 18), { y: 0.3 }); p.f(G.cone(0.14, 0.3, 12), { x: 0.2, y: 0.62, rz: -0.8 });
    p.t(G.torus(0.33, 0.07, 22), { y: 0.06, rx: Math.PI / 2 }); p.t(G.ball(0.08, 10), { x: 0.36, y: 0.66 });
  },
  sailor(p) {
    p.f(G.cyl(0.36, 0.4, 0.16, 22), { y: 0.3 }); p.f(G.cyl(0.43, 0.43, 0.035, 22), { y: 0.4 });
    p.t(ring(0.405, 0.06, 0.41), { y: 0.25 });
    for (const sx of [-1, 1]) p.t(G.capsule(0.018, 0.14), { x: sx * 0.07, y: 0.18, z: -0.4, rz: sx * 0.3 });
    p.t(G.ball(0.04, 8), { y: 0.3, z: 0.41 }, GOLD);
  },
  tophat(p) {
    p.f(G.cyl(0.17, 0.19, 0.3, 18), { x: 0.14, y: 0.5, rz: -0.28 }); p.f(G.cyl(0.28, 0.28, 0.03, 20), { x: 0.14, y: 0.36, rz: -0.28 });
    p.t(G.cyl(0.195, 0.195, 0.06, 18), { x: 0.14, y: 0.4, rz: -0.28 });
  },
  antennae(p, _c, d) {
    p.t(G.torus(0.46, 0.02, 28, Math.PI), { s: [1, 0.9, 1] });
    for (const sx of [-1, 1]) {
      p.f(G.capsule(0.013, 0.26), { x: sx * 0.14, y: 0.55, z: 0.05, rz: -sx * 0.3 });
      if (d('hearts')) p.f(heartGeo(0.07), { x: sx * 0.2, y: 0.74, z: 0.07 }); else p.f(G.ball(0.055, 8), { x: sx * 0.21, y: 0.72, z: 0.05 });
    }
  },
  batbow(p) {
    for (const sx of [-1, 1]) {
      p.f(G.ball(0.12, 10), { x: sx * 0.15, y: 0.02, s: [1.4, 0.75, 0.35], rz: sx * 0.35 });
      for (let i = 0; i < 3; i++) p.f(G.ball(0.045, 6), { x: sx * (0.1 + i * 0.07), y: -0.07 - i * 0.012, s: [1, 0.8, 0.4] });
    }
    p.t(G.ball(0.055, 8), {}); 
  },
  clips(p, c, d) {
    const pair = (x: number) => {
      if (d('cherry')) { p.t(G.ball(0.05, 8), { x, y: 0 }, c.color); p.t(G.ball(0.05, 8), { x: x + 0.07, y: -0.02 }, c.color); p.t(G.capsule(0.006, 0.07), { x: x + 0.04, y: 0.06, rz: 0 }, c.trim); }
      else if (d('butterfly')) { for (const s of [-1, 1]) p.f(G.ball(0.045, 8), { x: x + s * 0.045, y: 0.015, s: [1, 1.2, 0.4], rz: s * 0.5 }); p.t(G.ball(0.02, 6), { x }, c.trim); }
      else p.f(starGeo(0.07), { x, y: 0 });
    };
    pair(0); 
  },
};
const HAT_SPOT: Record<string, { at: [number, number, number]; rot: [number, number, number]; s?: number }> = {
  bow: { at: on(-38, 58, 1.08), rot: [-0.3, 0, 0.45] },
  beret: { at: [0.08, HB + 0.02, 0.02], rot: [-0.1, 0, -0.28] },
  sunhat: { at: [0, HB - 0.07, -0.05], rot: [-0.3, 0, 0] },
  cowboy: { at: [0, HB - 0.08, -0.02], rot: [-0.18, 0, 0] },
  witch: { at: [0, HB - 0.06, -0.02], rot: [-0.12, 0, 0] },
  party: { at: [0.06, HB - 0.03, 0.0], rot: [-0.12, 0, -0.1] },
  catears: { at: [0, 0.0, -0.02], rot: [0, 0, 0] },
  bunnyears: { at: [0, 0.0, -0.02], rot: [0, 0, 0] },
  flowercrown: { at: [0, 0.27, 0.0], rot: [0.05, 0, 0] },
  beanie: { at: [0, 0.1, 0], rot: [-0.05, 0, 0] },
  acorn: { at: [0, 0.1, 0], rot: [-0.05, 0, 0] },
  bucket: { at: [0, 0.07, 0], rot: [-0.05, 0, 0] },
  cap: { at: [0, 0.15, 0], rot: [-0.05, 0, 0] },
  tiara: { at: [0, 0.0, 0.0], rot: [0, 0, 0] },
  headband: { at: [0, 0.0, 0], rot: [0, 0, 0] },
  earmuffs: { at: [0, 0.0, 0], rot: [0, 0, 0] },
  froghood: { at: [0, 0.1, 0], rot: [-0.05, 0, 0] },
  bearhood: { at: [0, 0.1, 0], rot: [-0.05, 0, 0] },
  bandana: { at: [0, 0.0, 0], rot: [0, 0, 0] },
  santa: { at: [-0.05, 0.3, 0], rot: [-0.1, 0, 0.1] },
  sailor: { at: [0, 0.02, 0], rot: [-0.05, 0, 0] },
  tophat: { at: [0, 0.0, 0], rot: [0, 0, 0] },
  antennae: { at: [0, 0.0, 0], rot: [0, 0, 0] },
  batbow: { at: on(-38, 58, 1.08), rot: [-0.3, 0, 0.45], s: 1.3 },
  clips: { at: on(46, 34, 1.04), rot: [0, 0.8, 0.3], s: 1.2 },
};

// ---------- face pieces (head space) ----------
const FACES: Record<string, (p: Piece, c: ClothDef, d: (k: string) => boolean) => void> = {
  round: (p) => lensPair(p, (x, y, z, ry) => { p.t(G.torus(0.085, 0.012, 18), { x, y, z, ry }, p.c.color); }, true),
  square: (p) => lensPair(p, (x, y, z, ry) => { p.t(G.torus(0.08, 0.012, 4), { x, y, z, ry, rz: Math.PI / 4, s: [1, 0.85, 1] }, p.c.color); }, true),
  cateye: (p) => lensPair(p, (x, y, z, ry, sx) => {
    p.f(G.torus(0.082, 0.013, 18), { x, y, z, ry, s: [1.12, 0.85, 1] });
    p.f(G.cone(0.03, 0.09, 4), { x: x + sx * 0.1, y: y + 0.06, z: z - 0.02, rz: -sx * 1.0, ry });
  }, true),
  heart: (p) => lensPair(p, (x, y, z, ry) => { p.t(heartGeo(0.108), { x, y, z: z - 0.004, ry }, p.c.trim); p.f(heartGeo(0.092), { x, y: y + 0.004, z, ry }); }, true),
  star: (p) => lensPair(p, (x, y, z, ry) => { p.t(starGeo(0.125), { x, y, z: z - 0.004, ry }, p.c.trim); p.f(starGeo(0.105), { x, y: y + 0.004, z, ry }); }, true),
  sleepmask(p, _c, d) {
    const q = on(0, 36, 1.0);
    p.f(G.ball(0.15, 12), { x: q[0], y: q[1], z: q[2] + 0.02, s: [1.7, 0.65, 0.3], rx: -0.4 });
    if (d('eyes')) for (const sx of [-1, 1]) p.t(G.torus(0.035, 0.007, 10, Math.PI), { x: sx * 0.1, y: q[1] - 0.005, z: q[2] + 0.06, rz: Math.PI, rx: -0.4 }, '#7a5a8a');
  },
  goggles(p) {
    p.t(ring(0.455, 0.07, 0.45, 22), { y: 0.24 }, '#ffffff');
    for (const sx of [-1, 1]) { p.f(G.ball(0.11, 12), { x: sx * 0.13, y: 0.3, z: 0.37, s: [1, 0.8, 0.45] }); p.t(G.torus(0.105, 0.016, 14), { x: sx * 0.13, y: 0.3, z: 0.395, s: [1, 0.8, 1] }); }
  },
  whiskers(p) {
    for (const sx of [-1, 1]) for (const t of [-1, 0, 1]) {
      const q = on(sx * 40, -12 + t * 5, 1.03);
      p.f(G.capsule(0.006, 0.11), { x: q[0], y: q[1], z: q[2], rz: sx * (Math.PI / 2 - t * 0.25), ry: sx * 0.8 });
    }
  },
};
function lensPair(p: Piece, one: (x: number, y: number, z: number, ry: number, sx: number) => void, bridge: boolean) {
  for (const sx of [-1, 1]) {
    const q = on(sx * 20, 4, 1.04);
    one(q[0], q[1], q[2], sx * 20 * DEG, sx);
  }
  if (bridge) { const q = on(0, 5, 1.04); p.t(G.capsule(0.007, 0.06), { x: q[0], y: q[1], z: q[2] - 0.01, rz: Math.PI / 2 }, p.c.pattern ? p.c.trim : p.c.color); }
  for (const sx of [-1, 1]) { const q = on(sx * 62, 4, 1.0); p.t(G.capsule(0.007, 0.16), { x: q[0] * 0.98, y: q[1], z: q[2] * 0.6, ry: sx * 1.2, rx: Math.PI / 2 }, p.c.pattern ? p.c.trim : p.c.color); }
}

// ---------- shoes (leg space: foot ball centre at y -0.2) ----------
const SHOES: Record<string, (p: Piece, c: ClothDef, d: (k: string) => boolean) => void> = {
  mary(p, _c, d) { foot(p); p.t(G.torus(0.07, 0.012, 12, Math.PI), { y: -0.19, z: 0.0, rx: 0.2 }); p.t(G.ball(0.05, 8), { y: -0.17, z: 0.1, s: [1.2, 0.5, 0.8] }); if (d('bow')) p.t(G.ball(0.04, 8), { y: -0.15, z: 0.12 }); },
  ballet(p) { foot(p, 0.95); p.t(G.torus(0.07, 0.012, 12), { y: -0.14, rx: Math.PI / 2 }); p.t(G.capsule(0.01, 0.1), { x: 0.05, y: -0.08, z: 0.04, rz: 0.4 }); },
  sneaker(p) { foot(p); p.t(G.ball(0.1, 10), { y: -0.245, z: 0.03, s: [1.08, 0.3, 1.3] }, '#ffffff'); p.t(G.ball(0.06, 8), { y: -0.2, z: 0.12, s: [1, 0.7, 0.9] }); p.t(G.cyl(0.04, 0.04, 0.02, 8), { y: -0.14, z: 0.06, rx: 0.6 }, '#ffffff'); },
  hightop(p) { foot(p); p.t(G.ball(0.1, 10), { y: -0.245, z: 0.03, s: [1.08, 0.3, 1.3] }, '#ffffff'); p.f(G.capsule(0.075, 0.06), { y: -0.12 }); p.t(G.ball(0.06, 8), { y: -0.2, z: 0.12, s: [1, 0.7, 0.9] }); p.t(starGeo(0.03), { x: 0.06, y: -0.1, z: 0.04, ry: 1.5 }, '#ffffff'); },
  platform(p) { foot(p, 1, 0.04); p.t(G.cyl(0.115, 0.125, 0.075, 14), { y: -0.265, z: 0.03, s: [1.05, 1, 1.25] }); p.t(G.ball(0.05, 8), { y: -0.17, z: 0.12, s: [1, 0.7, 0.9] }); },
  boot(p, _c, d) { foot(p); p.f(G.capsule(0.082, 0.1), { y: -0.1 }); p.t(G.ball(0.105, 10), { y: -0.245, z: 0.03, s: [1.05, 0.3, 1.3] }); p.t(G.torus(0.085, 0.015, 12), { y: -0.04, rx: Math.PI / 2 }, d('fur') ? '#ffffff' : p.c.trim); },
  rainboot(p) { foot(p); p.f(G.capsule(0.085, 0.13), { y: -0.09 }); p.t(G.torus(0.088, 0.02, 12), { y: -0.01, rx: Math.PI / 2 }); p.t(G.ball(0.105, 10), { y: -0.245, z: 0.03, s: [1.05, 0.3, 1.3] }, '#ffffff'); },
  cowboyboot(p) { foot(p); p.f(G.capsule(0.082, 0.12), { y: -0.09 }); p.t(G.box(0.07, 0.05, 0.06), { y: -0.255, z: -0.04 }); p.t(starGeo(0.035), { y: -0.07, z: 0.083 }); p.t(G.torus(0.085, 0.012, 12), { y: -0.02, rx: Math.PI / 2 }); },
  loafer(p) { foot(p); p.t(G.ball(0.05, 8), { y: -0.16, z: 0.1, s: [1.2, 0.5, 0.8] }, GOLD); },
  slipper(p, _c, d) { foot(p, 1.12); if (d('ears')) for (const sx of [-1, 1]) p.f(G.capsule(0.025, 0.1), { x: sx * 0.04, y: -0.1, z: 0.0, rz: sx * 0.2, s: [1, 1, 0.6] }); if (d('eyes')) for (const sx of [-1, 1]) { p.t(G.ball(0.04, 8), { x: sx * 0.05, y: -0.15, z: 0.1 }, '#ffffff'); p.t(G.ball(0.02, 6), { x: sx * 0.05, y: -0.15, z: 0.13 }, '#4f2b40'); } },
  sandal(p) { p.t(G.ball(0.1, 10), { y: -0.235, z: 0.03, s: [1.05, 0.2, 1.3] }); p.f(G.ball(0.08, 10), { y: -0.2, z: 0.05, s: [1, 0.55, 1.1] }, ); p.t(G.torus(0.065, 0.012, 12, Math.PI), { y: -0.2, z: 0.06, rx: 0.3 }); },
};
function foot(p: Piece, k = 1, lift = 0) { p.f(G.ball(0.105, 12), { y: -0.2 + lift, z: 0.03, s: [1.05 * k, 0.72 * k, 1.25 * k] }); }

// ---------- bags ----------
const BAGS: Record<string, { mount: 'hand' | 'body'; build: (p: Piece, c: ClothDef, d: (k: string) => boolean) => void }> = {
  shopping: { mount: 'hand', build(p) { p.f(G.ball(0.11, 12), { y: -0.21, s: [1.05, 0.95, 0.7] }); p.t(heartGeo(0.04), { y: -0.2, z: 0.08 }); p.t(G.torus(0.055, 0.012, 10, Math.PI), { y: -0.11 }, '#fff6fb'); } },
  tote: { mount: 'hand', build(p) { p.f(G.box(0.22, 0.24, 0.08), { y: -0.26 }); p.t(G.torus(0.065, 0.012, 10, Math.PI), { y: -0.14 }); p.t(G.box(0.22, 0.04, 0.085), { y: -0.16 }); } },
  basket: { mount: 'hand', build(p) { p.f(G.cyl(0.12, 0.09, 0.11, 14), { y: -0.22 }); p.t(G.torus(0.1, 0.014, 14, Math.PI), { y: -0.17 }); p.t(G.ball(0.1, 10), { y: -0.17, s: [1, 0.3, 1] }, '#fff6f6'); } },
  lunchbox: { mount: 'hand', build(p) { p.f(G.box(0.2, 0.13, 0.17), { y: -0.22 }); p.t(G.box(0.205, 0.02, 0.025), { y: -0.22, z: 0 }); p.t(G.ball(0.03, 8), { y: -0.15 }); } },
  heartbag: { mount: 'hand', build(p) { p.f(heartGeo(0.15), { y: -0.22, z: 0 }); p.f(heartGeo(0.15), { y: -0.22, z: -0.03 }); p.t(G.torus(0.06, 0.008, 10, Math.PI), { y: -0.11 }, GOLD); } },
  plush: { mount: 'hand', build(p) { p.f(G.ball(0.09, 10), { y: -0.28, s: [1, 1.1, 0.8] }); p.f(G.ball(0.075, 10), { y: -0.17 }); for (const sx of [-1, 1]) p.f(G.ball(0.035, 8), { x: sx * 0.055, y: -0.115, s: [1, 1.3, 0.6] }); p.t(G.ball(0.025, 6), { y: -0.17, z: 0.07 }, '#4f2b40'); } },
  balloon: { mount: 'hand', build(p, c) { const cols = [c.color, c.trim, '#9bd4ff']; cols.forEach((col, i) => { const x = (i - 1) * 0.1; p.t(G.ball(0.09, 10), { x, y: 0.4 + (i % 2) * 0.06, s: [1, 1.2, 1] }, col); p.t(G.cyl(0.003, 0.003, 0.4, 4), { x: x * 0.5, y: 0.17 + (i % 2) * 0.03 }, '#ffffff'); }); } },
  umbrella: { mount: 'hand', build(p) { p.t(G.capsule(0.01, 0.55), { y: 0.1 }, '#ffffff'); p.f(G.ball(0.34, 18), { y: 0.38, s: [1, 0.38, 1] }); p.t(G.ball(0.025, 6), { y: 0.5 }, GOLD); p.t(G.torus(0.33, 0.015, 22), { y: 0.37, rx: Math.PI / 2 }); } },
  purse: { mount: 'body', build(p, _c, d) { p.f(G.box(0.16, 0.12, 0.07), { x: -0.3, y: 0.2, z: 0.03, rz: 0.1 }); p.t(G.ball(0.025, 8), { x: -0.3, y: 0.23, z: 0.07 }, d('moon') ? '#fff3b0' : GOLD); p.t(G.capsule(0.007, 0.5), { x: -0.08, y: 0.4, z: 0.14, rz: -0.8 }, p.c.trim); } },
  satchel: { mount: 'body', build(p) { p.f(G.box(0.22, 0.16, 0.08), { x: 0.3, y: 0.2, z: 0.03, rz: -0.1 }); p.t(G.box(0.225, 0.06, 0.085), { x: 0.3, y: 0.25, z: 0.03, rz: -0.1 }); p.t(G.ball(0.025, 8), { x: 0.3, y: 0.22, z: 0.075 }, GOLD); p.t(G.capsule(0.008, 0.55), { x: 0.1, y: 0.4, z: 0.13, rz: 0.75 }); } },
  backpack: { mount: 'body', build(p) { bag(p); } },
  bearpack: { mount: 'body', build(p, c, d) {
    bag(p);
    if (d('bunnyears')) for (const sx of [-1, 1]) p.f(G.capsule(0.04, 0.2), { x: sx * 0.07, y: 0.67, z: -0.25, rz: sx * 0.12, s: [1, 1, 0.6] });
    else for (const sx of [-1, 1]) p.f(G.ball(0.055, 8), { x: sx * 0.09, y: 0.55, z: -0.27, s: [1, 1, 0.6] });
    void c;
  } },
};
function bag(p: Piece) {
  p.f(G.box(0.3, 0.34, 0.14), { y: 0.32, z: -0.26 }); p.t(G.box(0.2, 0.12, 0.03), { y: 0.25, z: -0.34 });
  for (const sx of [-1, 1]) { p.t(G.box(0.04, 0.34, 0.015), { x: sx * 0.09, y: 0.38, z: -0.19, rx: 0.15 }); p.t(G.box(0.04, 0.015, 0.2), { x: sx * 0.09, y: 0.55, z: -0.1 }); }
}

// ---------- body pieces ----------
function profile(yh: number, rh: number, rw: number, rt: number, yTop: number): [number, number][] {
  const ts = [0, 0.07, 0.2, 0.45, 0.75, 0.93];
  const rs = [rh * 0.86, rh, rh * 0.985, rh + (rw - rh) * 0.4, rw, rt];
  const pts: [number, number][] = [[0.001, yh]];
  ts.forEach((t, i) => pts.push([rs[i], yh + (yTop - yh) * t]));
  pts.push([0.001, yTop]);
  return pts;
}
function rAt(pts: [number, number][], y: number): number {
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) { const [r0, y0] = pts[i - 1], [r1, y1] = pts[i]; return y1 === y0 ? r1 : r0 + ((y - y0) / (y1 - y0)) * (r1 - r0); }
  return pts[pts.length - 1][0];
}
const geoCache = new Map<string, THREE.BufferGeometry>();
function lathe(key: string, pts: [number, number][], seg = 28, uv: [number, number] = [3, 1.2]): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = G.lathe(pts, seg);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * uv[0], a.getY(i) * uv[1]);
    geoCache.set(key, g);
  }
  return g;
}

/** Everything a body item adds beyond its main surface (collars, buttons, hoods…). `r(y)` = the surface radius at height y. */
function bodyExtras(p: Piece, c: ClothDef, d: (k: string) => boolean, hemY: number, hemR: number, r: (y: number) => number, isTop: boolean) {
  const neck = 0.55;
  if (d('collar')) { p.t(G.torus(0.165, 0.036, 18), { y: neck, z: 0.03, rx: Math.PI / 2.15 }); }
  if (d('sailor')) {
    p.t(G.box(0.4, 0.025, 0.28), { y: 0.5, z: -0.08, rx: -0.3 });
    for (const sx of [-1, 1]) p.t(G.box(0.1, 0.02, 0.24), { x: sx * 0.07, y: 0.47, z: 0.13, ry: -sx * 0.45, rx: -0.55 });
    p.t(G.ball(0.035, 8), { y: 0.43, z: 0.2 }, '#ff6f84');
  }
  if (d('turtle')) p.f(G.cyl(0.13, 0.16, 0.1), { y: 0.57 });
  if (d('scarf')) {
    p.t(G.torus(0.18, 0.058, 18), { y: neck - 0.01, z: 0.03, rx: Math.PI / 2.15 });
    p.t(G.box(0.075, 0.24, 0.03), { x: 0.09, y: 0.4, z: r(0.42) + 0.03, rz: 0.12 });
    p.t(G.box(0.075, 0.18, 0.03), { x: 0.15, y: 0.36, z: r(0.4) + 0.034, rz: -0.1 });
  }
  if (d('fur')) { p.t(G.torus(0.17, 0.06, 18), { y: neck, z: 0.02, rx: Math.PI / 2.2 }, '#ffffff'); }
  if (d('hood')) { p.f(G.ball(0.2, 14), { y: 0.6, z: -0.12, s: [1.25, 0.95, 0.75] }); p.t(G.torus(0.16, 0.025, 14), { y: 0.57, z: 0.03, rx: Math.PI / 2.2 }, c.trim); }
  if (d('bow')) { const g = new Piece(c, 3); bowParts(g, 0.7); const m = g.group(); m.position.set(0, isTop ? 0.46 : 0.4, r(0.42) + 0.04); p.extras.push(m); }
  if (d('buttons')) for (const y of [0.5, 0.42, 0.34].filter((y) => y > hemY + 0.05)) p.t(G.ball(0.021, 8), { y, z: r(y) + 0.004 }, c.pattern || c.trim === '#ffffff' ? '#ffffff' : c.trim);
  if (d('zip')) p.t(G.box(0.012, 0.5 - hemY, 0.01), { y: (0.55 + hemY) / 2, z: r(0.35) + 0.004 }, '#ffffff');
  if (d('ruffle')) p.t(G.torus(hemR * 0.99, 0.032, 26), { y: hemY + 0.02, rx: Math.PI / 2 });
  if (d('stripehem')) p.t(ring(hemR * 1.02, 0.06, hemR * 1.04, 24), { y: hemY + 0.03 });
  if (d('belt')) { const y = 0.37; p.t(G.torus(r(y) * 1.02, 0.017, 26), { y, rx: Math.PI / 2 }); p.t(G.box(0.045, 0.04, 0.012), { y, z: r(y) + 0.015 }, GOLD); }
  if (d('apron')) { p.t(G.ball(0.15, 12), { y: 0.3, z: r(0.3) - 0.02, s: [1.2, 1.5, 0.22] }); p.t(G.box(0.11, 0.06, 0.012), { y: 0.26, z: r(0.3) + 0.012 }, c.color); }
  if (d('pocket')) p.t(G.ball(0.055, 8), { y: 0.25, z: r(0.25) + 0.004, s: [1.3, 0.9, 0.2] });
  if (d('openfront')) p.t(G.box(0.08, 0.5 - hemY, 0.015), { y: (0.55 + hemY) / 2, z: r(0.35) + 0.005 }, '#ffffff');
  if (d('tail')) p.t(G.ball(0.07, 10), { y: 0.12, z: -r(0.12) - 0.02 }, '#ffffff');
  if (d('wings')) for (const sx of [-1, 1]) { p.t(G.ball(0.13, 10), { x: sx * 0.16, y: 0.46, z: -0.22, s: [0.55, 1.1, 0.18], rz: sx * 0.4 }, '#fffafd'); p.t(G.ball(0.09, 10), { x: sx * 0.15, y: 0.33, z: -0.22, s: [0.5, 1, 0.18], rz: sx * 0.7 }, '#fffafd'); }
  if (d('cape')) p.cape = true;
  if (d('heart')) p.t(heartGeo(0.045), { y: 0.45, z: r(0.45) + 0.008 }, '#ff8fb6');
  if (d('star')) p.t(starGeo(0.06), { y: 0.43, z: r(0.43) + 0.008 }, GOLD);
  if (d('moonbrooch')) { p.t(G.ball(0.04, 10), { y: 0.5, z: r(0.5) + 0.01 }, GOLD); p.t(G.ball(0.034, 10), { x: 0.016, y: 0.514, z: r(0.5) + 0.022 }, c.color); }
  if (d('ghost')) { p.t(G.ball(0.06, 10), { y: 0.42, z: r(0.42) + 0.01, s: [1, 1.2, 0.3] }, '#ffffff'); for (const sx of [-1, 1]) p.t(G.ball(0.01, 6), { x: sx * 0.02, y: 0.43, z: r(0.42) + 0.022 }, '#4f2b40'); }
  if (d('logo:lamb')) { for (const [x, y] of [[-0.03, 0.43], [0.03, 0.43], [0, 0.47], [0, 0.4]]) p.t(G.ball(0.03, 8), { x, y, z: r(0.43) + 0.01, s: [1, 1, 0.3] }, '#ffffff'); }
  if (d('logo:star')) p.t(starGeo(0.07), { y: 0.43, z: r(0.43) + 0.008 }, '#ffd36e');
  if (d('fringe')) for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.t(G.capsule(0.01, 0.05), { x: Math.sin(a) * hemR, y: hemY - 0.01, z: Math.cos(a) * hemR }); }
  if (d('studs')) for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; p.t(G.ball(0.014, 6), { x: Math.sin(a) * (r(0.37) + 0.012), y: 0.37, z: Math.cos(a) * (r(0.37) + 0.012) }, '#e8e8f4'); }
  if (d('poodle')) { p.t(G.ball(0.07, 10), { x: -0.12, y: hemY + 0.07, z: r(hemY + 0.07) + 0.01, s: [1, 1, 0.25] }, '#ffffff'); p.t(G.ball(0.03, 8), { x: -0.12, y: hemY + 0.1, z: r(hemY + 0.07) + 0.025 }, '#ffffff'); }
  if (d('sparkle')) for (const [x, y, s] of [[-0.14, hemY + 0.12, 0.03], [0.12, hemY + 0.07, 0.025], [0.04, hemY + 0.2, 0.025]] as const) p.t(starGeo(s), { x, y, z: r(y) + 0.008 }, '#fff3a8');
}
function finishBody(p: Piece): THREE.Group {
  const g = p.group();
  if (p.cape) {
    const geo = new THREE.LatheGeometry([new THREE.Vector2(0.17, 0.56), new THREE.Vector2(0.27, 0.4), new THREE.Vector2(0.36, 0.12)], 16, Math.PI - 1.15, 2.3);
    const cape = new THREE.Mesh(geo, fabric(p.c.trim, p.c.trimPattern, undefined, true));
    cape.castShadow = true;
    g.add(cape);
  }
  return g;
}

function buildDress(c: ClothDef): THREE.Group {
  const s = DRESS_SHAPES[c.shape] ?? DRESS_SHAPES.aline;
  const pts = profile(s.yh, s.rh, s.rw, s.rt, 0.56);
  const p = new Piece(c);
  const d = (k: string) => !!c.deco?.includes(k);
  const body = new THREE.Mesh(lathe(`d:${c.shape}`, pts, 28), fabricOf(c));
  body.castShadow = body.receiveShadow = true;
  // hem band in the trim colour
  const hy = s.yh;
  const band = new THREE.Mesh(lathe(`b:${c.shape}`, [[rAt(pts, hy) * 1.015, hy - 0.006], [rAt(pts, hy + 0.05) * 1.02, hy + 0.05]], 28), fabric(c.trim, c.trimPattern, undefined, true));
  band.castShadow = true;
  bodyExtras(p, c, d, hy, rAt(pts, hy + 0.02), (y) => rAt(pts, y), false);
  const g = finishBody(p);
  g.add(body, band);
  return g;
}
function buildTop(c: ClothDef): THREE.Group {
  const s = TOP_SHAPES[c.shape] ?? TOP_SHAPES.tee;
  const pts: [number, number][] = [[0.001, s.yb]];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5, y = s.yb + (0.54 - s.yb) * t;
    pts.push([bodyR(y) * s.puff * (1 + (s.flare - 1) * (1 - t) ** 2), y]);
  }
  pts.push([0.001, 0.56]);
  pts.splice(1, 0, [bodyR(s.yb) * s.puff * s.flare * 0.92, s.yb]);
  const body = new THREE.Mesh(lathe(`t:${c.shape}`, pts, 26, [3, 0.9]), fabricOf(c));
  body.castShadow = body.receiveShadow = true;
  const p = new Piece(c);
  const d = (k: string) => !!c.deco?.includes(k);
  const band = new THREE.Mesh(lathe(`tb:${c.shape}`, [[rAt(pts, s.yb + 0.005) * 1.02, s.yb - 0.004], [rAt(pts, s.yb + 0.04) * 1.025, s.yb + 0.04]], 26), fabric(c.trim, c.trimPattern, undefined, true));
  band.castShadow = true;
  bodyExtras(p, c, d, s.yb, rAt(pts, s.yb + 0.02), (y) => rAt(pts, Math.max(s.yb, y)), true);
  const g = finishBody(p);
  g.add(body);
  if (d('stripehem') || d('ruffle') || ['jacket', 'jersey', 'hoodie', 'sweater', 'cardigan'].includes(c.shape)) g.add(band);
  return g;
}
function buildBottom(c: ClothDef): THREE.Group {
  const s = BOTTOM_SHAPES[c.shape] ?? BOTTOM_SHAPES.skirt;
  const rTop = bodyR(0.38) * 0.99;
  const ts = [0, 0.12, 0.35, 0.65, 1];
  const pts: [number, number][] = [[0.001, s.yh], [s.rh * 0.9, s.yh]];
  for (const t of ts) pts.push([rTop + (s.rh - rTop) * (1 - t) ** 1.35, s.yh + (0.38 - s.yh) * t]);
  pts.push([0.001, 0.38]);
  const body = new THREE.Mesh(lathe(`b:${c.shape}`, pts, s.seg ?? 26, [3, 0.7]), fabricOf(c));
  body.castShadow = body.receiveShadow = true;
  const p = new Piece(c);
  const d = (k: string) => !!c.deco?.includes(k);
  bodyExtras(p, c, d, s.yh, s.rh, (y) => rAt(pts, Math.max(s.yh, y)) * 1.0, false);
  if (s.kind === 'skirt') {
    const band = new THREE.Mesh(lathe(`bb:${c.shape}`, [[s.rh * 1.015, s.yh - 0.006], [rAt(pts, s.yh + 0.045) * 1.02, s.yh + 0.045]], 26), fabric(c.trim, c.trimPattern, undefined, true));
    band.castShadow = true;
    const g = finishBody(p);
    g.add(body, band);
    return g;
  }
  if (s.kind === 'overalls') {
    p.f(G.box(0.2, 0.2, 0.03), { y: 0.46, z: 0.235 });
    p.t(G.ball(0.022, 8), { x: -0.07, y: 0.53, z: 0.253 }, '#ffffff'); p.t(G.ball(0.022, 8), { x: 0.07, y: 0.53, z: 0.253 }, '#ffffff');
    for (const sx of [-1, 1]) { p.f(G.box(0.045, 0.03, 0.2), { x: sx * 0.07, y: 0.575, z: 0.14, rx: 0.18 }); p.f(G.box(0.045, 0.26, 0.02), { x: sx * 0.075, y: 0.42, z: -0.2, rx: 0.1 }); }
    p.t(G.ball(0.045, 8), { y: 0.43, z: 0.252, s: [1.2, 0.9, 0.2] });
  }
  const g = finishBody(p);
  g.add(body);
  return g;
}

// ---------- the public API ----------
const cache = new Map<string, THREE.Object3D>();
const shoeCache = new Map<string, [THREE.Object3D, THREE.Object3D]>();
const dOf = (c: ClothDef) => (k: string) => !!c.deco?.includes(k);

/** A cached model for the item. Body pieces live in torso space, hats / face in head space, bags in hand or torso space. */
export function buildCloth(c: ClothDef): THREE.Object3D {
  let o = cache.get(c.id);
  if (o) return o;
  switch (c.slot) {
    case 'dress': o = buildDress(c); break;
    case 'top': o = buildTop(c); break;
    case 'bottom': o = buildBottom(c); break;
    case 'hat': {
      const p = new Piece(c);
      const fn = HATS[c.shape] ?? HATS.bow;
      fn(p, c, dOf(c));
      const g = p.group();
      const spot = HAT_SPOT[c.shape] ?? HAT_SPOT.bow;
      g.position.set(...spot.at); g.rotation.set(...spot.rot); g.scale.setScalar(spot.s ?? 1);
      o = g; break;
    }
    case 'face': {
      const p = new Piece(c, 2);
      (FACES[c.shape] ?? FACES.round)(p, c, dOf(c));
      o = p.group(); break;
    }
    case 'bag': {
      const spec = BAGS[c.shape] ?? BAGS.shopping;
      const p = new Piece(c, 2);
      spec.build(p, c, dOf(c));
      const g = p.group();
      g.userData.mount = spec.mount;
      o = g; break;
    }
    default: o = new THREE.Group();
  }
  o.traverse((m) => { if ((m as THREE.Mesh).isMesh) (m as THREE.Mesh).castShadow = true; });
  cache.set(c.id, o);
  return o;
}

/** Two shoe models (left, right) in leg space. */
export function buildShoes(c: ClothDef): [THREE.Object3D, THREE.Object3D] {
  let pair = shoeCache.get(c.id);
  if (pair) return pair;
  const make = () => { const p = new Piece(c, 2); (SHOES[c.shape] ?? SHOES.mary)(p, c, dOf(c)); return p.group(); };
  pair = [make(), make()];
  shoeCache.set(c.id, pair);
  return pair;
}

/** How the arms are dressed for a look: sleeve length and fabric. */
export function sleeveOf(look: Look): { len: SleeveLen; mat: THREE.MeshToonMaterial | null } {
  const c = look.dress ?? look.top;
  const len = (look.dress ? DRESS_SHAPES[c.shape]?.sleeve : TOP_SHAPES[c.shape]?.sleeve) ?? 1;
  if (len === 0) return { len, mat: null };
  const fromTrim = look.dress && c.shape === 'pinafore';
  return { len, mat: fromTrim ? fabric(c.trim, c.trimPattern) : fabricOf(c) };
}
/** Pants / overalls colour the legs; `null` leaves them skin-coloured. */
export function legsOf(look: Look): THREE.MeshToonMaterial | null {
  if (look.dress) return null;
  const k = BOTTOM_SHAPES[look.bottom.shape]?.kind;
  return k === 'pants' || k === 'overalls' ? fabricOf(look.bottom) : null;
}
/** Hood ears etc. that belong on the head (onesies). */
export function headExtraOf(look: Look): ClothDef | null {
  for (const c of [look.dress, look.top]) if (c?.deco?.some((k) => k === 'bunnyears' || k === 'bearears' || k === 'catears' || k === 'frog')) return c;
  return null;
}
const hoodCache = new Map<string, THREE.Object3D>();
export function buildHood(c: ClothDef): THREE.Object3D {
  let o = hoodCache.get(c.id);
  if (o) return o;
  const p = new Piece(c);
  const d = dOf(c);
  if (d('frog')) {
    for (const sx of [-1, 1]) { p.f(G.ball(0.12, 10), { x: sx * 0.2, y: 0.42, z: 0.1 }); p.t(G.ball(0.08, 10), { x: sx * 0.2, y: 0.46, z: 0.14 }, '#ffffff'); p.t(G.ball(0.04, 8), { x: sx * 0.2, y: 0.47, z: 0.2 }, '#4f2b40'); }
  } else if (d('bunnyears')) {
    for (const sx of [-1, 1]) { p.f(G.capsule(0.07, 0.3), { x: sx * 0.16, y: 0.64, z: -0.02, rz: sx * 0.12, s: [1, 1, 0.55] }); p.t(G.capsule(0.04, 0.22), { x: sx * 0.16, y: 0.64, z: 0.02, rz: sx * 0.12, s: [1, 1, 0.45] }); }
  } else if (d('catears')) {
    for (const sx of [-1, 1]) { p.f(G.cone(0.12, 0.24, 4), { x: sx * 0.24, y: 0.42, rz: -sx * 0.25, s: [1, 1, 0.5] }); p.t(G.cone(0.07, 0.15, 4), { x: sx * 0.24, y: 0.4, z: 0.03, rz: -sx * 0.25, s: [1, 1, 0.4] }); }
  } else {
    for (const sx of [-1, 1]) { p.f(G.ball(0.13, 10), { x: sx * 0.32, y: 0.46, z: -0.04, s: [1, 1, 0.6] }); p.t(G.ball(0.07, 8), { x: sx * 0.32, y: 0.46, z: 0.01, s: [1, 1, 0.5] }); }
  }
  o = p.group();
  hoodCache.set(c.id, o);
  return o;
}
