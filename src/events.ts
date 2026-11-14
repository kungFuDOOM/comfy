// Seasonal event framework. An event is a plain declarative EventDef: real dates, a banner, exclusive items, optional
// world decorations, activities with milestone rewards and interactable spots. This file knows nothing about any
// particular event; src/events/harvest.ts (Harvest Hush Feast) is the first one. Register new ones in events/index.ts.
//
// Preview any event for QA with URL params:
//   ?event=<id>          force that event active; its peak (feast) day is the "current" day
//   ?date=YYYY-MM-DD     pretend it is that calendar day (also moves seasons, daily stock, ...)
//   ?event=harvest&date=2026-11-22   a regular event day instead of the peak day
//   ?cutscene=<id>       also implies the event + date that scene needs (src/cutscene/presets.ts), unless set explicitly
import type * as THREE from 'three';
import { bus, changed, toast } from './bus';
import { presetParam } from './cutscene/presets';
import { grantCloth } from './wardrobe';
import { clothById } from './clothes';
import { ITEMS } from './data';
import { addItem, earn } from './inventory';
import { state, type EventProgress } from './state';
import { hasDateOverride, SEASONS, today, type Season } from './time';

/** A one-time reward paid out when an activity counter reaches its goal while the event is on. */
export interface EventMilestone {
  id: string;
  /** Counter in the event's progress that this milestone watches. */
  counter: string;
  goal: number;
  title: string;
  reward: { pips?: number; /** Wardrobe ids (clothes/) or item ids (data.ts). */ items?: string[] };
}

/** A thing to do during the event, shown in the journal. `counter`/`goal` draw a progress bar. */
export interface EventActivity {
  id: string;
  icon: string;
  title: string;
  desc: string;
  counter?: string;
  goal?: number;
  /** Chapter (EventDef.chapters) in which this activity unlocks. Missing = from the start. */
  chapter?: string;
}

/** A dated chapter of a long event (a weekly unlock). Earlier chapters' activities stay open; new ones wait for `start`. */
export interface EventChapter {
  id: string;
  title: string;
  /** First local calendar day of the chapter, 'YYYY-MM-DD'. It runs until the next chapter starts. */
  start: string;
  /** One line for the journal. */
  blurb: string;
  /** Short HUD banner line while this chapter is current. */
  hud?: string;
  /** Welcome toast when the chapter begins (or the game opens during it). */
  toast?: string;
}

/** A spot in the world the player can interact with while the event is on. */
export interface EventSpot {
  id: string;
  /** The area it covers, in tile units [x0, y0, x1, y1] (floats are fine; a long table is a thin rectangle). */
  rect: [number, number, number, number];
  /** Interaction reach in pixels from the nearest edge (default 40). */
  reach?: number;
  /** Tiles to walk to when the spot is clicked or tapped (the spot itself may be solid). */
  approach?: { x: number; y: number }[];
  label: string;
  prompt: string;
  run(): void;
}

/** In-world decoration: built when the event starts being active, disposed when it stops. */
export interface EventWorld {
  build(): THREE.Group;
  /** Called every frame with the elapsed time (s). Optional shimmer, flicker, sway. */
  update?(t: number): void;
  /**
   * A cheap string that changes whenever the decorations should be rebuilt (a new chapter, a decorated tree...).
   * The layer also rebuilds whenever the calendar day changes.
   */
  signature?(): string;
}

export interface EventDef {
  id: string;
  name: string;
  icon: string;
  /** Local calendar dates, inclusive: 'YYYY-MM-DD'. */
  start: string;
  end: string;
  /** Optional highlight day inside the window (the feast). Also the day ?event=<id> previews. */
  peakDay?: string;
  /** One cozy sentence for the journal. */
  blurb: string;
  /** Short HUD banner text. */
  banner: string;
  /** Banner text on the peak day. */
  peakBanner?: string;
  /** HUD banner headline suffix on the peak day ("Feast Day!") and its second line. Each event brings its own copy. */
  peakTitle?: string;
  peakSub?: string;
  /** Optional weekly / dated chapters (see EventChapter). */
  chapters?: EventChapter[];
  /** While active, the island looks like this season (a Season id from time.ts), e.g. 'snowfluff'. Visual only. */
  season?: string;
  /** Wardrobe ids and item ids that can only be earned while the event is active (kept forever once earned). */
  items: string[];
  activities: EventActivity[];
  milestones: EventMilestone[];
  world?: EventWorld;
  spots?(): EventSpot[];
  /** Fired once per play session when the event is active (after load / on the day it begins). */
  onStart?(): void;
}

const registry: EventDef[] = [];
export const registerEvent = (def: EventDef) => { if (!registry.some((e) => e.id === def.id)) registry.push(def); };
export const allEvents = (): readonly EventDef[] => registry;
export const eventById = (id: string) => registry.find((e) => e.id === id);

