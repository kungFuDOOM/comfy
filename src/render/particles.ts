// Gentle ambient particles: drifting petals + sparkles by day, fireflies at night, coffee steam at the café.
// Three tiny THREE.Points clouds sharing one soft-dot shader; positions are recomputed on the CPU (~150 points).
import * as THREE from 'three';
import type { Season } from '../time';
import type { FootSurface } from '../audio';
import { steamVents } from './structures';

const DAY = 70;        // petals + sparkles, wrapped around the camera target
const FLIES = 46;      // night fireflies, wrapped around the camera target
const STEAM_PER = 12;  // puffs per steam vent
// wrap box around the follow target (camera looks north, so more room towards -z)
const BOX_X = 26, BOX_Z = 20, BOX_Z0 = -13;

const h01 = (n: number) => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
const wrap = (v: number, size: number) => ((v % size) + size) % size;

const VERT = /* glsl */ `
attribute float aAlpha; attribute float aSize; attribute vec3 aColor;
uniform float uScale; uniform float uOpacity;
varying float vA; varying vec3 vC;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vA = aAlpha * uOpacity; vC = aColor;
}`;
const FRAG = /* glsl */ `
varying float vA; varying vec3 vC;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.15, d) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vC, a);
}`;

interface Cloud { pts: THREE.Points; mat: THREE.ShaderMaterial; pos: Float32Array; alpha: Float32Array; size: Float32Array; col: Float32Array }

function cloud(n: number, additive: boolean): Cloud {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uScale: { value: 500 }, uOpacity: { value: 1 } },
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; // positions move every frame
  pts.renderOrder = 5;
  return { pts, mat, pos, alpha, size, col };
}

export interface Particles {
  group: THREE.Group;
  setSeason(s: Season): void;
  /** pxScale = drawing-buffer height / (2·tan(fov/2)), so point sizes are in world units. */
  /** Tiny dust puffs kicked up under the feet while running. */
  dust(dt: number, running: boolean, at: THREE.Vector3, surface: FootSurface): void;
  update(t: number, night: number, target: THREE.Vector3, pxScale: number, groundAt: (x: number, z: number) => number): void;
}

