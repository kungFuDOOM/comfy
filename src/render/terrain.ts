// Ground: one instanced box per land tile, plus a big water plane. Heights are tiny so walking feels flat.
import * as THREE from 'three';
import { hash } from '../art/draw';
import type { Season } from '../time';
import { MAP_H, MAP_W, T, terrainAt } from '../world';
import { makeToon, PALETTE, toon } from './materials';

const HEIGHT: Record<number, number> = { [T.Water]: -0.4, [T.Sand]: 0, [T.Grass]: 0.05, [T.Path]: 0.08, [T.Hill]: 0.35, [T.Soil]: 0.04, [T.Lawn]: 0.07, [T.Plaza]: 0.1 };
export const tileHeight = (tx: number, ty: number) => HEIGHT[terrainAt(tx, ty)] ?? 0;
/** Ground height at a world-pixel/TS position (tile units). */
export const heightAtUnits = (ux: number, uz: number) => tileHeight(Math.floor(ux), Math.floor(uz - 0.12));

function tileColor(t: number, x: number, y: number, s: Season): string {
  const alt = hash(x, y) > 0.5;
  switch (t) {
    case T.Sand: return alt ? '#fbe9d2' : '#f8e2c8';
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
    const top = HEIGHT[tl.t], bottom = -0.8, hgt = top - bottom;
    m4.makeScale(1.002, hgt, 1.002).setPosition(tl.x + 0.5, bottom + hgt / 2, tl.y + 0.5);
    inst.setMatrixAt(i, m4);
  });
  group.add(inst);

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
    update(t) { water.position.y = -0.25 + Math.sin(t * 0.8) * 0.03; },
  };
}
