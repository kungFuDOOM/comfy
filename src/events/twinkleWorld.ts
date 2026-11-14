// Twinkle Season in the 3D world: snowy dressing of Sugarlily Square and the roads. Warm twinkle lights strung from the
// lamp posts and along slim posts beside the main roads, the town tree (decorated in the player's choices), snow
// drifts, wreaths on the lamps, the cocoa market stall from week 3, more presents under the tree in later weeks, and a
// shimmer of floating stars on Christmas Eve / Day. The island's snow itself comes from the event's `season` (events.ts).
// Everything that repeats is instanced; the whole thing is roughly 40 draw calls and a few hundred instances.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { chapterOpen, currentChapter, eventProgress, type EventWorld } from '../events';
import { LAMP_HDR, lightPool, markOwned } from '../render/materials';
import { heightAtUnits } from '../render/terrain';
import { ball, box, cyl, makeLabel, mat } from '../render/util';
import { FAR_LAMPS, LAMPS, ROAD_POSTS, STALL, TREE, TREE_STEPS } from './twinkleLayout';

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const dummy = new THREE.Object3D();
const col = new THREE.Color();
const ground = (x: number, z: number) => heightAtUnits(x, z);

interface Inst { mesh: THREE.InstancedMesh; n: number; add(x: number, y: number, z: number, s: [number, number, number], ry?: number, color?: string, rx?: number, rz?: number): number; done(): void }
/** Instanced mesh with optional per-instance colour. `cap` is the most it will ever hold. */
function instanced(geo: THREE.BufferGeometry, material: THREE.Material, cap: number, shadow = true): Inst {
  const mesh = new THREE.InstancedMesh(geo, material, cap);
  mesh.castShadow = shadow;
  const inst: Inst = {
    mesh, n: 0,
    add(x, y, z, s, ry = 0, color, rx = 0, rz = 0) {
      if (inst.n >= cap) return -1;
      dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(...s); dummy.updateMatrix();
      mesh.setMatrixAt(inst.n, dummy.matrix);
      if (color) mesh.setColorAt(inst.n, col.set(color));
      return inst.n++;
    },
    done() { mesh.count = inst.n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; },
  };
  return inst;
}

/** A hanging curve between two points: sags in the middle. */
function strand(a: THREE.Vector3, b: THREE.Vector3, sag: number, steps: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t));
  }
  return out;
}

const BULB = [
  { c: '#ff9ec0', glow: '#ff8fb6' }, { c: '#ffe27a', glow: '#ffd95e' }, { c: '#a8f0d0', glow: '#8fe6c0' }, { c: '#fff3dc', glow: '#ffe9c8' },
];
const STAR_SHAPE = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.1 : 0.22; (i ? s.lineTo : s.moveTo).call(s, Math.cos(a) * r, Math.sin(a) * r); }
  s.closePath(); return s;
})();
const HEART_SHAPE = (() => {
  const s = new THREE.Shape(), k = 0.012;
  s.moveTo(0, -9 * k); s.bezierCurveTo(-18 * k, 3 * k, -10 * k, 14 * k, 0, 7 * k); s.bezierCurveTo(10 * k, 14 * k, 18 * k, 3 * k, 0, -9 * k);
  return s;
})();
const extrude = (shape: THREE.Shape) => { const g = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false }); g.translate(0, 0, -0.035); return g; };

