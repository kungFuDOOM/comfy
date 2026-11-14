// The Golden Pie cutscene: a short reveal the first time a bake earns a Golden Pie (two perfect timings, pieBake.ts).
// Once the baking window is closed, the camera finds a golden pie glowing on the little bakery table in front of the
// café; it rises and spins in a ring of little stars, splits into two with a boing and a burst of sparkles, and both
// settle back on the table glinting while Brioche is delighted. Plays once
// per save (the 'golden-pie' entry in save.ts seenCutscenes; watched or skipped both count) and can be previewed any
// time with ?cutscene=golden-pie. It pays nothing (the pies are already in the bag) and adds no save field. The trigger
// (queueGoldenPie) holds a single pending start that waits out an open panel or another scene, so it can't double-fire.
// Props come from pieStage.ts and are handed back in onFinish, watched or skipped.
import * as THREE from 'three';
import { hourRamp, isRunnerPlaying, playCutscene, type Beat } from '../cutscene/runner';
import { npcs } from '../npc';
import { sceneActive } from '../render/stage';
import { hasSeenCutscene } from '../save';
import { isPanelOpen } from '../ui/dom';
import { TS } from '../world';
import { BAKER_SPOT, PLAYER_POSE, TABLE, TABLE_TOP, backOut, inviteBrioche, makeNook, makePie, smooth } from './pieStage';

export const GOLDEN_PIE_ID = 'golden-pie';
let playing = false;
export const goldenPiePlaying = () => playing;

const owed = () => !playing && !hasSeenCutscene(GOLDEN_PIE_ID);
/** Due once a Golden Pie has been baked and nothing else is on screen (the baking window is closed). */
export const goldenPieDue = () => owed() && !isRunnerPlaying() && !sceneActive() && !isPanelOpen();

let queued = 0;
/** Ask for the reveal after a Golden Pie bake. One pending start at most; it checks back until the window is closed. */
export function queueGoldenPie(delayMs = 700): boolean {
  if (queued) return true;
  if (!owed()) return false;
  let tries = 0;
  const go = () => {
    queued = 0;
    if (!owed()) return;
    if (!goldenPieDue()) { if (++tries < 300) queued = window.setTimeout(go, 1000); return; }
    startGoldenPie();
  };
  queued = window.setTimeout(go, delayMs);
  return true;
}

/** Late afternoon gold. */
const hourAt = hourRamp(16.2, 17.0, 0, 20);

function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

const RISE = 1.6, SPLIT = 0.9, STARS = 6;

