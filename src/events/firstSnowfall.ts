// The First Snowfall cutscene: the first time you log in on or after Nov 27 (Twinkle Season's opening day) the square
// slips into dusk, the lamps along the roads wake one by one, the town tree rises in the plaza, the friends gasp, and
// the snow begins. Plays once per save (the 'first-snowfall' entry in save.ts seenCutscenes; watched or skipped both
// count) and can be previewed any time with ?cutscene=first-snowfall. It pays nothing: the tree's own decorating
// (twinkleTree.ts) and the gatherings (gathering.ts) are where the rewards live. The beat loop, UI and skip handling
// live in cutscene/runner.ts; the tree and the snow are the real ones from twinkleWorld.ts, just held back until
// their beat.
import * as THREE from 'three';
import { sfx } from '../audio';
import { toast } from '../bus';
import { hourRamp, isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from '../cutscene/runner';
import { isEventActive } from '../events';
import { presentNpcs } from '../npc';
import { heightAtUnits } from '../render/terrain';
import { hasSeenCutscene } from '../save';
import { today } from '../time';
import { TS } from '../world';
import { FAR_LAMPS, GATHER_ORDER, LAMPS, PLAYER_SPOT, ROAD_POSTS, TREE } from './twinkleLayout';
import { TWINKLE_TREE_NAME, setTwinkleSnow } from './twinkleWorld';

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

/** Lamp spots, nearest the plaza first, so the lights travel outward along the roads. Posts / lamps share world coords here. */
const PLAZA = { x: 48, z: 41 };
const LIGHTS: { x: number; z: number; h: number }[] = [
  ...[...LAMPS, ...FAR_LAMPS].map((p) => ({ x: p.x + 0.5, z: p.z + 0.5, h: 1.62 })),
  ...ROAD_POSTS.flat().map((p) => ({ x: p[0], z: p[1], h: 1.5 })),
].sort((a, b) => Math.hypot(a.x - PLAZA.x, a.z - PLAZA.z) - Math.hypot(b.x - PLAZA.x, b.z - PLAZA.z)).slice(0, 18);

function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

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

  // ---- staged pieces: lamp glows (ours), the town tree and the snow (the event world's, held back) ----
  const root = new THREE.Group(); root.name = 'first-snowfall';
  const tex = glowTexture();
  const lamps = LIGHTS.map((p) => {
    const y = heightAtUnits(p.x, p.z) + p.h;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd28a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(p.x, y, p.z); halo.renderOrder = 6;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6), transparent: true, opacity: 0 }));
    core.position.copy(halo.position);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: '#ffc47a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(p.x, heightAtUnits(p.x, p.z) + 0.06, p.z); pool.scale.setScalar(4.4);
    root.add(halo, core, pool);
    return { halo, core, pool, at: -1 };
  });
  let tree: THREE.Object3D | null = null, treeSearch = true, riseAt = -1, snowAt = -1;
  const findTree = (c: RunnerCtx) => {
    tree = c.world.scene.getObjectByName(TWINKLE_TREE_NAME) ?? null;
    if (tree) tree.visible = false; // hidden until its beat
    else if (c.tt > 2) treeSearch = false;
  };

  // ---- the script ----
  const beats: Beat[] = [
    { type: 'shot', look: [48, 1.2, 41], pos: [56, 7, 48] },
    { type: 'wait', sec: 2.2 },
    ...say(['nimbus', 'mimsy'], 'Oh... the sky is turning such a soft, sleepy pink.'),
    { type: 'wait', sec: 0.4 },
    ...say(['zuzu', 'mimsy'], 'Is it time? Is it really time? Look at the lamps!'),
    { type: 'shot', look: [48, 1.4, 41], pos: [53.5, 8.5, 49.5], dur: 7, wait: false },
    ...lamps.flatMap((l, i): Beat[] => [
      { type: 'call', fn: (c) => { l.at = c.tt; if (i % 3 === 0) c.fx('twinkle', { x: LIGHTS[i].x, z: LIGHTS[i].z }, 1.6); } },
      { type: 'sfx', name: 'tick' },
      { type: 'wait', sec: 0.34 },
    ]),
    { type: 'wait', sec: 1 },
    { type: 'shot', look: [TREE.x, 1.5, TREE.z], pos: [TREE.x + 6.4, 4.8, TREE.z + 2.2], dur: 2.6, wait: false },
    { type: 'call', fn: (c) => { riseAt = c.tt; c.fx('confetti', TREE, 0.8); c.fx('twinkle', TREE, 1.6); } },
    { type: 'sfx', name: 'unlock' },
    { type: 'wait', sec: 2.4 },
    { type: 'call', fn: (c) => { c.fx('welcome', 'all'); } },
    ...cast.flatMap((id, i): Beat[] => [
      { type: 'face', who: id, at: { x: TREE.x, z: TREE.z } },
      { type: 'emote', who: id, kind: 'gasp', dur: 0.6 },
      { type: 'wait', sec: i % 2 ? 0.12 : 0.2 },
    ]),
    ...say(['bramble', 'oolie'], 'A tree! It grew up right out of the cobblestones!'),
    ...say(['mimsy', 'brioche'], 'It is so tall and so twinkly. It is wearing snow already.'),
    { type: 'shot', look: [46.5, 2.6, 42], pos: [50, 3.2, 47.5], dur: 4, wait: false },
    { type: 'call', fn: (c) => { snowAt = c.tt; } },
    { type: 'sfx', name: 'ding' },
    { type: 'wait', sec: 2.2 },
    ...say(['tuppi', 'marlo'], 'Snow! The very first flake just landed on my nose!', (c) => { c.hop(2); c.fx('twinkle', 'all', 1.2); }),
    ...say(['mimsy', 'nimbus'], 'Happy first snowfall, everyone. Shall we decorate it together?'),
    { type: 'wait', sec: 1.8 },
  ];

  const ok = playCutscene({
    id: FIRST_SNOWFALL_ID, preview, beats,
    title: { name: 'First Snowfall', sub: 'Twinkle Season in Sugarlily Square' },
    player: { x: PLAYER_SPOT.x, z: PLAYER_SPOT.z, facing: 'left' },
    hour: hourRamp(16.2, 20.4, 4.6, 26),
    setup(c) {
      c.world.scene.add(root);
      setTwinkleSnow(0);
      // everyone waits in a loose arc on the plaza, a little way from where the tree will stand
      const spots = GATHER_ORDER.filter((id) => cast.includes(id));
      spots.forEach((id, i) => {
        c.point(id); // registers them so the runner puts them back afterwards
        const n = presentNpcs().find((m) => m.def.id === id);
        if (!n) return;
        const a = (60 + (i / Math.max(1, spots.length - 1)) * 240) * (Math.PI / 180);
        n.x = n.tx = (TREE.x + Math.cos(a) * 3.1) * TS; n.y = n.ty = (TREE.z + Math.sin(a) * 3.1) * TS;
        n.moving = false; n.facing = 'right';
      });
      findTree(c);
    },
    stage(c) {
      if (!tree && treeSearch) findTree(c);
      for (const l of lamps) {
        if (l.at < 0) continue;
        const age = c.tt - l.at, k = smooth(age / 0.7), pop = 0.7 + 0.6 * backOut(age / 0.7);
        const flicker = 1 + Math.sin(c.tt * 2.3 + l.at * 5) * 0.06;
        l.halo.material.opacity = 0.85 * k * flicker; l.halo.scale.setScalar(1.3 * pop);
        (l.core.material as THREE.Material).opacity = k; l.core.scale.setScalar(pop);
        (l.pool.material as THREE.Material).opacity = 0.34 * k;
      }
      if (tree && riseAt >= 0) {
        const k = (c.tt - riseAt) / 2.2, e = backOut(k);
        tree.visible = k > 0.02;
        tree.scale.set(0.4 + 0.6 * e, Math.max(0.001, e), 0.4 + 0.6 * e);
      }
      setTwinkleSnow(snowAt >= 0 ? smooth((c.tt - snowAt) / 4.5) : 0);
    },
    onFinish({ completed, skipped }) {
      playing = false;
      root.removeFromParent();
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      tex.dispose();
      if (tree) { tree.visible = true; tree.scale.set(1, 1, 1); } // the real tree and the real snow, exactly as the event world draws them
      setTwinkleSnow(1);
      if (!preview && (completed || skipped)) toast('The Twinkle Tree is waiting in the square! 🎄 Pick garland, baubles and a topper.');
    },
    onDone,
  });
  if (!ok) { playing = false; root.removeFromParent(); setTwinkleSnow(1); }
}

/** Called a moment after the game opens: plays the scene if it is due. */
export function maybeStartFirstSnowfall(blocked: () => boolean) {
  window.setTimeout(() => { if (!blocked() && firstSnowfallDue()) startFirstSnowfall(); }, 1600);
}
