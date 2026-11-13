// Friendship hearts: points to hearts, gift tastes, birthdays, mailbox letters, event attendance and max-heart rewards.
// Data tables live in friendData.ts and the screens in ui/friendsUi.ts. This module avoids importing npc.ts (npc.ts
// imports it), so anything that needs a villager's position goes through the bus ('heartsUp', 'celebrate').
import { sfx } from './audio';
import { bus, changed, toast } from './bus';
import { ITEMS, VILLAGERS, type VillagerDef } from './data';
import { DISLIKE_REPLY, DISLIKE_REPLY_WARM, FRIEND_INFO, HEART_PTS, MAX_HEARTS, MAX_PTS, type FriendInfo, type LetterDef, type LetterGift, type MaxReward } from './friendData';
import { addItem, earn } from './inventory';
import { isAreaOpen, state, type Letter } from './state';
import { today } from './time';

export { HEART_PTS, MAX_HEARTS, MAX_PTS };

export const villagerById = (id: string): VillagerDef | undefined => VILLAGERS.find((v) => v.id === id);
export const infoOf = (id: string): FriendInfo | undefined => FRIEND_INFO[id];
const firstName = (def: VillagerDef) => def.name.split(' ')[0];
/** Is this friend living on the island yet? (Friends of a gated area wait until it opens.) */
export const metFriend = (def: VillagerDef) => !def.area || isAreaOpen(def.area);

// ---------- hearts ----------
export const points = (id: string) => Math.max(0, Math.min(MAX_PTS, state.friend[id] ?? 0));
export const hearts = (id: string) => Math.min(MAX_HEARTS, Math.floor(points(id) / HEART_PTS));
/** 0..1 progress toward the next heart (1 at the maximum). */
export const heartProgress = (id: string) => (hearts(id) >= MAX_HEARTS ? 1 : (points(id) % HEART_PTS) / HEART_PTS);
export const isMaxed = (id: string) => hearts(id) >= MAX_HEARTS;

/**
 * Give a friend friendship points. Crossing a heart plays a little fanfare (toast, chime, hearts over their head);
 * reaching a heart milestone puts a letter in the mailbox; the tenth heart is a bigger celebration.
 */
export function addPoints(id: string, pts: number, quiet = false): number {
  const def = villagerById(id);
  if (!def || pts <= 0) return 0;
  const before = hearts(id);
  state.friend[id] = Math.min(MAX_PTS, points(id) + pts);
  const after = hearts(id);
  if (after > before && !quiet) {
    if (after >= MAX_HEARTS) {
      toast(`${MAX_HEARTS} hearts with ${firstName(def)}! Best friends! ${rewardToast(id)}`);
      sfx.quest();
      bus.emit('celebrate', { id, kind: 'max' });
    } else {
      toast(`♥ ${firstName(def)} is now at ${after} ${after === 1 ? 'heart' : 'hearts'}!`);
      sfx.ding();
      bus.emit('celebrate', { id, kind: 'heart' });
    }
  }
  deliverMilestones(id, quiet);
  changed();
  return after - before;
}

const rewardToast = (id: string) => { const r = infoOf(id)?.reward; return r ? `${r.kind === 'recipe' ? 'New recipe' : 'New outfit'}: ${rewardName(r)}.` : ''; };

// ---------- gift tastes ----------
export type Taste = 'love' | 'like' | 'dislike' | 'neutral';
/** How a villager feels about an item. Pies and cookies (`loved` in data.ts) are adored by everyone. */
export function tasteOf(id: string, item: string): Taste {
  const def = villagerById(id), info = infoOf(id);
  if (!def) return 'neutral';
  if (ITEMS[item]?.loved || def.likes.includes(item)) return 'love';
  if (info?.like.includes(item)) return 'like';
  if (info?.dislike.includes(item)) return 'dislike';
  return 'neutral';
}

export const knownTastes = (id: string) => state.bonds.known[id] ?? { love: [], like: [], dislike: [] };

/** Remember that the player now knows how this friend feels about an item. */
export function discover(id: string, kind: 'love' | 'like' | 'dislike', item: string): boolean {
  const k = (state.bonds.known[id] ??= { love: [], like: [], dislike: [] });
  if (k[kind].includes(item)) return false;
  k[kind].push(item);
  return true;
}

/** Every taste a friend has, by kind, for showing "?" slots for the ones still hidden. Pies and cookies are shared knowledge. */
export function tasteTotals(id: string) {
  const def = villagerById(id), info = infoOf(id);
  return { love: def?.likes.length ?? 0, like: info?.like.length ?? 0, dislike: info?.dislike.length ?? 0 };
}

