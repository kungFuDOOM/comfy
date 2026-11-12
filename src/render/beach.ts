// Beach dressing: little shells, starfish, driftwood, beach-grass tufts and a couple of parasols on the sand.
// Pure scenery (not gatherable). Each kind is one InstancedMesh of a small merged model, so the whole beach is ~6 draws.
import * as THREE from 'three';
import { hash } from '../art/draw';
import { isReservedTile, isSolidTile, MAP_H, MAP_W, PARASOLS, shoreDist, T, terrainAt } from '../world';
import { contactShadow, makeToon, PALETTE, vertexToon } from './materials';
import { tileHeight } from './terrain';
import { Batch, G } from './util';

/** Hard caps so a bigger island never balloons the instance counts on phones. */
const CAP = { shell: 110, star: 40, wood: 22, tuft: 80 };

const SHELL_COLS = ['#ffd1e1', '#ffe3ee', '#ffc7a6', '#fff4e6', '#f9c2d9'];
const STAR_COLS = ['#ff9ec0', '#ffab94', '#ffb38a', '#ff8fb6'];
const TUFT_COLS = ['#a9d9a2', '#b8e2a6', '#9ccf9a'];

function shellGeo() {
  // a little scallop: a flattened fan of ribs and a tiny hinge
  const b = new Batch();
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.32;
    b.add(G.capsule(0.022, 0.07), '#ffffff', { x: Math.sin(a) * 0.04, y: 0.012, z: -Math.cos(a) * 0.04, rx: Math.PI / 2, ry: -a, s: [1, 1, 0.55] });
  }
  b.add(G.box(0.05, 0.02, 0.02), '#ffffff', { y: 0.01, z: 0.01 });
  return b.geometry();
}

function starGeo() {
  const b = new Batch();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(G.cone(0.03, 0.11, 6), '#ffffff', { x: Math.cos(a) * 0.05, y: 0.014, z: Math.sin(a) * 0.05, dir: [Math.cos(a), 0, Math.sin(a)], s: [1, 1, 0.5] });
  }
  b.add(G.cyl(0.035, 0.035, 0.03, 10), '#ffffff', { y: 0.014 });
  b.add(G.ball(0.012, 6), '#fff4e6', { y: 0.032 }); // pale freckle in the middle
  return b.geometry();
}

function woodGeo() {
  const b = new Batch();
  b.add(G.cyl(0.045, 0.06, 0.62, 8), '#e6cdb4', { y: 0.04, rz: Math.PI / 2 });
  b.add(G.cyl(0.02, 0.032, 0.2, 6), '#dcc0a6', { x: 0.1, y: 0.07, z: 0.06, rx: 0.9, rz: 0.3 });
  b.add(G.cyl(0.025, 0.03, 0.03, 8), '#f3e3d2', { x: 0.31, y: 0.04, rz: Math.PI / 2 }); // pale cut end
  return b.geometry();
}

function tuftGeo() {
  const b = new Batch();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, lean = 0.25 + (i % 3) * 0.12, h = 0.22 + (i % 2) * 0.1;
    b.add(G.cone(0.018, h, 4), '#ffffff', { x: Math.cos(a) * 0.035, y: h / 2, z: Math.sin(a) * 0.035, rx: Math.sin(a) * lean, rz: -Math.cos(a) * lean });
  }
  return b.geometry();
}

let canopyMatCache: THREE.MeshToonMaterial | null = null;
/** Vertex-colored toon, double-sided so the open canopy cone reads from below too (own copy: don't flip the shared one). */
function canopyMat() {
  if (!canopyMatCache) { canopyMatCache = makeToon('#ffffff'); canopyMatCache.vertexColors = true; canopyMatCache.side = THREE.DoubleSide; }
  return canopyMatCache;
}

