// Three.js world: renderer, camera rig, lights, picking, and per-frame sync with game state.
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import type { OutfitDef } from '../data';
import type { Npc } from '../npc';
import { darkness, skyTint, type Season } from '../time';
import { MAP_H, MAP_W, TS } from '../world';
import { createPlayerMesh, createVillagerMesh, type ActorMesh } from './actors';
import { createDynamic } from './dynamic';
import { createNature } from './nature';
import { createStructures } from './structures';
import { createTerrain, heightAtUnits } from './terrain';
import { nightMats } from './util';

export interface FrameInput {
  t: number;
  dt: number;
  hour: number;
  season: Season;
  player: { x: number; y: number; facing: Facing; moving: boolean };
  outfit: OutfitDef;
  npcs: Npc[];
  talkedToday(id: string): boolean;
}

export type Pick =
  | { kind: 'npc'; id: string }
  | { kind: 'station'; id: string }
  | { kind: 'ground'; wx: number; wy: number }; // world pixels (1 tile = TS)

// Camera: high three-quarter view. Offset is relative to the follow target, in tile units.
const CAM_BACK = 9.5;
const CAM_UP = 12.5;
const FOV = 36;

export interface World3D {
  resize(): void;
  render(f: FrameInput): void;
  pick(sx: number, sy: number, npcs: Npc[]): Pick | null;
  snapCamera(px: number, py: number): void;
}

/** Light + sky + lit-window response to the time of day. Replace for a fancier sky later. */
export function setDayNight(scene: THREE.Scene, rig: { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight }, hour: number) {
  const [r, g, b] = skyTint(hour);
  const tint = new THREE.Color(r / 255, g / 255, b / 255).convertSRGBToLinear();
  const night = darkness(hour);
  rig.hemi.color.set('#ffffff').multiply(tint);
  rig.hemi.groundColor.set('#ffe6ef').multiply(tint);
  rig.sun.color.set('#fff6ea').multiply(tint);
  rig.sun.intensity = 0.7 * (1 - night * 0.5);
  (scene.background as THREE.Color).set('#bfe6f2').multiply(tint);
  (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
  for (const m of nightMats) m.emissiveIntensity = night * 1.1;
}

export function createWorld3D(canvas: HTMLCanvasElement): World3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe6f2');
  scene.fog = new THREE.Fog('#bfe6f2', 45, 95);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffe6ef', 1.0);
  const sun = new THREE.DirectionalLight('#fff6ea', 0.7);
  sun.position.set(-8, 14, 6);
  scene.add(hemi, sun);

  const terrain = createTerrain();
  const nature = createNature();
  const structures = createStructures();
  const dynamic = createDynamic();
  scene.add(terrain.group, nature.group, structures, dynamic.group);

  const player = createPlayerMesh();
  scene.add(player.root);
  const villagers = new Map<string, ActorMesh>();

  let seasonId = '';
  let lastHourBucket = -1;
  const target = new THREE.Vector3(30, 0, 24);
  const camPos = new THREE.Vector3();
  let aspect = 1;
  const actorY = new Map<ActorMesh, number>();

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function placeCamera() {
    // pull back on narrow/portrait screens so the same amount of town fits
    const k = aspect < 1 ? 1 + (1 - aspect) * 0.9 : 1;
    camPos.set(target.x, target.y + CAM_UP * k, target.z + CAM_BACK * k);
    camera.position.copy(camPos);
    camera.lookAt(target);
  }

  function place(a: ActorMesh, px: number, py: number) {
    const ux = px / TS, uz = py / TS;
    const gy = heightAtUnits(ux, uz);
    const cur = actorY.get(a) ?? gy;
    const ny = cur + (gy - cur) * 0.25;
    actorY.set(a, ny);
    a.root.position.set(ux, ny, uz);
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  return {
    resize,
    snapCamera(px, py) { target.set(px / TS, 0, py / TS); placeCamera(); },
    render(f) {
      if (f.season.id !== seasonId) { seasonId = f.season.id; terrain.setSeason(f.season); nature.setSeason(f.season); }
      const bucket = Math.round(f.hour * 20);
      if (bucket !== lastHourBucket) { lastHourBucket = bucket; setDayNight(scene, { hemi, sun }, f.hour); }

      player.setOutfit(f.outfit);
      place(player, f.player.x, f.player.y);
      player.setFacing(f.player.facing, f.dt);
      player.animate(f.t, f.player.moving);
      for (const n of f.npcs) {
        let v = villagers.get(n.def.id);
        if (!v) { v = createVillagerMesh(n.def); villagers.set(n.def.id, v); scene.add(v.root); }
        place(v, n.x, n.y);
        v.setFacing(n.facing, f.dt);
        v.animate(f.t + n.x, n.moving);
        v.setAlert?.(!f.talkedToday(n.def.id));
      }
      dynamic.update(f.t);
      terrain.update(f.t);

      // follow cam (smoothed, clamped to the island)
      const tx = Math.max(6, Math.min(MAP_W - 6, f.player.x / TS)), tz = Math.max(6, Math.min(MAP_H - 6, f.player.y / TS - 0.6));
      const k = 1 - Math.pow(0.001, f.dt);
      target.x += (tx - target.x) * k; target.z += (tz - target.z) * k;
      placeCamera();
      renderer.render(scene, camera);
    },
    pick(sx, sy, npcs) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((sx - r.left) / r.width) * 2 - 1, -(((sy - r.top) / r.height) * 2 - 1));
      // villagers: forgiving screen-space test on their torso
      let best: Npc | null = null, bd = 38;
      for (const n of npcs) {
        tmp.set(n.x / TS, heightAtUnits(n.x / TS, n.y / TS) + 0.7, n.y / TS).project(camera);
        const d = Math.hypot(((tmp.x - ndc.x) * r.width) / 2, ((tmp.y - ndc.y) * r.height) / 2);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) return { kind: 'npc', id: best.def.id };
      ray.setFromCamera(ndc, camera);
      const sh = ray.intersectObjects(structures.children, true).find((i) => i.object.userData.stationId !== undefined);
      if (sh) return { kind: 'station', id: sh.object.userData.stationId };
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      return { kind: 'ground', wx: hit.x * TS, wy: hit.z * TS };
    },
  };
}

