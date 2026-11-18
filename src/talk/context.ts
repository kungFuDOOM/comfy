// What villagers can see when you chat: the calendar (holidays, Christmas countdown), the season the island looks
// like, the weather and the time of day. Pure reads of existing systems, nothing saved here.
import { currentChapter, eventDay, isEventActive, isPeakDay, visualSeason } from '../events';
import { getClock } from '../time';
import { getWeather } from '../weather';
import type { Holiday, SeasonId, Sky, TalkPhase } from './types';

export interface WorldCtx {
  phase: TalkPhase;
  /** Midnight to dawn. */
  late: boolean;
  season: SeasonId;
  seasonName: string;
  sky: Sky;
  /** Holidays happening now, most specific first, with how keen villagers are to bring each up. */
  holidays: { key: Holiday; w: number; mood: string }[];
  /** Sleeps until Christmas (December 1 to 23), else 0. */
  xmasDays: number;
}

/** The fourth Thursday of November: the Harvest Hush Feast day in years without a scheduled event. */
function feastDayOf(year: number): number {
  const first = new Date(year, 10, 1).getDay(); // 0 = Sunday
  const firstThu = 1 + ((4 - first + 7) % 7);
  return firstThu + 21;
}

const MOOD: Record<Holiday, string> = {
  halloween: '🎃', harvestSoon: '🍂', harvest: '🍂', feast: '🥧', twinkleSoon: '❄️', twinkle: '🎄', tree: '🎄', cookies: '🍪',
  cocoa: '☕', giftweek: '🎁', xmasEve: '✨', xmasDay: '🎁', afterglow: '🌟', newYearEve: '🎉', newYear: '🎉', valentine: '💌',
};

/** Holidays for a day. Day-of moments weigh 9 (villagers can hardly talk about anything else); seasons weigh 4-5. */
export function holidaysOn(d: Date): { key: Holiday; w: number; mood: string }[] {
  const m = d.getMonth() + 1, day = d.getDate();
  const out: { key: Holiday; w: number }[] = [];
  const add = (key: Holiday, w: number) => { if (!out.some((o) => o.key === key)) out.push({ key, w }); };

  if (m === 10 && day >= 25) add('halloween', day === 31 ? 9 : 4);

  // Thanksgiving: the Harvest Hush Feast (a real event in its year, the calendar otherwise)
  const feast = feastDayOf(d.getFullYear());
  if (isPeakDay('harvest') || (m === 11 && day === feast && !isEventActive('harvest'))) add('feast', 9);
  else if (isEventActive('harvest')) add('harvest', 5);
  else if (m === 11 && day < feast && feast - day <= 10) add('harvestSoon', 4);

  // Christmas: Twinkle Season chapters while the event runs, the calendar otherwise
  if (isEventActive('twinkle')) {
    const ch = currentChapter('twinkle')?.id;
    if (ch === 'eve') add('xmasEve', 9);
    else if (ch === 'day') add('xmasDay', 9);
    else if (ch === 'after') add('afterglow', 6);
    else if (ch === 'wk1') add('tree', 4);
    else if (ch === 'wk2') add('cookies', 4);
    else if (ch === 'wk3') add('cocoa', 4);
    else if (ch === 'wk4') add('giftweek', 4);
    add('twinkle', 4);
  } else if (m === 12 && day === 24) add('xmasEve', 9);
  else if (m === 12 && day === 25) add('xmasDay', 9);
  else if (m === 12 && day < 24) add('twinkle', 4);
  else if (m === 11 && day <= 26) add('twinkleSoon', 3);

  if (m === 12 && day === 31) add('newYearEve', 8);
  if (m === 1 && day <= 2) add('newYear', day === 1 ? 9 : 5);
  if (m === 2 && day >= 12 && day <= 14) add('valentine', day === 14 ? 9 : 4);
  return out.map((o) => ({ ...o, mood: MOOD[o.key] }));
}

export function worldCtx(): WorldCtx {
  const c = getClock();
  const d = eventDay();
  const season = visualSeason(c.season);
  const w = getWeather();
  // Twinkle Season draws its own snowfall all season long, so villagers see snow
  const sky: Sky = w.rainbow ? 'rainbow' : w.kind === 'rain' ? 'rain' : w.kind === 'snow' || isEventActive('twinkle') ? 'snow' : w.kind;
  const xmas = d.getMonth() === 11 && d.getDate() < 24 ? 25 - d.getDate() : 0;
  return {
    phase: c.phase,
    late: c.hour < 4.5,
    season: season.id as SeasonId,
    seasonName: season.name,
    sky,
    holidays: holidaysOn(d),
    xmasDays: xmas,
  };
}
