// Stylized sea: one subdivided plane with a small custom shader.
// - vertex: a few gentle sine swells (+ the shared bob the wet-sand sheen is timed to)
// - fragment: procedural ripples, toon glints, twinkly star sparkles, shoreline foam, shallow->deep color
// - shoreline data is baked once into a tiny distance texture (tiles to the nearest land), never rebuilt per frame
// The light rig writes waterLight every frame so the sea follows day / golden hour / night with everything else.
import * as THREE from 'three';
import { MAP_H, MAP_W, T, terrainAt } from '../world';

/** Distance (tiles) the shore texture covers; anything farther counts as open sea. */
const MAX_D = 6;
/** Texels per tile in the shore texture. */
const RES = 4;

/** Light uniforms shared with lighting.ts (colors are pre-scaled by intensity / PI, like the toon ramp sees them). */
export const waterLight = {
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uSunDir: { value: new THREE.Vector3(0.3, 0.9, 0.3).normalize() },
  uSkyColor: { value: new THREE.Color(1, 1, 1) },
  uGroundColor: { value: new THREE.Color(1, 1, 1) },
  uNight: { value: 0 },
};

/** Euclidean distance from each texel to the nearest land tile, normalized by MAX_D. Runs once at startup. */
function bakeShore(): THREE.DataTexture {
  const w = MAP_W * RES, h = MAP_H * RES, data = new Uint8Array(w * h);
  const land: number[] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (terrainAt(x, y) !== T.Water && terrainAt(x, y) !== T.Bridge) land.push(x, y);
  // bucket land tiles by tile so each texel only checks its neighbourhood
  const isLand = new Uint8Array(MAP_W * MAP_H);
  for (let i = 0; i < land.length; i += 2) isLand[land[i + 1] * MAP_W + land[i]] = 1;
  const R = MAX_D;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = (i + 0.5) / RES, py = (j + 0.5) / RES, tx = Math.floor(px), ty = Math.floor(py);
    let best = MAX_D * MAX_D;
    if (isLand[ty * MAP_W + tx]) best = 0;
    else for (let y = Math.max(0, ty - R); y <= Math.min(MAP_H - 1, ty + R); y++) for (let x = Math.max(0, tx - R); x <= Math.min(MAP_W - 1, tx + R); x++) {
      if (!isLand[y * MAP_W + x]) continue;
      const dx = Math.max(0, Math.abs(px - (x + 0.5)) - 0.5), dy = Math.max(0, Math.abs(py - (y + 0.5)) - 0.5);
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    data[j * w + i] = Math.round(Math.min(1, Math.sqrt(best) / MAX_D) * 255);
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  uniform float uTime;
  varying vec3 vWorld;
  varying vec2 vGrad;

  // a few long, soft swells; amplitudes add up to ~0.06 so the sea never climbs onto the wet sand (-0.08)
  #define SWELL(dir, k, spd, amp) { float ph = dot(p, dir) * k + t * spd; h += amp * sin(ph); g += dir * (amp * k * cos(ph)); }

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec2 p = wp.xz; float t = uTime;
    float h = 0.0; vec2 g = vec2(0.0);
    SWELL(vec2(0.86, 0.51), 0.62, 1.10, 0.020)
    SWELL(vec2(-0.42, 0.91), 0.81, 1.45, 0.013)
    SWELL(vec2(0.79, -0.61), 1.37, 2.10, 0.007)
    h += 0.02 * sin(t * 0.8); // shared bob, in step with the wet-sand sheen in terrain.ts
    wp.y += h;
    vWorld = wp.xyz;
    vGrad = g;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform sampler2D uShore;
  uniform vec2 uMapSize;
  uniform vec3 uSunColor, uSunDir, uSkyColor, uGroundColor;
  uniform float uNight;
  uniform vec3 uShallow, uMid, uDeep, uFoam, uSparkle;
  varying vec3 vWorld;
  varying vec2 vGrad;

  float hash21(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }

  // small ripples: value + gradient of four short sines
  #define RIP(dir, k, spd, amp) { float ph = dot(p, dir) * k + t * spd; rh += amp * sin(ph); rg += dir * (amp * k * cos(ph)); }

  void main() {
    vec2 p = vWorld.xz; float t = uTime;
    float d = texture2D(uShore, p / uMapSize).r * ${MAX_D.toFixed(1)}; // tiles to the nearest land
    float camDist = length(cameraPosition - vWorld);
    float near = 1.0 - smoothstep(18.0, 42.0, camDist); // fine detail fades out with distance (no shimmer far away)

    float rh = 0.0; vec2 rg = vec2(0.0);
    RIP(vec2(0.97, 0.24), 3.1, 1.9, 0.30)
    RIP(vec2(-0.55, 0.83), 3.9, -2.3, 0.25)
    RIP(vec2(0.28, -0.96), 5.3, 2.7, 0.16)
    RIP(vec2(-0.89, -0.45), 6.7, -3.1, 0.10)
    vec3 n = normalize(vec3(-(vGrad.x + rg.x * 0.05 * near), 1.0, -(vGrad.y + rg.y * 0.05 * near)));
    vec3 v = normalize(cameraPosition - vWorld);

    // depth color: mint/turquoise shallows -> clear aqua -> soft deep blue, with a faint wobbly contour band
    float dw = d + 0.18 * sin(p.x * 0.7 + t * 0.5) * sin(p.y * 0.6 - t * 0.4);
    vec3 col = mix(uShallow, uMid, smoothstep(0.2, 1.8, dw));
    col = mix(col, uDeep, smoothstep(2.0, 5.5, dw));
    col += 0.05 * (1.0 - smoothstep(0.05, 0.18, abs(dw - 2.1))) * near;

    // toon-ish lighting that follows the rig (same ballpark as the toon ramp: white ~= 1 at noon)
    float ndl = dot(n, uSunDir);
    vec3 light = mix(uGroundColor, uSkyColor, 0.5 + 0.5 * n.y) + uSunColor * (0.6 + 0.4 * smoothstep(-0.1, 0.6, ndl));
    col *= light;

    // pale ripple crest lines + a soft banded sun glint
    float crest = smoothstep(0.42, 0.62, rh) * near;
    vec3 lightTint = min(uSunColor + uSkyColor * 0.5, vec3(1.0));
    col += lightTint * crest * 0.09;
    vec3 hv = normalize(uSunDir + v);
    float spec = pow(max(dot(n, hv), 0.0), 90.0);
    col += lightTint * smoothstep(0.35, 0.5, spec) * 0.22 * (1.0 - 0.5 * uNight);
    // sky sheen at grazing angles
    float fres = pow(1.0 - max(v.y, 0.0), 3.0);
    col = mix(col, uSkyColor * 1.1, fres * 0.25);

    // twinkly four-point star sparkles drifting with the current
    vec2 q = p * 0.8 + vec2(t * 0.05, t * 0.03);
    vec2 cell = floor(q);
    float r = hash21(cell);
    vec2 sd = fract(q) - 0.5 - (vec2(hash21(cell + 7.1), hash21(cell + 3.7)) - 0.5) * 0.6;
    float tw = pow(max(0.0, sin(t * (1.2 + r * 1.8) + r * 40.0)), 10.0) * step(0.55, r);
    sd /= 0.3 + 0.7 * tw;
    float star = smoothstep(0.07, 0.0, length(sd)) + smoothstep(0.0035, 0.0, abs(sd.x * sd.y)) * smoothstep(0.24, 0.0, length(sd));
    float sparkle = min(star, 1.0) * tw * near * smoothstep(0.5, 1.2, d);
    col = mix(col, uSparkle * lightTint, sparkle * (0.85 - 0.35 * uNight));

    // shoreline foam: a lacy froth line that breathes with the swell, plus a thin wash line that rolls outward
    float wob = 0.5 * sin(p.x * 1.7 + t * 1.3) + 0.5 * sin(p.y * 2.3 - t * 1.1);
    float edge = 0.32 + 0.08 * wob + 0.05 * sin(t * 0.8);
    float foam = 1.0 - smoothstep(edge - 0.05, edge + 0.07, d);
    float lace = 0.5 + 0.5 * sin(p.x * 6.0 + sin(p.y * 4.0 + t) * 1.5) * sin(p.y * 5.5 - t * 0.7);
    foam = max(foam, (1.0 - smoothstep(0.0, 0.06, abs(d - edge - 0.12))) * smoothstep(0.35, 0.75, lace) * 0.8);
    float wph = fract(t * 0.16 + 0.12 * sin(p.x * 0.35 + p.y * 0.25));
    float washD = edge + 0.1 + wph * 1.1;
    foam = max(foam, (1.0 - smoothstep(0.0, 0.05, abs(d - washD))) * (1.0 - wph) * 0.65 * smoothstep(0.3, 0.7, lace + 0.2));
    vec3 foamCol = uFoam * min(light, vec3(1.08));
    col = mix(col, foamCol, foam);

    // translucent shallows let the seabed peek through; open sea is nearly opaque
    float alpha = mix(0.5, 0.92, smoothstep(0.3, 3.5, d));
    alpha = max(alpha, foam * 0.95);
    alpha = max(alpha, sparkle);

    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export interface Water {
  mesh: THREE.Mesh;
  update(t: number): void;
}

export function createWater(): Water {
  const size = { w: MAP_W + 120, h: MAP_H + 120 };
  // ~1.3 tiles per quad: plenty for long swells, ~16k verts, built once
  const geo = new THREE.PlaneGeometry(size.w, size.h, 140, 124).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uShore: { value: null },
      uMapSize: { value: new THREE.Vector2(MAP_W, MAP_H) },
      uShallow: { value: new THREE.Color('#9ef0dc') },
      uMid: { value: new THREE.Color('#7fdcef') },
      uDeep: { value: new THREE.Color('#6fb4ea') },
      uFoam: { value: new THREE.Color('#fff4f7') },
      uSparkle: { value: new THREE.Color('#fffbe8') },
    }]),
    transparent: true,
    fog: true,
  });
  // shared light uniforms are attached by reference (merge() would clone them)
  Object.assign(mat.uniforms, waterLight);
  mat.uniforms.uShore.value = bakeShore();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(MAP_W / 2, -0.25, MAP_H / 2);
  mesh.frustumCulled = false; // huge plane that is always on screen; skip the bounds test (displacement is tiny anyway)
  return {
    mesh,
    update(t) { mat.uniforms.uTime.value = t; },
  };
}
