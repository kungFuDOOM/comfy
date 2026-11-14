// The Harvest Hush Feast cutscene (Nov 26): every villager is at the long table; the camera visits each one for a
// short thank-you, then everyone says it together and the player is rewarded. Skippable, replayable (no second reward).
// The beat loop, camera easing, UI and skip handling live in cutscene/runner.ts; this file keeps the script, the camera
// framing and the reward.
import * as THREE from 'three';
import { sfx } from '../audio';
import { toast } from '../bus';
import { bumpEvent, eventFlag, isPeakDay, setEventFlag } from '../events';
import { eventAttended } from '../friends';
import { presentNpcs } from '../npc';
import { playCutscene, type Beat as RunBeat } from '../cutscene/runner';
import { refreshFeast } from './feastSeats';
import { FEAST_CLOSE, FEAST_GROUP, FEAST_OPEN, FEAST_THANKS, FEAST_THANKS_FALLBACK, type FeastLine } from './harvestText';
import { PLAYER_SEAT, SEATS, SEAT_ORDER, TABLE_CENTER } from './harvestLayout';

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

/** Play the feast. `replay` = already attended: same scene, no second reward. `preview` = the ?cutscene= debug play: any day, no flags, no reward. */
export function startFeast(replay = false, onDone?: () => void, preview = false) {
  if (preview) refreshFeast();
  if (playing || (!preview && !isPeakDay('harvest'))) return;
  playing = true;
  const seatOf = (id: string) => { const i = SEAT_ORDER.indexOf(id); return i >= 0 ? SEATS[i] : { x: TABLE_CENTER.x, z: TABLE_CENTER.z }; };
  const beats: RunBeat[] = script().map((b) => ({
    type: 'say', who: b.who, text: b.text, wide: !!(b.group || b.close),
    on: b.group ? (c) => { c.hop(); sfx.partyHat(); c.fx('confetti', TABLE_CENTER, 0.8); c.fx('harvest', TABLE_CENTER, 0.8); c.fx('welcome', 'all'); } : undefined,
  }));
  const wantLook = new THREE.Vector3(), wantPos = new THREE.Vector3();

  const ok = playCutscene({
    id: 'harvest-feast', preview, beats,
    title: { name: 'Harvest Hush Feast', sub: 'Feast Day in Sugarlily Square' },
    player: { x: PLAYER_SEAT.x, z: PLAYER_SEAT.z, facing: 'up' },
    shoot(c, camera, focus, f) {
      const narrow = camera.aspect < 1.25 ? 1 + (1.25 - camera.aspect) * 1.1 : 1;
      const b = c.say, who = b ? b.who : '';
      const seat = who && !b!.wide ? seatOf(who) : { x: TABLE_CENTER.x, z: TABLE_CENTER.z };
      const wide = !b || b.wide;
      wantLook.set(wide ? TABLE_CENTER.x : seat.x, 0.9, wide ? TABLE_CENTER.z : seat.z);
      // camera on the opposite side of the table from the speaker, orbiting a little
      const side = wide ? 0 : ('face' in seat && seat.face === 'right' ? 1 : -1);
      const orbit = Math.sin(f.t * 0.25) * 0.9;
      const dist = (wide ? 8.6 : 5.0) * narrow, height = (wide ? 5.4 : 2.6) * narrow;
      wantPos.set(wantLook.x + side * dist * 0.55 + orbit * (wide ? 1.6 : 0.5), wantLook.y + height, wantLook.z + dist * (wide ? 0.95 : 0.8));
      c.follow(camera, focus, f, wantPos, wantLook);
    },
    onFinish({ completed }) {
      playing = false;
      if (preview) return;
      if (!replay && completed) {
        setEventFlag('harvest', 'feastDone');
        eventAttended('harvest:feast'); // everyone at the table grows closer
        bumpEvent('harvest', 'feast', 1); // pays the feast milestone: pips, cozy outfits and the cornucopia
        toast('Everyone says thank you! 🍂 Check your wardrobe and bag for feast-day gifts.');
        sfx.quest();
      } else if (replay && completed) toast('What a lovely feast. Happy Harvest Hush! 🍂');
    },
    onDone,
  });
  if (!ok) playing = false;
}