// ---------- dates ----------
const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' to a local-midnight Date. */
export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a: Date, b: Date) => Math.round((midnight(a).getTime() - midnight(b).getTime()) / DAY_MS);
const prettyDay = (s: string) => { const d = parseDay(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };

/** "Nov 20 to Nov 30, 2026" */
export function dateRange(def: EventDef): string {
  return `${prettyDay(def.start)} to ${prettyDay(def.end)}, ${parseDay(def.end).getFullYear()}`;
}

const forcedId = new URLSearchParams(location.search).get('event') ?? presetParam('event');
const forcedEvent = (): EventDef | undefined => (forcedId ? eventById(forcedId) : undefined);

/** The calendar day events see: ?date=, else the peak day of a forced ?event, else the real day. */
export function eventDay(): Date {
  const f = forcedEvent();
  if (!hasDateOverride && f) return parseDay(f.peakDay ?? f.start);
  return today();
}

export type EventPhase = 'upcoming' | 'active' | 'ended';
export function eventPhase(def: EventDef, d = eventDay()): EventPhase {
  if (forcedEvent() === def) return 'active';
  if (dayDiff(d, parseDay(def.start)) < 0) return 'upcoming';
  if (dayDiff(d, parseDay(def.end)) > 0) return 'ended';
  return 'active';
}

export const isEventActive = (id: string) => { const e = eventById(id); return !!e && eventPhase(e) === 'active'; };
export const getActiveEvents = (): EventDef[] => registry.filter((e) => eventPhase(e) === 'active');
export const getUpcomingEvents = (): EventDef[] =>
  registry.filter((e) => eventPhase(e) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start));
export const getPastEvents = (): EventDef[] => registry.filter((e) => eventPhase(e) === 'ended');
// ---------- chapters ----------
/** The chapter that is current today: the latest one whose start day has come (undefined before the first). */
export function currentChapter(ev: EventDef | string): EventChapter | undefined {
  const def = typeof ev === 'string' ? eventById(ev) : ev;
  if (!def?.chapters) return undefined;
  const d = eventDay();
  let cur: EventChapter | undefined;
  for (const c of def.chapters) if (dayDiff(d, parseDay(c.start)) >= 0) cur = c;
  return cur;
}
/** Has this chapter started? (Only while the event is active, so nothing opens before or after the season.) */
export function chapterOpen(eventId: string, chapterId: string | undefined): boolean {
  if (!isEventActive(eventId)) return false;
  if (!chapterId) return true;
  const c = eventById(eventId)?.chapters?.find((x) => x.id === chapterId);
  return !!c && dayDiff(eventDay(), parseDay(c.start)) >= 0;
}
/** Is this the current (latest unlocked) chapter? */
export const inChapter = (eventId: string, chapterId: string) => isEventActive(eventId) && currentChapter(eventId)?.id === chapterId;
/** "Dec 4" */
export const dayLabel = prettyDay;
/** Can this seasonal item be found / sold / baked right now? (Its event is on and its chapter, if any, has started.) */
export function eventItemOpen(itemId: string): boolean {
  const it = ITEMS[itemId];
  return !!it?.event && chapterOpen(it.event, it.chapter);
}

let visAt = -1e9, visId: string | undefined;
/** The season the island should LOOK like: an active event can dress it (Twinkle Season is snowy from late November). */
export function visualSeason(base: Season): Season {
  const now = performance.now();
  if (now - visAt > 400) { visAt = now; visId = registry.find((e) => e.season && eventPhase(e) === 'active')?.season; }
  return (visId && SEASONS.find((x) => x.id === visId)) || base;
}

/** True on the event's highlight day (the feast), while it is active. */
export const isPeakDay = (id: string) => {
  const e = eventById(id);
  return !!e?.peakDay && eventPhase(e) === 'active' && dayDiff(eventDay(), parseDay(e.peakDay)) === 0;
};

/** Whole days until the last day is over; 0 = last day. */
export const daysLeft = (def: EventDef) => Math.max(0, dayDiff(parseDay(def.end), eventDay()));
export const daysUntilStart = (def: EventDef) => Math.max(0, dayDiff(parseDay(def.start), eventDay()));

/** "Ends today" / "Ends tomorrow" / "Ends in 5 days" */
export function endsText(def: EventDef): string {
  const n = daysLeft(def);
  return n === 0 ? 'Ends today' : n === 1 ? 'Ends tomorrow' : `Ends in ${n} days`;
}
/** "Starts tomorrow" / "Starts in 8 days" */
export function startsText(def: EventDef): string {
  const n = daysUntilStart(def);
  return n <= 0 ? 'Starts today' : n === 1 ? 'Starts tomorrow' : `Starts in ${n} days`;
}