/** Play it. `onDone` runs once the scene is over (screen covered). Returns false if it could not start. */
export function startGoldenPie(onDone?: () => void, preview = false): boolean {
  if (playing || isRunnerPlaying()) return false;
  playing = true;
  const leave = inviteBrioche();
  const nook = makeNook();
  const second = makePie(); nook.root.add(second.group);
  const tex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd35a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.renderOrder = 6; glow.visible = false; nook.root.add(glow);
  // little gold stars that circle the rising pie and burst outward when it splits
  const starGeo = new THREE.OctahedronGeometry(0.045), starMat = new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0, depthWrite: false });
  const stars = Array.from({ length: STARS }, () => { const m = new THREE.Mesh(starGeo, starMat); m.visible = false; nook.root.add(m); return m; });
  let revealAt = -1, splitAt = -1, spin = 0, glintAt = 0, glints = 0;
  const glowMat = glow.material as THREE.SpriteMaterial;

  const beats: Beat[] = [
    { type: 'shot', look: [TABLE.x + 0.5, 0.7, TABLE.z], pos: [TABLE.x + 3.4, 2.1, TABLE.z + 4.4], dur: 2.4, wait: false },
    { type: 'walk', who: 'brioche', to: BAKER_SPOT, speed: 2.0 },
    { type: 'face', who: 'brioche', at: { x: TABLE.x, z: TABLE.z } },
    { type: 'say', who: 'brioche', text: 'Hmm? Wait a moment. Is the pie... shining?', wide: true, on: (c) => c.fx('twinkle', { x: TABLE.x, z: TABLE.z }, TABLE_TOP + 0.15) },
    { type: 'shot', look: [TABLE.x, TABLE_TOP + 0.3, TABLE.z], pos: [TABLE.x + 0.6, 1.2, TABLE.z + 1.9], dur: 2.4, wait: false },
    { type: 'wait', sec: 0.5 },
    { type: 'call', fn: (c) => { revealAt = c.tt; c.fx('twinkle', { x: TABLE.x, z: TABLE.z }, TABLE_TOP + 0.4); } },
    { type: 'sfx', name: 'unlock' },
    { type: 'wait', sec: RISE },
    { type: 'emote', who: 'brioche', kind: 'gasp', dur: 0.6 },
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    { type: 'wait', sec: 0.3 },
    { type: 'call', fn: (c) => { splitAt = c.tt; c.fx('confetti', { x: TABLE.x, z: TABLE.z }, 0.9); c.fx('twinkle', { x: TABLE.x, z: TABLE.z }, 0.9); c.hop(1.4); } },
    { type: 'sfx', name: 'pickup' },
    { type: 'wait', sec: SPLIT + 0.3 },
    { type: 'say', who: 'brioche', text: 'A Golden Pie! Two perfect moments and the crust blushed gold. It only does that for bakers who truly care.', on: (c) => c.fx('welcome', 'all') },
    { type: 'shot', look: [TABLE.x, TABLE_TOP + 0.2, TABLE.z], pos: [TABLE.x + 1.4, 1.5, TABLE.z + 3.0], dur: 3, wait: false },
    { type: 'face', who: 'brioche', at: 'player' },
    { type: 'say', who: 'brioche', text: 'And look, there are two! One for the shelf, and one for a friend. Golden pies taste even better when they are shared.', wide: true, on: (c) => c.hop(1.2) },
    { type: 'wait', sec: 1.2 },
  ];

  const finish = () => { playing = false; nook.dispose(); tex.dispose(); leave(); };
  const ok = playCutscene({
    id: GOLDEN_PIE_ID, preview, beats,
    title: { name: 'A Golden Pie!', sub: 'Harvest Hush Feast' },
    player: { x: PLAYER_POSE.x, z: PLAYER_POSE.z, facing: 'right' },
    hour: hourAt,
    setup(c) {
      c.world.scene.add(nook.root);
      nook.dough.visible = false;
      nook.pie.setStage(1, 1, 1);
      second.setStage(1, 1, 1); second.setBake(1, true);
      second.group.visible = false;
      // Brioche starts a few steps off to the café side (c.point registers her so the runner puts her back afterwards)
      c.point('brioche');
      const n = npcs.find((m) => m.def.id === 'brioche');
      if (n) { n.x = n.tx = (BAKER_SPOT.x + 2.2) * TS; n.y = n.ty = (BAKER_SPOT.z - 0.6) * TS; n.moving = false; n.facing = 'left'; }
    },
    stage(c, f) {
      const t = c.tt, a = nook.pie.group, b = second.group;
      a.position.set(TABLE.x, TABLE_TOP, TABLE.z); a.scale.setScalar(1);
      // before the reveal it only shimmers faintly, as if it has a secret
      let shine = 0.25 + 0.15 * Math.sin(t * 3);
      glow.visible = revealAt >= 0;
      if (revealAt < 0) { a.rotation.y = 0; nook.pie.setBake(1, true, shine); return; }
      const s = t - revealAt, k = smooth(s / RISE), split = splitAt >= 0 ? t - splitAt : -1;
      shine = split < 0 ? 0.4 + 0.6 * k + 0.15 * Math.sin(s * 8) : 1 + 0.8 * Math.exp(-split * 2.5) + 0.1 * Math.sin(t * 2.5);
      nook.pie.setBake(1, true, shine);
      second.setBake(1, true, shine);
      // it hovers up, spinning faster; after the split the spin winds down to a lazy turn
      spin += f.dt * (split < 0 ? 2.2 + 4 * k : 0.35 + 5.8 * Math.exp(-split * 2));
      a.rotation.y = spin;
      const lift = 0.5 * k;
      if (split < 0) {
        a.position.y = TABLE_TOP + lift + 0.03 * Math.sin(s * 4);
        a.scale.setScalar(1 + 0.08 * Math.sin(s * 6) * (1 - k));
      } else {
        // it drops back to the table with a little bounce as the second pie boings out beside it
        const fall = smooth(split / 0.45), off = 0.32 * smooth(split / 0.5);
        a.position.set(TABLE.x - off, TABLE_TOP + lift * (1 - fall) + 0.08 * Math.abs(Math.sin(split * 9)) * Math.exp(-split * 4) * fall, TABLE.z);
        a.scale.setScalar(1 - 0.06 * Math.exp(-split * 4) * Math.sin(split * 14));
        b.visible = true;
        b.position.set(TABLE.x + off, TABLE_TOP + 0.1 * Math.max(0, 1 - split / 0.6) * Math.abs(Math.sin(split * 10)), TABLE.z);
        b.scale.setScalar(Math.max(0.01, backOut(split / 0.6)));
        b.rotation.y = -0.4 - spin * 0.6;
        // now and then a glint skips from one pie to the other
        if (split > 1.2 && t - glintAt > 1.5) { glintAt = t; const p = glints++ % 2 ? b : a; c.fx('twinkle', { x: p.position.x, z: p.position.z }, TABLE_TOP + 0.2); }
      }
      // the warm halo follows the pie up, then widens to hug both
      glow.position.set(TABLE.x, split < 0 ? a.position.y + 0.05 : TABLE_TOP + 0.12, TABLE.z);
      glowMat.opacity = 0.75 * smooth(s / 0.6);
      const breathe = 0.3 * Math.sin(s * 5);
      if (split < 0) glow.scale.setScalar(1.8 + breathe + 0.6 * k);
      else { const w = 2.4 + 0.9 * smooth(split / 0.5); glow.scale.set(w + 1.4 * Math.exp(-split * 2.2) + breathe, 2.2 + 1.4 * Math.exp(-split * 2.2) + breathe, 1); }
      // the star ring: in with the rise, out in a burst at the split
      starMat.opacity = split < 0 ? smooth(s / 0.5) : 1 - smooth(split / 0.7);
      stars.forEach((m, i) => {
        m.visible = starMat.opacity > 0.01;
        const ang = (i / STARS) * Math.PI * 2 + s * 2.6, r = split < 0 ? 0.3 + 0.1 * k : 0.4 + 1.3 * smooth(split / 0.7);
        m.position.set(TABLE.x + Math.cos(ang) * r, (split < 0 ? a.position.y : TABLE_TOP + lift) + 0.08 + 0.05 * Math.sin(s * 5 + i) + (split < 0 ? 0 : 0.4 * split), TABLE.z + Math.sin(ang) * r);
        m.rotation.set(s * 3 + i, s * 4, 0);
        m.scale.setScalar(split < 0 ? 0.6 + 0.4 * k : 1 + split);
      });
    },
    onFinish: finish,
    onDone,
  });
  if (!ok) finish();
  return ok;
}