function parasol(v: number): THREE.Group {
  const g = new THREE.Group();
  const [c1, c2] = v === 0 ? [PALETTE.pink, PALETTE.milk] : [PALETTE.mint, PALETTE.petal];
  const b = new Batch();
  b.add(G.cyl(0.03, 0.03, 1.5, 8), PALETTE.milk, { y: 0.75, rz: 0.08 });
  const n = 8;
  for (let i = 0; i < n; i++) {
    // striped canopy: alternating wedges of a low cone
    b.add(new THREE.ConeGeometry(0.85, 0.32, 3, 1, true, (i / n) * Math.PI * 2, (Math.PI * 2) / n), i % 2 ? c1 : c2, { x: 0.06, y: 1.52 });
  }
  b.add(G.ball(0.05, 8), c1, { x: 0.06, y: 1.7 });
  // a striped towel on the sand beside it
  for (let i = 0; i < 4; i++) b.add(G.box(0.62, 0.012, 0.22), i % 2 ? c1 : PALETTE.cream, { x: 0.5, y: 0.006, z: -0.33 + i * 0.22, ry: 0.15 });
  g.add(b.build(canopyMat()));
  const shade = contactShadow(1.5, 1.5, 'round', 0.18);
  shade.position.x = 0.12;
  g.add(shade);
  return g;
}

export function createBeach(): THREE.Group {
  const group = new THREE.Group();
  type Spot = { x: number; z: number; y: number; ry: number; s: number; c: number };
  const spots = { shell: [] as Spot[], star: [] as Spot[], wood: [] as Spot[], tuft: [] as Spot[] };
  const nearGrass = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (terrainAt(x + dx, y + dy) === T.Grass) return true;
    return false;
  };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (terrainAt(x, y) !== T.Sand || isReservedTile(x, y) || isSolidTile(x, y)) continue;
    if (PARASOLS.some((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1)) continue;
    const d = shoreDist(x, y), r = hash(x * 3 + 11, y * 5 + 7), r2 = hash(x + 101, y + 37), r3 = hash(x * 17, y * 23);
    const spot = (): Spot => ({ x: x + 0.2 + r2 * 0.6, z: y + 0.2 + r3 * 0.6, y: tileHeight(x, y), ry: r * Math.PI * 2 * 7, s: 0.8 + r2 * 0.5, c: (r3 * 97) | 0 });
    if (d >= 2 && nearGrass(x, y) && r < 0.32) spots.tuft.push(spot());
    else if (d <= 2 && r > 0.93) spots.wood.push(spot());
    else if (d <= 2 && r > 0.86) spots.star.push(spot());
    else if (r > 0.66) spots.shell.push(spot());
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  const make = (geo: THREE.BufferGeometry, list: Spot[], cap: number, cols: string[] | null, shadows: boolean) => {
    // thin the list evenly rather than truncating, so caps don't leave one coast bare
    const step = Math.max(1, list.length / cap), picked: Spot[] = [];
    for (let i = 0; i < list.length && picked.length < cap; i += step) picked.push(list[Math.floor(i)]);
    if (!picked.length) return;
    const im = new THREE.InstancedMesh(geo, vertexToon(), picked.length);
    im.castShadow = shadows; im.receiveShadow = true;
    picked.forEach((sp, i) => {
      m.compose(p.set(sp.x, sp.y, sp.z), q.setFromEuler(e.set(0, sp.ry, 0)), s.setScalar(sp.s));
      im.setMatrixAt(i, m);
      im.setColorAt(i, col.set(cols ? cols[sp.c % cols.length] : '#ffffff'));
    });
    group.add(im);
  };
  make(shellGeo(), spots.shell, CAP.shell, SHELL_COLS, false);
  make(starGeo(), spots.star, CAP.star, STAR_COLS, false);
  make(woodGeo(), spots.wood, CAP.wood, null, true);
  make(tuftGeo(), spots.tuft, CAP.tuft, TUFT_COLS, false);

  for (const ps of PARASOLS) {
    const g = parasol(ps.v);
    g.position.set(ps.x + 0.5, tileHeight(ps.x, ps.y), ps.y + 0.5);
    group.add(g);
  }
  return group;
}
