// Fluffy blossom trees + flowers. Everything is instanced: trunks, crown puffs, blossom specks, drifting petals.
import * as THREE from 'three';
import { flowers, trees } from '../world';
import type { Season } from '../time';
import { contactGeometry, contactMaterial, makeToon, PALETTE, toon } from './materials';
import { tileHeight } from './terrain';

export interface Nature { group: THREE.Group; setSeason(s: Season): void; update(t: number, cx?: number, cz?: number): void }

const PUFFS = 9;       // crown puffs per tree
const SPECKS = 12;     // little blossoms dotted over the crown
const PETALS = 3;      // drifting petals per tree

/** Cheap deterministic 0..1 hash. */
const h01 = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

type Tone = 'main' | 'alt' | 'light' | 'white';

export function createNature(): Nature {
  const group = new THREE.Group();
  const n = trees.length;
  const trunkGeo = new THREE.CylinderGeometry(0.075, 0.16, 1, 8).translate(0, 0.5, 0);
  const trunk = new THREE.InstancedMesh(trunkGeo, toon(PALETTE.wood), n * 2); // trunk + one leaning branch
  const puff = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), makeToon('#ffffff'), n * PUFFS); // ~180 tris per puff (was 320): a big island has hundreds of trees
  const speck = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), makeToon('#ffffff', { flatShading: true }), n * SPECKS);
  const petalGeo = new THREE.CircleGeometry(0.055, 5).scale(1, 0.62, 1);
  const petalMat = makeToon('#ffffff', { ground: true });
  petalMat.side = THREE.DoubleSide;
  const petal = new THREE.InstancedMesh(petalGeo, petalMat, n * PETALS);
  petal.frustumCulled = false; // matrices move every frame
  // soft contact patch under every tree so the fluffy crowns sit on the ground
  const patch = new THREE.InstancedMesh(contactGeometry, contactMaterial('round', 0.22), n);
  patch.renderOrder = 1;
  trunk.castShadow = trunk.receiveShadow = puff.castShadow = puff.receiveShadow = true;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const e = new THREE.Euler(), q0 = new THREE.Quaternion();
  const puffTone: Tone[] = [], speckTone: Tone[] = [];
  const crowns: { x: number; y: number; z: number; r: number; top: number }[] = [];

  trees.forEach((t, i) => {
    const y = tileHeight(t.x, t.y), cx = t.x + 0.5, cz = t.y + 0.5;
    const seed = t.v + t.x * 31 + t.y * 57;
    const k = 0.78 + h01(seed) * 0.62;          // overall size: saplings to big old trees
    const trunkH = (0.75 + h01(seed + 1) * 0.35) * k;
    const lean = (h01(seed + 2) - 0.5) * 0.16;
    q.setFromEuler(e.set(0, 0, lean));
    m.compose(p.set(cx, y, cz), q, s.set(k, trunkH, k)); trunk.setMatrixAt(i * 2, m);
    const ba = h01(seed + 3) * Math.PI * 2;
    q.setFromEuler(e.set(Math.cos(ba) * 0.75, 0, Math.sin(ba) * 0.75));
    m.compose(p.set(cx, y + trunkH * 0.55, cz), q, s.set(k * 0.55, trunkH * 0.6, k * 0.55)); trunk.setMatrixAt(i * 2 + 1, m);
    m.compose(p.set(cx, y + 0.025, cz), q0, s.set(2.1 * k, 1, 2.1 * k)); patch.setMatrixAt(i, m);

    // crown: one core puff, a ring of side puffs, a couple on top. Slightly squashed so it reads as cloud-like.
    const cy = y + trunkH + 0.42 * k;
    const R = 0.6 * k;
    crowns.push({ x: cx, y: cy, z: cz, r: R, top: cy + R * 1.2 });
    const place = (j: number, ox: number, oy: number, oz: number, r: number, tone: Tone) => {
      m.compose(p.set(cx + ox * k, cy + oy * k, cz + oz * k), q0, s.set(r * k, r * k * 0.86, r * k));
      puff.setMatrixAt(i * PUFFS + j, m);
      puffTone[i * PUFFS + j] = tone;
    };
    place(0, 0, 0.05, 0, 0.6, 'main');
    const ring = 6, a0 = h01(seed + 4) * 6.28;
    for (let j = 0; j < ring; j++) {
      const a = a0 + (j / ring) * Math.PI * 2 + (h01(seed + 10 + j) - 0.5) * 0.4;
      const r = 0.36 + h01(seed + 20 + j) * 0.14, d = 0.46 + h01(seed + 30 + j) * 0.1;
      place(1 + j, Math.cos(a) * d, -0.12 + h01(seed + 40 + j) * 0.3, Math.sin(a) * d, r, j % 3 === 0 ? 'light' : j % 2 ? 'alt' : 'main');
    }
    place(7, 0.12, 0.5, -0.08, 0.4, 'light');
    place(8, -0.22, 0.42, 0.12, 0.3, 'white');

    // blossom specks scattered on the upper/front crown surface
    for (let j = 0; j < SPECKS; j++) {
      const a = h01(seed + 60 + j) * Math.PI * 2, el = 0.15 + h01(seed + 80 + j) * 1.1;
      const rr = R * 1.42, sz = (0.045 + h01(seed + 100 + j) * 0.035) * k;
      q.setFromEuler(e.set(a, el, a * 2));
      m.compose(p.set(cx + Math.cos(a) * Math.cos(el) * rr, cy + Math.sin(el) * rr * 0.8 + 0.05 * k, cz + Math.sin(a) * Math.cos(el) * rr), q, s.setScalar(sz));
      speck.setMatrixAt(i * SPECKS + j, m);
      speckTone[i * SPECKS + j] = j % 3 === 0 ? 'white' : j % 3 === 1 ? 'light' : 'alt';
    }
  });
  group.add(trunk, puff, speck, petal, patch);

  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 5), makeToon('#ffffff'), flowers.length);
  fl.receiveShadow = true;
  const col = new THREE.Color();
  flowers.forEach((f, i) => {
    const x = f.x + f.ox / 32, z = f.y + f.oy / 32;
    m.compose(p.set(x, tileHeight(f.x, f.y) + 0.1, z), q0, s.set(1, 1, 1)); fl.setMatrixAt(i, m);
    fl.setColorAt(i, col.set(f.c));
  });
  group.add(fl);

  let primed = false; // the first update places every petal once so far trees don't leave theirs at the origin
  const white = new THREE.Color('#ffffff'), c = new THREE.Color(), blossom = new THREE.Color(PALETTE.blush);
  return {
    group,
    setSeason(season) {
      const snowy = season.id === 'snowfluff';
      const tone = (tn: Tone, alt: boolean) => {
        switch (tn) {
          case 'main': return c.set(alt ? season.leafAlt : season.leaf);
          case 'alt': return c.set(alt ? season.leaf : season.leafAlt);
          case 'light': return c.set(season.leaf).lerp(white, snowy ? 0.85 : 0.5);
          default: return c.copy(white).lerp(blossom, snowy ? 0 : 0.18);
        }
      };
      trees.forEach((t, i) => {
        const alt = t.v % 2 === 1;
        for (let j = 0; j < PUFFS; j++) puff.setColorAt(i * PUFFS + j, tone(puffTone[i * PUFFS + j], alt));
        // specks are always blossom-colored (pink / white), so trees read as in bloom even with green leaves
        for (let j = 0; j < SPECKS; j++) {
          const tn = speckTone[i * SPECKS + j];
          speck.setColorAt(i * SPECKS + j, tn === 'white' ? c.copy(white) : tn === 'light' ? c.set(PALETTE.petal) : c.set(snowy ? '#ffffff' : PALETTE.rose));
        }
        for (let j = 0; j < PETALS; j++) petal.setColorAt(i * PETALS + j, j % 2 ? c.set(season.petal) : c.set(season.petal).lerp(white, 0.5));
      });
      for (const im of [puff, speck, petal]) if (im.instanceColor) im.instanceColor.needsUpdate = true;
      fl.visible = !snowy;
    },
    update(t, cx = 0, cz = 0) {
      // a few petals drifting down from each crown (only the trees near the camera: far ones are fogged anyway)
      for (let i = 0; i < n; i++) {
        const cr = crowns[i];
        if (primed && (cr.x - cx) ** 2 + (cr.z - cz) ** 2 > 30 * 30) continue;
        for (let j = 0; j < PETALS; j++) {
          const id = i * PETALS + j, r1 = h01(id + 0.5), r2 = h01(id * 3.7 + 9);
          const life = (t * (0.07 + r1 * 0.05) + r2) % 1;
          const a = r2 * 6.28 + Math.sin(t * 0.6 + id) * 0.5, d = cr.r * (0.7 + r1 * 0.9) + life * 0.5;
          const fade = Math.min(1, life * 8, (1 - life) * 8);
          p.set(cr.x + Math.cos(a) * d + Math.sin(t * 1.3 + id) * 0.12, cr.top - life * (cr.top - (cr.y - cr.r * 1.6)) * 0.95, cr.z + Math.sin(a) * d);
          q.setFromEuler(e.set(t * (1 + r1) + id, t * 0.8 + r2 * 6, id));
          m.compose(p, q, s.setScalar(fade * (0.8 + r1 * 0.6)));
          petal.setMatrixAt(id, m);
        }
      }
      petal.instanceMatrix.needsUpdate = true;
      primed = true;
    },
  };
}
