// Friend Moves In: once a friend reaches 8 hearts ("Dear friends", MOVE_IN_HEARTS in townHomeData.ts) they shyly ask to
// live in a little house of their own in town. A short scene shows the empty plot, the question, and the cottage
// appearing; afterwards the friend lives at its door (a runtime home override, VILLAGERS is untouched), a housewarming
// letter with a small gift lands in the mailbox, and the first time the Journal goal "A House for a Friend" is done.
//
// It plays once per friend, watched or skipped alike: the per-friend record is the optional save field `movedIn`
// (a list of villager ids). The runner also writes 'friend-moves-in' to seenCutscenes, but only as "this kind of scene
// has been seen"; nothing here reads it, so one entry never blocks the next friend. Scenes queue one at a time.
//
// Preview with ?cutscene=friend-moves-in (add &friend=<id>, default mimsy; Nimbus only walks about at dusk, so add
// &hour=20 for him). A preview shows a stand-in house and never sets movedIn, sends the letter, pays or marks anything.
import { bus, changed, toast } from '../bus';
import { VILLAGERS, type VillagerDef } from '../data';
import { dressing } from '../dressing';
import { hearts, metFriend, sendLetter } from '../friends';
import { hasTownHome, npcs, presentNpcs } from '../npc';
import { photo } from '../photo';
import { cancelPath, player, tileOf } from '../player';
import { bump } from '../quests';
import { sceneActive } from '../render/stage';
import { state } from '../state';
import { MOVE_IN_HEARTS, HOME_SIZE, TOWN_HOMES } from '../townHomeData';
import { setStandInHome, syncTownHomeBlocks, townHomeDoor } from '../townHomes';
import { TS } from '../world';
import { cutsceneParam } from './presets';
import { isRunnerPlaying, playCutscene, type Beat } from './runner';

export const FRIEND_MOVES_IN_ID = 'friend-moves-in';
let playing = false;
let pending = 0;
/** Quiet time between two real scenes, so a save with many dear friends is not a marathon. */
const GAP_MS = 30_000;
let gapUntil = 0;

const firstName = (def: VillagerDef) => def.name.split(' ')[0];

/** Friends who are ready to ask: met, at 8+ hearts, a house spot for them, and no house yet. */
export const friendsReadyToMoveIn = (): VillagerDef[] =>
  VILLAGERS.filter((v) => !!TOWN_HOMES[v.id] && metFriend(v) && !hasTownHome(v) && hearts(v.id) >= MOVE_IN_HEARTS);

/** The next friend whose scene can play right now (they have to be around: Nimbus waits for dusk). */
function nextDue(): VillagerDef | null {
  const here = new Set(presentNpcs().map((n) => n.def.id));
  return friendsReadyToMoveIn().find((v) => here.has(v.id)) ?? null;
}

/**
 * Watch for dear friends, once the game is up (called from startGame). Plays one scene at a time, only when the screen is
 * clear: no panel, no other scene, no photo mode, no fitting room. It keeps watching, so a friend who reaches 8 hearts
 * mid-play gets their scene a moment after the celebration. Does nothing under ?cutscene=.
 */
export function maybeStartFriendMovesIn(blocked: () => boolean) {
  if (cutsceneParam || pending) return;
  let since = 0;
  const tick = () => {
    pending = window.setTimeout(tick, 1500);
    if (playing || performance.now() < gapUntil) { since = 0; return; }
    if (blocked() || sceneActive() || isRunnerPlaying() || photo.active || dressing.active) { since = 0; return; }
    const next = nextDue();
    if (!next) { since = 0; return; }
    if (!since) since = performance.now();
    if (performance.now() - since < 2500) return; // let the heart celebration settle first
    since = 0;
    startFriendMovesIn(next.id);
  };
  pending = window.setTimeout(tick, 2600);
}

