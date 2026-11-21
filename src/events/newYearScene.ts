// The Twinkle New Year cutscene: late on December 31 the friends drift into Sugarlily Square and gather by the fountain,
// everyone counts 3, 2, 1 together, and soft fireworks open over the snowy town. Shorter than Christmas Eve on purpose.
// Plays once per save (the 'new-year' entry in save.ts seenCutscenes; watched or skipped both count). A real play pays the
// keepsake once through the event milestone (newyear.ts); ?cutscene=new-year previews it any time and never marks seen,
// never pays and never sets flags. The beat loop, UI and skip handling live in cutscene/runner.ts; the countdown numeral
// is the candy-coloured one from the Tree Lighting scene (treeLighting.ts).
// A save only gets it automatically while the event is on its peak day (Dec 31), once the evening has come.
import { sfx } from '../audio';
import { toast } from '../bus';
import { isRunnerPlaying, playCutscene, type Beat, type RunnerCtx } from '../cutscene/runner';
import { bumpEvent, hasClaimed, isEventActive, isPeakDay } from '../events';
import { eventAttended } from '../friends';
import { presentNpcs } from '../npc';
import { sceneActive } from '../render/stage';
import { hasSeenCutscene } from '../save';
import { getClock } from '../time';
import { TS } from '../world';
import { cutsceneParam } from '../cutscene/presets';
import { isPanelOpen } from '../ui/dom';
import { NEWYEAR, NEWYEAR_COUNTER } from './newyear';
import { SQUARE } from './newyearWorld';
import { countOverlay } from './treeLighting';

export const NEW_YEAR_ID = 'new-year';
let playing = false;
export const newYearPlaying = () => playing;

/** Real plays wait for the evening; the scene itself always renders the midnight sky. */
const EVENING = 17.5;
const owed = () => !playing && !hasSeenCutscene(NEW_YEAR_ID) && isEventActive(NEWYEAR) && isPeakDay(NEWYEAR);
const readyNow = () => !isPanelOpen() && !sceneActive() && !isRunnerPlaying();

/**
 * Called from startGame. Quietly polls (no retry cap: the night is long and a panel can stay open) until the scene has
 * been watched, the night is over, or the screen is clear on a Dec 31 evening. One timer at a time.
 */
let boot = 0;
export function maybeStartNewYear(blocked: () => boolean) {
  if (boot || cutsceneParam) return;
  const go = () => {
    boot = 0;
    if (!owed()) return;
    if (blocked() || !readyNow() || getClock().hour < EVENING) { boot = window.setTimeout(go, 5000); return; }
    startNewYear();
  };
  boot = window.setTimeout(go, 2400);
}

/** Friends gather in a loose arc on the north side of the fountain; the player stands south, looking up with them. */
const ARC_R = 3.1, START_R = 7.2;
const arcAt = (a: number, r: number) => ({ x: SQUARE.x + Math.cos(a) * r, z: SQUARE.z + Math.sin(a) * r });
const angleOf = (i: number, n: number) => (200 + (i / Math.max(1, n - 1)) * 140) * (Math.PI / 180); // 200 to 340 degrees, the north side
const PLAYER_FROM = { x: SQUARE.x + 5.2, z: SQUARE.z + 5.4 };
const PLAYER_SPOT = { x: SQUARE.x + 0.4, z: SQUARE.z + 3.2 };
const SKY = { x: SQUARE.x, z: SQUARE.z - 1.5 };

