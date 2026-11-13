// Tansy's stall in the 3D world: a striped awning over a little counter, a patchwork backdrop, a rug, crates and glowing
// goods, with Tansy herself behind it. Built once and kept (the stall just hides while she is away). Arrival and departure
// pop in and out with a puff of sparkles. Everything is local to the stall's centre so it can scale in around it.
import * as THREE from 'three';
import { merchantPresent } from '../merchant';
import { MERCHANT } from '../merchantData';
import { MERCHANT_SPOT, STALL_CENTER } from '../merchantLayout';
import { TS } from '../world';
import { createMerchantMesh } from './actors';
import { celebrate, poofAt, Shape } from './celebrate';
import { contactShadow, lightPool, PALETTE } from './materials';
import { Batch, G, ball, cyl, makeLabel, mat } from './util';
import { heightAtUnits } from './terrain';
import type { Facing } from '../art/characters';

export interface MerchantLayer { group: THREE.Group; update(t: number, dt: number, playerX: number, playerY: number): void }

const PINK = '#ffb3cf', CREAM = '#fff6ea', LILAC = '#d9c6ff', MINT = '#c8f0dc', BUTTER = '#fff0a8', WOOD = '#d9a982', WOOD_D = '#b98763';
const easeOutBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/** Static stall pieces merged into one mesh (shared vertex-colored toon material). */
function buildStall(): THREE.Group {
  const g = new THREE.Group();
  const k = new Batch();
  // rug: a flat cream-and-pink mat under the counter
  k.add(G.box(3.6, 0.03, 2.9), PINK, { y: 0.03, z: 0.55 });
  k.add(G.box(3.3, 0.035, 2.6), CREAM, { y: 0.035, z: 0.55 });
  for (let i = 0; i < 7; i++) k.add(G.box(0.18, 0.04, 2.6), i % 2 ? CREAM : '#ffe3ee', { x: -1.5 + i * 0.5, y: 0.04, z: 0.55 });
  // counter: pink front, cream top, wooden feet
  k.add(G.box(2.3, 0.7, 0.62), PINK, { y: 0.38 });
  k.add(G.box(2.46, 0.08, 0.78), CREAM, { y: 0.78 });
  for (let i = 0; i < 5; i++) k.add(G.ball(0.1, 8), CREAM, { x: -0.92 + i * 0.46, y: 0.5, z: 0.32, s: [1, 0.7, 0.35] }); // scalloped trim on the front
  for (const sx of [-1, 1]) k.add(G.box(0.12, 0.08, 0.5), WOOD, { x: sx * 1.05, y: 0.04 });
  // four posts and the slanted striped awning (higher at the back)
  const back = 2.65, front = 2.25, pz0 = -1.05, pz1 = 1.0, px = 1.45;
  for (const sx of [-1, 1]) {
    k.add(G.cyl(0.055, 0.065, back, 10), WOOD, { x: sx * px, y: back / 2, z: pz0 });
    k.add(G.cyl(0.055, 0.065, front, 10), WOOD, { x: sx * px, y: front / 2, z: pz1 });
    k.add(G.ball(0.09, 8), PALETTE.gold, { x: sx * px, y: back + 0.02, z: pz0 });
    k.add(G.ball(0.09, 8), PALETTE.gold, { x: sx * px, y: front + 0.02, z: pz1 });
  }
  const slope = Math.atan2(back - front, pz1 - pz0), len = Math.hypot(back - front, pz1 - pz0) + 0.3, n = 8, w = (px * 2 + 0.5) / n;
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? CREAM : PINK;
    k.add(G.box(w, 0.07, len), c, { x: -px - 0.25 + w / 2 + i * w, y: (back + front) / 2 + 0.07, z: (pz0 + pz1) / 2, rx: slope });
    // scalloped valance over the front edge
    k.add(G.ball(w * 0.55, 10), c, { x: -px - 0.25 + w / 2 + i * w, y: front - 0.02, z: pz1 + 0.17, s: [1, 0.9, 0.5] });
  }
  // patchwork quilt hung between the back posts
  const quilt = [PINK, MINT, BUTTER, LILAC, '#ffd6b8', '#c9ecf2'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) k.add(G.box(0.46, 0.46, 0.04), quilt[(r * 2 + c * 3 + (c % 2)) % quilt.length], { x: -1.15 + c * 0.46, y: 0.85 + r * 0.46, z: pz0 - 0.12 });
  k.add(G.cyl(0.03, 0.03, 2.9, 8), WOOD_D, { x: 0, y: 2.45, z: pz0 - 0.12, rz: Math.PI / 2 });
  // crates and a sack on the left, a wagon wheel and a barrel on the right
  k.add(G.box(0.55, 0.45, 0.55), WOOD, { x: -1.85, y: 0.23, z: 0.5, ry: 0.2 });
  k.add(G.box(0.58, 0.07, 0.58), WOOD_D, { x: -1.85, y: 0.47, z: 0.5, ry: 0.2 });
  k.add(G.box(0.45, 0.38, 0.45), WOOD, { x: -1.78, y: 0.65, z: 0.5, ry: -0.3 });
  k.add(G.ball(0.3, 12), '#f3e1c4', { x: -1.7, y: 0.28, z: -0.45, s: [1, 1.1, 0.9] });
  k.add(G.cyl(0.08, 0.1, 0.12, 8), '#f3e1c4', { x: -1.7, y: 0.6, z: -0.45 });
  k.add(G.torus(0.34, 0.04, 20), WOOD_D, { x: 1.55, y: 0.4, z: -1.5, ry: 0.5 });
  k.add(G.torus(0.1, 0.04, 10), WOOD_D, { x: 1.55, y: 0.4, z: -1.5, ry: 0.5 });
  for (let i = 0; i < 4; i++) k.add(G.cyl(0.015, 0.015, 0.68, 4), WOOD_D, { x: 1.55, y: 0.4, z: -1.5, ry: 0.5, rz: (i * Math.PI) / 4 });
  k.add(G.cyl(0.24, 0.27, 0.5, 14), '#f2b8d0', { x: 2.05, y: 0.25, z: -0.7 });
  k.add(G.torus(0.25, 0.02, 14), PALETTE.gold, { x: 2.05, y: 0.4, z: -0.7, rx: Math.PI / 2 });
  g.add(k.build());

  // goods on the counter: a music box, a cloud lamp, a folded-cloth stack, a teapot and a seed packet
  const goods = new Batch();
  goods.add(G.box(0.3, 0.16, 0.22), '#ff9ec0', { x: -0.85, y: 0.9, z: 0.04 });
  goods.add(G.cyl(0.015, 0.015, 0.14, 6), PALETTE.gold, { x: -0.7, y: 0.96, z: 0.04, rz: Math.PI / 2 });
  goods.add(G.ball(0.05, 8), '#fff', { x: -0.85, y: 1.02, z: 0.04 });
  for (const [dx, dy, r, c] of [[-0.3, 0.0, 0.11, '#ffffff'], [-0.2, 0.05, 0.09, '#f7f4ff'], [-0.4, 0.04, 0.085, '#ffffff'], [-0.3, 0.12, 0.08, '#f7f4ff']] as [number, number, number, string][]) goods.add(G.ball(r, 10), c, { x: dx, y: 0.96 + dy, z: 0.04 });
  for (let i = 0; i < 3; i++) goods.add(G.box(0.36 - i * 0.03, 0.07, 0.26), [LILAC, MINT, BUTTER][i], { x: 0.3, y: 0.86 + i * 0.07, z: 0.0, ry: i * 0.18 });
  goods.add(G.ball(0.14, 12), '#fff', { x: 0.82, y: 0.95, z: 0.04, s: [1.1, 0.9, 1] });
  goods.add(G.cyl(0.05, 0.07, 0.05, 10), PINK, { x: 0.82, y: 1.1, z: 0.04 });
  goods.add(G.torus(0.07, 0.015, 10, Math.PI), PINK, { x: 0.82, y: 0.97, z: 0.04, ry: Math.PI / 2, rz: -Math.PI / 2 });
  goods.add(G.box(0.14, 0.2, 0.03), '#fff6ea', { x: 0.52, y: 0.92, z: 0.3, rx: -0.2 });
  goods.add(G.ball(0.03, 6), '#ff9ec0', { x: 0.52, y: 0.93, z: 0.325 });
  g.add(goods.build());

  // sign board hung over the awning front
  const sign = makeLabel(MERCHANT.sign, 2.4);
  sign.position.set(0, front + 0.62, pz1 + 0.12);
  sign.rotation.x = -0.12;
  g.add(sign);
  
  return g;
}

