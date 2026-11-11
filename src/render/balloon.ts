// A little striped hot-air balloon with a cheetah-print sash and a wicker basket: how newcomers reach
// Sugarlily Isle. Code-built; origin is the basket floor so `group.position.y = ground` means "landed".
import * as THREE from 'three';
import { cheetahToon, contactShadow, PALETTE } from './materials';
import { Batch, G } from './util';

export interface Balloon {
  group: THREE.Group;
  /** Height above the group origin where a passenger's feet go. */
  riderY: number;
  /** Sway/bob. `air`: 0 = settled on the ground, 1 = flying free. */
  animate(t: number, air: number): void;
}

const GORES = 12;
const GORE_COLORS = ['#ff9ec0', '#fff6ee', '#ffc6dc', '#fff6ee'];
const MOUTH_Y = 1.4; // envelope mouth above the basket floor
/** Envelope silhouette (radius, height above the mouth): narrow mouth, full shoulders, soft crown. */
const PROFILE: [number, number][] = [
  [0.34, 0], [0.52, 0.36], [0.86, 0.86], [1.2, 1.36], [1.45, 1.86], [1.56, 2.32], [1.5, 2.78], [1.24, 3.18], [0.82, 3.45], [0.36, 3.58], [0.001, 3.62],
];

function smoothProfile(scale = 1): THREE.Vector2[] {
  return new THREE.SplineCurve(PROFILE.map((p) => new THREE.Vector2(p[0] * scale, p[1]))).getPoints(26).map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y));
}

export function createBalloon(): Balloon {
  const group = new THREE.Group();
  const sway = new THREE.Group(); // everything that tilts in the breeze
  group.add(sway);

  const prof = smoothProfile();
  const b = new Batch();
  // envelope: one wedge per gore so each can take its own color
  const arc = (Math.PI * 2) / GORES;
  for (let i = 0; i < GORES; i++) {
    b.add(new THREE.LatheGeometry(prof, 3, i * arc, arc), GORE_COLORS[i % GORE_COLORS.length], { y: MOUTH_Y });
  }
  // scalloped skirt around the mouth + crown button
  for (let i = 0; i < GORES; i++) {
    const a = (i + 0.5) * arc;
    b.add(G.ball(0.1, 10), '#c9a8e8', { x: Math.sin(a) * 0.36, y: MOUTH_Y + 0.02, z: Math.cos(a) * 0.36, s: [1, 0.8, 1] });
  }
  b.add(G.ball(0.16, 12), PALETTE.gold, { y: MOUTH_Y + 3.64, s: [1, 0.7, 1] });
  b.add(G.torus(0.34, 0.035, 20), '#e0709a', { y: MOUTH_Y, rx: Math.PI / 2 });

  // basket: wicker tub, rolled rim, two weave bands
  const wick = '#ecc79a', wickD = '#d5a373';
  b.add(G.cyl(0.52, 0.44, 0.56, 18), wick, { y: 0.28 });
  b.add(G.torus(0.53, 0.06, 22), wickD, { y: 0.56, rx: Math.PI / 2 });
  b.add(G.torus(0.5, 0.025, 22), wickD, { y: 0.36, rx: Math.PI / 2 });
  b.add(G.torus(0.47, 0.025, 22), wickD, { y: 0.18, rx: Math.PI / 2 });
  // ropes from the rim up to the mouth
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const x0 = Math.sin(a) * 0.5, z0 = Math.cos(a) * 0.5, x1 = Math.sin(a) * 0.33, z1 = Math.cos(a) * 0.33;
    const dx = x1 - x0, dy = MOUTH_Y - 0.56, dz = z1 - z0, len = Math.hypot(dx, dy, dz);
    b.add(G.cyl(0.016, 0.016, len, 6), '#fff6ee', { x: (x0 + x1) / 2, y: 0.56 + dy / 2, z: (z0 + z1) / 2, dir: [dx, dy, dz] });
  }
  // little heart-pink sandbags with ribbon ties
  for (const a of [0.2, 2.3, 4.2]) {
    const x = Math.sin(a) * 0.57, z = Math.cos(a) * 0.57;
    b.add(G.ball(0.1, 10), PALETTE.rose, { x, y: 0.3, z, s: [1, 1.15, 1] });
    b.add(G.ball(0.04, 8), '#ffffff', { x, y: 0.43, z });
    b.add(G.cyl(0.012, 0.012, 0.14, 5), '#ffffff', { x, y: 0.5, z });
  }
  sway.add(b.build());

  // cheetah-print sash hugging the widest part of the envelope
  const band = prof.filter((p) => p.y > 1.72 && p.y < 2.62).map((p) => new THREE.Vector2(p.x * 1.012, p.y));
  const sashGeo = new THREE.LatheGeometry(band, 36);
  const uv = sashGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 0.7);
  const sash = new THREE.Mesh(sashGeo, cheetahToon('pink'));
  sash.position.y = MOUTH_Y;
  sash.castShadow = true;
  const trim = new Batch();
  for (const p of [band[0], band[band.length - 1]]) trim.add(G.torus(p.x + 0.01, 0.03, 40), '#ffffff', { y: MOUTH_Y + p.y, rx: Math.PI / 2 });
  sway.add(sash, trim.build());

  const shadow = contactShadow(1.7);
  shadow.position.y = 0.03;
  group.add(shadow);

  return {
    group,
    riderY: 0.1,
    animate(t, air) {
      // pivot the sway around the basket so the envelope leans, not the floor
      sway.rotation.z = Math.sin(t * 0.9) * 0.05 * (0.25 + air * 0.75);
      sway.rotation.x = Math.sin(t * 0.7 + 1.3) * 0.04 * (0.25 + air * 0.75);
      sway.position.y = Math.sin(t * 1.3) * 0.12 * air;
      shadow.visible = air < 0.35;
      shadow.scale.setScalar(1 - air * 1.2);
    },
  };
}
