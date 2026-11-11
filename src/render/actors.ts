// Player + villagers: chunky original toy characters. Big round head, small flared outfit, stubby limbs,
// blush cheeks, shiny eyes, and cheetah print somewhere on everyone.
// The rest of the game only uses the ActorMesh interface below.
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import type { OutfitDef, VillagerDef } from '../data';
import { cheetahTexture, cheetahToon, contactShadow, makeToon, PALETTE, type CheetahKind } from './materials';
import { ball, Batch, G, lerpAngle, mat } from './util';

export interface ActorMesh {
  root: THREE.Group;
  /** Rotates around Y, smoothed. */
  setFacing(f: Facing, dt: number): void;
  /** Idle breathing / walk bob. */
  animate(t: number, moving: boolean): void;
  setAlert?(on: boolean): void;
}

const FACE_ANGLE: Record<Facing, number> = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

type Kind = 'player' | 'dormouse' | 'hamster' | 'hedgehog' | 'bunny';
type Fill = string | CheetahKind; // hex color or a cheetah print
const isPrint = (f: Fill): f is CheetahKind => f === 'classic' || f === 'pink';

// ---- proportions (model space, feet on y = 0) ----
const HEAD_Y = 1.0;
const HA = 0.46, HB = 0.39, HC = 0.41; // head ellipsoid radii
const HIP_Y = 0.2;
const EYE = '#4f2b40';
const BLUSH = '#ff9dbd';
const DEG = Math.PI / 180;

/** Point on the head surface. yaw 0 = face front (+z), pitch up. `out` pushes along the radius. */
function on(yaw: number, pitch: number, out = 1): [number, number, number] {
  const y = yaw * DEG, p = pitch * DEG;
  return [HA * Math.sin(y) * Math.cos(p) * out, HB * Math.sin(p) * out, HC * Math.cos(y) * Math.cos(p) * out];
}
const at = (v: [number, number, number]) => ({ x: v[0], y: v[1], z: v[2] });

