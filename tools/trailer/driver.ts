// Trailer director: stages scripted shots in the live game world, one frame at a time.
// Loaded into the dev build by tools/trailer/capture.cjs (never shipped with the game).
// Every shot is a pure function of its local time, so frames can be rendered in any order or in parallel.
import * as THREE from 'three';
import { NODES } from '../../src/data';
import { resolveLook } from '../../src/wardrobe';
import type { Slot } from '../../src/clothes/types';
import { confettiAt, twinkleAt, harvestAt } from '../../src/render/celebrate';
import { SEATS, SEAT_ORDER, PLAYER_SEAT, TABLE_CENTER } from '../../src/events/harvestLayout';
import { GATHER_ORDER, GATHER_SPOTS, PLAYER_SPOT, TREE } from '../../src/events/twinkleLayout';
import { celebrate, Shape } from '../../src/render/celebrate';
import { heightAtUnits } from '../../src/render/terrain';
import { state } from '../../src/state';
import { npcs, syncNpcs, updateNpcs, type Npc } from '../../src/npc';
import { getWorld } from '../../src/render/stage';
import { createBalloon, type Balloon } from '../../src/render/balloon';
import { bus } from '../../src/bus';
import { SEASONS, type Season } from '../../src/time';
import { BARRIERS } from '../../src/areas';
import { TS, setBarrierOpen } from '../../src/world';
import { flyers } from '../../src/lanterns';
import type { Director, FrameInput } from '../../src/render/world3d';
import type { Facing } from '../../src/art/characters';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const season = (id: string): Season => SEASONS.find((s) => s.id === id)!;

interface Actor { x: number; z: number; facing?: Facing; moving?: boolean; running?: boolean; rot?: number; hide?: boolean; y?: number }
interface Pose {
  player: Actor;
  /** Villager overrides by id (position in tile units). Others wander or stay home. */
  cast?: Record<string, Actor>;
  outfit?: string;
  /** A full look (overrides `outfit`). */
  look?: Partial<Record<Slot, string>>;
}
interface Shot {
  id: string;
  dur: number;
  hour: number | ((t: number) => number);
  season: string;
  fog?: [number, number];
  /** Camera position + look target at local time t (0..dur). */
  cam(t: number): { pos: THREE.Vector3; look: THREE.Vector3; fov?: number };
  pose(t: number): Pose;
  /** Extra per-frame staging (balloons, bursts). `step` is called once per rendered frame with the frame's dt. */
  extra?(t: number, dt: number, f: FrameInput): void;
  /** Villagers in the shot (ids). Default: everyone who lives on the island. */
  who?: string[];
  /** Barriers forced closed for this shot (opened again at their scripted moment). */
  closed?: string[];
  /** URL query the page must be loaded with (seasonal events read ?event= / ?date= at load). */
  query?: string;
}

// ---------- shared props ----------
let balloon: Balloon | null = null;
const lanternSwarm = (() => {
  const group = new THREE.Group();
  const N = 26;
  const tints = ['#ffc7a6', '#ff9ec0', '#d3b4f0', '#a9ecd2', '#fff0d6', '#c9efb4'];
  const geo = new THREE.CylinderGeometry(0.2, 0.16, 0.38, 12);
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(tints[i % tints.length]).multiplyScalar(1.6), toneMapped: true }));
    meshes.push(m); group.add(m);
  }
  const h = (n: number) => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
  return {
    group,
    /** Lanterns rising from a centre point, released one by one from `t = 0`. */
    update(t: number, cx: number, cz: number, spread: number, rate = 0.45, y0 = 1) {
      meshes.forEach((m, i) => {
        const born = i * rate;
        const life = t - born;
        m.visible = life > 0;
        if (!m.visible) return;
        const a = h(i + 3) * Math.PI * 2, r = spread * (0.25 + h(i + 9) * 0.75);
        m.position.set(cx + Math.cos(a) * r * Math.min(1, life * 0.25) + Math.sin(life * 0.7 + i) * 0.25,
          y0 + life * (0.55 + h(i + 21) * 0.3) + Math.sin(life * 1.3 + i) * 0.08,
          cz + Math.sin(a) * r * Math.min(1, life * 0.25));
        m.rotation.y = life * 0.4 + i;
        m.scale.setScalar(Math.min(1, life * 1.6) * (0.85 + h(i + 5) * 0.4));
      });
    },
  };
})();

