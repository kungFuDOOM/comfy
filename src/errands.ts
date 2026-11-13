// Bulletin board errands: three daily and two weekly errands from villagers, refreshed on the real (local) day and week.
// Rewards are pips, friendship hearts, skill XP and (weekly) a small gift. No timers punish: an unfinished errand just goes away.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { ITEMS, VILLAGERS, type SkillId } from './data';
import { DELIVER_KINDS, DO_KINDS, WEEKLY_GIFTS, type Errand, type ErrandScope } from './errandData';
import { addPoints, metFriend } from './friends';
import { addItem, count, earn, removeItem } from './inventory';
import { grantXp, skillName } from './skills';
import { syncCareUnlocks } from './petcare';
import { state } from './state';
import { getClock, today } from './time';

export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 2;
const SWEEP_BONUS = 30;

/** The Monday that starts this (local) week, as a day key; the ?date= override applies too. */
export function weekKey(): string {
  const d = today();
  const back = (d.getDay() + 6) % 7;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
  return `${m.getFullYear()}-${m.getMonth() + 1}-${m.getDate()}`;
}

function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
}

const OPENERS: Record<string, string[]> = {
  mimsy: ['Sleepy favour, please: ', 'If you are wandering anyway: '],
  zuzu: ['Darling, quick favour: ', 'Fashionably urgent: '],
  bramble: ['Hmph. Would you mind? ', 'Not that I need help, but: '],
  nimbus: ['A soft little wish: ', 'Tell me about it after: '],
  brioche: ['Pastry emergency! ', 'Warm request: '],
  oolie: ['...Um. Please? ', 'If it is not too much: '],
  tuppi: ['Hee! Favour time: ', 'Wiggly request: '],
  marlo: ['Ahoy, friend! ', 'A small task for the light: '],
};

const pick = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const between = (r: () => number, [lo, hi]: [number, number]) => lo + Math.floor(r() * (hi - lo + 1));

function make(scope: ErrandScope, i: number, key: string, used: Set<string>): Errand | null {
  const r = seeded(`${scope}:${key}:${i}`);
  const givers = VILLAGERS.filter(metFriend);
  if (!givers.length) return null;
  const giver = pick(r, givers).id;
  const open = pick(r, OPENERS[giver] ?? ['A small favour: ']);
  const weekly = scope === 'weekly';
  const rod = count('rod') > 0 || state.questLog.lq_errand === 'done';
  // try a few times to avoid posting two of the same thing
  for (let t = 0; t < 8; t++) {
    const deliver = r() < 0.4;
    if (deliver) {
      const k = pick(r, DELIVER_KINDS);
      if (used.has('i:' + k.item)) continue;
      used.add('i:' + k.item);
      const n = between(r, weekly ? k.weekly : k.daily), unit = ITEMS[k.item];
      return { id: `${scope}-${key}-${i}`, scope, giver, skill: k.skill, item: k.item, n, base: 0, text: `${open}Bring me ${n} × ${unit.name}.`, ...reward(r, weekly, n), done: false, notified: false };
    }
    const k = pick(r, DO_KINDS);
    if ((k.need === 'pet' && !state.pet) || (k.need === 'rod' && !rod) || used.has('s:' + k.stat)) continue;
    used.add('s:' + k.stat);
    const n = between(r, weekly ? k.weekly : k.daily);
    return { id: `${scope}-${key}-${i}`, scope, giver, skill: k.skill, stat: k.stat, item: undefined, n, base: state.stats[k.stat] ?? 0, text: `${open}${k.verb(n)}.`, ...reward(r, weekly, n), done: false, notified: false };
  }
  return null;
}

function reward(r: () => number, weekly: boolean, n: number) {
  if (weekly) return { pips: 90 + Math.min(70, n * 4) + Math.floor(r() * 20), hearts: 24, xp: 90 + Math.floor(r() * 40), gift: pick(r, WEEKLY_GIFTS) };
  return { pips: 24 + Math.min(30, n * 5) + Math.floor(r() * 10), hearts: 8, xp: 22 + Math.floor(r() * 12), gift: undefined };
}

