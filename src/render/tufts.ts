// Tiny meadow dressing: grass tufts, clover and little flowers scattered over grass/lawn tiles. Two InstancedMeshes (two draws),
// capped hard (fewer on phones / low-memory devices), swaying in a shared vertex-shader wind. Pure scenery.
import * as THREE from 'three';
import { hash } from '../art/draw';
import type { Season } from '../time';
import { isReservedTile, isSolidTile, MAP_H, MAP_W, T, terrainAt } from '../world';
import { makeToon } from './materials';
import { tileHeight } from './terrain';
import { Batch, G } from './util';

const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const lowMem = ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2;
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const CAP = lowMem ? { tuft: 0, flower: 0 } : coarse ? { tuft: 650, flower: 160 } : { tuft: 1500, flower: 380 };

const FLOWER_COLS = ['#ffffff', '#fff3a8', '#ffc2d8', '#ffd9ec', '#d9c8ff', '#ffe0b8'];

function tuftGeo() {
  const b = new Batch();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4, lean = 0.2 + (i % 3) * 0.13, h = 0.14 + (i % 2) * 0.07 + (i % 3) * 0.02;
    b.add(G.cone(0.016, h, 3), i % 2 ? '#ffffff' : '#e9f6e4', { x: Math.cos(a) * 0.028, y: h / 2, z: Math.sin(a) * 0.028, rx: Math.sin(a) * lean, rz: -Math.cos(a) * lean });
  }
  return b.geometry();
}
function flowerGeo() {
  const b = new Batch();
  b.add(G.cyl(0.006, 0.008, 0.13, 4), '#9bd69a', { y: 0.065 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(G.ball(0.026, 5), '#ffffff', { x: Math.cos(a) * 0.03, y: 0.14, z: Math.sin(a) * 0.03, s: [1, 0.55, 1] });
  }
  b.add(G.ball(0.02, 5), '#ffd45e', { y: 0.148 });
  return b.geometry();
}

export function createTufts() {
  const group = new THREE.Group();
  const uTime = { value: 0 };
  const windMat = () => {
    const m = makeToon('#ffffff', { ground: true });
    m.vertexColors = true;
    const base = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      base.call(m, shader, renderer);
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          {
            vec3 ip = vec3(instanceMatrix[3].x, 0.0, instanceMatrix[3].z);
            float ph = uTime * 1.5 + ip.x * 0.8 + ip.z * 0.55;
            float amt = position.y * (0.35 + 0.25 * sin(ip.x * 0.37 + ip.z * 0.21));
            transformed.x += (sin(ph) * 0.6 + sin(ph * 2.3 + 1.0) * 0.25) * amt;
            transformed.z += cos(ph * 0.8 + 0.7) * 0.4 * amt;
          }`);
    };
    return m;
  };

  type Spot = { x: number; z: number; y: number; ry: number; s: number; r: number };
  const tuftSpots: Spot[] = [], flowerSpots: Spot[] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrainAt(x, y);
    if ((t !== T.Grass && t !== T.Lawn) || isReservedTile(x, y) || isSolidTile(x, y)) continue;
    // keep the very edge of beach-adjacent tiles clear: the smooth shore mesh isn't at this height
    let skip = false;
    for (let dy = -1; dy <= 1 && !skip; dy++) for (let dx = -1; dx <= 1; dx++) if (terrainAt(x + dx, y + dy) === T.Sand) { skip = true; break; }
    if (skip) continue;
    const n = t === T.Lawn ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const r = hash(x * 7 + k * 13, y * 11 + k * 5), r2 = hash(x * 3 + k * 29 + 5, y * 17 + k * 3), r3 = hash(x + k * 41, y * 5 + k * 19);
      const sp: Spot = { x: x + 0.12 + r2 * 0.76, z: y + 0.12 + r3 * 0.76, y: tileHeight(x, y), ry: r * 40, s: 0.8 + r2 * 0.6, r };
      if (r < (t === T.Lawn ? 0.2 : 0.5)) tuftSpots.push(sp);
      else if (r > 0.9) flowerSpots.push(sp);
    }
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const pick = (list: Spot[], cap: number) => {
    const step = Math.max(1, list.length / Math.max(1, cap)), out: Spot[] = [];
    for (let i = 0; i < list.length && out.length < cap; i += step) out.push(list[Math.floor(i)]);
    return out;
  };
  const build = (geo: THREE.BufferGeometry, list: Spot[]) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, windMat(), list.length);
    im.castShadow = false; im.receiveShadow = true;
    list.forEach((sp, i) => {
      im.setMatrixAt(i, m.compose(p.set(sp.x, sp.y, sp.z), q.setFromEuler(e.set(0, sp.ry, 0)), sc.setScalar(sp.s)));
      im.setColorAt(i, new THREE.Color('#ffffff'));
    });
    group.add(im);
    return im;
  };
  const tuftList = pick(tuftSpots, CAP.tuft), flowerList = pick(flowerSpots, CAP.flower);
  const tuft = CAP.tuft ? build(tuftGeo(), tuftList) : null;
  const flower = CAP.flower ? build(flowerGeo(), flowerList) : null;

  const c = new THREE.Color();
  return {
    group,
    setSeason(s: Season) {
      if (tuft) {
        tuftList.forEach((sp, i) => tuft.setColorAt(i, c.set(s.grass).multiplyScalar(0.8 + sp.r * 0.3).offsetHSL(0, 0.04, -0.02)));
        tuft.instanceColor!.needsUpdate = true;
      }
      if (flower) {
        flowerList.forEach((sp, i) => flower.setColorAt(i, c.set(FLOWER_COLS[Math.floor(sp.r * 977) % FLOWER_COLS.length])));
        flower.instanceColor!.needsUpdate = true;
        flower.visible = s.id !== 'snowfluff';
      }
    },
    update(t: number) { if (!reduced) uTime.value = t; },
  };
}