function walk(path: [number, number][], t: number, speed: number, end: Facing = 'down'): Actor {
  // constant-speed walk along a polyline (tile units); stops at the end
  let d = t * speed;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (d <= len) {
      const k = d / len, dx = bx - ax, dz = bz - az;
      const facing: Facing = Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'left' : 'right') : dz < 0 ? 'up' : 'down';
      return { x: ax + dx * k, z: az + dz * k, facing, moving: true };
    }
    d -= len;
  }
  const [x, z] = path[path.length - 1];
  return { x, z, facing: end, moving: false };
}

// orbit helper: camera circling a point
function orbit(look: THREE.Vector3, yaw: number, pitch: number, dist: number) {
  const h = Math.cos(pitch) * dist;
  return { pos: V(look.x + Math.sin(yaw) * h, look.y + Math.sin(pitch) * dist, look.z + Math.cos(yaw) * h), look };
}

/** Two bars of the day theme (108 bpm): montage shots cut on the bar line. */
export const BAR2 = (60 / 108) * 8;


/** Named looks from the wardrobe catalogue (src/clothes). */
const LOOKS: Record<string, Partial<Record<Slot, string>>> = {
  cozy: { top: 'cream_knit', bottom: 'petal_skirt', shoes: 'rosy_mary_janes' },
  strawberry: { top: 'strawberry_milk_tee', bottom: 'strawberry_overalls', hat: 'strawberry_beret', shoes: 'rosy_mary_janes' },
  rose_cheetah: { dress: 'rose_cheetah', hat: 'pink_bow', shoes: 'spotted_flats', bag: 'cheetah_purse' },
  peony: { dress: 'peony_pinafore', hat: 'pink_bow', shoes: 'ballet_flats' },
  spotted_sun: { dress: 'sun_dress', hat: 'spotted_sun', bag: 'picnic_basket', shoes: 'ballet_flats' },
  cheetah_coat: { dress: 'cheetah_coat', hat: 'knit_bobble_beanie', shoes: 'snow_boots' },
  winter: { dress: 'snowberry_coat', hat: 'earmuff_fluffs', shoes: 'snow_boots', bag: 'heart_purse' },
  harvest: { dress: 'pumpkin_pop_dress', hat: 'baker_beret', shoes: 'rosy_mary_janes' },
  partyhat: { dress: 'gingham_sundress', hat: 'party_pond', shoes: 'ballet_flats', bag: 'daisy_tote' },
};
/** The runway: one look per half beat. */
const RUNWAY: Partial<Record<Slot, string>>[] = [
  { dress: 'midnight_lace_gown', hat: 'bat_wing_bow', shoes: 'platform_boots', bag: 'coffin_purse' },
  { dress: 'gingham_sundress', hat: 'flower_crown', shoes: 'ballet_flats', bag: 'picnic_basket' },
  { dress: 'fringe_dress', hat: 'cowboy_hat', shoes: 'cowboy_boots' },
  { dress: 'rosewater_gown', hat: 'rose_tiara', shoes: 'tea_party_heels' },
  { dress: 'hedgewitch_robe', hat: 'witch_hat', bag: 'potion_basket', shoes: 'platform_boots' },
  { dress: 'frog_onesie', hat: 'frog_hood', shoes: 'froggy_slippers' },
  { top: 'disco_halter', bottom: 'bell_bottoms', hat: 'sparkle_headband', shoes: 'disco_boots' },
  { dress: 'strawberry_smock', hat: 'strawberry_beret', bag: 'bunny_backpack', shoes: 'rosy_mary_janes' },
];
const BEAT = 60 / 108;
const runwayIndex = (t: number) => Math.min(RUNWAY.length - 1, Math.floor(t / BEAT));

const seatCast = () => Object.fromEntries(SEAT_ORDER.map((id, i): [string, Actor] => [id, { x: SEATS[i].x, z: SEATS[i].z, facing: SEATS[i].face }]));
/** Everyone round the tree, turned to the camera for a group photo. */
const treeCast = () => Object.fromEntries(GATHER_ORDER.map((id, i): [string, Actor] => [id, { x: GATHER_SPOTS[i].x, z: GATHER_SPOTS[i].z, facing: 'down' }]));

