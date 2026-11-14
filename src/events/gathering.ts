// The Christmas Eve (Dec 24) and Christmas Day (Dec 25) gatherings: every villager stands round the town tree, the
// camera visits each one for a short wish (Eve) or gift (Day), everyone cheers together, the tree lights up and the
// player is rewarded. Skippable (skipping still pays) and replayable (no second reward). A close cousin of the harvest
// feast scene, with its own seats and words; nothing here is shared with the feast logic. The beat loop, UI and skip
// handling live in cutscene/runner.ts; this file keeps the script, the camera framing and the reward.
import * as THREE from 'three';
import { sfx } from '../audio';
import { toast } from '../bus';
import { bumpEvent, hasClaimed, isEventActive, setEventFlag } from '../events';
import { eventAttended } from '../friends';
import { presentNpcs } from '../npc';
import { playCutscene, type Beat as RunBeat } from '../cutscene/runner';
import { GATHER_ORDER, GATHER_SPOTS, PLAYER_SPOT, TREE } from './twinkleLayout';
import { gatherKind, refreshGather } from './twinkleSeats';
import { DAY_CLOSE, DAY_GIFT, DAY_GROUP, DAY_OPEN, EVE_CLOSE, EVE_GROUP, EVE_OPEN, EVE_WISH, THANKS_FALLBACK, type Line } from './twinkleText';

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

/** Play the gathering. `replay` = already attended: same scene, no second reward. `preview` = the ?cutscene= debug play: any day, no flags, no reward. */
export function startGathering(kind: 'eve' | 'day', replay = false, onDone?: () => void, preview = false) {
  refreshGather();
  if (playing || (!preview && gatherKind() !== kind)) return;
  playing = true;
  const spotOf = (id: string) => { const i = GATHER_ORDER.indexOf(id); return i >= 0 ? GATHER_SPOTS[i] : { x: TREE.x, z: TREE.z }; };
  const beats: RunBeat[] = script(kind).map((b) => ({
    type: 'say', who: b.who, text: b.text, wide: !!(b.group || b.close),
    on: b.group ? (c) => { c.hop(); sfx.partyHat(); c.fx('confetti', TREE, 1.4); c.fx('twinkle', TREE, 1.4); c.fx('welcome', 'all'); } : undefined,
  }));
  const wantLook = new THREE.Vector3(), wantPos = new THREE.Vector3();

  const ok = playCutscene({
    id: kind === 'eve' ? 'christmas-eve' : 'christmas-day', preview, beats,
    title: { name: kind === 'eve' ? 'Christmas Eve' : 'Christmas Day', sub: 'Twinkle Season in Sugarlily Square' },
    player: { x: PLAYER_SPOT.x, z: PLAYER_SPOT.z, facing: 'left' },
    shoot(c, camera, focus, f) {
      const narrow = camera.aspect < 1.25 ? 1 + (1.25 - camera.aspect) * 1.1 : 1;
      const b = c.say;
      const wide = !b || b.wide;
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
      c.follow(camera, focus, f, wantPos, wantLook);
    },
    onFinish({ skipped, completed }) {
      playing = false;
      if (preview) return;
      // Watching to the end and skipping both count as attending: the reward is never lost to a skip. It is paid once,
      // keyed on the milestone itself (not the `replay` hint), and only while the event is on so the flag never gets
      // set without the payout.
      const attended = completed || skipped;
      if (attended && isEventActive('twinkle')) eventAttended(`twinkle:${kind}`); // friends grow closer, once per gathering
      if (attended && !hasClaimed('twinkle', kind) && isEventActive('twinkle')) {
        bumpEvent('twinkle', kind, 1); // pays the finale milestone: pips, outfits and decor
        setEventFlag('twinkle', `${kind}Done`);
        toast(kind === 'eve' ? 'The tree is glowing! ✨ Check your wardrobe and bag for Eve gifts.' : 'Merry Christmas! 🎄 Check your wardrobe and bag for presents.');
        sfx.quest();
      } else if (attended && (replay || hasClaimed('twinkle', kind))) toast(kind === 'eve' ? 'What a lovely Eve. Merry Christmas! ✨' : 'What a lovely day. Merry Christmas! 🎄');
    },
    onDone,
  });
  if (!ok) playing = false;
}
