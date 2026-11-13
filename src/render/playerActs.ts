// Player activity animations: procedural poses blended over idle / walk, small held props and cheap effects.
// Game logic describes the act (src/actions.ts); this module only reads it.
//
// - Poses are sine/ease curves of the act's time. A smoothed pose state chases the target pose, and a blend
//   weight eases the whole thing in over the base animation and back out, so acts never pop.
// - Props are built once on first use (merged primitives, the shared vertex-colour toon) and only attached to a
//   hand while an act needs them. Nothing is created per act, so nothing needs disposing and nothing can leak.
// - Effects reuse the pooled celebration particles (celebrate.ts) plus three ripple rings and a fishing line.
import * as THREE from 'three';
import { fxQueue, type Act } from '../actions';
import { TS } from '../world';
import type { PlayerRig } from './actors';
import { celebrate, Shape } from './celebrate';
import { toon, vertexToon } from './materials';
import { heightAtUnits, tileHeight } from './terrain';
import { Batch, G } from './util';

// ---------- pose ----------
interface Pose {
  ax: [number, number]; // arm swing (x): negative raises the arm forward / up. [right, left]
  az: [number, number]; // arm spread: 0.62 is the resting splay, negative crosses toward the middle
  lx: [number, number]; // leg swing
  lean: number; drop: number; sq: number; // forward lean, model lift, squash (+ taller)
  hx: number; hz: number; hy: number; // head nod (+ looks down), tilt, turn
  twist: number; // torso turn
}
const REST_Z = 0.62;
const HEAD_X = -0.13; // actors.ts tips every head chin-up by this much
const newPose = (): Pose => ({ ax: [0, 0], az: [REST_Z, REST_Z], lx: [0, 0], lean: 0, drop: 0, sq: 0, hx: 0, hz: 0, hy: 0, twist: 0 });
function resetPose(p: Pose) {
  p.ax[0] = p.ax[1] = 0; p.az[0] = p.az[1] = REST_Z; p.lx[0] = p.lx[1] = 0;
  p.lean = p.drop = p.sq = p.hx = p.hz = p.hy = p.twist = 0;
}
function chase(c: Pose, p: Pose, k: number) {
  for (let i = 0; i < 2; i++) { c.ax[i] += (p.ax[i] - c.ax[i]) * k; c.az[i] += (p.az[i] - c.az[i]) * k; c.lx[i] += (p.lx[i] - c.lx[i]) * k; }
  c.lean += (p.lean - c.lean) * k; c.drop += (p.drop - c.drop) * k; c.sq += (p.sq - c.sq) * k;
  c.hx += (p.hx - c.hx) * k; c.hz += (p.hz - c.hz) * k; c.hy += (p.hy - c.hy) * k; c.twist += (p.twist - c.twist) * k;
}
function copyPose(c: Pose, p: Pose) { resetPose(c); chase(c, p, 1); }

const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => cl((t - a) / (b - a));
const sm = (x: number) => x * x * (3 - 2 * x);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 -> 1 -> 0 hump over [a, b]. */
const hump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
/** A soft pulse centred on c. */
const pulse = (t: number, c: number, w = 0.07) => Math.exp(-(((t - c) / w) ** 2));
/** Ease in at the start of a one-shot and back out before its end. */
const env = (t: number, dur: number, a = 0.22, b = 0.3) => sm(seg(t, 0, a)) * (1 - sm(seg(t, dur - b, dur - 0.05)));

function crouch(p: Pose, c: number) {
  p.lean += 0.42 * c; p.sq -= 0.07 * c; p.drop -= 0.03 * c; p.hx += 0.18 * c;
  p.lx[0] -= 0.42 * c; p.lx[1] -= 0.42 * c; // keep the feet under the body while it tips forward
}

/** A two-handed overhead swing (axe, pick). p: 0..1 through one swing; impact at 0.7. */
function swing(P: Pose, p: number, high: number) {
  let ax: number;
  if (p < 0.55) ax = mix(-0.5, high, sm(p / 0.55));
  else if (p < 0.7) ax = mix(high, -0.4, ((p - 0.55) / 0.15) ** 2);
  else ax = mix(-0.4, -0.5, (p - 0.7) / 0.3);
  P.ax[0] = P.ax[1] = ax;
  P.az[0] = P.az[1] = -0.12;
  P.lean += p < 0.55 ? -0.1 * sm(p / 0.55) : p < 0.7 ? mix(-0.1, 0.24, (p - 0.55) / 0.15) : mix(0.24, 0.05, (p - 0.7) / 0.3);
  if (p > 0.7) P.sq -= 0.07 * Math.exp(-(p - 0.7) * 14);
  P.hx += p > 0.6 ? 0.12 : -0.06;
}

// ---------- props (hand space: origin at the fist; with the arm hanging, -y runs down the arm and +z is forward) ----------
const UP = new THREE.Vector3(0, 1, 0);
const along = (m: THREE.Object3D, x: number, y: number, z: number) => { m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(x, y, z).normalize()); return m; };
const WOOD = '#d9a88c', WOOD2 = '#c98f78', METAL = '#d9d2ee', PINK = '#ff8fb6';

function holder(mesh: THREE.Object3D, tipAt?: [number, number, number]) {
  const g = new THREE.Group();
  g.add(mesh);
  let tip: THREE.Object3D | undefined;
  if (tipAt) { tip = new THREE.Object3D(); tip.position.set(...tipAt); mesh.add(tip); }
  return { obj: g, mesh, tip };
}

