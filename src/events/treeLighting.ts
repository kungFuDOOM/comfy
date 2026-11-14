// The Tree Lighting cutscene: the moment you finish the third decorating step (garland, ornaments, topper) at the town
// tree, the friends wander over and gather round it, everyone counts 3, 2, 1 together, and the tree blazes with light
// while sparkles burst. Plays once per save (the 'tree-lighting' entry in save.ts seenCutscenes; watched or skipped both
// count) and can be previewed any time with ?cutscene=tree-lighting. It pays nothing: the decorating milestones
// (twinkle.ts) are the rewards. The beat loop, UI and skip handling live in cutscene/runner.ts; the tree is the real one
// from twinkleWorld.ts, whose lights this scene turns down to "unlit" (setTwinkleTreeGlow) and then up to a blaze.
// Whatever it changes (tree lights, the count overlay, preview-only tree picks) is handed back in onFinish.
import * as THREE from 'three';
import { sfx } from '../audio';
import { hourRamp, isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from '../cutscene/runner';
import { eventProgress } from '../events';
import { presentNpcs } from '../npc';
import { sceneActive } from '../render/stage';
import { heightAtUnits } from '../render/terrain';
import { hasSeenCutscene } from '../save';
import { TS } from '../world';
import { GATHER_ORDER, PLAYER_SPOT, TREE, TREE_STEPS } from './twinkleLayout';
import { setTwinkleTreeGlow } from './twinkleWorld';

export const TREE_LIGHTING_ID = 'tree-lighting';
let playing = false;
export const treeLightingPlaying = () => playing;

/** Have all three decorating steps been picked (the saved counters tree1..tree3)? */
export const treeFullyDecorated = () => { const c = eventProgress('twinkle').counters; return TREE_STEPS.every((s) => (c[s.key] ?? 0) > 0); };
/** Due right after the last step is done, until it has been watched (or skipped) once. */
export const treeLightingDue = () => !playing && !isRunnerPlaying() && !sceneActive() && !hasSeenCutscene(TREE_LIGHTING_ID) && treeFullyDecorated();

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const backOut = (x: number) => { const t = clamp01(x) - 1, k = 2.2; return 1 + t * t * ((k + 1) * t + k); };

/** Where friends gather (a loose arc, the east side is the player's) and where they start (the same angle, further out). */
const ARC_R = 2.3, START_R = 6.6;
const arcAt = (a: number, r: number) => ({ x: TREE.x + Math.cos(a) * r, z: TREE.z + Math.sin(a) * r });
const angleOf = (i: number, n: number) => (60 + (i / Math.max(1, n - 1)) * 240) * (Math.PI / 180);

/** Evening deepening into dusk-blue so the lights read well (never pitch dark). */
const hourAt = hourRamp(19.2, 20.9, 1, 24);

function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

/** A big soft numeral that pops in over the scene for the countdown. */
function countOverlay() {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:absolute;left:50%;top:30%;z-index:8;pointer-events:none;font-weight:700;font-size:clamp(72px,16vw,180px);line-height:1;color:#fff;'
    + 'text-shadow:0 4px 0 #e56d9d,0 9px 0 #bf4a7c,0 0 34px rgba(255,214,140,.85);opacity:0;transform:translate(-50%,0) scale(.4);'
    + 'transition:opacity .18s ease,transform .32s cubic-bezier(.3,1.7,.5,1);';
  document.getElementById('ui')?.append(el);
  let hide = 0;
  return {
    show(text: string) {
      window.clearTimeout(hide);
      el.textContent = text;
      el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = 'translate(-50%,0) scale(.4)';
      void el.offsetWidth;
      el.style.transition = ''; el.style.opacity = '1'; el.style.transform = 'translate(-50%,0) scale(1)';
      hide = window.setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-14px) scale(1.15)'; }, 650);
    },
    destroy() { window.clearTimeout(hide); el.remove(); },
  };
}

