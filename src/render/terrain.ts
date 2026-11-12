// Ground: instanced boxes for the inland tiles, one smooth shore mesh for the beach (sand, its grass border and the
// underwater slope; see shore.ts), plus the stylized sea (water.ts). Heights are tiny so walking feels flat.
import * as THREE from 'three';
import { hash } from '../art/draw';
import type { Season } from '../time';
import { MAP_H, MAP_W, T, terrainAt } from '../world';
import { makeToon, PALETTE, toon } from './materials';
import { isSmoothTile, sampleField, shoreField, shoreHeight } from './shore';
import { createWater } from './water';
import { createTufts } from './tufts';

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


// ---- inland ground shader: soft painterly grass, cobbled paths, pink-cream plaza (same noise language as the sand) ----
const NOISE_GLSL = /* glsl */ `
float gh21(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float gNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gh21(i), gh21(i + vec2(1.0, 0.0)), u.x), mix(gh21(i + vec2(0.0, 1.0)), gh21(i + vec2(1.0, 1.0)), u.x), u.y);
}
// soft tonal drift + a hint of blade streaks, shared by every patch of grass (inland and the shore's border)
vec3 grassVar(vec3 c, vec2 gp) {
  float nBig = gNoise(gp * 0.33), nMid = gNoise(gp * 1.7 + 7.0), nFine = gNoise(gp * 11.0);
  float streak = gNoise(vec2(gp.x * 26.0, gp.y * 7.0) + 3.0);
  c *= 1.0 + (nBig - 0.5) * 0.12 + (nMid - 0.5) * 0.05 + (nFine - 0.5) * 0.035 + (streak - 0.5) * 0.03;
  c = mix(c, c * vec3(1.05, 1.02, 0.88), smoothstep(0.35, 0.8, nBig));   // sun-warmed patches
  c = mix(c, c * vec3(0.93, 1.0, 1.04), smoothstep(0.55, 0.15, nBig) * 0.7); // cooler, bluer hollows
  return c;
}
`;
const GROUND_VERT = /* glsl */ `
varying vec2 vGP;
varying float vTop;
`;
const GROUND_FRAG = /* glsl */ `
uniform sampler2D uTiles;
uniform vec2 uMap;
varying vec2 vGP;
varying float vTop;
bool organicT(float t) { return t > 0.5 && (t < 1.5 || (t > 1.5 && t < 2.5) || (t > 3.5 && t < 6.5)); }
vec4 tileAt(vec2 tc) { return texture2D(uTiles, (tc + 0.5) / uMap); }
float tType(vec4 v) { return floor(v.a * 255.0 / 16.0 + 0.5); }

vec3 pathCol(vec3 base, vec2 gp) {
  // cobbles in offset rows, ~3 per tile: rounded stones, soft bevel, warm mortar
  vec2 cp = gp * 3.0; float row = floor(cp.y);
  cp.x += row * 0.5 + gh21(vec2(row, 3.0)) * 0.6;
  vec2 id = floor(cp), q = fract(cp) - 0.5;
  float rr = gh21(id + 17.0);
  float sd = length(max(abs(q) - vec2(0.33), 0.0)) - 0.11;
  float stone = 1.0 - smoothstep(-0.02, 0.035, sd);
  vec3 st = base * (0.95 + 0.09 * rr) * mix(vec3(1.0), vec3(1.03, 0.97, 0.93), rr);
  st *= 1.0 - 0.07 * smoothstep(-0.14, 0.0, sd);               // soft rim
  st += 0.045 * (1.0 - smoothstep(0.0, 0.5, length(q - vec2(-0.12, 0.12)))); // pillowy highlight
  st += (gNoise(gp * 14.0) - 0.5) * 0.03;
  vec3 mortar = base * vec3(0.84, 0.76, 0.76);
  return mix(mortar, st, stone);
}
vec3 plazaCol(vec2 gp) {
  // half-tile rounded pink / cream tiles with pale grout and a little dot on the pink ones
  vec2 cp = gp * 2.0, id = floor(cp), q = fract(cp) - 0.5;
  float par = mod(id.x + id.y, 2.0);
  vec3 pink = vec3(0.98, 0.80, 0.87), cream = vec3(1.0, 0.94, 0.93), grout = vec3(1.0, 0.89, 0.9);
  vec3 c = mix(pink, cream, par);
  c *= 0.985 + 0.03 * gh21(id);
  float sd = length(max(abs(q) - vec2(0.4), 0.0)) - 0.06;
  float tile = 1.0 - smoothstep(-0.015, 0.03, sd);
  c *= 1.0 - 0.04 * smoothstep(-0.1, 0.0, sd);
  c += 0.035 * (1.0 - smoothstep(0.0, 0.55, length(q + vec2(0.1, -0.1))));
  c = mix(c, c * vec3(1.0, 0.97, 0.97) + 0.03, (1.0 - par) * (1.0 - smoothstep(0.07, 0.1, length(q))) * 0.6); // dot
  return mix(grout, c, tile);
}
`;

