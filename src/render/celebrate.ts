// Little celebration bursts: pastel sparkles, blossom petals, hearts and soft poof puffs.
// One pooled THREE.Points cloud (~240 points) with a tiny shape shader; it only updates while something is alive.
// Anyone can call `celebrate.burst(...)`; world3d adds `celebrate.group` to the scene and ticks `celebrate.update`.
import * as THREE from 'three';

const N = 240;
/** Point shapes drawn by the fragment shader. */
export const Shape = { Dot: 0, Heart: 1, Star: 2, Puff: 3 } as const;
export type Shape = (typeof Shape)[keyof typeof Shape];

const VERT = /* glsl */ `
attribute float aAlpha; attribute float aSize; attribute vec3 aColor; attribute float aShape; attribute float aSpin;
uniform float uScale;
varying float vA; varying vec3 vC; varying float vShape; varying float vSpin;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vA = aAlpha; vC = aColor; vShape = aShape; vSpin = aSpin;
}`;
const FRAG = /* glsl */ `
varying float vA; varying vec3 vC; varying float vShape; varying float vSpin;
void main() {
  vec2 p = (gl_PointCoord - 0.5) * 2.0;
  float c = cos(vSpin), s = sin(vSpin);
  p = mat2(c, -s, s, c) * p;
  float a;
  if (vShape < 0.5) {            // soft round petal
    a = smoothstep(1.0, 0.35, length(p * vec2(1.0, 1.5)));
  } else if (vShape < 1.5) {     // heart
    vec2 q = p * 1.25; q.y = -q.y + 0.25;
    float k = q.x * q.x + q.y * q.y - 1.0;
    a = smoothstep(0.06, -0.06, k * k * k - q.x * q.x * q.y * q.y * q.y);
  } else if (vShape < 2.5) {     // four-point twinkle star
    float d = abs(p.x) * abs(p.y);
    a = smoothstep(0.05, 0.0, d) * smoothstep(1.0, 0.2, length(p)) + smoothstep(0.35, 0.0, length(p));
  } else {                       // cloud puff
    a = smoothstep(1.0, 0.2, length(p)) * 0.85;
  }
  a = min(a, 1.0) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC, a);
}`;

export interface BurstOpts {
  count: number;
  colors: string[];
  shapes: Shape[];
  /** Horizontal spawn spread (tiles). */
  spread?: number;
  /** Outward speed and upward speed (tiles/s). */
  speed?: number;
  up?: number;
  /** Gravity (tiles/s², positive pulls down). Negative floats up. */
  gravity?: number;
  size?: [number, number];
  life?: [number, number];
  /** Delay before each particle appears, randomized in [0, stagger]. */
  stagger?: number;
}

