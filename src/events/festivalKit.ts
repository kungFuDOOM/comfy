// Shared bits for the four small seasonal festivals (petalpicnic, shoredays, costumenight, warmcup). Each festival is
// a short window with one main activity, so this stays tiny: once-a-day spots and a few cheap 3D dressing helpers.
//
// QA preview (same for all four, see events.ts):
//   ?event=petalpicnic | shoredays | costumenight | warmcup    forces the festival on, peak day is "today"
//   ?event=<id>&date=YYYY-MM-DD                                a regular day inside the window (?date= wins)
import * as THREE from 'three';
import { bus } from '../bus';
import { player, tileOf } from '../player';
import { TS, setDynamicBlock } from '../world';
import { eventDay, eventFlag, isEventActive, setEventFlag } from '../events';
import { lightPool } from '../render/materials';
import { heightAtUnits } from '../render/terrain';
import { ball, box, cyl, makeLabel, mat } from '../render/util';

/** Local calendar day as 'YYYY-MM-DD' (follows ?date= / ?event=). */
export function dayStamp(): string {
  const d = eventDay();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** True the first time it is asked today for this key (while the event is on), and remembers it in the event flags. */
export function firstTodayFor(eventId: string, key: string): boolean {
  if (!isEventActive(eventId)) return false;
  const flag = `${key}@${dayStamp()}`;
  if (eventFlag(eventId, flag)) return false;
  setEventFlag(eventId, flag);
  return true;
}
/** Has this key already been done today? (Read only.) */
export const doneToday = (eventId: string, key: string) => eventFlag(eventId, `${key}@${dayStamp()}`);

// ---------- 3D dressing ----------
export const ground = (x: number, z: number) => heightAtUnits(x, z);

export function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
export const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length];

export function newRoot(name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

/** A flat-ish scatter of tiny petals / leaves / confetti on the ground, one instanced mesh with per-instance colour. */
export function scatter(root: THREE.Group, spots: { x: number; z: number; rad: number; n: number }[], colors: readonly string[], seed: number, size = 0.1): void {
  const total = spots.reduce((a, s) => a + s.n, 0);
  if (total <= 0) return;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 6, 4), mat('#ffffff'), total);
  const r = rng(seed), d = new THREE.Object3D(), c = new THREE.Color();
  let i = 0;
  for (const s of spots) for (let k = 0; k < s.n; k++) {
    const a = r() * 6.3, dist = Math.sqrt(r()) * s.rad, x = s.x + Math.cos(a) * dist, z = s.z + Math.sin(a) * dist;
    d.position.set(x, ground(x, z) + 0.03, z);
    d.rotation.set((r() - 0.5) * 0.4, r() * 6.3, (r() - 0.5) * 0.4);
    d.scale.set(size * (0.8 + r() * 0.5), size * 0.22, size * (0.55 + r() * 0.3));
    d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); mesh.setColorAt(i, c.set(pick(r, colors))); i++;
  }
  mesh.frustumCulled = false;
  root.add(mesh);
}

/** A sagging string between two lamp posts, hung with small round bunting beads (never an undefined child). */
export function bunting(root: THREE.Group, a: { x: number; z: number }, b: { x: number; z: number }, y: number, sag: number, colors: readonly string[], seed: number, glow?: string): void {
  const r = rng(seed);
  const n = Math.max(5, Math.round(Math.hypot(b.x - a.x, b.z - a.z) * 1.6));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t + 0.5, z = a.z + (b.z - a.z) * t + 0.5;
    pts.push(new THREE.Vector3(x, ground(x, z) + y - sag * 4 * t * (1 - t), z));
  }
  root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.012, 5), mat('#d9b9a8')));
  for (let i = 1; i < n; i++) {
    const p = pts[i];
    const bead = ball(0.07 + r() * 0.025, glow ? mat(pick(r, colors), glow, 'lamp') : pick(r, colors), p.x, p.y - 0.06, p.z, 8);
    bead.scale.y = 1.2;
    root.add(bead);
  }
}

