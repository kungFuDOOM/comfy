// Shared "soft toy" look: one palette, one toon ramp, one rim/grounding shader patch.
// Everything lit in the world (terrain, buildings, props, placeholders, future characters) should get its
// material from here so the day/night rig in lighting.ts can drive the whole scene consistently.
import * as THREE from 'three';

/** Core pastel palette. Prefer these over ad-hoc hex values in new art. */
export const PALETTE = {
  pink: '#ff9ec0', rose: '#ff8fb6', blush: '#ffc9dc', petal: '#ffe3ee',
  mint: '#9fe3c6', mintSoft: '#c8f0dc', leaf: '#8fe0a0',
  cream: '#fff4e6', milk: '#ffffff', peach: '#ffc7a6', coral: '#ffab94',
  sky: '#aee2f5', water: '#96daf0', seabed: '#d4f0f2',
  gold: '#ffd36e', honey: '#f2b765', wood: '#d4a283', cocoa: '#a8456f', ink: '#7a3b58',
  lampGlow: '#ffd98a', windowGlow: '#ffcf80',
} as const;

// ---- toon ramp: three soft tones (shade / mid / lit) with wide feathered steps, not hard cel bands ----
function makeRamp(): THREE.DataTexture {
  const n = 128, data = new Uint8Array(n * 4);
  const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < n; i++) {
    const ndl = (i / (n - 1)) * 2 - 1;
    const v = 0.6 * ss(-0.12, 0.2, ndl) + 0.4 * ss(0.38, 0.7, ndl);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.round(v * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
export const toonRamp = makeRamp();

/** Scene-wide shading uniforms, written by the lighting rig every frame. */
export const shadeUniforms = {
  uRimColor: { value: new THREE.Color('#ffffff') },
  uRimStrength: { value: 0.35 },
  /** Multiplied into the base of objects where they meet the ground (cheap AO-like grounding). */
  uAoTint: { value: new THREE.Color(0.8, 0.77, 0.8) },
};

function patchToon(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }) {
  Object.assign(shader.uniforms, shadeUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vToyY;')
    .replace('#include <project_vertex>', `#include <project_vertex>
      vec4 toyWP = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        toyWP = instanceMatrix * toyWP;
      #endif
      vToyY = ( modelMatrix * toyWP ).y;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vToyY;\nuniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform vec3 uAoTint;')
    .replace('#include <opaque_fragment>', `
      vec3 toyLit = outgoingLight - totalEmissiveRadiance;
      float toyUp = dot( normal, normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) );
      #ifdef TOY_AO
        // darken side faces near the ground; up-facing faces (rugs, table tops) stay clean
        float toyAo = max( smoothstep( 0.02, 0.8, vToyY ), smoothstep( 0.35, 0.9, toyUp ) );
        toyLit *= mix( uAoTint, vec3( 1.0 ), toyAo );
      #endif
      #ifdef TOY_RIM
        // sky-facing fresnel sheen, screen-blended so it can never push a surface into the bloom range
        float toyF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
        float toyRim = pow( toyF, 2.6 ) * ( 0.3 + 0.7 * saturate( toyUp * 0.5 + 0.5 ) );
        toyLit += uRimColor * ( toyRim * uRimStrength ) * max( vec3( 0.0 ), 1.0 - toyLit );
      #endif
      outgoingLight = toyLit + totalEmissiveRadiance;
      #include <opaque_fragment>`);
}

export type GlowKind = 'window' | 'lamp';
export interface ToonOpts {
  /** Emissive color that fades in at night. */
  emissive?: string;
  /** 'lamp' goes HDR at night (the only thing bloom picks up); 'window' stays a soft warm fill. Default 'window'. */
  glow?: GlowKind;
  /** Ground-like surface: no rim sheen and no base darkening (terrain, water). */
  ground?: boolean;
  flatShading?: boolean;
  transparent?: boolean;
  opacity?: number;
}

/** Materials that respond to the night factor. */
const glowMats: { m: THREE.MeshToonMaterial; kind: GlowKind }[] = [];
const poolMats: { m: THREE.MeshBasicMaterial; base: number }[] = [];
const unlitMats: THREE.MeshBasicMaterial[] = [];

/** Uncached toon material; use when the color is animated or per-instance (instanceColor). */
export function makeToon(color: string, o: ToonOpts = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, transparent: o.transparent ?? false, opacity: o.opacity ?? 1 });
  if (o.flatShading) (m as unknown as { flatShading: boolean }).flatShading = true;
  m.defines = o.ground ? {} : { TOY_AO: '', TOY_RIM: '' };
  m.onBeforeCompile = patchToon;
  if (o.emissive) {
    m.emissive = new THREE.Color(o.emissive);
    m.emissiveIntensity = 0;
    glowMats.push({ m, kind: o.glow ?? 'window' });
  }
  return m;
}