function buildRod() {
  const b = new Batch()
    .add(G.cyl(0.04, 0.042, 0.22, 10), '#f2c9a8', { y: 0.0 }) // cork grip
    .add(G.ball(0.045, 8), PINK, { y: -0.12 })
    .add(G.cyl(0.045, 0.045, 0.03, 12), '#fff4e6', { x: 0.06, y: 0.12, rz: Math.PI / 2 }) // reel
    .add(G.ball(0.02, 6), PINK, { x: 0.09, y: 0.14 })
    .add(G.cyl(0.011, 0.022, 1.0, 6), '#ffb3cf', { y: 0.6 })
    .add(G.torus(0.018, 0.005, 8), '#ffffff', { y: 0.45, z: 0.02, rx: Math.PI / 2 })
    .add(G.torus(0.014, 0.005, 8), '#ffffff', { y: 0.8, z: 0.015, rx: Math.PI / 2 })
    .add(G.ball(0.022, 8), PINK, { y: 1.1 });
  return holder(along(b.build(), 0, -0.21, 1), [0, 1.1, 0]);
}
function buildHafted(head: (b: Batch) => void, color: string) {
  const b = new Batch().add(G.cyl(0.028, 0.034, 0.64, 8), color, { y: 0.2 }).add(G.ball(0.04, 8), PINK, { y: -0.12 });
  head(b);
  return holder(along(b.build(), 0, -0.6, 0.8), [0, 0.47, 0.12]);
}
const buildAxe = () => buildHafted((b) => {
  b.add(G.box(0.05, 0.14, 0.15), METAL, { y: 0.47, z: 0.07 })
    .add(G.ball(0.075, 10), '#fff0f7', { y: 0.47, z: 0.15, s: [0.35, 1.05, 0.5] }) // rounded edge
    .add(G.ball(0.04, 8), PINK, { y: 0.47, z: -0.03 });
}, WOOD);
const buildPick = () => buildHafted((b) => {
  b.add(G.cone(0.04, 0.22, 8), METAL, { y: 0.47, z: 0.11, dir: [0, -0.15, 1] })
    .add(G.cone(0.035, 0.16, 8), METAL, { y: 0.47, z: -0.08, dir: [0, -0.15, -1] })
    .add(G.ball(0.045, 8), PINK, { y: 0.47 });
}, WOOD2);
function buildTrowel() {
  const b = new Batch()
    .add(G.cyl(0.026, 0.03, 0.16, 8), WOOD, { y: 0.04 })
    .add(G.cyl(0.02, 0.02, 0.06, 6), METAL, { y: 0.14 })
    .add(G.ball(0.07, 10), METAL, { y: 0.26, s: [1, 1.5, 0.3] });
  return holder(along(b.build(), 0, -0.6, -0.8), [0, 0.32, 0]);
}
function buildHammer() {
  const b = new Batch()
    .add(G.cyl(0.024, 0.028, 0.36, 8), WOOD, { y: 0.12 })
    .add(G.box(0.08, 0.08, 0.2), '#e7ddff', { y: 0.31 })
    .add(G.ball(0.045, 8), PINK, { y: 0.31, z: 0.1, s: [1.1, 1.1, 0.5] });
  return holder(along(b.build(), 0, -0.8, 0.6), [0, 0.31, 0.1]);
}
function buildSpoon() {
  const b = new Batch().add(G.cyl(0.012, 0.012, 0.26, 6), METAL, { y: 0.12 }).add(G.ball(0.03, 8), METAL, { y: 0.26, s: [1, 1.4, 0.5] });
  return holder(along(b.build(), 0, -0.2, -1));
}
function buildWhisk() {
  const b = new Batch().add(G.cyl(0.02, 0.02, 0.14, 6), PINK, { y: 0.06 });
  for (let i = 0; i < 3; i++) b.add(G.torus(0.045, 0.005, 10), METAL, { y: 0.2, s: [0.7, 1.4, 1], ry: (i * Math.PI) / 3 });
  return holder(along(b.build(), 0, -0.2, -1));
}

