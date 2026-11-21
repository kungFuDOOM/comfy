// Twinkle New Year: one small, sleepy night after Christmas. Real dates Dec 31, 2026 to Jan 1, 2027, peak Dec 31.
// A standalone event: Twinkle Season still ends Dec 26 (Christmas Eve and Day in gathering.ts are untouched), Dec 27 to 30
// stay quiet, and Warm Cup Market (Jan 15 to 18) is far enough away not to overlap. January is Snowfluff by the calendar
// month already, so the island is snowy without any `season` override. No chapters, no stall, no solid tiles.
// The night is a short cutscene in Sugarlily Square (events/newYearScene.ts, id `new-year`): friends gather by the fountain,
// count 3, 2, 1 and the sky fills with soft fireworks. Watching or skipping it once pays the keepsake and the journal goal.
// Preview: ?event=newyear (Dec 31) or ?cutscene=new-year (plays the scene, pays nothing).
import { registerEvent, type EventDef } from '../events';
import { createNewYearWorld } from './newyearWorld';

export const NEWYEAR = 'newyear';
export const NEWYEAR_COUNTER = 'night';

export const newYearEvent: EventDef = {
  id: NEWYEAR,
  name: 'Twinkle New Year',
  icon: '🎆',
  start: '2026-12-31',
  end: '2027-01-01',
  peakDay: '2026-12-31',
  blurb: 'One sleepy little night at the end of the year: friends in the square, a soft countdown and fireworks over the snow.',
  banner: 'Twinkle New Year! The square is glowing for midnight.',
  peakBanner: 'It is New Year\'s Eve! Friends are gathering in the square.',
  peakTitle: 'New Year\'s Eve!',
  peakSub: 'Count down together in Sugarlily Square',
  items: ['ny_midnight_star'],
  activities: [
    { id: 'countdown', icon: '🎆', title: 'Count Down Together', desc: 'Stay up with your friends in Sugarlily Square on New Year\'s Eve and count the last seconds of the year.', counter: NEWYEAR_COUNTER, goal: 1 },
  ],
  milestones: [
    { id: NEWYEAR_COUNTER, counter: NEWYEAR_COUNTER, goal: 1, title: 'Midnight Wish: Midnight Star Headband', reward: { pips: 30, items: ['ny_midnight_star'] } },
  ],
  world: createNewYearWorld(),
};

registerEvent(newYearEvent);
