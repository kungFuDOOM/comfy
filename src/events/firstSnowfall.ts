// The First Snowfall cutscene: the first time you log in on or after Nov 27 (Twinkle Season's opening day) the square
// slips into a strawberry-milk dusk, the lamps and the light strings wake in a wave rolling out from the plaza, the town
// tree twirls up out of the cobblestones, the friends gasp, a single flake lands on someone's nose, and the snow begins.
// A soft white-out later the square is blanketed. Plays once per save (the 'first-snowfall' entry in save.ts
// seenCutscenes; watched or skipped both count) and can be previewed any time with ?cutscene=first-snowfall. It pays
// nothing: the tree's own decorating (twinkleTree.ts) and the gatherings (gathering.ts) are where the rewards live.
// The beat loop, UI and skip handling live in cutscene/runner.ts; the tree, the drifts, the light strings and the
// snow are the real ones from twinkleWorld.ts, held back until their beat (and always handed back in onFinish), and
// the ground stays autumn-green until the white-out (runner `seasonLook`; the next game frame goes snowy by itself).
import * as THREE from 'three';
import { sfx } from '../audio';
import { toast } from '../bus';
import { hourRamp, isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from '../cutscene/runner';
import { isEventActive } from '../events';
import { presentNpcs } from '../npc';
import { sceneActive } from '../render/stage';
import { heightAtUnits } from '../render/terrain';
import { hasSeenCutscene } from '../save';
import { SEASONS, today } from '../time';
import { TS } from '../world';
import { FAR_LAMPS, GATHER_ORDER, LAMPS, PLAYER_SPOT, ROAD_POSTS, TREE } from './twinkleLayout';
import { TWINKLE_DRIFTS_NAME, TWINKLE_TREE_NAME, setTwinkleLightWave, setTwinkleSnow } from './twinkleWorld';

export const FIRST_SNOWFALL_ID = 'first-snowfall';
let playing = false;
export const firstSnowfallPlaying = () => playing;

/** Local date on or after Nov 27 of the year, while Twinkle Season is on (that is when the tree and the snow exist). */
export function firstSnowfallDue(): boolean {
  if (playing || isRunnerPlaying() || hasSeenCutscene(FIRST_SNOWFALL_ID) || !isEventActive('twinkle')) return false;
  const d = today();
  return d.getMonth() + 1 > 11 || (d.getMonth() + 1 === 11 && d.getDate() >= 27);
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const backOut = (x: number) => { const t = clamp01(x) - 1, k = 1.9; return 1 + t * t * ((k + 1) * t + k); };

// ---- the light wave: rolls out from the plaza along the roads ----
const PLAZA = { x: 48, z: 41 };
const WAVE = { from: 3, to: 22, dur: 6.2, soft: 1.6 };
/** Wave radius (tiles) `s` seconds after it starts: unhurried near the plaza, racing off down the roads. */
const waveR = (s: number) => WAVE.from + (WAVE.to - WAVE.from) * Math.pow(clamp01(s / WAVE.dur), 1.6);
/** Every lamp and light post. Lamps / posts share world coords here; `d` = distance from the plaza. */
const LIGHTS = [
  ...[...LAMPS, ...FAR_LAMPS].map((p) => ({ x: p.x + 0.5, z: p.z + 0.5, h: 1.62, big: true })),
  ...ROAD_POSTS.flat().map((p) => ({ x: p[0], z: p[1], h: 1.5, big: false })),
].map((p) => ({ ...p, d: Math.hypot(p.x - PLAZA.x, p.z - PLAZA.z) }));

// ---- where everyone waits: a loose arc round the spot the tree will rise from (the east side is the player's) ----
const ARC_R = 2.6;
const arcSpots = (ids: string[]) => new Map(ids.map((id, i) => {
  const a = (60 + (i / Math.max(1, ids.length - 1)) * 240) * (Math.PI / 180);
  return [id, { x: TREE.x + Math.cos(a) * ARC_R, z: TREE.z + Math.sin(a) * ARC_R }] as const;
}));

/** The first flake's fall (s), and roughly where a friend's nose is above their feet. */
const FLAKE_FALL = 2.6, NOSE_Y = 0.98;

/** Dusk: strawberry-milk pink while they chat, lavender as the lights wake, then a blue snowy evening (never pitch dark). */
const hourAt = (() => { const a = hourRamp(17.9, 20.8, 2, 26), b = hourRamp(0, 0.4, 30, 14); return (c: { tt: number }) => a(c) + b(c); })();

function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
/** The very first flake: a chubby six-armed star with a soft glow round it. */
function flakeTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(235,245,255,0.75)'); grad.addColorStop(1, 'rgba(235,245,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = 4.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
    g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + cx * 19, 32 + cy * 19); g.stroke();
    for (const s of [-1, 1]) { // little V twigs on every arm
      const b = a + s * 0.7;
      g.beginPath(); g.moveTo(32 + cx * 11, 32 + cy * 11); g.lineTo(32 + cx * 11 + Math.cos(b) * 6, 32 + cy * 11 + Math.sin(b) * 6); g.stroke();
    }
  }
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 5, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(cv);
}

