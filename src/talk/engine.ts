// Villager conversations: picks what a friend says from their voice (talk/voices) and what is going on right now
// (hearts, holidays, weather, time of day, birthdays, gifts, quests, what you have been up to), shapes it into a few
// taps (hello, a topic or two, goodbye) and remembers recent lines so nobody repeats themselves too soon.
// Memory lives in state.talk (optional in older saves, sanitised in save.ts). The friendship numbers are untouched:
// npc.ts still decides points; this module only decides words.
import { bus } from '../bus';
import { clothById } from '../clothes';
import { ITEMS, VILLAGERS, type VillagerDef } from '../data';
import { feastChat, pieReply } from '../events/pieLines';
import { twinkleChat } from '../events/twinkleText';
import { feastGathering } from '../events/feastSeats';
import { gatherKind } from '../events/twinkleSeats';
import { daysToBirthday, hearts, infoOf, isBirthday, metFriend, points } from '../friends';
import { merchantPresent } from '../merchant';
import { questsFrom, questStatus } from '../questlog';
import { skillName } from '../skills';
import { isAreaOpen, state, type TalkSave } from '../state';
import { getClock, today } from '../time';
import type { SkillId } from '../data';
import { worldCtx, type WorldCtx } from './context';
import { VOICES } from './voices';
import type { Activity, Beat, Cond, Line, LineObj, News, Voice } from './types';

export type { Beat } from './types';

const RECENT_MAX = 36;
/** Chats in one day before a friend gently runs out of words. */
const TIRED_AFTER = 7;

const ACTIVITIES: Activity[] = ['fished', 'foraged', 'harvested', 'brewed', 'baked', 'crafted', 'placed', 'tried', 'collected', 'lanterns', 'petcare', 'styled', 'served', 'gifted'];
const ACT_MOOD: Record<Activity, string> = {
  fished: '🎣', foraged: '🍓', harvested: '🌱', brewed: '☕', baked: '🧁', crafted: '🎀', placed: '🏡', tried: '👗',
  collected: '✨', lanterns: '🏮', petcare: '🐾', styled: '🎀', served: '☕', gifted: '🎁',
};
const SKY_MOOD = { sunny: '☀️', cloudy: '☁️', rain: '☔', snow: '❄️', rainbow: '🌈' } as const;
const NEWS_AREA: Partial<Record<News, string>> = { meadow: 'meadow', blossom: 'blossom', pond: 'pond', lighthouse: 'lighthouse', pearl: 'pearl' };

const firstName = (def: VillagerDef) => def.name.split(' ')[0];
const tierOf = (h: number): 0 | 1 | 2 | 3 => (h >= 8 ? 3 : h >= 5 ? 2 : h >= 2 ? 1 : 0);

// ---------- memory ----------
const mem = (): TalkSave => state.talk;
const recentOf = (id: string): string[] => (mem().recent[id] ??= []);
function remember(id: string, lineId: string) {
  const r = recentOf(id);
  const at = r.indexOf(lineId);
  if (at >= 0) r.splice(at, 1);
  r.push(lineId);
  if (r.length > RECENT_MAX) r.splice(0, r.length - RECENT_MAX);
}

/** Chats per friend today (not saved: a reload simply gives everyone their words back). */
const chats = new Map<string, { day: string; n: number }>();
function chatCount(id: string): number {
  const day = getClock().dayKey, c = chats.get(id);
  return c && c.day === day ? c.n : 0;
}
function bumpChat(id: string) { const day = getClock().dayKey; chats.set(id, { day, n: chatCount(id) + 1 }); }

/** Skill level-ups this session; each friend congratulates once. */
const levelUps: { skill: SkillId; level: number; at: number; told: Set<string> }[] = [];
bus.on('levelup', (e: { id: SkillId; level: number }) => {
  if (!e?.id) return;
  levelUps.unshift({ skill: e.id, level: e.level, at: Date.now(), told: new Set() });
  if (levelUps.length > 4) levelUps.length = 4;
});

// ---------- context ----------
interface Ctx extends WorldCtx {
  def: VillagerDef;
  voice: Voice;
  hearts: number;
  tier: 0 | 1 | 2 | 3;
  vars: Record<string, string>;
}

