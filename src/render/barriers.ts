// The cute barriers: fallen blossom logs, a broken (then mended) bridge, a soft fog veil and pastel locked gates.
// Each stands until the world says its barrier is open (world.barrierOpen). Static meshes are merged; the fog is animated.
// Polish hook: when a barrier opens, hide/replace it in `sync()` below (a later pass can add a poof + sparkle there).
import * as THREE from 'three';
import { BARRIERS, type Barrier } from '../areas';
import { barrierOpen } from '../world';
import { contactShadow, makeToon, PALETTE } from './materials';
import { Batch, G } from './util';
import { tileHeight } from './terrain';

const BARK = '#c99a86', BARK_DARK = '#b07f72', CUT = '#fde0d0', MOSS = '#a9e0a4', PLANK = '#f2c3b0', PLANK_DARK = '#e3a692';

function logs(b: Barrier): THREE.Group {
  const g = new THREE.Group();
  const k = new Batch();
  // three plump logs lying across the path (north-south), stacked like a snug pile
  const logAt = (x: number, y: number, z: number, len: number, r: number, ry: number) => {
    k.add(G.cyl(r, r, len, 14), BARK, { x, y, z, rx: Math.PI / 2, ry, s: [1, 1, 1] });
    k.add(G.cyl(r * 0.84, r * 0.84, 0.02, 14), CUT, { x: x + Math.sin(ry) * len / 2 * 0, y, z: z - len / 2 - 0.005, rx: Math.PI / 2 });
    k.add(G.cyl(r * 0.84, r * 0.84, 0.02, 14), CUT, { x, y, z: z + len / 2 + 0.005, rx: Math.PI / 2 });
    for (const sz of [-0.25, 0.2]) k.add(G.torus(r * 0.97, 0.025, 14), BARK_DARK, { x, y, z: z + sz * len * 0.5, ry: Math.PI / 2 });
    k.add(G.ball(r * 0.55, 8), MOSS, { x: x + 0.05, y: y + r * 0.85, z: z + len * 0.12, s: [1.6, 0.4, 1.2] });
  };
  logAt(-0.25, 0.3, 0.0, 2.3, 0.3, 0.06);
  logAt(0.18, 0.3, 0.1, 2.1, 0.28, -0.05);
  logAt(-0.02, 0.78, 0.02, 1.9, 0.27, 0.03);
  // blossoms tumbled over the pile
  const cols = ['#ffb3cf', '#ffffff', '#ff8fb6', '#ffd9e8'];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    k.add(G.ball(0.1, 8), cols[i % 4], { x: Math.sin(a) * 0.4, y: 0.62 + (i % 3) * 0.17, z: Math.cos(a * 1.3) * 0.85, s: [1, 0.6, 1] });
  }
  g.add(k.build(), contactShadow(3, 3, 'round', 0.25));
  g.position.set(b.cx, tileHeight(Math.floor(b.cx), Math.floor(b.cy)), b.cy);
  return g;
}

