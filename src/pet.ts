// Pet companion: the follow / idle / sit / sleep brain and the adopt / rename / dress actions.
// No rendering in here. The renderer only reads getPetPose() (see render/petMesh.ts), so the mesh can be
// reworked freely without touching any of these rules. Position is never saved: she respawns beside the player.
import { bus, changed, toast } from './bus';
import { presentNpcs } from './npc';
import { findPath, player } from './player';
import { spend } from './inventory';
import { saveGame } from './save';
import { state } from './state';
import { cleanPetName, coatById, PET_COATS, petItemById, type PetKind, type PetSlot } from './petData';
import { isWalkable, TS } from './world';

export type PetMode = 'walk' | 'idle' | 'sit' | 'sleep' | 'happy';

/** What the renderer needs for one frame. Heading is a yaw in radians: 0 = facing +z (south / toward the camera), +PI/2 = east. */
export interface PetPose {
  x: number; y: number; // world px, feet (same convention as the player)
  heading: number;
  mode: PetMode;
  /** 0..1 how fast she is travelling (1 = a full run). */
  speed: number;
  /** Seconds since the pet last changed mode; handy for transition animation. */
  modeT: number;
  kind: PetKind;
  coat: string;
  head: string | null;
  body: string | null;
}

// ---- tuning (px, px/s, s) ----
const FOLLOW_FAR = 54; // start following beyond this distance
const FOLLOW_NEAR = 36; // stop once this close
const TOO_CLOSE = 15; // standing on top of her: shuffle off to her heel
const HEEL = 30; // how far behind she trots
const WARP_DIST = 300; // farther than this (~9 tiles): warp to her side
const SIT_AFTER = 3.5; // seconds still before sitting
const SLEEP_AFTER = 12; // seconds still before curling up to sleep
const MAX_SPEED = 232;
const HALF = 5; // pet body half-width for tile collision

const pet = {
  active: false,
  x: 0, y: 0, vx: 0, vy: 0,
  heading: 0,
  path: [] as { x: number; y: number }[],
  repath: 0,
  following: false,
  still: 0,
  happy: 0,
  stuck: 0,
  mode: 'idle' as PetMode,
  modeT: 0,
  speed: 0,
};

const FACE_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

function blockedAt(x: number, y: number) {
  const l = Math.floor((x - HALF) / TS), r = Math.floor((x + HALF) / TS);
  const t = Math.floor((y - 6) / TS), b = Math.floor((y - 1) / TS);
  return !isWalkable(l, t) || !isWalkable(r, t) || !isWalkable(l, b) || !isWalkable(r, b);
}
const tileOfXY = (x: number, y: number) => ({ x: Math.floor(x / TS), y: Math.floor((y - 4) / TS) });

