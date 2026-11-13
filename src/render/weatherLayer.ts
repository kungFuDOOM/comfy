// Weather in the 3D world: soft rain streaks and snow flakes (GPU-animated points, only uniforms change per frame),
// rippling puddles, drifting cloud shadows, and the grey-blue sky grade + wet sheen applied on top of the light rig.
// The rainbow itself is a light DOM arc (ui/weatherUi.ts), since the camera looks down at the island and never sees sky.
import * as THREE from 'three';
import { view } from '../weather';
import { T, isSolidTile, terrainAt } from '../world';
import type { LightRig } from './lighting';
import { shadeUniforms } from './materials';
import { heightAtUnits } from './terrain';

const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const RAIN = COARSE ? 240 : 460;
const SNOW = COARSE ? 220 : 380;
const PUDDLES = COARSE ? 16 : 26;
const SHADOWS = 5;
const CELL = 3;        // puddle grid cell, in tiles
const REACH_X = 13, REACH_Z = 11; // puddle search window around the camera target, in tiles

const POINT_VERT = /* glsl */ `
attribute vec4 aSeed; // size 0..1, speed 0..1, phase, unused
uniform float uTime; uniform float uScale; uniform float uGround; uniform float uOpacity; uniform vec3 uBox;
uniform float uFall; uniform float uSize; uniform float uDrift; uniform float uStreak;
varying float vA; varying float vStreak;
void main() {
  // the particles live in a box that follows the spot the camera looks at, and wrap around inside it
  vec3 fwd = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  float dist = clamp((cameraPosition.y - uGround) / max(0.15, -fwd.y), 4.0, 34.0);
  vec3 c = cameraPosition + fwd * dist;
  c.y += uBox.y * 0.5 - 1.0;
  float ph = aSeed.z;
  vec3 p = position * uBox;
  p.y -= uTime * uFall * (0.8 + aSeed.y * 0.4);
  p.x += uTime * uDrift + sin(uTime * 0.11 + ph) * 0.9 * (1.0 - uStreak) + sin(uTime * (0.7 + aSeed.x * 0.7) + ph * 3.0) * (0.12 + aSeed.y * 0.3) * (1.0 - uStreak);
  p.z += cos(uTime * (0.55 + aSeed.y * 0.6) + ph * 2.0) * (0.12 + aSeed.x * 0.25) * (1.0 - uStreak);
  vec3 rel = mod(p - c + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = viewMatrix * vec4(c + rel, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.7 + aSeed.x * 0.6);
  gl_PointSize = clamp(size * uScale / max(0.1, -mv.z), 1.5, max(2.0, uScale * 0.05));
  vec3 e = 1.0 - abs(rel) / (uBox * 0.5);
  float edge = smoothstep(0.0, 0.18, e.x) * smoothstep(0.0, 0.18, e.z) * smoothstep(0.0, 0.12, e.y);
  vA = edge * smoothstep(1.0, 3.5, -mv.z) * (0.55 + 0.45 * aSeed.x) * uOpacity;
  vStreak = uStreak;
}`;
const POINT_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA; varying float vStreak;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float a;
  if (vStreak > 0.5) { // a slim slanted raindrop streak, soft at both ends
    float x = q.x + q.y * 0.16;
    a = smoothstep(0.09, 0.0, abs(x)) * smoothstep(0.5, 0.2, abs(q.y));
  } else {
    a = smoothstep(1.0, 0.25, length(q) * 2.0);
  }
  a *= vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`;

const PUDDLE_VERT = /* glsl */ `
varying vec2 vUv; varying float vPh;
void main() {
  vUv = uv;
  vPh = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const PUDDLE_FRAG = /* glsl */ `
uniform vec3 uSky; uniform float uTime; uniform float uWet; uniform float uRain;
varying vec2 vUv; varying float vPh;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float body = smoothstep(1.0, 0.55, d);
  // two staggered ripple rings, only while it is actually raining
  float r1 = fract(uTime * 0.45 + vPh), r2 = fract(uTime * 0.45 + vPh + 0.5);
  float ring = (smoothstep(0.07, 0.0, abs(d - r1 * 0.9)) * (1.0 - r1) + smoothstep(0.07, 0.0, abs(d - r2 * 0.9)) * (1.0 - r2)) * uRain;
  vec3 col = mix(uSky, vec3(1.0), 0.35 + ring * 0.55);
  float a = (body * 0.5 + ring * 0.4 * body) * uWet;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
}`;
const SHADOW_FRAG = /* glsl */ `
uniform float uOpacity; varying vec2 vUv;
void main() {
  float a = smoothstep(1.0, 0.0, length(vUv - 0.5) * 2.0) * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(0.33, 0.3, 0.5, a);
}`;
const PLAIN_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** Keeps a point cloud's sizes in world units whatever the buffer size (no allocations). */
function pointScale(this: THREE.Points, renderer: THREE.WebGLRenderer, _s: THREE.Scene, camera: THREE.Camera) {
  const h = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
  (this.material as THREE.ShaderMaterial).uniforms.uScale.value = h * 0.5 * camera.projectionMatrix.elements[5];
}

const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const PUDDLE_GROUND = new Set<number>([T.Grass, T.Path, T.Plaza, T.Lawn, T.Sand, T.Hill]);

export interface WeatherLayer {
  group: THREE.Group;
  /** Advance the particles, puddles and cloud shadows around the camera target. */
  update(t: number, target: THREE.Vector3): void;
  /** Grade the sky, fog, sun and rim light for the weather. Call after the light rig's update(). */
  grade(rig: LightRig, scene: THREE.Scene): void;
}

export function createWeatherLayer(): WeatherLayer {
  const group = new THREE.Group();

  function cloud(n: number, box: THREE.Vector3, o: { fall: number; size: number; drift: number; streak: number; color: string }) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos.set([hash(i, 1), hash(i, 2), hash(i, 3)], i * 3);
      seed.set([hash(i, 4), hash(i, 5), hash(i, 6) * 6.3, 0], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uScale: { value: 500 }, uGround: { value: 0 }, uOpacity: { value: 0 }, uBox: { value: box },
        uFall: { value: o.fall }, uSize: { value: o.size }, uDrift: { value: o.drift }, uStreak: { value: o.streak }, uColor: { value: new THREE.Color(o.color) },
      },
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false; pts.renderOrder = 6; pts.onBeforeRender = pointScale; pts.visible = false;
    group.add(pts);
    return { pts, mat };
  }
  const rain = cloud(RAIN, new THREE.Vector3(26, 12, 22), { fall: 9.5, size: 0.55, drift: 1.2, streak: 1, color: '#dcecff' });
  const snow = cloud(SNOW, new THREE.Vector3(30, 9, 26), { fall: 0.5, size: 0.17, drift: 0.2, streak: 0, color: '#ffffff' });

  // puddles: world-anchored on a hashed grid, so they stay put as the camera moves; one instanced draw
  const plane = new THREE.CircleGeometry(0.5, 20); plane.rotateX(-Math.PI / 2);
  const puddleMat = new THREE.ShaderMaterial({
    vertexShader: PUDDLE_VERT, fragmentShader: PUDDLE_FRAG, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uSky: { value: new THREE.Color('#d6ecff') }, uTime: { value: 0 }, uWet: { value: 0 }, uRain: { value: 0 } },
  });
  const puddles = new THREE.InstancedMesh(plane, puddleMat, PUDDLES);
  puddles.frustumCulled = false; puddles.renderOrder = 2; puddles.count = 0; puddles.visible = false;
  group.add(puddles);
  const dummy = new THREE.Object3D();
  let cellX = NaN, cellZ = NaN;

  // cloud shadows: very soft big blobs that drift across the island on bright / cloudy days
  const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: PLAIN_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uOpacity: { value: 0 } },
  });
  const shadows: THREE.Mesh[] = [];
  for (let i = 0; i < SHADOWS; i++) {
    const m = new THREE.Mesh(shadowGeo, shadowMat);
    m.renderOrder = 1; m.frustumCulled = false; m.visible = false;
    m.scale.set(9 + hash(i, 9) * 6, 1, 6 + hash(i, 8) * 4);
    shadows.push(m); group.add(m);
  }
  const SPAN = 44;

  const tmp = new THREE.Color();
  let night = 0; // from the light rig, for the cloud shadows
  function layoutPuddles(tx: number, tz: number) {
    let n = 0;
    const x0 = Math.floor((tx - REACH_X) / CELL), x1 = Math.floor((tx + REACH_X) / CELL);
    const z0 = Math.floor((tz - REACH_Z - 3) / CELL), z1 = Math.floor((tz + REACH_Z - 3) / CELL);
    for (let cz = z0; cz <= z1 && n < PUDDLES; cz++) {
      for (let cx = x0; cx <= x1 && n < PUDDLES; cx++) {
        if (hash(cx, cz) > 0.45) continue;
        const ux = (cx + 0.15 + hash(cx + 7, cz) * 0.7) * CELL, uz = (cz + 0.15 + hash(cx, cz + 7) * 0.7) * CELL;
        const tx2 = Math.floor(ux), tz2 = Math.floor(uz);
        // flat, open ground only: no water, buildings, or tile edges that would poke out over a neighbour
        if (!PUDDLE_GROUND.has(terrainAt(tx2, tz2)) || isSolidTile(tx2, tz2)) continue;
        const s = 0.9 + hash(cz, cx + 3) * 1.1;
        dummy.position.set(ux, heightAtUnits(ux, uz) + 0.03, uz);
        dummy.scale.set(s, 1, s * (0.7 + hash(cx + 1, cz + 1) * 0.3));
        dummy.rotation.set(0, hash(cx, cz + 5) * 3, 0);
        dummy.updateMatrix();
        puddles.setMatrixAt(n++, dummy.matrix);
      }
    }
    puddles.count = n;
    puddles.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    update(t, target) {
      const ground = heightAtUnits(target.x, target.z);
      for (const c of [rain, snow]) { c.mat.uniforms.uTime.value = t; c.mat.uniforms.uGround.value = ground; }
      rain.pts.visible = view.rain > 0.01; rain.mat.uniforms.uOpacity.value = 0.62 * view.rain;
      snow.pts.visible = view.snow > 0.01; snow.mat.uniforms.uOpacity.value = 0.9 * view.snow;

      puddles.visible = view.wet > 0.02;
      if (puddles.visible) {
        // re-lay the puddles only when the camera moves into a new grid cell
        const cx = Math.floor(target.x / 2), cz = Math.floor(target.z / 2);
        if (cx !== cellX || cz !== cellZ) { cellX = cx; cellZ = cz; layoutPuddles(target.x, target.z); }
        const u = puddleMat.uniforms;
        u.uTime.value = t; u.uWet.value = Math.min(1, view.wet * 1.1); u.uRain.value = view.rain;
      }

      // cloud shadows are a daytime thing; none in rain (the whole sky is grey anyway) or snow
      const sk = (view.over > 0 ? 1 : 0.5) * Math.max(0, 1 - view.rain * 1.2 - view.snow) * (1 - night);
      const vis = sk > 0.02;
      shadowMat.uniforms.uOpacity.value = 0.17 * sk;
      for (let i = 0; i < SHADOWS; i++) {
        const m = shadows[i]; m.visible = vis;
        if (!vis) continue;
        const sp = 0.5 + hash(i, 2) * 0.35;
        const dx = ((hash(i, 1) * SPAN + t * sp) % SPAN + SPAN) % SPAN - SPAN / 2;
        const dz = (hash(i, 3) - 0.5) * 26 - 4 + Math.sin(t * 0.07 + i) * 2;
        m.position.set(target.x + dx, ground + 0.25, target.z + dz);
      }
    },
    grade(rig, scene) {
      const oc = view.over;
      night = rig.night;
      if (oc > 0.001) {
        // a soft grey-lilac overcast: dimmer sun (so shadows soften), calmer fill, sky and fog pulled toward grey blue
        rig.sun.intensity *= 1 - 0.42 * oc;
        rig.hemi.intensity *= 1 - 0.06 * oc + 0.1 * oc * (1 - night);
        tmp.set(view.snow > 0.3 ? '#dbe2f2' : '#bfcbe2').multiplyScalar(1 - 0.62 * night);
        (scene.background as THREE.Color).lerp(tmp, 0.6 * oc);
        if (scene.fog) scene.fog.color.lerp(tmp, 0.6 * oc);
      }
      // wet sheen: wet surfaces catch a little more rim light
      shadeUniforms.uRimStrength.value += view.wet * 0.28;
      (puddleMat.uniforms.uSky.value as THREE.Color).copy(scene.background as THREE.Color).lerp(tmp.set('#ffffff'), 0.25 * (1 - night));
    },
  };
}
