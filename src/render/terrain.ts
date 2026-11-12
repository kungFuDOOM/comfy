// Ground: one instanced box per land tile, plus a big water plane. Heights are tiny so walking feels flat.
import * as THREE from 'three';
import { hash } from '../art/draw';
import type { Season } from '../time';
import { MAP_H, MAP_W, shoreDist, T, terrainAt } from '../world';
import { makeToon, PALETTE, toon } from './materials';

const HEIGHT: Record<number, number> = { [T.Water]: -0.4, [T.Sand]: 0, [T.Grass]: 0.05, [T.Path]: 0.08, [T.Hill]: 0.35, [T.Soil]: 0.04, [T.Lawn]: 0.07, [T.Plaza]: 0.1 };
/** Sand dips gently toward the sea: waterline tiles sit lowest, the damp band a touch higher, dry sand at 0. */
const SAND_DIP = [0, -0.08, -0.04];
export const tileHeight = (tx: number, ty: number) => {
  const t = terrainAt(tx, ty);
  return t === T.Sand ? SAND_DIP[shoreDist(tx, ty)] ?? 0 : HEIGHT[t] ?? 0;
};
/** Ground height at a world-pixel/TS position (tile units). */
export const heightAtUnits = (ux: number, uz: number) => tileHeight(Math.floor(ux), Math.floor(uz - 0.12));

function tileColor(t: number, x: number, y: number, s: Season): string {
  const alt = hash(x, y) > 0.5;
  switch (t) {
    case T.Sand: {
      // warm dry sand -> damp -> wet, darker sand at the waterline
      const d = shoreDist(x, y);
      if (d <= 1) return alt ? '#e9c3a0' : '#e5bd9a';
      if (d === 2) return alt ? '#f4d5b4' : '#f1d0ae';
      return alt ? '#ffeacd' : '#fde4c4';
    }
    case T.Grass: return alt ? s.grass : s.grassAlt;
    case T.Hill: return alt ? s.hill : s.grass;
    case T.Path: return alt ? '#f6ddc9' : '#f2d5c0';
    case T.Soil: return '#e2c4a8';
    case T.Lawn: return (x + y) % 2 === 0 ? '#c8ecbb' : '#bde6ae';
    case T.Plaza: return (x + y) % 2 === 0 ? '#fbd5e2' : '#fde9ef';
    default: return PALETTE.sky;
  }
}

export interface Terrain {
  group: THREE.Group;
  setSeason(s: Season): void;
  update(t: number): void;
}

export function createTerrain(): Terrain {
  const group = new THREE.Group();
  const tiles: { x: number; y: number; t: number }[] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrainAt(x, y);
    if (t !== T.Water) tiles.push({ x, y, t });
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(geo, makeToon('#ffffff', { ground: true }), tiles.length);
  inst.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  tiles.forEach((tl, i) => {
    const top = tileHeight(tl.x, tl.y), bottom = -0.8, hgt = top - bottom;
    m4.makeScale(1.002, hgt, 1.002).setPosition(tl.x + 0.5, bottom + hgt / 2, tl.y + 0.5);
    inst.setMatrixAt(i, m4);
  });
  group.add(inst);

  // wet-sand sheen: a faint glossy film on the waterline tiles that brightens and fades like the wash going out
  const wet = tiles.filter((tl) => tl.t === T.Sand && shoreDist(tl.x, tl.y) === 1);
  const sheenMat = makeToon('#ffffff', { ground: true, transparent: true, opacity: 0.16 });
  sheenMat.depthWrite = false;
  sheenMat.polygonOffset = true; sheenMat.polygonOffsetFactor = -1; sheenMat.polygonOffsetUnits = -1;
  const sheen = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sheenMat, Math.max(1, wet.length));
  sheen.count = wet.length;
  sheen.renderOrder = 1;
  wet.forEach((tl, i) => { m4.makeTranslation(tl.x + 0.5, tileHeight(tl.x, tl.y) + 0.004, tl.y + 0.5); sheen.setMatrixAt(i, m4); });
  group.add(sheen);

  const waterMat = makeToon(PALETTE.water, { ground: true, transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W + 120, MAP_H + 120), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(MAP_W / 2, -0.25, MAP_H / 2);
  water.receiveShadow = true;
  group.add(water);
  // seabed so the translucent water has something under it
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W + 120, MAP_H + 120), toon(PALETTE.seabed, { ground: true }));
  bed.rotation.x = -Math.PI / 2; bed.position.set(MAP_W / 2, -0.9, MAP_H / 2);
  group.add(bed);

  const col = new THREE.Color();
  return {
    group,
    setSeason(s) {
      tiles.forEach((tl, i) => inst.setColorAt(i, col.set(tileColor(tl.t, tl.x, tl.y, s))));
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    },
    update(t) {
      water.position.y = -0.25 + Math.sin(t * 0.8) * 0.03;
      sheenMat.opacity = 0.1 + (0.5 + 0.5 * Math.sin(t * 0.8 + 1.2)) * 0.14;
    },
  };
}