/** Flared bell outfit profile, relative to the hip. */
const DRESS: [number, number][] = [[0.001, 0], [0.3, 0], [0.35, 0.04], [0.345, 0.11], [0.29, 0.25], [0.2, 0.42], [0.14, 0.52], [0.001, 0.56]];
const BAND: [number, number][] = [[0.3, -0.012], [0.365, 0.035], [0.36, 0.115], [0.325, 0.19], [0.3, 0.2]];
let dressGeo: THREE.BufferGeometry | null = null, bandGeo: THREE.BufferGeometry | null = null, sleeveGeo: THREE.BufferGeometry | null = null;
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
    case 'player':
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.15), skin, { x: sx * 0.31, y: 0.29, z: -0.02, s: [1, 1, 0.6] });
        b.add(G.ball(0.09, 10), earInner, { x: sx * 0.31, y: 0.285, z: 0.05, s: [1, 1, 0.4] });
      }
      // soft swirl of fringe
      b.add(G.ball(0.13), '#ffb3cf', { ...at(on(-8, 62, 1.02)), s: [1.2, 0.7, 1] });
      b.add(G.ball(0.1), '#ffb3cf', { ...at(on(16, 50, 1.04)), s: [1.1, 0.7, 1] });
      b.add(G.ball(0.07), '#ffc6dc', { ...at(on(36, 40, 1.05)) });
      b.add(G.ball(0.035, 8), PALETTE.cocoa, { ...at(on(0, -7, 1.0)), s: [1.3, 0.9, 0.8] });
      break;
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
      // Dottie: a small round hamster with cheetah markings. Parts are named in comments so a polish pass can retune them.
      // -- chubby stuffed cheeks
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.21, 14), skin, { x: sx * 0.33, y: -0.09, z: 0.1, s: [1, 0.95, 0.92] });
        // cheetah rosettes on the cheeks
        for (const [dx, dy, dz, k] of [[0.5, -0.02, 0.5, 1], [0.7, -0.22, 0.2, 0.8], [0.3, -0.3, 0.7, 0.7]] as [number, number, number, number][]) {
          b.add(G.ball(0.04, 8), accent, { x: sx * (0.33 + dx * 0.2), y: -0.09 + dy * 0.2, z: 0.1 + dz * 0.2, dir: [sx * dx, dy, dz], s: [k, 0.25, k] });
        }
      }
      // -- tiny rounded ears, set wide and low on the crown
      for (const sx of [-1, 1]) {
        b.add(G.ball(0.1, 12), skin, { x: sx * 0.27, y: 0.3, z: -0.03, s: [1, 1, 0.6] });
        b.add(G.ball(0.06, 10), earInner, { x: sx * 0.27, y: 0.295, z: 0.03, s: [1, 1, 0.4] });
      }
      // -- spots over the crown and brow
      const spots: [number, number, number][] = [[0, 76, 1], [-30, 62, 0.8], [30, 64, 0.9], [-62, 52, 0.8], [64, 50, 0.9], [-110, 56, 1], [112, 58, 0.9], [180, 60, 1], [10, 48, 0.55]];
      for (const [yw, pt, k] of spots) b.add(G.ball(0.045, 8), accent, { ...at(on(yw, pt, 0.995)), dir: on(yw, pt), s: [k, 0.25, k * 0.8] });
      // -- cheetah tear marks under the eyes
      for (const sx of [-1, 1]) b.add(G.ball(0.028, 6), accent, { ...at(on(sx * 21, -11, 1.0)), s: [0.55, 2.4, 0.5] });
      // -- small cream snout, rosy nose, two tiny front teeth
      b.add(G.ball(0.1, 10), '#fff7ea', { ...at(on(0, -16, 0.95)), s: [1.15, 0.75, 0.7] });
      b.add(G.ball(0.032, 8), '#ff8fb0', { ...at(on(0, -10, 1.04)), s: [1.3, 0.85, 0.8] });
      b.add(G.box(0.028, 0.036, 0.012), '#ffffff', { ...at(on(0, -21, 1.0)) });
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
      // Nimbus: a fog-puff bunny. Soft round head, long ears (one a little floppy), cloudy fur tufts, gold star clip.
      const fog = '#f6f1ff', fogInner = '#ffd0e6';
      for (const sx of [-1, 1]) {
        const floppy = sx === 1;
        b.add(G.capsule(0.078, 0.26), skin, { x: sx * (floppy ? 0.2 : 0.17), y: floppy ? 0.6 : 0.64, z: -0.03, rz: -sx * (floppy ? 0.55 : 0.16), s: [1, 1, 0.8] }); // ear
        b.add(G.capsule(0.046, 0.2), fogInner, { x: sx * (floppy ? 0.21 : 0.17), y: floppy ? 0.6 : 0.64, z: 0.0, rz: -sx * (floppy ? 0.55 : 0.16), s: [1, 1, 0.5] }); // inner ear
      }
      // misty fringe and cheek fluff
      b.add(G.ball(0.12), fog, { ...at(on(0, 64, 1.02)), s: [1.2, 0.8, 1] });
      b.add(G.ball(0.09), fog, { ...at(on(-24, 58, 1.03)) });
      b.add(G.ball(0.085), fog, { ...at(on(26, 56, 1.03)) });
      for (const sx of [-1, 1]) b.add(G.ball(0.1), fog, { ...at(on(sx * 66, -10, 1.0)), s: [0.8, 0.9, 0.9] });
      b.add(G.ball(0.1, 10), fog, { ...at(on(0, -15, 0.95)), s: [1.1, 0.75, 0.7] }); // muzzle
      b.add(G.ball(0.03, 8), '#f59ac0', { ...at(on(0, -9, 1.04)), s: [1.3, 0.85, 0.8] }); // nose
      b.add(G.ball(0.032, 8), accent, { ...at(on(-48, 48, 1.06)), s: [1, 1, 0.5] }); // gold star clip (a bead for now)
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
  /** Add model-level pieces (tail, mist skirt…). May return a per-frame callback (t, walk 0..1). */
  extra?: (parts: { model: THREE.Group; body: THREE.Group; head: THREE.Group }) => ((t: number, walk: number) => void) | void;
}

