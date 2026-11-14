// The Tree Lighting cutscene: the moment you finish the third decorating step (garland, ornaments, topper) at the town
// tree, the friends wander over and gather round it, everyone counts 3, 2, 1 together, and the tree blazes with light
// while sparkles burst. Plays once per save (the 'tree-lighting' entry in save.ts seenCutscenes; watched or skipped both
// count) and can be previewed any time with ?cutscene=tree-lighting. It pays nothing: the decorating milestones
// (twinkle.ts) are the rewards. The beat loop, UI and skip handling live in cutscene/runner.ts; the tree is the real one
// from twinkleWorld.ts, whose lights this scene turns down to "unlit" (setTwinkleTreeGlow) and then up to a blaze.
// Whatever it changes (tree lights, the tree's squash, the count overlay, preview-only stand-in picks) is handed back in
// onFinish, watched or skipped. The trigger (queueTreeLighting) holds a single pending start, so it can never double-fire.
import * as THREE from 'three';
import { sfx } from '../audio';
import { hourRamp, isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from '../cutscene/runner';
import { eventProgress } from '../events';
import { presentNpcs } from '../npc';
import { sceneActive } from '../render/stage';
import { heightAtUnits } from '../render/terrain';
import { hasSeenCutscene } from '../save';
import { isPanelOpen } from '../ui/dom';
import { TS } from '../world';
import { GATHER_ORDER, PLAYER_SPOT, TREE, TREE_STEPS } from './twinkleLayout';
import { TWINKLE_TREE_NAME, setTwinkleTreeGlow, setTwinkleTreePickFill } from './twinkleWorld';

export const TREE_LIGHTING_ID = 'tree-lighting';
let playing = false;
export const treeLightingPlaying = () => playing;

/** Have all three decorating steps been picked (the saved counters tree1..tree3)? */
export const treeFullyDecorated = () => { const c = eventProgress('twinkle').counters; return TREE_STEPS.every((s) => (c[s.key] ?? 0) > 0); };
/** Owed to this save: the tree is fully dressed and the scene has not been watched (or skipped) yet. */
const owed = () => !playing && !hasSeenCutscene(TREE_LIGHTING_ID) && treeFullyDecorated();
/** Due right after the last step is done, until it has been watched (or skipped) once, and nothing else is on screen. */
export const treeLightingDue = () => owed() && !isRunnerPlaying() && !sceneActive() && !isPanelOpen();

/** One pending start at most. If a panel or another scene is up when it comes round, it checks back a few times. */
let queued = 0;
/** Returns true if the scene is (now or already) on its way. */
export function queueTreeLighting(delayMs = 450): boolean {
  if (queued) return true;
  if (!owed()) return false;
  let tries = 0;
  const go = () => {
    queued = 0;
    if (!owed()) return;
    if (!treeLightingDue()) { if (++tries < 30) queued = window.setTimeout(go, 1000); return; }
    startTreeLighting();
  };
  queued = window.setTimeout(go, delayMs);
  return true;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const backOut = (x: number) => { const t = clamp01(x) - 1, k = 2.2; return 1 + t * t * ((k + 1) * t + k); };

/** Where friends gather (a loose arc, the east side is the player's) and where they start (the same angle, further out). */
const ARC_R = 2.3, START_R = 5.4;
const arcAt = (a: number, r: number) => ({ x: TREE.x + Math.cos(a) * r, z: TREE.z + Math.sin(a) * r });
const angleOf = (i: number, n: number) => (60 + (i / Math.max(1, n - 1)) * 240) * (Math.PI / 180);

/** Evening deepening into dusk-blue while everyone gathers, deepest by the countdown so the blaze reads (never pitch dark). */
const hourAt = hourRamp(19.2, 21.0, 1, 20);

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
    /** `tone` = the numeral's candy shadow colours [top, deep]; the finale sparkle gets a warm glow only. */
    show(text: string, tone: [string, string] | null) {
      window.clearTimeout(hide);
      el.textContent = text;
      el.style.textShadow = tone ? `0 4px 0 ${tone[0]},0 9px 0 ${tone[1]},0 0 34px rgba(255,214,140,.85)` : '0 0 40px rgba(255,214,140,.95),0 0 12px rgba(255,255,255,.9)';
      el.style.fontSize = tone ? '' : 'clamp(96px,22vw,240px)';
      el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = 'translate(-50%,0) scale(.4)';
      void el.offsetWidth;
      el.style.transition = ''; el.style.opacity = '1'; el.style.transform = 'translate(-50%,0) scale(1)';
      hide = window.setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-14px) scale(1.15)'; }, tone ? 650 : 1100);
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

  // The preview has to show a decorated tree even on a save that has not decorated it: render-only stand-in picks
  // (the saved counters are never written, so a persist mid-preview can't keep a tree the player never dressed).
  if (preview) setTwinkleTreePickFill([1, 2, 1]);

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
  // the world's tree (looked up lazily: the world may rebuild it, e.g. when the preview's stand-in picks land)
  let tree: THREE.Object3D | null = null;
  const inScene = (o: THREE.Object3D, sc: THREE.Object3D) => { let p: THREE.Object3D | null = o; while (p && p !== sc) p = p.parent; return p === sc; };
  const findTree = (sc: THREE.Scene) => {
    if (!tree || !inScene(tree, sc)) { if (tree) tree.scale.set(1, 1, 1); tree = sc.getObjectByName(TWINKLE_TREE_NAME) ?? null; }
    return tree;
  };

  const restore = () => {
    setTwinkleTreeGlow(1); setTwinkleTreePickFill(null);
    if (tree) tree.scale.set(1, 1, 1); tree = null;
    count?.destroy(); count = null;
  };
  const dispose = () => {
    root.removeFromParent();
    root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
    tex.dispose();
  };

  const TONES: Record<number, [string, string]> = { 3: ['#e56d9d', '#bf4a7c'], 2: ['#5fc9a4', '#3a9c7c'], 1: ['#f0a93c', '#c47f1c'] };
  /** Everyone shouts the number together: the numeral pops, the friends bob, the tree shivers a notch brighter. */
  const tick = (n: number): Beat[] => [
    { type: 'call', fn: (c) => { countAt = c.tt; lastN = n; count?.show(String(n), TONES[n]); c.hop(0.45); } },
    ...cast.map((id): Beat => ({ type: 'emote', who: id, kind: 'talk', dur: 0.45 })),
    { type: 'emote', who: 'player', kind: 'talk', dur: 0.45 },
    { type: 'sfx', name: 'tick' },
    { type: 'wait', sec: 1.0 },
  ];
  /** Sparkles spiralling up the branches, hugging the cone, bottom to top. */
  const sparkles = (): Beat[] => Array.from({ length: 9 }, (_, i) => i).flatMap((i): Beat[] => {
    const y = 0.45 + i * 0.3, r = 0.2 + 1.0 * Math.max(0, 1 - y / TREE.height), a = i * 2.4;
    return [
      { type: 'call', fn: (c) => c.fx('twinkle', { x: TREE.x + Math.cos(a) * r, z: TREE.z + Math.sin(a) * r }, y) },
      { type: 'wait', sec: 0.16 },
    ];
  });

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
    { type: 'wait', sec: 2.6 },
    ...cast.map((id): Beat => ({ type: 'face', who: id, at: { x: TREE.x, z: TREE.z } })),
    { type: 'face', who: 'player', at: { x: TREE.x, z: TREE.z } },
    ...say(['mimsy', 'nimbus'], 'There you are! Come stand with us. Look how pretty the tree is, all dressed up.'),
    ...say(['zuzu', 'oolie'], 'But it is all quiet and dark. Can we turn the lights on? Please, please, pleeease?', (c) => c.hop(1.2)),
    // the camera creeps in through the build-up and the count
    { type: 'shot', look: [TREE.x, 1.55, TREE.z], pos: [TREE.x + 4.8, 3.0, TREE.z + 5.1], dur: 3.2, wait: false },
    ...say(['bramble', 'brioche'], 'Then we count together, nice and loud. Everybody ready? Deep breath...'),
    { type: 'shot', look: [TREE.x, 1.7, TREE.z], pos: [TREE.x + 3.4, 2.4, TREE.z + 3.7], dur: 4.2, wait: false },
    { type: 'wait', sec: 0.7 },
    // 3, 2, 1
    ...tick(3), ...tick(2), ...tick(1),
    // the blaze: the camera springs back and tilts up to take in the whole tree
    { type: 'call', fn: (c) => { blazeAt = c.tt; count?.show('✨', null); c.fx('twinkle', TREE, TREE.height); c.fx('confetti', TREE, 0.5); c.hop(2.6); } },
    { type: 'sfx', name: 'unlock' },
    { type: 'shot', look: [TREE.x, 1.9, TREE.z], pos: [TREE.x + 6.2, 3.1, TREE.z + 6.5], dur: 2.6, wait: false },
    ...sparkles(),
    { type: 'sfx', name: 'pickup' },
    { type: 'fx', fx: 'welcome', at: 'all' },
    ...cast.flatMap((id, i): Beat[] => [{ type: 'emote', who: id, kind: 'gasp', dur: 0.55 }, { type: 'wait', sec: i % 2 ? 0.09 : 0.13 }]),
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 0.8 },
    ...say(['oolie', 'zuzu'], 'It is glowing! The whole tree is glowing, right up to the tippy top!', (c) => c.fx('twinkle', TREE, TREE.height + 0.2)),
    ...say(['brioche', 'tuppi', 'marlo'], 'Every little light is shining just for us. It feels like the whole square is smiling.', (c) => c.fx('twinkle', 'player', 1.1)),
    { type: 'shot', look: [TREE.x, 1.8, TREE.z], pos: [TREE.x + 5.6, 4.0, TREE.z + 6.0], dur: 5, wait: false },
    ...say(['mimsy', 'nimbus'], 'Thank you for making it so lovely. Happy Twinkle Season, everyone!', (c) => { c.hop(2.8); c.fx('welcome', 'all'); }),
    { type: 'sfx', name: 'welcome' },
    { type: 'call', fn: (c) => { c.fx('twinkle', TREE, TREE.height); c.fx('confetti', TREE, 1.6); } },
    { type: 'wait', sec: 2.0 },
  ];

  const ok = playCutscene({
    id: TREE_LIGHTING_ID, preview, beats,
    title: { name: 'Tree Lighting', sub: 'Twinkle Season in Sugarlily Square' },
    player: { x: playerFrom.x, z: playerFrom.z, facing: 'left' },
    hour: hourAt,
    setup(c) {
      c.world.scene.add(root);
      setTwinkleTreeGlow(0); // the tree waits, unlit
      findTree(c.world.scene);
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
      let g = 0, squash = 0;
      if (blazeAt >= 0) {
        const s = tt - blazeAt;
        g = 0.2 + 1.8 * smooth(s / 0.35) - 0.55 * smooth((s - 0.9) / 3.2) + 0.07 * Math.sin(s * 2.1) * smooth((s - 2) / 2); // then it breathes
        squash = s < 1.6 ? Math.exp(-s * 3.2) * Math.sin(s * 17) * 0.13 : 0; // a happy boing
      } else if (countAt >= 0) {
        const s = tt - countAt;
        g = 0.05 + 0.11 * (4 - lastN) + 0.2 * Math.max(0, 1 - s / 0.45); // each number lights it a notch brighter
        squash = s < 0.6 ? Math.exp(-s * 6) * Math.sin(s * 22) * 0.035 : 0; // and it shivers in anticipation
      }
      setTwinkleTreeGlow(g);
      const t3 = findTree(c.world.scene);
      if (t3) t3.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
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