export const SHOTS: Shot[] = [
  // ---------------- ACT 1: the long sleep ----------------
  {
    id: 'frost-wide', dur: 5.5, hour: 22.5, season: 'snowfluff', fog: [40, 120],
    cam: (t) => { const k = t / 5.5; return orbit(V(50, 2, 22), 0.55 - k * 0.25, 0.5 - k * 0.06, 62 - k * 10); },
    pose: () => ({ player: { x: 0, z: 0, hide: true } }),
    who: [],
  },
  {
    id: 'frost-town', dur: 4.5, hour: 23, season: 'snowfluff',
    cam: (t) => { const k = t / 4.5; return { pos: V(45.2 + k * 3.5, 7.6 - k * 0.9, 50.5 - k * 1.5), look: V(48.2 + k * 1.5, 1.8, 37) }; },
    pose: () => ({ player: { x: 0, z: 0, hide: true } }),
    who: [],
  },
  {
    id: 'balloon', dur: 5, hour: 7.2, season: 'cocoa', fog: [50, 140],
    cam: (t) => { const k = t / 5; return { pos: V(62 - k * 4, 13 - k * 3, 76 - k * 9), look: V(lerp(53, 49, k), lerp(9, 6.5, k), lerp(62, 52, k)) }; },
    pose: () => ({ player: { x: 0, z: 0, hide: true } }),
    extra: (t, _dt, f) => {
      const k = t / 5;
      const b = balloon!;
      b.group.visible = true;
      b.group.position.set(lerp(55, 49.5, k), lerp(10.5, 6.8, k) + Math.sin(t * 1.1) * 0.15, lerp(66, 53, k));
      b.group.rotation.y = 0.9 - k * 0.6;
      b.animate(f.t, 1);
      const p = getWorld().playerMesh.root;
      p.visible = true;
      p.position.set(b.group.position.x, b.group.position.y + b.riderY, b.group.position.z);
      p.rotation.y = 0.2;
    },
    who: [],
  },
  // ---------------- TITLE ----------------
  {
    id: 'title-aerial', dur: 5.5, hour: 9.5, season: 'blossom', fog: [55, 150],
    cam: (t) => { const k = t / 5.5; return orbit(V(48, 1, 40), 0.25 + k * 0.22, 0.62 - k * 0.05, 40 - k * 4); },
    pose: () => ({ player: { x: 48, z: 41, facing: 'down' } }),
  },
  // ---------------- ACT 2: cozy life ----------------
  {
    id: 'cafe', dur: BAR2, hour: 10.5, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return { pos: V(46.8 - k * 1.4, 3.9 - k * 0.4, 45.2 - k * 1.4), look: V(41.8 - k * 0.3, 1.4, 35.2) }; },
    pose: (t) => ({ player: walk([[47, 39.6], [43.4, 38.3], [41.7, 36.9]], t, 1.45, 'up'), outfit: 'strawberry', cast: { mimsy: { x: 39.6, z: 37.1, facing: 'right' } } }),
  },
  {
    id: 'boutique', dur: BAR2, hour: 13, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return orbit(V(54.6, 0.9, 37.4), -0.25 + k * 0.5, 0.26, 5.6 - k * 0.6); },
    pose: (t) => ({ player: { x: 54.6, z: 37.6, facing: 'down', rot: -0.25 + (t / BAR2) * 0.5 + Math.PI * 2 * smooth(1.2, 2.6, t) }, outfit: 'rose_cheetah', cast: { zuzu: { x: 56.2, z: 37.4, facing: 'left' } } }),
  },
  {
    id: 'friends', dur: BAR2, hour: 15.5, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return { pos: V(lerp(41, 53, k), 2.6, 41.8), look: V(lerp(41, 53, k), 0.8, 37.6) }; },
    pose: () => ({
      player: { x: 50.4, z: 38.4, facing: 'down' }, outfit: 'peony',
      cast: {
        bramble: { x: 39.6, z: 38.2, facing: 'down' }, mimsy: { x: 42.2, z: 38.1, facing: 'down' }, brioche: { x: 44.7, z: 38.3, facing: 'down' },
        oolie: { x: 47.2, z: 38.0, facing: 'down' }, tuppi: { x: 52.9, z: 38.2, facing: 'down' }, zuzu: { x: 55.3, z: 38.0, facing: 'down' },
        marlo: { x: 57.6, z: 38.3, facing: 'down' },
      },
    }),
    who: ['bramble', 'mimsy', 'brioche', 'oolie', 'tuppi', 'zuzu', 'marlo'],
  },
  {
    id: 'forage', dur: BAR2, hour: 11, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return orbit(V(34.4, 0.7, 36.2), 1.15 - k * 0.3, 0.36, 7.4 - k * 0.9); },
    pose: (t) => ({ player: walk([[32.0, 38.1], [34.5, 36.75]], t, 1.45, 'up'), outfit: 'spotted_sun' }),
    extra: (t) => { if (t >= 2.5 && !fired.has('pick')) { fired.add('pick'); gather(34, 35); } },
  },
  {
    id: 'fish', dur: BAR2, hour: 18.2, season: 'sunsip',
    cam: (t) => { const k = t / BAR2; return orbit(V(39.6, 0.5, 20.3), Math.PI - 0.45 + k * 0.25, 0.27, 6.4 - k * 0.8); },
    pose: () => ({ player: { x: 39.5, z: 20.75, facing: 'up' }, outfit: 'cozy', cast: { tuppi: { x: 42.3, z: 20.4, facing: 'left' } } }),
    extra: (t) => { if (t >= 2.6 && !fired.has('catch')) { fired.add('catch'); gather(39, 19); } },
  },
  {
    id: 'unlock', dur: BAR2, hour: 14, season: 'blossom', closed: ['meadowgate'],
    cam: (t) => { const k = t / BAR2; return orbit(V(77, 0.8, 39), -1.3 - k * 0.2, 0.42, 7.8 - k * 1.2); },
    pose: () => ({ player: { x: 74.8, z: 39.4, facing: 'right' }, outfit: 'peony', cast: { brioche: { x: 79.5, z: 39.2, facing: 'left' } } }),
    extra: (t) => {
      // the real unlock celebration: barriers.ts poofs the gate, world3d.ts throws the move-in party
      if (t >= 1.2 && !fired.has('unlock-pop')) { fired.add('unlock-pop'); bus.emit('areaUnlocked', 'meadow'); setBarrierOpen('meadowgate', true); }
      if (t >= 1.9 && !fired.has('unlock-welcome')) { fired.add('unlock-welcome'); bus.emit('friendArrived', 'brioche'); }
    },
  },
  {
    id: 'seasons', dur: BAR2, hour: 12, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return orbit(V(48, 1, 39.5), 0.1 + k * 0.12, 0.5, 21); },
    pose: () => ({ player: { x: 48, z: 41.5, facing: 'down' } }),
  },
  {
    id: 'runway', dur: BAR2, hour: 12.5, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return orbit(V(54.6, 0.95, 37.7), -0.12 + k * 0.24, 0.16, 4.3 - k * 0.5); },
    pose: (t) => ({ player: { x: 54.6, z: 37.7, facing: 'down', rot: -0.12 + (t / BAR2) * 0.24 + Math.sin(t * 11) * 0.06 }, look: RUNWAY[runwayIndex(t)], cast: { zuzu: { x: 56.4, z: 37.3, facing: 'left' } } }),
    extra: (t) => {
      const i = runwayIndex(t);
      if (i > 0 && !fired.has('rw' + i)) { fired.add('rw' + i); sparkle(V(54.6, heightAtUnits(54.6, 37.7) + 0.8, 37.7)); }
    },
  },
  {
    id: 'partyhat', dur: BAR2, hour: 16.2, season: 'blossom',
    cam: (t) => { const k = t / BAR2; return orbit(V(44.4, 0.9, 16.8), 0.1 + k * 0.25, 0.26, 5.6 - k * 0.6); },
    pose: () => ({ player: { x: 44.2, z: 16.9, facing: 'down' }, look: LOOKS.partyhat, cast: { tuppi: { x: 45.7, z: 16.6, facing: 'left' } } }),
    extra: (t) => {
      if (t >= 0.5 && !fired.has('confetti')) { fired.add('confetti'); confettiAt(V(44.2, heightAtUnits(44.2, 16.9) + 1.2, 16.9)); }
      if (t >= 1.6 && !fired.has('confetti2')) { fired.add('confetti2'); confettiAt(V(44.2, heightAtUnits(44.2, 16.9) + 1.2, 16.9)); }
    },
  },
  {
    id: 'harvest', dur: 5.5, hour: 17.5, season: 'cocoa', query: '?event=harvest&date=2026-11-25',
    cam: (t) => { const k = t / 5.5; return { pos: V(lerp(45.6, 46.6, k), lerp(6.4, 5.6, k), lerp(48.4, 47.4, k)), look: V(TABLE_CENTER.x - 0.4, 0.6, TABLE_CENTER.z - 0.2) }; },
    pose: () => ({ player: { x: PLAYER_SEAT.x, z: PLAYER_SEAT.z, facing: 'up' }, look: LOOKS.harvest, cast: seatCast() }),
    who: [...SEAT_ORDER],
    extra: (t) => { if (t >= 2.4 && !fired.has('leaves')) { fired.add('leaves'); harvestAt(V(TABLE_CENTER.x, 1.6, TABLE_CENTER.z)); } },
  },
  {
    id: 'twinkle', dur: 6.5, hour: 20.6, season: 'snowfluff', query: '?event=twinkle&date=2026-12-06', fog: [40, 110],
    cam: (t) => { const k = t / 6.5; return orbit(V(TREE.x + 0.2, 1.1, TREE.z + 0.2), 0.42 + k * 0.3, 0.46 - k * 0.04, 8.8 - k * 1.2); },
    pose: () => ({ player: { x: PLAYER_SPOT.x, z: PLAYER_SPOT.z + 0.4, facing: 'down' }, look: LOOKS.winter, cast: treeCast() }),
    who: [...GATHER_ORDER],
    extra: (t) => { if (t >= 2.2 && !fired.has('twinkle')) { fired.add('twinkle'); twinkleAt(V(TREE.x, TREE.height + 0.4, TREE.z)); } },
  },
  // ---------------- ACT 3: lanterns ----------------
  {
    id: 'grove', dur: 6, hour: (t) => lerp(18.4, 21.5, smooth(0, 6, t)), season: 'cocoa',
    cam: (t) => { const k = t / 6; return orbit(V(63, 1.7, 32.4), 0.3 - k * 0.3, 0.26 + k * 0.06, 9.5 - k * 1.2); },
    pose: () => ({ player: { x: 62.2, z: 34.2, facing: 'up' }, outfit: 'cheetah_coat', cast: { nimbus: { x: 64, z: 33.6, facing: 'up' } } }),
    extra: (t) => { lanternSwarm.group.visible = true; lanternSwarm.update(t, 62.6, 33.2, 2.2, 0.22, 1.2); },
  },
  {
    id: 'lighthouse', dur: 5, hour: 21.8, season: 'cocoa', fog: [60, 160],
    cam: (t) => { const k = t / 5; return { pos: V(lerp(55, 53.5, k), lerp(2.4, 4.4, k), lerp(16.5, 15.2, k)), look: V(50.4, lerp(2.6, 5.2, k), 7) }; },
    pose: () => ({ player: { x: 50.5, z: 10.2, facing: 'up' }, outfit: 'rose_cheetah', cast: { marlo: { x: 52, z: 9.6, facing: 'up' } } }),
    extra: (t) => { lanternSwarm.group.visible = true; lanternSwarm.update(t + 3, 50.5, 12, 6, 0.18, 0.5); },
  },
  {
    id: 'end', dur: 7, hour: 19.2, season: 'cocoa', fog: [55, 150],
    cam: (t) => { const k = t / 7; return orbit(V(48, 1, 38), 0.2 + k * 0.15, 0.48 + k * 0.04, 36 + k * 3); },
    pose: () => ({ player: { x: 48, z: 41, facing: 'down' }, outfit: 'rose_cheetah' }),
    extra: (t) => { lanternSwarm.group.visible = true; lanternSwarm.update(t + 6, 48, 39, 12, 0.25, 2); },
  },
];