/** Play it. `preview` = the ?cutscene= debug play: any day, never marked seen. */
export function startTreeLighting(onDone?: () => void, preview = false) {
  if (playing || isRunnerPlaying()) return;
  playing = true;
  const cast = presentNpcs().map((n) => n.def.id);
  const first = (...ids: string[]) => ids.find((id) => cast.includes(id));
  const say = (ids: string[], text: string, on?: (c: RunnerCtx) => void): Beat[] => {
    const who = first(...ids, ...cast);
    return who ? [{ type: 'say', who, text, on }] : on ? [{ type: 'call', fn: on }] : [];
  };
  const order = GATHER_ORDER.filter((id) => cast.includes(id)).concat(cast.filter((id) => !GATHER_ORDER.includes(id)));
  const spots = new Map(order.map((id, i) => [id, { from: arcAt(angleOf(i, order.length), START_R), to: arcAt(angleOf(i, order.length), ARC_R) }] as const));
  const playerFrom = { x: PLAYER_SPOT.x + 4.6, z: PLAYER_SPOT.z + 1.4 };

  // The preview has to show a decorated tree even on a save that has not decorated it: borrow picks, hand them back.
  const borrowed: [string, number][] = [];
  if (preview) {
    const counters = eventProgress('twinkle').counters;
    for (const s of TREE_STEPS) if (!(counters[s.key] ?? 0)) { borrowed.push([s.key, counters[s.key] ?? 0]); counters[s.key] = 1; }
  }
  const returnBorrowed = () => { const counters = eventProgress('twinkle').counters; for (const [k, v] of borrowed.splice(0)) { if (v) counters[k] = v; else delete counters[k]; } };

  // ---- staged pieces: a warm flash glow over the tree and the count numeral (the tree itself is the world's) ----
  const root = new THREE.Group(); root.name = 'tree-lighting';
  const tex = glowTexture();
  const topY = heightAtUnits(TREE.x, TREE.z) + 1.75;
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd9a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  flash.position.set(TREE.x, topY, TREE.z); flash.renderOrder = 6; flash.visible = false;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: '#ffc98a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(TREE.x, heightAtUnits(TREE.x, TREE.z) + 0.07, TREE.z); ground.visible = false;
  root.add(flash, ground);
  let count: ReturnType<typeof countOverlay> | null = null;
  let blazeAt = -1, countAt = -1, lastN = -1;

  const restore = () => { setTwinkleTreeGlow(1); count?.destroy(); count = null; returnBorrowed(); };
  const dispose = () => {
    root.removeFromParent();
    root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
    tex.dispose();
  };

  const tick = (n: number): Beat[] => [
    { type: 'call', fn: (c) => { countAt = c.tt; lastN = n; count?.show(String(n)); c.hop(0.5); } },
    { type: 'sfx', name: 'tick' },
    { type: 'wait', sec: 1.05 },
  ];
  /** Sparkles popping off the branches at different heights, one after another. */
  const sparkles = (): Beat[] => [2.6, 1.0, 2.1, 1.5, 2.9, 0.7].flatMap((y, i): Beat[] => [
    { type: 'call', fn: (c) => { const a = i * 2.1; c.fx('twinkle', { x: TREE.x + Math.cos(a) * 0.9, z: TREE.z + Math.sin(a) * 0.9 }, y); } },
    { type: 'wait', sec: 0.22 },
  ]);

  // ---- the script ----
  const beats: Beat[] = [
    { type: 'call', fn: () => { count = countOverlay(); } },
    { type: 'shot', look: [TREE.x + 0.8, 1.3, TREE.z + 0.4], pos: [TREE.x + 7.8, 4.6, TREE.z + 7.2], dur: 7, wait: false },
    // everyone wanders over, a few at a time
    ...[...spots.entries()].flatMap(([id, s], i): Beat[] => [
      { type: 'walk', who: id, to: s.to, speed: 2.1 + (i % 3) * 0.2, wait: false },
      { type: 'wait', sec: 0.28 },
    ]),
    { type: 'walk', who: 'player', to: PLAYER_SPOT, speed: 2.2, wait: false },
    { type: 'wait', sec: 2.8 },
    ...cast.map((id): Beat => ({ type: 'face', who: id, at: { x: TREE.x, z: TREE.z } })),
    { type: 'face', who: 'player', at: { x: TREE.x, z: TREE.z } },
    ...say(['mimsy', 'nimbus'], 'There you are! Come stand with us. The tree looks so pretty all dressed up.'),
    ...say(['zuzu', 'oolie'], 'But it is just sitting there, all quiet. Can we turn the lights on? Please, please, please?', (c) => c.hop(1.6)),
    { type: 'shot', look: [TREE.x, 1.5, TREE.z], pos: [TREE.x + 4.6, 2.9, TREE.z + 4.9], dur: 2.4, wait: false },
    ...say(['bramble', 'brioche'], 'Let us count together, nice and loud. Ready? Three little breaths first.'),
    { type: 'wait', sec: 0.5 },
    // 3, 2, 1
    ...tick(3), ...tick(2), ...tick(1),
    // the blaze
    { type: 'call', fn: (c) => { blazeAt = c.tt; count?.show('✨'); c.fx('twinkle', TREE, 3.0); c.fx('confetti', TREE, 0.5); c.fx('welcome', 'all'); c.hop(2.6); } },
    { type: 'sfx', name: 'unlock' },
    { type: 'shot', look: [TREE.x, 1.7, TREE.z], pos: [TREE.x + 6.4, 3.4, TREE.z + 6.6], dur: 3.2, wait: false },
    { type: 'wait', sec: 0.6 },
    { type: 'sfx', name: 'pickup' },
    ...sparkles(),
    ...cast.flatMap((id, i): Beat[] => [{ type: 'emote', who: id, kind: 'gasp', dur: 0.55 }, { type: 'wait', sec: i % 2 ? 0.09 : 0.13 }]),
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 0.9 },
    ...say(['oolie', 'bramble'], 'It is glowing! The whole tree is glowing, right down to the tippy top!'),
    ...say(['brioche', 'tuppi', 'marlo'], 'Every little light is shining just for us. It feels like the whole square is smiling.', (c) => c.fx('twinkle', 'player', 1.1)),
    { type: 'shot', look: [TREE.x, 1.9, TREE.z], pos: [TREE.x + 5.2, 4.2, TREE.z + 5.6], dur: 5, wait: false },
    ...say(['mimsy', 'nimbus'], 'Thank you for making it so lovely. Happy Twinkle Season, everyone.', (c) => { c.hop(2.8); c.fx('welcome', 'all'); }),
    { type: 'wait', sec: 1.6 },
  ];

  const ok = playCutscene({
    id: TREE_LIGHTING_ID, preview, beats,
    title: { name: 'Tree Lighting', sub: 'Twinkle Season in Sugarlily Square' },
    player: { x: playerFrom.x, z: playerFrom.z, facing: 'left' },
    hour: hourAt,
    setup(c) {
      c.world.scene.add(root);
      setTwinkleTreeGlow(0); // the tree waits, unlit
      for (const [id, s] of spots) {
        c.point(id); // registers them so the runner puts them back afterwards
        const n = presentNpcs().find((m) => m.def.id === id);
        if (!n) continue;
        n.x = n.tx = s.from.x * TS; n.y = n.ty = s.from.z * TS;
        n.moving = false; n.facing = 'left';
      }
    },
    stage(c) {
      const tt = c.tt;
      // the tree's lights: unlit, a little flutter on every count, then the blaze that settles to a bright glow
      let g = 0;
      if (blazeAt >= 0) {
        const s = tt - blazeAt;
        g = 0.2 + 1.8 * smooth(s / 0.35) - 0.55 * smooth((s - 0.9) / 3.2);
      } else if (countAt >= 0) {
        const s = tt - countAt;
        g = 0.05 + 0.11 * (4 - lastN) + 0.2 * Math.max(0, 1 - s / 0.45); // each number lights it a notch brighter
      }
      setTwinkleTreeGlow(g);
      // a warm flash bloom over the tree at the moment of lighting
      if (blazeAt >= 0) {
        const s = tt - blazeAt, k = Math.exp(-Math.max(0, s - 0.15) * 0.9);
        flash.visible = ground.visible = true;
        flash.material.opacity = 0.9 * smooth(s / 0.2) * k; flash.scale.setScalar(5.4 * (0.6 + 0.4 * backOut(s / 0.8)));
        (ground.material as THREE.Material).opacity = 0.5 * smooth(s / 0.4) * (0.45 + 0.55 * k); ground.scale.setScalar(5.2 + 1.2 * smooth(s / 1.5));
      }
    },
    onFinish() {
      playing = false;
      restore();
      dispose();
    },
    onDone,
  });
  if (!ok) { playing = false; restore(); dispose(); }
}