function cond(c: Cond | undefined): boolean {
  if (!c) return true;
  const worn = Object.values(state.worn ?? {}).filter((x): x is string => !!x).map((id) => clothById(id));
  switch (c) {
    case 'hat': return !!state.worn?.hat;
    case 'noHat': return !state.worn?.hat;
    case 'dress': return !!state.worn?.dress;
    case 'spots': return worn.some((w) => !!w && (w.pattern?.startsWith('cheetah') || w.trimPattern?.startsWith('cheetah')));
    case 'pet': return !!state.pet;
    case 'ribbon': return Object.keys(state.style?.ribbons ?? {}).length > 0;
    default: return true;
  }
}

function makeCtx(def: VillagerDef): Ctx {
  const h = hearts(def.id);
  return {
    ...worldCtx(),
    def,
    voice: VOICES[def.id] ?? VOICES.mimsy,
    hearts: h,
    tier: tierOf(h),
    vars: { pet: state.pet?.name || 'your pet' },
  };
}

// ---------- picking ----------
interface Cand { id: string; line: Line; w: number; mood?: string }
const obj = (l: Line): LineObj => (typeof l === 'string' ? { t: l } : l);

function usable(l: Line, ctx: Ctx): boolean {
  const o = obj(l);
  return (o.min ?? 0) <= ctx.hearts && cond(o.when);
}

/** Candidates from one pool; `key` names the pool so each line has a stable id for the no-repeat memory. */
function cands(ctx: Ctx, key: string, list: Line[] | undefined, w = 1, mood?: string): Cand[] {
  if (!list) return [];
  const out: Cand[] = [];
  list.forEach((line, i) => { if (usable(line, ctx)) out.push({ id: `${key}.${i}`, line, w, mood }); });
  return out;
}

function weighted<T extends { w: number }>(list: T[]): T {
  let sum = 0;
  for (const c of list) sum += c.w;
  let r = Math.random() * sum;
  for (const c of list) { r -= c.w; if (r <= 0) return c; }
  return list[list.length - 1];
}

/** A fresh line if there is one; otherwise the one said longest ago. */
function choose(id: string, list: Cand[]): Cand | null {
  if (!list.length) return null;
  const recent = recentOf(id);
  const fresh = list.filter((c) => !recent.includes(c.id));
  if (fresh.length) return weighted(fresh);
  return list.reduce((a, b) => (recent.indexOf(b.id) < recent.indexOf(a.id) ? b : a));
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? 'that');
}

/** Turn a chosen line into taps ("|" splits it), remembering it. */
function beatsOf(ctx: Ctx, c: Cand, extra: Record<string, string> = {}): Beat[] {
  remember(ctx.def.id, c.id);
  const o = obj(c.line), vars = { ...ctx.vars, ...extra };
  const parts = fill(o.t, vars).split('|').map((s) => s.trim()).filter(Boolean);
  const beats: Beat[] = parts.map((text, i) => ({ text, mood: i === 0 ? c.mood : undefined }));
  if (o.ask?.length && beats.length) beats[beats.length - 1].ask = o.ask.map(([a, b]): [string, string] => [fill(a, vars), fill(b, vars)]);
  return beats;
}

/** Split a plain line (quest offers, birthday thanks...) into taps. */
export const plainBeats = (text: string, mood?: string): Beat[] =>
  text.split('|').map((s) => s.trim()).filter(Boolean).map((t, i) => ({ text: t, mood: i === 0 ? mood : undefined }));

// ---------- topics ----------
interface Topic { key: string; w: number; list: Cand[]; vars?: Record<string, string>; after?: () => void; forced?: boolean }

/** The older, shorter line tables (data.ts `lines` / `phase`, friendData.ts `mid` / `close` / `best`) stay in the mix. */
function legacySmall(ctx: Ctx): Cand[] {
  const L = ctx.def.lines, info = infoOf(ctx.def.id), id = ctx.def.id;
  const tag = (key: string, list: string[] | undefined, min: number): Cand[] =>
    min <= ctx.hearts ? (list ?? []).map((t, i) => ({ id: `${id}.old.${key}.${i}`, line: t, w: 0.6 })) : [];
  return [...tag('l0', L[0], 0), ...tag('l1', L[1], 2), ...tag('l2', L[2], 8), ...tag('mid', info?.mid, 4), ...tag('close', info?.close, 6), ...tag('best', info?.best, 10)];
}

