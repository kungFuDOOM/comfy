// Ground scatter: the little handcrafted details between the big pieces. Pebbles along path and plaza edges, shells and
// starfish on the beaches, and tiny blossom clusters along Sugarlily Square, garden / yard fences and house plots.
// Everything is instanced (one draw per kind), low-poly, capped hard on phones and never casts shadows. Pure scenery:
// nothing here is solid, and nothing sits on a path, a station or a reserved tile.
import * as THREE from 'three';
import { hash } from '../art/draw';
import type { Season } from '../time';
import { buildings, isReservedTile, isSolidTile, MAP_H, MAP_W, props, shoreDist, stations, T, terrainAt } from '../world';
import { makeToon } from './materials';
import { isSmoothTile } from './shore';
import { heightAtUnits, tileHeight } from './terrain';
import { Batch } from './util';

const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const lowMem = ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2;
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Perf: pebble 20 tris, shell 14, starfish 40, blossom cluster ~90 (leaves + heads): ~45k tris at the desktop caps.
const CAP = lowMem ? { pebble: 160, shell: 50, star: 12, bloom: 90 }
  : coarse ? { pebble: 380, shell: 110, star: 28, bloom: 240 }
  : { pebble: 650, shell: 170, star: 40, bloom: 380 };

const PEBBLE_COLS = ['#efe2d8', '#f6ebe2', '#e3d3cc', '#f8dde3', '#ece4f0'];
const SHELL_COLS = ['#fff3ec', '#ffdcd2', '#ffeacc', '#ffd0dc'];
const STAR_COLS = ['#ffb59a', '#ffa3b8', '#ffc98f'];
const BLOOM_COLS = ['#ffffff', '#ffc2d8', '#ffd9ec', '#fff3a8', '#e6d6ff', '#ffb3cf'];

/** Rounded little stone: a 20-tri icosahedron with smooth (radial) normals, so it shades like a soft pebble. */
function pebbleGeo() {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const pos = g.attributes.position, nr = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); nr.setXYZ(i, v.x, v.y, v.z); }
  // a lighter top, so a pebble reads as a rounded stone from the high camera (the material uses vertex colours)
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const k = 0.9 + 0.1 * Math.max(0, pos.getY(i)); col.set([k, k, k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/** Scallop shell: a half-cone fan lying flat, with ribbed shading baked into vertex colours. */
function shellGeo() {
  const g = new THREE.ConeGeometry(1, 0.45, 7, 1, false, 0, Math.PI).toNonIndexed();
  g.rotateY(-Math.PI / 2).translate(0, 0.225, -0.3);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i) + 0.3, pos.getX(i)), rib = 0.86 + 0.14 * Math.abs(Math.cos(a * 3.5));
    col.set([rib, rib, rib], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
/** Starfish: five soft flattened arms. */
function starGeo() {
  const b = new Batch();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.3, 1, 4), '#ffffff', { x: Math.cos(a) * 0.45, y: 0.12, z: Math.sin(a) * 0.45, dir: [Math.cos(a), 0, Math.sin(a)], s: [1, 1, 0.45] });
  }
  b.add(new THREE.IcosahedronGeometry(0.3, 0), '#ffffff', { y: 0.12, s: [1, 0.45, 1] });
  return b.geometry();
}
/** A five-lobed flat bloom outline (flat petals, cheap: 10 tris), with a raised centre. */
function bloomHead(b: Batch, x: number, y: number, z: number, r: number, tilt: number, ry: number) {
  const head = new THREE.CircleGeometry(1, 10);
  const p = head.attributes.position;
  for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)), k = 0.72 + 0.28 * Math.abs(Math.cos(a * 2.5)); p.setXY(i, p.getX(i) * k, p.getY(i) * k); }
  b.add(head, '#ffffff', { x, y, z, rx: -Math.PI / 2 + tilt, ry, s: r });
  b.add(new THREE.CircleGeometry(0.36, 6), '#ffe08a', { x, y: y + 0.004, z, rx: -Math.PI / 2 + tilt, ry, s: r });
}
/** One blossom cluster = a leaves mesh (green, tinted by the season) + a heads mesh (tinted per instance). */
function clusterGeos() {
  const leaves = new Batch(), heads = new Batch();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    leaves.add(new THREE.CircleGeometry(0.05, 6), i % 2 ? '#ffffff' : '#e3f3dd', { x: Math.cos(a) * 0.05, y: 0.012, z: Math.sin(a) * 0.05, rx: -Math.PI / 2 + 0.25, ry: -a, s: [0.7, 1.3, 1] });
  }
  const spots: [number, number, number, number][] = [[0, 0.11, 0, 0.042], [0.07, 0.075, 0.04, 0.034], [-0.06, 0.085, -0.03, 0.036]];
  for (const [x, y, z, r] of spots) {
    leaves.add(new THREE.CylinderGeometry(0.004, 0.005, y, 3), '#ffffff', { x, y: y / 2, z });
    bloomHead(heads, x, y, z, r, 0.25, x * 20);
  }
  return { leaves: leaves.geometry(), heads: heads.geometry() };
}

