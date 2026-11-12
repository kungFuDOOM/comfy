// The single mutable game state. Everything in here is persisted.
import { START_WORN, startClothes } from './clothes/start';
import type { Slot } from './clothes/types';
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
}

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
  friend: Record<string, number>;
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
  /** Map layout version the saved positions belong to (1 = the original small island). */
  mapV: number;
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
    daily: { date: '', talked: [], gifted: [], served: [], lanternKinds: {} },
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
    mapV: 2,
  };
}

export const state: SaveData = defaultState();

/** The town is always open; everything else opens through unlocks.ts. */
export const isAreaOpen = (id: string) => id === 'town' || !!state.unlocked[id];

import { getClock } from './time';
/** Rolls the per-day counters over when the (real) date changes. */
export function ensureDaily(): Daily {
  const day = getClock().dayKey;
  if (state.daily.date !== day) state.daily = { date: day, talked: [], gifted: [], served: [], lanternKinds: {} };
  return state.daily;
}
