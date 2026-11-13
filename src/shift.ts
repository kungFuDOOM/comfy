// Café Shifts: a short service at Puddle & Pip. A few villagers come in one at a time, order a drink she has unlocked,
// and she makes it with a tiny timing game (ui/shiftUi.ts). The café pantry supplies the ingredients for shifts, so the
// bag is never touched and a shift can never get stuck. A prettier cup means a bigger tip, a little more friendship and
// a little more Barista (brewing) XP. This file holds the rules; the window is in ui/shiftUi.ts.
import { changed, toast } from './bus';
import { ITEMS, RECIPES, VILLAGERS, type Recipe, type VillagerDef } from './data';
import { addItem, earn } from './inventory';
import { hasMovedIn, presentNpcs, shiftServe } from './npc';
import { bump } from './quests';
import { grantXp } from './skills';
import { ensureDaily, state } from './state';
import { isUnlocked } from './cafe';

/** Shifts per day: cozy, not grindy. */
export const SHIFTS_PER_DAY = 2;
export const shiftsLeft = () => Math.max(0, SHIFTS_PER_DAY - ensureDaily().shifts);

export interface Customer { def: VillagerDef; drink: string }
export type CupTier = 0 | 1 | 2 | 3; // number of perfect steps

/** Drinks she can be asked for right now: unlocked brew recipes (seasonal ones are optional and skipped for now). */
export const orderable = (): Recipe[] => RECIPES.filter((r) => r.bench === 'brew' && !r.event && isUnlocked(r));

/** Pick 3-5 customers (friends who are around first, then anyone who has moved in), each with an order. */
export function pickCustomers(): Customer[] {
  const menu = orderable();
  if (!menu.length) return [];
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const around = shuffle(presentNpcs().map((n) => n.def));
  const rest = shuffle(VILLAGERS.filter((v) => hasMovedIn(v) && !around.includes(v)));
  const pool = [...around, ...rest];
  const n = Math.min(pool.length, 3 + ((Math.random() * 3) | 0));
  return pool.slice(0, n).map((def) => {
    const fav = menu.filter((r) => def.likes.includes(r.id));
    const pick = fav.length && Math.random() < 0.5 ? fav : menu;
    return { def, drink: pick[(Math.random() * pick.length) | 0].id };
  });
}

export const tipFor = (c: Customer, perfects: number) =>
  Math.round((ITEMS[c.drink]?.sell ?? 30) * 0.25) + perfects * 4 + (c.def.likes.includes(c.drink) ? 5 : 0);

export interface ServeResult { tip: number; friend: number; xp: number; text: string; unlocks: string[] }

/** Items (not clothes) handed out when the lifetime shift count reaches a number. Clothes use src { k: 'shift' }. */
const ITEM_MILESTONES: Record<number, string> = { 1: 'd_cafe_menu', 8: 'd_cafe_succulent' };

/** Count today's shift the first time a customer is actually served, so opening and closing the window costs nothing. */
export function countShift(): string[] {
  const unlocks: string[] = [];
  ensureDaily().shifts++;
  state.cafe.shifts++;
  const reward = ITEM_MILESTONES[state.cafe.shifts];
  if (reward) { addItem(reward); unlocks.push(ITEMS[reward].name); toast(`${ITEMS[reward].name} is yours for the home ✿`); }
  changed(); // the wardrobe hands out any shift clothing on change
  return unlocks;
}

/** She finished and served this customer's drink. Pays tip, friendship and Barista XP. */
export function serveCustomer(c: Customer, perfects: number): ServeResult {
  const r = RECIPES.find((x) => x.id === c.drink);
  if (!r) return { tip: 0, friend: 0, xp: 0, text: c.def.liked, unlocks: [] }; // unknown drink id: serve nothing, never crash
  const tip = tipFor(c, perfects);
  const xp = r.xp + perfects * 4;
  const reply = shiftServe(c.def, c.drink, perfects);
  earn(tip);
  grantXp(r.skill, xp);
  bump(r.stat);
  state.cafe.tips += tip; state.cafe.customers++;
  if (perfects === 3) state.cafe.perfectCups++;
  changed();
  return { tip, friend: reply.gain, xp, text: reply.text, unlocks: [] };
}

// ---- cozy lines (original) ----
const ORDER_LINES = [
  'Could I have a {d}, please? Extra cozy if you can.',
  'A {d} sounds like exactly the right kind of day.',
  'One {d}! I have been thinking about it since breakfast.',
  'Ooh, a {d} for me, if the foam is feeling friendly.',
];
export const orderLine = (c: Customer) => ORDER_LINES[(c.def.id.length + c.drink.length) % ORDER_LINES.length].replace('{d}', ITEMS[c.drink]?.name ?? 'something cozy');
export const TIER_QUIP = [
  'Cozy and close. It tastes like a hug anyway.',
  'Sweet! The foam is wearing a little smile.',
  'Lovely! Look at those tiny swirls.',
  'Perfect! I almost do not want to drink it. Almost.',
];