export function createMerchantLayer(): MerchantLayer {
  const group = new THREE.Group();
  const cx = STALL_CENTER.x, cz = STALL_CENTER.z;
  const gy = heightAtUnits(cx, cz);
  const root = new THREE.Group(); // scales in / out around the counter
  root.position.set(cx, gy, cz);
  const stall = buildStall();
  const tansy = createMerchantMesh();
  tansy.root.position.set(MERCHANT_SPOT.x - cx, 0, MERCHANT_SPOT.y - cz);
  root.add(stall, tansy.root);
  const shadow = contactShadow(4.2, 3.2, 'rect', 0.2);
  shadow.position.set(0, 0.04, 0.2);
  root.add(shadow);

  // a string of little lamps along the awning front: they glow at night like the town's lanterns
  const lampCols = ['#ffe9a8', '#ffc4dc', '#d9c6ff', '#c8f0dc', '#ffe9a8', '#ffc4dc', '#d9c6ff'];
  for (let i = 0; i < lampCols.length; i++) {
    const x = -1.35 + i * 0.45;
    root.add(ball(0.07, mat(lampCols[i], lampCols[i], 'lamp'), x, 2.05 - (i % 2) * 0.06, 1.18, 8));
  }
  const pool = lightPool(5, 3.6, '#ffd9ee', 0.45);
  pool.position.set(0, 0.04, 0.4);
  root.add(pool);
  group.add(root);
  group.visible = false;

  const at = new THREE.Vector3();
  let shown = false, appear = 1, sparkleT = 0;

  return {
    group,
    update(t, dt, playerX, playerY) {
      const present = merchantPresent();
      if (present !== shown) {
        shown = present;
        appear = 0;
        at.set(cx, gy + 0.7, cz + 0.2);
        poofAt(at, 3);
        if (present) group.visible = true;
      }
      if (!shown && appear >= 1) { group.visible = false; return; }
      appear = Math.min(1, appear + dt / 0.9);
      const k = shown ? easeOutBack(appear) : 1 - appear * appear;
      root.scale.setScalar(Math.max(0.001, k));
      if (!shown) { if (appear >= 1) group.visible = false; return; }

      // Tansy turns to whoever walks up to the counter (never her back to a customer), otherwise she watches the square
      const dx = playerX / TS - MERCHANT_SPOT.x, dz = playerY / TS - MERCHANT_SPOT.y;
      const near = Math.hypot(dx, dz) < 5;
      const want: Facing = near && Math.abs(dx) > Math.abs(dz) * 1.4 ? (dx < 0 ? 'left' : 'right') : 'down';
      tansy.setFacing(want, dt);
      tansy.animate(t, false);

      // a few drifting sparkles over the goods, so the stall reads as special from across the square
      sparkleT -= dt;
      if (sparkleT <= 0) {
        sparkleT = 0.9 + Math.random() * 0.8;
        at.set(cx + (Math.random() * 2 - 1) * 1.1, gy + 1.25, cz + 0.1);
        celebrate.burst(at, { count: 2, colors: ['#fff3a8', '#ffd9e8', '#ffffff'], shapes: [Shape.Star], spread: 0.15, speed: 0.25, up: 0.7, gravity: -0.1, size: [0.1, 0.16], life: [0.9, 1.3] });
      }
    },
  };
}
