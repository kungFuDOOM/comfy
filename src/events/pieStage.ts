// Shared staging for the two pie cutscenes (first-pie.ts, goldenPie.ts): a pop-up baking nook in front of the café
// (a pink toy oven with a glowing door, a gingham table, dough, a rolling pin, a pie) built from plain meshes, plus
// helpers to bring Brioche along even when her meadow is still locked. Everything lives in one group the scene adds
// and disposes itself, and the guest helper hands the cast back, so watching or skipping leaves nothing behind.
import * as THREE from 'three';
import { VILLAGERS } from '../data';
import { npcs, type Npc } from '../npc';
import { heightAtUnits } from '../render/terrain';
import { TS } from '../world';

/** Centre of the nook (tiles), in the square just south of the café counter. */
export const NOOK = { x: 41.5, z: 38.4 };
export const OVEN = { x: NOOK.x + 1.25, z: NOOK.z };
export const TABLE = { x: NOOK.x - 0.85, z: NOOK.z };
export const TABLE_TOP = 0.56;
/** Where the baker and the player stand. */
export const BAKER_SPOT = { x: NOOK.x + 0.15, z: NOOK.z - 0.95 };
export const PLAYER_POSE = { x: NOOK.x - 2.1, z: NOOK.z + 0.55 };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const backOut = (x: number) => { const t = clamp01(x) - 1, k = 2.0; return 1 + t * t * ((k + 1) * t + k); };

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o;
};

export interface PieModel {
  group: THREE.Group;
  /** Show the crust disc / the crimped edge (0..1 of the bumps) / the filling. */
  setStage(crust: number, crimp: number, filling: boolean): void;
  /** 0 pale raw dough, 1 baked brown; `golden` pushes it to a glowing gold. */
  setBake(k: number, golden?: boolean): void;
}

/** A little pie: a crust disc with a ring of crimp bumps and an orange filling. */
export function makePie(): PieModel {
  const group = new THREE.Group();
  const crustMat = std('#f1d3a0'), fillMat = std('#e58a3c'), bumpMat = std('#f1d3a0');
  const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.06, 28), crustMat); crust.position.y = 0.03;
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.03, 28), fillMat); fill.position.y = 0.07;
  const bumps = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), bumpMat);
    b.position.set(Math.cos(a) * 0.29, 0.07, Math.sin(a) * 0.29); b.visible = false; return b;
  });
  fill.visible = false; crust.visible = false;
  group.add(crust, fill, ...bumps);
  return {
    group,
    setStage(c, k, f) {
      crust.visible = c > 0.01; crust.scale.set(Math.max(0.01, c), 1, Math.max(0.01, c));
      const n = Math.round(clamp01(k) * bumps.length);
      bumps.forEach((b, i) => { b.visible = i < n; });
      fill.visible = f;
    },
    setBake(k, golden = false) {
      const raw = new THREE.Color('#f1d3a0'), done = new THREE.Color(golden ? '#f4b52e' : '#cf8a3e');
      crustMat.color.copy(raw).lerp(done, clamp01(k)); bumpMat.color.copy(crustMat.color);
      crustMat.emissive.set(golden ? '#ffb324' : '#000000').multiplyScalar(golden ? 0.45 * clamp01(k) : 0);
      fillMat.color.set('#e58a3c').lerp(new THREE.Color(golden ? '#ffc83a' : '#c9702c'), clamp01(k));
      fillMat.emissive.set(golden ? '#ffae1a' : '#000000').multiplyScalar(golden ? 0.5 * clamp01(k) : 0);
    },
  };
}

export interface Nook {
  root: THREE.Group;
  dough: THREE.Mesh;
  pin: THREE.Mesh;
  pie: PieModel;
  /** Door glow 0 (cool, off) .. 1 (hot). */
  setDoor(k: number): void;
  dispose(): void;
}

