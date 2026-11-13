// Player + villagers: chunky original toy characters. Big round head, small flared outfit, stubby limbs,
// blush cheeks, shiny eyes, and cheetah print somewhere on everyone.
// The rest of the game only uses the ActorMesh interface below.
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import type { VillagerDef } from '../data';
import type { Look } from '../clothes/types';
import { lookKey } from '../clothes/types';
import { buildCloth, buildHood, buildShoes, headExtraOf, legsOf, sleeveOf } from './clothes3d';
import { cheetahTexture, cheetahToon, contactShadow, makeToon, PALETTE, toon, vertexToon, type CheetahKind } from './materials';
import { ball, Batch, G, lerpAngle, mat } from './util';

export interface ActorMesh {
  root: THREE.Group;
  /** Rotates around Y, smoothed. */
  setFacing(f: Facing, dt: number): void;
  /** Idle breathing, and a walk/run cycle whose stride follows how far the actor actually moved. */
  animate(t: number, moving: boolean, run?: boolean): void;
  setAlert?(on: boolean): void;
}

const FACE_ANGLE: Record<Facing, number> = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

type Kind = 'player' | 'dormouse' | 'hamster' | 'hedgehog' | 'bunny' | 'capybara' | 'moth' | 'axolotl' | 'seal';
type Fill = string | CheetahKind; // hex color or a cheetah print
const isPrint = (f: Fill): f is CheetahKind => f === 'classic' || f === 'pink';

// ---- proportions (model space, feet on y = 0) ----
const HEAD_Y = 1.0;
const HA = 0.46, HB = 0.39, HC = 0.41; // head ellipsoid radii
const HIP_Y = 0.2;
const LEG_Y = 0.27;
const STEP = 0.22; // swing radius of the shoe, from the hip pivot
const EYE = '#4f2b40';
const BLUSH = '#ff9dbd';
const DEG = Math.PI / 180;

/**
 * -1..1 stride position. Mostly a straight step, so a planted shoe stays put while the body
 * passes over it, with a little sine so the turnaround stays soft.
 */
function strideShape(phase: number): number {
  const linear = Math.asin(Math.sin(phase)) / (Math.PI / 2);
  return linear * 0.8 + Math.sin(phase) * 0.2;
}

/** Point on the head surface. yaw 0 = face front (+z), pitch up. `out` pushes along the radius. */
function on(yaw: number, pitch: number, out = 1): [number, number, number] {
  const y = yaw * DEG, p = pitch * DEG;
  return [HA * Math.sin(y) * Math.cos(p) * out, HB * Math.sin(p) * out, HC * Math.cos(y) * Math.cos(p) * out];
}
const at = (v: [number, number, number]) => ({ x: v[0], y: v[1], z: v[2] });

/** Flared bell outfit profile, relative to the hip. */
const DRESS: [number, number][] = [[0.001, 0], [0.3, 0], [0.35, 0.04], [0.345, 0.11], [0.29, 0.25], [0.2, 0.42], [0.14, 0.52], [0.001, 0.56]];
const BAND: [number, number][] = [[0.3, -0.012], [0.365, 0.035], [0.36, 0.115], [0.325, 0.19], [0.3, 0.2]];
let dressGeo: THREE.BufferGeometry | null = null, bandGeo: THREE.BufferGeometry | null = null, sleeveGeo: THREE.BufferGeometry | null = null, forearmGeo: THREE.BufferGeometry | null = null, legGeo: THREE.BufferGeometry | null = null;
const scaleUv = (g: THREE.BufferGeometry, su: number, sv: number) => {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
};

function fillMat(f: Fill): THREE.MeshToonMaterial {
  const m = makeToon('#ffffff'); // uncached: outfits recolor it
  setFill(m, f);
  return m;
}
function setFill(m: THREE.MeshToonMaterial, f: Fill) {
  const map = isPrint(f) ? cheetahTexture(f) : null;
  if (m.map !== map) { m.map = map; m.needsUpdate = true; }
  m.color.set(isPrint(f) ? '#ffffff' : f);
}

