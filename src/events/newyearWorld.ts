// Twinkle New Year dressing: a few soft glow strings over the square, little sparklers round the fountain and a warm pool
// of light. Modest and scoped: no tree, no stall, nothing solid. Twinkle Season stays the winter centrepiece.
import type { EventWorld } from '../events';
import { ball, cyl } from '../render/util';
import { bunting, glowPool, ground, newRoot, scatter } from './festivalKit';
import { LAMPS } from './twinkleLayout';

const GLOW = ['#fff3a8', '#ffd9e8', '#ffffff', '#d9c9ff'];
/** The fountain stands at tile (48, 42); its basin covers x 47 to 49. */
export const SQUARE = { x: 48.5, z: 42.5 };

export function createNewYearWorld(): EventWorld {
  return {
    build() {
      const root = newRoot('event-newyear');
      bunting(root, LAMPS[0], LAMPS[1], 1.6, 0.45, GLOW, 3101, '#ffe9a8');
      bunting(root, LAMPS[2], LAMPS[3], 1.5, 0.45, GLOW, 3102, '#ffe9a8');
      // tiny sparklers stuck in the snow around the fountain: a stick and a bright little star each
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4, x = SQUARE.x + Math.cos(a) * 2.6, z = SQUARE.z + Math.sin(a) * 2.6, y = ground(x, z);
        root.add(cyl(0.012, 0.012, 0.42, '#d9b9a8', x, y + 0.21, z, 5));
        root.add(ball(0.06, i % 2 ? '#fff3a8' : '#ffb3cf', x, y + 0.46, z, 6));
      }
      scatter(root, [{ x: SQUARE.x, z: SQUARE.z + 0.5, rad: 3.2, n: 22 }], ['#ffffff', '#fff3a8', '#ffd9e8'], 3103, 0.1);
      glowPool(root, SQUARE.x, SQUARE.z + 0.4, 6, '#ffe2b0', 0.26);
      return root;
    },
  };
}
