// Three.js world: renderer, camera rig, lights, picking, and per-frame sync with game state.
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import type { Look } from '../clothes/types';
import { bus } from '../bus';
import { VILLAGERS } from '../data';
import { npcs, type Npc } from '../npc';
import type { Season } from '../time';
import { MAP_H, MAP_W, TS } from '../world';
import { createPlayerMesh, createVillagerMesh, type ActorMesh } from './actors';
import { createDynamic } from './dynamic';
import { createLightRig } from './lighting';
import { PALETTE } from './materials';
import { createBeach } from './beach';
import { celebrate, confettiAt, welcomeAt, welcomeTrickle } from './celebrate';
import { createNature } from './nature';
import { createParticles } from './particles';
import { createPost } from './post';
import { createStructures } from './structures';
import { createTerrain, heightAtUnits } from './terrain';

export interface FrameInput {
  t: number;
  dt: number;
  hour: number;
  season: Season;
  player: { x: number; y: number; facing: Facing; moving: boolean; running?: boolean; surface?: 'sand' | 'path' | 'grass' };
  /** What the player is wearing (or trying on). */
  look: Look;
  /** Worn accessory item id (see boutique.currentAccessory). Omitted = none. */
  accessory?: string | null;
  npcs: Npc[];
  talkedToday(id: string): boolean;
}

export type Pick =
  | { kind: 'npc'; id: string }
  | { kind: 'station'; id: string }
  | { kind: 'ground'; wx: number; wy: number }; // world pixels (1 tile = TS)

// Camera: high three-quarter view. Offset is relative to the follow target, in tile units.
const CAM_BACK = 10;
const CAM_UP = 12; // slightly shallower pitch so rooftop shop signs stay in frame
const FOV = 36;
const MAX_DPR = 2;
const MAX_DPR_TOUCH = 1.5;

export interface World3D {
  resize(): void;
  render(f: FrameInput): void;
  pick(sx: number, sy: number, npcs: Npc[]): Pick | null;
  snapCamera(px: number, py: number): void;
  /** Nudge the camera (radians / zoom units). Yaw, pitch and zoom are clamped so it can't flip or enter the player. */
  orbit(dYaw: number, dTilt: number, dZoom: number): void;
  resetCamera(): void;
  /** Current (smoothed) yaw: 0 = camera south of the player looking north; + moves the camera east. */
  yaw(): number;
  /** For scripted scenes (main menu, cutscenes): add props here, and drive the camera with a Director. */
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  playerMesh: ActorMesh;
  villager(id: string): ActorMesh | undefined;
  /** While set, the director owns the camera (and may re-pose actors). Pass null to return to the follow camera. */
  setDirector(d: Director | null): void;
}

export interface Director {
  /** Called after actors are placed on the ground; move/rotate/hide them here. */
  stage?(f: FrameInput): void;
  /** Set camera.position + orientation, and `focus` to the point of interest (shadows and particles follow it). */
  shoot(camera: THREE.PerspectiveCamera, focus: THREE.Vector3, f: FrameInput): void;
}

const YAW_MAX = 1.0;
const TILT_MAX = 0.2; // +/- radians around the default pitch
const ZOOM_MIN = 0.6, ZOOM_MAX = 1.45;