// upright props: these sit under a group that cancels the arm's rotation, so they hang level whatever the arm does
function buildCan() {
  const b = new Batch()
    .add(G.torus(0.07, 0.016, 12, Math.PI), '#ffb3cf', { y: -0.09, ry: Math.PI / 2 })
    .add(G.cyl(0.1, 0.11, 0.16, 16), '#a8dcf0', { y: -0.17 })
    .add(G.cyl(0.112, 0.112, 0.04, 16), PINK, { y: -0.13 })
    .add(G.cyl(0.016, 0.026, 0.24, 8), '#a8dcf0', { y: -0.13, z: 0.15, dir: [0, 0.55, 1] })
    .add(G.cyl(0.04, 0.02, 0.03, 10), '#ffffff', { y: -0.07, z: 0.255, dir: [0, 0.55, 1] });
  const h = holder(b.build(), [0, -0.06, 0.27]);
  h.mesh.position.y = 0.04;
  return h;
}
function buildBasket() {
  const b = new Batch()
    .add(G.torus(0.09, 0.014, 14, Math.PI), '#e7b98f', { y: -0.1 })
    .add(G.cyl(0.11, 0.08, 0.11, 14), '#f2c49b', { y: -0.17 })
    .add(G.torus(0.105, 0.016, 16), PINK, { y: -0.115, rx: Math.PI / 2 });
  for (let i = 0; i < 5; i++) { const a = i * 1.3; b.add(G.ball(0.035, 8), i % 2 ? '#ff8fb6' : '#ffc2da', { x: Math.cos(a) * 0.05, y: -0.11, z: Math.sin(a) * 0.05 }); }
  return holder(b.build());
}
function buildPouch() {
  const b = new Batch()
    .add(G.ball(0.07, 10), '#e8c7a8', { y: -0.09, s: [1, 1.1, 1] })
    .add(G.torus(0.03, 0.01, 10), PINK, { y: -0.025, rx: Math.PI / 2 })
    .add(G.ball(0.022, 6), '#fff4e6', { y: -0.005 });
  return holder(b.build());
}
function buildMug() {
  const b = new Batch()
    .add(G.cyl(0.065, 0.056, 0.12, 14), '#fff4e6', { y: 0.03 })
    .add(G.cyl(0.067, 0.067, 0.03, 14), PINK, { y: 0.02 })
    .add(G.cyl(0.058, 0.058, 0.01, 14), '#c98a6b', { y: 0.087 })
    .add(G.torus(0.035, 0.012, 10), '#fff4e6', { x: 0.07, y: 0.03 });
  return holder(b.build(), [0, 0.12, 0]);
}
function buildBowl() {
  const b = new Batch()
    .add(G.lathe([[0.001, -0.06], [0.07, -0.055], [0.11, -0.01], [0.125, 0.04], [0.115, 0.045]], 16), '#fff4e6', { y: 0.02 })
    .add(G.cyl(0.105, 0.105, 0.01, 16), '#ffe2c9', { y: 0.04 })
    .add(G.torus(0.12, 0.012, 18), PINK, { y: 0.06, rx: Math.PI / 2 });
  return holder(b.build(), [0, 0.1, 0]);
}
function buildGift() {
  const b = new Batch()
    .add(G.box(0.2, 0.16, 0.2), '#ffb3cf', {})
    .add(G.box(0.21, 0.165, 0.04), '#ffffff', {})
    .add(G.box(0.04, 0.165, 0.21), '#ffffff', {});
  for (const sx of [-1, 1]) b.add(G.ball(0.05, 8), '#ffffff', { x: sx * 0.045, y: 0.1, rz: sx * 0.5, s: [1.2, 0.7, 0.5] });
  const h = holder(b.build());
  h.mesh.position.set(0.16, 0.0, 0.08); // between both hands (this hangs off the right one)
  return h;
}
function buildStar() {
  const b = new Batch();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 5;
    b.add(G.cone(0.035, 0.1, 5), '#ffd36e', { x: Math.cos(a) * 0.03, y: Math.sin(a) * 0.03, dir: [Math.cos(a), Math.sin(a), 0] });
  }
  b.add(G.ball(0.035, 8), '#fff3c4', {});
  const h = holder(b.build(vertexToon('#ffe7a0')));
  h.mesh.position.y = 0.08;
  return h;
}
const FISH_COLORS: Record<string, [string, string]> = { minnow: ['#ffd0de', '#ff9ec0'], perch: ['#ffe08a', '#ff8fb6'], koi: ['#fff6ea', '#ffb3c8'], drizzle: ['#b9c8f0', '#7f94d8'], cloudcarp: ['#f1ecff', '#c8b6f2'] };
function buildFish(item: string) {
  const [body, accent] = FISH_COLORS[item] ?? ['#c9e9ff', '#ff9ec0'];
  const b = new Batch()
    .add(G.ball(0.13, 14), body, { s: [1.35, 0.85, 0.6] })
    .add(G.cone(0.08, 0.12, 8), accent, { x: -0.2, dir: [-1, 0, 0], s: [1, 1, 0.35] })
    .add(G.ball(0.05, 8), accent, { y: 0.1, s: [1.4, 0.7, 0.3] })
    .add(G.ball(0.02, 6), '#4f2b40', { x: 0.11, y: 0.03, z: 0.065 })
    .add(G.ball(0.02, 6), '#4f2b40', { x: 0.11, y: 0.03, z: -0.065 })
    .add(G.ball(0.022, 6), '#ff9dbd', { x: 0.13, y: -0.02, z: 0.06 });
  if (item === 'perch') for (const x of [-0.06, 0.02]) b.add(G.ball(0.1, 10), accent, { x, s: [0.18, 0.86, 0.62] });
  if (item === 'koi') b.add(G.ball(0.05, 8), accent, { x: 0.03, y: 0.04, z: 0.07, s: [1, 1, 0.3] });
  const h = holder(b.build());
  h.mesh.position.set(0.15, 0.13, 0.05);
  return h;
}
function buildCrop(item: string) {
  const b = new Batch().add(G.cyl(0.01, 0.014, 0.12, 6), '#7fcf8e', { y: 0.04 });
  for (const sx of [-1, 1]) b.add(G.ball(0.04, 8), '#8fe0a0', { x: sx * 0.04, y: 0.06, rz: sx * 0.6, s: [1.3, 0.5, 0.8] });
  if (item === 'cottonbloom' || item === 'moonpetal') {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.add(G.ball(0.045, 8), item === 'moonpetal' ? '#e6d4ff' : '#ffffff', { x: Math.cos(a) * 0.05, y: 0.15 + Math.sin(a) * 0.05, s: [1, 1, 0.7] }); }
    b.add(G.ball(0.03, 6), '#fff3a8', { y: 0.15, z: 0.02 });
  } else {
    b.add(G.ball(0.07, 12), item === 'glowberry' ? '#ff7fa9' : '#ff9ec0', { y: 0.15 }).add(G.ball(0.02, 6), '#ffe3ee', { x: -0.025, y: 0.18, z: 0.05 });
  }
  const h = holder(b.build());
  h.mesh.position.set(0.15, 0.05, 0.04);
  return h;
}
function buildBobber() {
  return new Batch()
    .add(G.ball(0.05, 10), '#ffffff', {})
    .add(G.ball(0.051, 10), '#ff7fa9', { y: 0.015, s: [1, 0.65, 1] })
    .add(G.cyl(0.008, 0.008, 0.06, 5), '#ffffff', { y: 0.07 })
    .add(G.ball(0.014, 6), '#ff7fa9', { y: 0.1 })
    .build(vertexToon(), false);
}

type Mount = 'R' | 'L' | 'RU' | 'LU';
type Prop = ReturnType<typeof holder>;

// ---------- effects ----------
const PASTEL = ['#ffb3cf', '#ffd9e8', '#fff3a8', '#c9f2e3', '#d9c9ff', '#ffffff'];
const WATER = ['#bfe9ff', '#e3f6ff', '#ffffff', '#a8dcf0'];
const ITEM_COLORS: Record<string, string[]> = {
  puffberry: ['#ff8fb6', '#ffc2da', '#ffe3ee'], glowberry: ['#ff6f9c', '#ffb3cf', '#fff3a8'],
  blossom: ['#ffb3cf', '#ffc7dc', '#ffffff'], moonpetal: ['#e6d4ff', '#d9c9ff', '#ffffff'],
  beans: ['#c96f5a', '#ff9e8a', '#8fe0a0'], rare_beans: ['#a8456f', '#ffd36e', '#8fe0a0'],
  shell: ['#ffe2d4', '#ffc8b6', '#ffffff'], pearlshell: ['#ffc8d8', '#ffffff', '#ffe7f0'],
};
const sparkle = (p: THREE.Vector3, n = 8, cols = PASTEL, spread = 0.25) =>
  celebrate.burst(p, { count: n, colors: cols, shapes: [Shape.Star], spread, speed: 1.2, up: 1.8, gravity: 1.6, size: [0.1, 0.18], life: [0.5, 0.8] });