function patchGround(mat: THREE.MeshToonMaterial, uniforms: Record<string, THREE.IUniform>) {
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GROUND_VERT)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 gw = modelMatrix * instanceMatrix * vec4(transformed, 1.0); vGP = gw.xz; vTop = step(0.5, normal.y); }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE_GLSL + GROUND_FRAG)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vTop > 0.5) {
          vec2 gp = vGP, tc = floor(gp), f = gp - tc;
          vec4 me = tileAt(tc);
          float ty = tType(me);
          vec3 col = me.rgb;
          if (ty > 5.5 && ty < 6.5) col = grassVar(col, gp) ;                       // lawn
          else if (ty > 6.5) col = plazaCol(gp);
          else if (ty > 2.5 && ty < 3.5) col = pathCol(col, gp);
          else if (ty > 1.5 && ty < 2.5 || (ty > 3.5 && ty < 4.5)) col = grassVar(col, gp);
          else if (ty > 0.5 && ty < 1.5) col *= 0.97 + 0.06 * gNoise(gp * 24.0);    // sand
          else if (ty > 4.5 && ty < 5.5) col *= 0.96 + 0.08 * gNoise(vec2(gp.x * 30.0, gp.y * 5.0)); // tilled soil
          // soft painterly edges: blend toward each differing neighbour across a short wobbly band
          float wob = (gNoise(gp * 3.1) - 0.5) * 0.14;
          for (int i = 0; i < 4; i++) {
            vec2 d = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0) : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
            float e = i == 0 ? 1.0 - f.x : i == 1 ? f.x : i == 2 ? 1.0 - f.y : f.y;
            vec4 nb = tileAt(tc + d);
            float nt = tType(nb);
            if (nt < 0.5 || abs(nt - ty) < 0.5) continue;
            float w = organicT(ty) && organicT(nt) ? 0.5 : 0.13;
            vec3 ncol = nt > 6.5 ? vec3(0.99, 0.88, 0.91) : nb.rgb;
            if (nt > 5.5 && nt < 6.5) ncol = grassVar(ncol, gp);
            else if (nt > 1.5 && nt < 2.5) ncol = grassVar(ncol, gp);
            col = mix(col, ncol, (1.0 - smoothstep(0.0, w, e + wob)) * 0.5);
          }
          diffuseColor.rgb = col;
        }`);
  };
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
  // per-tile colour (rgb) + terrain id (alpha) so the ground shader can pattern each tile and blend across tile edges
  const tileData = new Uint8Array(MAP_W * MAP_H * 4);
  const tileTex = new THREE.DataTexture(tileData, MAP_W, MAP_H, THREE.RGBAFormat);
  tileTex.magFilter = tileTex.minFilter = THREE.NearestFilter;
  tileTex.generateMipmaps = false;
  const groundMat = makeToon('#ffffff', { ground: true });
  patchGround(groundMat, { uTiles: { value: tileTex }, uMap: { value: new THREE.Vector2(MAP_W, MAP_H) } });
  const inst = new THREE.InstancedMesh(geo, groundMat, Math.max(1, tiles.length));
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

  const tufts = createTufts();
  group.add(tufts.group);

  const col = new THREE.Color();
  return {
    group,
    setSeason(s) {
      tiles.forEach((tl, i) => {
        inst.setColorAt(i, col.set(tileColor(tl.t, tl.x, tl.y, s)));
        tileData.set([col.r * 255, col.g * 255, col.b * 255, tl.t * 16], (tl.y * MAP_W + tl.x) * 4);
      });
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      tileTex.needsUpdate = true;
      tufts.setSeason(s);
      shore.setSeason((x, y) => tileColor(T.Grass, x, y, s));
    },
    update(t) {
      water.update(t);
      shore.update(t);
      tufts.update(t);
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
      .replace('#include <common>', '#include <common>\n' + NOISE_GLSL + SHORE_FRAG)
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
        vec3 grass = grassVar(texture2D(uTileCol, (floor(gp) + 0.5) / uMapSize).rgb, gp);
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
