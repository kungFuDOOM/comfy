// The Harvest Hush Feast cutscene (Nov 26): every villager is at the long table; the camera visits each one for a
// short thank-you, then everyone says it together and the player is rewarded. Skippable, replayable (no second reward).
import * as THREE from 'three';
import { sfx } from '../audio';
import { currentAccessory } from '../boutique';
import { toast } from '../bus';
import { VILLAGERS, type VillagerDef } from '../data';
import { bumpEvent, eventFlag, isPeakDay, setEventFlag } from '../events';
import { presentNpcs } from '../npc';
import { cancelPath, player } from '../player';
import { confettiAt, harvestAt, welcomeAt } from '../render/celebrate';
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
import { FEAST_CLOSE, FEAST_GROUP, FEAST_OPEN, FEAST_THANKS, FEAST_THANKS_FALLBACK, type FeastLine } from './harvestText';
import { PLAYER_SEAT, SEATS, SEAT_ORDER, TABLE_CENTER } from './harvestLayout';

const CPS = 42, HOLD = 1.2, HOLD_PER_CHAR = 0.012, FADE_IN = 0.9, FADE_OUT = 0.9;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

let playing = false;
export const feastPlaying = () => playing;

interface Beat extends FeastLine { group?: boolean; close?: boolean }

/** The ordered lines for the people actually sitting at the table. */
function script(): Beat[] {
  const here = new Set(presentNpcs().map((n) => n.def.id));
  const beats: Beat[] = FEAST_OPEN.filter((l) => here.has(l.who)).map((l) => ({ ...l }));
  const gaveByVillager = (id: string) => eventFlag('harvest', `pie_${id}`);
  // everyone but the host thanks the player in seating order, the host closes the round
  for (const id of SEAT_ORDER) {
    if (id === 'mimsy' || !here.has(id)) continue;
    const t = FEAST_THANKS[id] ?? FEAST_THANKS_FALLBACK;
    beats.push({ who: id, text: gaveByVillager(id) ? t.pie : t.text });
  }
  if (here.has('mimsy')) { const t = FEAST_THANKS.mimsy; beats.push({ who: 'mimsy', text: gaveByVillager('mimsy') ? t.pie : t.text }); }
  FEAST_GROUP.forEach((l, i) => beats.push({ ...l, group: i === FEAST_GROUP.length - 1 }));
  beats.push({ ...FEAST_CLOSE, close: true });
  return beats;
}

/** Play the feast. `replay` = already attended: same scene, no second reward. */
export function startFeast(replay = false, onDone?: () => void) {
  if (playing || !isPeakDay('harvest')) return;
  playing = true;
  const world = getWorld();
  const beats = script();
  const defOf = (id: string): VillagerDef => VILLAGERS.find((v) => v.id === id)!;
  const seatOf = (id: string) => { const i = SEAT_ORDER.indexOf(id); return i >= 0 ? SEATS[i] : { x: TABLE_CENTER.x, z: TABLE_CENTER.z }; };

  let tt = 0, line = 0, lineT = 0, blipped = 0;
  let talking = false, lastSpeaker = '', groupAt = -1, endAt = -1, skipAt = -1, finished = false;
  const ui: CutsceneUi = createCutsceneUi({ tap: () => advance(), skip: () => skip() }, { name: 'Harvest Hush Feast', sub: 'Feast Day in Sugarlily Square' });
  const releaseKeys = captureSceneKeys((k) => { if (k === 'back') skip(); else if (k === 'confirm') advance(); });
  const fake = { x: PLAYER_SEAT.x * TS, y: PLAYER_SEAT.z * TS, facing: 'up' as const, moving: false };

  const look = new THREE.Vector3(TABLE_CENTER.x, 0.9, TABLE_CENTER.z), wantLook = new THREE.Vector3();
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
      const base = new THREE.Vector3(TABLE_CENTER.x, heightAtUnits(TABLE_CENTER.x, TABLE_CENTER.z) + 0.8, TABLE_CENTER.z);
      confettiAt(base); harvestAt(base);
      for (const n of presentNpcs()) welcomeAt(new THREE.Vector3(n.x / TS, heightAtUnits(n.x / TS, n.y / TS) + 0.7, n.y / TS));
    }
  }

  const director: Director = {
    stage(f) {
      // the speaker bounces a little while talking; everybody hops together for the group thank-you
      const hop = groupAt >= 0 ? Math.max(0, 1 - (tt - groupAt) / 3.2) : 0;
      let i = 0;
      for (const n of presentNpcs()) {
        const v = world.villager(n.def.id);
        if (!v) continue;
        const speaking = talking && beats[line]?.who === n.def.id && lineT * CPS < beats[line].text.length;
        v.root.position.y += (speaking ? Math.abs(Math.sin(f.t * 9)) * 0.06 : 0) + hop * Math.abs(Math.sin(f.t * 9 + i * 0.9)) * 0.22;
        // turn to face the speaker's side of the table a touch: otherwise just toward the table
        i++;
      }
      world.playerMesh.root.position.y += hop * Math.abs(Math.sin(f.t * 9 + 0.4)) * 0.25;
    },
    shoot(camera, focus, f) {
      const narrow = camera.aspect < 1.25 ? 1 + (1.25 - camera.aspect) * 1.1 : 1;
      const who = talking ? beats[line].who : '';
      const seat = who && !beats[line].group ? seatOf(who) : { x: TABLE_CENTER.x, z: TABLE_CENTER.z };
      const wide = !talking || beats[line].group || beats[line].close;
      wantLook.set(wide ? TABLE_CENTER.x : seat.x, 0.9, wide ? TABLE_CENTER.z : seat.z);
      // camera on the opposite side of the table from the speaker, orbiting a little
      const side = wide ? 0 : ('face' in seat && seat.face === 'right' ? 1 : -1);
      const orbit = Math.sin(f.t * 0.25) * 0.9;
      const dist = (wide ? 8.6 : 5.0) * narrow, height = (wide ? 5.4 : 2.6) * narrow;
      wantPos.set(wantLook.x + side * dist * 0.55 + orbit * (wide ? 1.6 : 0.5), wantLook.y + height, wantLook.z + dist * (wide ? 0.95 : 0.8));
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
    if (!replay && endAt >= 0) {
      setEventFlag('harvest', 'feastDone');
      bumpEvent('harvest', 'feast', 1); // pays the feast milestone: pips, cozy outfits and the cornucopia
      toast('Everyone says thank you! 🍂 Check your wardrobe and bag for feast-day gifts.');
      sfx.quest();
    } else if (replay && endAt >= 0) toast('What a lovely feast. Happy Harvest Hush! 🍂');
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
