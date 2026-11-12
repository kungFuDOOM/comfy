// The pet companion's 3D model: a little kitten or puppy built from primitives.
//
// SKELETON QUALITY, on purpose. Structure for the polish pass:
//   buildKitten() / buildPuppy()  -> fill a `Rig` (named pivots), nothing else in this file cares how they look.
//   Rig pivots: body, head, tail, legs[0..3] (FL, FR, BL, BR), eyes, plus anchors headTop / bodyWrap for accessories.
//   poseRig()                     -> all animation (walk / idle / sit / sleep / happy) as blends over those pivots.
//   buildAccessory()              -> bows, hats, sweaters, attached to the anchors.
// The follow / save / UI rules live in src/pet.ts and only talk to this file through PetPose, so the meshes and
// animations can be restyled (softer shapes, vertex-colored toy fur, ear flops...) without touching them.
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import { coatById, petItemById, type Coat, type PetItem, type PetKind } from '../petData';
import type { PetPose } from '../pet';
import type { ActorMesh } from './actors';
import { contactShadow, toon } from './materials';

export interface PetMesh extends ActorMesh {
  /** Rebuild the body when the kind / coat changes (a no-op when unchanged). */
  setLook(kind: PetKind, coat: string): void;
  /** Worn accessories (ids from PET_ITEMS), or null. */
  setOutfit(head: string | null, body: string | null): void;
  /** Drive everything from the sim's pose: position is set by the caller, this does heading + animation. */
  setPose(p: PetPose, t: number, dt: number): void;
}

const EYE = '#4f2b40', BLUSH = '#ff9dbd', NOSE = '#ff8fb6';
const sphere = new THREE.SphereGeometry(1, 18, 14);
const cone = new THREE.ConeGeometry(1, 1, 10);
const capsule = new THREE.CapsuleGeometry(1, 1, 4, 10);
const torus = new THREE.TorusGeometry(1, 0.22, 8, 22);
const halfSphere = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);

function part(geo: THREE.BufferGeometry, color: string, s: [number, number, number], p: [number, number, number] = [0, 0, 0], parent?: THREE.Object3D): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color));
  m.scale.set(s[0], s[1], s[2]);
  m.position.set(p[0], p[1], p[2]);
  m.castShadow = true;
  parent?.add(m);
  return m;
}
const pivot = (parent: THREE.Object3D, x: number, y: number, z: number) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

interface Rig {
  model: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[]; // FL, FR, BL, BR
  eyes: THREE.Group;
  ears: THREE.Group[];
  headTop: THREE.Group;
  bodyWrap: THREE.Group;
  accessories: THREE.Group;
  /** Rest height of the pivots (set by the builder). */
  hipY: number;
  headBase: THREE.Vector3;
}