/** Friendship points for a gift. Drinks are served rather than gifted, so a middling drink is worth a bit more than a middling gift. */
export function giftPoints(taste: Taste, drink: boolean): number {
  return taste === 'love' ? 24 : taste === 'like' ? 12 : taste === 'dislike' ? 0 : drink ? 6 : 4;
}

export function dislikeReply(id: string): string {
  const pool = hearts(id) >= 6 ? DISLIKE_REPLY_WARM : DISLIKE_REPLY;
  return pool[(Math.random() * pool.length) | 0];
}

// ---------- dialogue warm-up ----------
/** The chat lines a friend draws from: they warm up as hearts rise, with a few new lines at every stage. */
export function chatPool(def: VillagerDef): string[] {
  const h = hearts(def.id), info = infoOf(def.id), L = def.lines;
  if (!info) return L[h >= 8 ? 2 : h >= 4 ? 1 : 0];
  if (h < 2) return L[0];
  if (h < 4) return L[1];
  if (h < 6) return [...info.mid, ...L[1]];
  if (h < 8) return [...info.close, ...L[1]];
  if (h < 10) return [...L[2], ...info.close];
  return [...info.best, ...L[2]];
}

/** A short label for how well you know each other, shown under the hearts. */
export function bondLabel(id: string): string {
  const h = hearts(id);
  return h >= 10 ? 'Best friends' : h >= 8 ? 'Dear friends' : h >= 6 ? 'Close friends' : h >= 4 ? 'Good friends' : h >= 2 ? 'Friendly' : 'New friends';
}

// ---------- birthdays ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const birthdayOf = (id: string) => infoOf(id)?.bday;
export const birthdayLabel = (id: string) => { const b = birthdayOf(id); return b ? `${MONTHS[b.m - 1]} ${b.d}` : '?'; };
export function isBirthday(id: string): boolean {
  const b = birthdayOf(id), t = today();
  return !!b && b.m === t.getMonth() + 1 && b.d === t.getDate();
}
/** Whole days until the next birthday (0 = today). */
export function daysToBirthday(id: string): number {
  const b = birthdayOf(id);
  if (!b) return 999;
  const t = today();
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  let next = new Date(t.getFullYear(), b.m - 1, b.d);
  if (next < start) next = new Date(t.getFullYear() + 1, b.m - 1, b.d);
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}
export const birthdayText = (id: string) => { const n = daysToBirthday(id); return n === 0 ? 'Today!' : n === 1 ? 'Tomorrow' : `in ${n} days`; };
/** Friends who live on the island and have a birthday today. */
export const birthdayFriends = (): VillagerDef[] => VILLAGERS.filter((v) => metFriend(v) && isBirthday(v.id));
const wishKey = (id: string) => `${id}:${today().getFullYear()}`;
export const birthdayDone = (id: string) => state.bonds.wished.includes(wishKey(id));

/** Celebrate a birthday once a year: confetti over them, a thank-you letter in the mailbox. Returns false if it already happened. */
export function celebrateBirthday(id: string): boolean {
  const def = villagerById(id);
  if (!def || !isBirthday(id) || birthdayDone(id)) return false;
  state.bonds.wished.push(wishKey(id));
  sfx.quest();
  bus.emit('celebrate', { id, kind: 'birthday' });
  toast(`🎂 Happy birthday, ${firstName(def)}!`);
  sendLetter(`${id}:bday:${today().getFullYear()}`, id);
  changed();
  return true;
}

let announcedDay = '';
/** Once per day: tell the player whose birthday it is. Called from the game loop. */
export function tickFriends() {
  const day = today().toDateString();
  if (day === announcedDay) return;
  announcedDay = day;
  const list = birthdayFriends().filter((v) => !birthdayDone(v.id));
  if (list.length) toast(`🎂 Today is ${list.map(firstName).join(' and ')}'s birthday! Stop by with a gift for double hearts.`);
}

// ---------- mailbox ----------
export interface LetterView { subject: string; body: string; gift?: LetterGift; sign: string }

function milestone(id: string, at: number): LetterDef | undefined { return infoOf(id)?.letters.find((l) => l.at === at); }
const SPECIAL_SIGN = (def: VillagerDef) => `Your friend, ${firstName(def)}`;