function createCelebrate() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N), col = new Float32Array(N * 3);
  const shape = new Float32Array(N), spin = new Float32Array(N);
  const vel = new Float32Array(N * 3), age = new Float32Array(N).fill(1), life = new Float32Array(N).fill(1), base = new Float32Array(N);
  const grav = new Float32Array(N), delay = new Float32Array(N), spinV = new Float32Array(N), wob = new Float32Array(N);
  const attr = (name: string, a: Float32Array, n: number) => geo.setAttribute(name, new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage));
  attr('position', pos, 3); attr('aAlpha', alpha, 1); attr('aSize', size, 1); attr('aColor', col, 3); attr('aShape', shape, 1); attr('aSpin', spin, 1);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, uniforms: { uScale: { value: 500 } } });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 6;
  pts.visible = false;
  const group = new THREE.Group();
  group.add(pts);
  let next = 0, alive = 0;
  const c = new THREE.Color();
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  return {
    group,
    burst(at: THREE.Vector3, o: BurstOpts) {
      const spread = o.spread ?? 0.6, speed = o.speed ?? 1.6, up = o.up ?? 2.2, g = o.gravity ?? 2.4;
      const [s0, s1] = o.size ?? [0.12, 0.22], [l0, l1] = o.life ?? [0.8, 1.3];
      for (let n = 0; n < o.count; n++) {
        const i = next; next = (next + 1) % N;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread, sp = speed * rnd(0.4, 1);
        pos.set([at.x + Math.cos(a) * r, at.y + rnd(0, 0.3), at.z + Math.sin(a) * r], i * 3);
        vel.set([Math.cos(a) * sp, up * rnd(0.6, 1.15), Math.sin(a) * sp], i * 3);
        const sh = o.shapes[n % o.shapes.length];
        c.set(o.colors[(Math.random() * o.colors.length) | 0]);
        if (sh === Shape.Star) c.multiplyScalar(1.5); // a touch over white so the bloom picks the twinkles up softly
        col.set([c.r, c.g, c.b], i * 3);
        shape[i] = sh; base[i] = rnd(s0, s1); life[i] = rnd(l0, l1); age[i] = 0; grav[i] = g;
        delay[i] = rnd(0, o.stagger ?? 0); spin[i] = rnd(0, 6.28); spinV[i] = sh === Shape.Heart ? rnd(-1, 1) : rnd(-5, 5); wob[i] = rnd(0, 6.28);
        alpha[i] = 0; size[i] = 0;
      }
      alive = N; // recount on the next update
      pts.visible = true;
      geo.attributes.aColor.needsUpdate = geo.attributes.aShape.needsUpdate = true;
    },
    update(dt: number, pxScale: number) {
      if (!alive) return;
      mat.uniforms.uScale.value = pxScale;
      alive = 0;
      const drag = Math.exp(-dt * 2.2);
      for (let i = 0; i < N; i++) {
        if (age[i] >= life[i]) { alpha[i] = 0; continue; }
        alive++;
        if (delay[i] > 0) { delay[i] -= dt; alpha[i] = 0; continue; }
        age[i] += dt;
        const p = age[i] / life[i], k = i * 3;
        vel[k] *= drag; vel[k + 2] *= drag; vel[k + 1] -= grav[i] * dt;
        // petals and hearts sway as they drift; puffs slow right down
        const sway = shape[i] === Shape.Dot || shape[i] === Shape.Heart ? Math.sin(age[i] * 5 + wob[i]) * 0.5 : 0;
        if (shape[i] === Shape.Puff) vel[k + 1] *= drag;
        pos[k] += (vel[k] + sway) * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
        spin[i] += spinV[i] * dt;
        const pop = Math.min(1, p * 8); // quick pop-in
        if (shape[i] === Shape.Star) {
          alpha[i] = (1 - p) * (0.55 + 0.45 * Math.sin(age[i] * 22 + wob[i]));
          size[i] = base[i] * pop * (0.8 + 0.4 * Math.sin(age[i] * 16 + wob[i]));
        } else if (shape[i] === Shape.Puff) {
          alpha[i] = (1 - p) * (1 - p) * 0.9;
          size[i] = base[i] * (0.5 + p * 1.1);
        } else {
          alpha[i] = Math.min(1, (1 - p) * 3) * pop;
          size[i] = base[i] * pop;
        }
      }
      for (const n of ['position', 'aAlpha', 'aSize', 'aSpin']) geo.attributes[n].needsUpdate = true;
      if (!alive) pts.visible = false;
    },
  };
}

/** The shared celebration layer (one per page, like the renderer). */
export const celebrate = createCelebrate();

// ---- ready-made moments ----
const PASTEL = ['#ffb3cf', '#ffd9e8', '#fff3a8', '#c9f2e3', '#d9c9ff', '#ffffff'];
const PETALS = ['#ffb3cf', '#ffc7dc', '#ff9ec0', '#ffe3ee', '#ffffff'];

/** A barrier poofing away: a soft cloud puff, a ring of sparkles and a shower of blossom petals. */
export function poofAt(at: THREE.Vector3, width = 2) {
  celebrate.burst(at, { count: 14, colors: ['#ffffff', '#fff4f8', '#ffe9f1'], shapes: [Shape.Puff], spread: width * 0.45, speed: 1.4, up: 0.9, gravity: 0, size: [0.7, 1.15], life: [0.7, 1.0] });
  celebrate.burst(at, { count: 34, colors: PASTEL, shapes: [Shape.Star], spread: width * 0.4, speed: 2.6, up: 3.0, gravity: 3.2, size: [0.16, 0.28], life: [0.7, 1.15], stagger: 0.12 });
  celebrate.burst(at, { count: 36, colors: PETALS, shapes: [Shape.Dot, Shape.Dot, Shape.Heart], spread: width * 0.5, speed: 1.8, up: 3.4, gravity: 2.6, size: [0.12, 0.2], life: [1.0, 1.4], stagger: 0.2 });
}

/** A friend moving in: hearts and petals fountain up around them with a sprinkle of twinkles. */
export function welcomeAt(at: THREE.Vector3) {
  celebrate.burst(at, { count: 22, colors: ['#ff8fb6', '#ffb3cf', '#ff6fa3', '#ffd9e8'], shapes: [Shape.Heart], spread: 0.5, speed: 1.0, up: 2.4, gravity: 0.9, size: [0.2, 0.32], life: [1.3, 1.9], stagger: 0.35 });
  celebrate.burst(at, { count: 30, colors: PETALS, shapes: [Shape.Dot], spread: 0.8, speed: 1.6, up: 3.0, gravity: 2.0, size: [0.12, 0.2], life: [1.1, 1.6], stagger: 0.3 });
  celebrate.burst(at, { count: 22, colors: PASTEL, shapes: [Shape.Star], spread: 0.9, speed: 1.4, up: 2.2, gravity: 1.2, size: [0.14, 0.24], life: [0.8, 1.3], stagger: 0.4 });
}