type Spot = { x: number; z: number; y: number; ry: number; s: number; r: number; sy?: number };

export function createScatter() {
  const group = new THREE.Group();
  const uTime = { value: 0 };
  const mk = (sway: boolean) => {
    const m = makeToon('#ffffff', { ground: true });
    m.vertexColors = true;
    if (sway) {
      const base = m.onBeforeCompile;
      m.onBeforeCompile = (shader, renderer) => {
        base.call(m, shader, renderer);
        shader.uniforms.uTime = uTime;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            { vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
              float ph = uTime * 1.6 + ip.x * 0.9 + ip.y * 0.6, amt = max(0.0, position.y) * 0.35;
              transformed.x += sin(ph) * amt; transformed.z += cos(ph * 0.8 + 0.6) * amt * 0.6; }`);
      };
    }
    return m;
  };

  // ---- where things go (deterministic: same island, same scatter) ----
  const fenceAt = new Set(props.filter((p) => p.type === 'fence').map((p) => p.y * MAP_W + p.x));
  const buildingAt = new Set<number>();
  for (const b of buildings) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) buildingAt.add(y * MAP_W + x);
  const nearStation = (x: number, y: number) => stations.some((s) => x >= s.x - 1 && x <= s.x + s.w && Math.abs(y - s.y) <= 1);
  const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const pebbles: Spot[] = [], shells: Spot[] = [], stars: Spot[] = [], blooms: Spot[] = [];
  const free = (x: number, y: number) => !isSolidTile(x, y) && !isReservedTile(x, y);
  const groundY = (x: number, y: number, ux: number, uz: number) => (isSmoothTile(x, y) ? heightAtUnits(ux, uz) : tileHeight(x, y));

  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrainAt(x, y);
    if (t === T.Sand) {
      if (!free(x, y)) continue;
      const sd = shoreDist(x, y);
      if (sd < 2) continue; // keep the wet waterline clean (the foam lives there)
      const r = hash(x * 5 + 1, y * 9 + 2), r2 = hash(x * 13 + 7, y * 3 + 5), r3 = hash(x + 31, y * 7 + 11);
      const ux = x + 0.15 + r2 * 0.7, uz = y + 0.15 + r3 * 0.7;
      const sp: Spot = { x: ux, z: uz, y: heightAtUnits(ux, uz), ry: r * 40, s: 1, r };
      if (r < 0.2) shells.push({ ...sp, s: 0.075 + r2 * 0.04 });
      else if (r > 0.965 && sd >= 3) stars.push({ ...sp, s: 0.09 + r3 * 0.04 });
      else if (r > 0.82) pebbles.push({ ...sp, s: 0.04 + r3 * 0.035 });
      continue;
    }
    if (t !== T.Grass && t !== T.Lawn) continue;
    if (!free(x, y) || nearStation(x, y)) continue;
    // what is next door?
    let edgePave: [number, number] | null = null, edgeFence: [number, number] | null = null, edgeHouse: [number, number] | null = null, plazaSide = false;
    for (const [dx, dy] of N4) {
      const nt = terrainAt(x + dx, y + dy), ni = (y + dy) * MAP_W + x + dx;
      if (nt === T.Path || nt === T.Plaza) { edgePave ??= [dx, dy]; if (nt === T.Plaza) plazaSide = true; }
      if (fenceAt.has(ni)) edgeFence ??= [dx, dy];
      if (buildingAt.has(ni)) edgeHouse ??= [dx, dy];
    }
    // pebbles spill off the paving onto the grass edge
    if (edgePave) {
      const n = plazaSide ? 2 : 1 + (hash(x * 3, y * 5) > 0.55 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const r = hash(x * 7 + k * 17, y * 11 + k * 3), r2 = hash(x * 19 + k, y * 2 + k * 23);
        if (r < 0.35) continue;
        const along = 0.12 + r2 * 0.76, inset = 0.06 + r * 0.16;
        const [dx, dy] = edgePave;
        const ux = x + 0.5 + (dx ? dx * (0.5 - inset) : along - 0.5), uz = y + 0.5 + (dy ? dy * (0.5 - inset) : along - 0.5);
        pebbles.push({ x: ux, z: uz, y: groundY(x, y, ux, uz), ry: r * 50, s: 0.035 + r2 * 0.035, r });
      }
    }
    // blossom borders: Sugarlily Square's edges, along garden / yard fences, round the house and shop plots
    const edge = (plazaSide ? edgePave : null) ?? edgeFence ?? edgeHouse;
    if (edge) {
      const [dx, dy] = edge;
      for (let k = 0; k < 2; k++) {
        const r = hash(x * 23 + k * 7, y * 29 + k * 13), r2 = hash(x * 31 + k * 3, y * 37 + k);
        if (k === 1 && r < 0.4) continue;
        const along = (k + 0.5) / 2 + (r2 - 0.5) * 0.3, inset = 0.16 + r * 0.12;
        const ux = x + 0.5 + (dx ? dx * (0.5 - inset) : along - 0.5), uz = y + 0.5 + (dy ? dy * (0.5 - inset) : along - 0.5);
        blooms.push({ x: ux, z: uz, y: groundY(x, y, ux, uz), ry: r * 30, s: 0.85 + r2 * 0.45, r });
      }
    }
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const pick = (list: Spot[], cap: number) => {
    const step = Math.max(1, list.length / Math.max(1, cap)), out: Spot[] = [];
    for (let i = 0; i < list.length && out.length < cap; i += step) out.push(list[Math.floor(i)]);
    return out;
  };
  const c = new THREE.Color();
  const build = (geo: THREE.BufferGeometry, list: Spot[], mat: THREE.Material, squash: [number, number, number], colorOf: (sp: Spot) => string, lift = 0) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    im.castShadow = false; im.receiveShadow = true;
    list.forEach((sp, i) => {
      im.setMatrixAt(i, m.compose(p.set(sp.x, sp.y + lift, sp.z), q.setFromEuler(e.set(0, sp.ry, 0)), sc.set(sp.s * squash[0], sp.s * squash[1], sp.s * squash[2])));
      im.setColorAt(i, c.set(colorOf(sp)));
    });
    group.add(im);
    return im;
  };
  const colorIn = (cols: string[]) => (sp: Spot) => cols[Math.floor(sp.r * 997) % cols.length];

  if (!(CAP.pebble + CAP.bloom)) return { group, setSeason(_s: Season) {}, update(_t: number) {} };
  const still = mk(false);
  build(pebbleGeo(), pick(pebbles, CAP.pebble), still, [1.25, 0.5, 1], colorIn(PEBBLE_COLS), 0.005);
  build(shellGeo(), pick(shells, CAP.shell), still, [1, 1, 1], colorIn(SHELL_COLS), 0.004);
  build(starGeo(), pick(stars, CAP.star), still, [1, 1, 1], colorIn(STAR_COLS), 0.003);
  const bloomList = pick(blooms, CAP.bloom), cg = clusterGeos(), sway = mk(true);
  const leaves = build(cg.leaves, bloomList, sway, [1, 1, 1], () => '#ffffff');
  const heads = build(cg.heads, bloomList, sway, [1, 1, 1], colorIn(BLOOM_COLS));

  return {
    group,
    setSeason(s: Season) {
      if (leaves) {
        bloomList.forEach((sp, i) => leaves.setColorAt(i, c.set(s.grass).multiplyScalar(0.78 + sp.r * 0.12).offsetHSL(0, 0.06, -0.04)));
        leaves.instanceColor!.needsUpdate = true;
        leaves.visible = s.id !== 'snowfluff';
      }
      if (heads) heads.visible = s.id !== 'snowfluff';
    },
    update(t: number) { if (!reduced) uTime.value = t; },
  };
}