function buildHead(kind: Kind, skin: string, accent: string): THREE.Mesh {
  const b = new Batch();
  b.add(G.ball(1, 26), skin, { s: [HA, HB, HC] });
  // rosy cheeks
  for (const sx of [-1, 1]) b.add(G.ball(0.075, 10), BLUSH, { ...at(on(sx * 40, -14, 0.985)), ry: sx * 40 * DEG, s: [1, 0.62, 0.3] });
  const earInner = '#ffb3cf';
  switch (kind) {
    case 'player': {
      const hair = '#ffb7d2', hairLite = '#ffe0ee';
      for (const sx of [-1, 1]) {
        // round ears, pink inside
        b.add(G.ball(0.16, 14), skin, { x: sx * 0.34, y: 0.2, z: 0.02, s: [0.82, 1.05, 0.52] });
        b.add(G.ball(0.1, 10), earInner, { x: sx * 0.34, y: 0.19, z: 0.07, s: [0.72, 0.88, 0.32] });
        // twin buns with a little shine and a hair tie
        b.add(G.ball(0.145, 14), hair, { x: sx * 0.3, y: 0.44, z: -0.04 });
        b.add(G.ball(0.05, 8), hairLite, { x: sx * 0.26, y: 0.52, z: 0.02 });
        b.add(G.torus(0.068, 0.015, 8), '#f27aa8', { x: sx * 0.3, y: 0.36, z: 0.0, rx: Math.PI / 2 });
      }
      // scalloped bangs
      b.add(G.ball(0.15, 12), hair, { ...at(on(0, 46, 1.02)), s: [1.55, 0.52, 0.75] });
      b.add(G.ball(0.1, 10), hairLite, { ...at(on(-22, 38, 1.05)), s: [1, 0.58, 0.65] });
      b.add(G.ball(0.1, 10), hairLite, { ...at(on(22, 40, 1.05)), s: [1, 0.58, 0.65] });
      // a little ahoge sprout
      b.add(G.capsule(0.02, 0.07), hair, { x: 0.03, y: 0.5, z: 0.02, rz: 0.7, rx: -0.25 });
      b.add(G.ball(0.03, 8), hairLite, { x: 0.07, y: 0.56, z: 0.05 });
      // tiny w-smile
      const smile = on(0, -30, 1.04);
      b.add(G.torus(0.045, 0.01, 8, Math.PI * 0.9), '#e56d9d', { x: smile[0], y: smile[1], z: smile[2], rz: Math.PI, rx: 0.35 });
      b.add(G.ball(0.016, 6), '#ff8fb6', { ...at(on(0, -18, 1.02)), s: [1.4, 0.9, 0.7] });
      break;
    }
    case 'dormouse':
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.2), skin, { x: sx * 0.36, y: 0.24, z: -0.02, s: [1, 1, 0.55] });
        b.add(G.ball(0.13, 10), earInner, { x: sx * 0.36, y: 0.235, z: 0.06, s: [1, 1, 0.35] });
      }
      b.add(G.ball(0.08), '#ffffff', { ...at(on(0, 66, 1.03)) });
      b.add(G.ball(0.055), '#ffffff', { ...at(on(14, 56, 1.05)) });
      b.add(G.ball(0.04, 8), PALETTE.rose, { ...at(on(0, -6, 1.0)) });
      break;
    case 'hamster': {
      // Dottie Spotwhisk: a round cheetah-spotted hamster. Rosettes are a dark ring with a cream center.
      const rosette = (x: number, y: number, z: number, dir: [number, number, number], k: number) => {
        b.add(G.ball(0.055, 8), accent, { x, y, z, dir, s: [k, 0.28, k * 0.82] });
        const c = 0.012;
        b.add(G.ball(0.024, 6), '#ffe7bf', { x: x + dir[0] * c, y: y + dir[1] * c, z: z + dir[2] * c, dir, s: [k * 0.42, 0.22, k * 0.36] });
      };
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.24, 16), skin, { x: sx * 0.32, y: -0.1, z: 0.08, s: [1.05, 0.92, 0.95] });
        rosette(sx * 0.42, -0.06, 0.22, [sx, 0.1, 0.8], 1);
        rosette(sx * 0.48, -0.16, 0.12, [sx, -0.3, 0.5], 0.75);
      }
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.15, 14), skin, { x: sx * 0.32, y: 0.34, z: -0.02, s: [1.05, 0.95, 0.55] });
        b.add(G.ball(0.09, 10), '#ffb7d2', { x: sx * 0.32, y: 0.33, z: 0.04, s: [0.85, 0.78, 0.35] });
      }
      const spots: [number, number, number][] = [[-16, 58, 1], [20, 60, 0.9], [-46, 48, 0.85], [52, 44, 0.8], [0, 74, 1.05], [-100, 40, 0.7], [108, 42, 0.75], [170, 55, 0.95], [12, 34, 0.6]];
      for (const [yw, pt, k] of spots) {
        const p = on(yw, pt, 1);
        rosette(p[0], p[1], p[2], on(yw, pt), k);
      }
      for (const sx of [-1, 1]) b.add(G.ball(0.03, 6), accent, { ...at(on(sx * 20, -8, 1.02)), s: [0.5, 2.8, 0.45] });
      b.add(G.ball(0.12, 12), '#fff7ea', { ...at(on(0, -18, 0.92)), s: [1.2, 0.78, 0.75] });
      b.add(G.ball(0.038, 8), '#ff8fb0', { ...at(on(0, -12, 1.05)), s: [1.35, 0.9, 0.75] });
      for (const sx of [-1, 1]) {
        const tooth = on(sx * 4, -24, 1.02);
        b.add(G.ball(0.016, 6), '#ffffff', { x: tooth[0], y: tooth[1], z: tooth[2], s: [0.85, 1.35, 0.55] });
      }
      for (const sx of [-1, 1]) {
        for (const tilt of [0.35, 0.05, -0.28]) {
          const dx = sx * 0.9, dy = tilt, dz = 0.55;
          const mag = Math.hypot(dx, dy, dz);
          const len = 0.2;
          b.add(G.capsule(0.006, len), '#fffaf6', {
            x: sx * 0.16 + (dx / mag) * len * 0.55,
            y: -0.12 + (dy / mag) * len * 0.55,
            z: 0.24 + (dz / mag) * len * 0.55,
            dir: [dx / mag, dy / mag, dz / mag],
          });
        }
      }
      break;
    }
    case 'hedgehog': {
      for (const sx of [-1, 1]) b.add(G.ball(0.085, 10), skin, { x: sx * 0.33, y: 0.2, z: 0.08, s: [1, 1, 0.6] });
      // marshmallow quills over the top and back
      for (let ring = 0; ring < 4; ring++) {
        const pitch = 78 - ring * 22, n = ring === 0 ? 4 : 6 + ring * 2;
        for (let i = 0; i < n; i++) {
          const yaw = ring === 0 ? i * 90 + 45 : 62 + (i / (n - 1)) * 236; // skip the face
          const d = on(yaw, pitch);
          b.add(G.cone(0.085, 0.24, 7), i % 2 ? '#ffd3e2' : '#f7b8cc', { ...at(on(yaw, pitch, 1.08)), dir: [d[0] / HA, d[1] / HB + 0.25, d[2] / HC] });
        }
      }
      b.add(G.ball(0.1, 10), '#fff7f0', { ...at(on(0, -12, 0.98)), s: [1, 0.8, 0.9] }); // snout
      b.add(G.ball(0.04, 8), EYE, { ...at(on(0, -9, 1.2)) });
      break;
    }
    case 'bunny': {
      // Nimbus: a fog-puff bunny. Long ears (the right one flops), cloudy tufts. The star clip is added in extra().
      const fog = '#f7f4ff', fogDeep = '#e7def8', fogInner = '#ffd0e6';
      for (const sx of [-1, 1]) {
        const floppy = sx === 1;
        const earX = sx * (floppy ? 0.28 : 0.16);
        const earY = floppy ? 0.42 : 0.78;
        const tilt = -sx * (floppy ? 1.05 : 0.12);
        b.add(G.capsule(0.075, floppy ? 0.34 : 0.42), skin, { x: earX, y: earY, z: floppy ? 0.02 : -0.02, rz: tilt, s: [1, 1, 0.72] });
        b.add(G.capsule(0.042, floppy ? 0.26 : 0.32), fogInner, { x: earX + sx * 0.01, y: earY, z: floppy ? 0.05 : 0.02, rz: tilt, s: [0.85, 1, 0.4] });
        b.add(G.ball(0.1, 10), fog, { x: sx * 0.18, y: 0.36, z: 0.02, s: [1, 0.8, 0.8] });
      }
      b.add(G.ball(0.14), fog, { ...at(on(0, 62, 1.02)), s: [1.35, 0.7, 0.9] });
      b.add(G.ball(0.1), fogDeep, { ...at(on(-28, 54, 1.04)) });
      b.add(G.ball(0.09), fog, { ...at(on(30, 52, 1.04)) });
      for (const sx of [-1, 1]) b.add(G.ball(0.12), fog, { ...at(on(sx * 70, -8, 1.0)), s: [0.9, 0.85, 0.85] });
      b.add(G.ball(0.11, 10), fog, { ...at(on(0, -16, 0.94)), s: [1.15, 0.72, 0.7] });
      b.add(G.ball(0.032, 8), '#f59ac0', { ...at(on(0, -10, 1.05)), s: [1.3, 0.85, 0.75] });
      const smile = on(0, -26, 1.03);
      b.add(G.torus(0.04, 0.009, 8, Math.PI * 0.85), '#e7a0c0', { x: smile[0], y: smile[1], z: smile[2], rz: Math.PI, rx: 0.3 });
      break;
    }
    case 'capybara': {
      // Brioche: a boxy, gentle capybara. Tiny ears set back, a big square snout with two nostrils.
      const snout = '#dcb98c';
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.1, 10), skin, { x: sx * 0.31, y: 0.3, z: -0.1, s: [1, 1, 0.6] });
        b.add(G.ball(0.055, 8), '#d99a7d', { x: sx * 0.31, y: 0.3, z: -0.05, s: [1, 1, 0.4] });
      }
      b.add(G.ball(0.2, 14), snout, { ...at(on(0, -12, 0.98)), s: [1.55, 0.98, 1.0] });
      b.add(G.ball(0.07, 10), '#7a4a3a', { ...at(on(0, -2, 1.03)), s: [1.5, 0.8, 0.8] });
      for (const sx of [-1, 1]) b.add(G.ball(0.014, 6), '#5a3328', { ...at(on(sx * 8, -4, 1.12)) });
      const smile = on(0, -26, 1.07);
      b.add(G.torus(0.05, 0.01, 8, Math.PI * 0.9), '#a0714f', { x: smile[0], y: smile[1], z: smile[2], rz: Math.PI, rx: 0.3 });
      // flat-topped fluff
      b.add(G.ball(0.15, 10), skin, { ...at(on(0, 68, 1.0)), s: [1.5, 0.5, 1.0] });
      break;
    }
    case 'moth': {
      // Oolie: a fuzzy pastel moth. Feathery antennae with a curl and a tuft of cheek fluff.
      const fuzz = '#ffffff';
      for (const sx of [-1, 1]) {
        const ax = sx * 0.12;
        b.add(G.capsule(0.018, 0.34), '#c9b8ee', { x: ax + sx * 0.05, y: 0.52, z: 0.0, rz: -sx * 0.5 });
        b.add(G.ball(0.04, 8), accent, { x: ax + sx * 0.2, y: 0.7, z: 0.0 });
        for (let k = 0; k < 4; k++) b.add(G.capsule(0.009, 0.1), '#d9c9f5', { x: ax + sx * (0.08 + k * 0.034), y: 0.55 + k * 0.045, z: 0.0, rz: -sx * 1.0 });
        b.add(G.ball(0.1, 10), fuzz, { x: sx * 0.34, y: -0.08, z: 0.08, s: [1, 1.1, 0.8] });
      }
      b.add(G.ball(0.16, 12), fuzz, { ...at(on(0, 58, 1.0)), s: [1.4, 0.62, 0.9] });
      b.add(G.ball(0.07, 8), '#f59ac0', { ...at(on(0, -12, 1.05)), s: [1.1, 0.8, 0.6] });
      // a pressed flower behind the ear
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.add(G.ball(0.04, 8), '#ffb3cf', { x: -0.36 + Math.cos(a) * 0.05, y: 0.22 + Math.sin(a) * 0.05, z: 0.1, s: [1, 1, 0.5] }); }
      b.add(G.ball(0.03, 6), '#fff3a8', { x: -0.36, y: 0.22, z: 0.12 });
      break;
    }
    case 'axolotl': {
      // Tuppi: wide head, three feathery gill stalks per side, a giggly grin and a frosting-dipped cap.
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        const y = 0.06 + k * 0.12, ang = 0.55 + k * 0.28;
        b.add(G.capsule(0.022, 0.2), accent, { x: sx * (0.5 + k * 0.01), y, z: -0.02, rz: -sx * (1.2 + k * 0.1) });
        b.add(G.ball(0.045, 8), '#ffb3cf', { x: sx * (0.62 + k * 0.03), y: y + 0.08 + k * 0.04, z: -0.02 });
        void ang;
      }
      const smile = on(0, -22, 1.04);
      b.add(G.torus(0.13, 0.014, 12, Math.PI * 0.85), '#c0577d', { x: smile[0], y: smile[1] + 0.02, z: smile[2], rz: Math.PI, rx: 0.3 });
      for (const sx of [-1, 1]) b.add(G.ball(0.014, 6), '#c0577d', { ...at(on(sx * 38, -20, 1.03)) });
      b.add(G.ball(0.14, 12), '#ffffff', { ...at(on(0, 64, 1.0)), s: [1.5, 0.45, 1.1] }); // a baker's cap
      b.add(G.ball(0.12, 12), '#ffffff', { ...at(on(0, 78, 1.0)), s: [1, 0.8, 1] });
      b.add(G.ball(0.035, 8), '#ff6f9c', { ...at(on(10, 84, 1.07)) });
      break;
    }
    case 'seal': {
      // Marlo: a round, sugar-dusted seal. Whisker pad, big dark nose, whiskers, and a lavender keeper's cap.
      const pad = '#fff6fa';
      b.add(G.ball(0.17, 14), pad, { ...at(on(0, -14, 0.98)), s: [1.45, 0.95, 0.95] });
      b.add(G.ball(0.055, 10), '#7a4a6a', { ...at(on(0, -4, 1.04)), s: [1.4, 0.8, 0.8] });
      for (const sx of [-1, 1]) for (const tilt of [0.25, -0.15]) {
        const len = 0.2, ox = sx * 0.1;
        b.add(G.capsule(0.006, len), '#ffffff', { x: ox + sx * len * 0.5, y: -0.14 + tilt * len * 0.5, z: 0.35, rz: -sx * (Math.PI / 2 - tilt) });
      }
      for (const sx of [-1, 1]) b.add(G.ball(0.045, 8), skin, { x: sx * 0.3, y: 0.24, z: -0.04, s: [1, 1, 0.6] });
      const cap = '#a98fd6';
      b.add(G.cyl(0.4, 0.43, 0.05, 20), cap, { y: 0.31, z: 0.0, rx: -0.1 });
      b.add(G.ball(0.3, 14), '#b9a3e6', { y: 0.34, z: -0.02, s: [1, 0.65, 1] });
      b.add(G.torus(0.3, 0.02, 18), PALETTE.gold, { y: 0.34, rx: Math.PI / 2 });
      b.add(G.ball(0.04, 8), PALETTE.gold, { y: 0.54 });
      for (let i = 0; i < 9; i++) b.add(G.ball(0.011, 5), '#ffffff', { ...at(on(((i * 53) % 140) - 70, 10 + ((i * 37) % 50), 1.01)) }); // sugar dust
      break;
    }
  }
  return b.build();
}

