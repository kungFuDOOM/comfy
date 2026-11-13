// The single mutable game state. Everything in here is persisted.
import { START_WORN, startClothes } from './clothes/start';
import type { Slot } from './clothes/types';
import type { PetSave, PetCare } from './petData';
import { defaultPetCare } from './petData';
import type { ErrandsSave } from './errandData';
import { defaultErrands } from './errandData';
export type LanternKind = 'serve' | 'gift' | 'decor' | 'collect' | 'outfit' | 'garden';

export interface PlacedDecor { id: string; x: number; y: number }
export interface Plot { crop: string; progress: number; wetUntil: number; lastTick: number; need: number }
export interface Lantern { id: number; kind: LanternKind; at: number }
export interface Spawn { item: string; x: number; y: number }
export interface Daily {
  date: string;
  talked: string[];
  gifted: string[];
  served: string[];
  lanternKinds: Record<string, number>;
  /** Café shifts worked today (see shift.ts). */
  shifts: number;
}

/** Lifetime café shift progress. */
export interface CafeProgress { shifts: number; tips: number; customers: number; perfectCups: number }
export const defaultCafe = (): CafeProgress => ({ shifts: 0, tips: 0, customers: 0, perfectCups: 0 });

/** Per-event progress (see events.ts). Created on demand, so saves from before events existed need no migration. */
export interface EventProgress {
  /** Named counters bumped by event activities (pies baked, pies gifted, ...). */
  counters: Record<string, number>;
  /** Milestone ids already paid out. Items earned stay for good. */
  claimed: string[];
  /** Free-form one-shot flags (feast attended, ...). */
  flags: Record<string, boolean>;
  /** Day key the welcome toast last showed, so it greets once per day. */
  announced: string;
}

/** A letter in the mailbox. Its words live in friendData.ts (looked up by id), so a save only keeps these few flags. */
export interface Letter {
  /** 'mimsy:h4' (a heart milestone) or 'mimsy:bday:2026' (a birthday thank-you). */
  id: string;
  from: string;
  at: number;
  read: boolean;
  /** The attached gift (if any) has been taken. */
  taken: boolean;
}

/** Friendship extras on top of `friend` (points per villager). Created with safe defaults, so older saves load untouched. */
export interface Bonds {
  /** Gift tastes discovered so far, per villager id. */
  known: Record<string, { love: string[]; like: string[]; dislike: string[] }>;
  letters: Letter[];
  /** Every letter id ever delivered, so none arrives twice (even after it is deleted from the list). */
  sent: string[];
  /** Birthdays celebrated, as 'mimsy:2026'. */
  wished: string[];
  /** Event days attended (each pays the friends once), as 'harvest:feast'. */
  attended: string[];
}
export const defaultBonds = (): Bonds => ({ known: {}, letters: [], sent: [], wished: [], attended: [] });

export interface SaveData {
  v: number;
  px: number;
  py: number;
  facing: 'up' | 'down' | 'left' | 'right';
  coins: number;
  inv: Record<string, number>;
  hotbar: (string | null)[];
  sel: number;
  /** What each wardrobe slot is wearing (item id or null). A dress and a top/bottom never wear together. */
  worn: Record<Slot, string | null>;
  /** Every wardrobe item id the player owns (bought, earned or crafted). */
  ownedClothes: string[];
  /** Gather node kinds collected at least once, per area id (feeds the region party hats). */
  regionSeen: Record<string, string[]>;
  /** Areas whose party hat has been awarded ('star' = the Island Star hat). Never awarded twice. */
  partyHats: string[];
  /** Handmade accessory worn on the model (an item id of kind 'accessory'), or null. Hidden if no longer owned. */
  accessory: string | null;
  decor: PlacedDecor[];
  plots: Record<string, Plot>;
  /** Friendship points per villager id: 20 per heart, up to 10 hearts (200). Old saves topped out at 100 (5 hearts). */
  friend: Record<string, number>;
  /** Discovered tastes, mailbox, birthdays and event attendance (see Bonds). */
  bonds: Bonds;
  daily: Daily;
  lanterns: Lantern[];
  lanternSeq: number;
  setsDone: string[];
  found: Record<string, number>;
  quests: Record<string, boolean>;
  stats: Record<string, number>;
  spawns: Spawn[];
  seenHelp: boolean;
  /** The new-game arrival cutscene has played (or been skipped) for this save. */
  seenIntro: boolean;
  /** Total XP per skill; the level is always derived from it (see skills.ts). */
  skills: Record<string, number>;
  /** Chest storage at home. */
  bank: Record<string, number>;
  /** Resource node id -> timestamp (ms) when it is ready again. Missing or past = ready. */
  nodes: Record<string, number>;
  /** Quest-log quests (see questlog.ts): 'active' once accepted, 'done' once turned in. */
  questLog: Record<string, 'active' | 'done'>;
  /** Areas that have been opened (see areas.ts / unlocks.ts). Missing = locked; the town is always open. */
  unlocked: Record<string, boolean>;
  /** Seasonal event progress by event id. */
  events: Record<string, EventProgress>;
  /** The adopted pet companion (kind, name, coat, owned/worn pet accessories). null = not adopted yet. */
  pet: PetSave | null;
  /** Daily Pet Care counters (the Pet Care skill itself lives in `skills`). */
  petCare: PetCare;
  /** Bulletin board errands (see errands.ts). */
  errands: ErrandsSave;
  /** Map layout version the saved positions belong to (1 = the original small island). */
  mapV: number;
  /** Café shift totals; older saves get zeros. */
  cafe: CafeProgress;
}

export function defaultState(): SaveData {
  return {
    v: 1,
    px: 48 * 32 + 16,
    py: 46 * 32,
    facing: 'down',
    coins: 120,
    inv: { trowel: 1, can: 1, seed_puffberry: 3, beans: 2, milk: 2, syrup: 1, honey: 1 },
    hotbar: ['trowel', 'can', 'seed_puffberry', 'beans', 'milk', 'syrup', 'honey', null, null],
    sel: 0,
    worn: { ...START_WORN },
    ownedClothes: startClothes(),
    regionSeen: {},
    partyHats: [],
    accessory: null,
    decor: [],
    plots: {},
    friend: {},
    bonds: defaultBonds(),
    daily: { date: '', talked: [], gifted: [], served: [], lanternKinds: {}, shifts: 0 },
    lanterns: [],
    lanternSeq: 1,
    setsDone: [],
    found: {},
    quests: {},
    stats: {},
    spawns: [],
    seenHelp: false,
    seenIntro: false,
    skills: {},
    bank: {},
    nodes: {},
    questLog: {},
    unlocked: {},
    events: {},
    pet: null,
    petCare: defaultPetCare(),
    errands: defaultErrands(),
    mapV: 2,
    cafe: defaultCafe(),
  };
}

export const state: SaveData = defaultState();

/** The town is always open; everything else opens through unlocks.ts. */
export const isAreaOpen = (id: string) => id === 'town' || !!state.unlocked[id];

import { getClock } from './time';
/** Rolls the per-day counters over when the (real) date changes. */
export function ensureDaily(): Daily {
  const day = getClock().dayKey;
  if (state.daily.date !== day) state.daily = { date: day, talked: [], gifted: [], served: [], lanternKinds: {}, shifts: 0 };
  return state.daily;
}
