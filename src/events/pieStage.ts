// Shared staging for the two pie cutscenes (firstPie.ts, goldenPie.ts): a pop-up baking nook in front of the café
// (a pink toy oven whose door drops open and whose window shows the pie baking, a gingham table, dough, a rolling pin,
// a crock of filling, a pie, and puffs of flour and steam) built from plain meshes, plus
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
  /** Show the crust disc / the crimped edge (0..1 of the bumps, each boings in) / the filling (0..1, it plops in). */
  setStage(crust: number, crimp: number, filling: number): void;
  /** 0 pale raw dough, 1 baked brown; `golden` pushes it to gold, `glow` scales the golden shine (default 1). */
  setBake(k: number, golden?: boolean, glow?: number): void;
}

const RAW = new THREE.Color('#f1d3a0'), BROWN = new THREE.Color('#cf8a3e'), GOLD = new THREE.Color('#f4b52e');
const FILL_RAW = new THREE.Color('#e58a3c'), FILL_BAKED = new THREE.Color('#c9702c'), FILL_GOLD = new THREE.Color('#ffc83a');
const SHINE = new THREE.Color('#ffb324'), FILL_SHINE = new THREE.Color('#ffae1a');

/** A little pie: a crust disc with a ring of crimp bumps and an orange filling. */
export function makePie(): PieModel {
  const group = new THREE.Group();
  const crustMat = std('#f1d3a0'), fillMat = std('#e58a3c'), bumpMat = std('#f1d3a0');
  const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.06, 28), crustMat); crust.position.y = 0.03;
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.03, 28), fillMat); fill.position.y = 0.07;
  const bumpGeo = new THREE.SphereGeometry(0.036, 8, 6);
  const bumps = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2, b = new THREE.Mesh(bumpGeo, bumpMat);
    b.position.set(Math.cos(a) * 0.29, 0.07, Math.sin(a) * 0.29); b.visible = false; return b;
  });
  // three little steam vents cut in the top, shown once it is filled
  const ventMat = std('#b85f22');
  const vents = [-0.08, 0, 0.08].map((x, i) => { const v = box(0.02, 0.006, 0.07, ventMat, x, 0.087, 0); v.rotation.y = (i - 1) * 0.5; v.visible = false; return v; });
  fill.visible = false; crust.visible = false;
  group.add(crust, fill, ...bumps, ...vents);
  return {
    group,
    setStage(c, k, f) {
      crust.visible = c > 0.01; crust.scale.set(Math.max(0.01, c), 1, Math.max(0.01, c));
      const n = clamp01(k) * bumps.length;
      bumps.forEach((b, i) => { const p = clamp01((n - i) * 1.6); b.visible = p > 0.01; b.scale.setScalar(Math.max(0.01, backOut(p))); });
      fill.visible = f > 0.01;
      const fp = backOut(f);
      fill.scale.set(Math.max(0.01, fp), Math.max(0.01, 0.4 + 0.6 * fp), Math.max(0.01, fp));
      fill.position.y = 0.07 + 0.08 * (1 - smooth(f)); // drops in from a spoon's height
      vents.forEach((v) => { v.visible = f >= 1; });
    },
    setBake(k, golden = false, glow = 1) {
      const t = clamp01(k);
      crustMat.color.copy(RAW).lerp(golden ? GOLD : BROWN, t); bumpMat.color.copy(crustMat.color);
      fillMat.color.copy(FILL_RAW).lerp(golden ? FILL_GOLD : FILL_BAKED, t);
      if (golden) { crustMat.emissive.copy(SHINE).multiplyScalar(0.45 * t * glow); fillMat.emissive.copy(FILL_SHINE).multiplyScalar(0.5 * t * glow); }
      else { crustMat.emissive.setRGB(0, 0, 0); fillMat.emissive.setRGB(0, 0, 0); }
    },
  };
}

/** Soft little puffs (flour, steam): a fixed pool of spheres, each born at a time and drifting until it fades. */
export interface Puffs {
  group: THREE.Group;
  /** Release `n` puffs at a point (root-local units). `spread` = sideways speed, `rise` = upward speed, `life` s. */
  emit(t: number, x: number, y: number, z: number, n: number, o?: { spread?: number; rise?: number; life?: number; size?: number }): void;
  update(t: number): void;
}