// ---------- progress (saved) ----------
/** Progress for an event, created and repaired on demand so a hand-edited or older save can never crash. */
export function eventProgress(id: string): EventProgress {
  const all = state.events as unknown as Record<string, Partial<EventProgress> | undefined>;
  let p = all[id];
  if (!p || typeof p !== 'object') p = all[id] = {};
  if (!p.counters || typeof p.counters !== 'object') p.counters = {};
  if (!Array.isArray(p.claimed)) p.claimed = [];
  if (!p.flags || typeof p.flags !== 'object') p.flags = {};
  if (typeof p.announced !== 'string') p.announced = '';
  return p as unknown as EventProgress;
}
export const eventCounter = (id: string, counter: string) => eventProgress(id).counters[counter] ?? 0;
export const eventFlag = (id: string, flag: string) => !!eventProgress(id).flags[flag];
export function setEventFlag(id: string, flag: string, on = true) { eventProgress(id).flags[flag] = on; changed(); }

/** Does the player have this event reward? (Wardrobe piece or bag/chest item.) */
export const ownsEventItem = (id: string) =>
  clothById(id) ? state.ownedClothes.includes(id) : (state.inv[id] ?? 0) > 0 || (state.bank[id] ?? 0) > 0 || state.decor.some((d) => d.id === id) || state.home.items.some((d) => d.id === id);

/**
 * Give an exclusive event item. Refuses (returns false) when the event is not active, so nothing exclusive can be
 * picked up before it starts or after it ends. Clothes go to the wardrobe, everything else to the bag.
 */
export function grantEventItem(eventId: string, itemId: string): boolean {
  if (!isEventActive(eventId)) return false;
  const def = eventById(eventId);
  if (!def || !def.items.includes(itemId)) return false;
  if (clothById(itemId)) return grantCloth(itemId, true);
  if (!ITEMS[itemId]) return false;
  if (ITEMS[itemId].kind === 'decor' && ownsEventItem(itemId)) return false; // one of each exclusive decor piece
  addItem(itemId);
  toast(`New: ${ITEMS[itemId].name} ✿`);
  return true;
}

/** Add to an activity counter (only while the event is on) and pay out any milestones it just reached. */
export function bumpEvent(eventId: string, counter: string, n = 1) {
  const def = eventById(eventId);
  if (!def || !isEventActive(eventId)) return;
  const p = eventProgress(eventId);
  p.counters[counter] = (p.counters[counter] ?? 0) + n;
  for (const m of def.milestones) {
    if (m.counter !== counter || p.claimed.includes(m.id) || p.counters[counter] < m.goal) continue;
    p.claimed.push(m.id);
    if (m.reward.pips) earn(m.reward.pips);
    for (const it of m.reward.items ?? []) grantEventItem(eventId, it);
    toast(`${def.icon} ${m.title}${m.reward.pips ? `: +${m.reward.pips} pips` : ''}`);
    bus.emit('eventMilestone', { event: eventId, milestone: m.id });
  }
  changed();
}

/** Pay out a one-off reward directly (e.g. the feast). Safe to call twice: it only pays once per `key`. */
export function claimEventReward(eventId: string, key: string, reward: { pips?: number; items?: string[] }): boolean {
  if (!isEventActive(eventId)) return false;
  const p = eventProgress(eventId);
  if (p.claimed.includes(key)) return false;
  p.claimed.push(key);
  if (reward.pips) earn(reward.pips);
  for (const it of reward.items ?? []) grantEventItem(eventId, it);
  changed();
  return true;
}
export const hasClaimed = (eventId: string, key: string) => eventProgress(eventId).claimed.includes(key);

// ---------- world hooks ----------
/** Interactable spots of every active event. */
export function activeEventSpots(): EventSpot[] {
  const out: EventSpot[] = [];
  for (const e of getActiveEvents()) if (e.spots) out.push(...e.spots());
  return out;
}

/** The spot (if any) whose area covers this tile, for click-to-interact. */
export function eventSpotAtTile(tx: number, ty: number): EventSpot | null {
  for (const s of activeEventSpots()) {
    const [x0, y0, x1, y1] = s.rect;
    if (tx + 1 > x0 && tx < x1 && ty + 1 > y0 && ty < y1) return s;
  }
  return null;
}

// ---------- per-frame upkeep ----------
let lastSig = '';
let startedFor = new Set<string>();
/**
 * Call once a frame (cheap). Detects events starting or ending (including at midnight with the tab open), greets the
 * player once a day, and tells the renderer / HUD via the bus.
 */
export function tickEvents() {
  const active = getActiveEvents();
  const sig = active.map((e) => e.id).join(',') + '|' + eventDay().toDateString();
  if (sig === lastSig) return;
  lastSig = sig;
  const dayKey = eventDay().toDateString();
  for (const e of active) {
    const p = eventProgress(e.id);
    if (!startedFor.has(e.id)) { startedFor.add(e.id); e.onStart?.(); }
    // events with chapters greet once per chapter, the others once a day
    const ch = currentChapter(e), peak = isPeakDay(e.id);
    const key = e.chapters ? `${ch?.id ?? ''}|${peak}` : dayKey;
    if (p.announced !== key) {
      p.announced = key;
      toast(`${e.icon} ${peak && e.peakBanner ? e.peakBanner : ch?.toast ?? e.banner}`);
    }
  }
  startedFor = new Set([...startedFor].filter((id) => active.some((e) => e.id === id)));
  bus.emit('eventsChanged', active);
}