function lineClear(x0: number, y0: number, x1: number, y1: number) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
  for (let i = 1; i <= n; i++) if (blockedAt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

/**
 * The spot just behind (and a little to the side of) the player, where a well-behaved pet trots. In a tight spot
 * (fence, doorway, bridge) it tries her other sides; null when there is truly no room, so the pet waits instead of
 * pushing into the player (the old fallback was the player's own feet, which fought the personal-space nudge = jitter).
 */
function heel(): { x: number; y: number } | null {
  const f = FACE_VEC[player.facing];
  const spots = [
    [-f[0] * HEEL - f[1] * 12, -f[1] * HEEL + f[0] * 12], // behind, a little to the side
    [-f[0] * HEEL, -f[1] * HEEL], // straight behind
    [-f[1] * HEEL, f[0] * HEEL], // beside
    [f[1] * HEEL, -f[0] * HEEL], // other side
  ];
  for (const [ox, oy] of spots) {
    const hx = player.x + ox, hy = player.y + oy;
    if (!blockedAt(hx, hy) && lineClear(player.x, player.y, hx, hy)) return { x: hx, y: hy };
  }
  return null;
}

function setMode(m: PetMode) { if (pet.mode !== m) { pet.mode = m; pet.modeT = 0; } }

/** Put the pet on the nearest free tile beside the player (behind her, never on water / walls). Never leaves her missing. */
function warpToPlayer(fx = false) {
  const h = heel() ?? { x: player.x, y: player.y }, pt = tileOfXY(player.x, player.y);
  // prefer a tile she can see / walk to in a straight line, so the pet never lands behind a fence or across water
  let best: { x: number; y: number } | null = null, bd = Infinity;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const tx = pt.x + dx, ty = pt.y + dy;
    if (!isWalkable(tx, ty) || (dx === 0 && dy === 0)) continue;
    const cx = tx * TS + TS / 2, cy = ty * TS + TS - 4;
    if (blockedAt(cx, cy)) continue;
    const d = Math.hypot(cx - h.x, cy - h.y) + (lineClear(player.x, player.y, cx, cy) ? 0 : 1000);
    if (d < bd) { bd = d; best = { x: cx, y: cy }; }
  }
  const to = best ?? { x: player.x, y: player.y };
  if (fx) bus.emit('petPoof', { x: pet.x, y: pet.y });
  pet.x = to.x; pet.y = to.y; pet.vx = pet.vy = 0; pet.path = []; pet.stuck = 0; pet.following = false; pet.repath = 0;
  if (fx) bus.emit('petPoof', { x: pet.x, y: pet.y });
}

/** (Re)seat the pet beside the player. Call when gameplay starts or a save is (re)loaded. No-op without an adopted pet. */
export function resetPet() {
  pet.active = false;
  if (!state.pet) return;
  pet.active = true;
  pet.x = player.x; pet.y = player.y;
  warpToPlayer(false);
  pet.heading = Math.atan2(player.x - pet.x, player.y - pet.y);
  pet.still = 0; pet.happy = 0; pet.mode = 'idle'; pet.modeT = 0; pet.speed = 0;
}

function steerPoint(): { x: number; y: number } | null {
  const h = heel();
  if (h && lineClear(pet.x, pet.y, h.x, h.y)) { pet.path = []; return h; }
  if (lineClear(pet.x, pet.y, player.x, player.y)) {
    pet.path = [];
    // no free heel spot: close the gap, but never walk into her feet
    return !h && Math.hypot(player.x - pet.x, player.y - pet.y) < FOLLOW_NEAR ? null : { x: player.x, y: player.y };
  }
  const pt = tileOfXY(player.x, player.y);
  if (pet.repath <= 0 || !pet.path.length) {
    pet.repath = 0.7;
    const goals = [{ x: pt.x, y: pt.y }, { x: pt.x + 1, y: pt.y }, { x: pt.x - 1, y: pt.y }, { x: pt.x, y: pt.y + 1 }, { x: pt.x, y: pt.y - 1 }];
    pet.path = findPath(goals, { x: pet.x, y: pet.y }) ?? [];
  }
  while (pet.path.length && Math.hypot(pet.path[0].x - pet.x, pet.path[0].y - pet.y) < 5) pet.path.shift();
  return pet.path[0] ?? null;
}

