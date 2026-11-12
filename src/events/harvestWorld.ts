// Harvest Hush Feast: the autumn dressing of Sugarlily Square, built from Three.js primitives like the rest of the
// world. Leaf garlands, strings of warm paper lanterns, pumpkins in pink / peach / cream, drifts of fallen leaves,
// hay bales, and a long feast table with a lantern canopy. Everything is instanced where it repeats.
import * as THREE from 'three';
import { lightPool, makeToon, PALETTE } from '../render/materials';
import { heightAtUnits } from '../render/terrain';
import { ball, box, cyl, makeLabel, mat } from '../render/util';
import type { EventWorld } from '../events';
import { CANOPY_POSTS, LAMPS, TABLE, TABLE_CENTER } from './harvestLayout';

// deterministic jitter so the square looks the same every time it is built
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length];

const LEAF = ['#ffb48a', '#ff9fa8', '#ffd36e', '#f6946f', '#ffc2d8', '#e3a56d', '#ffa763'];
const PUMPKIN = ['#ffa763', '#ffb877', '#ffc2a0', '#fff0d6', '#ffb3c6', '#f6946f'];
const PAPER = ['#ffd9a8', '#ffb8c8', '#fff0d6', '#ffcf8a', '#f9b8d8'];

const dummy = new THREE.Object3D();
const col = new THREE.Color();

interface Inst { mesh: THREE.InstancedMesh; n: number; add(x: number, y: number, z: number, s: [number, number, number], ry: number, color: string, rx?: number, rz?: number): void; done(): void }
/** Instanced mesh with per-instance colour. `cap` is the most instances it will ever hold. */
function instanced(geo: THREE.BufferGeometry, material: THREE.Material, cap: number): Inst {
  const mesh = new THREE.InstancedMesh(geo, material, cap);
  mesh.castShadow = true;
  const inst: Inst = {
    mesh, n: 0,
    add(x, y, z, s, ry, color, rx = 0, rz = 0) {
      if (inst.n >= cap) return;
      dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(...s); dummy.updateMatrix();
      mesh.setMatrixAt(inst.n, dummy.matrix); mesh.setColorAt(inst.n, col.set(color)); inst.n++;
    },
    done() { mesh.count = inst.n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; },
  };
  return inst;
}

const ground = (x: number, z: number) => heightAtUnits(x, z);

/** A hanging curve between two points: sags in the middle. */
function strand(a: THREE.Vector3, b: THREE.Vector3, sag: number, steps: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t));
  }
  return out;
}

