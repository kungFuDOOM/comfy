// Sunsip Shore Days: the summer festival. Real dates Jul 10 to Jul 18, 2027, Glow Day Jul 17 (a Saturday).
// Main activity: find Glowday Shells on the sand (the usual shore finds rules). Side: a free lemonade glass a day at the
// stand in the square. Much smaller than Harvest Hush Feast and Twinkle Season: no chapters, no cutscene, three exclusives.
// Preview: ?event=shoredays (Glow Day) or ?event=shoredays&date=2027-07-12.
import { startAct } from '../actions';
import { toast } from '../bus';
import { bumpEvent, isPeakDay, registerEvent, type EventDef, type EventSpot } from '../events';
import { blockTilesWhileActive, firstTodayFor } from './festivalKit';
import { STALL_TILES } from './twinkleLayout';
import { createShoreWorld } from './shoreWorld';

export const SHOREDAYS = 'shoredays';

const standSpot: EventSpot = {
  id: 'shoredays-lemonade',
  rect: [46, 45, 48, 46],
  reach: 44,
  approach: [{ x: 46, y: 46 }, { x: 47, y: 46 }, { x: 48, y: 45 }, { x: 48, y: 46 }],
  label: 'Sunsip Lemonade Stand',
  prompt: 'Pour a glass of lemonade',
  run() {
    if (!firstTodayFor(SHOREDAYS, 'lemonade')) { toast('The jug is resting in the shade. Come back tomorrow for another glass 🍋'); return; }
    startAct('sip', 1.8);
    toast(`A cold glass of pink lemonade, with a sugar rim${isPeakDay(SHOREDAYS) ? '. Happy Glow Day!' : ''} 🍋`);
    bumpEvent(SHOREDAYS, 'glasses', 1);
  },
};

export const shoreDaysEvent: EventDef = {
  id: SHOREDAYS,
  name: 'Sunsip Shore Days',
  icon: '🍋',
  start: '2027-07-10',
  end: '2027-07-18',
  peakDay: '2027-07-17',
  blurb: 'The longest, glowiest days of Sunsip: shells shine on the sand, there is a lemonade stand in the square, and the evenings stretch out like honey.',
  banner: 'Sunsip Shore Days are here! Find Glowday Shells on the sand.',
  peakBanner: 'It is Glow Day! The shells and the lemonade are at their best.',
  peakTitle: 'Glow Day!',
  peakSub: 'Lemonade is flowing in the square',
  items: ['sd_lemon_sunhat', 'd_sd_lemonade', 'sd_glow_sundress'],
  activities: [
    { id: 'shells', icon: '🐚', title: 'Find Glowday Shells', desc: 'Peach-and-gold shells wash up on the sand around the island. Pick them up like any other shore find.', counter: 'gathered', goal: 8 },
    { id: 'lemonade', icon: '🍋', title: 'Lemonade Stand', desc: 'The stand in Sugarlily Square pours one free glass a day. Three glasses earns a little something.', counter: 'glasses', goal: 3 },
  ],
  milestones: [
    { id: 's4', counter: 'gathered', goal: 4, title: 'Shell Spotter: Lemon Ribbon Sunhat', reward: { items: ['sd_lemon_sunhat'] } },
    { id: 's8', counter: 'gathered', goal: 8, title: 'Glow Collector: Glowday Shell Sundress', reward: { pips: 60, items: ['sd_glow_sundress'] } },
    { id: 'l3', counter: 'glasses', goal: 3, title: 'Regular Sipper: Sunsip Lemonade Cart', reward: { pips: 30, items: ['d_sd_lemonade'] } },
  ],
  world: createShoreWorld(),
  spots: () => [standSpot],
  onStart() { syncStand(); },
};

registerEvent(shoreDaysEvent);

// the stand's counter blocks two tiles while the festival is on
const syncStand = blockTilesWhileActive(SHOREDAYS, STALL_TILES, { x: 47.5, y: 47.2 });
