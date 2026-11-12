// Gathering nodes in 3D: berry bushes, flower patches, shell clusters, coffee shrubs and fishing ripples.
// One small group per node; ready nodes bob/sparkle gently, resting nodes look bare and dim but stay visible.
import * as THREE from 'three';
import { NODES, type NodeDef } from '../data';
import { isReady } from '../nodes';
import { contactShadow, PALETTE } from './materials';
import { tileHeight } from './terrain';
import { ball, cyl, mat } from './util';

interface Rec { n: NodeDef; root: THREE.Group; full: THREE.Group; bare: THREE.Group; fx: THREE.Object3D; ready: boolean | null; phase: number }

const BERRY = ['#ff8fb6', '#c79bff'];
const PETAL = ['#ff9ec0', '#d9c6ff'];
const SHELL = ['#ffd9e8', '#ffb3cf'];
const BEAN = ['#8a5a44', '#4a3a6a'];
const RING = ['#ffffff', '#d9f0ff', '#fff3a8'];

function build(n: NodeDef): Rec {
  const root = new THREE.Group(), full = new THREE.Group(), bare = new THREE.Group();
  const hi = n.tier > 0 ? 1 : 0;
  let fx: THREE.Object3D = new THREE.Group();
  switch (n.kind) {
    case 'berry': {
      const leaf = '#7fcf8e';
      for (const g of [full, bare]) { g.add(ball(0.42, leaf, 0, 0.36, 0, 10)); g.add(ball(0.3, '#8fe0a0', 0.28, 0.28, 0.1, 8)); g.add(ball(0.28, '#8fe0a0', -0.26, 0.26, -0.1, 8)); }
      for (const [x, y, z] of [[0.15, 0.62, 0.32], [-0.2, 0.5, 0.34], [0.36, 0.42, 0.18], [0, 0.78, 0.1], [-0.38, 0.4, -0.05]]) full.add(ball(0.08, BERRY[hi], x, y, z, 6));
      root.add(contactShadow(1.1));
      break;
    }
    case 'flower': {
      for (const g of [full, bare]) { const m = ball(0.34, '#8fe0a0', 0, 0.1, 0, 8); m.scale.set(1.4, 0.35, 1.4); g.add(m); }
      for (const [x, z, h2] of [[0, 0, 0.42], [0.22, 0.14, 0.32], [-0.2, 0.1, 0.36], [0.05, -0.22, 0.3], [-0.12, -0.18, 0.38]] as number[][]) {
        full.add(cyl(0.015, 0.02, h2, '#7fcf8e', x, h2 / 2 + 0.1, z, 5));
        full.add(ball(0.1, PETAL[hi], x, h2 + 0.14, z, 7));
        full.add(ball(0.045, '#ffe9a8', x, h2 + 0.2, z, 6));
      }
      break;
    }
    case 'shell': {
      for (const g of [full, bare]) g.add(cyl(0.45, 0.5, 0.05, '#f4dcb8', 0, 0.03, 0, 14));
      for (const [x, z, r] of [[-0.12, 0.05, 0.14], [0.16, -0.06, 0.11], [0.04, 0.2, 0.09]]) {
        const s = ball(r, SHELL[hi], x, 0.1 + r * 0.4, z, 8); s.scale.y = 0.6; full.add(s);
      }
      if (hi) full.add(ball(0.05, '#ffffff', 0.0, 0.26, 0.0, 6));
      break;
    }
    case 'coffee': {
      for (const g of [full, bare]) { g.add(cyl(0.05, 0.07, 0.4, '#8a6a52', 0, 0.2, 0, 6)); g.add(ball(0.36, '#5fae78', 0, 0.62, 0, 9)); g.add(ball(0.24, '#6fc088', 0.24, 0.5, 0.06, 7)); }
      for (const [x, y, z] of [[0.1, 0.75, 0.3], [-0.24, 0.6, 0.22], [0.3, 0.55, 0.2], [0, 0.88, -0.1]]) full.add(ball(0.065, BEAN[hi], x, y, z, 6));
      root.add(contactShadow(1.0));
      break;
    }
    case 'fish': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 24), mat(RING[Math.min(n.tier, 2)]));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.03;
      const ring2 = ring.clone(); ring2.scale.setScalar(0.6);
      full.add(ring, ring2);
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), mat('#ffffff', PALETTE.lampGlow, 'lamp'));
      spark.position.y = 0.3; full.add(spark);
      fx = spark;
      // resting: a faint single ring
      const faint = ring.clone(); faint.scale.setScalar(0.45); bare.add(faint);
      break;
    }
  }
  root.add(bare, full);
  const w = n.kind === 'fish' ? 0.1 : 0;
  root.position.set(n.x + 0.5, tileHeight(n.x, n.y) + w, n.y + 0.5);
  return { n, root, full, bare, fx, ready: null, phase: n.x * 1.7 + n.y * 0.9 };
}

export interface NodeLayer { group: THREE.Group; update(t: number): void }

export function createNodeLayer(): NodeLayer {
  const group = new THREE.Group();
  const recs = NODES.map((n) => { const r = build(n); group.add(r.root); return r; });
  let lastCheck = -1;
  return {
    group,
    update(t) {
      const doCheck = t - lastCheck > 0.5; // readiness only changes on a timer, so skip most frames
      if (doCheck) lastCheck = t;
      const now = Date.now();
      for (const r of recs) {
        if (doCheck || r.ready === null) {
          const rd = isReady(r.n, now);
          if (rd !== r.ready) { r.ready = rd; r.full.visible = rd; r.bare.visible = !rd; r.root.scale.setScalar(rd ? 1 : 0.88); }
        }
        if (!r.ready) continue;
        const s = Math.sin(t * 2 + r.phase);
        if (r.n.kind === 'fish') {
          r.full.scale.setScalar(1 + s * 0.12);
          r.fx.position.y = 0.3 + Math.sin(t * 2.6 + r.phase) * 0.1;
          r.fx.rotation.y = t * 2;
        } else {
          r.full.position.y = Math.max(0, s) * 0.02;
          r.full.scale.y = 1 + s * 0.015;
        }
      }
    },
  };
}
