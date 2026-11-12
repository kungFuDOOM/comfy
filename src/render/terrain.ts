// Ground: instanced boxes for the inland tiles, one smooth shore mesh for the beach (sand, its grass border and the
// underwater slope; see shore.ts), plus the stylized sea (water.ts). Heights are tiny so walking feels flat.
import * as THREE from 'three';
import { hash } from '../art/draw';
import type { Season } from '../time';
import { MAP_H, MAP_W, T, terrainAt } from '../world';
import { makeToon, PALETTE, toon } from './materials';
import { isSmoothTile, sampleField, shoreField, shoreHeight } from './shore';
import { createWater } from './water';

const HEIGHT: Record<number, number> = { [T.Water]: -0.4, [T.Sand]: 0, [T.Grass]: 0.05, [T.Path]: 0.08, [T.Hill]: 0.35, [T.Soil]: 0.04, [T.Lawn]: 0.07, [T.Plaza]: 0.1, [T.Bridge]: 0.12 };
/** Ground height at a tile's centre. Beach tiles follow the smooth shore surface (dry sand ~0, dipping to the sea). */
export const tileHeight = (tx: number, ty: number) => {
  const t = terrainAt(tx, ty);
  return t !== T.Water && isSmoothTile(tx, ty) ? shoreHeight(tx + 0.5, ty + 0.5) : HEIGHT[t] ?? 0;
};
/** Ground height at a world-pixel/TS position (tile units). */
export const heightAtUnits = (ux: number, uz: number) => {
  const tx = Math.floor(ux), ty = Math.floor(uz - 0.12), t = terrainAt(tx, ty);
  return t !== T.Water && isSmoothTile(tx, ty) ? shoreHeight(ux, uz) : HEIGHT[t] ?? 0;
};

/** Beach palette (sRGB): warm dry sand, a damper band, darker wet sand at the waterline, sand seen under the sea. */
const SAND = { dry: '#fde4c4', damp: '#f1cda9', wet: '#ddb08a', under: '#d9c9a4' };

function tileColor(t: number, x: number, y: number, s: Season): string {
  const alt = hash(x, y) > 0.5;
  switch (t) {
    case T.Sand: return SAND.dry;
    case T.Grass: return alt ? s.grass : s.grassAlt;
    case T.Hill: return alt ? s.hill : s.grass;
    case T.Path: return alt ? '#f6ddc9' : '#f2d5c0';
    case T.Soil: return '#e2c4a8';
    case T.Lawn: return (x + y) % 2 === 0 ? '#c8ecbb' : '#bde6ae';
    case T.Bridge: return '#f6ddc9';
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
    // the bridge deck is drawn by the barrier layer; the beach and its grass border belong to the smooth shore mesh
    if (t !== T.Water && t !== T.Bridge && !isSmoothTile(x, y)) tiles.push({ x, y, t });
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(geo, makeToon('#ffffff', { ground: true }), Math.max(1, tiles.length));
  inst.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  tiles.forEach((tl, i) => {
    const top = HEIGHT[tl.t] ?? 0, bottom = -0.8, hgt = top - bottom;
    m4.makeScale(1.002, hgt, 1.002).setPosition(tl.x + 0.5, bottom + hgt / 2, tl.y + 0.5);
    inst.setMatrixAt(i, m4);
  });
  group.add(inst);

  const shore = createShoreMesh();
  group.add(shore.mesh);

  // stylized sea (waves, ripples, sparkles, shoreline foam) over the seabed
  const water = createWater();
  group.add(water.mesh);
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
      shore.setSeason((x, y) => tileColor(T.Grass, x, y, s));
    },
    update(t) {
      water.update(t);
      shore.update(t);
    },
  };
}

// ---- the smooth shore mesh ----
/** Vertices per tile edge. 3 keeps the waterline round while staying ~50k triangles for the whole coast. */
const SUB = 3;