export function createHarvestWorld(): EventWorld {
  let flames: THREE.Mesh[] = [];

  return {
    build() {
      const root = new THREE.Group();
      root.name = 'event-harvest';
      const r = rng(2611);
      flames = [];

      // ---------- shared geometry / materials ----------
      const leafGeo = new THREE.SphereGeometry(0.5, 8, 6);
      const leafMat = makeToon('#ffffff');
      const bodyGeo = new THREE.SphereGeometry(0.5, 14, 10);
      const pumpMat = makeToon('#ffffff');
      const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6);
      const stemMat = makeToon('#86c279');
      const paperGeo = new THREE.CylinderGeometry(0.1, 0.075, 0.2, 10);
      const paperMat = makeToon('#ffffff', { emissive: '#ffb86b', glow: 'lamp' });
      const wireMat = mat('#8a6a58');

      // ---------- strings of lanterns + leaf garlands ----------
      const lampTop = (p: { x: number; z: number }, y = 1.72) => new THREE.Vector3(p.x + 0.5, ground(p.x + 0.5, p.z + 0.5) + y, p.z + 0.5);
      const strands: { a: THREE.Vector3; b: THREE.Vector3; sag: number; kind: 'lights' | 'leaves' }[] = [];
      const ring: typeof LAMPS = [LAMPS[0], LAMPS[1], LAMPS[3], LAMPS[2]];
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        strands.push({ a: lampTop(a), b: lampTop(b), sag: 0.5, kind: 'lights' });
        strands.push({ a: lampTop(a, 1.38), b: lampTop(b, 1.38), sag: 0.62, kind: 'leaves' });
      }
      // lamp near the grove road and the garden: a short garland each, to make the whole town feel dressed
      strands.push({ a: lampTop({ x: 51, z: 37 }, 1.38), b: lampTop({ x: 61, z: 39 }, 1.38), sag: 1.0, kind: 'leaves' });
      strands.push({ a: lampTop({ x: 44, z: 37 }, 1.38), b: lampTop({ x: 34, z: 46 }, 1.38), sag: 1.4, kind: 'leaves' });
      // the lantern canopy over the table
      const post = (p: { x: number; z: number }) => new THREE.Vector3(p.x, ground(p.x, p.z) + 1.7, p.z);
      const [nw, ne, sw, se] = CANOPY_POSTS.map(post);
      for (const [a, b] of [[nw, ne], [sw, se], [nw, sw], [ne, se]] as const) strands.push({ a, b, sag: 0.3, kind: 'lights' });
      strands.push({ a: nw.clone().lerp(ne, 0.5), b: sw.clone().lerp(se, 0.5), sag: 0.4, kind: 'lights' });
      strands.push({ a: nw.clone().setY(1.42 + ground(nw.x, nw.z)), b: ne.clone().setY(1.42 + ground(ne.x, ne.z)), sag: 0.38, kind: 'leaves' });
      strands.push({ a: sw.clone().setY(1.42 + ground(sw.x, sw.z)), b: se.clone().setY(1.42 + ground(se.x, se.z)), sag: 0.38, kind: 'leaves' });

      const lantern = instanced(paperGeo, paperMat, 220);
      const leaves = instanced(leafGeo, leafMat, 520);
      const wire = new THREE.Group();
      for (const s of strands) {
        const len = s.a.distanceTo(s.b);
        const pts = strand(s.a, s.b, s.sag, Math.max(8, Math.round(len * 3)));
        wire.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.014, 5), wireMat));
        if (s.kind === 'lights') {
          const n = Math.max(4, Math.round(len * 1.5));
          for (let i = 1; i < n; i++) {
            const p = pts[Math.round((i / n) * (pts.length - 1))];
            lantern.add(p.x, p.y - 0.11, p.z, [1, 1, 1], r() * 6, pick(r, PAPER));
          }
        } else {
          for (let i = 1; i < pts.length - 1; i++) {
            const p = pts[i];
            for (let k = 0; k < 2; k++) {
              leaves.add(p.x + (r() - 0.5) * 0.14, p.y - 0.06 - r() * 0.14, p.z + (r() - 0.5) * 0.14, [0.2 + r() * 0.08, 0.04, 0.12 + r() * 0.05], r() * 6.3, pick(r, LEAF), (r() - 0.5) * 0.8, (r() - 0.5) * 0.9);
            }
            if (i % 5 === 0) leaves.add(p.x, p.y - 0.12, p.z, [0.09, 0.09, 0.09], 0, '#ff8fb6'); // a rosehip berry now and then
          }
        }
      }
      lantern.done();
      root.add(wire, lantern.mesh);

      // ---------- fallen leaves around the posts, the table and the fountain ----------
      const drift = (cx: number, cz: number, rad: number, n: number) => {
        for (let i = 0; i < n; i++) {
          const a = r() * 6.3, d = Math.sqrt(r()) * rad;
          const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
          leaves.add(x, ground(x, z) + 0.03 + r() * 0.04, z, [0.2 + r() * 0.1, 0.03, 0.12 + r() * 0.06], r() * 6.3, pick(r, LEAF), (r() - 0.5) * 0.3, (r() - 0.5) * 0.3);
        }
      };
      for (const l of LAMPS) drift(l.x + 0.5, l.z + 0.5, 1.0, 14);
      drift(TABLE_CENTER.x, TABLE_CENTER.z, 2.6, 36);
      drift(48.5, 42.5, 2.3, 22);
      drift(41.5, 36.6, 1.8, 10); drift(54.5, 36.6, 1.8, 10);

      // ---------- pumpkins (and a few gourds) ----------
      const pBody = instanced(bodyGeo, pumpMat, 90);
      const pRibA = instanced(bodyGeo, pumpMat, 90);
      const pRibB = instanced(bodyGeo, pumpMat, 90);
      const pStem = instanced(stemGeo, stemMat, 90);
      const pumpkin = (x: number, z: number, size = 1, color?: string) => {
        const y = ground(x, z), c = color ?? pick(r, PUMPKIN), rot = r() * 6.3, w = 0.34 * size, h = 0.27 * size;
        pBody.add(x, y + h, z, [w * 2, h * 1.8, w * 2], rot, c);
        pRibA.add(x, y + h, z, [w * 1.5, h * 1.78, w * 2.05], rot + 1.05, c);
        pRibB.add(x, y + h, z, [w * 1.5, h * 1.78, w * 2.05], rot - 1.05, c);
        pStem.add(x + 0.02 * size, y + h * 1.95, z, [size, size, size], rot, '#86c279', 0, 0.25);
      };
      const cluster = (cx: number, cz: number, n: number, spread = 0.5, size = 1) => {
        for (let i = 0; i < n; i++) pumpkin(cx + (r() - 0.5) * spread * 2, cz + (r() - 0.5) * spread * 2, size * (0.65 + r() * 0.55));
      };
      for (const l of LAMPS) cluster(l.x + 0.5 + 0.3, l.z + 0.5 + 0.35, 3, 0.35, 0.85);
      cluster(61.5 + 0.3, 39.5 + 0.35, 3, 0.35, 0.85); cluster(34.5 + 0.3, 46.5 + 0.35, 3, 0.35, 0.85);
      for (const [x, z] of [[37.7, 35.1], [44.8, 35.1], [50.6, 35.1], [57.7, 35.1]]) cluster(x, z, 3, 0.4, 1);
      // a ring around the fountain, skipping the side facing the table
      for (let i = 0; i < 9; i++) {
        const a = 0.95 + (i / 8) * (Math.PI * 2 - 1.9);
        pumpkin(48.5 + Math.cos(a) * 1.95, 42.5 + Math.sin(a) * 1.95, 0.7 + r() * 0.35);
      }
      // the table ends, and one giant showpiece
      cluster(TABLE.cx - 0.2, 39.2, 4, 0.55, 1.1); cluster(TABLE.cx + 0.2, 45.3, 4, 0.55, 1.1);
      pumpkin(TABLE.cx - 1.6, 39.5, 1.9, '#ffb877');
      for (const p of [pBody, pRibA, pRibB, pStem]) { p.done(); root.add(p.mesh); }
      leaves.done();
      root.add(leaves.mesh);

      // ---------- hay bales ----------
      for (const [x, z, ry] of [[TABLE.cx - 1.55, 45.2, 0.4], [TABLE.cx + 1.7, 39.2, -0.3], [TABLE.cx + 1.9, 45.0, 0.9]] as const) {
        const g = new THREE.Group();
        const bale = cyl(0.4, 0.4, 0.56, '#f3d28b', 0, 0.4, 0, 16); bale.rotation.x = Math.PI / 2; g.add(bale);
        const band = cyl(0.415, 0.415, 0.09, '#ffb3cf', 0, 0.4, 0, 16); band.rotation.x = Math.PI / 2; g.add(band);
        g.add(ball(0.06, '#ff8fb6', 0, 0.82, 0.0, 8));
        g.position.set(x, ground(x, z), z); g.rotation.y = ry;
        root.add(g);
      }

      // ---------- the long feast table ----------
      const table = new THREE.Group();
      const len = TABLE.z1 - TABLE.z0, ty = TABLE.height;
      table.add(box(TABLE.halfW * 2, 0.07, len, '#e8b98a', 0, ty - 0.05, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(box(0.07, ty - 0.05, 0.07, '#c98f5f', sx * (TABLE.halfW - 0.05), (ty - 0.05) / 2, sz * (len / 2 - 0.1)));
      table.add(box(TABLE.halfW * 2 + 0.14, 0.04, len + 0.06, '#fff6ea', 0, ty - 0.005, 0)); // cloth
      for (const sx of [-1, 1]) table.add(box(0.03, 0.2, len + 0.06, '#fff6ea', sx * (TABLE.halfW + 0.07), ty - 0.12, 0)); // hanging edge
      table.add(box(0.3, 0.012, len - 0.1, '#ffb3cf', 0, ty + 0.02, 0)); // pink runner
      for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) table.add(ball(0.045, '#ffb3cf', sx * (TABLE.halfW + 0.08), ty - 0.2, -len / 2 + 0.25 + i * ((len - 0.5) / 8), 8)); // scallop dots
      const pie = (x: number, z: number, filling: string, lattice: boolean) => {
        table.add(cyl(0.15, 0.13, 0.06, '#f5cf9c', x, ty + 0.06, z, 14));
        table.add(cyl(0.115, 0.115, 0.04, filling, x, ty + 0.1, z, 14));
        if (lattice) { table.add(box(0.2, 0.012, 0.02, '#f5cf9c', x, ty + 0.125, z)); table.add(box(0.02, 0.012, 0.2, '#f5cf9c', x, ty + 0.125, z)); }
        else table.add(ball(0.05, '#ffffff', x, ty + 0.14, z, 8));
      };
      const zAt = (i: number, n: number) => -len / 2 + 0.3 + (i / (n - 1)) * (len - 0.6);
      pie(0, zAt(0, 7), '#ffa14f', false); pie(0, zAt(2, 7), '#ff7f93', true); pie(0, zAt(4, 7), '#ffa14f', false); pie(0, zAt(6, 7), '#f0b565', true);
      // centrepieces: a pumpkin pair, candles, a gourd basket
      table.add(ball(0.17, '#ffb877', 0, ty + 0.2, zAt(3, 7), 12)); table.add(ball(0.11, '#fff0d6', 0.12, ty + 0.15, zAt(3, 7) + 0.1, 10));
      table.add(ball(0.13, '#ffc2a0', 0, ty + 0.17, zAt(1, 7) + 0.2, 10));
      table.add(ball(0.12, '#ffa763', 0, ty + 0.16, zAt(5, 7) - 0.2, 10));
      for (const i of [1, 3, 5]) {
        for (const sx of [-1, 1]) {
          const z = zAt(i, 7) + 0.0;
          table.add(cyl(0.035, 0.04, 0.12, '#fff6ea', sx * 0.22, ty + 0.08, z, 8));
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('#fff3c4', PALETTE.lampGlow, 'lamp'));
          f.scale.set(0.8, 1.5, 0.8); f.position.set(sx * 0.22, ty + 0.19, z); flames.push(f); table.add(f);
        }
      }
      // plates, cups and napkins at every seat
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
        const z = -len / 2 + 0.55 + i * 0.95, x = sx * 0.33;
        table.add(cyl(0.11, 0.1, 0.02, '#ffffff', x, ty + 0.03, z, 14)); table.add(cyl(0.075, 0.075, 0.012, '#ffd0e2', x, ty + 0.043, z, 12));
        table.add(cyl(0.035, 0.03, 0.07, '#ffe6ef', x, ty + 0.06, z - 0.2, 10));
        table.add(box(0.08, 0.01, 0.06, '#c9a8e8', x + sx * 0.12, ty + 0.03, z + 0.02));
      }
      table.position.set(TABLE.cx, ground(TABLE.cx, TABLE_CENTER.z), TABLE_CENTER.z);
      root.add(table);

      // canopy posts: wood pole, pumpkin finial, leaf collar, paper lantern on top
      for (const p of CANOPY_POSTS) {
        const g = new THREE.Group();
        g.add(cyl(0.04, 0.055, 1.7, '#b98a62', 0, 0.85, 0, 8));
        g.add(ball(0.11, '#ffb877', 0, 1.74, 0, 10));
        g.add(cyl(0.012, 0.012, 0.08, '#86c279', 0, 1.86, 0, 5));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12), mat('#ff9fa8')); ring.rotation.x = Math.PI / 2; ring.position.y = 1.5; g.add(ring);
        g.position.set(p.x, ground(p.x, p.z), p.z);
        root.add(g);
      }

      // a swaying sign, and the warm pool of light under the canopy
      const sign = makeLabel('Harvest Hush Feast', 2.1);
      sign.position.set(TABLE.cx, ground(TABLE.cx, 39.5) + 1.25, 39.55);
      root.add(sign);
      const canopyGlow = lightPool(3.8, 5.6, '#ffc58a', 0.55, 'rect');
      canopyGlow.position.set(TABLE_CENTER.x, ground(TABLE_CENTER.x, TABLE_CENTER.z) + 0.04, TABLE_CENTER.z);
      root.add(canopyGlow);

      return root;
    },

    update(t) {
      for (let i = 0; i < flames.length; i++) {
        const f = flames[i];
        const k = 1 + Math.sin(t * 9 + i * 1.7) * 0.12 + Math.sin(t * 15 + i) * 0.06;
        f.scale.set(0.8 * k, 1.5 * (2 - k), 0.8 * k);
      }
    },
  };
}
