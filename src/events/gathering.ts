// The Christmas Eve (Dec 24) and Christmas Day (Dec 25) gatherings: every villager stands round the town tree, the
// camera visits each one for a short wish (Eve) or gift (Day), everyone cheers together, the tree lights up and the
// player is rewarded. Skippable (skipping still pays) and replayable (no second reward). A close cousin of the harvest feast scene, with
// its own seats and words; nothing here is shared with the feast logic.
import * as THREE from 'three';
import { sfx } from '../audio';
import { currentAccessory } from '../boutique';
import { toast } from '../bus';
import { VILLAGERS, type VillagerDef } from '../data';
import { bumpEvent, hasClaimed, isEventActive, setEventFlag } from '../events';
import { eventAttended } from '../friends';
import { presentNpcs } from '../npc';
import { cancelPath, player } from '../player';
import { confettiAt, twinkleAt, welcomeAt } from '../render/celebrate';
import { getWorld, runScene } from '../render/stage';
import { heightAtUnits } from '../render/terrain';
import type { Director } from '../render/world3d';
import { saveGame } from '../save';
import { getClock } from '../time';
import { createCutsceneUi, type CutsceneUi } from '../ui/cutsceneUi';
import { fadeTo, setFade } from '../ui/fade';
import { captureSceneKeys } from '../ui/sceneInput';
import { currentLook } from '../wardrobe';
import { TS } from '../world';
import { GATHER_ORDER, GATHER_SPOTS, PLAYER_SPOT, TREE } from './twinkleLayout';
import { gatherKind, refreshGather } from './twinkleSeats';
import { DAY_CLOSE, DAY_GIFT, DAY_GROUP, DAY_OPEN, EVE_CLOSE, EVE_GROUP, EVE_OPEN, EVE_WISH, THANKS_FALLBACK, type Line } from './twinkleText';

const CPS = 42, HOLD = 1.2, HOLD_PER_CHAR = 0.012, FADE_IN = 0.9, FADE_OUT = 0.9;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

let playing = false;
export const gatheringPlaying = () => playing;

interface Beat extends Line { group?: boolean; close?: boolean }

function script(kind: 'eve' | 'day'): Beat[] {
  const here = new Set(presentNpcs().map((n) => n.def.id));
  const eve = kind === 'eve';
  const beats: Beat[] = (eve ? EVE_OPEN : DAY_OPEN).filter((l) => here.has(l.who)).map((l) => ({ ...l }));
  const lines = eve ? EVE_WISH : DAY_GIFT;
  for (const id of GATHER_ORDER) if (id !== 'mimsy' && here.has(id)) beats.push({ who: id, text: lines[id] ?? THANKS_FALLBACK });
  if (here.has('mimsy')) beats.push({ who: 'mimsy', text: lines.mimsy });
  (eve ? EVE_GROUP : DAY_GROUP).forEach((l, i, a) => beats.push({ ...l, group: i === a.length - 1 }));
  beats.push({ ...(eve ? EVE_CLOSE : DAY_CLOSE), close: true });
  return beats;
}

