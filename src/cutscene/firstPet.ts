// The first-pet scene: a short, soft moment at the Pet Nook right after the player adopts a kitten or puppy. Mimsy
// wanders over, yawns, and welcomes the new friend by name. It plays once per save ('first-pet' in seenCutscenes;
// watched or skipped both count) and pays nothing: the journal goal "A Little Friend" is paid by adoptPet itself.
// Preview any time with ?cutscene=first-pet. A preview never marks seen and never touches the save: with no pet it
// borrows a stand-in kitten that only exists inside the scene; with a pet it just uses that pet.
import { bus } from '../bus';
import { VILLAGERS } from '../data';
import { npcs, type Npc } from '../npc';
import type { PetPose } from '../pet';
import { PET_COATS, type PetKind } from '../petData';
import { sceneActive } from '../render/stage';
import { hasSeenCutscene } from '../save';
import { state } from '../state';
import { isPanelOpen } from '../ui/dom';
import { TS } from '../world';
import { isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from './runner';

export const FIRST_PET_ID = 'first-pet';
let playing = false;
let pending = 0;

/** The Pet Nook is tile (26, 49). The friend sits just south of the basket, the player beside her. */
const SPOT = { x: 26.6, z: 50.4 };
const PLAYER_AT = { x: 25.3, z: 50.7 };
const MIMSY_FROM = { x: 21.6, z: 51.0 };
const MIMSY_TO = { x: 24.1, z: 50.9 };
const HEAD = -0.75; // faces the player, a little toward the camera

/** Called right after a real adoption (the adopt panel is already closing). Waits for a clear screen, then plays once. */
export function queueFirstPet() {
  if (pending || playing || hasSeenCutscene(FIRST_PET_ID)) return;
  let tries = 0;
  const go = () => {
    pending = 0;
    if (playing || hasSeenCutscene(FIRST_PET_ID) || !state.pet) return;
    if (isPanelOpen() || sceneActive() || isRunnerPlaying()) { if (++tries < 120) pending = window.setTimeout(go, 1000); return; }
    startFirstPet();
  };
  pending = window.setTimeout(go, 900);
}

/** Mimsy usually naps by the café; she is borrowed for the scene when she is not on the island list, and put back after. */
function inviteMimsy(): () => void {
  if (npcs.some((n) => n.def.id === 'mimsy')) return () => {};
  const def = VILLAGERS.find((v) => v.id === 'mimsy');
  if (!def) return () => {};
  const x = MIMSY_FROM.x * TS, y = MIMSY_FROM.z * TS;
  const n: Npc = { def, x, y, tx: x, ty: y, wait: 2, facing: 'right', moving: false, busy: false };
  npcs.push(n);
  return () => { const i = npcs.indexOf(n); if (i >= 0) npcs.splice(i, 1); };
}

/** Play it. `onDone` runs once the scene is over (screen covered). Returns false if it could not start. */
export function startFirstPet(onDone?: () => void, preview = false): boolean {
  if (playing || isRunnerPlaying()) return false;
  // A real play needs the pet just adopted. A preview with no pet borrows a stand-in that never touches the save.
  const real = state.pet;
  if (!real && !preview) return false;
  const friend = real
    ? { kind: real.kind as PetKind, name: real.name, coat: real.coat, head: real.worn.head, body: real.worn.body }
    : { kind: 'kitten' as PetKind, name: 'Mochi', coat: PET_COATS[0].id, head: null, body: null };
  const { name } = friend;
  const kindWord = friend.kind === 'kitten' ? 'kitten' : 'puppy';

  playing = true;
  const leave = inviteMimsy();
  let mode: PetPose['mode'] = 'idle', modeAt = 0;
  const setMode = (m: PetPose['mode'], c: RunnerCtx) => { mode = m; modeAt = c.tt; };
  const hearts = () => bus.emit('petHearts', { x: SPOT.x * TS, y: SPOT.z * TS });
  const joy = (c: RunnerCtx) => { setMode('happy', c); hearts(); c.fx('twinkle', SPOT, 0.7); };

  const beats: Beat[] = [
    { type: 'shot', look: [SPOT.x - 0.9, 0.55, SPOT.z - 0.2], pos: [SPOT.x + 1.8, 1.9, SPOT.z + 4.4], dur: 2.6, wait: false },
    { type: 'wait', sec: 1.1 },
    { type: 'call', fn: (c) => { joy(c); } },
    { type: 'sfx', name: 'gift' },
    { type: 'emote', who: 'player', kind: 'hop', dur: 0.7 },
    { type: 'wait', sec: 1.3 },
    { type: 'call', fn: (c) => setMode('sit', c) },
    { type: 'walk', who: 'mimsy', to: MIMSY_TO, speed: 1.6 },
    { type: 'face', who: 'mimsy', at: SPOT },
    { type: 'say', who: 'mimsy', text: `*yawn* Oh! Hello, sunbeam. Is that a little ${name} curled up so snug in the basket?`, wide: true, on: (c) => c.hop(0.5) },
    { type: 'say', who: 'mimsy', text: `A ${kindWord} with a name like ${name}. Every nap on this island just got twice as cozy.` },
    { type: 'call', fn: (c) => joy(c) },
    { type: 'sfx', name: 'pickup' },
    { type: 'say', who: 'mimsy', text: `Look at that wiggle. I think ${name} already decided you are their favorite person.` },
    { type: 'face', who: 'mimsy', at: 'player' },
    { type: 'say', who: 'mimsy', text: 'Take your time getting to know each other. A pat, a snack, a nap, and again. I will be on my sunny seat if you need me.' },
    { type: 'fx', fx: 'welcome', at: SPOT, y: 0.6 },
    { type: 'wait', sec: 0.9 },
  ];

  const ok = playCutscene({
    id: FIRST_PET_ID, preview, beats,
    player: { x: PLAYER_AT.x, z: PLAYER_AT.z, facing: 'right' },
    timing: { lead: 1.2, endHold: 0.7 },
    setup(c) {
      // Mimsy starts a little way off (c.point registers her so the runner puts her back afterwards)
      c.point('mimsy');
      const n = npcs.find((m) => m.def.id === 'mimsy');
      if (n) { n.x = n.tx = MIMSY_FROM.x * TS; n.y = n.ty = MIMSY_FROM.z * TS; n.moving = false; n.facing = 'right'; }
    },
    pet: (c) => ({
      x: SPOT.x * TS, y: SPOT.z * TS, heading: HEAD, mode, speed: 0, modeT: c.tt - modeAt,
      kind: friend.kind, coat: friend.coat, head: friend.head, body: friend.body,
    }),
    onFinish() { playing = false; leave(); },
    onDone,
  });
  if (!ok) { playing = false; leave(); }
  return ok;
}