function buildEyes(): THREE.Mesh {
  const b = new Batch();
  const [, ey] = on(20, 4);
  for (const sx of [-1, 1]) {
    const p = on(sx * 20, 4, 0.99);
    b.add(G.ball(0.062, 12), EYE, { x: p[0], y: p[1] - ey, z: p[2], ry: sx * 20 * DEG, s: [1, 1.22, 0.5] });
    const h = on(sx * 20 - 5, 9, 1.05), h2 = on(sx * 20 + 4, -1, 1.055);
    b.add(G.ball(0.023, 8), '#ffffff', { x: h[0], y: h[1] - ey, z: h[2] });
    b.add(G.ball(0.012, 6), '#ffffff', { x: h2[0], y: h2[1] - ey, z: h2[2] });
  }
  const m = b.build();
  m.position.y = ey;
  m.castShadow = false;
  return m;
}

function bowGeo(b: Batch, color: string, k = 1) {
  for (const sx of [-1, 1]) b.add(G.ball(0.12, 10), color, { x: sx * 0.11 * k, s: [1.05 * k, 0.8 * k, 0.5 * k], rz: sx * 0.25, uv: [0.6, 0.4] });
  b.add(G.ball(0.055, 8), color, { s: k, uv: [0.2, 0.2] });
  return b;
}

