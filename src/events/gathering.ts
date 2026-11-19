// The Christmas Eve (Dec 24) and Christmas Morning (Dec 25) scenes at the town tree. Same ids as ever ('christmas-eve' and
// 'christmas-day'), same triggers, same one-time reward; only the show is bigger.
//   Eve: dusk deepens to night while the friends wander up to a dark, waiting tree and you walk up to join them. Each one
//        makes a wish (the tree flickers a notch brighter), you make yours with your eyes closed (the screen dims), then a hushed count and the tree
//        blazes, with sparkles spiralling up it.
//   Morning: sunrise over a glowing tree. Mystery presents pop up under it, then every friend hands you a gift: it floats
//        over to you and lands in a growing pile. Confetti, a shared "Merry Christmas!" and a slow pull-back.
// Skippable (skipping still pays) and replayable (no second reward). The beat loop, UI and skip handling live in
// cutscene/runner.ts; this file keeps the script, the staging and the reward. Previews (?cutscene=) pay and flag nothing.
import * as THREE from 'three';
import { sfx } from '../audio';
import { toast } from '../bus';
import { bumpEvent, hasClaimed, isEventActive, setEventFlag } from '../events';
import { eventAttended } from '../friends';
import { presentNpcs } from '../npc';
import { hourRamp, playCutscene, type Beat, type RunnerCtx, type V3 } from '../cutscene/runner';
import { heightAtUnits } from '../render/terrain';
import { TS } from '../world';
import { GATHER_ORDER, GATHER_SPOTS, PLAYER_SPOT, TREE } from './twinkleLayout';
import { gatherKind, refreshGather } from './twinkleSeats';
import {
  DAY_CLOSE, DAY_END, DAY_GIFT, DAY_GROUP, DAY_OPEN, DAY_PRESENTS, DAY_WAKE, EVE_AFTER, EVE_ARRIVE, EVE_CLOSE, EVE_GROUP,
  EVE_OPEN, EVE_WISH, EVE_YOURS, THANKS_FALLBACK,
} from './twinkleText';
import { TWINKLE_TREE_NAME, setTwinkleTreeGlow } from './twinkleWorld';

let playing = false;
export const gatheringPlaying = () => playing;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const backOut = (x: number) => { const t = clamp01(x) - 1, k = 2.2; return 1 + t * t * ((k + 1) * t + k); };

function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

/** A present: a candy-coloured box with a ribbon cross and a little bow. Origin at its base. `w`/`h` scale it. */
function presentBox(body: string, ribbon: string, w = 1, h = 1): THREE.Group {
  const g = new THREE.Group(), inner = new THREE.Group(); // the scene animates g's scale, so the size lives on inner
  inner.scale.set(w, h, w); g.add(inner);
  const bm = new THREE.MeshLambertMaterial({ color: body }), rm = new THREE.MeshLambertMaterial({ color: ribbon });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), bm); box.position.y = 0.14;
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.352, 0.286, 0.07), rm); r1.position.y = 0.14;
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.286, 0.352), rm); r2.position.y = 0.14;
  const bowGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const b1 = new THREE.Mesh(bowGeo, rm), b2 = new THREE.Mesh(bowGeo, rm);
  b1.position.set(-0.05, 0.31, 0); b2.position.set(0.05, 0.31, 0);
  inner.add(box, r1, r2, b1, b2);
  return g;
}
const BODY = ['#ff8fb6', '#a8f0d0', '#ffd36e', '#bfe3f7', '#e56d9d', '#f7c9ff', '#ffb3a0', '#c9f2a8', '#ffe9f2', '#9fd8ff', '#ffc14d'];
const RIBBON = ['#ffffff', '#ff8fb6', '#ffffff', '#e56d9d', '#ffd36e', '#ffffff', '#ffffff', '#ff8fb6', '#e56d9d', '#ffffff', '#ff8fb6'];
/** Pile places under the tree on the camera's side (east), hand-placed between the presents the world already puts
 *  there in week 4 (twinkleWorld.ts) and clear of the player's spot. [x, z] from the trunk, then width / height scale. */