/** Play it. `preview` = the ?cutscene= debug play: any day, never marked seen, never paid. */
export function startNewYear(onDone?: () => void, preview = false) {
  if (playing || isRunnerPlaying()) return;
  playing = true;
  const cast = presentNpcs().map((n) => n.def.id);
  const first = (...ids: string[]) => ids.find((id) => cast.includes(id));
  const say = (ids: string[], text: string, on?: (c: RunnerCtx) => void): Beat[] => {
    const who = first(...ids, ...cast);
    return who ? [{ type: 'say', who, text, on }] : on ? [{ type: 'call', fn: on }] : [];
  };
  const spots = new Map(cast.map((id, i) => [id, { from: arcAt(angleOf(i, cast.length), START_R), to: arcAt(angleOf(i, cast.length), ARC_R) }] as const));

  let count: ReturnType<typeof countOverlay> | null = null;
  const TONES: Record<number, [string, string]> = { 3: ['#e56d9d', '#bf4a7c'], 2: ['#5fc9a4', '#3a9c7c'], 1: ['#f0a93c', '#c47f1c'] };
  const tick = (n: number): Beat[] => [
    { type: 'call', fn: (c) => { count?.show(String(n), TONES[n]); c.hop(0.45); } },
    ...cast.map((id): Beat => ({ type: 'emote', who: id, kind: 'talk', dur: 0.45 })),
    { type: 'emote', who: 'player', kind: 'talk', dur: 0.45 },
    { type: 'sfx', name: 'tick' },
    { type: 'wait', sec: 1.0 },
  ];
  /** One shell opening over the town, `dx` / `dz` tiles from the middle of the sky, `y` up. */
  const shell = (dx: number, dz: number, y: number, pause = 0.4): Beat[] => [
    { type: 'call', fn: (c) => c.fx('firework', { x: SKY.x + dx, z: SKY.z + dz }, y) },
    { type: 'wait', sec: pause },
  ];

  const beats: Beat[] = [
    { type: 'call', fn: () => { count = countOverlay(); } },
    { type: 'shot', look: [SQUARE.x, 1.3, SQUARE.z + 0.5], pos: [SQUARE.x + 5.6, 4.0, SQUARE.z + 8.4], dur: 5, wait: false },
    ...[...spots.entries()].flatMap(([id, s], i): Beat[] => [
      { type: 'walk', who: id, to: s.to, speed: 2.1 + (i % 3) * 0.2, wait: false },
      { type: 'wait', sec: 0.26 },
    ]),
    { type: 'walk', who: 'player', to: PLAYER_SPOT, speed: 2.2, wait: false },
    { type: 'wait', sec: 2.4 },
    ...cast.map((id): Beat => ({ type: 'face', who: id, at: 'player' })),
    { type: 'face', who: 'player', at: SKY },
    ...say(['mimsy', 'nimbus'], '*yawn* Almost midnight, and I am still awake. Look at me go. Come stand with us, sunbeam.'),
    ...say(['tuppi', 'zuzu'], 'Quick, quick, everybody in close! It is nearly the new year! I have my wish all ready!', (c) => c.hop(1.1)),
    ...say(['bramble'], '...I am awake. I am. Is it midnight yet? No? I will just rest my eyes a little bit.'),
    // the camera lifts to the sky for the count
    { type: 'shot', look: [SKY.x, 3.4, SKY.z], pos: [SQUARE.x + 0.6, 2.3, SQUARE.z + 7.6], dur: 3.2, wait: false },
    ...say(['oolie', 'marlo'], 'Let us count the last little seconds of the year together. Deep breath, everyone...'),
    ...cast.map((id): Beat => ({ type: 'face', who: id, at: SKY })),
    { type: 'wait', sec: 0.8 },
    ...tick(3), ...tick(2), ...tick(1),
    // midnight
    { type: 'call', fn: (c) => { count?.show('✨', null); c.hop(2.4); } },
    { type: 'sfx', name: 'unlock' },
    ...shell(0, -0.5, 4.2, 0.45),
    ...shell(-3.2, 0.3, 3.4, 0.4),
    { type: 'sfx', name: 'pickup' },
    ...shell(3.3, 0.2, 3.7, 0.4),
    { type: 'fx', fx: 'welcome', at: 'all' },
    ...cast.flatMap((id, i): Beat[] => [{ type: 'emote', who: id, kind: 'gasp', dur: 0.55 }, { type: 'wait', sec: i % 2 ? 0.08 : 0.12 }]),
    { type: 'emote', who: 'player', kind: 'gasp', dur: 0.6 },
    ...shell(-1.6, -1.2, 4.6, 0.5),
    ...shell(1.8, -1.0, 4.3, 0.9),
    ...say(['tuppi', 'zuzu'], 'Happy New Year! Did you see that one? It went up, up, up and turned into stars!', (c) => c.hop(1.2)),
    ...say(['marlo', 'nimbus'], 'One flash for the old year, one for the new, and one for all of us right here.', (c) => c.fx('twinkle', 'player', 1.1)),
    { type: 'shot', look: [SKY.x, 2.6, SKY.z], pos: [SQUARE.x + 4.4, 3.2, SQUARE.z + 7.8], dur: 5, wait: false },
    ...say(['mimsy', 'oolie'], 'Happy New Year, sunbeam. Thank you for staying up with us. Let us keep each other cozy this year, too.', (c) => { c.hop(2.4); c.fx('welcome', 'all'); }),
    { type: 'sfx', name: 'welcome' },
    ...shell(0, -1, 4.0, 0.5), ...shell(-2.4, 0, 3.6, 0.5),
    { type: 'wait', sec: 1.6 },
  ];

  const finish = () => { playing = false; count?.destroy(); count = null; };
  const ok = playCutscene({
    id: NEW_YEAR_ID, preview, beats,
    title: { name: 'Twinkle New Year', sub: 'Sugarlily Square at midnight' },
    player: { x: PLAYER_FROM.x, z: PLAYER_FROM.z, facing: 'left' },
    hour: 23.6,
    setup(c) {
      for (const [id, s] of spots) {
        c.point(id); // registers them so the runner puts them back afterwards
        const n = presentNpcs().find((m) => m.def.id === id);
        if (!n) continue;
        n.x = n.tx = s.from.x * TS; n.y = n.ty = s.from.z * TS;
        n.moving = false; n.facing = 'left';
      }
    },
    onFinish({ skipped, completed }) {
      finish();
      if (preview) return;
      // Watching to the end and skipping both count as attending; the keepsake is paid once, only while the event is on.
      const attended = completed || skipped;
      if (!attended || !isEventActive(NEWYEAR)) return;
      eventAttended('newyear:night');
      if (!hasClaimed(NEWYEAR, NEWYEAR_COUNTER)) {
        bumpEvent(NEWYEAR, NEWYEAR_COUNTER, 1);
        toast('Happy New Year! 🎆 Check your wardrobe for a little midnight star.');
        sfx.quest();
      }
    },
    onDone,
  });
  if (!ok) finish();
}