/** A real move-in: the one place that writes `movedIn`. Runs once the scene is over (watched or skipped). */
function completeMoveIn(def: VillagerDef) {
  const list = (state.movedIn ??= []);
  if (!list.includes(def.id)) list.push(def.id);
  syncTownHomeBlocks();
  const spec = TOWN_HOMES[def.id], door = townHomeDoor(def.id)!;
  // if she was standing on the plot, step her out front
  const me = tileOf();
  if (me.x >= spec.x && me.x < spec.x + HOME_SIZE && me.y >= spec.y && me.y < spec.y + HOME_SIZE) {
    player.x = (door.x + 1) * TS + TS / 2; player.y = door.y * TS + TS - 4;
    cancelPath();
  }
  // the friend now lives at the door
  const n = npcs.find((m) => m.def.id === def.id);
  if (n) { n.x = n.tx = door.x * TS + TS / 2; n.y = n.ty = door.y * TS + TS - 4; n.moving = false; n.facing = 'down'; n.wait = 2; }
  sendLetter(`${def.id}:movedin`, def.id);
  bump('movedin'); // the Journal goal, paid on the first friend only (a quest completes once)
  bus.emit('friendArrived', def.id);
  toast(`${firstName(def)} moved into ${spec.name}!`);
  changed();
}

/**
 * Play a friend's move-in scene. `onDone` runs once the scene is over (screen covered). Returns false if it could not
 * start. A real play needs a friend who is ready; a preview may show anyone and changes nothing.
 */
export function startFriendMovesIn(id: string, onDone?: () => void, preview = false): boolean {
  if (playing || isRunnerPlaying()) return false;
  const def = VILLAGERS.find((v) => v.id === id), spec = TOWN_HOMES[id];
  if (!def || !spec) return false;
  if (!preview && (!metFriend(def) || hasTownHome(def))) return false;

  playing = true;
  const name = firstName(def);
  // tiles: the cottage is centred on cx; the door row is the free row just below its south wall
  const cx = spec.x + 1.5, doorZ = spec.y + HOME_SIZE;
  const plot = { x: cx, z: spec.y + 1.5 };
  const FRIEND_FROM = { x: cx - 4.4, z: doorZ + 1.7 };
  const FRIEND_AT = { x: cx - 1.15, z: doorZ + 1.25 };
  const PLAYER_AT = { x: cx + 1.1, z: doorZ + 1.35 };

  const beats: Beat[] = [
    { type: 'shot', look: [cx, 0.9, spec.y + 2.0], pos: [cx + 2.4, 3.9, spec.y + 10.6], dur: 2.4, wait: false },
    { type: 'call', fn: (c) => c.fx('twinkle', plot, 0.5) },
    { type: 'wait', sec: 1.3 },
    { type: 'walk', who: id, to: FRIEND_AT, speed: 1.7 },
    { type: 'face', who: id, at: 'player' },
    { type: 'say', who: id, text: spec.ask[0], wide: true, on: (c) => c.hop(0.5) },
    { type: 'say', who: id, text: spec.ask[1] },
    { type: 'emote', who: 'player', kind: 'hop', dur: 0.7 },
    { type: 'wait', sec: 0.8 },
    { type: 'face', who: id, at: plot },
    { type: 'shot', look: [cx, 1.3, spec.y + 1.8], pos: [cx + 1.3, 2.7, spec.y + 7.4], dur: 2.2, wait: false },
    { type: 'call', fn: (c) => { setStandInHome(id); c.fx('welcome', plot, 1.0); c.fx('twinkle', plot, 2.1); } },
    { type: 'sfx', name: 'gift' },
    { type: 'wait', sec: 1.8 },
    { type: 'face', who: id, at: 'player' },
    { type: 'say', who: id, text: 'Oh... is that little house really for me?', on: (c) => c.hop(0.5) },
    { type: 'sfx', name: 'pickup' },
    { type: 'say', who: id, text: spec.thanks },
    { type: 'fx', fx: 'welcome', at: id, y: 0.9 },
    { type: 'wait', sec: 1.0 },
  ];

  const ok = playCutscene({
    id: FRIEND_MOVES_IN_ID, preview, beats,
    player: { x: PLAYER_AT.x, z: PLAYER_AT.z, facing: 'left' },
    timing: { lead: 1.2, endHold: 0.8 },
    setup(c) {
      // the friend starts a little way off (c.point registers them so the runner puts them back afterwards)
      c.point(id);
      const n = npcs.find((m) => m.def.id === id);
      if (n) { n.x = n.tx = FRIEND_FROM.x * TS; n.y = n.ty = FRIEND_FROM.z * TS; n.moving = false; n.facing = 'right'; }
    },
    onFinish() {
      playing = false;
      setStandInHome(null);
      if (preview) return;
      gapUntil = performance.now() + GAP_MS;
      completeMoveIn(def);
    },
    onDone,
  });
  if (!ok) { playing = false; setStandInHome(null); }
  return ok;
}
