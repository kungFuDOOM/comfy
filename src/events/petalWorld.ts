// Petal Picnic Days dressing: blankets with baskets, drifts of fallen petals and a blossom garland between lamp posts.
import type { EventWorld } from '../events';
import { blanket, bunting, newRoot, scatter, titleSign } from './festivalKit';

const PETALS = ['#ffc2d8', '#ffd6e4', '#ffb3cf', '#fff0f5', '#f7b6d8'];
const LAMPS = [{ x: 44, z: 37 }, { x: 51, z: 37 }, { x: 45, z: 45 }, { x: 51, z: 45 }];

export function createPetalWorld(rects: [number, number, number, number][]): EventWorld {
  return {
    build() {
      const root = newRoot('event-petalpicnic');
      const fall: { x: number; z: number; rad: number; n: number }[] = [];
      rects.forEach(([x0, z0, x1, z1], i) => {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        blanket(root, cx, cz, i * 0.35 - 0.3, i % 2 ? '#fff0f5' : '#ffd6e4', '#ff9ec0');
        fall.push({ x: cx, z: cz, rad: 2.2, n: 26 });
      });
      for (const l of LAMPS) fall.push({ x: l.x + 0.5, z: l.z + 0.5, rad: 1.4, n: 14 });
      fall.push({ x: 48.5, z: 42.5, rad: 3.2, n: 36 });
      scatter(root, fall, PETALS, 4031, 0.13);
      bunting(root, LAMPS[0], LAMPS[1], 1.5, 0.55, PETALS, 11);
      bunting(root, LAMPS[2], LAMPS[3], 1.5, 0.55, PETALS, 12);
      titleSign(root, 'Petal Picnic Days', 48.5, 37.4, 1.7);
      return root;
    },
  };
}