function baseRig(c: Coat): Rig {
  const model = new THREE.Group();
  const body = pivot(model, 0, 0.27, 0);
  part(sphere, c.body, [0.25, 0.21, 0.32], [0, 0, 0], body);
  part(sphere, c.accent, [0.19, 0.12, 0.22], [0, -0.1, 0.07], body); // belly
  if (c.spots) for (const [x, y, z, k] of [[0.2, 0.08, -0.12, 1], [0.22, -0.02, -0.04, 0.8], [-0.2, 0.1, -0.14, 0.9]] as const) part(sphere, '#a8734f', [0.035 * k, 0.03 * k, 0.012], [x, y, z], body).rotation.y = Math.PI / 2;
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-0.12, 0.17], [0.12, 0.17], [-0.13, -0.17], [0.13, -0.17]] as const) {
    const leg = pivot(body, x, -0.1, z);
    part(capsule, c.body, [0.065, 0.1, 0.065], [0, -0.1, 0], leg);
    part(sphere, c.accent, [0.075, 0.05, 0.09], [0, -0.2, 0.02], leg); // paw
    legs.push(leg);
  }
  const head = pivot(body, 0, 0.17, 0.27);
  part(sphere, c.body, [0.23, 0.2, 0.2], [0, 0.07, 0], head);
  part(sphere, c.accent, [0.12, 0.08, 0.08], [0, -0.01, 0.13], head); // muzzle
  for (const sx of [-1, 1]) part(sphere, BLUSH, [0.045, 0.03, 0.015], [sx * 0.14, 0.0, 0.17], head).rotation.y = sx * 0.6;
  part(sphere, NOSE, [0.03, 0.022, 0.022], [0, 0.03, 0.2], head);
  const eyes = pivot(head, 0, 0.09, 0.18);
  for (const sx of [-1, 1]) {
    part(sphere, EYE, [0.034, 0.045, 0.02], [sx * 0.085, 0, 0], eyes);
    part(sphere, '#ffffff', [0.012, 0.014, 0.01], [sx * 0.085 + 0.008, 0.015, 0.015], eyes);
  }
  const tail = pivot(body, 0, 0.04, -0.3);
  const headTop = pivot(head, 0, 0.24, -0.01);
  const bodyWrap = pivot(body, 0, 0, 0);
  const accessories = new THREE.Group();
  model.add(accessories);
  return { model, body, head, tail, legs, eyes, ears: [], headTop, bodyWrap, accessories, hipY: 0.27, headBase: head.position.clone() };
}

function buildKitten(c: Coat): Rig {
  const r = baseRig(c);
  for (const sx of [-1, 1]) {
    const ear = pivot(r.head, sx * 0.13, 0.2, -0.02);
    part(cone, c.body, [0.08, 0.15, 0.06], [0, 0.05, 0], ear);
    part(cone, c.inner, [0.05, 0.1, 0.03], [0, 0.04, 0.03], ear);
    ear.rotation.z = -sx * 0.25;
    r.ears.push(ear);
    // whiskers: thin pale bars
    for (const dy of [-0.012, 0.014]) part(capsule, '#ffffff', [0.004, 0.07, 0.004], [sx * 0.2, 0.025 + dy, 0.15], r.head).rotation.z = Math.PI / 2 + dy * 4;
  }
  // a long, curvy tail
  part(capsule, c.body, [0.045, 0.14, 0.045], [0, 0.12, -0.04], r.tail).rotation.x = -0.45;
  part(sphere, c.accent, [0.055, 0.055, 0.055], [0, 0.26, -0.12], r.tail);
  return r;
}

function buildPuppy(c: Coat): Rig {
  const r = baseRig(c);
  for (const sx of [-1, 1]) {
    // floppy ears hang from the top of the head
    const ear = pivot(r.head, sx * 0.17, 0.2, 0.0);
    part(sphere, c.inner === c.body ? c.accent : darken(c.body), [0.07, 0.15, 0.1], [sx * 0.03, -0.1, 0], ear);
    ear.rotation.z = sx * 0.28;
    r.ears.push(ear);
  }
  part(sphere, '#ff9fb4', [0.04, 0.012, 0.05], [0, -0.07, 0.19], r.head); // tongue tip
  part(sphere, c.accent, [0.055, 0.07, 0.04], [0, 0.2, 0.1], r.head); // forehead blaze
  // short wagging tail
  part(capsule, c.body, [0.05, 0.07, 0.05], [0, 0.08, -0.03], r.tail).rotation.x = -0.7;
  return r;
}

function darken(hex: string): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(0.86);
  return '#' + c.getHexString();
}