function bridge(b: Barrier): { broken: THREE.Group; mended: THREE.Group } {
  const y = 0.12;
  const x0 = b.cx - 1, z0 = b.cy - 1, z1 = b.cy + 1; // the river runs z0..z1, the bridge spans it north-south
  const mk = (): { g: THREE.Group; k: Batch } => ({ g: new THREE.Group(), k: new Batch() });
  const posts = (k: Batch) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = b.cx + sx * 1.0, pz = b.cy + sz * 1.05;
      k.add(G.cyl(0.07, 0.09, 0.8, 8), '#ffffff', { x: px, y: y + 0.4, z: pz });
      k.add(G.ball(0.1, 8), '#ffc3da', { x: px, y: y + 0.84, z: pz });
    }
  };
  // mended: a full deck of pink-grained planks with rope rails
  const m = mk();
  for (let i = 0; i < 9; i++) {
    const z = z0 - 0.05 + (i + 0.5) * ((z1 - z0 + 0.1) / 9);
    m.k.add(G.box(2.1, 0.09, 0.2), i % 2 ? PLANK : PLANK_DARK, { x: b.cx, y: y, z });
  }
  for (const sx of [-1, 1]) m.k.add(G.box(0.08, 0.1, 2.3), PLANK_DARK, { x: b.cx + sx * 1.0, y: y - 0.04, z: b.cy });
  posts(m.k);
  for (const sx of [-1, 1]) {
    m.k.add(G.cyl(0.025, 0.025, 2.1, 6), '#ffffff', { x: b.cx + sx * 1.0, y: y + 0.66, z: b.cy, rx: Math.PI / 2 });
    for (const t of [-0.6, 0, 0.6]) m.k.add(G.ball(0.07, 8), '#ff8fb6', { x: b.cx + sx * 1.0, y: y + 0.6, z: b.cy + t, s: [1, 0.9, 1] });
  }
  m.g.add(m.k.build());
  // broken: stubs at each bank, a few planks adrift, a slumped rope
  const br = mk();
  for (const [z, dir] of [[z0, 1], [z1, -1]] as const) {
    for (let i = 0; i < 3; i++) br.k.add(G.box(2.0, 0.09, 0.2), i % 2 ? PLANK : PLANK_DARK, { x: b.cx, y, z: z + dir * (0.1 + i * 0.22) + (i === 2 ? dir * 0.0 : 0), rz: i === 2 ? 0.0 : 0 });
    br.k.add(G.box(0.2, 0.1, 0.34), PLANK_DARK, { x: b.cx - 0.7, y: y + 0.01, z: z + dir * 0.82, ry: 0.5 }); // splintered end
    for (const sx of [-1, 1]) {
      br.k.add(G.cyl(0.07, 0.09, 0.8, 8), '#ffffff', { x: b.cx + sx * 1.0, y: y + 0.4, z: z + dir * 0.08 });
      br.k.add(G.ball(0.1, 8), '#ffc3da', { x: b.cx + sx * 1.0, y: y + 0.84, z: z + dir * 0.08 });
    }
  }
  br.k.add(G.box(1.5, 0.07, 0.2), PLANK, { x: b.cx - 0.2, y: -0.2, z: b.cy - 0.1, ry: 0.4, rz: 0.12 });
  br.k.add(G.box(1.3, 0.07, 0.2), PLANK_DARK, { x: b.cx + 0.3, y: -0.2, z: b.cy + 0.35, ry: -0.6, rz: -0.1 });
  // a little "mending" board
  br.k.add(G.box(0.07, 0.6, 0.07), PALETTE.wood, { x: b.cx + 1.15, y: y + 0.3, z: z0 - 0.35 });
  br.k.add(G.box(0.55, 0.34, 0.06), '#fff4e6', { x: b.cx + 1.15, y: y + 0.7, z: z0 - 0.35, rz: 0.06 });
  br.k.add(G.ball(0.07, 8), '#ff8fb6', { x: b.cx + 1.15, y: y + 0.72, z: z0 - 0.31 });
  br.g.add(br.k.build());
  void x0;
  return { broken: br.g, mended: m.g };
}

