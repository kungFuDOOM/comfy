// Daily weather: sunny, cloudy, soft rain, snow (winter) and the odd rainbow after rain.
// Pure function of the (real or ?date=) day + season + hour, so nothing needs saving and every device agrees.
// Each day gets a seeded roll; a wet day has a rain/snow window during the day, with grey sky around it.
// Testing: ?weather=sunny|cloudy|rain|snow|rainbow forces a look.
import { bus, toast } from './bus';
import { isEventActive, visualSeason } from './events';
import { getClock } from './time';

export type WeatherKind = 'sunny' | 'cloudy' | 'rain' | 'snow';
export interface Weather {
  kind: WeatherKind;
  /** A rainbow is up (after rain, in daylight). */
  rainbow: boolean;
  /** Day plan: this day has rain / snow at some point. */
  wetDay: boolean;
}

const forced = (() => {
  const v = new URLSearchParams(location.search).get('weather');
  return v === 'sunny' || v === 'cloudy' || v === 'rain' || v === 'snow' || v === 'rainbow' ? v : null;
})();

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Chance of a wet (rain, or snow in winter) day per season, and of a merely cloudy day. */
const WET: Record<string, number> = { blossom: 0.3, sunsip: 0.18, cocoa: 0.3, snowfluff: 0.32 };
const GREY = 0.24;

interface Plan { kind: 'sunny' | 'cloudy' | 'wet'; from: number; to: number; rainbow: boolean }
let planKey = '', plan: Plan = { kind: 'sunny', from: 0, to: 0, rainbow: false };
function dayPlan(dayKey: string, seasonId: string): Plan {
  const key = dayKey + '|' + seasonId;
  if (key === planKey) return plan;
  planKey = key;
  const r = rng('hushbell-weather|' + dayKey);
  const roll = r(), from = 7 + r() * 7, len = 4 + r() * 5, bow = r() < 0.5;
  const wet = WET[seasonId] ?? 0.25;
  plan = roll < wet ? { kind: 'wet', from, to: from + len, rainbow: bow } : roll < wet + GREY ? { kind: 'cloudy', from: 0, to: 24, rainbow: false } : { kind: 'sunny', from: 0, to: 0, rainbow: false };
  return plan;
}

export function getWeather(): Weather {
  const c = getClock();
  const season = visualSeason(c.season).id;
  if (forced) {
    const kind: WeatherKind = forced === 'rainbow' ? 'sunny' : forced;
    return { kind, rainbow: forced === 'rainbow', wetDay: kind === 'rain' || kind === 'snow' };
  }
  const p = dayPlan(c.dayKey, season), h = c.hour;
  if (p.kind === 'sunny') return { kind: 'sunny', rainbow: false, wetDay: false };
  if (p.kind === 'cloudy') return { kind: 'cloudy', rainbow: false, wetDay: false };
  const snowy = season === 'snowfluff';
  if (h >= p.from && h < p.to) return { kind: snowy ? 'snow' : 'rain', rainbow: false, wetDay: true };
  // grey sky around the shower; a rainbow lingers for a couple of daylight hours once the rain has cleared
  const rainbow = !snowy && p.rainbow && h >= p.to && h < p.to + 2.5 && h >= 7 && h < 19;
  return { kind: 'cloudy', rainbow, wetDay: true };
}

export const isRaining = () => getWeather().kind === 'rain';
/** Frogs and snails stay out while it is raining and while the rainbow is up. */
export const isRainyTime = () => { const w = getWeather(); return w.kind === 'rain' || w.rainbow; };

export const WEATHER_NAMES: Record<WeatherKind, string> = { sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Soft rain', snow: 'Snowfall' };
export function weatherLabel(w: Weather = getWeather()): string { return w.rainbow ? 'Rainbow' : WEATHER_NAMES[w.kind]; }
export function weatherBlurb(w: Weather = getWeather()): string {
  if (w.rainbow) return 'A rainbow after the rain! Frogs and snails are still about.';
  switch (w.kind) {
    case 'rain': return 'Soft rain. Crops water themselves, and rare fish, frogs and snails come out.';
    case 'snow': return 'Gentle snowfall. Everything is hushed and sparkly.';
    case 'cloudy': return 'A soft grey sky.';
    default: return 'A bright, sunny sky.';
  }
}

/**
 * Smoothed looks (0..1) the renderer, audio and HUD all read, so a change of weather fades in over a few seconds
 * instead of popping. `snow` already excludes the snowfall a seasonal event draws itself (Twinkle Season).
 */
export const view = { rain: 0, snow: 0, over: 0, wet: 0, rainbow: 0 };
let snapped = false;
export function stepWeather(dt: number) {
  const w = getWeather();
  const t = {
    rain: w.kind === 'rain' ? 1 : 0,
    snow: w.kind === 'snow' && !isEventActive('twinkle') ? 1 : 0,
    over: w.kind === 'rain' ? 0.9 : w.kind === 'snow' ? 0.6 : w.kind === 'cloudy' ? 0.5 : 0,
    rainbow: w.rainbow ? 1 : 0,
    wet: w.kind === 'rain' ? 1 : w.rainbow ? 0.7 : 0,
  };
  // puddles take a while to dry; everything else eases in over a couple of seconds
  const tau = (k: keyof typeof view) => (k === 'wet' ? (t.wet > view.wet ? 12 : 80) : k === 'rainbow' ? 4 : 2.5);
  for (const k of Object.keys(view) as (keyof typeof view)[]) {
    view[k] = snapped ? view[k] + (t[k] - view[k]) * (1 - Math.exp(-dt / tau(k))) : t[k];
  }
  snapped = true;
}

let lastKind: WeatherKind | null = null, lastBow = false;
/** Called twice a second: greets the weather, and announces changes. Emits 'weather' for other systems. */
export function tickWeather() {
  const w = getWeather();
  if (w.kind !== lastKind || w.rainbow !== lastBow) {
    const first = lastKind === null;
    if (w.rainbow && !lastBow) toast('A rainbow! The rain has cleared ♡');
    else if (w.kind !== lastKind) {
      if (w.kind === 'rain') toast(first ? 'It is a soft rainy day. The crops are watered ☔' : 'A soft rain begins… the crops water themselves ☔');
      else if (w.kind === 'snow' && !isEventActive('twinkle')) toast(first ? 'Snow is falling softly ❄' : 'Snow begins to fall ❄');
      else if (!first && lastKind === 'rain' && !w.rainbow) toast('The rain has stopped.');
    }
    lastKind = w.kind; lastBow = w.rainbow;
    bus.emit('weather', w);
  }
}
