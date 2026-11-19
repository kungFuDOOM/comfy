// Sunsip Shore Days dressing: a striped lemonade stand in the square, sunny bunting between the lamps and a few
// scattered shells and confetti-bright petals. Warm and yellow-pink, never fireworks.
import type { EventWorld } from '../events';
import { bunting, glowPool, newRoot, scatter, stall, titleSign } from './festivalKit';
import { ball, cyl } from '../render/util';

const SUN = ['#fff3a8', '#ffd9a8', '#ffc2d8', '#fff7d6', '#ffe27a'];
const SHELLS = ['#ffd9c2', '#ffe8d2', '#ffc2d8', '#fff3e0'];
const LAMPS = [{ x: 44, z: 37 }, { x: 51, z: 37 }, { x: 45, z: 45 }, { x: 51, z: 45 }];

export function createShoreWorld(): EventWorld {
  return {
    build() {
      const root = newRoot('event-shoredays');
      const g = stall(root, 47, 45.5, '#fff3a8', '#ffc2d8', '#ffe27a');
      // a jug of lemonade and glasses on the counter
      g.add(cyl(0.11, 0.1, 0.26, '#fff6c9', -0.3, 0.76, 0, 12));
      for (const x of [0.1, 0.3, 0.5]) g.add(cyl(0.05, 0.04, 0.1, '#fff3a8', x, 0.68, 0.05, 10));
      g.add(ball(0.07, '#ffe27a', 0.7, 0.67, 0.0, 8));
      bunting(root, LAMPS[0], LAMPS[1], 1.5, 0.55, SUN, 21);
      bunting(root, LAMPS[2], LAMPS[3], 1.5, 0.55, SUN, 22);
      scatter(root, [{ x: 47, z: 47, rad: 1.8, n: 18 }, { x: 48.5, z: 42.5, rad: 3, n: 24 }], SHELLS, 5011, 0.12);
      titleSign(root, 'Sunsip Shore Days', 48.5, 37.4, 1.7);
      glowPool(root, 47, 46, 3.4, '#ffe6a8', 0.3);
      return root;
    },
  };
}