interface Spec {
  kind: Kind;
  skin: string;
  accent: string;
  dress: Fill;
  band: Fill;
  shoes: string;
  scale: number;
  bag?: boolean;
  /** Squash the head: x/y/z multipliers (chubby cheeks, etc.). */
  headScale?: [number, number, number];
  /** Nudge the head down so a shorter, rounder body still meets the chin. */
  headDrop?: number;
  /** Widen / shorten the dress (x, y, z). */
  bodyScale?: [number, number, number];
  /** Bigger eyes read younger. 1 is the shared default. */
  eyeScale?: number;
  /** Add model-level pieces (tail, mist skirt…). May return a per-frame callback (t, walk 0..1). */
  extra?: (parts: { model: THREE.Group; body: THREE.Group; head: THREE.Group }) => ((t: number, walk: number) => void) | void;
}

function build(sp: Spec) {
  const root = new THREE.Group();
  const model = new THREE.Group(); // bobs / turns / squashes

  dressGeo ??= scaleUv(G.lathe(DRESS, 28), 2.5, 0.9);
  bandGeo ??= scaleUv(G.lathe(BAND, 22), 2.5, 0.28);
  legGeo ??= G.capsule(0.075, 0.08).translate(0, -0.1, 0);
  sleeveGeo ??= scaleUv(G.capsule(0.072, 0.13).translate(0, -0.12, 0), 0.5, 0.4);
  forearmGeo ??= G.capsule(0.058, 0.12).translate(0, -0.12, 0);

  const dressMat = fillMat(sp.dress), bandMat = fillMat(sp.band);
  const body = new THREE.Group();
  body.position.y = HIP_Y;
  const dress = new THREE.Mesh(dressGeo, dressMat), band = new THREE.Mesh(bandGeo, bandMat);
  dress.castShadow = dress.receiveShadow = band.castShadow = band.receiveShadow = true;
  body.add(dress, band);
  if (sp.bodyScale) body.scale.set(...sp.bodyScale);

  // arms: sleeve in the outfit fabric + round hand
  const arms = [-1, 1].map((sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.16, 0.44, 0.01);
    pivot.rotation.z = sx * 0.62;
    const sleeve = new THREE.Mesh(sleeveGeo!, dressMat);
    sleeve.castShadow = true;
    const forearm = new THREE.Mesh(forearmGeo!, toon(sp.skin));
    const hb = new Batch().add(G.ball(0.086, 12), sp.skin, { y: -0.27 });
    if (sp.bag && sx === 1) {
      // round pink shopping bag with a little heart
      hb.add(G.ball(0.11, 12), PALETTE.pink, { y: -0.48, s: [1.05, 0.95, 0.7] });
      hb.add(G.ball(0.028, 6), '#ff7fa9', { x: -0.02, y: -0.46, z: 0.06 });
      hb.add(G.ball(0.028, 6), '#ff7fa9', { x: 0.02, y: -0.46, z: 0.06 });
      hb.add(G.torus(0.055, 0.012, 10, Math.PI), '#fff6fb', { y: -0.38 });
    }
    const hand = hb.build();
    pivot.add(forearm, sleeve, hand);
    body.add(pivot);
    return { pivot, sx, sleeve };
  });

  // legs: stubby with chunky shoes
  const legs = [-1, 1].map((sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.12, LEG_Y, 0);
    const leg = new THREE.Mesh(legGeo!, toon(sp.skin));
    leg.castShadow = true;
    const shoe = new Batch().add(G.ball(0.105, 12), sp.shoes, { y: -0.2, z: 0.03, s: [1.05, 0.72, 1.25] }).build();
    pivot.add(leg, shoe);
    return { pivot, leg, shoe };
  });
  const legPivots = legs.map((l) => l.pivot);

  const head = new THREE.Group();
  head.position.y = HEAD_Y + (sp.headDrop ?? 0);
  head.rotation.x = -0.13; // chin up towards the high camera
  const eyes = buildEyes();
  const eyeK = sp.eyeScale ?? 1;
  eyes.scale.set(eyeK, eyeK, 1);
  head.add(buildHead(sp.kind, sp.skin, sp.accent), eyes);

  if (sp.headScale) head.scale.set(...sp.headScale);
  model.add(body, legs[0].pivot, legs[1].pivot, head);
  const tick = sp.extra?.({ model, body, head });
  root.add(contactShadow(1.0 * sp.scale), model);
  const marker = ball(0.09, mat(PALETTE.gold, PALETTE.gold), 0, 2.0 * sp.scale, 0, 8);
  marker.castShadow = false;
  marker.visible = false;
  root.add(marker);

  let ang = 0, last = -1, walk = 0, phase = 0, runK = 0, hasPrev = false, prevX = 0, prevZ = 0;
  model.rotation.order = 'YXZ'; // yaw first, so the lean tips along the facing direction
  const off = Math.random() * 10;
  const api: ActorMesh & { model: THREE.Group; dressMat: THREE.MeshToonMaterial; bandMat: THREE.MeshToonMaterial; head: THREE.Group; body: THREE.Group; dress: THREE.Mesh; band: THREE.Mesh; arms: typeof arms; legs: typeof legs } = {
    root, model, dressMat, bandMat, head, body, dress, band, arms, legs,
    setFacing(f, dt) { ang = lerpAngle(ang, FACE_ANGLE[f], Math.min(1, dt * 14)); model.rotation.y = ang; },
    animate(t, moving, run = false) {
      const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, t - last));
      last = t;
      // How far the body actually travelled (tiles). Height ease and teleports don't count as steps.
      let dist = 0;
      if (hasPrev) {
        const d = Math.hypot(root.position.x - prevX, root.position.z - prevZ);
        if (d < 0.75) dist = d;
      }
      prevX = root.position.x; prevZ = root.position.z; hasPrev = true;
      // No travel (a wall, a pause) eases back to idle instead of freezing a stride.
      const travelled = dist > 0.0008;
      const blend = 1 - Math.exp(-dt * 8);
      walk += (((moving && travelled) ? 1 : 0) - walk) * blend;
      // Quicker than the walk blend, still eased, so walk and run melt into each other.
      runK += (((moving && run && travelled) ? 1 : 0) - runK) * (1 - Math.exp(-dt * 16));
      // Run lengthens the step and the arm pump. Stride is the ground one step covers,
      // so a faster run is a quicker cadence and the feet still meet the ground.
      const legAmp = 0.7 + runK * 0.45;
      const armAmp = 0.72 + runK * 0.78;
      const plant = 0.04 + runK * 0.045;
      const stride = Math.max(0.2, 2 * (plant + STEP * Math.sin(legAmp)) * sp.scale);
      if (dist > 0.0004) phase = (phase + (dist / stride) * Math.PI) % (Math.PI * 2);
      const w = walk, idle = 1 - w;
      const s = strideShape(phase);
      const legAngle = Math.asin(Math.max(-1, Math.min(1, s * Math.sin(legAmp)))) * w;
      const hop = Math.abs(Math.cos(phase)); // up as the feet pass, down as one lands
      const br = Math.sin(t * 2.3 + off);
      const lift = (0.034 + runK * 0.07) * w;
      // Both feet tuck up for a short hop at the top of the bounce. Walking leaves this at zero.
      const crest = Math.max(0, (hop - 0.93) / 0.07);
      const air = runK * crest * crest * 0.09 * w;
      const sq = (hop - 0.45) * w * (0.65 + runK * 0.45);
      model.position.y = (hop * (0.04 + runK * 0.1) + air) * w * sp.scale + Math.sin(t * 2.1 + off) * 0.006 * idle;
      model.rotation.x = (0.06 + runK * 0.24) * w; // a little lean on a walk, a clear tip forward while running
      model.scale.set(sp.scale * (1 - sq * 0.05), sp.scale * (1 + sq * (0.09 + runK * 0.04)), sp.scale * (1 - sq * 0.05));
      model.rotation.z = s * (0.04 + runK * 0.04) * w;
      body.rotation.y = s * (0.06 + runK * 0.08) * w;
      // breathing fades out as the stride fades in
      body.scale.set(1 - br * 0.014 * idle, 1 + br * 0.035 * idle, 1 - br * 0.014 * idle);
      head.position.y = HEAD_Y + br * 0.016 * idle - (1 - hop) * (0.016 + runK * 0.018) * w;
      head.rotation.y = s * (0.045 + runK * 0.06) * w;
      head.rotation.z = Math.sin(t * 1.1 + off) * 0.035 * idle - s * (0.045 + runK * 0.03) * w;
      // Arms oppose the same-side leg: positive X swings the limb backward. Run carries both arms forward.
      for (const a of arms) {
        a.pivot.rotation.x = -a.sx * s * armAmp * w - runK * 0.3 * w + br * 0.045 * idle;
        a.pivot.rotation.z = a.sx * (0.62 - (0.08 + runK * 0.22) * w);
      }
      // Left foot is forward when s > 0, and lifts while it swings forward (cos > 0).
      // `air` tucks both feet at the crest, a short moment with nothing on the ground.
      const swing = Math.cos(phase);
      legPivots[0].rotation.x = -legAngle;
      legPivots[1].rotation.x = legAngle;
      legPivots[0].position.y = LEG_Y + Math.max(0, swing) * lift + air;
      legPivots[1].position.y = LEG_Y + Math.max(0, -swing) * lift + air;
      legPivots[0].position.z = s * plant * w;
      legPivots[1].position.z = -s * plant * w;
      eyes.scale.y = ((t + off * 3) % 3.7 < 0.12 ? 0.12 : 1) * eyeK; // blink
      marker.position.y = 2.0 * sp.scale + Math.sin(t * 3) * 0.06;
      tick?.(t, w);
    },
    setAlert(on) { marker.visible = on; },
  };
  api.animate(0, false);
  last = -1;
  hasPrev = false;
  return api;
}

