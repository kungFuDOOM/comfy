// Small shared helpers for the Three.js layer.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { markOwned, registerUnlit, toon, vertexToon, type GlowKind } from './materials';

/** Cached soft-toon material from the shared palette/ramp (materials.ts). Emissive colors fade in at night. */
export function mat(color: string, emissive?: string, glow: GlowKind = 'window'): THREE.MeshToonMaterial {
  return emissive ? toon(color, { emissive, glow }) : toon(color);
}

export function mesh(geo: THREE.BufferGeometry, color: string | THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export const box = (w: number, h: number, d: number, color: string | THREE.Material, x = 0, y = 0, z = 0) =>
  mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z);
export const cyl = (rt: number, rb: number, h: number, color: string | THREE.Material, x = 0, y = 0, z = 0, seg = 16) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z);
export const ball = (r: number, color: string | THREE.Material, x = 0, y = 0, z = 0, seg = 14) =>
  mesh(new THREE.SphereGeometry(r, seg, seg - 4), color, x, y, z);

// ---- text labels (sprites drawn on a canvas, Fredoka) ----
const labels: { tex: THREE.CanvasTexture; text: string; w: number; h: number }[] = [];

function paintLabel(c: HTMLCanvasElement, text: string) {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff7fb'; g.strokeStyle = '#ffb3cf'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(6, 6, c.width - 12, c.height - 12, 28); g.fill(); g.stroke();
  g.fillStyle = '#a8456f'; g.font = '600 52px Fredoka, ui-rounded, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 3);
}

/** Stop repainting a label that was thrown away (its texture is disposed with its material). */
export function forgetLabel(tex: THREE.Texture) { const i = labels.findIndex((l) => l.tex === tex); if (i >= 0) labels.splice(i, 1); }

/** A flat sign plane facing +z (towards the camera). Width in world units. */
export function makeLabel(text: string, width: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  paintLabel(c, text);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  labels.push({ tex, text, w: c.width, h: c.height });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), markOwned(registerUnlit(new THREE.MeshBasicMaterial({ map: tex, transparent: true }))));
  return m;
}
// Repaint once the web font is ready.
document.fonts?.load('600 52px Fredoka').then(() => {
  for (const l of labels) { paintLabel(l.tex.image as HTMLCanvasElement, l.text); l.tex.needsUpdate = true; }
});

export const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

// ---- merged models: many colored primitives -> one geometry / one draw call ----
export interface Xf {
  x?: number; y?: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  /** Uniform or per-axis scale. */
  s?: number | [number, number, number];
  /** Point the geometry's +y axis along this direction (overrides rx/ry/rz). */
  dir?: [number, number, number];
  /** UV scale, for tiling textures such as the cheetah print. */
  uv?: [number, number];
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

/** Collects primitives (with a color and transform each) and merges them into a single mesh. */
export class Batch {
  private parts: THREE.BufferGeometry[] = [];
  get empty() { return this.parts.length === 0; }
  add(geo: THREE.BufferGeometry, color = '#ffffff', xf: Xf = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (xf.uv) { const uv = g.attributes.uv; for (let i = 0; i < n; i++) uv.setXY(i, uv.getX(i) * xf.uv[0], uv.getY(i) * xf.uv[1]); }
    if (xf.dir) _q.setFromUnitVectors(_up, _d.set(xf.dir[0], xf.dir[1], xf.dir[2]).normalize());
    else _q.setFromEuler(_e.set(xf.rx ?? 0, xf.ry ?? 0, xf.rz ?? 0));
    const s = xf.s ?? 1;
    if (typeof s === 'number') _s.setScalar(s); else _s.set(s[0], s[1], s[2]);
    g.applyMatrix4(_m.compose(_p.set(xf.x ?? 0, xf.y ?? 0, xf.z ?? 0), _q, _s));
    _c.set(color);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.clearGroups();
    this.parts.push(g);
    return this;
  }
  geometry(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    return merged;
  }
  /** Merge into one mesh. Default material is the shared vertex-colored toon. */
  build(material: THREE.Material = vertexToon(), shadows = true): THREE.Mesh {
    const m = new THREE.Mesh(this.geometry(), material);
    m.castShadow = m.receiveShadow = shadows;
    return m;
  }
}

/** Short geometry constructors for Batch.add. */
export const G = {
  box: (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt: number, rb: number, h: number, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg),
  ball: (r: number, seg = 12) => new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)),
  cone: (r: number, h: number, seg = 10) => new THREE.ConeGeometry(r, h, seg),
  torus: (r: number, tube: number, seg = 18, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, 8, seg, arc),
  capsule: (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 10),
  lathe: (pts: [number, number][], seg = 18) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg),
};