/** Play the gathering. `replay` = already attended: same scene, no second reward. */
export function startGathering(kind: 'eve' | 'day', replay = false, onDone?: () => void) {
  refreshGather();
  if (playing || gatherKind() !== kind) return;
  playing = true;
  const world = getWorld();
  const beats = script(kind);
  const defOf = (id: string): VillagerDef => VILLAGERS.find((v) => v.id === id)!;
  const spotOf = (id: string) => { const i = GATHER_ORDER.indexOf(id); return i >= 0 ? GATHER_SPOTS[i] : { x: TREE.x, z: TREE.z }; };

  let tt = 0, line = 0, lineT = 0, blipped = 0;
  let talking = false, lastSpeaker = '', groupAt = -1, endAt = -1, skipAt = -1, finished = false;
  const ui: CutsceneUi = createCutsceneUi({ tap: () => advance(), skip: () => skip() }, { name: kind === 'eve' ? 'Christmas Eve' : 'Christmas Day', sub: 'Twinkle Season in Sugarlily Square' });
  const releaseKeys = captureSceneKeys((k) => { if (k === 'back') skip(); else if (k === 'confirm') advance(); });
  const fake = { x: PLAYER_SPOT.x * TS, y: PLAYER_SPOT.z * TS, facing: 'left' as const, moving: false };

  const look = new THREE.Vector3(TREE.x, 1.3, TREE.z), wantLook = new THREE.Vector3();
  const camPos = new THREE.Vector3(), wantPos = new THREE.Vector3();
  let camInit = false;

  function skip() { if (skipAt < 0 && !finished) skipAt = tt; }
  function advance() {
    if (finished || skipAt >= 0 || endAt >= 0) return;
    if (!talking) { if (tt > 1.5) skip(); return; }
    const text = beats[line].text;
    if (lineT * CPS < text.length) lineT = text.length / CPS; else nextLine();
  }
  function nextLine() {
    line++; lineT = 0; blipped = 0;
    if (line >= beats.length) { talking = false; endAt = tt; ui.closeDialogue(); return; }
    enterBeat();
  }
  function enterBeat() {
    const b = beats[line];
    if (b.who !== lastSpeaker) { lastSpeaker = b.who; ui.openDialogue(defOf(b.who), defOf(b.who).name.split(' ')[0]); }
    if (b.group) {
      groupAt = tt;
      sfx.partyHat();
      const base = new THREE.Vector3(TREE.x, heightAtUnits(TREE.x, TREE.z) + 1.4, TREE.z);
      confettiAt(base); twinkleAt(base);
      for (const n of presentNpcs()) welcomeAt(new THREE.Vector3(n.x / TS, heightAtUnits(n.x / TS, n.y / TS) + 0.7, n.y / TS));
    }
  }

  const director: Director = {
    stage(f) {
      // the speaker bounces a little while talking; everybody hops together for the group cheer
      const hop = groupAt >= 0 ? Math.max(0, 1 - (tt - groupAt) / 3.2) : 0;
      let i = 0;
      for (const n of presentNpcs()) {
        const v = world.villager(n.def.id);
        if (!v) continue;
        const speaking = talking && beats[line]?.who === n.def.id && lineT * CPS < beats[line].text.length;
        v.root.position.y += (speaking ? Math.abs(Math.sin(f.t * 9)) * 0.06 : 0) + hop * Math.abs(Math.sin(f.t * 9 + i * 0.9)) * 0.22;
        i++;
      }
      world.playerMesh.root.position.y += hop * Math.abs(Math.sin(f.t * 9 + 0.4)) * 0.25;
    },
    shoot(camera, focus, f) {
      const narrow = camera.aspect < 1.25 ? 1 + (1.25 - camera.aspect) * 1.1 : 1;
      const b = talking ? beats[line] : null;
      const wide = !b || b.group || b.close;
      const spot = b && !wide ? spotOf(b.who) : { x: TREE.x, z: TREE.z };
      wantLook.set(spot.x, wide ? 1.4 : 0.95, spot.z);
      if (wide) {
        // from the east, high over the fountain, so the friends face the camera and the cocoa stall stays out of the way
        const orbit = Math.sin(f.t * 0.25) * 1.6;
        wantPos.set(TREE.x + 6.4 * narrow, 4.8 * narrow, TREE.z + 2.2 * narrow + orbit);
      } else {
        // a three-quarter view of the speaker from the side, above the open fountain side where possible (never through the tree)
        const ox = spot.x - TREE.x, oz = spot.z - TREE.z, len = Math.hypot(ox, oz) || 1;
        let tx = -oz / len, tz = ox / len;
        if (tx < -0.3 || (Math.abs(tx) <= 0.3 && tz < 0)) { tx = -tx; tz = -tz; }
        wantPos.set(spot.x + tx * 3.2 * narrow + (ox / len) * 0.6, 2.5 * narrow, spot.z + tz * 3.2 * narrow + (oz / len) * 0.6);
      }
      if (!camInit) { camPos.copy(wantPos); look.copy(wantLook); camInit = true; }
      const k = 1 - Math.pow(0.04, f.dt);
      camPos.lerp(wantPos, k); look.lerp(wantLook, k);
      camera.position.copy(camPos);
      camera.lookAt(look);
      focus.copy(look).setY(0);
    },
  };
  world.setDirector(director);
  setFade(1);

  function finish() {
    if (finished) return;
    finished = true;
    halt();
    releaseKeys();
    ui.destroy();
    world.setDirector(null);
    cancelPath();
    world.snapCamera(player.x, player.y - 1.2 * TS);
    playing = false;
    // Watching to the end and skipping both count as attending: the reward is never lost to a skip. It is paid once,
    // keyed on the milestone itself (not the `replay` hint), and only while the event is on so the flag never gets
    // set without the payout.
    const attended = endAt >= 0 || skipAt >= 0;
    if (attended && isEventActive('twinkle')) eventAttended(`twinkle:${kind}`); // friends grow closer, once per gathering
    if (attended && !hasClaimed('twinkle', kind) && isEventActive('twinkle')) {
      bumpEvent('twinkle', kind, 1); // pays the finale milestone: pips, outfits and decor
      setEventFlag('twinkle', `${kind}Done`);
      toast(kind === 'eve' ? 'The tree is glowing! ✨ Check your wardrobe and bag for Eve gifts.' : 'Merry Christmas! 🎄 Check your wardrobe and bag for presents.');
      sfx.quest();
    } else if (attended && (replay || hasClaimed('twinkle', kind))) toast(kind === 'eve' ? 'What a lovely Eve. Merry Christmas! ✨' : 'What a lovely day. Merry Christmas! 🎄');
    saveGame();
    setFade(1);
    onDone?.();
    void fadeTo(0, 700);
  }

  const halt = runScene('cutscene', (t, dt) => {
    tt += dt;
    const clock = getClock();
    ui.showTitle(tt > 1.0 && tt < 4.4 && skipAt < 0);
    if (!talking && endAt < 0 && tt >= 4.6 && line < beats.length) { talking = true; enterBeat(); }
    if (talking) {
      lineT += dt;
      const text = beats[line].text;
      const shown = Math.min(text.length, Math.floor(lineT * CPS));
      const done = shown >= text.length;
      if (shown > blipped) { if (/\S/.test(text[shown - 1] ?? ' ') && shown % 2 === 0) sfx.blip(beats[line].who, shown); blipped = shown; }
      ui.setLine(text, shown, done);
      if (done && lineT > text.length / CPS + HOLD + text.length * HOLD_PER_CHAR) nextLine();
    }
    let fade = 1 - smooth(0.1, FADE_IN, tt);
    if (endAt >= 0) fade = Math.max(fade, smooth(1.2, 1.2 + FADE_OUT, tt - endAt));
    if (skipAt >= 0) fade = Math.max(fade, smooth(0, 0.4, tt - skipAt));
    setFade(fade);
    world.render({
      t, dt, hour: clock.hour, season: clock.season,
      player: fake, look: currentLook(), accessory: currentAccessory(), npcs: presentNpcs(), talkedToday: () => true,
    });
    if ((endAt >= 0 && tt - endAt >= 1.2 + FADE_OUT) || (skipAt >= 0 && tt - skipAt >= 0.4)) finish();
  });
}