export function makePuffs(color: string, count = 28): Puffs {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.05, 8, 6);
  const ps = Array.from({ length: count }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.renderOrder = 5; group.add(m);
    return { m, born: -1, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1, sway: 0 };
  });
  let next = 0;
  return {
    group,
    emit(t, x, y, z, n, o = {}) {
      const spread = o.spread ?? 0.25, rise = o.rise ?? 0.3, life = o.life ?? 1.2, size = o.size ?? 1;
      for (let i = 0; i < n; i++) {
        const p = ps[next]; next = (next + 1) % ps.length;
        const a = Math.random() * Math.PI * 2, r = spread * (0.5 + Math.random() * 0.5);
        Object.assign(p, { born: t, life: life * (0.75 + Math.random() * 0.5), x, y, z, vx: Math.cos(a) * r, vz: Math.sin(a) * r, vy: rise * (0.7 + Math.random() * 0.6), size: size * (0.7 + Math.random() * 0.6), sway: Math.random() * 6 });
      }
    },
    update(t) {
      for (const p of ps) {
        const age = t - p.born;
        if (p.born < 0 || age < 0 || age > p.life) { p.m.visible = false; continue; }
        const k = age / p.life, slow = 1 - Math.exp(-age * 2.2); // drift out quickly, then hang and fade
        p.m.visible = true;
        p.m.position.set(p.x + p.vx * slow * 0.45 + Math.sin(p.sway + age * 3) * 0.02 * k, p.y + p.vy * age, p.z + p.vz * slow * 0.45);
        p.m.scale.setScalar(p.size * (0.5 + 1.1 * smooth(k * 1.5)));
        (p.m.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k) * smooth(age / 0.12);
      }
    },
  };
}

export interface Nook {
  root: THREE.Group;
  dough: THREE.Mesh;
  pin: THREE.Mesh;
  pie: PieModel;
  flour: Puffs;
  steam: Puffs;
  /** Where the pie sits behind the oven glass (root-local). */
  inside: { x: number; y: number; z: number };
  /** Heat 0 (cool, off) .. 1 (hot): the window, the cavity behind it and the knobs glow. */
  setDoor(k: number): void;
  /** Door hinge 0 shut .. 1 dropped open toward the camera. */
  setDoorOpen(k: number): void;
  /** A springy squash of the whole oven (the timer's ding); 0 = at rest. */
  setOvenSquash(v: number): void;
  dispose(): void;
}

