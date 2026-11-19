// Twinkle Advent Calendar: 24 little doors, December 1–24.
// The day comes from time.ts today(), so ?date= and a forced ?event= (Twinkle's peak is Dec 25) are honored.
// Missed doors stay openable through December 25. Later days stay locked. December 26 and after, the
// calendar can still be looked at until the 26th, but nothing new opens.
//
// Preview: ?advent=open makes the calendar available any day of the year. Outside December 1–25 it
// behaves like December 24, so every door including the best one is waiting. A real December date
// (the clock, ?date=, or ?event=twinkle) still decides which doors are open.
import { startAct } from './actions';
import { sfx } from './audio';
import { changed, toast } from './bus';
import { clothById } from './clothes';
import { ITEMS } from './data';
import { addItem } from './inventory';
import { saveGame } from './save';
import { state } from './state';
import { today } from './time';
import { grantCloth } from './wardrobe';

const params = new URLSearchParams(location.search);
/** ?advent=open previews the calendar outside its real dates (and opens it once play begins). */
export const adventWantsPreview = params.get('advent') === 'open';

export interface AdventDoor {
  day: number;
  /** Wardrobe id or item id. */
  id: string;
  /** Extra gifts opened with this door. December 24 adds the Midnight Bell Star beside the gown. */
  also?: string[];
}

export const ADVENT_DOORS: AdventDoor[] = [
  { day: 1, id: 'adv_dawn_cookie' },
  { day: 2, id: 'adv_bauble_bow' },
  { day: 3, id: 'd_adv_candle' },
  { day: 4, id: 'adv_cocoa_drop' },
  { day: 5, id: 'adv_snowbell_muffs' },
  { day: 6, id: 'd_adv_stockings' },
  { day: 7, id: 'adv_mint_crisp' },
  { day: 8, id: 'adv_cocoa_slippers' },
  { day: 9, id: 'd_adv_froststar' },
  { day: 10, id: 'adv_cloud_bun' },
  { day: 11, id: 'adv_sugarplum_specs' },
  { day: 12, id: 'd_adv_sleigh' },
  { day: 13, id: 'adv_candy_boots' },
  { day: 14, id: 'adv_snow_puff' },
  { day: 15, id: 'adv_night_beanie' },
  { day: 16, id: 'd_adv_wreath' },
  { day: 17, id: 'adv_star_biscuit' },
  { day: 18, id: 'adv_hearth_cardigan' },
  { day: 19, id: 'd_adv_globe' },
  { day: 20, id: 'adv_bellwish_purse' },
  { day: 21, id: 'adv_honey_shortbread' },
  { day: 22, id: 'adv_eve_tiara' },
  { day: 23, id: 'd_adv_pillow' },
  { day: 24, id: 'adv_starfall_gown', also: ['d_adv_bellstar'] },
];

export const doorByDay = (day: number) => ADVENT_DOORS.find((d) => d.day === day);

export type DoorState = 'opened' | 'today' | 'ready' | 'locked' | 'asleep';

interface Cal {
  year: number;
  month: number;
  day: number;
  /** True when ?advent=open is pretending it is December 24 because the real day is outside Dec 1–25. */
  previewDay: boolean;
}

function calendar(): Cal {
  const d = today();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const inWindow = month === 12 && day >= 1 && day <= 25;
  if (!inWindow && adventWantsPreview) return { year, month: 12, day: 24, previewDay: true };
  return { year, month, day, previewDay: false };
}

/** December door that counts as "today", or null on catch-up day (the 25th) and outside the calendar. */
export function todaysDoor(): number | null {
  const c = calendar();
  if (c.previewDay) return 24;
  if (c.month === 12 && c.day >= 1 && c.day <= 24) return c.day;
  return null;
}

/** Highest door number that may be opened today. 0 when nothing new can open. */
function reachableThrough(): number {
  const c = calendar();
  if (c.previewDay) return 24;
  if (c.month !== 12) return 0;
  if (c.day >= 1 && c.day <= 24) return c.day;
  if (c.day === 25) return 24;
  return 0;
}

/** The panel can be opened: December 1–26, or any day while ?advent=open is set. */
export function adventPanelAvailable(): boolean {
  if (adventWantsPreview) return true;
  const d = today();
  return d.getMonth() === 11 && d.getDate() >= 1 && d.getDate() <= 26;
}

/** Late November, before the doors wake up. */
export function adventTeaser(): boolean {
  if (adventPanelAvailable()) return false;
  const d = today();
  return d.getMonth() === 10 && d.getDate() >= 27;
}

function openedThisYear(): number[] {
  const a = state.advent;
  if (!a || a.year !== calendar().year) return [];
  return a.opened;
}