// ---------- soft falling snow, bulb halos and the tree's aura: all animated on the GPU (only uniforms change per frame) ----------
const SNOW = 420;
const SNOW_VERT = /* glsl */ `
attribute vec4 aSeed; // size 0..1, speed 0..1, phase, big fluffy flake 0/1
uniform float uTime; uniform float uScale; uniform float uGround; uniform float uOpacity; uniform vec3 uBox;
varying float vA;
void main() {
  // the flakes live in a box that follows the spot the camera looks at, and wrap around inside it
  vec3 fwd = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  float dist = clamp((cameraPosition.y - uGround) / max(0.15, -fwd.y), 4.0, 34.0);
  vec3 c = cameraPosition + fwd * dist;
  c.y += uBox.y * 0.5 - 1.0;
  float ph = aSeed.z;
  vec3 p = position * uBox;
  p.y -= uTime * (0.36 + aSeed.y * 0.42 + aSeed.w * 0.14);
  p.x += uTime * 0.2 + sin(uTime * 0.11 + ph) * 0.9 + sin(uTime * (0.7 + aSeed.x * 0.7) + ph * 3.0) * (0.12 + aSeed.y * 0.3);
  p.z += uTime * 0.07 + cos(uTime * (0.55 + aSeed.y * 0.6) + ph * 2.0) * (0.12 + aSeed.x * 0.25);
  vec3 rel = mod(p - c + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = viewMatrix * vec4(c + rel, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(0.05, 0.115, aSeed.x * aSeed.x) + aSeed.w * 0.1;
  gl_PointSize = clamp(size * uScale / max(0.1, -mv.z), 1.5, max(2.0, uScale * 0.035));
  vec3 e = 1.0 - abs(rel) / (uBox * 0.5);
  float edge = smoothstep(0.0, 0.18, e.x) * smoothstep(0.0, 0.18, e.z) * smoothstep(0.0, 0.12, e.y);
  vA = edge * smoothstep(1.0, 3.5, -mv.z) * mix(0.9, 0.5, aSeed.w) * (0.82 + 0.18 * sin(uTime * 1.7 + ph * 5.0)) * uOpacity;
}`;
const SNOW_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.25, d) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`;
const HALO_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aSize; attribute float aPhase;
uniform float uTime; uniform float uScale; uniform float uGlow; uniform vec4 uWave; // x, z, radius, soft edge
varying float vA; varying vec3 vC;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
  float lit = smoothstep(0.0, 1.0, clamp((uWave.z - distance(wp.xz, uWave.xy)) / max(0.01, uWave.w), 0.0, 1.0));
  gl_Position = projectionMatrix * mv;
  // the same beat the bulbs swell on, plus a rare little sparkle
  float tw = max(0.0, sin(uTime * 2.3 + aPhase));
  float spark = pow(max(0.0, sin(uTime * 0.9 + aPhase * 7.0)), 24.0);
  gl_PointSize = min(aSize * (0.78 + 0.3 * tw + 0.35 * spark) * uScale / max(0.1, -mv.z), 256.0);
  vA = uGlow * lit * (0.42 + 0.48 * tw + 0.5 * spark); vC = aColor;
}`;
const HALO_FRAG = /* glsl */ `
varying float vA; varying vec3 vC;
void main() {
  float g = max(0.0, 1.0 - length(gl_PointCoord - 0.5) * 2.0);
  float a = g * g * vA;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vC, a);
}`;
const AURA_VERT = /* glsl */ `
uniform vec2 uSize; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize; // always faces the camera
  mv.z += 1.1;                  // sits just in front of the branches so the glow washes over them
  gl_Position = projectionMatrix * mv;
}`;
const AURA_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uGlow; varying vec2 vUv;
void main() {
  float g = max(0.0, 1.0 - length(vUv - 0.5) * 2.0);
  gl_FragColor = vec4(uColor, g * g * (3.0 - 2.0 * g) * uGlow);
}`;
/** Keeps a point cloud's sizes in world units whatever the buffer size (no allocations). */
function pointScale(this: THREE.Points, renderer: THREE.WebGLRenderer, _s: THREE.Scene, camera: THREE.Camera) {
  const h = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
  (this.material as THREE.ShaderMaterial).uniforms.uScale.value = h * 0.5 * camera.projectionMatrix.elements[5];
}

/** Name of the town tree's group in the scene (the first-snowfall cutscene finds it to raise it). */
export const TWINKLE_TREE_NAME = 'twinkle-tree';
let snowLevel = 1;
/** 0..1 multiplier on the falling snow. Cutscenes hold it at 0 until "the snow begins"; always put it back to 1. */
export const setTwinkleSnow = (k: number) => { snowLevel = Math.max(0, Math.min(1, k)); };
/** Name of the snow-drift mounds (a cutscene can hide them until the snow has settled). */
export const TWINKLE_DRIFTS_NAME = 'twinkle-drifts';
/** The light strings switch on in a wave spreading out from a point: bulbs within `r` tiles are lit (soft edge `soft`).
 *  null = all lit (the normal state). Cutscenes drive it; always put it back to null. */
export interface LightWave { x: number; z: number; r: number; soft: number }
let wave: LightWave | null = null;
export const setTwinkleLightWave = (w: LightWave | null) => { wave = w; };
let treeGlow = 1;
/** How brightly the town tree's own lights burn: 1 = normal, 0 = unlit, up to 2 = the tree-lighting blaze. Cutscenes drive it; always put it back to 1. */
export const setTwinkleTreeGlow = (k: number) => { treeGlow = Math.max(0, Math.min(2, k)); };
const waveAt = (x: number, z: number) => {
  if (!wave) return 1;
  const t = Math.max(0, Math.min(1, (wave.r - Math.hypot(x - wave.x, z - wave.z)) / Math.max(0.01, wave.soft)));
  return t * t * (3 - 2 * t);
};

export function createTwinkleWorld(): EventWorld {
  // animated bits, rebuilt on every build()
  interface Bulb { m: THREE.InstancedMesh; i: number; x: number; y: number; z: number; ph: number; sc: number; tree: boolean }
  let bulbs: Bulb[] = [], bulbMeshes: THREE.InstancedMesh[] = [];
  let pools: { m: THREE.Mesh; w: number; d: number; ph: number }[] = [];
  let sparkles: { m: THREE.InstancedMesh; i: number; x: number; y: number; z: number; ph: number; r: number }[] = [];
  let topper: THREE.Object3D | null = null;
  let lastTick = -1, waveWas = false;
  let snowMat: THREE.ShaderMaterial | null = null, haloMat: THREE.ShaderMaterial | null = null, treeHaloMat: THREE.ShaderMaterial | null = null, auraMat: THREE.ShaderMaterial | null = null;
  let nightRef: THREE.MeshToonMaterial | null = null; // any 'lamp' material: its emissive strength tells how dark it is
  let auraBase = 0;

  const picks = () => {
    const c = eventProgress('twinkle').counters;
    return TREE_STEPS.map((s) => Math.max(0, Math.min(3, c[s.key] ?? 0)));
  };

  return {
    signature: () => `${currentChapter('twinkle')?.id ?? ''}|${picks().join('')}`,

    build() {
      const root = new THREE.Group();
      root.name = 'event-twinkle';
      const r = rng(1224);
      bulbs = []; bulbMeshes = []; pools = []; sparkles = []; topper = null; lastTick = -1;
      snowMat = haloMat = treeHaloMat = auraMat = null; nightRef = null; auraBase = 0;
      const [garland, baubles, glow] = picks();
      const wk3 = chapterOpen('twinkle', 'wk3'), wk4 = chapterOpen('twinkle', 'wk4');
      const finale = ['eve', 'day'].includes(currentChapter('twinkle')?.id ?? '');

      // ---------- twinkle bulbs: one instanced mesh per colour ----------
      const bulbGeo = new THREE.SphereGeometry(0.055, 8, 6);
      const bulbSets = BULB.map((b) => { const i = instanced(bulbGeo, mat(b.c, b.glow, 'lamp'), 150, false); bulbMeshes.push(i.mesh); return i; });
      nightRef = bulbSets[0].mesh.material as THREE.MeshToonMaterial;
      // the tree's own bulbs live inside the tree group (tree-local coords) so they rise and scale with it
      const treeSets = BULB.map((b) => { const i = instanced(bulbGeo, mat(b.c, b.glow, 'lamp'), 40, false); bulbMeshes.push(i.mesh); return i; });
      // every bulb also gets a soft warm halo (one additive point cloud for the strings, one inside the tree)
      type HaloBuf = { pos: number[]; col: number[]; size: number[]; ph: number[] };
      const haloBuf = (): HaloBuf => ({ pos: [], col: [], size: [], ph: [] });
      const worldHalo = haloBuf(), treeHalo = haloBuf();
      const WARM = new THREE.Color('#ffd2a0');
      const addHalo = (h: HaloBuf, x: number, y: number, z: number, color: string, size: number, ph: number) => {
        col.set(color).lerp(WARM, 0.35);
        h.pos.push(x, y, z); h.col.push(col.r, col.g, col.b); h.size.push(size); h.ph.push(ph);
      };
      let bn = 0;
      const addBulb = (p: THREE.Vector3, sc = 1, sets = bulbSets, h = worldHalo) => {
        const k = bn++ % sets.length, set = sets[k];
        const i = set.add(p.x, p.y, p.z, [sc, sc, sc]);
        if (i < 0) return;
        const ph = r() * 6.3;
        bulbs.push({ m: set.mesh, i, x: p.x, y: p.y, z: p.z, ph, sc, tree: sets === treeSets });
        addHalo(h, p.x, p.y, p.z, BULB[k].glow, 0.42 * sc, ph);
      };

      // ---------- strings of lights ----------
      const lampTop = (p: { x: number; z: number }, y = 1.62) => new THREE.Vector3(p.x + 0.5, ground(p.x + 0.5, p.z + 0.5) + y, p.z + 0.5);
      const strands: { a: THREE.Vector3; b: THREE.Vector3; sag: number }[] = [];
      const ring = [LAMPS[0], LAMPS[1], LAMPS[3], LAMPS[2]];
      for (let i = 0; i < ring.length; i++) strands.push({ a: lampTop(ring[i]), b: lampTop(ring[(i + 1) % ring.length]), sag: 0.55 });
      strands.push({ a: lampTop(LAMPS[1], 1.5), b: lampTop(FAR_LAMPS[0], 1.5), sag: 1.0 });
      strands.push({ a: lampTop(LAMPS[0], 1.5), b: lampTop(FAR_LAMPS[1], 1.5), sag: 1.4 });
      // slim posts along the roads, joined across and along
      const postTop = (p: [number, number]) => new THREE.Vector3(p[0], ground(p[0], p[1]) + 1.5, p[1]);
      const posts = ROAD_POSTS.flat();
      ROAD_POSTS.forEach((pair) => strands.push({ a: postTop(pair[0]), b: postTop(pair[1]), sag: 0.35 }));
      for (let i = 0; i + 1 < ROAD_POSTS.length; i++) for (const side of [0, 1]) {
        const a = ROAD_POSTS[i][side], b = ROAD_POSTS[i + 1][side];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 4.5) strands.push({ a: postTop(a), b: postTop(b), sag: 0.3 });
      }
      const wireGeos: THREE.BufferGeometry[] = [];
      for (const s of strands) {
        const len = s.a.distanceTo(s.b);
        const pts = strand(s.a, s.b, s.sag, Math.max(8, Math.round(len * 3)));
        wireGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.012, 4));
        const n = Math.max(3, Math.round(len * 1.5));
        for (let i = 1; i < n; i++) addBulb(pts[Math.round((i / n) * (pts.length - 1))]);
        if (len > 6) { const m = pts[Math.floor(pts.length / 2)]; const g = lightPool(2.4, 2.4, '#ffd9c8', 0.18); g.position.set(m.x, ground(m.x, m.z) + 0.04, m.z); pools.push({ m: g, w: 2.4, d: 2.4, ph: r() * 6.3 }); root.add(g); }
      }
      const wire = new THREE.Mesh(mergeGeometries(wireGeos)!, mat('#b9a39a'));
      wireGeos.forEach((g) => g.dispose());
      root.add(wire);

      // road posts: a pale pole with a snow cap and a pink tip
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.045, 1.5, 6).translate(0, 0.75, 0);
      const poles = instanced(poleGeo, mat('#ffffff'), 40);
      const caps = instanced(new THREE.SphereGeometry(0.075, 8, 6), mat('#ffffff'), 40, false);
      const tips = instanced(new THREE.SphereGeometry(0.05, 8, 6), mat('#ff9ec0'), 40, false);
      for (const p of posts) {
        const y = ground(p[0], p[1]);
        poles.add(p[0], y, p[1], [1, 1, 1], 0, '#ffd2e0'); caps.add(p[0], y + 1.52, p[1], [1, 0.6, 1], 0, '#ffffff'); tips.add(p[0], y + 1.6, p[1], [1, 1, 1], 0, '#ff9ec0');
      }
      for (const p of [poles, caps, tips]) { p.done(); root.add(p.mesh); }

      // ---------- snow drifts: soft white mounds around the posts, the tree and the plaza edge ----------
      const drift = instanced(new THREE.SphereGeometry(0.5, 8, 6), mat('#ffffff'), 90, false);
      const mound = (cx: number, cz: number, rad: number, n: number) => {
        for (let i = 0; i < n; i++) {
          const a = r() * 6.3, d = Math.sqrt(r()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, s = 0.35 + r() * 0.4;
          drift.add(x, ground(x, z) + 0.02, z, [s * 1.4, s * 0.4, s], r() * 3.1, '#ffffff');
        }
      };
      for (const l of LAMPS) mound(l.x + 0.5, l.z + 0.5, 0.9, 4);
      for (const p of posts) mound(p[0], p[1], 0.4, 1);
      mound(TREE.x, TREE.z, 2.3, 14);
      mound(48.5, 46.6, 1.8, 4);
      drift.done(); drift.mesh.name = TWINKLE_DRIFTS_NAME; root.add(drift.mesh);

      // ---------- wreaths with bows on the lamp posts ----------
      const wreathGeo = new THREE.TorusGeometry(0.2, 0.07, 6, 16);
      for (const l of [...LAMPS, ...FAR_LAMPS]) {
        const x = l.x + 0.5, z = l.z + 0.5, y = ground(x, z) + 1.05;
        const w = new THREE.Mesh(wreathGeo, mat('#8fd7ae')); w.position.set(x, y, z + 0.1); root.add(w);
        for (const sx of [-1, 1]) root.add(ball(0.05, '#ffb3cf', x + sx * 0.06, y - 0.2, z + 0.2, 6));
        root.add(ball(0.035, '#ff8fb6', x, y - 0.2, z + 0.21, 6));
        for (const [bx, by] of [[-0.14, 0.12], [0.15, 0.05], [0.0, 0.22]]) root.add(ball(0.03, '#ff6f94', x + bx, y + by, z + 0.17, 6));
      }

      // ---------- the town tree ----------
      const tree = new THREE.Group();
      tree.name = TWINKLE_TREE_NAME;
      const ty = ground(TREE.x, TREE.z);
      tree.position.set(TREE.x, ty, TREE.z);
      tree.add(cyl(0.12, 0.17, 0.5, '#c99a7a', 0, 0.25, 0, 10));
      const TIERS: [number, number, number, string][] = [[0.4, 1.0, 1.0, '#8fd7ae'], [1.0, 0.82, 0.95, '#9fe0b8'], [1.6, 0.62, 0.9, '#a9e6c0'], [2.15, 0.42, 0.85, '#b4ebc8']];
      for (const [y, rad, h, c] of TIERS) {
        tree.add(cyl(0.02, rad, h, c, 0, y + h / 2, 0, 14));
        // a soft snow cap on every tier
        tree.add(cyl(0.015, rad * 0.62, h * 0.62, '#ffffff', 0, y + h * 0.7, 0, 14));
      }
      const radAt = (y: number) => { for (const [y0, rad, h] of TIERS) if (y >= y0 && y <= y0 + h) return rad * (1 - (y - y0) / h) + 0.04; return 0.1; };
      const spiral = (turns: number, y0: number, y1: number, n: number, off = 0) => Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n, y = y0 + (y1 - y0) * t, a = off + t * turns * Math.PI * 2, rd = radAt(Math.min(y, 2.9)) + 0.03;
        return new THREE.Vector3(Math.cos(a) * rd, y, Math.sin(a) * rd);
      });
      const garlandCol = garland ? TREE_STEPS[0].options[garland - 1].color : '';
      if (garland) {
        const pts = spiral(4.2, 0.55, 2.6, 80);
        tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.032, 5), mat(garlandCol)));
        // tiny lights on the garland
        pts.forEach((p, i) => { if (i % 5 === 2) addBulb(p, 0.9, treeSets, treeHalo); });
      }
      if (baubles) {
        const set = baubles === 1 ? ['#ff8fb6', '#ffb3cf', '#ff6f94'] : baubles === 2 ? ['#bfe3f7', '#e6f4ff', '#c9a8e8'] : ['#ffd36e', '#fff0b0', '#f7b84a'];
        const b = instanced(new THREE.SphereGeometry(0.09, 10, 8), mat('#ffffff'), 40);
        spiral(3.1, 0.7, 2.45, 26, 1.2).forEach((p, i) => b.add(p.x * 1.04, p.y, p.z * 1.04, [1, 1, 1], 0, set[i % set.length]));
        b.done(); tree.add(b.mesh);
      }
      // the topper: a star, a heart or a snow moon; unchosen = a plain white bobble
      const tipY = 3.0;
      if (glow === 1 || glow === 2) {
        const geo = extrude(glow === 1 ? STAR_SHAPE : HEART_SHAPE);
        const t = new THREE.Mesh(geo, mat(glow === 1 ? '#ffe27a' : '#ff8fb6', glow === 1 ? '#ffd95e' : '#ff8fb6', 'lamp'));
        if (glow === 2) t.scale.setScalar(1.3);
        t.position.set(0, tipY + 0.08, 0); tree.add(t); topper = t;
      } else if (glow === 3) {
        const t = ball(0.17, mat('#ffffff', '#e8f4ff', 'lamp'), 0, tipY + 0.05, 0, 12); tree.add(t); topper = t;
      } else tree.add(ball(0.08, '#ffffff', 0, tipY, 0, 8));
      // presents under the tree: more of them as the weeks go by
      const gifts: [number, number, number, number, string, string][] = [
        [0.95, 0.4, 0.34, 0.3, '#ffc2d8', '#ffffff'], [-0.9, 0.7, 0.3, 0.26, '#c8ecd9', '#ff8fb6'],
        [0.7, -0.9, 0.38, 0.32, '#fff1d6', '#ff8fb6'], [-0.5, -1.0, 0.3, 0.3, '#e6d4f5', '#ffffff'],
        [1.35, -0.2, 0.28, 0.24, '#ffd9b8', '#ff8fb6'], [-1.2, -0.3, 0.34, 0.28, '#d4ecf7', '#ffffff'], [0.1, 1.2, 0.3, 0.26, '#ffc2d8', '#ffe27a'],
      ];
      const nGifts = finale ? 7 : wk4 ? 5 : wk3 ? 3 : 2;
      gifts.slice(0, nGifts).forEach(([x, z, w, h, c, rb], i) => {
        const g = new THREE.Group();
        g.add(box(w, h, w, c, 0, h / 2, 0)); g.add(box(w + 0.01, h + 0.01, 0.05, rb, 0, h / 2, 0)); g.add(box(0.05, h + 0.01, w + 0.01, rb, 0, h / 2, 0));
        for (const sx of [-1, 1]) { const lp = ball(0.05, rb, sx * 0.05, h + 0.04, 0, 6); lp.scale.set(1, 0.7, 0.5); g.add(lp); }
        g.position.set(x, 0.02, z); g.rotation.y = i * 0.9;
        tree.add(g);
      });
      root.add(tree);
      // a halo around the topper, and a big soft aura over the tree that grows with every decorating step
      if (glow) addHalo(treeHalo, 0, tipY + 0.08, 0, ['#ffd95e', '#ff8fb6', '#e8f0ff'][glow - 1], finale ? 1.5 : 1.15, 1.0);
      const steps = (garland ? 1 : 0) + (baubles ? 1 : 0) + (glow ? 1 : 0);
      if (steps) {
        auraBase = (finale ? 0.3 : 0.2) * (steps / 3);
        auraMat = markOwned(new THREE.ShaderMaterial({
          vertexShader: AURA_VERT, fragmentShader: AURA_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { uColor: { value: new THREE.Color(finale ? '#ffcf8a' : '#ffc9a8') }, uGlow: { value: 0 }, uSize: { value: new THREE.Vector2(finale ? 5.4 : 4.4, finale ? 6.6 : 5.6) } },
        }));
        const aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), auraMat);
        aura.position.set(0, 1.75, 0); aura.frustumCulled = false; aura.renderOrder = 4;
        tree.add(aura);
      }
      // warm glow once the tree is fully decorated, brighter for the finale
      if (garland && baubles && glow) {
        const p = lightPool(finale ? 6.4 : 4.4, finale ? 6.4 : 4.4, finale ? '#ffd9a0' : '#ffd0c0', finale ? 0.34 : 0.26);
        p.position.set(0, 0.04, 0); pools.push({ m: p, w: finale ? 6.4 : 4.4, d: finale ? 6.4 : 4.4, ph: 0.5 }); tree.add(p);
      }

      // ---------- the cocoa market stall (week 3) ----------
      if (wk3) {
        const st = new THREE.Group();
        const sy = ground(STALL.x, STALL.z);
        st.position.set(STALL.x, sy, STALL.z);
        st.add(box(1.9, 0.62, 0.5, '#f6d7bd', 0, 0.31, 0.3));         // counter (front, south side)
        st.add(box(2.0, 0.06, 0.6, '#ffffff', 0, 0.65, 0.3));          // snow-white top
        for (const sx of [-1, 1]) st.add(cyl(0.04, 0.05, 1.9, '#d9ab8a', sx * 0.95, 0.95, -0.38, 8)); // back posts
        for (const sx of [-1, 1]) st.add(cyl(0.035, 0.04, 1.55, '#d9ab8a', sx * 0.95, 0.78, 0.5, 8));  // front posts
        st.add(box(1.9, 1.2, 0.05, '#fff1f6', 0, 0.85, -0.42));         // back wall
        // striped awning sloping towards the customers
        const awning = new THREE.Group();
        for (let i = 0; i < 7; i++) awning.add(box(0.29, 0.05, 1.3, i % 2 ? '#ffffff' : '#ff9ec0', -0.87 + i * 0.29, 0, 0));
        awning.position.set(0, 1.78, 0.05); awning.rotation.x = 0.16;
        st.add(awning);
        const roofSnow = box(2.0, 0.07, 1.0, '#ffffff', 0, 1.98, -0.06); roofSnow.rotation.x = 0.16; roofSnow.scale.set(0.96, 1, 0.8); st.add(roofSnow);
        const sign = makeLabel('Cocoa Market', 1.5); sign.position.set(0, 2.32, 0.62); st.add(sign);
        // mugs, a big cocoa pot and a plate of marshmallows
        [['#ff9ec0', -0.6], ['#9fe0c8', -0.3], ['#ffd36e', 0.0]].forEach(([c, x]) => { st.add(cyl(0.07, 0.055, 0.12, '#ffffff', x as number, 0.74, 0.28, 10)); st.add(cyl(0.072, 0.072, 0.02, c as string, x as number, 0.8, 0.28, 10)); });
        st.add(cyl(0.16, 0.2, 0.34, '#ffb3cf', 0.62, 0.85, 0.28, 12)); st.add(cyl(0.12, 0.16, 0.06, '#ffffff', 0.62, 1.05, 0.28, 12)); st.add(ball(0.04, '#ff8fb6', 0.62, 1.1, 0.28, 6));
        for (let i = 0; i < 5; i++) st.add(box(0.09, 0.08, 0.09, '#ffffff', 0.15 + (i % 3) * 0.1 - 0.05, 0.72 + (i > 2 ? 0.08 : 0), 0.42 - (i > 2 ? 0 : 0.06)));
        root.add(st);
        // lights along the awning's front edge
        for (let i = 0; i < 7; i++) addBulb(new THREE.Vector3(STALL.x - 0.87 + i * 0.29, sy + 1.74 + 0.1, STALL.z + 0.7), 0.9);
        const gl = lightPool(3.0, 2.4, '#ffcfb0', 0.3); gl.position.set(STALL.x, sy + 0.04, STALL.z + 1.0); pools.push({ m: gl, w: 3.0, d: 2.4, ph: 2.2 }); root.add(gl);
      }

      // ---------- Christmas Eve / Day: a ring of floating stars over the tree ----------
      if (finale) {
        const sg = instanced(extrude(STAR_SHAPE), mat('#ffe27a', '#ffd95e', 'lamp'), 12, false);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2, rd = 1.9 + (i % 3) * 0.35, y = ty + 3.2 + (i % 4) * 0.35;
          const k = sg.add(TREE.x + Math.cos(a) * rd, y, TREE.z + Math.sin(a) * rd, [0.55, 0.55, 0.55]);
          if (k >= 0) sparkles.push({ m: sg.mesh, i: k, x: TREE.x + Math.cos(a) * rd, y, z: TREE.z + Math.sin(a) * rd, ph: r() * 6.3, r: a });
        }
        sg.done(); root.add(sg.mesh);
      }

      for (const b of bulbSets) { b.done(); root.add(b.mesh); }
      for (const b of treeSets) { b.done(); tree.add(b.mesh); }

      // ---------- bulb halos ----------
      haloMat = markOwned(new THREE.ShaderMaterial({
        vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uScale: { value: 500 }, uGlow: { value: 0 }, uWave: { value: new THREE.Vector4(0, 0, 1e4, 1) } },
      }));
      treeHaloMat = markOwned(haloMat.clone()); // the tree's halos get their own copy so the tree can glow on its own
      const halos = (h: HaloBuf, parent: THREE.Object3D, m: THREE.ShaderMaterial) => {
        if (!h.pos.length) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(h.pos, 3));
        g.setAttribute('aColor', new THREE.Float32BufferAttribute(h.col, 3));
        g.setAttribute('aSize', new THREE.Float32BufferAttribute(h.size, 1));
        g.setAttribute('aPhase', new THREE.Float32BufferAttribute(h.ph, 1));
        const pts = new THREE.Points(g, m);
        pts.frustumCulled = false; pts.renderOrder = 4; pts.onBeforeRender = pointScale;
        parent.add(pts);
      };
      halos(worldHalo, root, haloMat);
      halos(treeHalo, tree, treeHaloMat);

      // ---------- falling snow: fluffy flakes of many sizes, drifting and swaying on the breeze ----------
      const seed = new Float32Array(SNOW * 3), extra = new Float32Array(SNOW * 4);
      for (let i = 0; i < SNOW; i++) {
        seed[i * 3] = r(); seed[i * 3 + 1] = r(); seed[i * 3 + 2] = r();
        extra[i * 4] = r(); extra[i * 4 + 1] = r(); extra[i * 4 + 2] = r() * 6.3; extra[i * 4 + 3] = r() < 0.09 ? 1 : 0;
      }
      const snowGeo = new THREE.BufferGeometry();
      snowGeo.setAttribute('position', new THREE.BufferAttribute(seed, 3));
      snowGeo.setAttribute('aSeed', new THREE.BufferAttribute(extra, 4));
      snowMat = markOwned(new THREE.ShaderMaterial({
        vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uScale: { value: 500 }, uGround: { value: ty }, uOpacity: { value: 0.9 }, uBox: { value: new THREE.Vector3(30, 9, 26) }, uColor: { value: new THREE.Color('#ffffff') } },
      }));
      const snow = new THREE.Points(snowGeo, snowMat);
      snow.frustumCulled = false; snow.renderOrder = 5; snow.onBeforeRender = pointScale;
      root.add(snow);
      return root;
    },

    update(t) {
      // how dark it is (0 day .. 1 night), read back from the lamp glow the lighting rig already drives
      const night = nightRef ? Math.min(1, nightRef.emissiveIntensity / LAMP_HDR) : 0;
      if (snowMat) {
        const u = snowMat.uniforms;
        u.uTime.value = t; u.uOpacity.value = (0.92 - night * 0.22) * snowLevel;
        (u.uColor.value as THREE.Color).setRGB(1 - night * 0.36, 1 - night * 0.3, 1 - night * 0.12); // moonlit blue at night
      }
      if (haloMat) {
        const u = haloMat.uniforms;
        u.uTime.value = t; u.uGlow.value = 0.1 + night * 0.62;
        (u.uWave.value as THREE.Vector4).set(wave?.x ?? 0, wave?.z ?? 0, wave?.r ?? 1e4, wave?.soft ?? 1);
      }
      if (treeHaloMat) {
        const u = treeHaloMat.uniforms;
        u.uTime.value = t; u.uGlow.value = (0.1 + night * 0.62) * treeGlow * (1 + Math.max(0, treeGlow - 1) * 1.2);
        (u.uWave.value as THREE.Vector4).set(wave?.x ?? 0, wave?.z ?? 0, wave?.r ?? 1e4, wave?.soft ?? 1);
      }
      if (auraMat) auraMat.uniforms.uGlow.value = (auraBase * (0.12 + night * 0.88) * Math.min(1, treeGlow) + Math.max(0, treeGlow - 1) * 0.5) * (1 + Math.sin(t * 0.9) * 0.06);
      // bulbs twinkle: each swells and shrinks on its own beat (~15 updates a second is plenty)
      // (every frame while a light wave is running, so the bulbs pop on smoothly)
      if (wave || waveWas || treeGlow !== 1 || t - lastTick > 0.066 || t < lastTick) {
        lastTick = t; waveWas = !!wave || treeGlow !== 1;
        for (const b of bulbs) {
          const k = b.sc * (0.82 + 0.34 * Math.max(0, Math.sin(t * 2.3 + b.ph))) * (b.tree ? (0.45 + 0.55 * Math.min(1, treeGlow)) * (1 + Math.max(0, treeGlow - 1) * 0.7) : 0.45 + 0.55 * waveAt(b.x, b.z)); // unlit bulbs sit small and dark
          dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(k); dummy.updateMatrix();
          b.m.setMatrixAt(b.i, dummy.matrix);
        }
        for (const m of bulbMeshes) m.instanceMatrix.needsUpdate = true;
        for (const s of sparkles) {
          dummy.position.set(s.x, s.y + Math.sin(t * 1.1 + s.ph) * 0.12, s.z); dummy.rotation.set(0, t * 0.7 + s.ph, 0);
          dummy.scale.setScalar(0.5 + 0.1 * Math.sin(t * 2 + s.ph)); dummy.updateMatrix();
          s.m.setMatrixAt(s.i, dummy.matrix);
        }
        if (sparkles.length) sparkles[0].m.instanceMatrix.needsUpdate = true;
      }
      for (const p of pools) { const k = 1 + Math.sin(t * 0.9 + p.ph) * 0.03; p.m.scale.set(p.w * k, 1, p.d * k); }
      if (topper) topper.rotation.y = Math.sin(t * 0.8) * 0.5;
    },
  };
}