function build(sp: Spec) {
  const root = new THREE.Group();
  const model = new THREE.Group(); // bobs / turns / squashes

  dressGeo ??= scaleUv(G.lathe(DRESS, 22), 2.5, 0.9);
  bandGeo ??= scaleUv(G.lathe(BAND, 22), 2.5, 0.28);
  sleeveGeo ??= scaleUv(G.capsule(0.072, 0.13).translate(0, -0.12, 0), 0.5, 0.4);

  const dressMat = fillMat(sp.dress), bandMat = fillMat(sp.band);
  const body = new THREE.Group();
  body.position.y = HIP_Y;
  const dress = new THREE.Mesh(dressGeo, dressMat), band = new THREE.Mesh(bandGeo, bandMat);
  dress.castShadow = dress.receiveShadow = band.castShadow = band.receiveShadow = true;
  body.add(dress, band);

  // arms: sleeve in the outfit fabric + round hand
  const arms = [-1, 1].map((sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.16, 0.44, 0.01);
    pivot.rotation.z = sx * 0.62;
    const sleeve = new THREE.Mesh(sleeveGeo!, dressMat);
    sleeve.castShadow = true;
    const hb = new Batch().add(G.ball(0.078, 10), sp.skin, { y: -0.27 });
    if (sp.bag && sx === 1) {
      // tiny shopping bag swinging from the hand
      hb.add(G.box(0.17, 0.15, 0.08), PALETTE.pink, { y: -0.47 });
      hb.add(G.box(0.175, 0.04, 0.085), '#ffffff', { y: -0.44 });
      hb.add(G.torus(0.05, 0.012, 10, Math.PI), PALETTE.cocoa, { y: -0.395 });
    }
    pivot.add(sleeve, hb.build());
    body.add(pivot);
    return { pivot, sx };
  });

  // legs: stubby with chunky shoes
  const legs = [-1, 1].map((sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.12, 0.27, 0);
    const lb = new Batch()
      .add(G.capsule(0.075, 0.08), sp.skin, { y: -0.1 })
      .add(G.ball(0.1, 10), sp.shoes, { y: -0.2, z: 0.04, s: [1, 0.68, 1.4] });
    pivot.add(lb.build());
    return pivot;
  });

  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  head.rotation.x = -0.13; // chin up towards the high camera
  const eyes = buildEyes();
  head.add(buildHead(sp.kind, sp.skin, sp.accent), eyes);

  if (sp.headScale) head.scale.set(...sp.headScale);
  model.add(body, legs[0], legs[1], head);
  const tick = sp.extra?.({ model, body, head });
  root.add(contactShadow(1.0 * sp.scale), model);
  const marker = ball(0.09, mat(PALETTE.gold, PALETTE.gold), 0, 2.0 * sp.scale, 0, 8);
  marker.castShadow = false;
  marker.visible = false;
  root.add(marker);

  let ang = 0, last = -1, walk = 0, phase = 0;
  const off = Math.random() * 10;
  const api: ActorMesh & { dressMat: THREE.MeshToonMaterial; bandMat: THREE.MeshToonMaterial; head: THREE.Group } = {
    root, dressMat, bandMat, head,
    setFacing(f, dt) { ang = lerpAngle(ang, FACE_ANGLE[f], Math.min(1, dt * 14)); model.rotation.y = ang; },
    animate(t, moving) {
      const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, t - last));
      last = t;
      walk += ((moving ? 1 : 0) - walk) * Math.min(1, dt * 10);
      if (walk > 0.01) phase += dt * 11; else phase = 0;
      const w = walk, idle = 1 - w;
      const s = Math.sin(phase), hop = Math.abs(Math.cos(phase)); // feet land at the swing extremes
      const br = Math.sin(t * 2.3 + off);
      // hop with squash on landing, stretch at the top
      const sq = (hop - 0.45) * w;
      model.position.y = hop * 0.075 * w * sp.scale;
      model.scale.set(sp.scale * (1 - sq * 0.07), sp.scale * (1 + sq * 0.14), sp.scale * (1 - sq * 0.07));
      model.rotation.z = s * 0.045 * w;
      // breathing
      body.scale.set(1 - br * 0.014 * idle, 1 + br * 0.035 * idle, 1 - br * 0.014 * idle);
      head.position.y = HEAD_Y + br * 0.016 * idle - (1 - hop) * 0.02 * w;
      head.rotation.z = Math.sin(t * 1.1 + off) * 0.035 * idle - s * 0.05 * w;
      for (const a of arms) a.pivot.rotation.x = a.sx * s * 0.8 * w + br * 0.05 * idle;
      legs[0].rotation.x = -s * 0.75 * w;
      legs[1].rotation.x = s * 0.75 * w;
      eyes.scale.y = (t + off * 3) % 3.7 < 0.12 ? 0.12 : 1; // blink
      marker.position.y = 2.0 * sp.scale + Math.sin(t * 3) * 0.06;
      tick?.(t, w);
    },
    setAlert(on) { marker.visible = on; },
  };
  api.animate(0, false);
  last = -1;
  return api;
}