/** A quick twinkle around the player for an outfit swap (light, so the new look shows straight away). */
function sparkle(at: THREE.Vector3) {
  celebrate.burst(at, { count: 16, colors: ['#ffffff', '#ffd9e8', '#fff3a8', '#c9a8ff'], shapes: [Shape.Star], spread: 0.55, speed: 1.6, up: 1.2, gravity: 0.8, size: [0.1, 0.18], life: [0.35, 0.55] });
}

/** The real gather beat: the node goes bare (it 'rests'), with a little sparkle pop where it was. */
function gather(x: number, y: number) {
  const n = NODES.find((v) => v.x === x && v.y === y);
  if (!n) return;
  state.nodes[n.id] = Date.now() + 600_000;
  const at = V(x + 0.5, heightAtUnits(x + 0.5, y + 0.5) + 0.7, y + 0.5);
  celebrate.burst(at, { count: 26, colors: ['#ffb3cf', '#fff3a8', '#c9f2e3', '#ffffff'], shapes: [Shape.Star, Shape.Heart], spread: 0.4, speed: 1.6, up: 2.6, gravity: 2.4, size: [0.14, 0.26], life: [0.8, 1.2], stagger: 0.1 });
}

const SEASON_CYCLE = ['blossom', 'sunsip', 'cocoa', 'snowfluff'];
const fired = new Set<string>();
let lastShot = '';
let lastT = 0;

