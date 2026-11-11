// Player + villager placeholders. Swap createPlayerMesh/createVillagerMesh for real sculpts later;
// the rest of the game only uses the ActorMesh interface below.
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import type { OutfitDef, VillagerDef } from '../data';
import { ball, cyl, lerpAngle, mat } from './util';

export interface ActorMesh {
  root: THREE.Group;
  /** Rotates around Y, smoothed. */
  setFacing(f: Facing, dt: number): void;
  /** Idle breathing / walk bob. */
  animate(t: number, moving: boolean): void;
  setAlert?(on: boolean): void;
}

const FACE_ANGLE: Record<Facing, number> = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

function shadowBlob(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: '#7a3b58', transparent: true, opacity: 0.18, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02;
  return m;
}

function build(body: string, head: string, trim: string, earKind: 'round' | 'point' | 'none', scale = 1) {
  const root = new THREE.Group();
  const model = new THREE.Group(); // bobs / turns
  const bodyMat = new THREE.MeshLambertMaterial({ color: body });
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.34, 4, 12), bodyMat);
  bodyM.position.y = 0.45;
  const headM = ball(0.34, head, 0, 1.0, 0, 16);
  const nose = ball(0.06, '#a8456f', 0, 0.97, 0.32, 8);
  const eyeL = ball(0.045, '#4a2a3a', -0.12, 1.05, 0.29, 8), eyeR = ball(0.045, '#4a2a3a', 0.12, 1.05, 0.29, 8);
  const sash = cyl(0.29, 0.29, 0.08, trim, 0, 0.3, 0, 14);
  model.add(bodyM, headM, nose, eyeL, eyeR, sash);
  if (earKind !== 'none') for (const sx of [-1, 1]) {
    const ear = earKind === 'round' ? ball(0.13, head, sx * 0.24, 1.3, 0) : new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 6), mat(head));
    if (earKind === 'point') ear.position.set(sx * 0.22, 1.36, 0);
    model.add(ear);
  }
  model.scale.setScalar(scale);
  root.add(shadowBlob(), model);
  const marker = ball(0.09, mat('#ffd36e', '#ffd36e'), 0, 1.9 * scale, 0, 8);
  marker.visible = false;
  root.add(marker);
  let ang = 0;
  const api: ActorMesh & { bodyMat: THREE.MeshLambertMaterial; headM: THREE.Mesh } = {
    root, bodyMat, headM,
    setFacing(f, dt) { ang = lerpAngle(ang, FACE_ANGLE[f], Math.min(1, dt * 14)); model.rotation.y = ang; },
    animate(t, moving) {
      model.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.07 : Math.sin(t * 2) * 0.012;
      model.rotation.z = moving ? Math.sin(t * 10) * 0.05 : 0;
      marker.position.y = 1.9 * scale + Math.sin(t * 3) * 0.06;
    },
    setAlert(on) { marker.visible = on; },
  };
  return api;
}

export function createPlayerMesh(): ActorMesh & { setOutfit(o: OutfitDef): void } {
  const a = build('#fff1e0', '#fff3ea', '#ffc9dc', 'round');
  let cur = '';
  return Object.assign(a, {
    setOutfit(o: OutfitDef) {
      if (cur === o.id) return;
      cur = o.id;
      a.bodyMat.color.set(o.body);
      // TODO(pass): hats, cheetah print patterns, per-outfit sculpts.
    },
  });
}

const SPECIES_EARS = { dormouse: 'round', cheetah: 'point', hedgehog: 'round', owl: 'point' } as const;
const HEAD_COLORS: Record<string, string> = { dormouse: '#fbe3ea', cheetah: '#f6d9a0', hedgehog: '#e8cfc0', owl: '#e6dcf5' };

export function createVillagerMesh(def: VillagerDef): ActorMesh {
  return build(def.color, HEAD_COLORS[def.species] ?? '#fff', def.accent, SPECIES_EARS[def.species], def.species === 'owl' ? 1.1 : 1);
}