export function createPlayerMesh(): ActorMesh & { setOutfit(o: OutfitDef): void } {
  const a = build({ kind: 'player', skin: '#fff3ea', accent: PALETTE.pink, dress: '#fff1e0', band: 'pink', shoes: PALETTE.rose, scale: 1, bag: true });

  // hats (built once, toggled per outfit)
  const bow = bowGeo(new Batch(), '#ffffff', 1.25).build(cheetahToon('pink'));
  bow.position.set(...on(-38, 58, 1.08));
  bow.rotation.set(-0.3, 0, 0.45);

  const beret = new Batch()
    .add(G.ball(0.3, 16), PALETTE.rose, { s: [1, 0.42, 1] })
    .add(G.cyl(0.2, 0.22, 0.05), '#ff7fa9', { y: -0.07 })
    .add(G.ball(0.035, 8), '#ff7fa9', { y: 0.14 })
    .build();
  beret.position.set(0.08, HB + 0.02, 0.02);
  beret.rotation.set(-0.1, 0, -0.28);

  const sunhat = new THREE.Group();
  sunhat.add(new Batch()
    .add(G.cyl(0.56, 0.6, 0.035, 24), '#fff4dc', {})
    .add(G.ball(0.3, 16), '#fff4dc', { y: 0.02, s: [1, 0.7, 1] })
    .build());
  const hatBand = new THREE.Mesh(scaleUv(new THREE.CylinderGeometry(0.295, 0.31, 0.09, 20, 1, true), 2.2, 0.12), cheetahToon('classic'));
  hatBand.position.y = 0.055;
  hatBand.castShadow = true;
  sunhat.add(hatBand);
  sunhat.position.set(0, HB - 0.07, -0.05);
  sunhat.rotation.x = -0.3;

  a.head.add(bow, beret, sunhat);
  const tmp = new THREE.Color();
  let cur = '';
  return Object.assign(a, {
    setOutfit(o: OutfitDef) {
      if (cur === o.id) return;
      cur = o.id;
      setFill(a.dressMat, o.pattern ?? o.body);
      // printed outfits get a plain trim hem; plain outfits get a cheetah-print hem that contrasts with the fabric
      tmp.set(o.body);
      setFill(a.bandMat, o.pattern ? o.trim : tmp.r - tmp.g > 0.12 ? 'classic' : 'pink');
      bow.visible = o.hat === 'bow';
      beret.visible = o.hat === 'beret';
      sunhat.visible = o.hat === 'sunhat';
    },
  });
}

