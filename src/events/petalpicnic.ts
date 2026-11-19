// Petal Picnic Days: the spring festival. Real dates Apr 3 to Apr 11, 2027, picnic day Apr 10 (a Saturday).
// One small activity: sit on a blanket in Sugarlily Square and share a blossom treat (once per blanket per day).
// Much smaller than Harvest Hush Feast and Twinkle Season: no chapters, no cutscene, three exclusives.
// Preview: ?event=petalpicnic (picnic day) or ?event=petalpicnic&date=2027-04-05.
import { startAct } from '../actions';
import { toast } from '../bus';
import { bumpEvent, eventCounter, isPeakDay, registerEvent, type EventDef, type EventSpot } from '../events';
import { createPetalWorld } from './petalWorld';
import { firstTodayFor } from './festivalKit';

export const PETALPICNIC = 'petalpicnic';

/** Three blankets on the plaza lawn (tile rects, walkable and never blocked). */
const BLANKETS = [
  { id: 'a', rect: [44.7, 40, 46.5, 41.6] as [number, number, number, number], approach: [{ x: 46, y: 41 }, { x: 45, y: 41 }] },
  { id: 'b', rect: [44.7, 42.6, 46.5, 44.2] as [number, number, number, number], approach: [{ x: 45, y: 44 }, { x: 46, y: 44 }, { x: 44, y: 44 }] },
  { id: 'c', rect: [49.7, 42.6, 51.3, 44.2] as [number, number, number, number], approach: [{ x: 50, y: 44 }, { x: 51, y: 44 }] },
];
const TREATS = ['a pink blossom jelly', 'a petal shortbread', 'a cherry-milk dumpling', 'a sakura-sugar bun', 'a strawberry petal tart'];

function spots(): EventSpot[] {
  return BLANKETS.map((b) => ({
    id: `petalpicnic-${b.id}`,
    rect: b.rect,
    reach: 44,
    approach: b.approach,
    label: 'Picnic Blanket',
    prompt: 'Sit and share a blossom treat',
    run() {
      if (!firstTodayFor(PETALPICNIC, `blanket_${b.id}`)) { toast('You already shared a treat here today. Try another blanket, or come back tomorrow 🌸'); return; }
      startAct('sip', 1.8);
      const n = eventCounter(PETALPICNIC, 'picnics');
      toast(`You share ${TREATS[n % TREATS.length]} under the petals 🌸${isPeakDay(PETALPICNIC) ? ' Picnic Day!' : ''}`);
      bumpEvent(PETALPICNIC, 'picnics', 1);
    },
  }));
}

export const petalPicnicEvent: EventDef = {
  id: PETALPICNIC,
  name: 'Petal Picnic Days',
  icon: '🌸',
  start: '2027-04-03',
  end: '2027-04-11',
  peakDay: '2027-04-10',
  blurb: 'Blossom Bloom is at its softest: pink petals drift over the square and picnic blankets are spread out for anyone who wants to sit, nibble and watch them fall.',
  banner: 'Petal Picnic Days are here! Find a blanket in the square.',
  peakBanner: 'It is Picnic Day! Blankets, petals and treats in the square.',
  peakTitle: 'Picnic Day!',
  peakSub: 'Blankets are out in the square',
  items: ['pp_petal_bonnet', 'd_pp_blanket', 'pp_blossom_sundress'],
  activities: [
    { id: 'picnic', icon: '🧺', title: 'Share a Blossom Treat', desc: 'Sit on a picnic blanket in Sugarlily Square. Each blanket shares one treat a day, so there are three a day to find.', counter: 'picnics', goal: 5 },
  ],
  milestones: [
    { id: 'p1', counter: 'picnics', goal: 1, title: 'First Bite: Petal Picnic Bonnet', reward: { items: ['pp_petal_bonnet'] } },
    { id: 'p3', counter: 'picnics', goal: 3, title: 'Cozy Corner: Petal Picnic Blanket', reward: { pips: 30, items: ['d_pp_blanket'] } },
    { id: 'p5', counter: 'picnics', goal: 5, title: 'Picnic Regular: Blossom Blanket Sundress', reward: { pips: 60, items: ['pp_blossom_sundress'] } },
  ],
  world: createPetalWorld(BLANKETS.map((b) => b.rect)),
  spots,
};

registerEvent(petalPicnicEvent);