const puff = (p: THREE.Vector3, cols: string[], n = 4, size: [number, number] = [0.22, 0.36]) =>
  celebrate.burst(p, { count: n, colors: cols, shapes: [Shape.Puff], spread: 0.15, speed: 0.6, up: 0.5, gravity: 0, size, life: [0.45, 0.7] });
const bits = (p: THREE.Vector3, cols: string[], n = 8, up = 2.4) =>
  celebrate.burst(p, { count: n, colors: cols, shapes: [Shape.Dot], spread: 0.12, speed: 1.5, up, gravity: 6, size: [0.06, 0.11], life: [0.45, 0.7] });
const hearts = (p: THREE.Vector3, n = 3) =>
  celebrate.burst(p, { count: n, colors: ['#ff8fb6', '#ffb3cf', '#ff6fa3'], shapes: [Shape.Heart], spread: 0.2, speed: 0.4, up: 1.3, gravity: 0.4, size: [0.16, 0.24], life: [0.8, 1.1], stagger: 0.15 });

export interface PlayerActs {
  /** World-space bits (fishing line, bobber, ripples): add to the scene. */
  group: THREE.Group;
  /** Call right after the player mesh's animate() each frame. `act` null/undefined eases back to idle. */
  update(t: number, dt: number, act: Act | null | undefined): void;
}