const HEAD_COLORS: Record<string, string> = { dormouse: '#fbe3ea', hamster: '#f6d9a0', hedgehog: '#e8cfc0', bunny: '#ebe3fa' };
const VILLAGER_LOOK: Record<string, { dress?: Fill; band: Fill; shoes: string; bow?: Fill }> = {
  dormouse: { band: 'classic', shoes: '#ffffff', bow: 'pink' },
  hamster: { dress: 'classic', band: '#ffffff', shoes: PALETTE.rose, bow: PALETTE.rose },
  hedgehog: { band: 'classic', shoes: '#c9a8e8' },
  bunny: { band: '#ffffff', shoes: '#c9b8ee' },
};

/** Per-species body tweaks: size, head shape, and extra pieces. Edit here to refine a character without touching build(). */
const VILLAGER_SHAPE: Partial<Record<string, Pick<Spec, 'scale' | 'headScale' | 'extra'>>> = {
  hamster: { scale: 0.92, headScale: [1.1, 1.0, 1.04] },
  bunny: {
    scale: 1,
    // a ring of cloud puffs hiding the hem, a smaller ring higher up, and a cotton tail; the puffs bob gently
    extra({ model, body }) {
      const puffs = new Batch();
      const cols = ['#f6f1ff', '#e9e0fa'];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        puffs.add(G.ball(0.14, 10), cols[i % 2], { x: Math.sin(a) * 0.34, y: 0.04 + (i % 2) * 0.03, z: Math.cos(a) * 0.34, s: [1, 0.8, 1] });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        puffs.add(G.ball(0.1, 10), cols[(i + 1) % 2], { x: Math.sin(a) * 0.27, y: 0.2, z: Math.cos(a) * 0.27 });
      }
      const mist = puffs.build();
      mist.name = 'bunny-mist';
      mist.position.y = HIP_Y;
      const tail = new Batch().add(G.ball(0.12, 10), '#ffffff', {}).build();
      tail.name = 'bunny-tail';
      tail.position.set(0, HIP_Y + 0.16, -0.3);
      model.add(mist, tail);
      void body;
      return (t, walk) => {
        mist.scale.set(1 + Math.sin(t * 1.4) * 0.025, 1 + Math.sin(t * 1.9 + 1) * 0.04, 1 + Math.sin(t * 1.4) * 0.025);
        mist.rotation.y = t * 0.15;
        tail.position.y = HIP_Y + 0.16 + Math.abs(Math.sin(t * 11)) * 0.03 * walk;
      };
    },
  },
};

export function createVillagerMesh(def: VillagerDef): ActorMesh {
  const look = VILLAGER_LOOK[def.species] ?? VILLAGER_LOOK.dormouse;
  const shape = VILLAGER_SHAPE[def.species];
  const a = build({
    kind: def.species as Kind, skin: HEAD_COLORS[def.species] ?? '#ffffff', accent: def.accent,
    dress: look.dress ?? def.color, band: look.band, shoes: look.shoes, scale: shape?.scale ?? 1,
    headScale: shape?.headScale, extra: shape?.extra,
  });
  if (look.bow) {
    const print = isPrint(look.bow);
    const bow = bowGeo(new Batch(), print ? '#ffffff' : look.bow).build(print ? cheetahToon(look.bow as CheetahKind) : undefined);
    const top = def.species === 'hamster'; // Dottie wears hers dead centre on the crown
    bow.position.set(...on(top ? 0 : 40, top ? 80 : 52, 1.1));
    bow.rotation.set(-0.3, 0, top ? 0 : -0.45);
    a.head.add(bow);
  }
  return a;
}