const cache = new Map<string, THREE.MeshToonMaterial>();
/** Cached shared toon material. This is the default material for everything solid in the world. */
export function toon(color: string, o: ToonOpts = {}): THREE.MeshToonMaterial {
  const key = [color, o.emissive ?? '', o.glow ?? '', o.ground ? 'g' : '', o.flatShading ? 'f' : '', o.transparent ? o.opacity : ''].join('|');
  let m = cache.get(key);
  if (!m) { m = makeToon(color, o); cache.set(key, m); }
  return m;
}

/** Register an unlit (MeshBasic) material such as a sign label so it dims with the ambient light at night. */
export function registerUnlit<T extends THREE.MeshBasicMaterial>(m: T): T { unlitMats.push(m); return m; }

// ---- grounding decals: soft dark contact patches + warm additive light pools ----
function softTexture(shape: 'round' | 'rect'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  // alphaMap samples the green channel, so paint white-on-black rather than relying on canvas alpha
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  if (shape === 'round') {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.62)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  } else {
    // blurred rounded rect via shadowBlur (ctx.filter is not available everywhere)
    g.shadowColor = '#fff'; g.shadowBlur = 20; g.shadowOffsetX = 256; g.fillStyle = '#fff';
    g.beginPath(); g.roundRect(26 - 256, 26, 76, 76, 12); g.fill();
  }
  return new THREE.CanvasTexture(c);
}
let roundTex: THREE.CanvasTexture | null = null, rectTex: THREE.CanvasTexture | null = null;
const softTex = (shape: 'round' | 'rect') => shape === 'round' ? (roundTex ??= softTexture('round')) : (rectTex ??= softTexture('rect'));

const decalMats = new Map<string, THREE.MeshBasicMaterial>();
/** Shared material for contact-shadow decals (also usable on an InstancedMesh). */
export function contactMaterial(shape: 'round' | 'rect' = 'round', opacity = 0.26): THREE.MeshBasicMaterial {
  const key = shape + opacity;
  let m = decalMats.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: '#4b3a5e', alphaMap: softTex(shape), transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    decalMats.set(key, m);
  }
  return m;
}

const decalGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
export const contactGeometry = decalGeo;

/** Soft dark patch under an object so it sits on the ground instead of floating. Size in tile units. */
export function contactShadow(w: number, d = w, shape: 'round' | 'rect' = 'round', opacity = 0.26): THREE.Mesh {
  const m = new THREE.Mesh(decalGeo, contactMaterial(shape, opacity));
  m.scale.set(w, 1, d);
  m.position.y = 0.025;
  m.renderOrder = 1;
  return m;
}

/** Warm additive pool of light on the ground; fades in with the night factor. */
export function lightPool(w: number, d = w, color: string = PALETTE.lampGlow, strength = 0.5, shape: 'round' | 'rect' = 'round'): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, alphaMap: softTex(shape), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  poolMats.push({ m: mat, base: strength });
  const m = new THREE.Mesh(decalGeo, mat);
  m.scale.set(w, 1, d);
  m.position.y = 0.035;
  m.renderOrder = 2;
  return m;
}

/** HDR emissive strength of 'lamp' materials at full night. Bloom threshold sits below this and above any lit surface. */
export const LAMP_HDR = 3.4;

/** Called by the lighting rig. night: 0 day .. 1 deep night. ambient: color unlit materials should take. */
export function applyNightToMaterials(night: number, ambient: THREE.Color) {
  const e = night * night * (3 - 2 * night);
  for (const g of glowMats) g.m.emissiveIntensity = g.kind === 'lamp' ? e * LAMP_HDR : e * 0.95;
  for (const p of poolMats) { p.m.opacity = e * p.base; p.m.visible = e > 0.01; }
  for (const u of unlitMats) u.color.copy(ambient);
}