/** Handmade accessories (item ids of kind 'accessory') as tiny props on the player's head. */
function buildAccessories(): Record<string, THREE.Object3D> {
  const pin = (o: THREE.Object3D, yaw: number, pitch: number, tilt = 0) => {
    o.position.set(...on(yaw, pitch, 1.02));
    o.lookAt(o.position.clone().multiplyScalar(2)); // face straight out from the head (no parent yet: local = world)
    o.rotateZ(tilt);
    o.scale.setScalar(1.45);
    o.visible = false;
    return o;
  };
  // ribbon bow clip: a rosy bow with a white knot, on the right of the bangs
  const bowClip = bowGeo(new Batch(), '#ff7fa9', 0.7).add(G.ball(0.03, 8), '#ffffff', { z: 0.02 }).build();
  // seashell hair clip: a little scalloped fan, left side by the ear
  const shell = new Batch();
  for (let i = -2; i <= 2; i++) shell.add(G.ball(0.045, 8), i % 2 ? '#ffc8b6' : '#ffe2d4', { x: Math.sin(i * 0.36) * 0.05, y: Math.cos(i * 0.36) * 0.05, rz: -i * 0.36, s: [0.55, 1.45, 0.4] });
  shell.add(G.ball(0.03, 8), '#ffb3a0', { y: -0.005, s: [1.3, 0.8, 0.6] });
  // moonpetal pin: five lilac petals around a golden heart
  const petal = new Batch();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; petal.add(G.ball(0.042, 8), i % 2 ? '#e6cbff' : '#d8b8ff', { x: Math.cos(a) * 0.05, y: Math.sin(a) * 0.05, rz: a, s: [1.25, 0.75, 0.4] }); }
  petal.add(G.ball(0.03, 8), PALETTE.gold, { z: 0.01 });
  return {
    bow_pin: pin(bowClip, 30, 40, -0.3),
    shell_charm: pin(shell.build(), -52, 14, 0.2),
    petal_pin: pin(petal.build(vertexToon(PALETTE.gold)), 44, 24, 0.4),
  };
}

