// Gathering nodes in 3D: berry bushes, flower patches, shell clusters, coffee shrubs and fishing ripples.
// One small group per node; ready nodes bob/sparkle gently, resting nodes look bare and dim but stay visible.
import * as THREE from 'three';
import { NODES, type NodeDef } from '../data';
import { isReady } from '../nodes';
import { contactShadow, PALETTE, vertexToon } from './materials';
import { tileHeight } from './terrain';
import { ball, Batch, cyl, G, mat } from './util';

/** Merged, cached bush geometry (one draw per group instead of a mesh per puff). Shared by every node of the same look. */
const geoCache = new Map<string, THREE.BufferGeometry>();
function merged(key: string, fill: (b: Batch) => void, ...groups: THREE.Group[]) {
  let geo = geoCache.get(key);
  if (!geo) { const b = new Batch(); fill(b); geo = b.geometry(); geoCache.set(key, geo); }
  for (const g of groups) { const m = new THREE.Mesh(geo, vertexToon()); m.castShadow = m.receiveShadow = true; g.add(m); }
}
/** A round, layered shrub: a core puff, a ring of side puffs, a top puff and a few pale highlight puffs. */
function shrub(b: Batch, cy: number, r: number, dark: string, light: string) {
  b.add(G.ball(r, 16), dark, { y: cy, s: [1, 0.9, 1] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, rr = r * (0.62 + (i % 3) * 0.06);
    b.add(G.ball(rr, 14), i % 2 ? light : dark, { x: Math.cos(a) * r * 0.72, y: cy - r * 0.25 + (i % 2) * r * 0.12, z: Math.sin(a) * r * 0.72, s: [1, 0.88, 1] });
  }
  b.add(G.ball(r * 0.62, 14), light, { x: r * 0.1, y: cy + r * 0.62, z: -r * 0.05, s: [1, 0.85, 1] });
  for (const [x, y, z] of [[-0.35, 0.45, 0.55], [0.4, 0.3, 0.5], [0.05, 0.85, 0.3]]) b.add(G.ball(r * 0.3, 10), '#c8f2cf', { x: x * r, y: cy + y * r, z: z * r });
}

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
      merged('berry-bush', (b) => shrub(b, 0.36, 0.4, '#7fcf8e', '#8fe0a0'), full, bare);
      merged('berry-fruit-' + hi, (b) => {
        for (const [x, y, z] of [[0.15, 0.66, 0.36], [-0.2, 0.52, 0.4], [0.4, 0.42, 0.24], [0, 0.82, 0.14], [-0.42, 0.38, 0.02], [0.24, 0.3, 0.42], [-0.08, 0.32, 0.46]]) {
          b.add(G.ball(0.075, 12), BERRY[hi], { x, y, z });
          b.add(G.ball(0.02, 6), '#ffffff', { x: x - 0.025, y: y + 0.035, z: z + 0.055 }); // a glossy glint
        }
      }, full);
      root.add(contactShadow(1.1));
      break;
    }
    case 'flower': {
      merged('flower-mound', (b) => {
        b.add(G.ball(0.34, 18), '#8fe0a0', { y: 0.1, s: [1.4, 0.35, 1.4] });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.add(G.ball(0.12, 10), i % 2 ? '#7fcf8e' : '#a6e8b2', { x: Math.cos(a) * 0.36, y: 0.08, z: Math.sin(a) * 0.36, s: [1.2, 0.6, 1] }); }
      }, full, bare);
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
      merged('coffee-shrub', (b) => {
        b.add(G.cyl(0.05, 0.08, 0.4, 10), '#8a6a52', { y: 0.2 });
        shrub(b, 0.66, 0.34, '#5fae78', '#6fc088');
      }, full, bare);
      merged('coffee-bean-' + hi, (b) => {
        for (const [x, y, z] of [[0.1, 0.8, 0.32], [-0.24, 0.62, 0.3], [0.32, 0.56, 0.24], [0, 0.94, -0.06], [-0.1, 0.48, 0.36]]) b.add(G.ball(0.06, 10), BEAN[hi], { x, y, z, s: [1, 1.2, 0.9] });
      }, full);
      root.add(contactShadow(1.0));
      break;
    }
    case 'wood': {
      // a sugarwood stump with a pink-ringed top; ready ones carry a little bundle of twigs
      for (const g of [full, bare]) {
        g.add(cyl(0.3, 0.36, 0.34, '#d9a98f', 0, 0.17, 0, 12));
        g.add(cyl(0.27, 0.27, 0.02, '#ffd9e8', 0, 0.35, 0, 12));
        g.add(cyl(0.15, 0.15, 0.025, '#ffb3cf', 0, 0.355, 0, 12));
        g.add(ball(0.12, '#a9e0a4', 0.2, 0.3, 0.2, 7));
      }
      for (const [x, z, r] of [[-0.12, 0.05, 0.4], [0.08, -0.06, -0.5], [0.0, 0.12, 0.1]]) {
        const t = cyl(0.02, 0.025, 0.42, '#c99a86', x, 0.55, z, 5);
        t.rotation.z = r; full.add(t);
        full.add(ball(0.035, '#ffb3cf', x + Math.sin(r) * -0.2, 0.74, z, 6));
      }
      root.add(contactShadow(0.9));
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
