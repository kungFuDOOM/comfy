// Day/night light rig, driven by the game clock (time.ts: darkness() + golden()).
// Day: bright warm key + airy sky fill. Night: gentle cool moon key + warm lamp point lights and ground pools.
// Sky/fog only live at the horizon; nothing here tints the whole screen.
import * as THREE from 'three';
import { darkness, golden } from '../time';
import { props } from '../world';
import { applyNightToMaterials, lightPool, PALETTE, shadeUniforms } from './materials';
import { tileHeight } from './terrain';

interface Look {
  key: THREE.Color; keyI: number;       // sun / moon
  sky: THREE.Color; ground: THREE.Color; fillI: number; // hemisphere fill (this is what colors the shadows)
  bg: THREE.Color;                       // sky + distance fog
  rim: THREE.Color; rimI: number;
  ao: THREE.Color;
  unlit: THREE.Color;                    // tint for unlit sign labels
}
const look = (key: string, keyI: number, sky: string, ground: string, fillI: number, bg: string, rim: string, rimI: number, ao: string, unlit: string): Look => ({
  key: new THREE.Color(key), keyI, sky: new THREE.Color(sky), ground: new THREE.Color(ground), fillI, bg: new THREE.Color(bg),
  rim: new THREE.Color(rim), rimI, ao: new THREE.Color(ao), unlit: new THREE.Color(unlit),
});

/** Tunable looks. Intensities are physical-ish: (keyI + fillI) / PI ~= brightness of a sunlit white surface. */
export const LOOKS = {
  day: look('#fff4e2', 1.65, '#e6f4ff', '#ffe6d6', 1.7, PALETTE.sky, '#ffffff', 0.4, '#d6ccd8', '#ffffff'),
  golden: look('#ffd3a1', 1.75, '#ffe6da', '#ffd2b8', 1.35, '#ffd8c0', '#fff0d0', 0.45, '#dcc8c4', '#fff0e4'),
  night: look('#cfdcff', 0.62, '#a6bcff', '#8799e2', 0.92, '#24407c', '#cfe0ff', 0.32, '#c4c8dc', '#8e9cc4'),
};

const SHADOW_HALF = 23;    // half-size of the shadow frustum, tile units
const SHADOW_MAP = 2048;
const SHADOW_DIST = 50;

export interface LightRig {
  /** hour: 0..24 game clock. focus: point the camera is looking at (shadow frustum follows it). */
  update(hour: number, focus: THREE.Vector3): void;
  /** 0..1 night factor from the last update (for passes that want to switch off by day). */
  night: number;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  lamps: THREE.PointLight[];
}

export function createLightRig(scene: THREE.Scene): LightRig {
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -SHADOW_HALF; sc.right = sc.top = SHADOW_HALF; sc.near = 1; sc.far = SHADOW_DIST * 2;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3.5; // wide PCF kernel = soft toy shadows
  scene.add(hemi, sun, sun.target);

  // Street lamps: a warm point light above each bulb plus a soft additive pool on the ground.
  const lamps: THREE.PointLight[] = [];
  for (const p of props) {
    if (p.type !== 'lamp') continue;
    const y = tileHeight(p.x, p.y);
    const l = new THREE.PointLight(PALETTE.lampGlow, 0, 7.5, 1.6);
    l.position.set(p.x + 0.5, y + 2.3, p.y + 0.5);
    lamps.push(l);
    const pool = lightPool(6.4, 6.4, '#ffca82', 0.3);
    pool.position.set(p.x + 0.5, y + 0.05, p.y + 0.5);
    scene.add(l, pool);
  }

  const cur = look('#fff', 1, '#fff', '#fff', 1, '#fff', '#fff', 0, '#fff', '#fff');
  const mixLook = (a: Look, b: Look, t: number) => {
    cur.key.lerpColors(a.key, b.key, t); cur.keyI = a.keyI + (b.keyI - a.keyI) * t;
    cur.sky.lerpColors(a.sky, b.sky, t); cur.ground.lerpColors(a.ground, b.ground, t); cur.fillI = a.fillI + (b.fillI - a.fillI) * t;
    cur.bg.lerpColors(a.bg, b.bg, t); cur.rim.lerpColors(a.rim, b.rim, t); cur.rimI = a.rimI + (b.rimI - a.rimI) * t;
    cur.ao.lerpColors(a.ao, b.ao, t); cur.unlit.lerpColors(a.unlit, b.unlit, t);
  };
  const dir = new THREE.Vector3(), moonDir = new THREE.Vector3(0.45, 0.95, 0.4).normalize();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), c = new THREE.Vector3();
  const texel = (SHADOW_HALF * 2) / SHADOW_MAP;

  const rig: LightRig = {
    sun, hemi, lamps, night: 0,
    update(hour, focus) {
      const night = darkness(hour), gold = golden(hour) * (1 - night);
      rig.night = night;
      // day -> golden hour -> night, in that order so dusk passes through peach rather than grey
      mixLook(LOOKS.day, LOOKS.golden, gold);
      if (night > 0) mixLook(cur, LOOKS.night, night);

      sun.color.copy(cur.key); sun.intensity = cur.keyI;
      hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.ground); hemi.intensity = cur.fillI;
      (scene.background as THREE.Color).copy(cur.bg);
      if (scene.fog) scene.fog.color.copy(cur.bg);
      shadeUniforms.uRimColor.value.copy(cur.rim);
      shadeUniforms.uRimStrength.value = cur.rimI;
      shadeUniforms.uAoTint.value.copy(cur.ao);
      applyNightToMaterials(night, cur.unlit);
      const e = night * night * (3 - 2 * night);
      for (const l of lamps) { l.intensity = e * 13; l.visible = e > 0.01; }

      // key direction: sun drifts left -> right through the day (always a little towards the camera so
      // fronts of things are lit), and hands over to a fixed moon at night
      const f = Math.max(0, Math.min(1, (hour - 6) / 13));
      dir.set(-0.62 * Math.cos(f * Math.PI) - 0.3, 0.8 + 0.35 * Math.sin(f * Math.PI), 0.48).normalize();
      dir.lerp(moonDir, e).normalize();

      // shadow frustum follows the camera focus, snapped to shadow texels so edges don't crawl
      right.crossVectors(dir, c.set(0, 1, 0)).normalize(); up.crossVectors(right, dir).normalize();
      const rx = Math.round(focus.dot(right) / texel) * texel, uy = Math.round(focus.dot(up) / texel) * texel, dz = focus.dot(dir);
      c.set(0, 0, 0).addScaledVector(right, rx).addScaledVector(up, uy).addScaledVector(dir, dz);
      sun.target.position.copy(c);
      sun.position.copy(c).addScaledVector(dir, SHADOW_DIST);
      sun.target.updateMatrixWorld();
    },
  };
  return rig;
}