/** The player's toy rig: the activity animator (playerActs.ts) poses these joints on top of idle / walk. */
export interface PlayerRig {
  root: THREE.Group; model: THREE.Group; body: THREE.Group; head: THREE.Group;
  arms: { pivot: THREE.Group; sx: number }[];
  legs: { pivot: THREE.Group }[];
}

export function createPlayerMesh(): ActorMesh & PlayerRig & { setLook(l: Look): void; setAccessory(id: string | null): void } {
  const a = build({
    kind: 'player', skin: '#ffe9f4', accent: PALETTE.pink, dress: '#fff1e0', band: 'pink', shoes: '#ff8fb8',
    scale: 1, headScale: [1.1, 1.06, 1.08], headDrop: -0.04, bodyScale: [1.08, 0.92, 1.08], eyeScale: 1.16,
  });
  // the wardrobe draws the clothes; the stock dress / hem of the shared body stay hidden
  a.dress.visible = a.band.visible = false;
  const accessories = buildAccessories();
  a.head.add(...Object.values(accessories));
  const skinLeg = toon('#ffe9f4');
  const worn = new Map<string, THREE.Object3D>(); // slot -> model currently attached
  const attach = (slot: string, obj: THREE.Object3D | null, parent: THREE.Object3D | null) => {
    const cur = worn.get(slot);
    if (cur === obj) return;
    cur?.removeFromParent();
    if (obj && parent) { parent.add(obj); worn.set(slot, obj); } else worn.delete(slot);
  };
  let cur = '', curAcc: string | null = null;
  return Object.assign(a, {
    setAccessory(id: string | null) {
      if (id === curAcc) return;
      curAcc = id;
      for (const [k, o] of Object.entries(accessories)) o.visible = k === id;
    },
    setLook(l: Look) {
      const key = lookKey(l);
      if (cur === key) return;
      cur = key;
      // body: a dress, or a top over a bottom
      attach('dress', l.dress ? buildCloth(l.dress) : null, a.body);
      attach('top', l.dress ? null : buildCloth(l.top), a.body);
      attach('bottom', l.dress ? null : buildCloth(l.bottom), a.body);
      // sleeves + legs follow the clothes
      const sl = sleeveOf(l), pants = legsOf(l);
      for (const arm of a.arms) {
        arm.sleeve.visible = !!sl.mat && sl.len > 0;
        if (sl.mat) arm.sleeve.material = sl.mat;
        arm.sleeve.scale.set(sl.len === 3 ? 1.22 : 1, sl.len === 1 || sl.len === 3 ? 0.5 : 1, sl.len === 3 ? 1.22 : 1);
      }
      for (const lg of a.legs) lg.leg.material = pants ?? skinLeg;
      // shoes: hide the stock ones, hang the item's pair on the legs
      const pair = l.shoes ? buildShoes(l.shoes) : null;
      a.legs.forEach((lg, i) => { lg.shoe.visible = !l.shoes; attach('shoe' + i, pair ? pair[i] : null, lg.pivot); });
      // head: hat (hood ears hide under a hat), face piece
      attach('hat', l.hat ? buildCloth(l.hat) : null, a.head);
      const hood = headExtraOf(l);
      attach('hood', hood && !l.hat ? buildHood(hood) : null, a.head);
      attach('face', l.face ? buildCloth(l.face) : null, a.head);
      // bag: hand-held (right hand) or on the back / hip
      const bagObj = l.bag ? buildCloth(l.bag) : null;
      const hand = bagObj?.userData.mount === 'hand';
      if (hand) bagObj!.position.set(0, -0.27, 0);
      attach('bag', bagObj, hand ? a.arms[1].pivot : a.body);
    },
  });
}

