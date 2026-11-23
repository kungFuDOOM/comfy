// Day/night light rig, driven by the game clock (time.ts: darkness() + golden()).
// Day: bright warm key + airy sky fill. Night: gentle cool moon key + warm lamp point lights and ground pools.
// Sky/fog only live at the horizon; nothing here tints the whole screen.
import * as THREE from 'three';
import { darkness, golden } from '../time';
import { props } from '../world';
import { applyNightToMaterials, lightPool, PALETTE, shadeUniforms } from './materials';
import { tileHeight } from './terrain';
import { waterLight } from './water';

interface Look {
  key: THREE.Color; keyI: number;       // sun / moon
  sky: THREE.Color; ground: THREE.Color; fillI: number; // hemisphere fill (this is what colors the shadows)
  bg: THREE.Color;                       // sky + distance fog
  rim: THREE.Color; rimI: number;
  ao: THREE.Color;
  unlit: THREE.Color;                    // tint for unlit sign labels
  fogNear: number; fogSpan: number;      // fog starts this far *behind the camera focus* and is opaque fogSpan later
}
const look = (key: string, keyI: number, sky: string, ground: string, fillI: number, bg: string, rim: string, rimI: number, ao: string, unlit: string, fogNear: number, fogSpan: number): Look => ({
  key: new THREE.Color(key), keyI, sky: new THREE.Color(sky), ground: new THREE.Color(ground), fillI, bg: new THREE.Color(bg),
  rim: new THREE.Color(rim), rimI, ao: new THREE.Color(ao), unlit: new THREE.Color(unlit), fogNear, fogSpan,
});

/** Tunable looks. Intensities are physical-ish: (keyI + fillI) / PI ~= brightness of a sunlit white surface. */
// Day: creamy peach sun, lilac-blue sky fill so shade reads soft lavender (never grey), warm peach ground bounce.
// Golden: deeper apricot key, rosy fill, a glowing warm rim. Night: moonlit periwinkle with a lavender bounce, a bit
// brighter than pure blue so faces and paths stay readable; warm lamps do the rest.
export const LOOKS = {
  day: look('#fff0dc', 1.72, '#e9eeff', '#ffdccc', 1.62, '#b8e4f4', '#fff4ee', 0.44, '#dac4d6', '#ffffff', 26, 62),
  golden: look('#ffc994', 1.86, '#ffe1e4', '#ffc9a6', 1.28, '#ffd0bc', '#ffe0b4', 0.56, '#dfc0c2', '#fff0e4', 22, 56),
  night: look('#c6d4ff', 0.7, '#aebeff', '#9a94dc', 1.0, '#2a3f7e', '#d4e0ff', 0.44, '#c8c4de', '#909cc6', 20, 52),
};

const SHADOW_HALF = 23;    // half-size of the shadow frustum, tile units
const SHADOW_MAP = 2048;
const SHADOW_DIST = 50;

export interface LightRig {
  /** hour: 0..24 game clock. focus: point the camera is looking at (shadow frustum follows it).
   *  camDist: camera-to-focus distance, so the horizon fog always starts behind whatever the camera is framing. */
  update(hour: number, focus: THREE.Vector3, camDist?: number): void;
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
  sun.shadow.radius = 3.5; // wide PCF kernel = soft toy shadows (5 Vogel taps in r187: wider than this gets grainy)
  // Let a little key light through shadows: they read as soft pastel shade instead of flat grey cut-outs.
  sun.shadow.intensity = 0.86;
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

  const cur = look('#fff', 1, '#fff', '#fff', 1, '#fff', '#fff', 0, '#fff', '#fff', 0, 1);
  const mixLook = (a: Look, b: Look, t: number) => {
    cur.key.lerpColors(a.key, b.key, t); cur.keyI = a.keyI + (b.keyI - a.keyI) * t;
    cur.sky.lerpColors(a.sky, b.sky, t); cur.ground.lerpColors(a.ground, b.ground, t); cur.fillI = a.fillI + (b.fillI - a.fillI) * t;
    cur.bg.lerpColors(a.bg, b.bg, t); cur.rim.lerpColors(a.rim, b.rim, t); cur.rimI = a.rimI + (b.rimI - a.rimI) * t;
    cur.ao.lerpColors(a.ao, b.ao, t); cur.unlit.lerpColors(a.unlit, b.unlit, t);
    cur.fogNear = a.fogNear + (b.fogNear - a.fogNear) * t; cur.fogSpan = a.fogSpan + (b.fogSpan - a.fogSpan) * t;
  };
  const dir = new THREE.Vector3(), moonDir = new THREE.Vector3(0.45, 0.95, 0.4).normalize();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), c = new THREE.Vector3();
  const texel = (SHADOW_HALF * 2) / SHADOW_MAP;

  const rig: LightRig = {
    sun, hemi, lamps, night: 0,
    update(hour, focus, camDist = 18) {
      const night = darkness(hour), gold = golden(hour) * (1 - night);
      rig.night = night;
      // day -> golden hour -> night, in that order so dusk passes through peach rather than grey
      mixLook(LOOKS.day, LOOKS.golden, gold);
      if (night > 0) mixLook(cur, LOOKS.night, night);

      sun.color.copy(cur.key); sun.intensity = cur.keyI;
      hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.ground); hemi.intensity = cur.fillI;
      (scene.background as THREE.Color).copy(cur.bg);
      const fog = scene.fog as THREE.Fog | null;
      if (fog) {
        // fog hugs the horizon: it begins past the framed subject (gameplay ~16-28 units, menu ~40+), so characters and
        // the mid-ground are never milked, while the far sea and island edges melt softly into the sky
        fog.color.copy(cur.bg);
        fog.near = camDist + cur.fogNear;
        fog.far = fog.near + cur.fogSpan;
      }
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
      shadeUniforms.uKeyDir.value.copy(dir);

      // shadow frustum follows the camera focus, snapped to shadow texels so edges don't crawl
      right.crossVectors(dir, c.set(0, 1, 0)).normalize(); up.crossVectors(right, dir).normalize();
      const rx = Math.round(focus.dot(right) / texel) * texel, uy = Math.round(focus.dot(up) / texel) * texel, dz = focus.dot(dir);
      c.set(0, 0, 0).addScaledVector(right, rx).addScaledVector(up, uy).addScaledVector(dir, dz);
      sun.target.position.copy(c);
      sun.position.copy(c).addScaledVector(dir, SHADOW_DIST);
      sun.target.updateMatrixWorld();

      waterLight.uSunColor.value.copy(cur.key).multiplyScalar(cur.keyI / Math.PI);
      waterLight.uSkyColor.value.copy(cur.sky).multiplyScalar(cur.fillI / Math.PI);
      waterLight.uGroundColor.value.copy(cur.ground).multiplyScalar(cur.fillI / Math.PI);
      waterLight.uSunDir.value.copy(dir);
      waterLight.uNight.value = night;
    },
  };
  return rig;
}