function post(scope: ErrandScope, key: string): Errand[] {
  const used = new Set<string>(), out: Errand[] = [];
  const want = scope === 'weekly' ? WEEKLY_COUNT : DAILY_COUNT;
  for (let i = 0; out.length < want && i < want + 6; i++) { const e = make(scope, out.length, `${key}#${i}`, used); if (e) out.push({ ...e, id: `${scope}-${key}-${out.length}` }); }
  return out;
}

/** Roll the board over when the real day or week has changed. Returns true if anything was posted. */
export function ensureErrands(): boolean {
  const e = state.errands, day = getClock().dayKey, wk = weekKey();
  if (!VILLAGERS.some(metFriend)) return false; // nobody to post errands yet: try again once a friend is met
  let fresh = false;
  if (e.day !== day) { e.list = e.list.filter((x) => x.scope !== 'daily').concat(post('daily', day)); e.day = day; fresh = true; }
  if (e.week !== wk) { e.list = e.list.filter((x) => x.scope !== 'weekly').concat(post('weekly', wk)); e.week = wk; fresh = true; }
  return fresh;
}

export const errandsOf = (scope: ErrandScope) => (ensureErrands(), state.errands.list.filter((e) => e.scope === scope));

export function errandProgress(e: Errand): number {
  const have = e.item ? count(e.item) : (state.stats[e.stat!] ?? 0) - e.base;
  return Math.max(0, Math.min(e.n, have));
}
export const errandReady = (e: Errand) => !e.done && errandProgress(e) >= e.n;
export const readyCount = () => state.errands.list.filter(errandReady).length;
export const openCount = () => state.errands.list.filter((e) => !e.done).length;

export function claimErrand(e: Errand): boolean {
  if (!errandReady(e) || (e.item && !removeItem(e.item, e.n))) return false;
  e.done = true;
  earn(e.pips);
  addPoints(e.giver, e.hearts, true);
  grantXp(e.skill as SkillId, e.xp);
  let extra = '';
  if (e.gift) { addItem(e.gift); extra = ` + ${ITEMS[e.gift].name}`; }
  sfx.quest();
  toast(`Errand done! +${e.pips} pips, +${e.xp} ${skillName(e.skill as SkillId)} XP${extra} ♥`);
  const day = state.errands.list.filter((x) => x.scope === 'daily');
  if (day.length > 0 && day.every((x) => x.done) && state.errands.swept !== state.errands.day) {
    state.errands.swept = state.errands.day;
    earn(SWEEP_BONUS);
    toast(`Board swept clean! Bonus +${SWEEP_BONUS} pips ✿`);
  }
  changed();
  return true;
}

/** Time until the next refresh, for the board header. */
export function refreshText(scope: ErrandScope): string {
  const d = today(), now = new Date();
  const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const left = 86400 - secs;
  if (scope === 'daily') { const h = Math.floor(left / 3600); return h >= 1 ? `New errands in about ${h}h` : `New errands in ${Math.max(1, Math.ceil(left / 60))}m`; }
  const days = 7 - ((d.getDay() + 6) % 7) - 1;
  return days <= 0 ? 'New errands tomorrow' : `New errands in ${days + 1} days`;
}

/** Called about twice a second: roll the day, greet once per day, and cheer when an errand becomes ready. */
export function tickErrands() {
  const e = state.errands;
  ensureErrands();
  syncCareUnlocks(); // a pet adopted after the level was reached still gets its earned pieces
  if (e.greeted !== e.day && openCount() > 0) { e.greeted = e.day; toast('✿ Fresh errands are up on the Bulletin Board in the square!'); }
  for (const x of e.list) {
    if (!x.done && !x.notified && errandReady(x)) {
      x.notified = true;
      const g = VILLAGERS.find((v) => v.id === x.giver);
      toast(`✿ An errand for ${g?.name.split(' ')[0] ?? 'a friend'} is ready to claim at the Bulletin Board!`);
      changed();
    }
  }
}