export function updatePet(dt: number) {
  if (!state.pet) { pet.active = false; return; }
  if (!pet.active) resetPet();
  pet.modeT += dt;
  pet.repath -= dt;
  if (pet.happy > 0) pet.happy -= dt;

  const dx = player.x - pet.x, dy = player.y - pet.y, d = Math.hypot(dx, dy);
  const playerMoving = player.moving || player.path.length > 0;
  const pt = tileOfXY(pet.x, pet.y);

  // never lost: too far, or standing somewhere that became solid -> pop back beside her
  if (d > WARP_DIST || !isWalkable(pt.x, pt.y)) warpToPlayer(d > WARP_DIST);

  // follow / settle hysteresis
  if (d > FOLLOW_FAR || (!playerMoving && d < TOO_CLOSE)) pet.following = true;
  else if (d < FOLLOW_NEAR && !(!playerMoving && d < TOO_CLOSE)) pet.following = false;

  let wantVx = 0, wantVy = 0;
  if (pet.following && pet.happy <= 0) {
    const p = steerPoint();
    if (p) {
      const px = p.x - pet.x, py = p.y - pet.y, pd = Math.hypot(px, py);
      // catch up faster the farther behind she is; ease off on arrival
      const sp = Math.min(MAX_SPEED, Math.max(48, 50 + (d - FOLLOW_NEAR) * 1.7)) * Math.min(1, pd / 18);
      if (pd > 1) { wantVx = (px / pd) * sp; wantVy = (py / pd) * sp; }
    }
  }
  // gentle personal space: nudge away from the player and any villager that is too close
  // (the player's radius is wider than TOO_CLOSE so a parked pet always drifts clear instead of re-triggering a follow)
  const others = [{ x: player.x, y: player.y, r: TOO_CLOSE + 3 }, ...presentNpcs().map((n) => ({ x: n.x, y: n.y, r: 20 }))];
  for (const o of others) {
    const ox = pet.x - o.x, oy = pet.y - o.y, od = Math.hypot(ox, oy);
    if (od < o.r && od > 0.01) { wantVx += (ox / od) * (o.r - od) * 5; wantVy += (oy / od) * (o.r - od) * 5; }
  }
  // smooth the velocity so she eases in and out (no per-frame snapping)
  const k = 1 - Math.exp(-9 * dt);
  pet.vx += (wantVx - pet.vx) * k;
  pet.vy += (wantVy - pet.vy) * k;
  const sp = Math.hypot(pet.vx, pet.vy);
  if (sp < 3 && !wantVx && !wantVy) {
    pet.vx = pet.vy = 0;
    // wants to follow but has no route (e.g. she crossed somewhere the pet cannot): count it as stuck
    pet.stuck = pet.following && pet.happy <= 0 && d > 90 ? pet.stuck + dt : 0;
    if (pet.stuck > 2.2) warpToPlayer(true);
  }
  else {
    const mx = pet.vx * dt, my = pet.vy * dt, bx = pet.x, by = pet.y;
    if (!blockedAt(pet.x + mx, pet.y)) pet.x += mx;
    if (!blockedAt(pet.x, pet.y + my)) pet.y += my;
    const moved = Math.hypot(pet.x - bx, pet.y - by);
    pet.stuck = pet.following && moved < sp * dt * 0.25 ? pet.stuck + dt : Math.max(0, pet.stuck - dt);
    if (pet.stuck > 2.2 && d > 90) warpToPlayer(true); // wedged somewhere: skip to her side
    else if (pet.stuck > 0.6 && pet.repath < 0.35) pet.repath = 0; // try a fresh route (at most ~3x/s, not A* every frame)
  }
  pet.speed = Math.min(1, Math.hypot(pet.vx, pet.vy) / 192);

  // heading: face where she is going; when settled, look at the player
  let wantHeading = pet.heading;
  if (sp > 14) wantHeading = Math.atan2(pet.vx, pet.vy);
  else if (pet.mode !== 'sleep' && d > 4) wantHeading = Math.atan2(dx, dy);
  let dh = wantHeading - pet.heading;
  dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  pet.heading += dh * (1 - Math.exp(-(sp > 14 ? 11 : 4) * dt));

  // behaviour: walk / idle -> sit -> sleep; walking again (hers or the pet's) wakes her up
  if (sp > 14 || playerMoving || pet.following) pet.still = 0; else pet.still += dt;
  if (pet.happy > 0) setMode('happy');
  else if (sp > 14) setMode('walk');
  else if (pet.still > SLEEP_AFTER) setMode('sleep');
  else if (pet.still > SIT_AFTER) setMode('sit');
  else setMode('idle');
}

