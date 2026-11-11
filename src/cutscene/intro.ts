// New-game intro (~30 s, in-engine): the camera glides in over the sea, the newcomer drifts down in a
// striped balloon and lands by the café, and Mimsy shuffles over to say hello.
// Plays once per save (state.seenIntro). Skippable at any moment.
import * as THREE from 'three';
import { currentOutfit } from '../boutique';
import { VILLAGERS } from '../data';
import { initNpcs, npcs, updateNpcs } from '../npc';
import { cancelPath, player } from '../player';
import { createBalloon, type Balloon } from '../render/balloon';
import { getWorld, runScene } from '../render/stage';
import { heightAtUnits } from '../render/terrain';
import type { Director } from '../render/world3d';
import { saveGame } from '../save';
import { state } from '../state';
import { getClock } from '../time';
import { TS } from '../world';
import { createCutsceneUi, type CutsceneUi } from '../ui/cutsceneUi';
import { fadeTo, setFade } from '../ui/fade';
import { captureSceneKeys } from '../ui/sceneInput';

/** Mimsy's greeting. Edit freely; timing adapts to the text length. */
export const INTRO_LINES = [
  'Oh…! A balloon? I thought I was dreaming again. You must be our new neighbor!',
  "I'm Mimsy. Welcome to Sugarlily Isle — it's small, and sleepy, and it always smells like coffee.",
  'The café is right behind me, the boutique is next door, and your own little yard is down the west path.',
  'Take all the time you like settling in. Nobody hurries here… especially not me. *yawn*',
];

/** True when the intro has not been seen on the current save. */
export const shouldPlayIntro = () => !state.seenIntro;
/** Mark the intro as seen on the current save and write the save. */
export function markIntroSeen() { state.seenIntro = true; saveGame(); }

export interface IntroOptions {
  /** Built-in keyboard handling (Enter / E / Space advance, Esc skips). Set false if the input layer routes keys itself. */
  keys?: boolean;
}

// ---- staging (tile units; x east, z south) ----
const LAND = { x: 29.4, z: 17.0 };          // balloon touches down on the path in front of the café
const PLAYER_AT = { x: 27.9, z: 16.9 };     // where the newcomer ends up (gameplay starts here)
const MIMSY_FROM = { x: 25.5, z: 15.9 };
const MIMSY_AT = { x: 26.75, z: 16.8 };
const FLIGHT = [[39, 15, 56], [36.5, 12.5, 44], [33.2, 8.6, 31.5], [30.6, 4.0, 22], [LAND.x, 0, LAND.z]] as const;

// ---- timing (seconds) ----
const T_FADE_IN = 1.4;
const T_TITLE: [number, number] = [1.3, 6.2];
const T_LAND = 14.5;       // touchdown
const T_HOP = 15.7;        // newcomer hops out
const HOP_LEN = 0.85;
const T_TALK = 17.6;       // first line starts
const CPS = 36;            // typewriter characters per second
const HOLD = 1.5;          // pause after a finished line before auto-advancing
const OUTRO_LEN = 2.8;
const OUTRO_FADE = 1.1;    // the last part of the outro fades out
const SKIP_FADE = 0.45;

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Run { skip(): void; advance(): void }
let current: Run | null = null;

export const isCutscenePlaying = () => current !== null;
/** End the cutscene now (quick fade). Esc / the Skip pill. */
export function skipCutscene() { current?.skip(); }
/** A / tap: during the dialogue, finish the line or go to the next one; before the dialogue it skips. */
export function advanceCutscene() { current?.advance(); }

/**
 * Play the arrival cutscene, then call onDone (start or resume gameplay there). The newcomer is left standing
 * by the café and the save is marked as having seen the intro. Works before startGame() or over a running game.
 */