export function createPlayerActs(rig: PlayerRig): PlayerActs {
  const group = new THREE.Group();
  // hand anchors: plain groups at each fist, plus a level ("upright") child that cancels the arm's rotation
  const hands = rig.arms.map((a) => {
    const hand = new THREE.Group();
    hand.position.set(0, -0.27, 0);
    const up = new THREE.Group();
    up.rotation.order = 'ZYX'; // the inverse of the pivot's XYZ rotation
    hand.add(up);
    a.pivot.add(hand);
    return { hand, up };
  });
  const mountOf = (m: Mount) => (m === 'R' ? hands[0].hand : m === 'L' ? hands[1].hand : m === 'RU' ? hands[0].up : hands[1].up);

  // lazily built, cached forever
  const cache = new Map<string, Prop>();
  const get = (key: string, make: () => Prop) => { let p = cache.get(key); if (!p) { p = make(); cache.set(key, p); } return p; };
  const PROPS: Record<string, () => Prop> = {
    rod: buildRod, axe: buildAxe, pick: buildPick, trowel: buildTrowel, hammer: buildHammer, spoon: buildSpoon, whisk: buildWhisk,
    can: buildCan, basket: buildBasket, pouch: buildPouch, mug: buildMug, bowl: buildBowl, gift: buildGift, star: buildStar,
  };
  const prop = (k: string) => get(k, PROPS[k]);
  const fish = (item: string) => get('fish:' + item, () => buildFish(item));
  const crop = (item: string) => get('crop:' + item, () => buildCrop(item));

  // which props hang where this frame
  const want = new Map<THREE.Object3D, THREE.Object3D>();
  const show = (p: Prop, m: Mount) => want.set(p.obj, mountOf(m));
  /** Shift a cup / bowl toward the middle of the body (and turn its handle to the holding hand). */
  const flip = (p: Prop, x: number, ry: number) => { p.mesh.position.set(x, 0, 0.05); p.mesh.rotation.y = ry; };
  function syncProps() {
    let leftBusy = false;
    for (const p of cache.values()) {
      const parent = want.get(p.obj);
      if (parent) { if (p.obj.parent !== parent) parent.add(p.obj); if (parent === hands[1].hand || parent === hands[1].up) leftBusy = true; }
      else if (p.obj.parent) p.obj.removeFromParent();
    }
    // a hand-carried wardrobe bag steps aside while that hand holds a basket, cup or bowl
    for (const c of rig.arms[1].pivot.children) if (c.userData.mount === 'hand') c.visible = !leftBusy;
  }

  // fishing line (4 thin segments along a sagging curve), bobber, ripple rings
  const lineGeo = new THREE.CylinderGeometry(0.007, 0.007, 1, 4);
  const lineMat = toon('#fff6fb');
  const lineSegs = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(lineGeo, lineMat); m.visible = false; group.add(m); return m; });
  const bobber = buildBobber();
  bobber.visible = false;
  group.add(bobber);
  const ringGeo = new THREE.RingGeometry(0.12, 0.16, 28).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 3 }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(ringGeo, mat);
    m.visible = false; m.renderOrder = 5;
    group.add(m);
    return { m, mat, age: 1, life: 1, size: 1 };
  });
  let ringNext = 0;
  const ripple = (p: THREE.Vector3, size = 1, life = 0.9) => {
    const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length;
    r.m.position.set(p.x, p.y + 0.01, p.z); r.age = 0; r.life = life; r.size = size; r.m.visible = true;
  };

  const P = newPose(), cur = newPose();
  let w = 0, seqSeen = -1, lastT = 0, prevT = 0, acc = 0;
  let curAct: Act | null = null;
  const v = new THREE.Vector3(), tip = new THREE.Vector3(), bob = new THREE.Vector3(), water = new THREE.Vector3();
  const a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), c3 = new THREE.Vector3(), d3 = new THREE.Vector3();

  const hit = (time: number) => prevT < time && curAct!.t >= time;
  /** True once each period (offset t0) as act time crosses it. */
  const every = (t0: number, period: number) => {
    const t = curAct!.t;
    return t >= t0 && Math.floor((t - t0) / period) > Math.floor((prevT - t0) / period);
  };
  const handPos = (i: number, out = v) => hands[i].hand.getWorldPosition(out);
  const tipPos = (p: Prop, out = v) => (p.tip ? p.tip.getWorldPosition(out) : p.obj.getWorldPosition(out));
  /** Where the act is aimed: its target point, else a little in front of the player. */
  function target(out: THREE.Vector3, lift = 0.15) {
    const a = curAct!;
    if (a.tx !== undefined && a.ty !== undefined) {
      const ux = a.tx / TS, uz = a.ty / TS;
      return out.set(ux, heightAtUnits(ux, uz) + lift, uz);
    }
    const r = rig.model.rotation.y, p = rig.root.position;
    return out.set(p.x + Math.sin(r) * 0.6, p.y + lift, p.z + Math.cos(r) * 0.6);
  }
  const overHead = (out = v, y = 1.9) => out.set(rig.root.position.x, rig.root.position.y + y, rig.root.position.z);

  // ---------- the poses ----------
  function pose(a: Act) {
    const t = a.t, D = a.dur;
    switch (a.kind) {
      case 'fish': {
        show(prop('rod'), 'R');
        const bite = D - 0.95, reel = D - 0.7;
        if (t < 0.3) { P.ax[0] = mix(-0.3, -2.6, sm(t / 0.3)); P.lean = -0.1 * sm(t / 0.3); P.hx = -0.08; }
        else if (t < 0.55) { const k = sm(seg(t, 0.3, 0.5)); P.ax[0] = mix(-2.6, -1.0, k); P.lean = mix(-0.1, 0.14, k); P.sq = -0.05 * hump(t, 0.42, 0.62); }
        else if (t < bite) {
          // waiting: rod steady, a slow sway and a curious head tilt
          P.ax[0] = -1.0 + Math.sin(t * 2) * 0.04; P.lean = 0.05 + Math.sin(t * 1.3) * 0.02;
          P.hz = Math.sin(t * 0.9) * 0.1; P.hx = 0.08; P.twist = Math.sin(t * 0.7) * 0.06;
        } else if (t < reel) {
          // a bite! a startled hop, rod jerks up
          const k = seg(t, bite, reel);
          P.ax[0] = mix(-1.0, -1.7, sm(seg(k, 0, 0.4))); P.drop = 0.08 * hump(k, 0.05, 0.7); P.sq = 0.05 * hump(k, 0, 0.5); P.hx = -0.15;
        } else {
          // reel in: rod high with a tension shake, the other hand cranking
          P.ax[0] = -1.75 + Math.sin(t * 38) * 0.04; P.az[0] = 0.25; P.lean = -0.12; P.hx = 0.02;
          P.ax[1] = -1.15 + Math.sin(t * 18) * 0.22; P.az[1] = -0.1 + Math.cos(t * 18) * 0.14;
          break;
        }
        P.az[0] = 0.25; P.ax[1] = -0.5; P.az[1] = 0.3;
        break;
      }
      case 'catch': {
        const up = sm(seg(t, 0, 0.22)), down = sm(seg(t, D - 0.45, D - 0.15));
        if (t < D - 0.28) show(fish(a.item ?? ''), 'RU');
        P.ax[0] = P.ax[1] = mix(mix(-1.0, -2.85, up), -0.3, down);
        P.az[0] = P.az[1] = mix(-0.18, REST_Z, down);
        P.drop = 0.13 * hump(t, 0.04, 0.4) + 0.05 * hump(t, 0.55, 0.8);
        P.sq = -0.07 * pulse(t, 0.42, 0.05) + 0.05 * hump(t, 0.04, 0.3);
        P.hx = -0.22 * (1 - down); P.hz = Math.sin(t * 6) * 0.07 * (1 - down);
        const f = cache.get('fish:' + (a.item ?? ''));
        if (f) f.mesh.rotation.z = Math.sin(t * 16) * 0.3 * (1 - seg(t, 0.6, 1.0)) + Math.sin(t * 5) * 0.08;
        break;
      }
      case 'pick': {
        show(prop('basket'), 'LU');
        const c = env(t, D);
        crouch(P, c);
        P.ax[0] = -1.25 * c - 0.75 * hump(t, 0.45, 0.78) + Math.sin(t * 9) * 0.05 * c;
        P.az[0] = 0.25; P.ax[1] = -0.35 * c; P.az[1] = 0.45;
        P.hz = 0.08 * hump(t, 0.4, 0.9);
        break;
      }
      case 'chop': {
        show(prop('axe'), 'R');
        swing(P, (t % 0.7) / 0.7, -2.65);
        break;
      }
      case 'mine': {
        show(prop('pick'), 'R');
        swing(P, (t % 0.6) / 0.6, -2.2);
        crouch(P, 0.3 * env(t, D, 0.15));
        break;
      }
      case 'till': {
        show(prop('trowel'), 'R');
        const c = env(t, D);
        crouch(P, c);
        P.ax[0] = (-1.25 + 0.45 * (pulse(t, 0.35) + pulse(t, 0.65))) * c; P.az[0] = 0.2;
        P.ax[1] = -0.4 * c; P.az[1] = 0.5;
        break;
      }
      case 'plant': {
        const c = env(t, D);
        crouch(P, c);
        if (t < 0.6) { show(prop('pouch'), 'LU'); P.ax[1] = -0.6 * c; P.az[1] = 0.2; }
        const pat = pulse(t, 0.72, 0.05) + pulse(t, 0.9, 0.05), pats = seg(t, 0.55, 0.65);
        P.ax[0] = mix(-1.1 * c, -1.15 + 0.3 * pat, pats); P.az[0] = mix(0.2 + Math.sin(t * 30) * 0.06 * hump(t, 0.2, 0.5), -0.05, pats);
        if (t >= 0.6) { P.ax[1] = (-1.15 + 0.3 * pat) * c; P.az[1] = -0.05; }
        break;
      }
      case 'water': {
        show(prop('can'), 'RU');
        P.ax[0] = -1.15 * env(t, D, 0.18); P.az[0] = 0.25; P.ax[1] = -0.2; P.lean = 0.08; P.hx = 0.12;
        P.hz = Math.sin(t * 2.4) * 0.05;
        break;
      }
      case 'harvest': {
        const c = sm(seg(t, 0, 0.2)) * (1 - sm(seg(t, 0.5, 0.64)));
        crouch(P, c);
        const lift = sm(seg(t, 0.5, 0.68)), lower = sm(seg(t, D - 0.45, D - 0.12));
        if (t > 0.52) show(crop(a.item ?? ''), 'RU');
        P.ax[0] = P.ax[1] = mix(mix(-1.0 * c, -2.65, lift), -0.3, lower) + Math.sin(t * 32) * 0.07 * hump(t, 0.18, 0.5);
        P.az[0] = P.az[1] = mix(-0.12, REST_Z, lower);
        P.drop += 0.1 * hump(t, 0.55, 0.82);
        P.hx -= 0.2 * lift * (1 - lower);
        break;
      }
      case 'brew': {
        show(prop('mug'), 'LU'); show(prop('spoon'), 'R');
        flip(prop('mug'), -0.07, 0);
        P.ax[1] = -1.3; P.az[1] = -0.1;
        P.ax[0] = -1.15 + Math.sin(t * 6.5) * 0.1; P.az[0] = -0.3 + Math.cos(t * 6.5) * 0.1;
        P.hx = 0.16; P.hz = Math.sin(t * 1.2) * 0.07; P.drop = Math.sin(t * 3.2) * 0.008; P.lean = 0.06;
        break;
      }
      case 'bake': {
        show(prop('bowl'), 'LU'); show(prop('whisk'), 'R');
        flip(prop('bowl'), -0.1, 0);
        P.ax[1] = -1.2; P.az[1] = -0.08;
        P.ax[0] = -1.05 + Math.sin(t * 15) * 0.12; P.az[0] = -0.28 + Math.cos(t * 15) * 0.12;
        P.hx = 0.16; P.hz = Math.sin(t * 2) * 0.06; P.drop = Math.abs(Math.sin(t * 7.5)) * 0.01; P.lean = 0.06;
        break;
      }
      case 'craft': {
        show(prop('hammer'), 'R');
        const p = (t % 0.55) / 0.55;
        P.ax[0] = p < 0.6 ? mix(-0.75, -1.9, sm(p / 0.6)) : mix(-1.9, -0.75, cl((p - 0.6) / 0.12) ** 2);
        P.az[0] = 0.15; P.ax[1] = -1.05; P.az[1] = -0.05;
        P.lean = 0.15; P.hx = 0.2 + 0.06 * pulse(p, 0.75, 0.06); P.sq = -0.03 * pulse(p, 0.74, 0.05);
        break;
      }
      case 'wave': {
        const up = sm(seg(t, 0, 0.18)) * (1 - sm(seg(t, D - 0.3, D - 0.05)));
        P.ax[0] = -0.25 * up; P.az[0] = mix(REST_Z, 2.5 + Math.sin(t * 16) * 0.3, up);
        P.hz = 0.12 * Math.sin(t * 5) * up; P.drop = 0.06 * hump(t, 0, 0.3);
        break;
      }
      case 'give': {
        const out = sm(seg(t, 0, 0.25)), back = sm(seg(t, 0.75, D - 0.1));
        if (t < 0.75) show(prop('gift'), 'RU');
        P.ax[0] = P.ax[1] = mix(-1.35 * out, -0.2, back); P.az[0] = P.az[1] = mix(-0.2, REST_Z, back);
        P.lean = 0.12 * out * (1 - back); P.hx = 0.15 * hump(t, 0.4, 0.9);
        break;
      }
      case 'place': {
        const c = env(t, D);
        crouch(P, c);
        P.ax[0] = P.ax[1] = -0.95 * c; P.az[0] = P.az[1] = mix(REST_Z, -0.12, c);
        break;
      }
      case 'reach': {
        const c = env(t, D, 0.2);
        if (t < 0.55) show(prop('star'), 'RU');
        P.sq = 0.07 * c; P.ax[0] = -2.8 * c + Math.sin(t * 6) * 0.08 * c; P.ax[1] = -2.6 * c;
        P.az[0] = P.az[1] = mix(REST_Z, 0.15, c); P.hx = -0.25 * c;
        break;
      }
      case 'sip': {
        const c = env(t, D, 0.3);
        show(prop('mug'), 'RU');
        flip(prop('mug'), 0.07, Math.PI);
        P.ax[0] = -2.05 * c; P.az[0] = mix(REST_Z, -0.55, c); P.ax[1] = -0.2;
        P.hx = -0.18 * hump(t, 0.35, 1.0); P.hz = 0.06 * hump(t, 0.9, 1.4);
        break;
      }
      case 'cheer': {
        // both arms up in a happy V, with a little bounce
        const c = env(t, D, 0.25);
        P.az[0] = P.az[1] = mix(REST_Z, 2.05, c); P.ax[0] = P.ax[1] = -0.35 * c;
        P.drop = Math.abs(Math.sin(t * 5)) * 0.07 * c; P.sq = Math.sin(t * 10) * 0.04 * c;
        P.hx = -0.1 * c; P.hz = Math.sin(t * 2.5) * 0.06 * c;
        break;
      }
      case 'sway': {
        // arms out wide, hips and head swaying side to side
        const c = env(t, D, 0.3), sw = Math.sin(t * 2.6);
        P.az[0] = mix(REST_Z, 1.55 + sw * 0.35, c); P.az[1] = mix(REST_Z, 1.55 - sw * 0.35, c);
        P.twist = sw * 0.25 * c; P.hz = sw * 0.12 * c; P.drop = Math.abs(sw) * 0.03 * c;
        P.lx[0] = sw * 0.15 * c; P.lx[1] = -sw * 0.15 * c;
        break;
      }
      case 'shy': {
        // hands tucked behind her back, head tipped and turned, a tiny rocking shuffle
        const c = env(t, D, 0.3);
        P.ax[0] = P.ax[1] = 0.9 * c; P.az[0] = P.az[1] = mix(REST_Z, 0.3, c);
        P.hz = (0.17 + Math.sin(t * 1.6) * 0.03) * c; P.hx = 0.17 * c; P.lean = -0.04 * c; P.hy = 0.12 * c;
        P.drop = Math.sin(t * 1.6) * 0.008 * c;
        break;
      }
      case 'ponder': {
        const c = env(t, D);
        P.ax[0] = -2.0 * c; P.az[0] = mix(REST_Z, -0.75, c); P.ax[1] = -0.9 * c; P.az[1] = mix(REST_Z, -0.55, c);
        P.hz = (0.16 + Math.sin(t * 3) * 0.04) * c; P.hx = -0.08 * c;
        break;
      }
    }
  }

  // ---------- effects, once the pose is applied and the hands are in place ----------
  function effects(a: Act, dt: number) {
    const t = a.t, D = a.dur;
    switch (a.kind) {
      case 'fish': fishing(a, dt); break;
      case 'catch':
        if (hit(0.06)) {
          overHead(v, 1.75); hearts(v, 3); sparkle(v, 10);
          celebrate.burst(v, { count: 10, colors: WATER, shapes: [Shape.Dot], spread: 0.2, speed: 1.2, up: 1.6, gravity: 5, size: [0.06, 0.1], life: [0.4, 0.6] });
        }
        if (hit(D - 0.28)) { overHead(v, 1.6); puff(v, ['#ffffff', '#ffe9f1'], 3, [0.18, 0.28]); }
        break;
      case 'pick':
        if (hit(0.5)) { target(v, 0.35); const cols = ITEM_COLORS[a.item ?? ''] ?? PASTEL; bits(v, cols, 9, 2.2); sparkle(v, 5, cols); }
        break;
      case 'chop':
        for (const at of [0.49, 1.19]) if (hit(at)) { target(v, 0.35); bits(v, ['#f2c49b', '#e7a98f', '#ffd9c2', '#ffb3cf'], 9, 2.8); puff(v, ['#fff1e6'], 2, [0.18, 0.28]); }
        break;
      case 'mine':
        for (const at of [0.42, 1.02]) if (hit(at)) { target(v, 0.12); puff(v, ['#f6e3c4', '#fff1dc'], 3); bits(v, ITEM_COLORS[a.item ?? ''] ?? PASTEL, 5, 2.0); sparkle(v, 3, ['#ffffff', '#ffe3ee']); }
        break;
      case 'till':
        for (const at of [0.35, 0.65]) if (hit(at)) { target(v, 0.08); puff(v, ['#d7ab8e', '#e8c4a8'], 3, [0.18, 0.3]); bits(v, ['#c99a7a', '#b98a72'], 4, 1.6); }
        break;
      case 'plant':
        if (hit(0.3)) { handPos(0); celebrate.burst(v, { count: 6, colors: ['#fff4e6', '#e8c7a8', '#c99a7a'], shapes: [Shape.Dot], spread: 0.04, speed: 0.2, up: 0.1, gravity: 5, size: [0.05, 0.08], life: [0.35, 0.5], stagger: 0.15 }); }
        if (hit(0.95)) { target(v, 0.15); sparkle(v, 5, ['#8fe0a0', '#c8f0dc', '#ffffff']); }
        break;
      case 'water': {
        const can = cache.get('can');
        const tilt = sm(seg(t, 0.15, 0.4)) * (1 - sm(seg(t, D - 0.45, D - 0.2)));
        if (can) can.mesh.rotation.x = tilt * 0.95 + Math.sin(t * 9) * 0.05 * tilt;
        if (can && tilt > 0.6) {
          acc += dt;
          while (acc >= 0.045) {
            acc -= 0.045;
            celebrate.burst(tipPos(can), { count: 2, colors: WATER, shapes: [Shape.Dot], spread: 0.03, speed: 0.25, up: 0.15, gravity: 7, size: [0.05, 0.08], life: [0.3, 0.45] });
          }
        }
        if (tilt > 0.6 && every(0.4, 0.28)) { target(v, 0.05); bits(v, WATER, 3, 1.1); }
        break;
      }
      case 'harvest':
        if (hit(0.55)) { target(v, 0.08); puff(v, ['#d7ab8e', '#e8c4a8'], 3); }
        if (hit(0.62)) { handPos(0); sparkle(v, 9); bits(v, ['#8fe0a0', '#c8f0dc'], 5, 1.8); }
        break;
      case 'brew': {
        const m = cache.get('mug');
        if (m && every(0.3, 0.75)) { tipPos(m); puff(v, ['#ffffff', '#fff4f8'], 1, [0.12, 0.2]); }
        break;
      }
      case 'bake': {
        const b = cache.get('bowl');
        if (b && every(0.5, 1.1)) { tipPos(b); puff(v, ['#ffffff', '#fff4e6'], 2, [0.12, 0.2]); }
        break;
      }
      case 'craft': {
        const h = cache.get('hammer');
        if (h && every(0.41, 0.55)) {
          tipPos(h);
          const big = Math.floor((t - 0.41) / 0.55) % 3 === 2;
          sparkle(v, big ? 6 : 2, ['#fff3a8', '#ffffff', '#ffb3cf'], 0.08);
        }
        break;
      }
      case 'wave': if (hit(0.15)) { overHead(v, 1.75); hearts(v, 1); } break;
      case 'give': if (hit(0.72)) { target(v, 0.9); hearts(v, 4); const g = cache.get('gift'); if (g) { tipPos(g); puff(v, ['#ffffff', '#ffe9f1'], 2, [0.16, 0.24]); } } break;
      case 'place': if (hit(0.45)) { target(v, 0.2); sparkle(v, 7); } break;
      case 'reach': if (hit(0.55)) { handPos(0); sparkle(v, 10, ['#ffe27a', '#ffb3cf', '#ffffff']); } break;
      case 'sip':
        if (hit(0.2) || hit(0.6)) { const m = cache.get('mug'); if (m) { tipPos(m); puff(v, ['#ffffff'], 1, [0.12, 0.18]); } }
        if (hit(1.05)) { overHead(v, 1.7); hearts(v, 2); }
        break;
      case 'cheer': if (every(0.4, 1.3)) { overHead(v, 1.9); sparkle(v, 5, ['#ffe27a', '#ffb3cf', '#ffffff'], 0.1); } break;
      case 'sway': if (every(0.8, 1.6)) { overHead(v, 1.7); hearts(v, 1); } break;
      case 'ponder': if (hit(0.3)) { overHead(v, 1.85); sparkle(v, 2, ['#fff3a8', '#ffffff'], 0.1); } break;
    }
  }

  function fishing(a: Act, dt: number) {
    const t = a.t, D = a.dur, bite = D - 0.95, reel = D - 0.7;
    const rod = cache.get('rod');
    if (!rod || a.tx === undefined || a.ty === undefined) return;
    const ux = a.tx / TS, uz = a.ty / TS;
    water.set(ux, tileHeight(Math.floor(ux), Math.floor(uz)) + 0.12, uz);
    tipPos(rod, tip);
    let sag = 0.22;
    if (t < 0.42) { bob.copy(tip).y -= 0.12; sag = 0.0; }
    else if (t < 0.82) { const k = (t - 0.42) / 0.4; bob.lerpVectors(tip, water, k); bob.y += 4 * k * (1 - k) * 0.9; sag = 0.05; }
    else if (t < reel) {
      bob.copy(water);
      const nibble = Math.max(0, Math.sin(t * 7.3) * Math.sin(t * 1.7)) ** 4 * 0.03;
      bob.y += Math.sin(t * 3) * 0.015 - nibble - (t > bite ? 0.07 * hump(t, bite, reel) : 0);
      if (t > bite) sag = 0.04;
    } else {
      const k = sm(seg(t, reel, D));
      const p = rig.root.position;
      bob.set(mix(water.x, p.x, k * 0.55), water.y + Math.abs(Math.sin(t * 14)) * 0.03, mix(water.z, p.z, k * 0.55));
      sag = 0.03;
      acc += dt;
      if (acc > 0.12) { acc = 0; bits(bob, WATER, 2, 1.0); }
    }
    if (hit(0.82)) { ripple(water, 1.2); bits(water, WATER, 10, 2.2); }
    if (every(1.4, 1.1) && t < bite) ripple(water, 0.7, 1.2);
    if (hit(bite)) {
      ripple(water, 1.6); bits(water, WATER, 12, 2.6);
      overHead(v, 1.85); sparkle(v, 4, ['#ffe27a', '#ffffff'], 0.08);
    }
    bobber.visible = true;
    bobber.position.copy(bob);
    // line: tip -> sagging midpoint -> bobber, as four straight thin segments
    c3.lerpVectors(tip, bob, 0.5); c3.y -= sag;
    for (let i = 0; i < lineSegs.length; i++) {
      bez(tip, c3, bob, i / lineSegs.length, a3); bez(tip, c3, bob, (i + 1) / lineSegs.length, b3);
      const s = lineSegs[i];
      d3.subVectors(b3, a3);
      const len = d3.length();
      s.visible = len > 0.001;
      if (!s.visible) continue;
      s.position.addVectors(a3, b3).multiplyScalar(0.5);
      s.quaternion.setFromUnitVectors(UP, d3.multiplyScalar(1 / len));
      s.scale.set(1, len, 1);
    }
  }
  const bez = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, k: number, out: THREE.Vector3) => {
    const u = 1 - k;
    return out.set(u * u * p0.x + 2 * u * k * p1.x + k * k * p2.x, u * u * p0.y + 2 * u * k * p1.y + k * k * p2.y, u * u * p0.z + 2 * u * k * p1.z + k * k * p2.z);
  };

  function apply(p: Pose, e: number) {
    // No act this frame: the walk / run cycle keeps the joints (an empty blend was pinning them).
    if (e <= 0) {
      for (let i = 0; i < 2; i++) {
        const arm = rig.arms[i];
        hands[i].up.rotation.set(-arm.pivot.rotation.x, -arm.pivot.rotation.y, -arm.pivot.rotation.z);
      }
      return;
    }
    for (let i = 0; i < 2; i++) {
      const arm = rig.arms[i];
      arm.pivot.rotation.x = mix(arm.pivot.rotation.x, p.ax[i], e);
      arm.pivot.rotation.z = arm.sx * mix(REST_Z, p.az[i], e);
      rig.legs[i].pivot.rotation.x = mix(rig.legs[i].pivot.rotation.x, p.lx[i], e);
      // keep upright props level: undo the pivot's rotation (XYZ) in reverse order
      const u = hands[i].up;
      u.rotation.set(-arm.pivot.rotation.x, -arm.pivot.rotation.y, -arm.pivot.rotation.z);
    }
    const m = rig.model;
    m.rotation.x = mix(m.rotation.x, p.lean, e);
    m.position.y += p.drop * e;
    const sq = p.sq * e;
    m.scale.set(m.scale.x * (1 - sq * 0.5), m.scale.y * (1 + sq), m.scale.z * (1 - sq * 0.5));
    rig.head.rotation.x = HEAD_X + p.hx * e;
    rig.head.rotation.z += p.hz * e;
    rig.head.rotation.y = p.hy * e;
    rig.body.rotation.y = p.twist * e;
  }

  function hideWorldBits() {
    bobber.visible = false;
    for (const s of lineSegs) s.visible = false;
  }

  return {
    group,
    update(t, dt, act) {
      void t;
      const a = act ?? null;
      if (a && (a.seq !== seqSeen || a.t < lastT - 0.05)) { seqSeen = a.seq; prevT = Math.min(0, a.t) - 1e-3; acc = 0; }
      curAct = a;
      // blend weight: in while an act runs, out over the last moments of a one-shot (and after it ends)
      const wT = a ? (a.hold || a.derived || a.t < a.dur - 0.22 ? 1 : 0) : 0;
      w += (wT - w) * (1 - Math.exp(-dt * 11));
      if (w < 0.002 && !a) w = 0;
      want.clear();
      if (a) {
        resetPose(P);
        pose(a);
        if (w < 0.08) copyPose(cur, P); // a fresh start: no stale pose to chase from
        else chase(cur, P, 1 - Math.exp(-dt * 22));
      }
      if (w > 0 || a) apply(cur, sm(w));
      else apply(cur, 0);
      // a cancelled act keeps its prop only while the arm is still visibly holding it
      if (!a && w > 0.35) for (const p of cache.values()) if (p.obj.parent) want.set(p.obj, p.obj.parent);
      syncProps();
      if (a?.kind !== 'fish') hideWorldBits();
      if (a) {
        rig.root.updateMatrixWorld(true);
        effects(a, dt);
        prevT = a.t; lastT = a.t;
      }
      for (const r of rings) {
        if (!r.m.visible) continue;
        r.age += dt;
        const k = r.age / r.life;
        if (k >= 1) { r.m.visible = false; continue; }
        r.m.scale.setScalar(r.size * (0.6 + k * 2.6));
        r.mat.opacity = (1 - k) * 0.75;
      }
      // little effects requested by game code (a find picked up while walking)
      while (fxQueue.length) {
        const f = fxQueue.shift()!;
        const ux = f.x / TS, uz = f.y / TS;
        v.set(ux, heightAtUnits(ux, uz) + 0.35, uz);
        sparkle(v, 8); hearts(v, 1);
      }
    },
  };
}
