// The First Pie cutscene: Brioche demonstrates making a pie crust at a little pop-up oven in front of the café. She
// rolls the dough, crimps the edge, and the camera slips in close on the oven while the pie bakes golden. It plays once
// per save (the 'first-pie' entry in save.ts seenCutscenes; watched or skipped both count) on whichever comes first:
// the first login while the Harvest Hush Feast is on (maybeStartFirstPie, called from game.ts), or the first time the
// player opens the pie-baking window (openPieBake, via startFirstPie with the window as `onDone`). Preview any time with
// ?cutscene=first-pie. It pays nothing and adds no save field. The props are plain meshes from pieStage.ts; whatever
// the scene stages (props, Brioche's stand-in if her meadow is locked) is handed back in onFinish, watched or skipped.
import { hourRamp, isRunnerPlaying, playCutscene, type Beat } from '../cutscene/runner';
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

/** Called a moment after the game opens: plays the lesson if it is due. Checks back a few times if something is up. */
export function maybeStartFirstPie(blocked: () => boolean) {
  let tries = 0;
  const go = () => {
    if (playing || hasSeenCutscene(FIRST_PIE_ID) || !isEventActive('harvest')) return;
    if (blocked() || sceneActive() || isRunnerPlaying()) { if (++tries < 20) window.setTimeout(go, 3000); return; }
    startFirstPie();
  };
  window.setTimeout(go, 2600);
}

/** Warm afternoon light, sliding toward golden hour while the pie bakes. */
const hourAt = hourRamp(15.2, 16.8, 2, 30);

const ROLL = 3.2, CRIMP = 1.8, SLIDE = 1.1;
const DOOR = { x: OVEN.x, y: 0.4, z: OVEN.z + 0.6 };
const SHELF = { x: OVEN.x - 0.15, y: 0.92, z: OVEN.z + 0.02 };