const HEAD_COLORS: Record<string, string> = { dormouse: '#fbe3ea', hamster: '#f6d9a0', hedgehog: '#e8cfc0', bunny: '#ebe3fa', capybara: '#e9c9a0', moth: '#f4ecff', axolotl: '#ffc4d8', seal: '#f4d2e0' };
const VILLAGER_LOOK: Record<string, { dress?: Fill; band: Fill; shoes: string; bow?: Fill }> = {
  dormouse: { band: 'classic', shoes: '#ffffff', bow: 'pink' },
  hamster: { dress: 'classic', band: '#ffffff', shoes: PALETTE.rose, bow: PALETTE.rose },
  hedgehog: { band: 'classic', shoes: '#c9a8e8' },
  bunny: { band: '#ffffff', shoes: '#c9b8ee' },
  capybara: { band: 'classic', shoes: '#c98c5a' },
  moth: { band: '#ffffff', shoes: '#d9c6ff' },
  axolotl: { band: 'pink', shoes: '#ff8fb6' },
  seal: { band: '#ffffff', shoes: '#a98fd6' },
};

/** Five-point gold star, used as Nimbus's ear clip. */
function puffStar(): THREE.Object3D {
  const b = new Batch();
  const len = 0.11;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const dx = Math.cos(a), dy = Math.sin(a);
    b.add(G.cone(0.032, len, 4), '#ffd36e', { x: dx * len * 0.28, y: dy * len * 0.28, dir: [dx, dy, 0.08] });
  }
  b.add(G.ball(0.03, 8), '#fff6d2', { z: 0.01 });
  return b.build(vertexToon('#ffe7a0'));
}

