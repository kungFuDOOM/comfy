// The First Pie cutscene: Brioche demonstrates making a pie crust at a little pop-up oven in front of the café. She
// rolls the dough, crimps the edge and plops in the filling; the oven door drops open, the pie hops in, and the camera
// sinks to the window to watch it brown before it pops out with a ding. It plays once per save (the 'first-pie' entry in save.ts seenCutscenes; watched or skipped both count) on whichever comes first:
// the first login while the Harvest Hush Feast is on (maybeStartFirstPie, called from game.ts), or the first time the
// player opens the pie-baking window (openPieBake, via startFirstPie with the window as `onDone`). Preview any time with
// ?cutscene=first-pie. It pays nothing and adds no save field. The props are plain meshes from pieStage.ts; whatever
// the scene stages (props, Brioche's stand-in if her meadow is locked) is handed back in onFinish, watched or skipped.
import { hourRamp, isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from '../cutscene/runner';
import { isEventActive } from '../events';
import { npcs } from '../npc';
import { sceneActive } from '../render/stage';
import { hasSeenCutscene } from '../save';
import { TS } from '../world';
import { BAKER_SPOT, NOOK, OVEN, PLAYER_POSE, TABLE, TABLE_TOP, backOut, clamp01, inviteBrioche, makeNook, smooth } from './pieStage';

export const FIRST_PIE_ID = 'first-pie';
let playing = false;
export const firstPiePlaying = () => playing;

/** Harvest Hush Feast is on and the lesson has not been watched (or skipped) yet. */
export const firstPieDue = () => !playing && !isRunnerPlaying() && !hasSeenCutscene(FIRST_PIE_ID) && isEventActive('harvest');

/** One boot check at a time: a second startGame (back from the menu) doesn't stack another chain of timers. */
let pending = 0;
/** Called a moment after the game opens: plays the lesson if it is due. Checks back a few times if something is up. */
export function maybeStartFirstPie(blocked: () => boolean) {
  if (pending) return;
  let tries = 0;
  const go = () => {
    pending = 0;
    if (playing || hasSeenCutscene(FIRST_PIE_ID) || !isEventActive('harvest')) return;
    if (blocked() || sceneActive() || isRunnerPlaying()) { if (++tries < 40) pending = window.setTimeout(go, 3000); return; }
    startFirstPie();
  };
  pending = window.setTimeout(go, 2600);
}

/** Warm afternoon light, sliding toward golden hour while the pie bakes. */
const hourAt = hourRamp(15.2, 16.8, 2, 40);

const ROLL = 3.2, CRIMP = 1.8, SLIDE = 1.1, POP = 0.75;
/** The pie's tilt behind the oven glass, so its top faces the camera. */
const TILT = 1.25;
const SHELF = { x: OVEN.x - 0.15, y: 0.92, z: OVEN.z + 0.05 };
const CHIMNEY = { x: OVEN.x + 0.36, y: 1.25, z: OVEN.z - 0.22 };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Play it. `onDone` runs once the scene is over (screen covered). Returns false if it could not start. */
export function startFirstPie(onDone?: () => void, preview = false): boolean {
  if (playing || isRunnerPlaying()) return false;
  playing = true;
  const leave = inviteBrioche();
  const nook = makeNook();
  const { dough, pin, pie, flour, steam, inside } = nook;
  let rollAt = -1, crimpAt = -1, fillAt = -1, slideAt = -1, outAt = -1, sparkled = false, puffAt = 0, bakeOut = 0;
  const rest = { x: pin.position.x, y: pin.position.y, z: pin.position.z };
  const puffFlour = (c: RunnerCtx, n: number) => flour.emit(c.tt, TABLE.x, TABLE_TOP + 0.08, TABLE.z, n, { spread: 0.45, rise: 0.18, life: 1.1, size: 0.8 });

  const beats: Beat[] = [
    { type: 'shot', look: [NOOK.x + 0.2, 0.7, NOOK.z], pos: [NOOK.x + 3.6, 2.5, NOOK.z + 5.4], dur: 3.4, wait: false },
    { type: 'walk', who: 'brioche', to: BAKER_SPOT, speed: 1.9 },
    { type: 'face', who: 'brioche', at: 'player' },
    { type: 'say', who: 'brioche', text: 'Oh, hello, hello! You came just in time. Pie season is the very best season, and every pie starts with the crust.', wide: true, on: (c) => c.hop(0.9) },
    // the crust demo, up close on the gingham table
    { type: 'face', who: 'brioche', at: { x: TABLE.x, z: TABLE.z } },
    { type: 'shot', look: [TABLE.x, 0.65, TABLE.z], pos: [TABLE.x + 0.9, 1.3, TABLE.z + 2.3], dur: 2.0, wait: false },
    { type: 'say', who: 'brioche', text: 'A little cold butter, a pinch of salt, and a very gentle hand. Watch me. Roll, roll, roll it round and round.' },
    { type: 'call', fn: (c) => { rollAt = c.tt; puffFlour(c, 8); } },
    { type: 'emote', who: 'brioche', kind: 'talk', dur: ROLL },
    ...Array.from({ length: 7 }, (_, i): Beat[] => [{ type: 'sfx', name: 'tick' }, ...(i === 3 ? [{ type: 'call', fn: (c: RunnerCtx) => puffFlour(c, 6) } as Beat] : []), { type: 'wait', sec: ROLL / 7 }]).flat(),
    { type: 'call', fn: (c) => { puffFlour(c, 10); c.fx('twinkle', { x: TABLE.x, z: TABLE.z }, TABLE_TOP + 0.2); } },
    { type: 'shot', look: [TABLE.x, TABLE_TOP, TABLE.z], pos: [TABLE.x + 0.45, 1.5, TABLE.z + 1.45], dur: 1.4, wait: false },
    { type: 'say', who: 'brioche', text: 'Now the pretty part. Pinch, pinch, pinch all the way around, like tiny waves on a pond.' },
    { type: 'call', fn: (c) => { crimpAt = c.tt; } },
    { type: 'emote', who: 'brioche', kind: 'talk', dur: CRIMP },
    ...Array.from({ length: 6 }, (): Beat[] => [{ type: 'sfx', name: 'tick' }, { type: 'wait', sec: CRIMP / 6 }]).flat(),
    { type: 'fx', fx: 'twinkle', at: { x: TABLE.x, z: TABLE.z }, y: TABLE_TOP + 0.3 },
    { type: 'say', who: 'brioche', text: 'Spoon in the pumpkin filling, plop! And three little cuts on top so the pie can breathe.', on: (c) => { fillAt = c.tt; } },
    { type: 'face', who: 'brioche', at: { x: OVEN.x, z: OVEN.z } },
    { type: 'say', who: 'brioche', text: 'In it goes! Come close, and mind the warm door.', on: (c) => c.hop(0.5) },
    // the oven close-up: the door drops open, the pie hops in, and the camera sinks to window height and creeps in
    { type: 'call', fn: (c) => { slideAt = c.tt; } },
    { type: 'sfx', name: 'open' },
    { type: 'shot', look: [OVEN.x, 0.45, OVEN.z + 0.3], pos: [OVEN.x + 0.9, 0.8, OVEN.z + 2.3], dur: 1.8, wait: false },
    { type: 'wait', sec: SLIDE + 0.35 },
    { type: 'sfx', name: 'tick' },
    { type: 'shot', look: [OVEN.x, 0.42, OVEN.z + 0.45], pos: [OVEN.x + 0.15, 0.55, OVEN.z + 1.3], dur: 6, wait: false },
    { type: 'wait', sec: 0.6 },
    { type: 'say', who: 'brioche', text: 'Now we wait. Patient bakers make the best pies. Peek through the little window. See the crust turning golden?' },
    { type: 'wait', sec: 0.6 },
    { type: 'fx', fx: 'welcome', at: { x: OVEN.x, z: OVEN.z + 0.45 }, y: 0.75 },
    { type: 'say', who: 'brioche', text: 'Mmm. Sniff sniff. Cinnamon and warm butter. That smell means it is nearly ready.', on: (c) => c.hop(0.5) },
    { type: 'wait', sec: 0.5 },
    // ding! the oven boings, the door drops and the pie hops out onto the oven top
    { type: 'call', fn: (c) => { bakeOut = bakeAt(c.tt); outAt = c.tt; } },
    { type: 'sfx', name: 'ding' },
    { type: 'shot', look: [OVEN.x - 0.1, 0.85, OVEN.z], pos: [OVEN.x + 1.5, 1.55, OVEN.z + 3.0], dur: 2.2, wait: false },
    { type: 'emote', who: 'brioche', kind: 'gasp', dur: 0.6 },
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 1.4 },
    { type: 'face', who: 'brioche', at: 'player' },
    { type: 'say', who: 'brioche', text: 'Golden and flaky! You try next. Press when the heart sits in the pink zone, and you will bake it perfectly. I believe in you.', wide: true, on: (c) => { c.fx('confetti', { x: SHELF.x, z: SHELF.z }, 1.3); c.hop(1.6); } },
    { type: 'sfx', name: 'pickup' },
    { type: 'wait', sec: 1.4 },
  ];

  /** How baked the pie is at time t: browns behind the glass, finishing when it comes out. */
  function bakeAt(t: number) {
    if (outAt >= 0) return lerp(bakeOut, 1, smooth((t - outAt) / 0.5));
    if (slideAt < 0) return 0;
    const s = t - slideAt - SLIDE;
    return s <= 0 ? 0 : 0.9 * (1 - Math.exp(-s / 3));
  }

  const ok = playCutscene({
    id: FIRST_PIE_ID, preview, beats,
    title: { name: 'A Pie Lesson with Brioche', sub: 'Harvest Hush Feast' },
    player: { x: PLAYER_POSE.x, z: PLAYER_POSE.z, facing: 'right' },
    hour: hourAt,
    setup(c) {
      c.world.scene.add(nook.root);
      // Brioche starts a few steps off to the café side (c.point registers her so the runner puts her back afterwards)
      c.point('brioche');
      const n = npcs.find((m) => m.def.id === 'brioche');
      if (n) { n.x = n.tx = (BAKER_SPOT.x + 2.2) * TS; n.y = n.ty = (BAKER_SPOT.z - 0.6) * TS; n.moving = false; n.facing = 'left'; }
    },
    stage(c) {
      const t = c.tt;
      let crust = 0, crimp = 0, filling = 0;
      // 1. rolling: the dough ball squashes flat into a crust disc while the pin rolls back and forth over it
      if (rollAt >= 0) {
        const s = t - rollAt, k = smooth(s / ROLL);
        dough.visible = s < ROLL * 0.4;
        const squish = 1 + 0.06 * Math.sin(s * 11) * (1 - k);
        const sy = (0.7 - 0.45 * k) / squish;
        dough.scale.set((1 + 0.8 * k) * squish, sy, (1 + 0.8 * k) * squish);
        dough.position.y = TABLE_TOP + 0.17 * sy; // it sits on the cloth as it flattens
        crust = smooth((s - ROLL * 0.2) / (ROLL * 0.8));
        const on = s < ROLL, dz = Math.sin(s * 5.5) * 0.2, under = dough.visible ? Math.max(0.06, 0.34 * sy) : 0.06;
        pin.position.set(on ? TABLE.x : rest.x, on ? TABLE_TOP + under + 0.05 : rest.y, on ? TABLE.z + dz : rest.z);
        pin.rotation.x = on ? -dz / 0.05 : 0; // it really rolls: the turn matches the distance travelled
      }
      // 2. crimping (each bump boings in), then the filling plops in
      if (crimpAt >= 0) crimp = clamp01((t - crimpAt) / (CRIMP * 0.9));
      if (fillAt >= 0) filling = clamp01((t - fillAt) / 0.55);
      // 3. into the oven: the door drops, the pie hops through it, tilts to face the glass, and the door shuts
      let heat = 0, open = 0, squash = 0;
      const g = pie.group;
      g.visible = true; g.scale.setScalar(1); g.rotation.set(0, 0, 0);
      g.position.set(TABLE.x, TABLE_TOP, TABLE.z);
      if (slideAt >= 0 && outAt < 0) {
        const s = t - slideAt, k = smooth((s - 0.2) / SLIDE);
        g.position.set(lerp(TABLE.x, inside.x, k), lerp(TABLE_TOP, inside.y, k) + Math.sin(k * Math.PI) * 0.4, lerp(TABLE.z, inside.z, k));
        g.scale.setScalar(lerp(1, 0.5, k));
        g.rotation.x = TILT * smooth((s - 0.2 - SLIDE * 0.5) / (SLIDE * 0.5));
        open = s < SLIDE + 0.2 ? smooth(s / 0.3) : 1 - smooth((s - SLIDE - 0.2) / 0.3);
        const baking = s - SLIDE - 0.4;
        heat = 0.15 + 0.7 * smooth(baking / 2.5) + (baking > 0 ? 0.05 * Math.sin(t * 7) : 0);
        // a wisp from the chimney now and then while it bakes
        if (baking > 0.6 && t - puffAt > 0.55) { puffAt = t; steam.emit(t, CHIMNEY.x, CHIMNEY.y, CHIMNEY.z, 1, { spread: 0.05, rise: 0.35, life: 1.7, size: 1.3 }); }
      }
      // 4. ding: the oven boings, the door drops and the pie hops out onto the oven top, steaming
      if (outAt >= 0) {
        const s = t - outAt, k = smooth((s - 0.15) / POP);
        squash = 0.1 * Math.sin(s * 16) * Math.exp(-s * 3.5);
        open = s < 0.9 ? smooth(s / 0.25) : 1 - smooth((s - 0.9) / 0.35);
        heat = 0.85 * (1 - smooth(s / 1.5)) + 0.05;
        g.position.set(lerp(inside.x, SHELF.x, k), lerp(inside.y, SHELF.y, k) + Math.sin(k * Math.PI) * 0.45 + (k >= 1 ? 0.015 * Math.sin(s * 2) : 0), lerp(inside.z, SHELF.z, k));
        g.rotation.x = TILT * (1 - k);
        g.rotation.y = s > 0.15 + POP ? (s - 0.15 - POP) * 0.6 : 0;
        g.scale.setScalar(lerp(0.5, 1.1, Math.min(1.15, backOut((s - 0.15) / POP))));
        if (!sparkled && s > 0.15 + POP) { sparkled = true; c.fx('twinkle', { x: SHELF.x, z: SHELF.z }, SHELF.y + 0.25); }
        if (s > 0.4 && t - puffAt > 0.28) { puffAt = t; steam.emit(t, g.position.x + (Math.random() - 0.5) * 0.2, g.position.y + 0.12, g.position.z + (Math.random() - 0.5) * 0.2, 1, { spread: 0.04, rise: 0.32, life: 1.3, size: 0.75 }); }
      }
      pie.setStage(crust, crimp, filling);
      pie.setBake(bakeAt(t));
      nook.setDoor(heat);
      nook.setDoorOpen(open);
      nook.setOvenSquash(squash);
      flour.update(t);
      steam.update(t);
    },
    onFinish() {
      playing = false;
      nook.dispose();
      leave();
    },
    onDone,
  });
  if (!ok) { playing = false; nook.dispose(); leave(); }
  return ok;
}
