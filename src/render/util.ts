// Small shared helpers for the Three.js layer.
import * as THREE from 'three';
import { registerUnlit, toon, type GlowKind } from './materials';

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

/** A flat sign plane facing +z (towards the camera). Width in world units. */
export function makeLabel(text: string, width: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  paintLabel(c, text);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  labels.push({ tex, text, w: c.width, h: c.height });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), registerUnlit(new THREE.MeshBasicMaterial({ map: tex, transparent: true })));
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