function setupShot(s: Shot) {
  fired.clear();
  state.nodes = {};
  for (const b of BARRIERS) setBarrierOpen(b.id, !(s.closed ?? []).includes(b.id));
  balloon!.group.visible = false;
  lanternSwarm.group.visible = false;
  flyers.length = 0;
}

function present(s: Shot): Npc[] {
  const ids = s.who ?? npcs.map((n) => n.def.id).filter((id) => id !== 'nimbus' || (s.pose(0).cast ?? {}).nimbus);
  return npcs.filter((n) => ids.includes(n.def.id) || (s.pose(0).cast ?? {})[n.def.id]);
}

/** Prepare the world once: everything unlocked, every friend living on the island. */
export function setup() {
  const world = getWorld();
  for (const a of ['blossom', 'pond', 'meadow', 'lighthouse', 'farbeach']) state.unlocked[a] = true;
  state.seenIntro = true;
  syncNpcs();
  balloon = createBalloon();
  world.scene.add(balloon.group, lanternSwarm.group);
  for (let i = 0; i < 12; i++) state.lanterns.push({ id: 9000 + i, kind: (['serve', 'gift', 'decor', 'collect', 'outfit', 'garden'] as const)[i % 6], at: 0 });
  // tuck the gameplay HUD away (the canvas is what gets captured, but the DOM screenshot path stays clean too)
  document.body.classList.add('scene', 'scene-cutscene');
  return SHOTS.map((s) => ({ id: s.id, dur: s.dur, query: s.query ?? '' }));
}