/** A flat picnic blanket with a checked border, a basket and a few treats. */
export function blanket(root: THREE.Group, x: number, z: number, ry: number, base: string, stripe: string): void {
  const g = new THREE.Group();
  g.add(box(1.5, 0.03, 1.15, base, 0, 0.02, 0));
  for (const o of [-0.34, 0, 0.34]) g.add(box(1.5, 0.034, 0.1, stripe, 0, 0.024, o));
  for (const o of [-0.5, 0, 0.5]) g.add(box(0.1, 0.036, 1.15, stripe, o, 0.026, 0));
  const bsk = cyl(0.17, 0.14, 0.15, '#f3d4a8', 0.3, 0.11, 0.05, 12); g.add(bsk);
  const lid = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 14, Math.PI), mat('#c98f5f')); lid.position.set(0.3, 0.19, 0.05); g.add(lid);
  g.add(ball(0.06, '#ff9ec0', -0.3, 0.07, -0.1, 8)); g.add(ball(0.05, '#fff3a8', -0.18, 0.06, 0.15, 8));
  g.add(cyl(0.05, 0.05, 0.02, '#ffffff', -0.35, 0.045, 0.2, 10));
  g.position.set(x, ground(x, z), z); g.rotation.y = ry;
  root.add(g);
}

/** A small market stall: two posts, a striped awning and a counter. Used by the summer lemonade stand and the winter market. */
export function stall(root: THREE.Group, x: number, z: number, stripeA: string, stripeB: string, top: string): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.8, 0.55, 0.5, '#ecc49c', 0, 0.3, 0)); g.add(box(1.9, 0.05, 0.6, '#fff7ee', 0, 0.6, 0));
  for (const sx of [-0.85, 0.85]) g.add(cyl(0.03, 0.04, 1.35, '#dba983', sx, 0.7, -0.2, 8));
  for (let i = 0; i < 6; i++) g.add(box(0.32, 0.04, 0.8, i % 2 ? stripeA : stripeB, -0.8 + i * 0.32, 1.38 - Math.abs(2.5 - i) * 0.0, -0.05));
  for (let i = 0; i < 6; i++) g.add(ball(0.06, i % 2 ? stripeA : stripeB, -0.8 + i * 0.32, 1.33, 0.36, 6));
  g.add(ball(0.09, top, 0, 1.47, -0.05, 8));
  g.position.set(x, ground(x, z), z);
  root.add(g);
  return g;
}

/** A hanging title board above the festival's corner. */
export function titleSign(root: THREE.Group, text: string, x: number, z: number, y: number): void {
  const s = makeLabel(text, 1.9);
  s.position.set(x, ground(x, z) + y, z);
  root.add(s);
}

/** A soft pool of colour on the ground (swells with no animation here: cheap). */
export function glowPool(root: THREE.Group, x: number, z: number, w: number, color: string, strength: number): void {
  const p = lightPool(w, w, color, strength);
  p.position.set(x, ground(x, z) + 0.04, z);
  root.add(p);
}

/**
 * Keep these tiles solid while the event is on (a stall counter), and give anyone standing there a gentle nudge to
 * (nudgeX, nudgeY) in tile units when it appears. Call once at module load.
 */
export function blockTilesWhileActive(eventId: string, tiles: { x: number; y: number }[], nudge: { x: number; y: number }): () => void {
  let up = false;
  const sync = () => {
    const want = isEventActive(eventId);
    if (want === up) return;
    up = want;
    for (const t of tiles) setDynamicBlock(t.x, t.y, want);
    const me = tileOf();
    if (want && tiles.some((t) => t.x === me.x && t.y === me.y)) { player.x = nudge.x * TS; player.y = nudge.y * TS; }
  };
  bus.on('eventsChanged', sync);
  return sync;
}