/** Per-species body tweaks: size, head shape, and extra pieces. Edit here to refine a character without touching build(). */
const VILLAGER_SHAPE: Partial<Record<string, Pick<Spec, 'scale' | 'headScale' | 'headDrop' | 'bodyScale' | 'eyeScale' | 'extra'>>> = {
  hamster: {
    scale: 0.9, headScale: [1.16, 1.02, 1.12], headDrop: -0.03, bodyScale: [1.12, 0.9, 1.12], eyeScale: 1.12,
    extra({ model, body }) {
      const bell = new Batch()
        .add(G.ball(0.055, 10), '#ffd36e', { y: 0.48, z: 0.16 })
        .add(G.ball(0.014, 6), '#a8456f', { y: 0.445, z: 0.2 })
        .build();
      body.add(bell);
      const tail = new Batch()
        .add(G.ball(0.07, 10), '#f6d9a0', {})
        .add(G.ball(0.028, 6), '#7a4a3a', { z: 0.02, s: [1, 0.45, 0.8] })
        .build();
      tail.position.set(0, HIP_Y + 0.2, -0.26);
      model.add(tail);
    },
  },
  bunny: {
    scale: 1.02, headScale: [1.06, 1.02, 1.04], headDrop: -0.02, bodyScale: [1.04, 0.94, 1.04], eyeScale: 1.14,
    // cloud puffs hiding the hem, a cotton-ball tail, and a gold star on the upright ear
    extra({ model, head }) {
      const puffs = new Batch();
      const cols = ['#f7f4ff', '#efe8ff', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        puffs.add(G.ball(0.18, 12), cols[i % 3], { x: Math.sin(a) * 0.36, y: 0.02 + (i % 2) * 0.04, z: Math.cos(a) * 0.36, s: [1, 0.78, 1] });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        puffs.add(G.ball(0.11, 10), cols[(i + 1) % 3], { x: Math.sin(a) * 0.26, y: 0.22, z: Math.cos(a) * 0.26 });
      }
      const mist = puffs.build();
      mist.name = 'bunny-mist';
      mist.position.y = HIP_Y;
      const tail = new Batch()
        .add(G.ball(0.13, 10), '#ffffff', {})
        .add(G.ball(0.08, 8), '#f4f0ff', { x: 0.06, y: 0.04, z: 0.02 })
        .add(G.ball(0.07, 8), '#ffffff', { x: -0.05, y: 0.02 })
        .build();
      tail.name = 'bunny-tail';
      tail.position.set(0, HIP_Y + 0.18, -0.32);
      const star = puffStar();
      star.position.set(-0.2, 0.92, 0.06);
      star.rotation.z = 0.15;
      model.add(mist, tail);
      head.add(star);
      return (t, walk) => {
        mist.scale.set(1 + Math.sin(t * 1.4) * 0.03, 1 + Math.sin(t * 1.9 + 1) * 0.045, 1 + Math.sin(t * 1.4) * 0.03);
        mist.rotation.y = t * 0.12;
        tail.position.y = HIP_Y + 0.18 + Math.abs(Math.sin(t * 11)) * 0.03 * walk;
        const tw = 1 + Math.sin(t * 2.4) * 0.08;
        star.scale.setScalar(tw);
      };
    },
  },
  capybara: {
    scale: 1.04, headScale: [1.14, 1.0, 1.2], headDrop: -0.03, bodyScale: [1.2, 0.95, 1.2], eyeScale: 0.95,
    // a warm croissant balanced on the head, and a stubby tail
    extra({ model, head }) {
      const cr = new Batch();
      for (let i = -2; i <= 2; i++) cr.add(G.ball(0.1 - Math.abs(i) * 0.014, 10), i % 2 ? '#f2b765' : '#e49c5a', { x: i * 0.1, y: -Math.abs(i) * 0.03, z: 0, s: [1, 0.9, 1.1], rz: i * 0.25 });
      const croissant = cr.build();
      croissant.position.set(0.02, 0.47, 0.0);
      head.add(croissant);
      const tail = new Batch().add(G.ball(0.08, 8), '#dcb98c', {}).build();
      tail.position.set(0, HIP_Y + 0.15, -0.34);
      model.add(tail);
    },
  },
  moth: {
    scale: 0.96, headScale: [1.05, 1.02, 1.04], headDrop: -0.02, bodyScale: [1.0, 1.0, 1.0], eyeScale: 1.22,
    // four pastel wings that flutter, with pressed-flower speckles
    extra({ model }) {
      const wing = (sx: number, up: boolean) => {
        const b = new Batch();
        b.add(G.ball(0.3, 14), up ? '#e6d4ff' : '#ffd9ea', { s: [up ? 1.2 : 0.95, up ? 1.1 : 0.9, 0.08], y: up ? 0.1 : -0.15 });
        b.add(G.ball(0.1, 10), up ? '#ff9ec0' : '#c9b8ee', { x: sx * 0.14, y: up ? 0.12 : -0.15, z: 0.03, s: [1, 1, 0.3] });
        b.add(G.ball(0.045, 8), '#ffffff', { x: sx * 0.32, y: up ? 0.18 : -0.2, z: 0.04, s: [1, 1, 0.4] });
        const m = b.build();
        const piv = new THREE.Group();
        m.position.x = sx * 0.28;
        piv.add(m);
        piv.position.set(sx * 0.1, HIP_Y + 0.46, -0.2);
        piv.rotation.y = sx * 0.5;
        model.add(piv);
        return piv;
      };
      const wings = [wing(-1, true), wing(1, true), wing(-1, false), wing(1, false)];
      return (t, walk) => {
        const f = Math.sin(t * (4 + walk * 8)) * (0.18 + walk * 0.2);
        wings.forEach((w, i) => { const sx = i % 2 ? 1 : -1; w.rotation.y = sx * (0.5 + f); });
      };
    },
  },
  axolotl: {
    scale: 0.96, headScale: [1.2, 1.0, 1.1], headDrop: -0.03, bodyScale: [1.08, 0.92, 1.08], eyeScale: 1.1,
    // a wiggly fin tail that giggles when it moves
    extra({ model }) {
      const tail = new Batch()
        .add(G.ball(0.16, 10), '#ffc4d8', { s: [0.5, 1.0, 1.4] })
        .add(G.ball(0.1, 8), '#ff9ec0', { y: 0.08, z: -0.18, s: [0.35, 0.9, 1.2] })
        .build();
      tail.position.set(0, HIP_Y + 0.16, -0.36);
      model.add(tail);
      return (t, walk) => { tail.rotation.y = Math.sin(t * (3 + walk * 8)) * (0.35 + walk * 0.25); };
    },
  },
  seal: {
    scale: 1.02, headScale: [1.1, 1.0, 1.1], headDrop: -0.03, bodyScale: [1.18, 0.94, 1.18], eyeScale: 1.05,
    // round flipper tail, and a lavender-and-gold scarf
    extra({ model, body }) {
      const flip = new Batch();
      for (const sx of [-1, 1]) flip.add(G.ball(0.1, 10), '#e8bfd2', { x: sx * 0.1, s: [1.3, 0.35, 1.5], rz: sx * 0.3 });
      const tail = flip.build();
      tail.position.set(0, HIP_Y + 0.1, -0.34);
      model.add(tail);
      const scarf = new Batch().add(G.torus(0.2, 0.05, 18), '#a98fd6', { rx: Math.PI / 2 }).add(G.ball(0.055, 8), PALETTE.gold, { x: 0.06, y: -0.04, z: 0.19 }).build();
      scarf.position.set(0, 0.56, 0.03);
      body.add(scarf);
    },
  },
};

export function createVillagerMesh(def: VillagerDef): ActorMesh {
  const look = VILLAGER_LOOK[def.species] ?? VILLAGER_LOOK.dormouse;
  const shape = VILLAGER_SHAPE[def.species];
  const a = build({
    kind: def.species as Kind, skin: HEAD_COLORS[def.species] ?? '#ffffff', accent: def.accent,
    dress: look.dress ?? def.color, band: look.band, shoes: look.shoes, scale: shape?.scale ?? 1,
    headScale: shape?.headScale, headDrop: shape?.headDrop, bodyScale: shape?.bodyScale, eyeScale: shape?.eyeScale, extra: shape?.extra,
  });
  if (look.bow) {
    const print = isPrint(look.bow);
    const top = def.species === 'hamster'; // Dottie wears hers dead centre on the crown
    const bow = bowGeo(new Batch(), print ? '#ffffff' : look.bow, top ? 1.45 : 1).build(print ? cheetahToon(look.bow as CheetahKind) : undefined);
    bow.position.set(...on(top ? 0 : 40, top ? 78 : 52, 1.12));
    bow.rotation.set(-0.3, 0, top ? 0 : -0.45);
    a.head.add(bow);
  }
  return a;
}