export function getPetPose(): PetPose | null {
  const s = state.pet;
  if (!s || !pet.active) return null;
  return { x: pet.x, y: pet.y, heading: pet.heading, mode: pet.mode, speed: pet.speed, modeT: pet.modeT, kind: s.kind, coat: s.coat, head: s.worn.head, body: s.worn.body };
}

// ---- interaction ----
export const hasPet = () => !!state.pet && pet.active;
export const petName = () => state.pet?.name ?? '';
export function petDistance(): number { return hasPet() ? Math.hypot(pet.x - player.x, pet.y - (player.y - 4)) : Infinity; }
export const petNear = (reach = 46) => petDistance() < reach;
export const petWorldPos = () => ({ x: pet.x, y: pet.y });

const PET_LINES: Record<PetKind, string[]> = {
  kitten: ['{n} purrs and bumps your hand ♡', '{n} blinks slowly. That means "I love you".', '{n} kneads the air with tiny paws ✿', '{n} flops over for a tummy rub!'],
  puppy: ['{n} wiggles from nose to tail ♡', '{n} gives a happy little "boof"!', '{n} spins in a circle of pure joy ✿', '{n} leans into your pats!'],
};
let lastLine = -1;

/** The short default interact: hearts, a happy hop and a cozy toast with the pet's name. */
export function petThePet() {
  const s = state.pet;
  if (!s || !pet.active || pet.happy > 1.3) return; // mashing the button: one pat at a time
  pet.happy = 1.7; pet.still = 0; pet.vx = pet.vy = 0; pet.path = [];
  pet.heading = Math.atan2(player.x - pet.x, player.y - pet.y);
  bus.emit('petHearts', { x: pet.x, y: pet.y });
  const lines = PET_LINES[s.kind];
  let i = Math.floor(Math.random() * lines.length);
  if (i === lastLine) i = (i + 1) % lines.length;
  lastLine = i;
  toast(lines[i].replace('{n}', s.name));
  bus.emit('petPetted');
}

// ---- adopt / rename / dress ----
export function adoptPet(kind: PetKind, rawName: string, coat: string): boolean {
  const name = cleanPetName(rawName);
  if (state.pet || !name) return false;
  state.pet = { kind, name, coat: PET_COATS.some((c) => c.id === coat) ? coat : PET_COATS[0].id, owned: [], worn: { head: null, body: null } };
  resetPet();
  bus.emit('petAdopted', { x: pet.x, y: pet.y });
  toast(`${name} the ${kind} is home with you ♡`);
  saveGame();
  changed();
  return true;
}

export function renamePet(rawName: string): boolean {
  const name = cleanPetName(rawName);
  if (!state.pet || !name) return false;
  state.pet.name = name;
  toast(`${name} likes their new name!`);
  saveGame();
  changed();
  return true;
}

export const petOwns = (id: string) => !!state.pet?.owned.includes(id);
export const petWearing = (id: string) => !!state.pet && (state.pet.worn.head === id || state.pet.worn.body === id);

export function buyPetItem(id: string): boolean {
  const item = petItemById(id), p = state.pet;
  if (!item || !p || p.owned.includes(id)) return false;
  if (!spend(item.price)) { toast('Not enough pips yet.'); return false; }
  p.owned.push(id);
  p.worn[item.slot] = id;
  toast(`${p.name} is wearing the ${item.name}! ✿`);
  bus.emit('petHearts', { x: pet.x, y: pet.y });
  saveGame();
  changed();
  return true;
}

/** Wear an owned accessory; wearing the one already on takes it off. */
export function wearPetItem(id: string) {
  const item = petItemById(id), p = state.pet;
  if (!item || !p || !p.owned.includes(id)) return;
  p.worn[item.slot] = p.worn[item.slot] === id ? null : id;
  changed();
}
export function takeOffPetItem(slot: PetSlot) {
  if (!state.pet) return;
  state.pet.worn[slot] = null;
  changed();
}

export { coatById };