const SHORE_VERT = /* glsl */ `
attribute float aShore;
attribute float aInland;
varying float vShore;
varying float vInland;
varying vec2 vGround;
`;
const SHORE_FRAG = /* glsl */ `
uniform vec3 uDry, uDamp, uWet, uUnder, uSeabed;
uniform sampler2D uTileCol;
uniform vec2 uMapSize;
uniform float uSheen;
varying float vShore;
varying float vInland;
varying vec2 vGround;
float sh21(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float sNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sh21(i), sh21(i + vec2(1.0, 0.0)), u.x), mix(sh21(i + vec2(0.0, 1.0)), sh21(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

function createShoreMesh() {
  const f = shoreField();
  const VW = MAP_W * SUB + 1;
  const vIndex = new Map<number, number>();
  const pos: number[] = [], shoreA: number[] = [], inlandA: number[] = [], index: number[] = [];
  const vert = (gx: number, gy: number) => {
    const key = gy * VW + gx;
    let i = vIndex.get(key);
    if (i === undefined) {
      const ux = gx / SUB, uz = gy / SUB;
      i = pos.length / 3;
      pos.push(ux, sampleField(f.height, ux, uz), uz);
      shoreA.push(sampleField(f.sdf, ux, uz));
      inlandA.push(sampleField(f.inland, ux, uz));
      vIndex.set(key, i);
    }
    return i;
  };
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    if (!isSmoothTile(tx, ty)) continue;
    for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
      const gx = tx * SUB + i, gy = ty * SUB + j;
      const a = vert(gx, gy), b = vert(gx + 1, gy), c = vert(gx, gy + 1), d = vert(gx + 1, gy + 1);
      // alternate the diagonal so slopes don't streak in one direction
      if ((i + j) % 2) index.push(a, c, b, b, c, d); else index.push(a, c, d, a, d, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aShore', new THREE.Float32BufferAttribute(shoreA, 1));
  geo.setAttribute('aInland', new THREE.Float32BufferAttribute(inlandA, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  // per-tile grass colours (nearest-sampled), so the soft border's grass matches the boxed grass beside it exactly
  const tileData = new Uint8Array(MAP_W * MAP_H * 4);
  const tileTex = new THREE.DataTexture(tileData, MAP_W, MAP_H, THREE.RGBAFormat);
  tileTex.magFilter = tileTex.minFilter = THREE.NearestFilter;
  tileTex.generateMipmaps = false;

  const lin = (hex: string) => new THREE.Color(hex);
  const uniforms = {
    uDry: { value: lin(SAND.dry) }, uDamp: { value: lin(SAND.damp) }, uWet: { value: lin(SAND.wet) }, uUnder: { value: lin(SAND.under) }, uSeabed: { value: lin(PALETTE.seabed) },
    uTileCol: { value: tileTex }, uMapSize: { value: new THREE.Vector2(MAP_W, MAP_H) }, uSheen: { value: 0 },
  };
  const mat = makeToon('#ffffff', { ground: true });
  const baseCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    baseCompile.call(mat, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + SHORE_VERT)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShore = aShore; vInland = aInland; vGround = position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SHORE_FRAG)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 gp = vGround;
        float nBig = sNoise(gp * 0.55), nMid = sNoise(gp * 2.3), nFine = sNoise(gp * 9.0), grain = sh21(floor(gp * 28.0));
        // wobble the colour bands a little so they never trace the tile grid
        float s = vShore + (nBig - 0.5) * 0.5 + (nMid - 0.5) * 0.18;
        vec3 sand = mix(uWet, uDamp, smoothstep(0.05, 0.85, s));
        sand = mix(sand, uDry, smoothstep(1.0, 2.3, s));
        // under the sea the sand fades into the seabed colour, so the slope's outer edge (and the plain seabed) never shows
        vec3 under = mix(uUnder, uSeabed, smoothstep(-0.3, -1.6, vShore));
        sand = mix(under, sand, smoothstep(-0.55, 0.0, vShore));
        // gentle patchiness + fine grain
        sand *= 0.97 + 0.05 * (nMid - 0.5) + 0.05 * (nFine - 0.5) + 0.035 * (grain - 0.5);
        // wet-sand sheen at the waterline that brightens and fades like the wash going out
        float wetBand = (1.0 - smoothstep(0.0, 0.9, s)) * smoothstep(-0.15, 0.08, vShore);
        sand += uSheen * wetBand * (0.6 + 0.4 * nFine);
        vec3 grass = texture2D(uTileCol, (floor(gp) + 0.5) / uMapSize).rgb;
        float g = smoothstep(-0.45, 0.6, vInland + (nBig - 0.5) * 0.45 + (nFine - 0.5) * 0.12);
        diffuseColor.rgb *= mix(sand, grass, g);`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  const c = new THREE.Color();
  return {
    mesh,
    setSeason(colorAt: (x: number, y: number) => string) {
      for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
        if (!isSmoothTile(x, y)) continue;
        c.set(colorAt(x, y));
        tileData.set([c.r * 255, c.g * 255, c.b * 255, 255], (y * MAP_W + x) * 4);
      }
      tileTex.needsUpdate = true;
    },
    update(t: number) {
      // in step with the sea's shared bob (water.ts)
      uniforms.uSheen.value = (0.5 + 0.5 * Math.sin(t * 0.8 + 1.2)) * 0.07;
    },
  };
}