function topics(ctx: Ctx, firstToday: boolean): Topic[] {
  const v = ctx.voice, id = ctx.def.id, t: Topic[] = [];
  const add = (key: string, w: number, list: Cand[], extra?: Partial<Topic>) => { if (list.length && w > 0) t.push({ key, w, list, ...extra }); };

  // a request they gave you: ready to hand over beats everything
  for (const q of questsFrom(id)) {
    const st = questStatus(q);
    if (st === 'ready') add('quest', 100, cands(ctx, `${id}.quest.ready`, v.quest.ready, 1, '✿'), { forced: true });
    else if (st === 'active') add('quest', 4, cands(ctx, `${id}.quest.active`, v.quest.active, 1, '✿'));
  }
  if (state.errands?.list?.some((e) => e.giver === id && !e.done)) add('errand', 2.5, cands(ctx, `${id}.quest.errand`, v.quest.errand, 1, '📌'));

  // holidays: a day-of moment opens the first chat of the day
  for (const hd of ctx.holidays) {
    const list = cands(ctx, `${id}.hol.${hd.key}`, v.holiday[hd.key], 1, hd.mood);
    if (hd.key === 'feast' && feastGathering()) list.push(...feastChat(id).map((s, i) => ({ id: `${id}.feastchat.${i}`, line: s, w: 1, mood: hd.mood })));
    if ((hd.key === 'xmasEve' || hd.key === 'xmasDay') && gatherKind()) list.push(...twinkleChat(id).map((s, i) => ({ id: `${id}.tw.${i}`, line: s, w: 1, mood: hd.mood })));
    add('hol.' + hd.key, hd.w, list, { forced: firstToday && hd.w >= 8 });
  }
  if (ctx.xmasDays > 1) add('countdown', 3.5, cands(ctx, `${id}.countdown`, v.countdown, 1, '🎄'), { vars: { days: String(ctx.xmasDays) } });

  // what you have been up to since you last talked
  const since = mem().since[id];
  if (since) {
    const done = ACTIVITIES.filter((a) => (state.stats[a] ?? 0) > (since[a] ?? 0) && v.did[a]?.length);
    if (done.length) {
      const list = done.flatMap((a) => cands(ctx, `${id}.did.${a}`, v.did[a], Math.min(4, (state.stats[a] ?? 0) - (since[a] ?? 0)), ACT_MOOD[a]));
      add('did', 6, list);
    }
  }
  const lv = levelUps.find((l) => !l.told.has(id) && Date.now() - l.at < 45 * 60_000);
  if (lv) add('level', 6, cands(ctx, `${id}.level`, v.levelUp, 1, '⭐'), { vars: { skill: skillName(lv.skill), level: String(lv.level) }, after: () => lv.told.add(id) });

  // today's (or yesterday's) gift, remembered on a later chat
  const g = mem().gift[id];
  if (g && !firstToday && (g.day === getClock().dayKey || g.day === yesterdayKey()) && g.taste !== 'dislike' && ITEMS[g.item]) {
    add('remember', 3, cands(ctx, `${id}.gift.remember`, v.gift.remember, 1, '♡'), { vars: { item: ITEMS[g.item].name } });
  }

  // news: each friend mentions something new once
  const once = mem().once;
  for (const [k, line] of Object.entries(v.news) as [News, Line][]) {
    const lineId = `${id}.news.${k}`;
    if (once.includes(lineId)) continue;
    const area = NEWS_AREA[k];
    if (k === 'pet' ? !state.pet : !area || !isAreaOpen(area)) continue;
    add('news.' + k, 7, [{ id: lineId, line, w: 1, mood: k === 'pet' ? '🐾' : '✨' }], { after: () => { if (!once.includes(lineId)) once.push(lineId); } });
  }

  // friends' birthdays coming up
  const soon = VILLAGERS.filter((o) => o.id !== id && metFriend(o) && daysToBirthday(o.id) <= 3);
  if (soon.length) {
    const o = soon[0], n = daysToBirthday(o.id);
    add('bday', n === 0 ? 7 : 5, cands(ctx, `${id}.bdaysoon`, v.bdaySoon, 1, '🎂'), { vars: { friend: firstName(o), when: n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days` } });
  }

  if (merchantPresent()) add('merchant', 2.5, cands(ctx, `${id}.merchant`, v.merchant, 1, '🧳'));

  // the world around you
  const skyW = ctx.sky === 'rain' || ctx.sky === 'snow' || ctx.sky === 'rainbow' ? 4 : 1.2;
  add('sky', skyW, cands(ctx, `${id}.sky.${ctx.sky}`, v.sky[ctx.sky], 1, SKY_MOOD[ctx.sky]));
  add('season', 2, cands(ctx, `${id}.season.${ctx.season}`, v.season[ctx.season]), { vars: { season: ctx.seasonName } });
  const phase = [...cands(ctx, `${id}.phase.${ctx.phase}`, v.phase[ctx.phase]), { id: `${id}.old.phase.${ctx.phase}`, line: ctx.def.phase[ctx.phase], w: 0.7 }];
  if (ctx.late) phase.push(...cands(ctx, `${id}.phase.late`, v.phase.late, 2, '🌙'));
  add('phase', ctx.late ? 3 : 2, phase);

  // who they are
  const small = v.small.flatMap((list, k) => (k <= ctx.tier ? cands(ctx, `${id}.small${k}`, list, k === ctx.tier ? 2.2 : 1) : []));
  add('small', 4, [...small, ...legacySmall(ctx)]);
  add('ask', 2.6, cands(ctx, `${id}.ask`, v.ask, 1, '💭'));
  const gossip = Object.entries(v.gossip).flatMap(([who, list]) => {
    const o = VILLAGERS.find((x) => x.id === who);
    return o && metFriend(o) ? cands(ctx, `${id}.gossip.${who}`, list, 1, '🤫') : [];
  });
  add('gossip', 2, gossip);
  add('outfit', id === 'zuzu' ? 3.5 : 0.7, cands(ctx, `${id}.outfit`, v.outfit, 1, '👒'));
  return t;
}

function yesterdayKey(): string {
  const d = today();
  const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
}

/** Pick topics: forced ones first, then weighted, never the same topic twice; a question always comes last. */
function pickTopics(ctx: Ctx, all: Topic[], n: number): Beat[] {
  const out: Beat[] = [];
  const recent = recentOf(ctx.def.id);
  const pool = all.slice();
  for (let i = 0; i < n && pool.length; i++) {
    const forced = pool.find((p) => p.forced);
    const live = pool.map((p) => ({ p, w: p.list.some((c) => !recent.includes(c.id)) ? p.w : p.w * 0.12 }));
    if (!live.length) break;
    const top = forced ?? weighted(live).p;
    pool.splice(pool.indexOf(top), 1);
    const c = choose(ctx.def.id, top.list);
    if (!c) continue;
    const beats = beatsOf(ctx, c, top.vars);
    top.after?.();
    out.push(...beats);
    // a question ends the chat on the player's answer
    if (beats.some((b) => b.ask)) break;
  }
  return out;
}

function snapshot(id: string) {
  const s: Record<string, number> = {};
  for (const a of ACTIVITIES) s[a] = state.stats[a] ?? 0;
  mem().since[id] = s;
}

// ---------- public ----------
/**
 * What a friend says when you chat. `firstToday` is the day's first chat (a warmer hello and a goodbye),
 * `firstEver` is meeting them for the very first time.
 */
export function converse(def: VillagerDef, firstToday: boolean, firstEver: boolean): Beat[] {
  const ctx = makeCtx(def), v = ctx.voice, id = def.id;
  const n = chatCount(id);
  bumpChat(id);
  const beats: Beat[] = [];
  const pick = (key: string, list: Line[], mood?: string, vars?: Record<string, string>) => {
    const c = choose(id, cands(ctx, key, list, 1, mood));
    if (c) beats.push(...beatsOf(ctx, c, vars));
  };

  if (!firstToday && n >= TIRED_AFTER) {
    pick(`${id}.hello.tired`, v.hello.tired, '💤');
    return beats;
  }
  // hello
  if (isBirthday(id) && firstToday) pick(`${id}.hello.bday`, v.hello.birthday, '🎂');
  else if (firstEver) pick(`${id}.hello.first`, v.hello.first, '✿');
  else if (firstToday) pick(`${id}.hello.t${ctx.tier}`, v.hello.t[ctx.tier]);
  else if (Math.random() < 0.45) pick(`${id}.hello.again`, v.hello.again);

  // topics: a proper catch-up on the first chat of the day, a quick one after
  const want = firstToday ? (ctx.tier >= 2 && Math.random() < 0.45 ? 3 : 2) : Math.random() < 0.3 ? 2 : 1;
  beats.push(...pickTopics(ctx, topics(ctx, firstToday), firstEver ? 1 : want));

  // goodbye (not after a question; the answer is a nice place to stop)
  if (firstToday && !beats.some((b) => b.ask)) pick(`${id}.bye`, ctx.phase === 'night' || ctx.late ? [...v.byeNight, ...v.bye.slice(0, 1)] : v.bye);
  snapshot(id);
  if (!beats.length) beats.push({ text: '...' });
  return beats;
}

/** What a friend says when handed something. Pies keep their feast words; holiday cookies have their own. */
export function giftBeats(def: VillagerDef, itemId: string, taste: 'love' | 'like' | 'neutral' | 'dislike', drink: boolean, birthday: boolean): Beat[] {
  const ctx = makeCtx(def), v = ctx.voice, id = def.id, item = ITEMS[itemId];
  const name = item?.name ?? 'this';
  let beats: Beat[];
  if (item?.loved && item.event === 'harvest') beats = [{ text: pieReply(id), mood: '🥧' }];
  else {
    const pool = item?.loved ? v.gift.cookie : taste === 'love' ? v.gift.love : taste === 'like' ? v.gift.like : taste === 'dislike' ? v.gift.dislike : v.gift.meh;
    const key = item?.loved ? 'cookie' : taste;
    const mood = item?.loved ? '🍪' : taste === 'love' ? '💖' : taste === 'like' ? '♡' : taste === 'dislike' ? '😅' : '🙂';
    const list = cands(ctx, `${id}.gift.${key}`, pool, 1, mood).filter((c) => {
      const o = obj(c.line);
      if (o.kind && (o.kind === 'drink') !== drink) return false;
      return !o.item || o.item.includes(itemId);
    });
    for (const c of list) if (obj(c.line).item) c.w = 4; // a line about exactly this item is the best reply
    const c = choose(id, list);
    beats = c ? beatsOf(ctx, c, { item: name }) : [{ text: 'Thank you!', mood }];
  }
  if (birthday) { const thanks = infoOf(id)?.bdayThanks; if (thanks) beats.push({ text: thanks, mood: '🎂' }); }
  mem().gift[id] = { item: itemId, taste, day: getClock().dayKey };
  // your own gift should not come back as "I hear you have been giving gifts"
  const since = mem().since[id];
  if (since) { const k = drink ? 'served' : 'gifted'; since[k] = (since[k] ?? 0) + 1; }
  return beats;
}

/** One gift and one drink a day: the gentle "not today" reply. */
export function refusedBeats(def: VillagerDef, drink: boolean): Beat[] {
  const ctx = makeCtx(def), v = ctx.voice, id = def.id;
  const c = choose(id, cands(ctx, `${id}.gift.${drink ? 'drinkAgain' : 'again'}`, drink ? v.gift.drinkAgain : v.gift.again, 1, '☺️'));
  return c ? beatsOf(ctx, c) : [{ text: 'You are so sweet! One a day is plenty.' }];
}

/** A drink served during a café shift (one line, no memory of gifts). */
export function serveLine(def: VillagerDef, liked: boolean): string {
  const ctx = makeCtx(def), v = ctx.voice, id = def.id;
  const list = cands(ctx, `${id}.gift.${liked ? 'love' : 'like'}`, liked ? v.gift.love : v.gift.like).filter((c) => { const o = obj(c.line); return !o.item && o.kind !== 'gift'; });
  const c = choose(id, list);
  return c ? beatsOf(ctx, c, { item: 'drink' }).map((b) => b.text).join(' ') : 'Thank you!';
}

/** Is this the first time you have ever talked? (Checked before the day's chat points land.) */
export const isFirstMeeting = (def: VillagerDef) => points(def.id) === 0 && !mem().since[def.id];