/** A gentle trickle of hearts/petals rising from a new friend's home, so the welcome is still there to be found. */
export function welcomeTrickle(at: THREE.Vector3) {
  celebrate.burst(at, { count: 2, colors: ['#ff8fb6', '#ffb3cf', '#ffffff', '#fff3a8'], shapes: [Shape.Heart, Shape.Star], spread: 0.6, speed: 0.3, up: 1.1, gravity: -0.1, size: [0.14, 0.22], life: [1.4, 2.0] });
}

/** A heart gained: a small fountain of hearts and a couple of sparkles over the friend. */
export function heartsPopAt(at: THREE.Vector3) {
  celebrate.burst(at, { count: 12, colors: ['#ff8fb6', '#ffb3cf', '#ff6fa3', '#ffd9e8'], shapes: [Shape.Heart], spread: 0.35, speed: 0.9, up: 2.2, gravity: 0.9, size: [0.2, 0.3], life: [1.0, 1.5], stagger: 0.25 });
  celebrate.burst(at, { count: 8, colors: PASTEL, shapes: [Shape.Star], spread: 0.5, speed: 1.2, up: 2.0, gravity: 1.2, size: [0.12, 0.2], life: [0.8, 1.2], stagger: 0.25 });
}

/** Party confetti: streamers and stars burst up from the player, then flutter down. */
export function confettiAt(at: THREE.Vector3) {
  const cols = ['#ff9ec0', '#ffe27a', '#8fe0c0', '#c9a8ff', '#9bd4ff', '#ffffff'];
  celebrate.burst(at, { count: 90, colors: cols, shapes: [Shape.Dot, Shape.Dot, Shape.Heart], spread: 0.4, speed: 2.4, up: 5.2, gravity: 4.2, size: [0.14, 0.24], life: [1.4, 2.1], stagger: 0.25 });
  celebrate.burst(at, { count: 40, colors: cols, shapes: [Shape.Star], spread: 0.6, speed: 2.0, up: 4.2, gravity: 2.4, size: [0.16, 0.28], life: [1.0, 1.6], stagger: 0.5 });
}

/** Harvest Hush Feast: a swirl of autumn leaves, hearts and sparkles. */
export function harvestAt(at: THREE.Vector3) {
  const leaves = ['#ffb48a', '#ff9fa8', '#ffd36e', '#f6946f', '#ffc2d8'];
  celebrate.burst(at, { count: 80, colors: leaves, shapes: [Shape.Puff, Shape.Dot], spread: 1.6, speed: 2.2, up: 4.6, gravity: 2.2, size: [0.14, 0.26], life: [1.6, 2.4], stagger: 0.6 });
  celebrate.burst(at, { count: 28, colors: ['#ff8fb6', '#ffd9e8', '#ffffff'], shapes: [Shape.Heart], spread: 1.4, speed: 1.6, up: 3.8, gravity: 1.2, size: [0.2, 0.32], life: [1.4, 2.0], stagger: 0.5 });
  celebrate.burst(at, { count: 30, colors: PASTEL, shapes: [Shape.Star], spread: 1.8, speed: 1.8, up: 3.4, gravity: 1.4, size: [0.14, 0.24], life: [1.0, 1.6], stagger: 0.6 });
}

/** Twinkle Season: a soft burst of snow puffs, gold and pink stars and hearts. */
export function twinkleAt(at: THREE.Vector3) {
  celebrate.burst(at, { count: 70, colors: ['#ffffff', '#fff3d6', '#ffe9f1'], shapes: [Shape.Puff, Shape.Dot], spread: 1.7, speed: 1.8, up: 4.2, gravity: 1.3, size: [0.14, 0.26], life: [1.8, 2.6], stagger: 0.6 });
  celebrate.burst(at, { count: 36, colors: ['#ffe27a', '#ffb3cf', '#a8f0d0', '#ffffff'], shapes: [Shape.Star], spread: 1.8, speed: 1.8, up: 3.6, gravity: 1.0, size: [0.16, 0.28], life: [1.4, 2.0], stagger: 0.6 });
  celebrate.burst(at, { count: 20, colors: ['#ff8fb6', '#ffd9e8'], shapes: [Shape.Heart], spread: 1.4, speed: 1.5, up: 3.4, gravity: 1.0, size: [0.2, 0.3], life: [1.4, 2.0], stagger: 0.5 });
}

/** Petting the pet companion: a small bubble of hearts and a twinkle or two. */
export function petHeartsAt(at: THREE.Vector3) {
  celebrate.burst(at, { count: 9, colors: ['#ff8fb6', '#ffb3cf', '#ff6fa3', '#ffd9e8'], shapes: [Shape.Heart], spread: 0.25, speed: 0.5, up: 1.9, gravity: -0.2, size: [0.2, 0.3], life: [1.0, 1.5], stagger: 0.35 });
  celebrate.burst(at, { count: 6, colors: ['#fff3a8', '#ffffff'], shapes: [Shape.Star], spread: 0.35, speed: 0.7, up: 1.6, gravity: 0.4, size: [0.12, 0.2], life: [0.7, 1.0], stagger: 0.2 });
}