function gate(b: Barrier, tint: 'pink' | 'mint'): THREE.Group {
  const g = new THREE.Group();
  const k = new Batch();
  const rail = tint === 'pink' ? '#ffc3da' : '#bfeedd', trim = tint === 'pink' ? '#ff8fb6' : '#7fd3b8';
  // gate runs north-south across the passage (axis 'ew'), spanning two tiles
  const half = 1.0;
  for (const sz of [-1, 1]) {
    k.add(G.cyl(0.13, 0.15, 1.5, 10), '#ffffff', { z: sz * half, y: 0.75 });
    k.add(G.ball(0.17, 10), trim, { z: sz * half, y: 1.55 });
  }
  // arch
  k.add(G.torus(half, 0.07, 22, Math.PI), rail, { y: 1.45, ry: Math.PI / 2, s: [1, 0.55, 1] });
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; k.add(G.ball(0.1, 8), ['#ffffff', trim, '#fff3a8'][i % 3], { z: Math.cos(a) * half, y: 1.45 + Math.sin(a) * half * 0.55 }); }
  // pickets and rails
  for (const y of [0.4, 0.85]) k.add(G.box(0.08, 0.1, half * 1.9), rail, { y });
  for (let i = 0; i < 7; i++) { const z = -0.85 + i * 0.283; k.add(G.box(0.08, 0.95, 0.14), '#ffffff', { z, y: 0.5 }); k.add(G.ball(0.08, 8), '#ffffff', { z, y: 1.0 }); }
  // heart-shaped lock
  k.add(G.ball(0.12, 8), PALETTE.gold, { x: 0.08, z: -0.08, y: 0.62, s: [0.5, 1, 1] }).add(G.ball(0.12, 8), PALETTE.gold, { x: 0.08, z: 0.08, y: 0.62, s: [0.5, 1, 1] });
  k.add(G.cone(0.14, 0.2, 4), PALETTE.gold, { x: 0.08, y: 0.5, rz: Math.PI });
  // flanking fence bits
  for (const sz of [-1, 1]) for (let i = 1; i <= 2; i++) {
    const z = sz * (half + 0.3 + i * 0.4);
    k.add(G.box(0.08, 0.6, 0.12), '#ffffff', { z, y: 0.3 }); k.add(G.ball(0.07, 8), '#ffffff', { z, y: 0.64 });
  }
  g.add(k.build(), contactShadow(2.4, 2.4, 'round', 0.2));
  g.position.set(b.cx, tileHeight(Math.floor(b.cx), Math.floor(b.cy)), b.cy);
  return g;
}

function fog(b: Barrier): { g: THREE.Group; update(t: number): void } {
  const g = new THREE.Group();
  const N = 22;
  const m = makeToon('#fff7fb', { transparent: true, opacity: 0.7 });
  m.depthWrite = false;
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), m, N);
  puffs.frustumCulled = false;
  g.add(puffs);
  const o = new THREE.Object3D();
  const base = tileHeight(Math.floor(b.cx), Math.floor(b.cy));
  const seed = (i: number) => { const s = Math.sin(i * 91.7 + 3.3) * 43758.5; return s - Math.floor(s); };
  const place = (t: number) => {
    for (let i = 0; i < N; i++) {
      const rx = seed(i), rz = seed(i + 40), rr = seed(i + 80);
      o.position.set(b.cx + (rx - 0.5) * 5.2 + Math.sin(t * 0.3 + i) * 0.25, base + 0.45 + rr * 1.1 + Math.sin(t * 0.5 + i * 1.7) * 0.1, b.cy + (rz - 0.5) * 1.8);
      const s = 0.55 + rr * 0.45;
      o.scale.set(s * 1.5, s, s * 1.2);
      o.updateMatrix();
      puffs.setMatrixAt(i, o.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
  };
  place(0);
  return { g, update: place };
}

export interface BarrierLayer { group: THREE.Group; update(t: number): void }

export function createBarriers(): BarrierLayer {
  const group = new THREE.Group();
  const recs = BARRIERS.map((b) => {
    const standing = new THREE.Group(); // everything shown while the barrier stands
    const opened = new THREE.Group(); // shown after (the mended bridge)
    let fx: ((t: number) => void) | null = null;
    switch (b.kind) {
      case 'logs': standing.add(logs(b)); break;
      case 'bridge': { const br = bridge(b); standing.add(br.broken); opened.add(br.mended); break; }
      case 'fog': { const f = fog(b); standing.add(f.g); fx = f.update; break; }
      case 'gate': standing.add(gate(b, b.id === 'meadowgate' ? 'pink' : 'mint')); break;
    }
    group.add(standing, opened);
    return { b, standing, opened, fx, state: null as boolean | null };
  });
  return {
    group,
    update(t) {
      for (const r of recs) {
        const open = barrierOpen(r.b.id);
        if (open !== r.state) { r.state = open; r.standing.visible = !open; r.opened.visible = open; } // ← poof/sparkle goes here later
        if (!open) r.fx?.(t);
      }
    },
  };
}
