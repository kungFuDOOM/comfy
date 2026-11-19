// Warm Cup Market dressing: a rosy cocoa stall with a kettle and mugs, soft pink-and-cream bunting and a few warm
// glows. Modest on purpose: Twinkle Season stays the winter centrepiece (no tree, no snowfall of its own).
import type { EventWorld } from '../events';
import { ball, cyl } from '../render/util';
import { bunting, glowPool, newRoot, scatter, stall, titleSign } from './festivalKit';

const WARM = ['#ffd9e6', '#fff3e8', '#ffc2d8', '#ffe8d0'];
const LAMPS = [{ x: 44, z: 37 }, { x: 51, z: 37 }, { x: 45, z: 45 }, { x: 51, z: 45 }];

export function createWarmCupWorld(): EventWorld {
  return {
    build() {
      const root = newRoot('event-warmcup');
      const g = stall(root, 47, 45.5, '#fff3e8', '#ffb3c6', '#ff8fb6');
      g.add(cyl(0.14, 0.18, 0.26, '#ffb3c6', -0.4, 0.76, 0, 12)); g.add(ball(0.04, '#ffffff', -0.4, 0.92, 0, 6));
      for (const x of [0.0, 0.25, 0.5]) { g.add(cyl(0.06, 0.05, 0.1, '#ffffff', x, 0.68, 0.05, 10)); g.add(cyl(0.05, 0.05, 0.015, '#a8643f', x, 0.74, 0.05, 10)); }
      bunting(root, LAMPS[2], LAMPS[3], 1.5, 0.5, WARM, 41);
      scatter(root, [{ x: 47, z: 47, rad: 1.6, n: 14 }], ['#ffffff', '#fff3e8', '#ffd9e6'], 6011, 0.11);
      titleSign(root, 'Warm Cup Market', 47, 45.5, 1.75);
      glowPool(root, 47, 46.2, 3.2, '#ffcfb8', 0.32);
      return root;
    },
  };
}