// ---- procedural cheetah print (canvas, tileable) ----
export type CheetahKind = 'classic' | 'pink';
const CHEETAH_INK: Record<CheetahKind, { base: string; mid: string; spot: string }> = {
  classic: { base: '#f6d49c', mid: '#dc9e5a', spot: '#70463a' },
  pink: { base: '#ffc6dc', mid: '#ff8fb6', spot: '#93406a' },
};
const cheetahTex = new Map<CheetahKind, THREE.CanvasTexture>();

/** Tileable cheetah-spot texture: soft centre blotch ringed by broken dark arcs. One UV tile reads well at ~0.9 world units. */
export function cheetahTexture(kind: CheetahKind): THREE.CanvasTexture {
  let tex = cheetahTex.get(kind);
  if (tex) return tex;
  const S = 256, ink = CHEETAH_INK[kind];
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = ink.base; g.fillRect(0, 0, S, S);
  let seed = kind === 'classic' ? 1337 : 4242;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const torus = (a: number, b: number) => { const d = Math.abs(a - b); return Math.min(d, S - d); };
  const pts: { x: number; y: number; r: number }[] = [];
  const free = (x: number, y: number, gap: number) => pts.every((p) => Math.hypot(torus(p.x, x), torus(p.y, y)) > gap + p.r);
  const wrapped = (x: number, y: number, draw: () => void) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(x + ox, y + oy); draw(); g.restore(); }
  };
  g.lineCap = 'round';
  for (let tries = 0; tries < 900 && pts.length < 24; tries++) {
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 6;
    if (!free(x, y, r + 9)) continue;
    pts.push({ x, y, r });
    const rot = rnd() * Math.PI, n = rnd() < 0.5 ? 2 : 3, start = rnd() * Math.PI * 2;
    const len = n === 2 ? 2.0 : 1.25, sx = 0.85 + rnd() * 0.2, sy = 0.62 + rnd() * 0.16, lw = r * (0.36 + rnd() * 0.1);
    wrapped(x, y, () => {
      g.rotate(rot);
      g.fillStyle = ink.mid;
      g.beginPath(); g.ellipse(0, 0, r * sx * 0.72, r * sy * 0.72, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = ink.spot; g.lineWidth = lw;
      for (let i = 0; i < n; i++) {
        const a0 = start + (i * Math.PI * 2) / n;
        g.beginPath(); g.ellipse(0, 0, r * sx, r * sy, 0, a0, a0 + len); g.stroke();
      }
    });
  }
  // small solid freckles between the rosettes
  for (let tries = 0, made = 0; tries < 600 && made < 16; tries++) {
    const x = rnd() * S, y = rnd() * S, r = 3 + rnd() * 2.5;
    if (!free(x, y, r + 5)) continue;
    pts.push({ x, y, r }); made++;
    wrapped(x, y, () => { g.fillStyle = ink.spot; g.beginPath(); g.ellipse(0, 0, r * 1.25, r, rnd() * 3, 0, Math.PI * 2); g.fill(); });
  }
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cheetahTex.set(kind, tex);
  return tex;
}

const cheetahMats = new Map<CheetahKind, THREE.MeshToonMaterial>();
/** Shared toon material carrying the cheetah print. Scale the geometry's UVs to set spot size. */
export function cheetahToon(kind: CheetahKind): THREE.MeshToonMaterial {
  let m = cheetahMats.get(kind);
  if (!m) { m = makeToon('#ffffff'); m.map = cheetahTexture(kind); cheetahMats.set(kind, m); }
  return m;
}

const vertexMats = new Map<string, THREE.MeshToonMaterial>();
/** Shared white toon material tinted by per-vertex colors: lets a whole merged model be one draw call. */
export function vertexToon(emissive?: string, glow: GlowKind = 'window'): THREE.MeshToonMaterial {
  const key = (emissive ?? '') + '|' + glow;
  let m = vertexMats.get(key);
  if (!m) { m = makeToon('#ffffff', emissive ? { emissive, glow } : {}); m.vertexColors = true; vertexMats.set(key, m); }
  return m;
}
