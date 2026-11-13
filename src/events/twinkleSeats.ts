// Eve / Christmas Day places, for npc.ts: on Dec 24 and 25 everybody who lives on the island gathers by the town tree.
// Separate from the harvest feast seating on purpose, so the two events never trigger each other's logic.
import { currentChapter, isEventActive } from '../events';
import { GATHER_ORDER, GATHER_SPOTS, type GatherSpot } from './twinkleLayout';

let memoAt = -1e9, memo: 'eve' | 'day' | null = null;
/** 'eve' on Dec 24 and 'day' on Dec 25 while Twinkle Season is on, otherwise null. Cached briefly (npc code asks a lot). */
export function gatherKind(): 'eve' | 'day' | null {
  const now = performance.now();
  if (now - memoAt > 400) {
    memoAt = now;
    const id = isEventActive('twinkle') ? currentChapter('twinkle')?.id : undefined;
    memo = id === 'eve' || id === 'day' ? id : null;
  }
  return memo;
}
/** Look at the calendar again on the next call (after ?date changes or at midnight). */
export const refreshGather = () => { memoAt = -1e9; };

/** This villager's place by the tree on a gathering day, or null otherwise. */
export function gatherSeatFor(villagerId: string): GatherSpot | null {
  if (!gatherKind()) return null;
  const i = GATHER_ORDER.indexOf(villagerId);
  return i >= 0 ? GATHER_SPOTS[i] : null;
}