// ---- accessories (attached to headTop / bodyWrap; colors come from the PET_ITEMS catalog) ----
function buildAccessory(item: PetItem): THREE.Group {
  const g = new THREE.Group();
  switch (item.shape) {
    case 'bow': {
      g.position.set(0.1, 0.0, 0.0);
      g.rotation.z = -0.35;
      for (const sx of [-1, 1]) part(sphere, item.c1, [0.07, 0.05, 0.035], [sx * 0.06, 0, 0], g).rotation.z = sx * 0.4;
      part(sphere, item.c2, [0.028, 0.028, 0.03], [0, 0, 0.01], g);
      break;
    }
    case 'beret': {
      g.position.set(0.02, -0.02, 0.02);
      g.rotation.z = -0.25;
      part(sphere, item.c1, [0.17, 0.06, 0.17], [0, 0.03, 0], g);
      part(sphere, item.c2, [0.025, 0.04, 0.025], [0, 0.1, 0], g);
      break;
    }
    case 'beanie': {
      g.position.set(0, -0.06, 0);
      part(halfSphere, item.c1, [0.17, 0.15, 0.16], [0, 0.0, 0], g);
      const brim = part(torus, item.c2, [0.16, 0.16, 0.5], [0, 0.0, 0], g);
      brim.rotation.x = Math.PI / 2;
      part(sphere, item.c2, [0.05, 0.05, 0.05], [0, 0.15, 0], g);
      break;
    }
    case 'sweater': {
      part(sphere, item.c1, [0.27, 0.23, 0.2], [0, 0.0, 0.07], g);
      for (const [z, k] of [[-0.02, 0.95], [0.1, 1], [0.19, 0.86]] as const) part(torus, item.c2, [0.265 * k, 0.225 * k, 0.5], [0, 0, z], g);
      part(torus, item.c2, [0.17, 0.17, 0.7], [0, 0.1, 0.29], g); // folded collar
      break;
    }
  }
  return g;
}

function clear(g: THREE.Object3D) { while (g.children.length) g.remove(g.children[0]); }

