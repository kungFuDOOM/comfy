// Warm Cup Market: a modest midwinter cocoa gathering after Twinkle Season. Real dates Jan 15 to Jan 18, 2027,
// market day Jan 16 (a Saturday). A cocoa stall in the square (the same three cups as Twinkle's week-3 stall, shared
// panel in cocoaStall.ts, but its own event and counter). Far smaller than Twinkle Season: no chapters, no cutscene,
// two exclusives. Christmas stays the winter centrepiece.
// Preview: ?event=warmcup (market day) or ?event=warmcup&date=2027-01-15.
import { registerEvent, type EventDef, type EventSpot } from '../events';
import { openCocoaCups } from './cocoaStall';
import { blockTilesWhileActive } from './festivalKit';
import { STALL_TILES } from './twinkleLayout';
import { createWarmCupWorld } from './warmcupWorld';

export const WARMCUP = 'warmcup';

const stallSpot: EventSpot = {
  id: 'warmcup-stall',
  rect: [46, 45, 48, 46],
  reach: 44,
  approach: [{ x: 46, y: 46 }, { x: 47, y: 46 }, { x: 48, y: 45 }, { x: 48, y: 46 }],
  label: 'Warm Cup Market',
  prompt: 'Visit the cocoa stall',
  run: () => openCocoaCups(WARMCUP, 'Warm Cup Market ☕'),
};

export const warmCupEvent: EventDef = {
  id: WARMCUP,
  name: 'Warm Cup Market',
  icon: '☕',
  start: '2027-01-15',
  end: '2027-01-18',
  peakDay: '2027-01-16',
  blurb: 'A cozy little cocoa market in the middle of the snowfluff: one stall, three warm cups and a kettle that never runs out.',
  banner: 'The Warm Cup Market is open! Cocoa in the square.',
  peakBanner: 'It is Market Day! The kettle is hot in the square.',
  peakTitle: 'Market Day!',
  peakSub: 'Warm cups at the stall in the square',
  items: ['wc_cocoa_poncho', 'd_wc_kettle'],
  activities: [
    { id: 'cups', icon: '☕', title: 'Warm Cups', desc: 'Buy cups at the stall just south of the square. Each one is a drink you can serve to a friend.', counter: 'cocoa', goal: 3 },
  ],
  milestones: [
    { id: 'c1', counter: 'cocoa', goal: 1, title: 'First Sip: Warm Cup Poncho', reward: { items: ['wc_cocoa_poncho'] } },
    { id: 'c3', counter: 'cocoa', goal: 3, title: 'Market Regular: Warm Cup Kettle', reward: { pips: 40, items: ['d_wc_kettle'] } },
  ],
  world: createWarmCupWorld(),
  spots: () => [stallSpot],
  onStart() { syncStall(); },
};

registerEvent(warmCupEvent);

const syncStall = blockTilesWhileActive(WARMCUP, STALL_TILES, { x: 47.5, y: 47.2 });
