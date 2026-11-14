// Shared cutscene runner: a scene is a list of beats (camera shots, dialogue, waits, walk / face / emote cues, particles,
// sfx, custom calls, fades) played inside runScene('cutscene') with the letterbox UI, a Director camera, tap / key advance
// and a Skip pill. The Harvest Hush Feast and the Christmas gatherings run on it. (The balloon intro in intro.ts is its
// own thing and does not use this.)
import * as THREE from 'three';
import type { Facing } from '../art/characters';
import { sfx } from '../audio';
import { currentAccessory } from '../boutique';
import { VILLAGERS, type VillagerDef } from '../data';
import { npcs, presentNpcs, type Npc } from '../npc';
import { cancelPath, player } from '../player';
import { confettiAt, harvestAt, twinkleAt, welcomeAt } from '../render/celebrate';
import { getWorld, runScene } from '../render/stage';
import { heightAtUnits } from '../render/terrain';
import type { FrameInput, World3D } from '../render/world3d';
import { markCutsceneSeen, saveGame } from '../save';
import { getClock } from '../time';
import { createCutsceneUi, type CutsceneUi } from '../ui/cutsceneUi';
import { fadeTo, setFade } from '../ui/fade';
import { captureSceneKeys } from '../ui/sceneInput';
import { currentLook } from '../wardrobe';
import { TS } from '../world';

/** Typewriter speed (chars / s), pause after a finished line, extra pause per character. */
export const CPS = 42, HOLD = 1.2, HOLD_PER_CHAR = 0.012;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Smootherstep: zero speed and zero acceleration at both ends, so long camera pushes start and settle softly. */
const glide = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
/** One bounce of |sin(t * BOUNCE)| lasts π / BOUNCE s; bounces always start and stop on the ground. */
const BOUNCE = 9, HALF = Math.PI / BOUNCE;
const landed = (x: number) => Math.ceil(x / HALF - 1e-6) * HALF;

/** For `hour`: hold `from` until scene time `at`, then ease to `to` over `dur` s (e.g. dusk 17.5 -> night 21). Wraps past midnight. */
export const hourRamp = (from: number, to: number, at: number, dur: number) =>
  (c: { tt: number }) => { const h = from + (to - from) * smooth(at, at + Math.max(0.01, dur), c.tt); return ((h % 24) + 24) % 24; };

/** Scene timing (seconds). Defaults are what the feast and the gatherings use. */
export interface Timing {
  fadeIn: number; fadeOut: number;
  /** When the first beat starts. */
  lead: number;
  /** Title card window. */
  titleFrom: number; titleTo: number;
  /** After the last beat: hold this long, then fade out over `fadeOut`. */
  endHold: number;
  /** Quick fade when skipping. */
  skipFade: number;
}
const TIMING: Timing = { fadeIn: 0.9, fadeOut: 0.9, lead: 4.6, titleFrom: 1.0, titleTo: 4.4, endHold: 1.2, skipFade: 0.4 };

export type V3 = [number, number, number];
/** A ground point in tiles (1 tile = TS world px), or an actor: a villager id or 'player'. */
export type At = { x: number; z: number } | string;
type SfxName = { [K in keyof typeof sfx]: [] extends Parameters<(typeof sfx)[K]> ? K : never }[keyof typeof sfx];