/** Is `o` still attached to the scene (the event world rebuilds its root when its signature changes)? */
const attached = (o: THREE.Object3D, scene: THREE.Object3D) => { let p: THREE.Object3D | null = o; while (p) { if (p === scene) return true; p = p.parent; } return false; };

/** Play it. `preview` = the ?cutscene= debug play: any day, never marked seen. */
export function startFirstSnowfall(onDone?: () => void, preview = false) {
  if (playing || isRunnerPlaying()) return;
  playing = true;
  const cast = presentNpcs().map((n) => n.def.id);
  const first = (...ids: string[]) => ids.find((id) => cast.includes(id));
  const say = (ids: string[], text: string, on?: (c: RunnerCtx) => void): Beat[] => {
    const who = first(...ids, ...cast);
    return who ? [{ type: 'say', who, text, on }] : on ? [{ type: 'call', fn: on }] : [];
  };
  const spots = arcSpots(GATHER_ORDER.filter((id) => cast.includes(id)).concat(cast.filter((id) => !GATHER_ORDER.includes(id))));
  // whoever catches the first flake (on the nose), and where they stand
  const nose = first('tuppi', 'marlo', 'zuzu', ...cast) ?? 'player';
  const noseAt = spots.get(nose) ?? PLAYER_SPOT;
  const autumn = SEASONS.find((s) => s.id === 'cocoa');

  // ---- staged pieces: lamp glows + the first flake (ours); the tree, drifts, light strings and snow (the event world's) ----
  const root = new THREE.Group(); root.name = 'first-snowfall';
  const tex = glowTexture(), flakeTex = flakeTexture();
  const lamps = LIGHTS.map((p) => {
    const gy = heightAtUnits(p.x, p.z), y = gy + p.h;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd28a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(p.x, y, p.z); halo.renderOrder = 6;
    const core = new THREE.Mesh(new THREE.SphereGeometry(p.big ? 0.075 : 0.055, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6), transparent: true, opacity: 0 }));
    core.position.copy(halo.position);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: '#ffc47a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(p.x, gy + 0.06, p.z); pool.scale.setScalar(p.big ? 4.4 : 3);
    halo.visible = core.visible = pool.visible = false;
    root.add(halo, core, pool);
    return { ...p, halo, core, pool, at: -1 };
  });
  let litCount = 0;
  const flake = new THREE.Sprite(new THREE.SpriteMaterial({ map: flakeTex, transparent: true, opacity: 0, depthWrite: false }));
  flake.renderOrder = 7; flake.visible = false; flake.scale.setScalar(0.2);
  root.add(flake);

  let tree: THREE.Object3D | null = null, drifts: THREE.Object3D | null = null;
  let waveAt = -1, riseAt = -1, treeUp = false, flakeAt = -1, snowAt = -1, settled = false, lookedAt = -1;
  /** (Re)find the event world's pieces: they appear on the first frame, and a rebuild swaps them. Searching the whole
   *  scene is not free, so a missing piece is looked for at most twice a second. */
  const find = (c: RunnerCtx) => {
    const sc = c.world.scene;
    if (tree && !attached(tree, sc)) tree = null;
    if (drifts && !attached(drifts, sc)) drifts = null;
    if ((tree && drifts) || (lookedAt >= 0 && c.tt - lookedAt < 0.5)) return;
    lookedAt = c.tt;
    tree ??= sc.getObjectByName(TWINKLE_TREE_NAME) ?? null;
    drifts ??= sc.getObjectByName(TWINKLE_DRIFTS_NAME) ?? null;
  };
  /** Hand the event world's pieces back exactly as it draws them. */
  const restore = () => {
    if (tree) { tree.visible = true; tree.scale.set(1, 1, 1); tree.rotation.y = 0; }
    if (drifts) drifts.visible = true;
    setTwinkleSnow(1);
    setTwinkleLightWave(null);
  };
  const dispose = () => {
    root.removeFromParent();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    tex.dispose(); flakeTex.dispose();
  };

  const gasps = (lag = 0.13): Beat[] => [
    ...cast.flatMap((id, i): Beat[] => [
      { type: 'face', who: id, at: { x: TREE.x, z: TREE.z } },
      { type: 'emote', who: id, kind: 'gasp', dur: 0.55 },
      { type: 'wait', sec: i % 2 ? lag * 0.7 : lag },
    ]),
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
  ];

  // ---- the script ----
  const beats: Beat[] = [
    // a pink dusk over the square; everyone is already out, waiting
    // (the camera opens on the runner's default view behind the player, so this is one slow push, no swing)
    { type: 'shot', look: [46.8, 1.2, 42.2], pos: [52.4, 4.8, 48.6], dur: 9, wait: false },
    { type: 'wait', sec: 1.8 },
    ...say(['mimsy', 'nimbus'], 'Oh... the sky is going all soft and pink, like strawberry milk.'),
    { type: 'wait', sec: 0.3 },
    ...say(['zuzu', 'oolie'], 'Is it time? Is it really, truly time? Ooh, look! The lamps!'),
    // the light wave: high and wide so it can roll off down the roads
    { type: 'shot', look: [48, 0.6, 40.5], pos: [55.5, 12.5, 53], dur: 5.4, wait: false },
    { type: 'call', fn: (c) => { waveAt = c.tt; } },
    { type: 'wait', sec: WAVE.dur + 0.4 },
    { type: 'sfx', name: 'pickup' },
    { type: 'wait', sec: 0.5 },
    ...say(['bramble', 'brioche'], 'Shh... listen. Something is happening in the middle of the square.'),
    // the tree twirls up out of the cobblestones
    { type: 'shot', look: [TREE.x, 1.6, TREE.z], pos: [TREE.x + 5.8, 3.6, TREE.z + 4.6], dur: 2.4, wait: false },
    { type: 'wait', sec: 1.0 },
    { type: 'call', fn: (c) => { riseAt = c.tt; c.fx('confetti', TREE, 0.4); c.fx('twinkle', TREE, 0.6); } },
    { type: 'sfx', name: 'unlock' },
    { type: 'wait', sec: 2.4 },
    { type: 'call', fn: (c) => { c.fx('welcome', 'all'); } },
    ...gasps(),
    { type: 'wait', sec: 0.4 },
    ...say(['oolie', 'bramble'], 'A tree! It popped right up out of the cobblestones!'),
    ...say(['brioche', 'mimsy'], 'And it is wearing little snow hats already. But where did the snow come from?'),
    // the first flake drifts down onto somebody's nose
    { type: 'shot', look: [noseAt.x, 1.0, noseAt.z], pos: [noseAt.x + 1.2, 1.7, noseAt.z + 2.8], dur: 1.8, wait: false },
    { type: 'face', who: nose, at: { x: noseAt.x, z: noseAt.z + 3 } },
    { type: 'call', fn: (c) => { flakeAt = c.tt; } },
    { type: 'wait', sec: FLAKE_FALL },
    { type: 'call', fn: (c) => { snowAt = c.tt; c.fx('twinkle', nose, 1.0); } },
    { type: 'emote', who: nose, kind: 'gasp', dur: 0.5 },
    { type: 'sfx', name: 'ding' },
    { type: 'wait', sec: 0.5 },
    ...say([nose], 'Oh! Something cold and tickly just landed right on my nose!'),
    // ...and then it is everywhere
    { type: 'shot', look: [46.6, 2.0, 42.2], pos: [51.2, 3.6, 48.4], dur: 4.2, wait: false },
    ...say(['zuzu', 'oolie', 'tuppi'], 'Snow! Real, actual snow! Everybody, it is snowing!', (c) => { c.hop(2.4); c.fx('twinkle', 'player', 1.2); }),
    { type: 'wait', sec: 1.6 },
    // a soft white-out, and the square comes back blanketed
    { type: 'fade', to: 1, dur: 1.1 },
    { type: 'call', fn: () => { settled = true; } },
    { type: 'shot', look: [46.4, 1.5, 42.4], pos: [51.6, 4.4, 49.2], dur: 0.01 },
    { type: 'wait', sec: 0.35 },
    { type: 'shot', look: [46.2, 1.6, 42.4], pos: [50.6, 3.9, 48], dur: 7, wait: false },
    { type: 'fade', to: 0, dur: 1.5 },
    ...say(['mimsy', 'nimbus'], 'Happy first snowfall, everyone. Shall we make our tree sparkle together?', (c) => { c.hop(2.8); c.fx('welcome', 'all'); }),
    { type: 'wait', sec: 1.6 },
  ];

  const ok = playCutscene({
    id: FIRST_SNOWFALL_ID, preview, beats,
    title: { name: 'First Snowfall', sub: 'Twinkle Season in Sugarlily Square' },
    player: { x: PLAYER_SPOT.x, z: PLAYER_SPOT.z, facing: 'left' },
    hour: hourAt,
    seasonLook: () => (settled ? undefined : autumn),
    setup(c) {
      c.world.scene.add(root);
      setTwinkleSnow(0);
      setTwinkleLightWave({ ...PLAZA, r: 0, soft: WAVE.soft });
      for (const [id, p] of spots) {
        c.point(id); // registers them so the runner puts them back afterwards
        const n = presentNpcs().find((m) => m.def.id === id);
        if (!n) continue;
        n.x = n.tx = p.x * TS; n.y = n.ty = p.z * TS;
        n.moving = false; n.facing = 'down'; // looking out at the dusk (and at us)
      }
      find(c);
      if (tree) tree.visible = false;
      if (drifts) drifts.visible = false;
    },
    stage(c) {
      find(c);
      const tt = c.tt;
      // the light wave, and our warm glows on every lamp and post as it reaches them
      const r = waveAt >= 0 ? waveR(tt - waveAt) : 0;
      setTwinkleLightWave(waveAt >= 0 && tt - waveAt > WAVE.dur + 0.5 ? null : { ...PLAZA, r, soft: WAVE.soft });
      for (const l of lamps) {
        if (l.at < 0) {
          if (waveAt < 0 || r < l.d) continue;
          l.at = tt; l.halo.visible = l.core.visible = l.pool.visible = true;
          if (litCount++ % 3 === 0) c.fx('twinkle', { x: l.x, z: l.z }, l.h);
          sfx.tick(); // (gated, so a pair across the road is one tick)
        }
        const age = tt - l.at, k = smooth(age / 0.6), pop = 0.7 + 0.6 * backOut(age / 0.6);
        const flicker = 1 + Math.sin(tt * 2.3 + l.at * 5) * 0.06;
        l.halo.material.opacity = (l.big ? 0.85 : 0.6) * k * flicker; l.halo.scale.setScalar((l.big ? 1.3 : 0.9) * pop);
        (l.core.material as THREE.Material).opacity = k; l.core.scale.setScalar(pop);
        (l.pool.material as THREE.Material).opacity = (l.big ? 0.34 : 0.22) * k;
      }
      // the tree: hidden, then twirls up with a springy overshoot and a little jelly wobble as it settles
      if (tree) {
        const s = riseAt >= 0 ? tt - riseAt : -1, k = s / 2.0;
        tree.visible = s >= 0 && k > 0.02;
        if (s >= 0) {
          const after = Math.max(0, s - 2.0), j = 0.06 * Math.sin(after * 15) * Math.exp(-after * 4.5);
          const xz = (0.35 + 0.65 * smooth(k * 1.15)) * (1 + j);
          tree.scale.set(xz, Math.max(0.001, backOut(k) * (1 - j)), xz);
          tree.rotation.y = (1 - smooth(k)) * 2.2;
          if (!treeUp && s > 2.0) { treeUp = true; c.fx('twinkle', TREE, 3.1); } // a sparkle on the tip as it lands
        }
      }
      if (drifts) drifts.visible = settled;
      // the first flake: drifts down, swaying, slowing as it nears the nose; rests there a moment, then melts
      if (flakeAt >= 0) {
        const fs = tt - flakeAt, u = clamp01(fs / FLAKE_FALL), melt = smooth((fs - FLAKE_FALL - 0.6) / 0.5);
        const a = nose === 'player' ? c.world.playerMesh.root : c.world.villager(nose)?.root;
        flake.visible = !!a && melt < 1;
        if (a && flake.visible) {
          flake.position.set(
            a.position.x + (Math.sin(fs * 3.1) * 0.3 + 0.15) * (1 - u),
            a.position.y + NOSE_Y + 2.3 * Math.pow(1 - u, 1.4),
            a.position.z + 0.44 + 0.1 * (1 - u));
          flake.material.rotation = fs * 1.4 * (1 - u);
          flake.material.opacity = smooth(fs / 0.4) * (1 - melt);
          flake.scale.setScalar(0.2 * (1 - 0.5 * melt));
        }
      }
      setTwinkleSnow(settled ? 1 : snowAt >= 0 ? smooth((tt - snowAt) / 4.5) : 0);
    },
    onFinish({ completed, skipped }) {
      playing = false;
      restore();
      dispose();
      if (!preview && (completed || skipped)) toast('The Twinkle Tree is waiting in the square! 🎄 Pick garland, baubles and a topper.');
    },
    onDone,
  });
  if (!ok) { playing = false; restore(); dispose(); }
}

/** Called a moment after the game opens: plays the scene if it is due. If something else is up (a panel, another
 *  scene) it checks back a few times rather than giving up for the whole session. */
export function maybeStartFirstSnowfall(blocked: () => boolean) {
  let tries = 0;
  const go = () => {
    if (playing || hasSeenCutscene(FIRST_SNOWFALL_ID)) return;
    if (blocked() || sceneActive() || isRunnerPlaying()) { if (++tries < 20) window.setTimeout(go, 3000); return; }
    if (firstSnowfallDue()) startFirstSnowfall();
  };
  window.setTimeout(go, 1600);
}
