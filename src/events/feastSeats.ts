// Feast day seating, for npc.ts: on the feast day everybody who lives on the island comes to the table.
import { isPeakDay } from '../events';
import { SEATS, SEAT_ORDER, type Seat } from './harvestLayout';

let memoAt = -1e9, memo = false;
/** Is the Harvest Hush Feast on right now (the peak day)? Cached for a moment, because npc code asks a lot. */
export function feastGathering(): boolean {
  const now = performance.now();
  if (now - memoAt > 400) { memoAt = now; memo = isPeakDay('harvest'); }
  return memo;
}
/** Force the next feastGathering() call to look at the calendar again (after ?event / date changes or at midnight). */
export const refreshFeast = () => { memoAt = -1e9; };

/** This villager's place at the table on feast day, or null when there is no feast. */
export function feastSeatFor(villagerId: string): Seat | null {
  if (!feastGathering()) return null;
  const i = SEAT_ORDER.indexOf(villagerId);
  return i >= 0 ? SEATS[i] : null;
}