export type Beat =
  /** Camera look-at + position (tiles / world units). With `dur` it eases there (smootherstep; waits unless `wait: false`); without, the camera glides. */
  | { type: 'shot'; look: V3; pos: V3; dur?: number; wait?: boolean }
  /** A dialogue line. `who` must be a villager id (an unknown id skips the line). `wide` = ensemble shot (for speaker-aware cameras); `on` runs when the line starts. */
  | { type: 'say'; who: string; text: string; wide?: boolean; on?: (c: RunnerCtx) => void }
  | { type: 'wait'; sec: number }
  /** Walk a villager or the player to a tile point (tiles / s). Waits until they arrive unless `wait: false`. */
  | { type: 'walk'; who: string; to: At; speed?: number; wait?: boolean }
  /** Turn toward someone or a point. */
  | { type: 'face'; who: string; at: At }
  /** 'talk' bounces for `dur`, 'hop' hops (`who: 'all'` = the whole party), 'gasp' is one quick startled jump. */
  | { type: 'emote'; who: string; kind: 'talk' | 'hop' | 'gasp'; dur?: number }
  /** Particles at a point (`y` = height above ground). `welcome` at 'all' sparkles over every villager. */
  | { type: 'fx'; fx: 'confetti' | 'harvest' | 'twinkle' | 'welcome'; at: At | 'all'; y?: number }
  | { type: 'sfx'; name: SfxName }
  /** Escape hatch: run any staging mid-script (light lamps, raise a tree...). */
  | { type: 'call'; fn: (c: RunnerCtx) => void }
  /** Extra fade (0 = clear, 1 = covered) eased over `dur` from wherever the last fade beat left it; the level holds until the next fade beat. Blocks unless `wait: false`. */
  | { type: 'fade'; to: number; dur: number; wait?: boolean }
  /** Force the title card on / off (otherwise it shows in its timing window). */
  | { type: 'title'; on: boolean };

export interface CutsceneResult {
  /** The player skipped (Skip pill, Esc, or a tap before the first line). */
  skipped: boolean;
  /** The script reached its end (even if the player then skipped the closing fade). */
  completed: boolean;
  preview: boolean;
}

export interface CutsceneScene {
  /** Registry id (see save.ts seenCutscenes). A real (non-preview) play is marked seen when it ends, watched or skipped. */
  id?: string;
  title?: { name: string; sub: string };
  beats: Beat[];
  /** Debug preview: never marks seen, never saves. The scene's own onFinish should also pay nothing in preview. */
  preview?: boolean;
  /** Staged player pose (tiles). Omitted = she stays where she stands. */
  player?: { x: number; z: number; facing: Facing };
  /** Override the rendered hour (a snowfall scene can hold dusk, then ease into night: see `hourRamp`). */
  hour?: number | ((c: RunnerCtx) => number);
  timing?: Partial<Timing>;
  /** Runs once before the first frame. */
  setup?(c: RunnerCtx): void;
  /** Extra per-frame staging, after the default (speaker bounce + hops). */
  stage?(c: RunnerCtx, f: FrameInput): void;
  /** Replaces the default camera. Call `c.follow(...)` to get the shared easing. */
  shoot?(c: RunnerCtx, camera: THREE.PerspectiveCamera, focus: THREE.Vector3, f: FrameInput): void;
  /** After the scene has been torn down (camera restored), before the closing fade: pay rewards here. */
  onFinish?(r: CutsceneResult): void;
  /** Once the screen is covered again, just before the fade back in. */
  onDone?(): void;
}

/** What hooks and custom cameras get to look at. */
export interface RunnerCtx {
  world: World3D;
  preview: boolean;
  /** Seconds since the scene started. */
  tt: number;
  /** The dialogue line being shown, or null. */
  say: Extract<Beat, { type: 'say' }> | null;
  /** Is `id` mid-line (still typing)? */
  speaking(id: string): boolean;
  /** Ease the camera toward a wanted position + look-at (the feast / gathering feel); honours a running `shot` ease. */
  follow(camera: THREE.PerspectiveCamera, focus: THREE.Vector3, f: FrameInput, pos: THREE.Vector3, look: THREE.Vector3): void;
  /** Everybody (and the player) hops together for `dur` seconds. */
  hop(dur?: number): void;
  fx(kind: 'confetti' | 'harvest' | 'twinkle' | 'welcome', at: At | 'all', y?: number): void;
  /** Tile position of a villager id, 'player' or a point. */
  point(at: At): { x: number; z: number };
  finish(): void;
}