export function createParticles(): Particles {
  const group = new THREE.Group();
  const day = cloud(DAY, false), flies = cloud(FLIES, true), steam = cloud(Math.max(1, steamVents.length * STEAM_PER), false);
  group.add(day.pts, flies.pts, steam.pts);
  const c = new THREE.Color();

  // dust: a tiny pool of soft puffs spawned at the feet while running
  const DUST = 14, DLIFE = 0.45;
  const dust = cloud(DUST, false);
  group.add(dust.pts);
  const dAge = new Float32Array(DUST).fill(DLIFE), dVel = new Float32Array(DUST * 3);
  let dNext = 0, dTimer = 0, dAny = false;
  const DCOL: Record<string, string> = { sand: '#f1dfb4', path: '#d9cdb8', grass: '#cfe0b0', wood: '#d8c3a0', snow: '#f4f9ff' };

  // static per-particle colors
  const FLY_HDR = 3.2; // above the bloom threshold so fireflies glow softly at night
  for (let i = 0; i < FLIES; i++) {
    c.set(i % 3 ? '#fff3a0' : '#d8ffb0').multiplyScalar(FLY_HDR);
    flies.col.set([c.r, c.g, c.b], i * 3);
    flies.size[i] = 0.09 + h01(i + 300) * 0.06;
  }
  for (let i = 0; i < steam.size.length; i++) steam.col.set([1, 1, 1], i * 3);
  steam.pts.geometry.attributes.aColor.needsUpdate = flies.pts.geometry.attributes.aColor.needsUpdate = true;

  const isSparkle = (i: number) => i % 4 === 0;

  return {
    group,
    setSeason(s) {
      for (let i = 0; i < DAY; i++) {
        if (isSparkle(i)) c.set('#fffbe8'); else c.set(s.petal).lerp(new THREE.Color('#ffffff'), h01(i + 50) * 0.4);
        day.col.set([c.r, c.g, c.b], i * 3);
      }
      day.pts.geometry.attributes.aColor.needsUpdate = true;
    },
    dust(dt, running, at, surface) {
      dTimer -= dt;
      if (running && dTimer <= 0) {
        dTimer = 0.11;
        const i = dNext; dNext = (dNext + 1) % DUST;
        dAge[i] = 0; dAny = true;
        const a = Math.random() * Math.PI * 2;
        dust.pos.set([at.x + Math.cos(a) * 0.1, at.y + 0.06, at.z + Math.sin(a) * 0.1], i * 3);
        dVel[i * 3] = Math.cos(a) * 0.25; dVel[i * 3 + 1] = 0.3; dVel[i * 3 + 2] = Math.sin(a) * 0.25;
        c.set(DCOL[surface]); dust.col.set([c.r, c.g, c.b], i * 3);
        dust.pts.geometry.attributes.aColor.needsUpdate = true;
      }
      if (!dAny) return;
      let live = false;
      for (let i = 0; i < DUST; i++) {
        if (dAge[i] >= DLIFE) { dust.alpha[i] = 0; continue; }
        dAge[i] += dt; live = true;
        const p = dAge[i] / DLIFE;
        dust.pos[i * 3] += dVel[i * 3] * dt; dust.pos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dust.pos[i * 3 + 2] += dVel[i * 3 + 2] * dt;
        dust.alpha[i] = (1 - p) * 0.4;
        dust.size[i] = 0.12 + p * 0.14;
      }
      for (const n of ['position', 'aAlpha', 'aSize']) dust.pts.geometry.attributes[n].needsUpdate = true;
      dAny = live;
    },
    update(t, night, target, pxScale, groundAt) {
      for (const k of [day, flies, steam, dust]) k.mat.uniforms.uScale.value = pxScale;
      const dayK = 1 - night, nightK = Math.max(0, (night - 0.35) / 0.65);
      day.pts.visible = dayK > 0.01; flies.pts.visible = nightK > 0.01;
      day.mat.uniforms.uOpacity.value = dayK; flies.mat.uniforms.uOpacity.value = nightK;

      if (day.pts.visible) {
        for (let i = 0; i < DAY; i++) {
          const r1 = h01(i), r2 = h01(i + 11), r3 = h01(i + 23), sp = isSparkle(i);
          // petals drift down-wind and flutter; sparkles hang and twinkle
          const fall = sp ? 0 : 0.28 + r3 * 0.2, wind = sp ? 0.05 : 0.35 + r2 * 0.25;
          const x = target.x - BOX_X / 2 + wrap(r1 * BOX_X + t * wind + Math.sin(t * 1.3 + i) * 0.3, BOX_X);
          const z = target.z + BOX_Z0 + wrap(r2 * BOX_Z + t * wind * 0.4, BOX_Z);
          const life = wrap(r3 * 5 + t * fall, 5); // 0..5 units of fall
          const y = sp ? 0.6 + r3 * 2.2 + Math.sin(t * 0.7 + i) * 0.2 : 4.8 - life;
          day.pos.set([x, groundAt(x, z) + y, z], i * 3);
          const fade = sp ? Math.pow(0.5 + 0.5 * Math.sin(t * (2.2 + r1 * 2) + i * 1.7), 3) : Math.min(1, life * 2, (5 - life) * 2);
          day.alpha[i] = (sp ? 0.9 : 0.75) * fade;
          day.size[i] = sp ? 0.08 + r2 * 0.05 : 0.1 + r1 * 0.05;
        }
        for (const n of ['position', 'aAlpha', 'aSize']) day.pts.geometry.attributes[n].needsUpdate = true;
      }

      if (flies.pts.visible) {
        for (let i = 0; i < FLIES; i++) {
          const r1 = h01(i + 100), r2 = h01(i + 140), r3 = h01(i + 180);
          const x = target.x - BOX_X / 2 + wrap(r1 * BOX_X + Math.sin(t * 0.3 + i) * 1.4 + Math.sin(t * 0.83 + i * 2.1) * 0.4, BOX_X);
          const z = target.z + BOX_Z0 + wrap(r2 * BOX_Z + Math.cos(t * 0.27 + i * 1.3) * 1.4, BOX_Z);
          const y = 0.35 + r3 * 1.8 + Math.sin(t * 0.9 + i * 0.7) * 0.25;
          flies.pos.set([x, groundAt(x, z) + y, z], i * 3);
          flies.alpha[i] = Math.pow(0.5 + 0.5 * Math.sin(t * (1.1 + r3) + i * 2.3), 2) * 0.9;
        }
        for (const n of ['position', 'aAlpha', 'aSize']) flies.pts.geometry.attributes[n].needsUpdate = true;
      }

      steamVents.forEach((v, vi) => {
        const rise = v.big ? 1.3 : 0.55, puff = v.big ? 0.42 : 0.14;
        for (let j = 0; j < STEAM_PER; j++) {
          const i = vi * STEAM_PER + j, ph = wrap(t * (v.big ? 0.22 : 0.4) + j / STEAM_PER, 1);
          const sway = Math.sin(t * 1.4 + j * 1.9 + ph * 4) * 0.08 * (1 + ph * 2) * (v.big ? 2 : 1);
          steam.pos.set([v.x + sway, v.y + ph * rise, v.z + Math.cos(j * 2.4) * 0.03], i * 3);
          steam.alpha[i] = Math.sin(ph * Math.PI) * (v.big ? 0.55 : 0.45);
          steam.size[i] = puff * (0.5 + ph);
        }
      });
      for (const n of ['position', 'aAlpha', 'aSize']) steam.pts.geometry.attributes[n].needsUpdate = true;
    },
  };
}