/** Render shot `id` at local time `t` (seconds). Frames of a shot must be rendered in increasing t. */
export function render(id: string, t: number, fps = 24) {
  const world = getWorld();
  const s = SHOTS.find((x) => x.id === id)!;
  if (id !== lastShot || t < lastT) { setupShot(s); lastShot = id; lastT = -1 / fps; }
  const dt = Math.min(0.1, Math.max(0, t - lastT));
  lastT = t;
  const pose = s.pose(t);
  const cast = present(s);
  // villagers: scripted ones are pinned, the rest potter about
  for (const n of cast) {
    const o = pose.cast?.[n.def.id];
    if (o) { n.busy = true; n.x = o.x * TS; n.y = o.z * TS; n.facing = o.facing ?? 'down'; n.moving = !!o.moving; }
    else n.busy = false;
  }
  updateNpcs(dt);
  let sea = season(s.season);
  if (s.id === 'seasons') sea = season(SEASON_CYCLE[Math.min(3, Math.floor(t / (BAR2 / 4)))]);
  const hour = typeof s.hour === 'function' ? s.hour(t) : s.hour;
  const scene = world.scene;
  if (scene.fog instanceof THREE.Fog) { scene.fog.near = s.fog?.[0] ?? 45; scene.fog.far = s.fog?.[1] ?? 95; }
  const director: Director = {
    stage(f) {
      const p = world.playerMesh.root;
      p.visible = !pose.player.hide;
      if (pose.player.rot !== undefined) p.rotation.y = pose.player.rot;
      s.extra?.(t, dt, f);
    },
    shoot(camera, focus) {
      const c = s.cam(t);
      camera.fov = c.fov ?? 36;
      camera.updateProjectionMatrix();
      camera.position.copy(c.pos);
      camera.lookAt(c.look);
      focus.copy(c.look).setY(0);
    },
  };
  world.setDirector(director);
  const worn = { hat: null, top: null, bottom: null, dress: null, shoes: null, bag: null, face: null, ...(pose.look ?? LOOKS[pose.outfit ?? 'cozy']) } as Record<Slot, string | null>;
  const look = resolveLook(worn);
  world.render({
    t: 1000 + t, dt, hour, season: sea,
    player: { x: pose.player.x * TS, y: pose.player.z * TS, facing: pose.player.facing ?? 'down', moving: !!pose.player.moving, running: !!pose.player.running, surface: 'grass' },
    look, accessory: null, npcs: cast, talkedToday: () => true,
  });
}