/** Play it. `onDone` runs once the scene is over (screen covered). Returns false if it could not start. */
export function startFirstPie(onDone?: () => void, preview = false): boolean {
  if (playing || isRunnerPlaying()) return false;
  playing = true;
  const leave = inviteBrioche();
  const nook = makeNook();
  let rollAt = -1, crimpAt = -1, slideAt = -1, outAt = -1, sparkAt = -1;
  const rest = { x: nook.pin.position.x, y: nook.pin.position.y, z: nook.pin.position.z };

  const beats: Beat[] = [
    { type: 'shot', look: [NOOK.x + 0.2, 0.7, NOOK.z], pos: [NOOK.x + 3.6, 2.5, NOOK.z + 5.4], dur: 3.4, wait: false },
    { type: 'walk', who: 'brioche', to: BAKER_SPOT, speed: 1.9 },
    { type: 'face', who: 'brioche', at: 'player' },
    { type: 'say', who: 'brioche', text: 'Oh, hello, hello! You came just in time. Pie season is the very best season, and every pie starts with the crust.', wide: true, on: (c) => c.hop(0.9) },
    { type: 'shot', look: [TABLE.x, 0.7, TABLE.z], pos: [TABLE.x + 0.9, 1.3, TABLE.z + 2.4], dur: 2.2, wait: false },
    { type: 'say', who: 'brioche', text: 'A little cold butter, a pinch of salt, and a very gentle hand. Watch me. Roll, roll, roll it round and round.' },
    { type: 'call', fn: (c) => { rollAt = c.tt; } },
    ...Array.from({ length: 7 }, (): Beat[] => [{ type: 'sfx', name: 'tick' }, { type: 'wait', sec: ROLL / 7 }]).flat(),
    { type: 'say', who: 'brioche', text: 'Now the pretty part. Pinch, pinch, pinch all the way around, like tiny waves on a pond.' },
    { type: 'call', fn: (c) => { crimpAt = c.tt; } },
    ...Array.from({ length: 6 }, (): Beat[] => [{ type: 'sfx', name: 'tick' }, { type: 'wait', sec: CRIMP / 6 }]).flat(),
    { type: 'fx', fx: 'twinkle', at: { x: TABLE.x, z: TABLE.z }, y: TABLE_TOP + 0.3 },
    { type: 'say', who: 'brioche', text: 'Spoon in the pumpkin filling, and in it goes. Come close, and mind the warm door.' },
    // the oven close-up: the camera slides down to door height and creeps in while the pie bakes
    { type: 'call', fn: (c) => { slideAt = c.tt; } },
    { type: 'shot', look: [OVEN.x, 0.45, OVEN.z + 0.3], pos: [OVEN.x + 0.9, 0.8, OVEN.z + 2.3], dur: 1.8, wait: false },
    { type: 'wait', sec: SLIDE + 0.5 },
    { type: 'sfx', name: 'open' },
    { type: 'shot', look: [OVEN.x, 0.42, OVEN.z + 0.45], pos: [OVEN.x + 0.2, 0.6, OVEN.z + 1.35], dur: 5.5, wait: false },
    { type: 'say', who: 'brioche', text: 'Now we wait. Patient bakers make the best pies. Do you see the glow? That is the crust turning golden.' },
    { type: 'fx', fx: 'harvest', at: { x: OVEN.x + 0.36, z: OVEN.z - 0.22 }, y: 1.35 },
    { type: 'wait', sec: 1.0 },
    { type: 'fx', fx: 'welcome', at: { x: OVEN.x, z: OVEN.z + 0.3 }, y: 0.9 },
    { type: 'say', who: 'brioche', text: 'Mmm. Sniff sniff. Cinnamon and warm butter. That smell means it is nearly ready.', on: (c) => c.hop(0.5) },
    // the pie comes out
    { type: 'call', fn: (c) => { outAt = c.tt; sparkAt = c.tt; c.fx('twinkle', { x: SHELF.x, z: SHELF.z }, SHELF.y + 0.3); } },
    { type: 'sfx', name: 'ding' },
    { type: 'shot', look: [OVEN.x - 0.1, 0.8, OVEN.z], pos: [OVEN.x + 1.6, 1.5, OVEN.z + 3.1], dur: 2.4, wait: false },
    { type: 'emote', who: 'brioche', kind: 'gasp', dur: 0.6 },
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 1.2 },
    { type: 'say', who: 'brioche', text: 'Golden and flaky! You try next. Press when the heart sits in the pink zone, and you will bake it perfectly. I believe in you.', on: (c) => { c.fx('confetti', { x: SHELF.x, z: SHELF.z }, 1.3); c.hop(1.6); } },
    { type: 'sfx', name: 'pickup' },
    { type: 'wait', sec: 1.4 },
  ];

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
      const { dough, pin, pie } = nook;
      let crust = 0, crimp = 0, filling = false, bake = 0;
      // 1. rolling: the dough ball squashes flat into a crust disc while the pin rolls over it
      if (rollAt >= 0) {
        const s = t - rollAt, k = smooth(s / ROLL);
        dough.visible = s < ROLL * 0.35;
        dough.scale.set(1 + 0.8 * k, 0.7 - 0.45 * k, 1 + 0.8 * k);
        crust = smooth((s - ROLL * 0.2) / (ROLL * 0.8));
        const on = s < ROLL;
        pin.position.set(rest.x - (on ? 0.45 : 0), on ? TABLE_TOP + 0.2 : rest.y, on ? TABLE.z + Math.sin(s * 5.5) * 0.2 : rest.z);
        pin.rotation.x = on ? s * 9 : 0;
      }
      // 2. crimping, then the filling pops in
      if (crimpAt >= 0) {
        const s = t - crimpAt;
        crimp = clamp01(s / (CRIMP * 0.85));
        filling = s > CRIMP;
      }
      // 3. into the oven (shrinks away at the door), the door glowing hotter
      let door = 0.05;
      pie.group.visible = true;
      pie.group.scale.setScalar(1);
      pie.group.position.set(TABLE.x, TABLE_TOP, TABLE.z);
      if (slideAt >= 0) {
        const s = t - slideAt, k = smooth(s / SLIDE);
        pie.group.position.set(TABLE.x + (DOOR.x - TABLE.x) * k, TABLE_TOP + (DOOR.y - TABLE_TOP) * k + Math.sin(k * Math.PI) * 0.35, TABLE.z + (DOOR.z - TABLE.z) * k);
        pie.group.scale.setScalar(Math.max(0.01, 1 - 0.85 * smooth((s - SLIDE * 0.6) / (SLIDE * 0.4))));
        pie.group.visible = s < SLIDE;
        door = 0.35 + 0.5 * smooth(s / 2.5) + 0.06 * Math.sin(t * 7);
      }
      // 4. out again, golden brown, on the oven top with a happy pop
      if (outAt >= 0) {
        const s = t - outAt, k = backOut(s / 0.7);
        pie.group.visible = true;
        pie.group.position.set(SHELF.x, SHELF.y + 0.02 * Math.sin(s * 2), SHELF.z);
        pie.group.scale.setScalar(Math.max(0.01, k * 1.1));
        pie.group.rotation.y = s * 0.7;
        bake = 1;
        door = 0.85 * (1 - smooth(s / 1.2)) + 0.05;
        if (sparkAt >= 0 && s > 0.9 && s < 1.0) { c.fx('twinkle', { x: SHELF.x, z: SHELF.z }, SHELF.y + 0.25); sparkAt = -1; }
      }
      pie.setStage(crust, crimp, filling);
      pie.setBake(bake);
      nook.setDoor(door);
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