/** The pop-up bakery nook. Positions are world units (tiles); `root` sits at ground level. */
export function makeNook(): Nook {
  const root = new THREE.Group(); root.name = 'pie-nook';
  root.position.set(0, heightAtUnits(NOOK.x, NOOK.z), 0);
  // the oven
  const oven = new THREE.Group(); oven.position.set(OVEN.x, 0, OVEN.z);
  const pink = std('#f7bfd2'), cream = std('#fff1e6');
  oven.add(box(1.1, 0.8, 0.85, pink, 0, 0.45, 0), box(1.2, 0.07, 0.95, cream, 0, 0.88, 0));
  for (const [x, z] of [[-0.45, -0.34], [0.45, -0.34], [-0.45, 0.34], [0.45, 0.34]]) oven.add(box(0.09, 0.1, 0.09, std('#d98a6c'), x, 0.05, z));
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 12), std('#d98a6c')); chimney.position.set(0.36, 1.07, -0.22); oven.add(chimney);
  const doorMat = new THREE.MeshBasicMaterial({ color: '#4a2f3a' });
  oven.add(box(0.64, 0.46, 0.05, cream, 0, 0.42, 0.43));
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.03), doorMat); win.position.set(0, 0.42, 0.46); oven.add(win);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), std('#d98a6c')); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.7, 0.5); oven.add(bar);
  for (const x of [-0.3, 0, 0.3]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std('#ff7fa8')); k.position.set(x, 0.79, 0.43); oven.add(k); }
  // the table
  const table = new THREE.Group(); table.position.set(TABLE.x, 0, TABLE.z);
  const wood = std('#d9a679');
  table.add(box(1.3, 0.06, 0.8, std('#ffd6e3'), 0, TABLE_TOP - 0.03, 0), box(1.34, 0.03, 0.84, std('#ffffff'), 0, TABLE_TOP - 0.075, 0));
  for (const [x, z] of [[-0.58, -0.33], [0.58, -0.33], [-0.58, 0.33], [0.58, 0.33]]) table.add(box(0.07, TABLE_TOP - 0.09, 0.07, wood, x, (TABLE_TOP - 0.09) / 2, z));
  // gingham stripes on the cloth
  for (let i = -2; i <= 2; i++) table.add(box(0.07, 0.003, 0.8, std('#ff9fbd'), i * 0.24, TABLE_TOP + 0.002, 0));
  // dough ball, rolling pin and the pie
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std('#f6e4c4')); dough.scale.set(1, 0.7, 1); dough.position.set(TABLE.x, TABLE_TOP + 0.12, TABLE.z);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.46, 12), std('#c98f5e')); pin.rotation.z = Math.PI / 2; pin.position.set(TABLE.x + 0.45, TABLE_TOP + 0.05, TABLE.z + 0.22);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), std('#ff9fbd')); h.position.set(s * 0.26, 0, 0); pin.add(h); }
  const pie = makePie(); pie.group.position.set(TABLE.x, TABLE_TOP, TABLE.z);
  root.add(oven, table, dough, pin, pie.group);
  return {
    root, dough, pin, pie,
    setDoor(k) { doorMat.color.set('#4a2f3a').lerp(new THREE.Color('#ffb04a'), clamp01(k)); },
    dispose() {
      root.removeFromParent();
      root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
    },
  };
}

/**
 * Make sure Brioche exists in the in-memory cast for the scene (her meadow may still be locked, so she may not live on
 * the island yet). The stand-in is never saved and the returned function takes it away again.
 */
export function inviteBrioche(): () => void {
  if (npcs.some((n) => n.def.id === 'brioche')) return () => {};
  const def = VILLAGERS.find((v) => v.id === 'brioche');
  if (!def) return () => {};
  const x = BAKER_SPOT.x * TS, y = BAKER_SPOT.z * TS;
  const n: Npc = { def, x, y, tx: x, ty: y, wait: 2, facing: 'down', moving: false, busy: false };
  npcs.push(n);
  return () => { const i = npcs.indexOf(n); if (i >= 0) npcs.splice(i, 1); };
}