export function createPetMesh(): PetMesh {
  const root = new THREE.Group();
  root.visible = false;
  root.add(contactShadow(0.85, 0.85, 'round', 0.24));
  let rig: Rig | null = null;
  let key = '', outKey = '';
  let heading = 0, headingT = 0;
  const blend = { walk: 0, sit: 0, sleep: 0, happy: 0 };
  let lastPose: PetPose | null = null;
  let curKind: PetKind = 'kitten', curCoat = 'cream';
  let wantHead: string | null = null, wantBody: string | null = null;

  function setOutfit(head: string | null, body: string | null) {
    wantHead = head; wantBody = body;
    if (!rig) return;
    const k = `${head ?? ''}|${body ?? ''}`;
    if (k === outKey) return;
    outKey = k;
    clear(rig.headTop); clear(rig.bodyWrap);
    const h = petItemById(head), b = petItemById(body);
    if (h) rig.headTop.add(buildAccessory(h));
    if (b) rig.bodyWrap.add(buildAccessory(b));
  }

  function setLook(kind: PetKind, coat: string) {
    const k = kind + '|' + coat;
    if (k === key && rig) return;
    key = k; curKind = kind; curCoat = coat;
    if (rig) root.remove(rig.model);
    rig = (kind === 'puppy' ? buildPuppy : buildKitten)(coatById(coat));
    root.add(rig.model);
    outKey = '';
    setOutfit(wantHead, wantBody);
  }

  function setPose(p: PetPose, t: number, dt: number) {
    setLook(p.kind, p.coat);
    setOutfit(p.head, p.body);
    lastPose = p;
    headingT = p.heading;
    // smooth the turn a little more on top of the sim's own easing, so cutscene-style snaps never show
    let dh = headingT - heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    heading += dh * (1 - Math.exp(-14 * dt));
    root.rotation.y = heading;
    const k = 1 - Math.exp(-7 * dt);
    blend.walk += ((p.mode === 'walk' ? 1 : 0) - blend.walk) * k;
    blend.sit += ((p.mode === 'sit' ? 1 : 0) - blend.sit) * k;
    blend.sleep += ((p.mode === 'sleep' ? 1 : 0) - blend.sleep) * (k * 0.7);
    blend.happy += ((p.mode === 'happy' ? 1 : 0) - blend.happy) * (k * 1.6);
    if (rig) poseRig(rig, p, t);
  }

  function poseRig(r: Rig, p: PetPose, t: number) {
    const { walk, sit, sleep, happy } = blend;
    const stand = Math.max(0, 1 - sit - sleep);
    const gait = t * (9 + p.speed * 8);
    const swing = Math.sin(gait) * 0.7 * walk * (0.5 + p.speed * 0.5);
    const breathe = Math.sin(t * (sleep > 0.5 ? 1.6 : 2.3));
    const hop = Math.abs(Math.sin(t * 9)) * 0.14 * happy;
    // body: bob while walking, pitch back to sit, sink and squash to sleep
    r.body.position.y = r.hipY - 0.1 * sit - 0.17 * sleep + Math.abs(Math.sin(gait)) * 0.025 * walk + hop + breathe * 0.006;
    r.body.rotation.x = -0.5 * sit;
    r.body.rotation.z = Math.sin(gait) * 0.04 * walk;
    r.body.scale.set(1 + 0.12 * sleep + breathe * 0.012, 1 - 0.18 * sleep + breathe * 0.012, 1 + 0.05 * sleep);
    // legs: FL/BR then FR/BL swing in pairs; sit folds the back legs forward; sleep tucks everything away
    const tuck = 1 - 0.75 * sleep;
    r.legs[0].rotation.x = swing + 0.5 * sit; // front legs counter the sitting pitch
    r.legs[1].rotation.x = -swing + 0.5 * sit;
    r.legs[2].rotation.x = -swing + 1.3 * sit;
    r.legs[3].rotation.x = swing + 1.3 * sit;
    r.legs.forEach((l) => l.scale.set(1, tuck * (1 - 0.15 * sit), 1));
    // head: nods, tilts, looks up when sitting, tucks sideways when asleep
    r.head.position.set(r.headBase.x, r.headBase.y - 0.04 * sleep + 0.03 * sit, r.headBase.z - 0.05 * sleep);
    r.head.rotation.x = 0.5 * sit + 0.45 * sleep + Math.sin(gait * 2) * 0.04 * walk - 0.1 * happy;
    r.head.rotation.y = 0.75 * sleep + Math.sin(t * 0.7) * 0.12 * stand * (1 - walk);
    r.head.rotation.z = Math.sin(t * 9) * 0.18 * happy + Math.sin(t * 0.45) * 0.07 * stand * (1 - walk);
    // eyes: closed asleep, a blink now and then
    const blink = Math.sin(t * 0.9) > 0.985 ? 0.1 : 1;
    r.eyes.scale.y = Math.max(0.08, (1 - sleep) * blink);
    r.eyes.position.y = 0.09 - 0.02 * sleep;
    // tail: lazy sway, quick wag when happy, curled round the body asleep
    const wag = Math.sin(t * (happy > 0.3 ? 16 : 2.4)) * (0.25 + 0.55 * happy) + Math.sin(gait * 1.5) * 0.15 * walk;
    r.tail.rotation.y = wag + 1.5 * sleep;
    r.tail.rotation.x = 0.1 * sit - 0.2 * sleep;
    // ears: little twitches; puppy ears bounce while walking
    r.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 1.7 + i * 2) * 0.05 + (curKind === 'puppy' ? -Math.abs(Math.sin(gait)) * 0.25 * walk : 0); });
    // the whole model: a touch of squash when hopping
    r.model.scale.set(1, 1 + 0.04 * happy * Math.sin(t * 18), 1);
  }

  return {
    root,
    setLook,
    setOutfit,
    setPose,
    // ActorMesh compatibility (the renderer drives the pet through setPose)
    setFacing(f: Facing, dt: number) {
      const a = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 }[f];
      let dh = a - heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      heading += dh * (1 - Math.exp(-12 * dt));
      root.rotation.y = heading;
    },
    animate(t: number, moving: boolean, run?: boolean) {
      if (lastPose && rig) poseRig(rig, { ...lastPose, mode: moving ? 'walk' : lastPose.mode, speed: run ? 1 : lastPose.speed }, t);
    },
  };
}