export const isDoorOpened = (day: number) => openedThisYear().includes(day);

export function doorState(day: number): DoorState {
  if (day < 1 || day > 24) return 'asleep';
  if (isDoorOpened(day)) return 'opened';
  const reach = reachableThrough();
  if (day > reach) return 'locked';
  if (todaysDoor() === day) return 'today';
  return 'ready';
}

export function doorsOpenedCount(): number {
  return openedThisYear().length;
}

/** December 26 (or any later look-back day the panel still allows): nothing new can open. */
export function doorsSleeping(): boolean {
  return adventPanelAvailable() && reachableThrough() === 0;
}

/** True when the HUD should gently point at an unopened door. */
export function adventNotice(): { title: string; sub: string; label: string } | null {
  if (!adventPanelAvailable()) return null;
  const todayDoor = todaysDoor();
  if (todayDoor && !isDoorOpened(todayDoor)) {
    return {
      title: "Today's door",
      sub: 'still closed',
      label: `December ${todayDoor}'s advent door is still closed. Open the Twinkle Advent Calendar.`,
    };
  }
  const c = calendar();
  const catchUp = !c.previewDay && c.month === 12 && c.day === 25;
  if (catchUp && doorsOpenedCount() < 24) {
    const left = 24 - doorsOpenedCount();
    return {
      title: 'Doors waiting',
      sub: 'until tonight',
      label: `${left} advent ${left === 1 ? 'door is' : 'doors are'} still closed. Catch-up lasts through today.`,
    };
  }
  return null;
}

export function adventStatusLine(): string {
  const c = calendar();
  const n = doorsOpenedCount();
  if (c.previewDay) return `Preview · every door is awake, as if it were December 24. ${n} of 24 opened.`;
  if (c.month === 12 && c.day >= 1 && c.day <= 24) return `December ${c.day}. One door a day. Missed doors stay open through Christmas Day. ${n} of 24 opened.`;
  if (c.month === 12 && c.day === 25) return `Christmas Day. Any door you missed is still waiting, just for today. ${n} of 24 opened.`;
  if (c.month === 12 && c.day === 26) return `The doors have gone quiet. Here is everything you opened. ${n} of 24.`;
  return `${n} of 24 opened.`;
}

export type GiftKind = 'cloth' | 'decor' | 'treat' | 'item';

export function giftKind(id: string): GiftKind {
  if (clothById(id)) return 'cloth';
  const it = ITEMS[id];
  if (it?.kind === 'decor') return 'decor';
  if (it?.kind === 'treat') return 'treat';
  return 'item';
}

export const giftName = (id: string) => clothById(id)?.name ?? ITEMS[id]?.name ?? id;
export const giftDesc = (id: string) => clothById(id)?.desc ?? ITEMS[id]?.desc ?? '';

export function doorGifts(door: AdventDoor): string[] {
  return [door.id, ...(door.also ?? [])];
}

export function doorNames(door: AdventDoor): string {
  return doorGifts(door).map(giftName).join(' and ');
}

function whereText(id: string): string {
  const k = giftKind(id);
  if (k === 'cloth') return 'It is in your wardrobe.';
  if (k === 'decor') return 'It is in your bag. Place it at home or in the yard.';
  if (k === 'treat') return 'It is in your bag. A little something sweet.';
  return 'It is in your bag.';
}

/** Give one gift. Clothes already owned stay owned; everything else goes to the bag (or the chest if the bag is full). */
function give(id: string): string {
  const name = giftName(id);
  if (clothById(id)) {
    return grantCloth(id, false) ? name : `${name} (already in your wardrobe)`;
  }
  if (ITEMS[id]) addItem(id);
  return name;
}

/**
 * Open a door that is today or a catch-up day. Marks it opened for this calendar year and saves.
 * Returns false when the door cannot be opened.
 */
export function openDoor(day: number): boolean {
  const st = doorState(day);
  if (st !== 'today' && st !== 'ready') return false;
  const door = doorByDay(day);
  if (!door) return false;
  const names = doorGifts(door).map(give);
  const year = calendar().year;
  if (!state.advent || state.advent.year !== year) state.advent = { year, opened: [day] };
  else if (!state.advent.opened.includes(day)) state.advent.opened.push(day);
  state.advent.opened.sort((a, b) => a - b);
  saveGame();
  changed();
  sfx.pickup();
  startAct('cheer', 1.3);
  const best = day === 24 ? ' The best gift of the calendar.' : '';
  toast(`December ${day}: ${names.join(' · ')} ✿${best}`);
  return true;
}

export function giftWhere(id: string): string {
  return whereText(id);
}