const PILE: [number, number, number, number][] = [
  [0.55, -0.1, 1.1, 1.0], [0.55, 0.65, 0.9, 1.15], [1.25, -0.75, 1.0, 0.85], // the three "already there" in the morning
  [1.15, 0.85, 1.05, 1.0], [1.0, -0.45, 0.85, 1.2], [0.6, 1.15, 1.0, 0.9], [0.35, -0.65, 0.9, 1.0],
  [1.0, 0.05, 0.8, 0.95], [0.95, -1.3, 1.1, 0.9], [-0.3, 1.05, 0.95, 1.1], [0.2, -1.2, 0.85, 1.0],
];
const SLOTS = PILE.length;
const slotPos = (i: number) => ({ x: TREE.x + PILE[i][0], z: TREE.z + PILE[i][1], yaw: 0.35 + i * 0.75 });
const MYSTERY = [0, 1, 2];

interface Gift { g: THREE.Group; slot: number; at: number; from: { x: number; z: number }; landed: boolean }

/** Play the gathering. `replay` = already attended: same scene, no second reward. `preview` = the ?cutscene= debug play: any day, no flags, no reward. */
export function startGathering(kind: 'eve' | 'day', replay = false, onDone?: () => void, preview = false) {
  refreshGather();
  if (playing || (!preview && gatherKind() !== kind)) return;
  playing = true;
  const eve = kind === 'eve';
  const cast = presentNpcs().map((n) => n.def.id);
  const spotOf = (id: string) => { const i = GATHER_ORDER.indexOf(id); return i >= 0 ? GATHER_SPOTS[i] : { x: TREE.x, z: TREE.z }; };
  /** The first of `ids` who is here, else anyone who is. */
  const pick = (ids: string[]) => ids.find((id) => cast.includes(id)) ?? cast[0];
  const say = (ids: string[], text: string, o: { wide?: boolean; on?: (c: RunnerCtx) => void } = {}): Beat[] => {
    const who = pick(ids);
    return who ? [{ type: 'say', who, text, wide: o.wide, on: o.on }] : o.on ? [{ type: 'call', fn: o.on }] : [];
  };
  /** A line in one friend's own voice: said by the first of `ids` who is here, or dropped (never put in someone else's mouth). */
  const flavor = (ids: string[], text: string, o: { wide?: boolean; on?: (c: RunnerCtx) => void } = {}): Beat[] =>
    ids.some((id) => cast.includes(id)) ? say(ids, text, o) : o.on ? [{ type: 'call', fn: o.on }] : [];
  /** Drop a little aside that names a friend who is not here today. */
  const mention = (text: string, id: string, aside: string) => (cast.includes(id) ? text : text.replace(aside, '').trim());
  const wishOrder = [...GATHER_ORDER.filter((id) => id !== 'mimsy' && cast.includes(id)), ...(cast.includes('mimsy') ? ['mimsy'] : [])];

  // ---- camera: shot beats move the runner's ease; `hold` is where the camera settles afterwards (and for wide lines) ----
  const aspect = typeof window !== 'undefined' && window.innerHeight ? window.innerWidth / window.innerHeight : 1.6;
  const narrow = aspect < 1.25 ? 1 + (1.25 - aspect) * 1.1 : 1;
  // Wide shots come from the east-south-east, over the open fountain side: from further south the cocoa stall (week 3 on,
  // just south of the tree) sits in the foreground and hides the friends on the south side of the arc.
  // The camera starts on each scene's opening establishing shot (held under the title card), then the first shot eases in.
  const open0: V3 = eve ? [9.0, 4.4, 4.6] : [7.6, 2.2, 4.4];
  const holdPos = new THREE.Vector3(TREE.x + open0[0] * narrow, open0[1] * (narrow > 1 ? 1 + (narrow - 1) * 0.6 : 1), TREE.z + open0[2] * narrow);
  const holdLook = new THREE.Vector3(TREE.x + 0.4, 1.4, TREE.z + 0.4);
  const cam = (look: V3, pos: V3, dur = 0, wait = false): Beat[] => {
    const p: V3 = [TREE.x + (pos[0] - TREE.x) * narrow, pos[1] * (narrow > 1 ? 1 + (narrow - 1) * 0.6 : 1), TREE.z + (pos[2] - TREE.z) * narrow];
    return [{ type: 'call', fn: () => { holdPos.set(...p); holdLook.set(...look); } }, { type: 'shot', look, pos: p, dur: dur || undefined, wait }];
  };

  // ---- staged pieces ----
  const root = new THREE.Group(); root.name = `christmas-${kind}`;
  const tex = glowTexture();
  const topY = heightAtUnits(TREE.x, TREE.z) + 1.75;
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd9a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  flash.position.set(TREE.x, topY, TREE.z); flash.renderOrder = 6; flash.visible = false;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: '#ffc98a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(TREE.x, heightAtUnits(TREE.x, TREE.z) + 0.07, TREE.z); ground.visible = false;
  root.add(flash, ground);

  // presents (morning): the mystery ones pop up under the tree, then each friend's gift flies in
  const boxes: THREE.Group[] = [];
  const placed = (i: number) => {
    const b = presentBox(BODY[i % BODY.length], RIBBON[i % RIBBON.length], PILE[i][2], PILE[i][3]), sp = slotPos(i);
    b.position.set(sp.x, heightAtUnits(sp.x, sp.z), sp.z); b.rotation.y = sp.yaw; b.visible = false;
    root.add(b); boxes[i] = b; return b;
  };
  if (!eve) for (let i = 0; i < SLOTS; i++) placed(i);
  const gifts: Gift[] = [];
  let mysteryAt = -1, giftSlots = [...Array(SLOTS).keys()].filter((i) => !MYSTERY.includes(i));
  const giveGift = (c: RunnerCtx, who: string) => {
    const slot = giftSlots.shift();
    if (slot === undefined) return;
    gifts.push({ g: boxes[slot], slot, at: c.tt, from: c.point(who), landed: false });
    sfx.pickup(); c.fx('twinkle', who, 1.5);
  };

  // tree glow: eased toward `glowGoal`, then the blaze takes over (Eve)
  let glowGoal = eve ? 0.1 : 1, glowNow = glowGoal, blazeAt = -1, blazeFrom = 0, pulseAt = -1;
  /** A wish lands: the tree flickers up and shivers, then settles a notch brighter than before. */
  const pulse = (c: RunnerCtx, goal: number) => { glowGoal = goal; pulseAt = c.tt; };
  let tree: THREE.Object3D | null = null;
  const inScene = (o: THREE.Object3D, sc: THREE.Object3D) => { let q: THREE.Object3D | null = o; while (q && q !== sc) q = q.parent; return q === sc; };
  const findTree = (sc: THREE.Scene) => {
    if (!tree || !inScene(tree, sc)) { if (tree) tree.scale.set(1, 1, 1); tree = sc.getObjectByName(TWINKLE_TREE_NAME) ?? null; }
    return tree;
  };
  const restore = () => { setTwinkleTreeGlow(1); if (tree) tree.scale.set(1, 1, 1); tree = null; };
  const dispose = () => {
    root.removeFromParent();
    root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
    tex.dispose();
  };

  /** Sparkles spiralling up the branches, hugging the cone, bottom to top. */
  const sparkles = (): Beat[] => Array.from({ length: 9 }, (_, i) => i).flatMap((i): Beat[] => {
    const y = 0.45 + i * 0.3, r = 0.2 + 1.0 * Math.max(0, 1 - y / TREE.height), a = i * 2.4;
    return [{ type: 'call', fn: (c) => c.fx('twinkle', { x: TREE.x + Math.cos(a) * r, z: TREE.z + Math.sin(a) * r }, y) }, { type: 'wait', sec: 0.16 }];
  });
  const faceTree = (): Beat[] => [...cast.map((id): Beat => ({ type: 'face', who: id, at: { x: TREE.x, z: TREE.z } })), { type: 'face', who: 'player', at: { x: TREE.x, z: TREE.z } }];
  const playerFrom = { x: PLAYER_SPOT.x + 4.6, z: PLAYER_SPOT.z + 1.4 }; // the tree-lighting approach, which clears the fountain
  /** Where a friend starts on Eve: out along their own line from the tree, except that the south-east place swings round
   *  to come up from the south, so nobody walks through the cocoa stall. */
  const startOf = (id: string) => {
    const s = spotOf(id);
    let a = Math.atan2(s.z - TREE.z, s.x - TREE.x);
    if (Math.cos(a) > 0.2 && Math.sin(a) > 0) a += 1.0;
    return { x: s.x + Math.cos(a) * 3.8, z: s.z + Math.sin(a) * 3.8 };
  };
  const nWish = Math.max(1, wishOrder.length);

  // ================= Christmas Eve: the walk-up =================
  const eveBeats = (): Beat[] => [
    ...cam([TREE.x + 0.4, 1.4, TREE.z + 0.3], [TREE.x + 7.0, 3.2, TREE.z + 3.3], 8),
    // the friends wander up out of the dusk, a few at a time, and you follow
    ...wishOrder.flatMap((id, i): Beat[] => [
      { type: 'walk', who: id, to: spotOf(id), speed: 1.9 + (i % 3) * 0.2, wait: false },
      { type: 'wait', sec: 0.3 },
    ]),
    { type: 'walk', who: 'player', to: PLAYER_SPOT, speed: 2.1 },
    { type: 'wait', sec: 0.6 },
    ...faceTree(),
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    ...say(['mimsy'], EVE_OPEN[0].text, { wide: true }),
    ...EVE_ARRIVE.flatMap((l) => flavor(l.who, l.text, { wide: true, on: (c) => c.hop(1.2) })),
    ...say(['mimsy'], mention(EVE_OPEN[1].text, 'tuppi', 'No peeking at the presents, Tuppi!'), { wide: true }),
    ...cam([TREE.x, 1.6, TREE.z], [TREE.x + 5.6, 3.1, TREE.z + 2.9], 3.5),
    // one wish each: the tree takes a little of every one, so it is glowing softly by the time it is your turn
    ...wishOrder.flatMap((id, i) => say([id], EVE_WISH[id] ?? THANKS_FALLBACK, {
      on: (c) => { pulse(c, 0.12 + 0.6 * ((i + 1) / nWish)); c.fx('twinkle', id, 1.6); sfx.tick(); },
    })),
    // your wish: the screen dims like closing your eyes, a sparkle, and when you open them the tree is brighter
    ...say(['mimsy'], mention(EVE_YOURS[0].text, 'tuppi', '(Tuppi, that includes you.)'), { wide: true }),
    ...cam([PLAYER_SPOT.x - 0.5, 1.0, PLAYER_SPOT.z - 0.1], [PLAYER_SPOT.x + 2.6, 1.9, PLAYER_SPOT.z + 2.4], 2.4, true),
    { type: 'fade', to: 0.55, dur: 0.8 },
    { type: 'call', fn: (c) => { c.fx('twinkle', 'player', 1.4); sfx.pickup(); } },
    { type: 'wait', sec: 1.0 },
    { type: 'call', fn: (c) => { pulse(c, 0.95); c.fx('twinkle', { x: TREE.x, z: TREE.z }, TREE.height - 0.3); c.fx('twinkle', 'player', 1.9); } },
    { type: 'fade', to: 0, dur: 0.9 },
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 0.5 },
    ...cam([TREE.x, 1.6, TREE.z], [TREE.x + 5.2, 2.8, TREE.z + 3.0], 2.2),
    ...flavor(EVE_YOURS[1].who, EVE_YOURS[1].text),
    // the hush (the lights dip, like a held breath), the count, the blaze
    ...cam([TREE.x, 1.7, TREE.z], [TREE.x + 4.2, 2.4, TREE.z + 2.6], 3.5),
    ...say(['mimsy'], EVE_GROUP[0].text, { wide: true, on: () => { glowGoal = 0.5; } }),
    { type: 'wait', sec: 0.9 },
    ...say(['mimsy'], EVE_GROUP[1].text, {
      wide: true,
      on: (c) => { blazeAt = c.tt; blazeFrom = glowNow; c.hop(2.6); sfx.partyHat(); c.fx('confetti', TREE, 1.4); c.fx('twinkle', TREE, TREE.height); c.fx('welcome', 'all'); },
    }),
    { type: 'sfx', name: 'unlock' },
    ...cam([TREE.x, 1.9, TREE.z], [TREE.x + 6.6, 3.4, TREE.z + 4.2], 2.6),
    ...sparkles(),
    { type: 'sfx', name: 'pickup' },
    ...cast.flatMap((id, i): Beat[] => [{ type: 'emote', who: id, kind: 'gasp', dur: 0.55 }, { type: 'wait', sec: i % 2 ? 0.09 : 0.13 }]),
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 0.6 },
    ...EVE_AFTER.flatMap((l) => flavor(l.who, l.text, { wide: true, on: (c) => c.fx('twinkle', 'player', 1.1) })),
    // a slow pull-back over the lit square
    ...cam([TREE.x, 2.0, TREE.z], [TREE.x + 7.6, 5.0, TREE.z + 5.0], 6),
    ...say([EVE_CLOSE.who], EVE_CLOSE.text, { wide: true, on: (c) => { c.hop(2.8); c.fx('welcome', 'all'); c.fx('confetti', TREE, 1.6); } }),
    { type: 'sfx', name: 'welcome' },
    { type: 'wait', sec: 1.6 },
  ];

  // ================= Christmas Morning =================
  const dayBeats = (): Beat[] => [
    ...cam([TREE.x + 0.2, 1.6, TREE.z], [TREE.x + 6.4, 3.4, TREE.z + 3.4], 8),
    { type: 'walk', who: 'player', to: PLAYER_SPOT, speed: 2.1 },
    { type: 'wait', sec: 0.6 },
    ...faceTree(),
    ...flavor(DAY_WAKE[0].who, DAY_WAKE[0].text, { wide: true, on: (c) => { c.hop(1.6); sfx.partyHat(); } }),
    ...say(['mimsy'], DAY_OPEN[0].text, { wide: true }),
    ...flavor(DAY_WAKE[1].who, DAY_WAKE[1].text, { wide: true }),
    // presents, overnight
    ...cam([TREE.x + 0.7, 0.55, TREE.z + 0.1], [TREE.x + 3.6, 2.0, TREE.z + 3.0], 2.4),
    ...say(DAY_PRESENTS[0].who, DAY_PRESENTS[0].text, {
      wide: true,
      on: (c) => { mysteryAt = c.tt; sfx.unlock(); for (const i of MYSTERY) c.fx('twinkle', { x: slotPos(i).x, z: slotPos(i).z }, 0.5); },
    }),
    { type: 'wait', sec: 0.6 },
    ...say(['mimsy'], DAY_OPEN[1].text, { wide: true }),
    ...cam([TREE.x + 0.4, 1.2, TREE.z], [TREE.x + 5.0, 2.6, TREE.z + 3.0], 2.6),
    // the gifts, one friend at a time, each floating over to you and landing in the pile
    ...wishOrder.flatMap((id) => say([id], DAY_GIFT[id] ?? THANKS_FALLBACK, { on: (c) => giveGift(c, id) })),
    // everyone together
    ...cam([TREE.x, 1.5, TREE.z], [TREE.x + 6.8, 3.4, TREE.z + 3.4], 2.8),
    ...say(['mimsy'], DAY_GROUP[0].text, { wide: true }),
    { type: 'wait', sec: 0.7 },
    ...say(['mimsy'], mention(DAY_GROUP[1].text, 'bramble', '(Even Bramble said it. I heard him. Everybody heard him.)'), {
      wide: true,
      on: (c) => { c.hop(); sfx.partyHat(); c.fx('confetti', TREE, 1.4); c.fx('twinkle', TREE, 1.4); c.fx('welcome', 'all'); },
    }),
    ...sparkles(),
    ...flavor(DAY_END[0].who, DAY_END[0].text, { wide: true, on: (c) => c.fx('twinkle', 'player', 1.2) }),
    // a slow pull-back over the square in the morning light
    ...cam([TREE.x, 1.9, TREE.z], [TREE.x + 7.6, 5.2, TREE.z + 5.2], 6),
    ...say([DAY_CLOSE.who], DAY_CLOSE.text, { wide: true, on: (c) => { c.fx('twinkle', TREE, TREE.height); c.fx('welcome', 'all'); } }),
    { type: 'sfx', name: 'welcome' },
    { type: 'wait', sec: 1.6 },
  ];

  const beats = eve ? eveBeats() : dayBeats();

  const ok = playCutscene({
    id: eve ? 'christmas-eve' : 'christmas-day', preview, beats,
    title: eve
      ? { name: 'Christmas Eve', sub: 'A hush falls over Sugarlily Square' }
      : { name: 'Christmas Morning', sub: 'Twinkle Season in Sugarlily Square' },
    player: { x: playerFrom.x, z: playerFrom.z, facing: 'left' },
    hour: eve ? hourRamp(17.4, 20.6, 2, 55) : hourRamp(6.3, 8.6, 2, 60),
    setup(c) {
      c.world.scene.add(root);
      findTree(c.world.scene);
      if (!eve) return;
      for (const id of wishOrder) { // the friends start out on the paths and walk up
        c.point(id); // registers them so the runner puts them back afterwards
        const n = presentNpcs().find((m) => m.def.id === id), s = startOf(id);
        if (!n) continue;
        n.x = n.tx = s.x * TS; n.y = n.ty = s.z * TS; n.moving = false; n.facing = 'left';
      }
    },
    stage(c, f) {
      const tt = c.tt;
      // tree glow: dark and waiting (Eve) / softly breathing (morning); the Eve blaze rises and settles to a bright glow
      let squash = 0, g: number;
      if (eve && blazeAt >= 0) {
        const s = tt - blazeAt;
        // rises from wherever the hush left it (no dip), peaks at full blaze, then settles to a bright breathing glow
        g = blazeFrom + (2 - blazeFrom) * smooth(s / 0.35) - 0.55 * smooth((s - 0.9) / 3.2) + 0.07 * Math.sin(s * 2.1) * smooth((s - 2) / 2);
        squash = s < 1.6 ? Math.exp(-s * 3.2) * Math.sin(s * 17) * 0.13 : 0;
        const k = Math.exp(-Math.max(0, s - 0.15) * 0.9);
        flash.visible = ground.visible = true;
        flash.material.opacity = 0.9 * smooth(s / 0.2) * k; flash.scale.setScalar(5.4 * (0.6 + 0.4 * backOut(s / 0.8)));
        (ground.material as THREE.Material).opacity = 0.5 * smooth(s / 0.4) * (0.45 + 0.55 * k); ground.scale.setScalar(5.2 + 1.2 * smooth(s / 1.5));
      } else {
        glowNow += (glowGoal - glowNow) * (1 - Math.exp(-f.dt * 3));
        g = glowNow + (eve ? 0 : 0.07 * Math.sin(tt * 1.7));
        if (pulseAt >= 0) { // a wish lands: a quick flicker up and a tiny happy shiver
          const s = tt - pulseAt;
          g += 0.32 * Math.exp(-s * 2.6) * smooth(s / 0.12);
          squash = s < 0.7 ? Math.exp(-s * 6) * Math.sin(s * 22) * 0.035 : 0;
        }
      }
      setTwinkleTreeGlow(g);
      const t3 = findTree(c.world.scene);
      if (t3) t3.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
      if (eve) return;
      // morning presents
      if (mysteryAt >= 0) {
        MYSTERY.forEach((i, k) => { const b = boxes[i], a = tt - mysteryAt - k * 0.25; b.visible = a > 0; b.scale.setScalar(0.01 + backOut(a / 0.6) * 0.99); });
      }
      for (const gf of gifts) {
        const a = tt - gf.at, b = gf.g, sp = slotPos(gf.slot);
        const gy = heightAtUnits(sp.x, sp.z), pl = c.point('player');
        const lift = { x: pl.x, y: heightAtUnits(pl.x, pl.z) + 1.7, z: pl.z };
        b.visible = true;
        if (a < 0.9) { // up and over to you
          const k = smooth(a / 0.9);
          b.position.set(gf.from.x + (lift.x - gf.from.x) * k, heightAtUnits(gf.from.x, gf.from.z) + 1.3 + (lift.y - 1.3) * k + Math.sin(k * Math.PI) * 0.5, gf.from.z + (lift.z - gf.from.z) * k);
          b.scale.setScalar(0.5 + 0.3 * k); b.rotation.y = a * 6;
        } else if (a < 1.6) { // a little hover, held up over you
          b.position.set(lift.x, lift.y + Math.sin((a - 0.9) * 6) * 0.05, lift.z); b.scale.setScalar(0.8); b.rotation.y = a * 3;
        } else if (a < 2.4) { // and down into the pile
          const k = smooth((a - 1.6) / 0.8);
          b.position.set(lift.x + (sp.x - lift.x) * k, lift.y + (gy - lift.y) * k + Math.sin(k * Math.PI) * 0.4, lift.z + (sp.z - lift.z) * k);
          b.scale.setScalar(0.8 + 0.2 * k); b.rotation.y = a * 3 + (sp.yaw - a * 3) * k;
        } else {
          b.position.set(sp.x, gy, sp.z); b.scale.setScalar(1); b.rotation.y = sp.yaw;
          if (!gf.landed) { gf.landed = true; c.fx('twinkle', { x: sp.x, z: sp.z }, 0.45); }
        }
      }
    },
    shoot(c, camera, focus, f) {
      const b = c.say;
      if (b && !b.wide) {
        // a three-quarter view of the speaker from the side, above the open fountain side where possible (never through the tree)
        const nr = camera.aspect < 1.25 ? 1 + (1.25 - camera.aspect) * 1.1 : 1;
        const spot = spotOf(b.who);
        const ox = spot.x - TREE.x, oz = spot.z - TREE.z, len = Math.hypot(ox, oz) || 1;
        let tx = -oz / len, tz = ox / len;
        if (tx < -0.3 || (Math.abs(tx) <= 0.3 && tz < 0)) { tx = -tx; tz = -tz; }
        // the look leans toward the tree and the camera stands a touch further back, so the tree stays in frame beside the
        // speaker (Eve: you see each wish brighten it; morning: you see the gift float off to the pile), even on a phone
        const wp = new THREE.Vector3(spot.x + tx * 3.7 * nr + (ox / len) * 0.8, 2.6 * nr, spot.z + tz * 3.7 * nr + (oz / len) * 0.8);
        const lean = eve ? 0.38 : 0.3;
        c.follow(camera, focus, f, wp, new THREE.Vector3(spot.x - ox * lean, eve ? 1.2 : 1.05, spot.z - oz * lean));
        return;
      }
      // everything else: wherever the last shot beat put the camera, with a slow drift so the square never feels frozen
      const wp = holdPos.clone(); wp.x += Math.sin(f.t * 0.23) * 0.35; wp.z += Math.cos(f.t * 0.19) * 0.3;
      c.follow(camera, focus, f, wp, holdLook);
    },
    onFinish({ skipped, completed }) {
      playing = false;
      restore(); dispose();
      if (preview) return;
      // Watching to the end and skipping both count as attending: the reward is never lost to a skip. It is paid once,
      // keyed on the milestone itself (not the `replay` hint), and only while the event is on so the flag never gets
      // set without the payout.
      const attended = completed || skipped;
      if (attended && isEventActive('twinkle')) eventAttended(`twinkle:${kind}`); // friends grow closer, once per gathering
      if (attended && !hasClaimed('twinkle', kind) && isEventActive('twinkle')) {
        bumpEvent('twinkle', kind, 1); // pays the finale milestone: pips, outfits and decor
        setEventFlag('twinkle', `${kind}Done`);
        toast(kind === 'eve' ? 'The tree is glowing! ✨ Check your wardrobe and bag for Eve gifts.' : 'Merry Christmas! 🎄 Check your wardrobe and bag for presents.');
        sfx.quest();
      } else if (attended && (replay || hasClaimed('twinkle', kind))) toast(kind === 'eve' ? 'What a lovely Eve. Merry Christmas! ✨' : 'What a lovely morning. Merry Christmas! 🎄');
    },
    onDone,
  });
  if (!ok) { playing = false; restore(); dispose(); }
}