interface Actor { x: number; y: number; facing: Facing; moving: boolean }
interface Walk { a: Actor; tx: number; ty: number; speed: number; t: number; done: boolean }
type Cur = { beat: Beat; t: number; walk?: Walk } | null;

let current: { skip(): void; advance(): void } | null = null;
export const isRunnerPlaying = () => current !== null;
export const skipRunner = () => current?.skip();
export const advanceRunner = () => current?.advance();

/** Play a scene. Returns false (and does nothing) if a runner scene is already up. */
export function playCutscene(scene: CutsceneScene): boolean {
  if (current) return false;
  const world = getWorld();
  const preview = !!scene.preview;
  const tm: Timing = { ...TIMING, ...scene.timing };
  const beats = scene.beats;
  const defOf = (id: string): VillagerDef | undefined => VILLAGERS.find((v) => v.id === id);

  let tt = 0, idx = 0, lineT = 0, blipped = 0, lastSpeaker = '';
  let cur: Cur = null, say: Extract<Beat, { type: 'say' }> | null = null;
  let endAt = -1, skipAt = -1, finished = false, started = false;
  let hopAt = -1, hopDur = 3.2, titleForce: boolean | null = null;
  // fadeNow = the level fade beats hold (0 = none); beatFade = the ramp in progress, dropped once it lands
  let beatFade: { from: number; to: number; at: number; dur: number } | null = null, fadeNow = 0;
  const emotes: { who: string; kind: 'talk' | 'hop' | 'gasp'; at: number; dur: number }[] = [];
  const walks: Walk[] = [];
  const moved = new Map<Npc, { x: number; y: number; tx: number; ty: number; facing: Facing }>();

  // the player stands where the scene puts her (px), or where she already is
  const pose: Actor = scene.player
    ? { x: scene.player.x * TS, y: scene.player.z * TS, facing: scene.player.facing, moving: false }
    : { x: player.x, y: player.y, facing: player.facing, moving: false };

  const actorOf = (who: string): Actor | null => {
    if (who === 'player') return pose;
    const n = npcs.find((m) => m.def.id === who);
    if (!n) return null;
    if (!moved.has(n)) moved.set(n, { x: n.x, y: n.y, tx: n.tx, ty: n.ty, facing: n.facing });
    return n;
  };
  const point = (at: At) => {
    if (typeof at !== 'string') return at;
    const a = actorOf(at);
    return a ? { x: a.x / TS, z: a.y / TS } : { x: pose.x / TS, z: pose.y / TS };
  };
  /** Turn toward a px point. `sticky` (walking) keeps the current facing until the other axis clearly wins, so
   *  near-diagonal walks don't flicker between two facings every frame. */
  const faceToward = (a: Actor, x: number, y: number, sticky = false) => {
    const dx = x - a.x, dy = y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax + ay < 1e-3) return;
    const want: Facing = ax > ay ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    if (sticky && want !== a.facing) {
      const keep = a.facing === 'left' ? dx < 0 && ax > ay * 0.6 : a.facing === 'right' ? dx > 0 && ax > ay * 0.6
        : a.facing === 'up' ? dy < 0 && ay > ax * 0.6 : dy > 0 && ay > ax * 0.6;
      if (keep) return;
    }
    a.facing = want;
  };

  // ---- camera ----
  const look = new THREE.Vector3(), camPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3(pose.x / TS, 1, pose.y / TS), wantPos = new THREE.Vector3(pose.x / TS, 6, pose.y / TS + 9);
  let camInit = false;
  let ease: { fp: THREE.Vector3; fl: THREE.Vector3; tp: THREE.Vector3; tl: THREE.Vector3; t: number; dur: number } | null = null;
  const follow: RunnerCtx['follow'] = (camera, focus, f, pos, lk) => {
    if (!camInit) { camPos.copy(pos); look.copy(lk); camInit = true; }
    if (ease) {
      const k = glide(ease.t / ease.dur);
      camPos.lerpVectors(ease.fp, ease.tp, k); look.lerpVectors(ease.fl, ease.tl, k);
    } else {
      const k = 1 - Math.pow(0.04, f.dt);
      camPos.lerp(pos, k); look.lerp(lk, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(look);
    focus.copy(look).setY(0);
  };

  // ---- ctx ----
  const fx: RunnerCtx['fx'] = (kind, at, y = 0.8) => {
    if (at === 'all') { if (kind === 'welcome') for (const n of presentNpcs()) welcomeAt(new THREE.Vector3(n.x / TS, heightAtUnits(n.x / TS, n.y / TS) + 0.7, n.y / TS)); return; }
    const p = point(at), v = new THREE.Vector3(p.x, heightAtUnits(p.x, p.z) + y, p.z);
    if (kind === 'confetti') confettiAt(v); else if (kind === 'harvest') harvestAt(v); else if (kind === 'twinkle') twinkleAt(v); else welcomeAt(v);
  };
  const c: RunnerCtx = {
    world, preview,
    get tt() { return tt; },
    get say() { return say; },
    speaking: (id) => !!say && say.who === id && lineT * CPS < say.text.length,
    follow,
    hop(dur = 3.2) { hopAt = tt; hopDur = dur; },
    fx, point,
    finish() { if (endAt < 0) { endAt = tt; say = null; cur = null; ui.closeDialogue(); } },
  };

  const ui: CutsceneUi = createCutsceneUi({ tap: () => advance(), skip: () => skip() }, scene.title ?? { name: '', sub: '' });
  const releaseKeys = captureSceneKeys((k) => { if (k === 'back') skip(); else if (k === 'confirm') advance(); });

  function skip() { if (skipAt < 0 && !finished) skipAt = tt; }
  function advance() {
    if (finished || skipAt >= 0 || endAt >= 0) return;
    if (!say) { if (!started && tt > 1.5) skip(); return; } // before the first beat a tap skips; mid-scene waits ignore taps
    if (lineT * CPS < say.text.length) lineT = say.text.length / CPS; else endBeat();
  }

  // ---- beat engine ----
  function endBeat() { cur = null; say = null; idx++; pump(); }
  /** Start beats until one blocks (or the script ends). */
  function pump() {
    while (!cur && endAt < 0) {
      if (idx >= beats.length) { c.finish(); return; }
      const b = beats[idx];
      const blocks = begin(b);
      if (endAt >= 0) return; // the beat (a `call` or a line's `on`) finished the scene
      if (blocks) { cur = { beat: b, t: 0 }; if (b.type === 'walk') cur.walk = walks[walks.length - 1]; return; }
      idx++;
    }
  }
  /** Fire a beat; true if the script should wait for it. */
  function begin(b: Beat): boolean {
    switch (b.type) {
      case 'say': {
        const def = defOf(b.who);
        if (!def) { console.warn(`cutscene: no villager "${b.who}", line skipped`); b.on?.(c); return false; } // a typo never crashes a scene
        say = b; lineT = 0; blipped = 0;
        ui.setLine(b.text, 0, false); // never flash the previous line while the bubble pops in
        if (b.who !== lastSpeaker) { lastSpeaker = b.who; ui.openDialogue(def, def.name.split(' ')[0]); }
        b.on?.(c);
        return true;
      }
      case 'wait': quiet(); return true;
      case 'shot': {
        const tp = new THREE.Vector3(...b.pos), tl = new THREE.Vector3(...b.look);
        if (!b.dur) { wantPos.copy(tp); wantLook.copy(tl); return false; }
        ease = { fp: camInit ? camPos.clone() : tp, fl: camInit ? look.clone() : tl, tp, tl, t: 0, dur: b.dur };
        wantPos.copy(tp); wantLook.copy(tl);
        if (b.wait !== false) quiet();
        return b.wait !== false;
      }
      case 'walk': {
        const a = actorOf(b.who), to = point(b.to);
        if (!a) return false;
        const w: Walk = { a, tx: to.x * TS, ty: to.z * TS, speed: (b.speed ?? 2.4) * TS, t: 0, done: false };
        for (let i = walks.length - 1; i >= 0; i--) if (walks[i].a === a) { walks[i].done = true; walks.splice(i, 1); } // a new walk replaces theirs
        walks.push(w);
        if (b.wait !== false) quiet();
        return b.wait !== false;
      }
      case 'face': { const a = actorOf(b.who), p = point(b.at); if (a) faceToward(a, p.x * TS, p.z * TS); return false; }
      case 'emote':
        if (b.who === 'all') c.hop(b.dur);
        else emotes.push({ who: b.who, kind: b.kind, at: tt, dur: b.dur ?? (b.kind === 'gasp' ? 0.5 : b.kind === 'talk' ? 1.5 : 3.2) });
        return false;
      case 'fx': fx(b.fx, b.at, b.y); return false;
      case 'sfx': sfx[b.name](); return false;
      case 'call': b.fn(c); return false;
      case 'fade':
        beatFade = { from: fadeNow, to: clamp01(b.to), at: tt, dur: Math.max(0.01, b.dur) };
        return b.wait !== false;
      case 'title': titleForce = b.on; return false;
    }
  }
  /** A non-dialogue pause closes the bubble. */
  function quiet() { ui.closeDialogue(); lastSpeaker = ''; }

  function updateCur(dt: number) {
    if (!cur) return;
    const b = cur.beat;
    cur.t += dt;
    if (b.type === 'say') {
      lineT += dt;
      const text = b.text, shown = Math.min(text.length, Math.floor(lineT * CPS)), done = shown >= text.length;
      if (shown > blipped) { if (/\S/.test(text[shown - 1] ?? ' ') && shown % 2 === 0) sfx.blip(b.who, shown); blipped = shown; }
      ui.setLine(text, shown, done);
      if (done && lineT > text.length / CPS + HOLD + text.length * HOLD_PER_CHAR) endBeat();
    } else if (b.type === 'wait') { if (cur.t >= b.sec) endBeat(); }
    else if (b.type === 'shot') { if (cur.t >= (b.dur ?? 0)) endBeat(); }
    else if (b.type === 'walk') { if (cur.walk?.done) endBeat(); }
    else if (b.type === 'fade') { if (cur.t >= b.dur) endBeat(); }
  }

  function updateWalks(dt: number) {
    for (let i = walks.length - 1; i >= 0; i--) {
      const w = walks[i], dx = w.tx - w.a.x, dy = w.ty - w.a.y, d = Math.hypot(dx, dy);
      if (d < 2) { w.a.x = w.tx; w.a.y = w.ty; w.a.moving = false; w.done = true; walks.splice(i, 1); continue; }
      // ease in over the first steps and slow down for the last third of a tile: a toddle, not a slide
      w.t += dt;
      const step = Math.min(d, w.speed * dt * Math.min(1, 0.35 + w.t * 3.5) * Math.max(0.45, Math.min(1, d / (TS * 0.35))));
      w.a.x += (dx / d) * step; w.a.y += (dy / d) * step; w.a.moving = true;
      faceToward(w.a, w.tx, w.ty, true);
    }
  }

  // ---- director ----
  // Every bounce is phased from when it started, so nobody pops up mid-air, and finishes its last hop on the ground.
  function bounce(a: string): number {
    let y = 0;
    if (say && say.who === a && lineT < landed(say.text.length / CPS)) y += Math.abs(Math.sin(lineT * BOUNCE)) * 0.06;
    for (const e of emotes) {
      if (e.who !== a) continue;
      const age = tt - e.at;
      if (age < 0 || age > e.dur) continue;
      if (e.kind === 'talk') y += Math.abs(Math.sin(age * BOUNCE)) * 0.06;
      else if (e.kind === 'hop') y += (1 - age / e.dur) * Math.abs(Math.sin(age * BOUNCE)) * 0.22;
      else y += Math.sin((age / e.dur) * Math.PI) * 0.3;
    }
    return y;
  }
  /** The party hop: a little stagger per person (`lag` s), fading out over hopDur. */
  function partyHop(lag: number, h: number): number {
    if (hopAt < 0) return 0;
    const age = tt - hopAt - lag;
    if (age < 0 || age > landed(hopDur)) return 0;
    return Math.max(0, 1 - age / hopDur) * Math.abs(Math.sin(age * BOUNCE)) * h;
  }
  world.setDirector({
    stage(f) {
      // the speaker bounces a little while talking; everybody hops together (a touch staggered) on a party beat
      let i = 0;
      for (const n of presentNpcs()) {
        const v = world.villager(n.def.id);
        if (!v) continue;
        v.root.position.y += bounce(n.def.id) + partyHop((i * 0.1) % HALF, 0.22);
        i++;
      }
      world.playerMesh.root.position.y += bounce('player') + partyHop(0.04, 0.25);
      scene.stage?.(c, f);
    },
    shoot(camera, focus, f) {
      if (scene.shoot) scene.shoot(c, camera, focus, f);
      else follow(camera, focus, f, wantPos, wantLook);
    },
  });
  setFade(1);
  current = { skip, advance };
  scene.setup?.(c);

  function finishNow() {
    if (finished) return;
    finished = true;
    halt();
    releaseKeys();
    ui.destroy();
    world.setDirector(null);
    for (const [n, o] of moved) { n.x = o.x; n.y = o.y; n.tx = o.tx; n.ty = o.ty; n.facing = o.facing; n.moving = false; }
    cancelPath();
    world.snapCamera(player.x, player.y - 1.2 * TS);
    current = null;
    if (!preview && scene.id) markCutsceneSeen(scene.id);
    scene.onFinish?.({ skipped: skipAt >= 0, completed: endAt >= 0, preview });
    if (!preview) saveGame();
    setFade(1);
    scene.onDone?.();
    void fadeTo(0, 700);
  }

  const halt = runScene('cutscene', (t, dt) => {
    tt += dt;
    const clock = getClock();
    if (endAt < 0 && !started && tt >= tm.lead) { started = true; pump(); }
    updateCur(dt);
    updateWalks(dt);
    for (let i = emotes.length - 1; i >= 0; i--) if (tt - emotes[i].at > emotes[i].dur) emotes.splice(i, 1);
    if (ease) { ease.t += dt; if (ease.t >= ease.dur) ease = null; } // a shot's ease runs on its own clock
    ui.showTitle(titleForce ?? (!!scene.title && tt > tm.titleFrom && tt < tm.titleTo && skipAt < 0));
    let fade = 1 - smooth(0.1, tm.fadeIn, tt);
    if (beatFade) {
      const k = (tt - beatFade.at) / beatFade.dur;
      fadeNow = k >= 1 ? beatFade.to : beatFade.from + (beatFade.to - beatFade.from) * smooth(0, 1, k);
      if (k >= 1) beatFade = null; // landed: hold fadeNow (0 = clear) until the next fade beat
    }
    if (fadeNow > 0.001) fade = Math.max(fade, fadeNow);
    if (endAt >= 0) fade = Math.max(fade, smooth(tm.endHold, tm.endHold + tm.fadeOut, tt - endAt));
    if (skipAt >= 0) fade = Math.max(fade, smooth(0, tm.skipFade, tt - skipAt));
    setFade(fade);
    const hour = typeof scene.hour === 'function' ? scene.hour(c) : scene.hour ?? clock.hour;
    world.render({
      t, dt, hour, season: clock.season,
      player: pose, look: currentLook(), accessory: currentAccessory(), npcs: presentNpcs(), talkedToday: () => true,
    });
    if ((endAt >= 0 && tt - endAt >= tm.endHold + tm.fadeOut) || (skipAt >= 0 && tt - skipAt >= tm.skipFade)) finishNow();
  });
  return true;
}