/** The pop-up bakery nook. Positions are world units (tiles); `root` sits at ground level. */
export function makeNook(): Nook {
  const root = new THREE.Group(); root.name = 'pie-nook';
  root.position.set(0, heightAtUnits(NOOK.x, NOOK.z), 0);
  // the oven (a pink toy oven with a little door that drops open, a window you can peek through and a chimney)
  const oven = new THREE.Group(); oven.position.set(OVEN.x, 0, OVEN.z);
  const pink = std('#f7bfd2'), cream = std('#fff1e6'), clay = std('#d98a6c');
  oven.add(box(1.1, 0.8, 0.85, pink, 0, 0.45, 0), box(1.2, 0.07, 0.95, cream, 0, 0.88, 0));
  for (const [x, z] of [[-0.45, -0.34], [0.45, -0.34], [-0.45, 0.34], [0.45, 0.34]]) oven.add(box(0.09, 0.1, 0.09, clay, x, 0.05, z));
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 12), clay); chimney.position.set(0.36, 1.07, -0.22); oven.add(chimney);
  // a tiny heart on the oven's cheek
  const heart = new THREE.Group();
  const heartMat = std('#ff7fa8');
  for (const s of [-1, 1]) { const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), heartMat); lobe.position.set(s * 0.028, 0.02, 0); heart.add(lobe); }
  const tip = box(0.05, 0.05, 0.02, heartMat, 0, -0.012, 0); tip.rotation.z = Math.PI / 4; heart.add(tip);
  heart.position.set(-0.56, 0.62, 0.2); heart.rotation.y = -Math.PI / 2; oven.add(heart);
  // the cavity behind the door: dark when cold, a warm orange when hot
  const cavityMat = new THREE.MeshBasicMaterial({ color: '#4a2f3a' });
  const cavity = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), cavityMat); cavity.position.set(0, 0.42, 0.427); oven.add(cavity);
  // the door, hinged along its bottom edge: a cream frame round a window of tinted glass, and a handle
  const door = new THREE.Group(); door.position.set(0, 0.19, 0.49); oven.add(door);
  door.add(box(0.07, 0.46, 0.04, cream, -0.285, 0.23, 0), box(0.07, 0.46, 0.04, cream, 0.285, 0.23, 0), box(0.5, 0.06, 0.04, cream, 0, 0.43, 0), box(0.5, 0.06, 0.04, cream, 0, 0.03, 0));
  const glassMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.18, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), glassMat); glass.position.set(0, 0.23, 0.005); glass.renderOrder = 4; door.add(glass);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8), clay); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.43, 0.05); door.add(bar);
  // three pink knobs that glow while the oven is hot
  const knobMat = std('#ff7fa8');
  for (const x of [-0.3, 0, 0.3]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), knobMat); k.position.set(x, 0.79, 0.43); oven.add(k); }
  // the table
  const table = new THREE.Group(); table.position.set(TABLE.x, 0, TABLE.z);
  const wood = std('#d9a679');
  table.add(box(1.3, 0.06, 0.8, std('#ffd6e3'), 0, TABLE_TOP - 0.03, 0), box(1.34, 0.03, 0.84, std('#ffffff'), 0, TABLE_TOP - 0.075, 0));
  for (const [x, z] of [[-0.58, -0.33], [0.58, -0.33], [-0.58, 0.33], [0.58, 0.33]]) table.add(box(0.07, TABLE_TOP - 0.09, 0.07, wood, x, (TABLE_TOP - 0.09) / 2, z));
  // gingham stripes on the cloth
  const stripe = std('#ff9fbd');
  for (let i = -2; i <= 2; i++) table.add(box(0.07, 0.003, 0.8, stripe, i * 0.24, TABLE_TOP + 0.002, 0));
  // a little crock of filling with a wooden spoon, and a dusting of flour
  const crock = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 14), std('#9fd3c7')); crock.position.set(-0.45, TABLE_TOP + 0.06, -0.2);
  const jam = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 14), std('#e58a3c')); jam.position.y = 0.06; crock.add(jam);
  const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), wood); spoon.position.set(0.03, 0.1, 0); spoon.rotation.z = -0.4; crock.add(spoon);
  const dust = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18), std('#fffaf0')); dust.rotation.x = -Math.PI / 2; dust.position.set(0, TABLE_TOP + 0.004, 0.02);
  table.add(crock, dust);
  // dough ball, rolling pin and the pie
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std('#f6e4c4')); dough.scale.set(1, 0.7, 1); dough.position.set(TABLE.x, TABLE_TOP + 0.12, TABLE.z);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.46, 12), std('#c98f5e')); pin.rotation.z = Math.PI / 2; pin.position.set(TABLE.x + 0.45, TABLE_TOP + 0.05, TABLE.z + 0.22);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), stripe); h.position.set(0, s * 0.26, 0); pin.add(h); }
  const pie = makePie(); pie.group.position.set(TABLE.x, TABLE_TOP, TABLE.z);
  const flour = makePuffs('#fffaf0'), steam = makePuffs('#fff6ee', 36);
  root.add(oven, table, dough, pin, pie.group, flour.group, steam.group);
  const heatCold = new THREE.Color('#4a2f3a'), heatHot = new THREE.Color('#ffb04a'), knobOff = new THREE.Color('#000000'), knobOn = new THREE.Color('#ff4f8a');
  const nook: Nook = {
    root, dough, pin, pie, flour, steam,
    inside: { x: OVEN.x, y: 0.42, z: OVEN.z + 0.44 },
    setDoor(k) {
      const t = clamp01(k);
      cavityMat.color.copy(heatCold).lerp(heatHot, t);
      glassMat.opacity = 0.14 + 0.3 * t;
      knobMat.emissive.copy(knobOff).lerp(knobOn, 0.6 * t);
    },
    setDoorOpen(k) { door.rotation.x = 1.45 * smooth(k); },
    setOvenSquash(v) { oven.scale.set(1 - 0.5 * v, 1 + v, 1 - 0.5 * v); },
    dispose() {
      root.removeFromParent();
      const geos = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>();
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) { geos.add(m.geometry); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x)); }
        else if ((o as THREE.Sprite).isSprite) mats.add((o as THREE.Sprite).material); // sprites share one geometry: leave it be
      });
      geos.forEach((g) => g.dispose()); mats.forEach((x) => x.dispose());
    },
  };
  nook.setDoor(0);
  return nook;
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
