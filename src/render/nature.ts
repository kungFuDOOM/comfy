// Trees + flowers. Placeholder blobs; the "fluffy tree" pass should replace createTreeField.
import * as THREE from 'three';
import { flowers, trees } from '../world';
import type { Season } from '../time';
import { contactGeometry, contactMaterial, makeToon, PALETTE, toon } from './materials';
import { tileHeight } from './terrain';

export interface Nature { group: THREE.Group; setSeason(s: Season): void }

export function createNature(): Nature {
  const group = new THREE.Group();
  const n = trees.length;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.15, 0.9, 8), toon(PALETTE.wood), n);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.62, 1), makeToon('#ffffff'), n * 3);
  // soft contact patch under every tree so the fluffy crowns sit on the ground
  const patch = new THREE.InstancedMesh(contactGeometry, contactMaterial('round', 0.22), n);
  patch.renderOrder = 1;
  trunk.castShadow = trunk.receiveShadow = crown.castShadow = crown.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  trees.forEach((t, i) => {
    const y = tileHeight(t.x, t.y), cx = t.x + 0.5, cz = t.y + 0.5;
    m.compose(p.set(cx, y + 0.45, cz), q, s); trunk.setMatrixAt(i, m);
    m.compose(p.set(cx, y + 0.025, cz), q, s.set(1.9, 1, 1.9)); patch.setMatrixAt(i, m);
    const k = 0.9 + (t.v % 5) * 0.06;
    const offs: [number, number, number, number][] = [[0, 1.25, 0, 1.2], [-0.35, 1.0, 0.1, 0.9], [0.35, 1.05, -0.1, 0.9]];
    offs.forEach((o, j) => { m.compose(p.set(cx + o[0], y + o[1] * k, cz + o[2]), q, s.setScalar(o[3] * k)); crown.setMatrixAt(i * 3 + j, m); });
  });
  group.add(trunk, crown, patch);

  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 5), makeToon('#ffffff'), flowers.length);
  fl.receiveShadow = true;
  const col = new THREE.Color();
  flowers.forEach((f, i) => {
    const x = f.x + f.ox / 32, z = f.y + f.oy / 32;
    m.compose(p.set(x, tileHeight(f.x, f.y) + 0.1, z), q, s.set(1, 1, 1)); fl.setMatrixAt(i, m);
    fl.setColorAt(i, col.set(f.c));
  });
  group.add(fl);

  const c = new THREE.Color();
  return {
    group,
    setSeason(season) {
      trees.forEach((t, i) => { c.set(t.v % 2 ? season.leaf : season.leafAlt); for (let j = 0; j < 3; j++) crown.setColorAt(i * 3 + j, c); });
      if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
      fl.visible = season.id !== 'snowfluff';
      // TODO(pass): snow caps, blossom petals, falling leaves.
    },
  };
}
