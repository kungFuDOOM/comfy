// Harvest Hush Feast: the autumn dressing of Sugarlily Square, built from Three.js primitives like the rest of the
// world. Leaf garlands, strings of warm paper lanterns, pumpkins in pink / peach / cream, drifts of fallen leaves,
// hay bales, and a long feast table with a lantern canopy. Everything is instanced where it repeats.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

// soft autumn pastels: peach, apricot, butter and rose. Nothing saturated orange, nothing brown.
const LEAF = ['#ffc09a', '#ffa9b4', '#ffdc8f', '#f9a98c', '#ffcbdc', '#f6c08f', '#ffb685', '#f3a3b6'];
const PUMPKIN = ['#ffb383', '#ffc08c', '#ffcdb0', '#fff0d6', '#ffbccd', '#f9ad94'];
const PAPER = ['#ffe1b8', '#ffc4d2', '#fff3e0', '#ffd9a6', '#fbc6de'];
const TRIM = ['#f29bb0', '#f4b990', '#e9a6c8'];
const STEM = '#a3d19a';

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
  // things that move in the breeze: hanging lanterns, garland leaves, and the pools of light that breathe
  interface Hung { i: number; x: number; y: number; z: number; ry: number; sc: number; ph: number }
  interface Flutter { i: number; x: number; y: number; z: number; s: [number, number, number]; ry: number; rx: number; rz: number; ph: number }
  let hung: Hung[] = [], flutter: Flutter[] = [];
  let lanternMeshes: THREE.InstancedMesh[] = [], leafMesh: THREE.InstancedMesh | null = null;
  let pools: { m: THREE.Mesh; w: number; d: number; ph: number }[] = [];
  let paperGlow: THREE.MeshToonMaterial | null = null;
  const GLOW = new THREE.Color('#ffb59c'); // rosy apricot, not orange

  return {
    build() {
      const root = new THREE.Group();
      root.name = 'event-harvest';
      const r = rng(2611);
      flames = []; hung = []; flutter = []; pools = [];

      // ---------- shared geometry / materials ----------
      const leafGeo = new THREE.SphereGeometry(0.5, 8, 6);
      const leafMat = makeToon('#ffffff');
      const bodyGeo = new THREE.SphereGeometry(0.5, 14, 10);
      const pumpMat = makeToon('#ffffff');
      const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6);
      const stemMat = makeToon('#ffffff');
      // round paper lanterns that hang from their top (origin on the string) so they can swing
      const paperGeo = new THREE.SphereGeometry(0.1, 14, 10).scale(1, 1.12, 1).translate(0, -0.15, 0);
      const paperMat = makeToon('#ffffff', { emissive: '#ffb59c', glow: 'lamp' });
      paperGlow = paperMat;
      const trimGeo = mergeGeometries([
        new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4).translate(0, -0.02, 0),   // thread
        new THREE.CylinderGeometry(0.042, 0.052, 0.026, 10).translate(0, -0.045, 0), // top cap
        new THREE.CylinderGeometry(0.05, 0.04, 0.024, 10).translate(0, -0.256, 0),   // bottom cap
        new THREE.CylinderGeometry(0.008, 0.02, 0.085, 6).translate(0, -0.31, 0),    // tassel
      ]);
      const trimMat = makeToon('#ffffff');
      const wireMat = mat('#b9968a');

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
      const trim = instanced(trimGeo, trimMat, 220);
      const leaves = instanced(leafGeo, leafMat, 900);
      const glowAt: THREE.Vector3[] = [];
      const wire = new THREE.Group();
      for (const s of strands) {
        const len = s.a.distanceTo(s.b);
        const pts = strand(s.a, s.b, s.sag, Math.max(8, Math.round(len * 3)));
        wire.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.014, 5), wireMat));
        if (s.kind === 'lights') {
          const n = Math.max(4, Math.round(len * 1.5));
          for (let i = 1; i < n; i++) {
            const p = pts[Math.round((i / n) * (pts.length - 1))];
            const ry = r() * 6, sc = 0.92 + r() * 0.2;
            hung.push({ i: lantern.n, x: p.x, y: p.y, z: p.z, ry, sc, ph: r() * 6.3 });
            lantern.add(p.x, p.y, p.z, [sc, sc, sc], ry, pick(r, PAPER));
            trim.add(p.x, p.y, p.z, [sc, sc, sc], ry, pick(r, TRIM));
          }
          glowAt.push(pts[Math.floor(pts.length / 2)]);
        } else {
          for (let i = 1; i < pts.length - 1; i++) {
            const p = pts[i];
            // fuller in the middle of each swag, tapering towards the posts
            const full = 0.75 + 0.45 * Math.sin((i / (pts.length - 1)) * Math.PI);
            for (let k = 0; k < 3; k++) {
              const f: Flutter = {
                i: leaves.n, x: p.x + (r() - 0.5) * 0.13, y: p.y - 0.05 - r() * 0.15 * full, z: p.z + (r() - 0.5) * 0.13,
                s: [(0.17 + r() * 0.08) * full, 0.035, (0.11 + r() * 0.05) * full], ry: r() * 6.3, rx: (r() - 0.5) * 0.8, rz: (r() - 0.5) * 0.9, ph: r() * 6.3,
              };
              flutter.push(f);
              leaves.add(f.x, f.y, f.z, f.s, f.ry, pick(r, LEAF), f.rx, f.rz);
            }
            if (i % 4 === 0) { // a pair of rosehip berries now and then
              leaves.add(p.x, p.y - 0.11, p.z, [0.075, 0.075, 0.075], 0, '#ff8fb6');
              leaves.add(p.x + 0.05, p.y - 0.15, p.z + 0.03, [0.055, 0.055, 0.055], 0, '#ffb3cf');
            }
          }
        }
      }
      lantern.done(); trim.done();
      lantern.mesh.castShadow = false; // glowing paper should not throw hard little shadows
      lanternMeshes = [lantern.mesh, trim.mesh];
      root.add(wire, lantern.mesh, trim.mesh);
      // a faint rosy pool on the ground under the middle of each string of lanterns
      for (const p of glowAt) {
        const g = lightPool(2.6, 2.6, '#ffc3b0', 0.2);
        g.position.set(p.x, ground(p.x, p.z) + 0.04, p.z);
        pools.push({ m: g, w: 2.6, d: 2.6, ph: r() * 6.3 });
        root.add(g);
      }

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
        pStem.add(x + 0.02 * size, y + h * 1.95, z, [size, size, size], rot, STEM, 0, 0.25);
        // a little curled leaf beside the stem
        leaves.add(x + Math.cos(rot) * 0.09 * size, y + h * 1.84, z + Math.sin(rot) * 0.09 * size, [0.16 * size, 0.03 * size, 0.1 * size], -rot, '#b5dba6', 0, 0.35);
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
      pumpkin(TABLE.cx - 1.6, 39.5, 1.9, '#ffc08c');
      { // the showpiece wears a pink ribbon bow
        const bx = TABLE.cx - 1.6, bz = 39.5 + 0.67, by = ground(bx, bz) + 0.56;
        for (const sx of [-1, 1]) { const loop = ball(0.085, '#ffb3cf', bx + sx * 0.09, by, bz, 10); loop.scale.set(1, 0.72, 0.5); loop.rotation.z = sx * 0.35; root.add(loop); }
        for (const sx of [-1, 1]) { const tail = box(0.045, 0.15, 0.02, '#ffb3cf', bx + sx * 0.045, by - 0.1, bz + 0.01); tail.rotation.z = sx * 0.3; root.add(tail); }
        root.add(ball(0.04, '#ff8fb6', bx, by, bz + 0.02, 8));
      }
      for (const p of [pBody, pRibA, pRibB, pStem]) { p.done(); root.add(p.mesh); }
      leaves.done();
      leafMesh = leaves.mesh;
      root.add(leaves.mesh);

      // ---------- hay bales ----------
      for (const [x, z, ry] of [[TABLE.cx - 1.55, 45.2, 0.4], [TABLE.cx + 1.7, 39.2, -0.3], [TABLE.cx + 1.9, 45.0, 0.9]] as const) {
        const g = new THREE.Group();
        const bale = cyl(0.4, 0.4, 0.56, '#f7dfa6', 0, 0.4, 0, 16); bale.rotation.x = Math.PI / 2; g.add(bale);
        for (const bz of [-0.15, 0.15]) { const band = cyl(0.412, 0.412, 0.05, '#ffc2d8', 0, 0.4, bz, 16); band.rotation.x = Math.PI / 2; g.add(band); }
        for (const sx of [-1, 1]) { const loop = ball(0.06, '#ffb3cf', sx * 0.06, 0.83, 0.15, 8); loop.scale.set(1, 0.7, 0.5); g.add(loop); }
        g.add(ball(0.03, '#ff8fb6', 0, 0.83, 0.15, 8));
        g.position.set(x, ground(x, z), z); g.rotation.y = ry;
        root.add(g);
      }

      // ---------- the long feast table ----------
      const table = new THREE.Group();
      const len = TABLE.z1 - TABLE.z0, ty = TABLE.height;
      table.add(box(TABLE.halfW * 2, 0.07, len, '#ecc49c', 0, ty - 0.05, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(cyl(0.035, 0.05, ty - 0.05, '#dba983', sx * (TABLE.halfW - 0.06), (ty - 0.05) / 2, sz * (len / 2 - 0.1), 10)); // turned legs
      const CLOTH = '#fff7ee', LACE = '#ffd6e4';
      table.add(box(TABLE.halfW * 2 + 0.14, 0.04, len + 0.06, CLOTH, 0, ty - 0.005, 0)); // cloth
      for (const sx of [-1, 1]) table.add(box(0.03, 0.17, len + 0.06, CLOTH, sx * (TABLE.halfW + 0.07), ty - 0.105, 0)); // hanging edge
      // scalloped hem: cream half-rounds with a pink bead between each pair
      const SC = 14, step = (len + 0.06) / SC;
      for (let i = 0; i < SC; i++) for (const sx of [-1, 1]) {
        const z = -(len + 0.06) / 2 + step * (i + 0.5), x = sx * (TABLE.halfW + 0.07);
        const sc = ball(step / 2, i % 2 ? LACE : CLOTH, x, ty - 0.19, z, 10); sc.scale.set(0.04 / step, 0.62, 1); table.add(sc);
        if (i > 0) table.add(ball(0.02, '#ffb3cf', x + sx * 0.012, ty - 0.185, z - step / 2, 8));
      }
      table.add(box(0.38, 0.01, len - 0.06, LACE, 0, ty + 0.018, 0)); // lace under the runner
      table.add(box(0.29, 0.012, len - 0.1, '#ffbcd4', 0, ty + 0.022, 0)); // pink runner
      for (const x of [-0.11, 0.11]) table.add(box(0.012, 0.013, len - 0.1, '#fff7ee', x, ty + 0.023, 0)); // two cream stitches
      const pie = (x: number, z: number, filling: string, lattice: boolean) => {
        table.add(cyl(0.15, 0.13, 0.06, '#f5cf9c', x, ty + 0.06, z, 14));
        table.add(cyl(0.115, 0.115, 0.04, filling, x, ty + 0.1, z, 14));
        const crust = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.022, 6, 18), mat('#f9dcb2')); crust.rotation.x = Math.PI / 2; crust.position.set(x, ty + 0.105, z); table.add(crust); // crimped rim
        if (lattice) for (const o of [-0.05, 0.05]) { table.add(box(0.2, 0.012, 0.022, '#f9dcb2', x, ty + 0.125, z + o)); table.add(box(0.022, 0.012, 0.2, '#f9dcb2', x + o, ty + 0.127, z)); }
        else { const cream = ball(0.05, '#ffffff', x, ty + 0.135, z, 10); cream.scale.y = 0.75; table.add(cream); table.add(ball(0.02, '#ff8fb6', x, ty + 0.175, z, 8)); }
      };
      const zAt = (i: number, n: number) => -len / 2 + 0.3 + (i / (n - 1)) * (len - 0.6);
      pie(0, zAt(0, 7), '#ffb070', false); pie(0, zAt(2, 7), '#ff94a6', true); pie(0, zAt(4, 7), '#ffb070', false); pie(0, zAt(6, 7), '#f6c47e', true);
      // centrepieces: a pumpkin pair, candles, a gourd basket
      const mini = (x: number, z: number, rad: number, c: string) => { // squat little table pumpkin with a stem
        const p = ball(rad, c, x, ty + 0.03 + rad * 0.78, z, 12); p.scale.y = 0.78; table.add(p);
        table.add(cyl(0.012, 0.018, 0.05, STEM, x, ty + 0.03 + rad * 1.6, z, 6));
      };
      mini(0, zAt(3, 7), 0.17, '#ffc08c'); mini(0.14, zAt(3, 7) + 0.13, 0.1, '#fff0d6');
      mini(0, zAt(1, 7) + 0.22, 0.12, '#ffbccd');
      mini(0, zAt(5, 7) - 0.22, 0.12, '#ffcdb0');
      for (const i of [1, 3, 5]) {
        for (const sx of [-1, 1]) {
          const z = zAt(i, 7) + 0.0;
          table.add(cyl(0.05, 0.055, 0.014, '#ffd6e4', sx * 0.22, ty + 0.032, z, 12)); // saucer
          table.add(cyl(0.03, 0.034, 0.12, sx < 0 ? '#fff7ee' : '#ffd6e4', sx * 0.22, ty + 0.095, z, 10));
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#fff3d0', PALETTE.lampGlow, 'lamp'));
          f.scale.set(0.8, 1.5, 0.8); f.position.set(sx * 0.22, ty + 0.195, z); flames.push(f); table.add(f);
        }
        // candlelight spilling over the cloth
        const spill = lightPool(1.0, 1.0, '#ffd2b8', 0.3);
        spill.position.set(0, ty + 0.03, zAt(i, 7));
        pools.push({ m: spill, w: 1.0, d: 1.0, ph: i * 2.1 });
        table.add(spill);
      }
      // plates, cups and napkins at every seat
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
        const z = -len / 2 + 0.55 + i * 0.95, x = sx * 0.33;
        table.add(cyl(0.11, 0.1, 0.02, '#ffffff', x, ty + 0.03, z, 14)); table.add(cyl(0.075, 0.075, 0.012, '#ffd0e2', x, ty + 0.043, z, 12));
        table.add(cyl(0.035, 0.03, 0.07, '#ffe6ef', x, ty + 0.06, z - 0.2, 10));
        table.add(box(0.08, 0.01, 0.06, '#ffc9dc', x + sx * 0.13, ty + 0.03, z + 0.02));
      }
      table.position.set(TABLE.cx, ground(TABLE.cx, TABLE_CENTER.z), TABLE_CENTER.z);
      root.add(table);

      // canopy posts: wood pole, pumpkin finial, leaf collar, paper lantern on top
      for (const p of CANOPY_POSTS) {
        const g = new THREE.Group();
        g.add(cyl(0.04, 0.055, 1.7, '#d9ab8a', 0, 0.85, 0, 10));
        g.add(cyl(0.075, 0.085, 0.07, '#e6bd9f', 0, 0.035, 0, 12)); // foot
        for (const y of [0.55, 1.0]) g.add(cyl(0.05, 0.052, 0.045, '#ffc2d8', 0, y, 0, 10)); // ribbon wraps
        const fin = ball(0.11, '#ffc08c', 0, 1.74, 0, 12); fin.scale.y = 0.82; g.add(fin);
        g.add(cyl(0.012, 0.016, 0.07, STEM, 0, 1.85, 0, 5));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 14), mat('#ffb0bf')); ring.rotation.x = Math.PI / 2; ring.position.y = 1.5; g.add(ring);
        g.position.set(p.x, ground(p.x, p.z), p.z);
        root.add(g);
      }

      // a swaying sign, and the warm pool of light under the canopy
      const sign = makeLabel('Harvest Hush Feast', 2.1);
      sign.position.set(TABLE.cx, ground(TABLE.cx, 39.5) + 1.25, 39.55);
      root.add(sign);
      // warm apricot under the canopy, wrapped in a wider, fainter rose halo so the edge melts away
      const gy = ground(TABLE_CENTER.x, TABLE_CENTER.z);
      const canopyGlow = lightPool(4.0, 5.8, '#ffcbab', 0.42, 'rect');
      canopyGlow.position.set(TABLE_CENTER.x, gy + 0.04, TABLE_CENTER.z);
      const halo = lightPool(7.4, 8.8, '#ffb4c4', 0.16);
      halo.position.set(TABLE_CENTER.x, gy + 0.045, TABLE_CENTER.z);
      pools.push({ m: canopyGlow, w: 4.0, d: 5.8, ph: 0 }, { m: halo, w: 7.4, d: 8.8, ph: 1.3 });
      root.add(canopyGlow, halo);

      return root;
    },

    update(t) {
      // lanterns swing gently from their strings
      if (lanternMeshes.length) {
        for (const h of hung) {
          dummy.position.set(h.x, h.y, h.z);
          dummy.rotation.set(Math.sin(t * 1.15 + h.ph) * 0.085, h.ry, Math.sin(t * 0.85 + h.ph * 1.7) * 0.085);
          dummy.scale.setScalar(h.sc); dummy.updateMatrix();
          for (const m of lanternMeshes) m.setMatrixAt(h.i, dummy.matrix);
        }
        for (const m of lanternMeshes) m.instanceMatrix.needsUpdate = true;
      }
      // garland leaves flutter
      if (leafMesh) {
        for (const f of flutter) {
          dummy.position.set(f.x, f.y + Math.sin(t * 1.1 + f.ph) * 0.008, f.z);
          dummy.rotation.set(f.rx + Math.sin(t * 1.6 + f.ph) * 0.2, f.ry, f.rz + Math.sin(t * 1.25 + f.ph * 1.3) * 0.16);
          dummy.scale.set(...f.s); dummy.updateMatrix();
          leafMesh.setMatrixAt(f.i, dummy.matrix);
        }
        leafMesh.instanceMatrix.needsUpdate = true;
      }
      // the glow breathes: paper lanterns shimmer a touch, light pools swell and settle
      if (paperGlow) paperGlow.emissive.copy(GLOW).multiplyScalar(0.94 + Math.sin(t * 1.7) * 0.05 + Math.sin(t * 4.3) * 0.015);
      for (const p of pools) { const k = 1 + Math.sin(t * 0.9 + p.ph) * 0.025; p.m.scale.set(p.w * k, 1, p.d * k); }
      for (let i = 0; i < flames.length; i++) {
        const f = flames[i];
        const k = 1 + Math.sin(t * 9 + i * 1.7) * 0.12 + Math.sin(t * 15 + i) * 0.06;
        f.scale.set(0.8 * k, 1.5 * (2 - k), 0.8 * k);
      }
    },
  };
}
