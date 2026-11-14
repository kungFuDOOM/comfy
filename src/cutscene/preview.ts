// ?cutscene=<id> debug preview: play one runner scene out of season. Never marks seen, never pays, never sets flags
// (the scenes honour `preview`). The calendar context comes from presets.ts; this maps ids to their start functions.
import { toast } from '../bus';
import { VILLAGERS } from '../data';
import { startFeast } from '../events/feast';
import { startFirstSnowfall } from '../events/firstSnowfall';
import { startTreeLighting } from '../events/treeLighting';
import { startGathering } from '../events/gathering';
import { refreshFeast } from '../events/feastSeats';
import { refreshGather } from '../events/twinkleSeats';
import { npcs, updateNpcs, type Npc } from '../npc';
import { TS } from '../world';
import { isRunnerPlaying } from './runner';

/** Each entry starts its scene in preview mode and calls `done` once the scene is over (screen covered). */
const PLAYERS: Record<string, (done: () => void) => void> = {
  'harvest-feast': (done) => startFeast(true, done, true),
  'christmas-eve': (done) => startGathering('eve', true, done, true),
  'christmas-day': (done) => startGathering('day', true, done, true),
  'first-snowfall': (done) => startFirstSnowfall(done, true),
  'tree-lighting': (done) => startTreeLighting(done, true),
};

/** Later scenes (first-snowfall, tree-lighting, ...) add themselves here. */
export const registerPreview = (id: string, play: (done: () => void) => void) => { PLAYERS[id] = play; };

/**
 * Friends whose area is still locked join the preview as guests, so the debug scene shows the whole cast. They only
 * live in the in-memory `npcs` list (nothing is unlocked, nothing touches the save) and leave again when it ends.
 */
function inviteGuests(): () => void {
  const guests: Npc[] = [];
  for (const def of VILLAGERS) {
    if (npcs.some((n) => n.def.id === def.id)) continue;
    const x = def.home.x * TS + TS / 2, y = def.home.y * TS + TS - 4;
    const n: Npc = { def, x, y, tx: x, ty: y, wait: 2, facing: 'down', moving: false, busy: false };
    npcs.push(n); guests.push(n);
  }
  return () => { for (const g of guests) { const i = npcs.indexOf(g); if (i >= 0) npcs.splice(i, 1); } };
}

/** Play a scene as a preview. Unknown ids toast and do nothing. Call once the world is up (after startGame). */
export function playPreview(id: string): boolean {
  const play = PLAYERS[id];
  if (!play) { toast(`Unknown cutscene "${id}". Try: ${Object.keys(PLAYERS).join(', ')}`); return false; }
  refreshFeast(); refreshGather();
  const leave = inviteGuests();
  updateNpcs(0); // seat everyone first: the game loop is idle once a scene runs
  play(leave);
  if (!isRunnerPlaying()) { leave(); return false; } // it did not start (wrong preset, or a scene already up)
  return true;
}
