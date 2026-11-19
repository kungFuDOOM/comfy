// Moonlit Costume Night dressing: lavender-and-pink paper lantern strings, cute pastel pumpkins, a costume rack with
// little hanging costumes, and a few paper bats that bob gently. Soft and sleepy, nothing scary.
import * as THREE from 'three';
import type { EventWorld } from '../events';
import { ball, box, cyl } from '../render/util';
import { bunting, glowPool, ground, newRoot, rng, scatter, titleSign } from './festivalKit';

const LANTERN = ['#e6d4ff', '#ffc9dc', '#fff0d6', '#d8c8f8'];
const PUMPKIN = ['#ffc9a8', '#ffd6e4', '#e6d4ff', '#fff0d6'];
const LAMPS = [{ x: 44, z: 37 }, { x: 51, z: 37 }, { x: 45, z: 45 }, { x: 51, z: 45 }];

export function createCostumeWorld(): EventWorld {
  let bats: { m: THREE.Group; y: number; ph: number }[] = [];
  return {
    build() {
      const root = newRoot('event-costumenight');
      bats = [];
      const r = rng(1031);
      bunting(root, LAMPS[0], LAMPS[1], 1.5, 0.55, LANTERN, 31, '#c9a8ff');
      bunting(root, LAMPS[2], LAMPS[3], 1.5, 0.55, LANTERN, 32, '#ffb3cf');
      // pastel pumpkins by the lamps and the fountain
      const pumpkin = (x: number, z: number, s: number, c: string) => {
        const y = ground(x, z);
        const b = ball(0.26 * s, c, x, y + 0.22 * s, z, 12); b.scale.y = 0.82; root.add(b);
        root.add(cyl(0.02 * s, 0.03 * s, 0.09 * s, '#a3d19a', x, y + 0.46 * s, z, 6));
      };
      for (const l of LAMPS) for (let i = 0; i < 2; i++) pumpkin(l.x + 0.2 + i * 0.5, l.z + 0.9, 0.8 + r() * 0.5, PUMPKIN[(i + LAMPS.indexOf(l)) % PUMPKIN.length]);
      for (let i = 0; i < 6; i++) { const a = 0.5 + i * 0.95; pumpkin(48.5 + Math.cos(a) * 2.0, 42.5 + Math.sin(a) * 2.0, 0.7 + r() * 0.4, PUMPKIN[i % PUMPKIN.length]); }
      // the costume rack: two posts, a bar, two hanging costumes
      const rack = new THREE.Group();
      for (const sx of [-0.8, 0.8]) rack.add(cyl(0.03, 0.04, 1.3, '#dba983', sx, 0.65, 0, 8));
      rack.add(box(1.7, 0.04, 0.05, '#dba983', 0, 1.3, 0));
      const ghost = new THREE.Group(); ghost.add(cyl(0.14, 0.2, 0.5, '#fff8ff', 0, 0, 0, 12)); ghost.add(ball(0.12, '#d8c8f8', 0, 0.28, 0, 8)); ghost.position.set(-0.35, 1.0, 0);
      const cape = new THREE.Group(); cape.add(box(0.4, 0.5, 0.05, '#d8c8f8', 0, 0, 0)); cape.add(ball(0.05, '#ffb3cf', 0, 0.18, 0.04, 6)); cape.position.set(0.35, 1.02, 0);
      rack.add(ghost, cape);
      rack.position.set(47, ground(47, 45.5), 45.5);
      root.add(rack);
      // paper bats
      for (const [x, z, y] of [[44.5, 39, 2.2], [52, 41, 2.5], [46, 36.5, 2.0], [49.5, 45.5, 2.3]] as const) {
        const bat = new THREE.Group();
        bat.add(ball(0.06, '#9a86c8', 0, 0, 0, 6));
        for (const sx of [-1, 1]) { const w = box(0.2, 0.015, 0.1, '#b9a6e6', sx * 0.13, 0.01, 0); w.rotation.z = sx * 0.3; bat.add(w); }
        bat.position.set(x, ground(x, z) + y, z);
        root.add(bat);
        bats.push({ m: bat, y: bat.position.y, ph: r() * 6 });
      }
      scatter(root, [{ x: 48.5, z: 42.5, rad: 3.2, n: 20 }], ['#ffc9dc', '#e6d4ff', '#fff0d6'], 7031, 0.1);
      titleSign(root, 'Moonlit Costume Night', 48.5, 37.4, 1.7);
      glowPool(root, 48.5, 42.5, 6, '#d8c8ff', 0.25);
      return root;
    },
    update(t) {
      for (const b of bats) { b.m.position.y = b.y + Math.sin(t * 1.3 + b.ph) * 0.08; b.m.rotation.y = Math.sin(t * 0.6 + b.ph) * 0.4; }
    },
  };
}