export function startIntroCutscene(onDone?: () => void, opts: IntroOptions = {}) {
  if (current) return;
  const world = getWorld();
  initNpcs();
  const mimsyDef = VILLAGERS.find((v) => v.id === 'mimsy')!;
  const mimsy = npcs.find((n) => n.def.id === 'mimsy')!;
  const balloon: Balloon = createBalloon();
  world.scene.add(balloon.group);

  const groundLand = heightAtUnits(LAND.x, LAND.z);
  const flight = new THREE.CatmullRomCurve3(FLIGHT.map((p, i) => new THREE.Vector3(p[0], i === FLIGHT.length - 1 ? groundLand : p[1], p[2])), false, 'centripetal');
  const bPos = new THREE.Vector3().copy(flight.getPoint(0));

  let tt = 0;                       // scene time
  let line = 0, lineT = 0;          // dialogue progress
  let talking = false, talkDone = false;
  let outroAt = -1;                 // scene time the outro began
  let skipAt = -1;
  let finished = false;
  const fake = { x: LAND.x * TS, y: LAND.z * TS, facing: 'down' as 'down' | 'left', moving: false };
  let riding = true, hopK = 0;
  mimsy.busy = true;
  mimsy.x = MIMSY_FROM.x * TS; mimsy.y = MIMSY_FROM.z * TS; mimsy.facing = 'down'; mimsy.moving = false;
  let mimsyAlert = false;

  const ui: CutsceneUi = createCutsceneUi({ tap: () => run.advance(), skip: () => run.skip() }, { name: 'Sugarlily Isle', sub: 'a little island, far from any hurry' });
  const releaseKeys = opts.keys === false ? null : captureSceneKeys((k) => { if (k === 'back') run.skip(); else if (k === 'confirm') run.advance(); });

  // camera state (smoothed towards the scripted pose)
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  let camInit = false;
  const ISLAND = new THREE.Vector3(30, 1, 20);
  const TALK_LOOK = new THREE.Vector3(28.0, 0.62, 16.9);

  function scriptCamera(aspect: number, t: number) {
    const narrow = aspect < 1.25 ? 1 + (1.25 - aspect) * 1.15 : 1; // pull back on tall screens
    // 1) high over the sea, sliding towards the island
    const a = smooth(0, 9.5, tt);
    wantPos.set(lerp(55, 41, a), lerp(25, 13.5, a), lerp(70, 44, a));
    wantLook.copy(ISLAND).lerp(v1.copy(bPos).setY(bPos.y + 2.2), smooth(2.5, 8.5, tt) * 0.85);
    // 2) swing in beside the balloon as it comes down
    const b = smooth(7.5, T_LAND + 0.6, tt);
    v1.set(bPos.x + lerp(6.5, -1.0, b) , bPos.y + lerp(3.2, 2.9, b), bPos.z + lerp(11.5, 7.6, b) * narrow);
    wantPos.lerp(v1, b);
    // 3) settle into the conversation two-shot
    const c = smooth(T_LAND - 1.2, T_HOP + 1.2, tt);
    v1.set(TALK_LOOK.x + 0.25, TALK_LOOK.y + 2.05 * narrow, TALK_LOOK.z + 7.3 * narrow);
    v1.x += Math.sin(t * 0.31) * 0.12; v1.y += Math.sin(t * 0.43) * 0.05; // a little life while they chat
    if (talking) v1.z -= Math.min(0.9, (line + Math.min(1, lineT / 2)) * 0.22); // creep closer line by line
    wantPos.lerp(v1, c);
    wantLook.lerp(TALK_LOOK, c);
    // 4) outro: lift towards the gameplay camera so the hand-off is gentle
    if (outroAt >= 0) {
      const o = smooth(0, OUTRO_LEN, tt - outroAt);
      v1.set(PLAYER_AT.x, 12 * narrow, PLAYER_AT.z - 1.2 + 10 * narrow);
      v2.set(PLAYER_AT.x, 0, PLAYER_AT.z - 1.2);
      wantPos.lerp(v1, o * 0.8);
      wantLook.lerp(v2, o * 0.8);
    }
  }

  const director: Director = {
    stage(f) {
      // balloon
      const flyU = 1 - Math.pow(1 - Math.min(1, tt / T_LAND), 1.75); // quick over the sea, feather-soft at the end
      bPos.copy(flight.getPoint(flyU));
      let air = 1 - smooth(T_LAND - 2.2, T_LAND, tt);
      let squash = 0;
      if (tt >= T_LAND) { const s = tt - T_LAND; squash = Math.exp(-s * 5) * Math.sin(s * 16) * 0.07; } // touchdown wobble
      if (outroAt >= 0) { // off it floats again, empty
        const o = Math.max(0, tt - outroAt - 0.2);
        const e = o * o;
        bPos.set(LAND.x + e * 0.5, groundLand + e * 1.25, LAND.z - e * 0.25);
        air = Math.min(1, o * 1.5);
      }
      balloon.group.position.copy(bPos);
      balloon.group.scale.set(1 + squash, 1 - squash * 1.6, 1 + squash);
      balloon.group.rotation.y = 0.5 + (1 - smooth(0, T_LAND, tt)) * 1.6;
      balloon.animate(f.t, air);

      // newcomer: riding in the basket, then a hop down onto the path
      const p = world.playerMesh.root;
      if (riding) {
        p.position.set(bPos.x, bPos.y + balloon.riderY + Math.sin(f.t * 1.3) * 0.12 * air, bPos.z);
        p.rotation.y = balloon.group.rotation.y - 0.5;
      } else if (hopK < 1) {
        const k = hopK, gy = heightAtUnits(PLAYER_AT.x, PLAYER_AT.z);
        p.position.set(lerp(LAND.x, PLAYER_AT.x, k), lerp(groundLand + balloon.riderY, gy, k) + Math.sin(k * Math.PI) * 1.15, lerp(LAND.z, PLAYER_AT.z, k));
        p.rotation.y = lerp(0, 0.45, k);
      } else {
        p.rotation.y = 0.45; // three-quarters towards the camera while chatting
      }
      const m = world.villager('mimsy');
      if (m) m.root.rotation.y = -0.5 * smooth(T_HOP, T_TALK, tt);
    },
    shoot(camera, focus, f) {
      scriptCamera(camera.aspect, f.t);
      if (!camInit) { camPos.copy(wantPos); camLook.copy(wantLook); camInit = true; }
      const k = 1 - Math.pow(0.02, f.dt);
      camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      focus.copy(camLook).setY(0);
    },
  };
  world.setDirector(director);
  setFade(1);

  function finish() {
    if (finished) return;
    finished = true;
    halt();
    releaseKeys?.();
    ui.destroy();
    world.setDirector(null);
    world.scene.remove(balloon.group);
    world.playerMesh.root.rotation.y = 0;
    const m = world.villager('mimsy');
    if (m) m.root.rotation.y = 0;
    // leave everyone where the scene ended
    mimsy.x = mimsy.tx = MIMSY_AT.x * TS; mimsy.y = mimsy.ty = MIMSY_AT.z * TS;
    mimsy.facing = 'down'; mimsy.moving = false; mimsy.busy = false; mimsy.wait = 5;
    state.px = player.x = PLAYER_AT.x * TS; state.py = player.y = PLAYER_AT.z * TS;
    state.facing = player.facing = 'down';
    cancelPath();
    world.snapCamera(player.x, player.y - 1.2 * TS);
    current = null;
    markIntroSeen();
    setFade(1);
    onDone?.();
    void fadeTo(0, 700);
  }

  const run: Run = {
    skip() { if (skipAt < 0 && !finished) skipAt = tt; },
    advance() {
      if (finished || skipAt >= 0 || outroAt >= 0) return;
      if (!talking) { if (tt > 0.6) run.skip(); return; }
      const text = INTRO_LINES[line];
      if (lineT * CPS < text.length) lineT = text.length / CPS; // finish typing
      else nextLine();
    },
  };
  current = run;

  function nextLine() {
    line++; lineT = 0;
    if (line >= INTRO_LINES.length) { talking = false; talkDone = true; outroAt = tt; ui.closeDialogue(); }
  }

  const halt = runScene('cutscene', (t, dt) => {
    tt += dt;
    // --- beats ---
    ui.showTitle(tt > T_TITLE[0] && tt < T_TITLE[1] && skipAt < 0);
    if (tt >= T_LAND - 0.5) mimsyAlert = !talking && !talkDone; // she has spotted the balloon
    if (riding) { fake.x = bPos.x * TS; fake.y = bPos.z * TS; if (tt >= T_HOP) riding = false; }
    else if (hopK < 1) {
      hopK = Math.min(1, hopK + dt / HOP_LEN);
      fake.x = lerp(LAND.x, PLAYER_AT.x, hopK) * TS; fake.y = lerp(LAND.z, PLAYER_AT.z, hopK) * TS;
      if (hopK >= 1) fake.facing = 'left';
    }
    // Mimsy toddles over once the balloon is down
    const mk = smooth(T_LAND + 0.3, T_TALK - 0.3, tt);
    mimsy.x = lerp(MIMSY_FROM.x, MIMSY_AT.x, mk) * TS; mimsy.y = lerp(MIMSY_FROM.z, MIMSY_AT.z, mk) * TS;
    mimsy.moving = mk > 0.02 && mk < 0.98;
    mimsy.facing = mk > 0 ? 'right' : 'down';
    if (!talking && !talkDone && tt >= T_TALK) { talking = true; line = 0; lineT = 0; ui.openDialogue(mimsyDef, mimsyDef.name.split(' ')[0]); }
    if (talking) {
      lineT += dt;
      const text = INTRO_LINES[line];
      const shown = Math.min(text.length, Math.floor(lineT * CPS));
      const done = shown >= text.length;
      ui.setLine(text, shown, done);
      if (done && lineT > text.length / CPS + HOLD + text.length * 0.012) nextLine();
    }
    // --- fades ---
    let fade = 1 - smooth(0.15, T_FADE_IN, tt);
    if (outroAt >= 0) fade = Math.max(fade, smooth(OUTRO_LEN - OUTRO_FADE, OUTRO_LEN, tt - outroAt));
    if (skipAt >= 0) fade = Math.max(fade, smooth(0, SKIP_FADE, tt - skipAt));
    setFade(fade);

    updateNpcs(dt);
    mimsy.moving = mk > 0.02 && mk < 0.98; // (updateNpcs clears it for busy villagers)
    world.render({
      t, dt, hour: getClock().hour, season: getClock().season,
      player: fake, outfit: currentOutfit(), npcs, talkedToday: (id) => id !== 'mimsy' || !mimsyAlert,
    });

    if ((outroAt >= 0 && tt - outroAt >= OUTRO_LEN) || (skipAt >= 0 && tt - skipAt >= SKIP_FADE)) finish();
  });
}