export function createWorld3D(canvas: HTMLCanvasElement): World3D {
  // No canvas MSAA: the post stack renders into its own multisampled HDR target.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky); // sky + fog colors are driven by the light rig
  scene.fog = new THREE.Fog(PALETTE.sky, 45, 95);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 260);
  const rig = createLightRig(scene); // day/night key + fill, lamp point lights, glow materials
  const post = createPost(renderer, scene, camera); // HDR -> lamp/lantern bloom -> tone map

  const terrain = createTerrain();
  const nature = createNature();
  const beach = createBeach();
  const structures = createStructures();
  const dynamic = createDynamic();
  const particles = createParticles(); // after structures: reads the café steam vents
  scene.add(terrain.group, nature.group, beach, structures, dynamic.group, particles.group, celebrate.group);

  // A friend moving in (bus 'friendArrived', only from a live unlock, never a save restore): a burst of hearts at
  // their spot, then a gentle trickle for a few seconds so the welcome is still there if the camera is elsewhere.
  const trickle = { at: new THREE.Vector3(), left: 0, acc: 0 };
  bus.on('friendArrived', (id: string) => {
    const n = npcs.find((x) => x.def.id === id);
    const def = n?.def ?? VILLAGERS.find((v) => v.id === id);
    if (!def) return;
    const ux = n ? n.x / TS : def.home.x + 0.5, uz = n ? n.y / TS : def.home.y + 1;
    const at = new THREE.Vector3(ux, heightAtUnits(ux, uz) + 0.6, uz);
    welcomeAt(at);
    trickle.at.copy(at); trickle.left = 6; trickle.acc = 0;
  });

  // A region party hat was earned: confetti over the player.
  bus.on('partyHat', () => {
    const p = player.root.position;
    confettiAt(new THREE.Vector3(p.x, p.y + 0.8, p.z));
  });

  const player = createPlayerMesh();
  scene.add(player.root);
  const villagers = new Map<string, ActorMesh>();

  let seasonId = '';
  const target = new THREE.Vector3(48, 0, 46);
  const camPos = new THREE.Vector3();
  let aspect = 1;
  const actorY = new Map<ActorMesh, number>();
  let director: Director | null = null;

  function resize() {
    // cap the pixel ratio (lower on touch devices): the HDR MSAA target + bloom scale with it
    const dpr = Math.min(matchMedia('(pointer: coarse)').matches ? MAX_DPR_TOUCH : MAX_DPR, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    post.setSize(window.innerWidth, window.innerHeight, dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  // player-controlled camera offsets (smoothed toward their targets)
  const cam = { yaw: 0, yawT: 0, tilt: 0, tiltT: 0, zoom: 1, zoomT: 1 };
  const basePitch = Math.atan2(CAM_UP, CAM_BACK), baseDist = Math.hypot(CAM_UP, CAM_BACK);

  function placeCamera() {
    // pull back on narrow/portrait screens so the same amount of town fits
    const k = (aspect < 1 ? 1 + (1 - aspect) * 0.9 : 1) * cam.zoom;
    const pitch = basePitch + cam.tilt, d = baseDist * k;
    const horiz = Math.cos(pitch) * d;
    camPos.set(target.x + Math.sin(cam.yaw) * horiz, target.y + Math.sin(pitch) * d, target.z + Math.cos(cam.yaw) * horiz);
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
  const bufSize = new THREE.Vector2();

  return {
    resize,
    snapCamera(px, py) { target.set(px / TS, 0, py / TS); placeCamera(); },
    orbit(dYaw, dTilt, dZoom) {
      cam.yawT = Math.max(-YAW_MAX, Math.min(YAW_MAX, cam.yawT + dYaw));
      cam.tiltT = Math.max(-TILT_MAX, Math.min(TILT_MAX, cam.tiltT + dTilt));
      cam.zoomT = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoomT + dZoom));
    },
    resetCamera() { cam.yawT = 0; cam.tiltT = 0; cam.zoomT = 1; },
    yaw: () => cam.yaw,
    scene, camera, playerMesh: player,
    villager: (id) => villagers.get(id),
    setDirector(d) {
      director = d;
      if (!d) { player.root.visible = true; camera.clearViewOffset(); target.y = 0; }
    },
    render(f) {
      if (f.season.id !== seasonId) { seasonId = f.season.id; terrain.setSeason(f.season); nature.setSeason(f.season); particles.setSeason(f.season); }

      player.setLook(f.look);
      player.setAccessory(f.accessory ?? null);
      place(player, f.player.x, f.player.y);
      player.setFacing(f.player.facing, f.dt);
      player.animate(f.t, f.player.moving, !!f.player.running);
      particles.dust(f.dt, !!f.player.running, player.root.position, f.player.surface ?? 'grass');
      for (const [id, v] of villagers) v.root.visible = f.npcs.some((n) => n.def.id === id); // absent villagers (e.g. Nimbus by day) hide
      for (const n of f.npcs) {
        let v = villagers.get(n.def.id);
        if (!v) { v = createVillagerMesh(n.def); villagers.set(n.def.id, v); scene.add(v.root); }
        place(v, n.x, n.y);
        v.setFacing(n.facing, f.dt);
        v.animate(f.t, n.moving);
        v.setAlert?.(!f.talkedToday(n.def.id));
      }
      dynamic.update(f.t);
      nature.update(f.t, target.x, target.z);
      terrain.update(f.t);

      director?.stage?.(f);

      // follow cam (smoothed, clamped to the island)
      const tx = Math.max(6, Math.min(MAP_W - 6, f.player.x / TS)), tz = Math.max(6, Math.min(MAP_H - 6, f.player.y / TS - 1.2)); // look a touch ahead (north) of the player
      const k = 1 - Math.pow(0.001, f.dt);
      const ck = 1 - Math.pow(0.0005, f.dt);
      cam.yaw += (cam.yawT - cam.yaw) * ck; cam.tilt += (cam.tiltT - cam.tilt) * ck; cam.zoom += (cam.zoomT - cam.zoom) * ck;
      if (director) director.shoot(camera, target, f);
      else { target.x += (tx - target.x) * k; target.z += (tz - target.z) * k; placeCamera(); }
      // continuous (not bucketed) so dawn/dusk blend smoothly and the shadow frustum follows the camera
      rig.update(f.hour, target);
      const pxScale = renderer.getDrawingBufferSize(bufSize).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      particles.update(f.t, rig.night, target, pxScale, heightAtUnits);
      if (trickle.left > 0) {
        trickle.left -= f.dt; trickle.acc += f.dt;
        while (trickle.acc >= 0.3) { trickle.acc -= 0.3; welcomeTrickle(trickle.at); }
      }
      celebrate.update(f.dt, pxScale);
      post.render(rig.night);
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


let shared: World3D | null = null;
/** The one renderer for the page: gameplay, the main menu backdrop and cutscenes all draw through it. */
export function sharedWorld3D(canvas: HTMLCanvasElement): World3D {
  return (shared ??= createWorld3D(canvas));
}