/** Resolve a stored letter to its words. */
export function letterView(l: Letter): LetterView | null {
  const def = villagerById(l.from), info = infoOf(l.from);
  if (!def || !info) return null;
  const bday = /^[a-z]+:bday:(\d+)$/.exec(l.id);
  if (bday) return { subject: 'Thank you for my birthday', body: info.bdayLetter, gift: { pips: 60, item: BDAY_GIFT[l.from] }, sign: SPECIAL_SIGN(def) };
  const m = /^[a-z]+:h(\d+)$/.exec(l.id);
  const lt = m ? milestone(l.from, Number(m[1])) : undefined;
  if (!lt) return null;
  const body = lt.reveal ? lt.body.replace('{r}', ITEMS[lt.reveal.item]?.name ?? 'that') : lt.body;
  return { subject: lt.subject, body, gift: lt.gift, sign: SPECIAL_SIGN(def) };
}
const BDAY_GIFT: Record<string, string> = { mimsy: 'pink_latte', zuzu: 'bow_pin', bramble: 'cottonbloom', nimbus: 'honey_cap', brioche: 'berry_tart', oolie: 'blossom', tuppi: 'cloud_cake', marlo: 'shell' };

/** Put a letter in the mailbox (never twice). A milestone letter also lets its friend's taste slip. */
export function sendLetter(id: string, from: string, quiet = false): boolean {
  const b = state.bonds;
  if (b.sent.includes(id)) return false;
  b.sent.push(id);
  b.letters.unshift({ id, from, at: Date.now(), read: false, taken: false });
  if (b.letters.length > 120) b.letters.length = 120; // never grows without bound
  const m = /^[a-z]+:h(\d+)$/.exec(id);
  const lt = m ? milestone(from, Number(m[1])) : undefined;
  if (lt?.reveal) discover(from, lt.reveal.kind, lt.reveal.item);
  const def = villagerById(from);
  if (!quiet && def) { toast(`✉ A letter from ${firstName(def)} is in your mailbox!`); sfx.ding(); }
  changed();
  return true;
}

function deliverMilestones(id: string, quiet: boolean) {
  const info = infoOf(id), def = villagerById(id);
  if (!info || !def || !metFriend(def)) return;
  const h = hearts(id);
  let n = 0;
  for (const l of info.letters) if (l.at <= h && sendLetter(`${id}:h${l.at}`, id, true)) n++;
  if (n && !quiet) {
    toast(n === 1 ? `✉ A letter from ${firstName(def)} is in your mailbox!` : `✉ ${n} letters from ${firstName(def)} are in your mailbox!`);
    sfx.ding();
  }
}

/** On load: hearts earned before letters existed (or before a friend moved in) get their letters now, in one gentle toast. */
export function syncFriendship() {
  const before = state.bonds.letters.length;
  for (const def of VILLAGERS) deliverMilestones(def.id, true);
  const gained = state.bonds.letters.length - before;
  if (gained > 0) toast(`✉ ${gained} ${gained === 1 ? 'letter is' : 'letters are'} waiting in your mailbox!`);
}

export const unreadLetters = () => state.bonds.letters.filter((l) => !l.read).length;
export const giftWaiting = (l: Letter) => { if (l.taken) return false; const g = letterView(l)?.gift; return !!g && (!!g.pips || !!g.item); };
export const unclaimedGifts = () => state.bonds.letters.filter(giftWaiting).length;
export function markRead(l: Letter) { if (!l.read) { l.read = true; changed(); } }
export const giftLabel = (g: LetterGift) => [g.item ? `${ITEMS[g.item]?.name ?? 'a gift'}${g.n && g.n > 1 ? ` x${g.n}` : ''}` : '', g.pips ? `${g.pips} pips` : ''].filter(Boolean).join(' and ');

/** Take the attached gift out of a letter. */
export function takeGift(l: Letter): boolean {
  if (!giftWaiting(l)) return false;
  const g = letterView(l)!.gift!;
  if (g.item) addItem(g.item, g.n ?? 1);
  if (g.pips) earn(g.pips);
  l.taken = true; l.read = true;
  sfx.gift();
  toast(`You took ${giftLabel(g)} from the letter ♥`);
  changed();
  return true;
}

// ---------- requests and events ----------
/** A villager's request was finished. */
export const requestDone = (giver: string) => { addPoints(giver, 40); };

/** An event day (the feast, Christmas Eve...) was attended: every friend who lives here warms up, once per `key`. */
export function eventAttended(key: string): boolean {
  if (state.bonds.attended.includes(key)) return false;
  state.bonds.attended.push(key);
  let any = false;
  for (const def of VILLAGERS) if (metFriend(def)) { addPoints(def.id, 20, true); any = true; }
  if (any) toast('Spending the day together made everyone a little closer ♥');
  changed();
  return any;
}

// ---------- max-heart rewards ----------
export const rewardOf = (id: string): MaxReward | undefined => infoOf(id)?.reward;
export const rewardUnlocked = (id: string) => isMaxed(id);
export function rewardName(r: MaxReward): string { return r.blurb; }
/** Does the player have the friendship a recipe is waiting on? (Recipes without a `friend` are always fine.) */
export const recipeFriendOk = (friend?: string) => !friend || isMaxed(friend);
