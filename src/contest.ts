// Styling contests: a villager hosts a themed little contest, she shows up in an outfit from her wardrobe, and three
// judges (the host plus two neighbours) score it against the theme's tags (clothes/tags.ts). Everybody gets a ribbon;
// a better match earns a better one, more pips and more Style XP. There is nothing to lose: a contest costs nothing,
// each host runs one a day, and a ribbon you already have is never taken away. The window is in ui/contestUi.ts.
import { changed, toast } from './bus';
import { clothById, type ClothDef, type Slot } from './clothes';
import { tagIcon, tagLabel, tagsOf } from './clothes/tags';
import { VILLAGERS, type VillagerDef } from './data';
import { addPoints } from './friends';
import { earn } from './inventory';
import { moment } from './lanterns';
import { hasMovedIn } from './npc';
import { player } from './player';
import { bump } from './quests';
import { grantXp } from './skills';
import { state } from './state';
import { getClock } from './time';

export interface Theme {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  /** Tag -> how much it matters (3 = the heart of the theme). */
  want: Record<string, number>;
  /** Tags that clash with the theme (a small deduction, never a failure). */
  avoid?: string[];
  /** A tag that is a lovely accent in small doses: one or two pieces earn a bonus, more than that is just a lot of spots. */
  accent?: string;
  /** Villager ids that host it. */
  hosts: string[];
}

export const THEMES: Theme[] = [
  { id: 'goth_picnic', name: 'Goth Picnic', icon: '🦇', blurb: 'A moonlit picnic with black lace, bats and a very serious jam sandwich.', want: { goth: 3, spooky: 2, picnic: 2, dark: 1, pastel: 1 }, avoid: ['sunny'], hosts: ['nimbus', 'oolie'] },
  { id: 'rodeo_date', name: 'Rodeo Date', icon: '🤠', blurb: 'Boots, fringe and a hay bale built for two. Yeehaw, but gently.', want: { western: 3, rodeo: 3, boots: 2, earthy: 1, sweet: 1 }, accent: 'spotted', hosts: ['zuzu', 'bramble'] },
  { id: 'cozy_cafe', name: 'Cozy Café Morning', icon: '☕', blurb: 'Soft knits, warm drinks and a corner table by the window.', want: { cozy: 3, cafe: 3, soft: 2, sweet: 1, neat: 1 }, hosts: ['mimsy', 'brioche'] },
  { id: 'beach_day', name: 'Beach Day', icon: '🏖️', blurb: 'Sun hats, sandy toes and an ice-cold fizzy something.', want: { beach: 3, summer: 2, sunny: 2, sailor: 1, active: 1 }, avoid: ['winter'], hosts: ['marlo'] },
  { id: 'fairy_tea', name: 'Fairy Garden Tea', icon: '🧚', blurb: 'Petals, wings and tiny cups set out on a mushroom.', want: { fairy: 3, floral: 2, magic: 2, cottage: 1, soft: 1 }, hosts: ['oolie', 'bramble'] },
  { id: 'snow_stroll', name: 'Snowfluff Stroll', icon: '❄️', blurb: 'Earmuffs, mittens and a long walk past the frosty pond.', want: { winter: 3, cozy: 2, soft: 1, sweet: 1 }, avoid: ['summer'], hosts: ['mimsy', 'tuppi'] },
  { id: 'glitter_runway', name: 'Glitter Runway', icon: '💃', blurb: 'Strut down the boutique runway like the mannequins are watching.', want: { glam: 3, party: 2, fancy: 2, retro: 1, cool: 1 }, accent: 'spotted', hosts: ['zuzu'] },
  { id: 'frosting_fete', name: 'Frosting Fête', icon: '🍰', blurb: 'Sprinkles, bows and a very pink cake table.', want: { sweet: 3, cute: 2, pastel: 2, frilly: 1, party: 1 }, hosts: ['tuppi', 'brioche'] },
];
export const themeById = (id: string) => THEMES.find((t) => t.id === id);

// ---- judges ----
/** What each villager likes to see on a contestant, on top of the theme (a small bonus, so every judge scores a little differently). */
const JUDGE_TASTE: Record<string, { tags: string[]; quip: string }> = {
  mimsy: { tags: ['cozy', 'soft', 'sweet'], quip: 'snuggly' },
  zuzu: { tags: ['glam', 'spotted', 'fancy'], quip: 'runway-ready' },
  bramble: { tags: ['earthy', 'floral', 'neat'], quip: 'tidy' },
  nimbus: { tags: ['magic', 'dark', 'soft'], quip: 'dreamy' },
  brioche: { tags: ['cafe', 'sweet', 'cozy'], quip: 'delicious' },
  oolie: { tags: ['floral', 'fairy', 'pastel'], quip: 'petal-soft' },
  tuppi: { tags: ['sweet', 'cute', 'pastel'], quip: 'frosting-worthy' },
  marlo: { tags: ['beach', 'sailor', 'sunny'], quip: 'seaworthy' },
};

export interface RibbonTier { name: string; icon: string; color: string; min: number }
/** Ribbons, lowest to highest. `min` is the outfit score (0 to 1) needed. */
export const RIBBONS: RibbonTier[] = [
  { name: 'Sprinkle Ribbon', icon: '🎀', color: '#ffe3ee', min: 0 },
  { name: 'Blush Ribbon', icon: '🌸', color: '#ffb3cf', min: 0.35 },
  { name: 'Berry Ribbon', icon: '🍓', color: '#ff7da6', min: 0.6 },
  { name: 'Golden Bow', icon: '🏅', color: '#ffd36e', min: 0.82 },
];
export const tierFor = (score: number) => RIBBONS.reduce((t, r, i) => (score >= r.min ? i : t), 0);

// ---- today's contests ----
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const dayKey = () => getClock().dayKey;

export const hostedToday = (hostId: string) => state.style.hosted[hostId] === dayKey();
/** The theme a villager is hosting today (a stable pick per day), or null if they do not host contests. */
export function themeFor(hostId: string): Theme | null {
  const mine = THEMES.filter((t) => t.hosts.includes(hostId));
  return mine.length ? mine[hash(`${hostId}:${dayKey()}`) % mine.length] : null;
}

/** Host plus up to two other friends who live on the island, picked the same way all day. */
export function judgesFor(host: VillagerDef): VillagerDef[] {
  const others = VILLAGERS.filter((v) => v.id !== host.id && hasMovedIn(v) && JUDGE_TASTE[v.id])
    .sort((a, b) => hash(`${a.id}:${host.id}:${dayKey()}`) - hash(`${b.id}:${host.id}:${dayKey()}`));
  return [host, ...others.slice(0, 2)];
}

// ---- scoring ----
export type Worn = Record<Slot, string | null>;
const CAP = 3; // most one piece can earn
const IDEAL = 4; // roughly four perfectly matching pieces is a perfect outfit

export interface PieceScore { cloth: ClothDef; pts: number; hits: string[] }
export interface Fit { score: number; pieces: PieceScore[]; accent: boolean; accentTooMuch: boolean; tags: Set<string>; missing: string[] }

/** The pieces on show (a dress counts for both top and bottom). */
export function piecesOf(w: Worn): ClothDef[] {
  const ids = [w.hat, w.dress, w.dress ? null : w.top, w.dress ? null : w.bottom, w.shoes, w.bag, w.face];
  return ids.map((id) => clothById(id)).filter((c): c is ClothDef => !!c);
}

/** How well an outfit fits a theme, 0 to 1, plus the breakdown the judges talk about. */
export function fitOutfit(theme: Theme, pieces: ClothDef[]): Fit {
  const tags = new Set<string>();
  const scored: PieceScore[] = pieces.map((cloth) => {
    const own = tagsOf(cloth);
    own.forEach((t) => tags.add(t));
    const hits = own.filter((t) => theme.want[t]);
    let pts = hits.reduce((s, t) => s + theme.want[t], 0);
    if (theme.avoid && own.some((t) => theme.avoid!.includes(t))) pts -= 1;
    return { cloth, pts: Math.max(0, Math.min(CAP, pts)), hits };
  });
  let total = scored.reduce((s, p) => s + p.pts * (p.cloth.slot === 'dress' ? 1.5 : 1), 0);
  const spots = theme.accent ? pieces.filter((c) => tagsOf(c).includes(theme.accent!)).length : 0;
  const accent = spots >= 1 && spots <= 2;
  if (accent) total += 1.5;
  const score = Math.min(1, total / (CAP * IDEAL));
  const missing = Object.keys(theme.want).filter((t) => !tags.has(t)).sort((a, b) => theme.want[b] - theme.want[a]);
  return { score, pieces: scored, accent, accentTooMuch: spots > 2, tags, missing };
}

export interface JudgeScore { judge: VillagerDef; stars: number; line: string; note: string }

const LINES: string[][] = [
  ['Aww, you showed up, and that is the best part!', 'A brave first look. Let us find the theme together next time!'],
  ['Sweet effort! I can see where you were going.', 'Getting warmer! A few more pieces and it will sing.'],
  ['Ooh, that is really coming together!', 'I like this a lot. Very much the right mood.'],
  ['Stunning! This is exactly the theme!', 'You understood the assignment, and then some!'],
  ['I need to sit down. It is that good.', 'Perfect! I would put you on the poster.'],
];

/** Judge reactions: 1 to 5 stars each, from the theme fit plus a small personal-taste bonus and a tiny mood wobble. */
export function judgeOutfit(theme: Theme, fit: Fit, judges: VillagerDef[]): JudgeScore[] {
  const best = [...fit.pieces].sort((a, b) => b.pts - a.pts)[0];
  return judges.map((judge, i) => {
    const taste = JUDGE_TASTE[judge.id];
    const liked = taste ? taste.tags.filter((t) => fit.tags.has(t)).length : 0;
    const hatBonus = judge.id === 'zuzu' && fit.pieces.some((p) => p.cloth.slot === 'hat') ? 0.4 : 0; // Dottie and her hats
    const mood = ((hash(`${judge.id}:${dayKey()}:${theme.id}`) % 31) - 15) / 100; // -0.15 .. +0.15
    const raw = fit.score * 4.2 + Math.min(1, liked * 0.4) + hatBonus + mood;
    const stars = Math.max(1, Math.min(5, Math.round(raw + 0.35)));
    const line = LINES[stars - 1][(judge.id.length + i) % 2];
    let note = '';
    if (best && best.hits.length && stars >= 3) note = `The ${best.cloth.name} is so ${tagLabel(best.hits[0]).toLowerCase()}!`;
    else if (liked && taste) note = `Very ${taste.quip}, I love it.`;
    else if (fit.missing.length) note = `Maybe something ${tagLabel(fit.missing[0]).toLowerCase()} ${tagIcon(fit.missing[0])}?`;
    if (i === 0 && fit.accent) note = 'A little spot goes a long way. Lovely accent! 🐆';
    else if (i === 0 && fit.accentTooMuch) note = 'So many spots! Try just one for an accent. 🐆';
    return { judge, stars, line, note };
  });
}

export interface ContestResult {
  theme: Theme;
  fit: Fit;
  scores: JudgeScore[];
  /** 0 to 1: the average of the judges' stars. */
  total: number;
  tier: number;
  /** A better ribbon than any she had for this theme. */
  improved: boolean;
  pips: number;
  xp: number;
  friend: number;
}

/** What a result is worth, in one place. */
function payout(tier: number, improved: boolean, first: boolean) {
  return {
    xp: 18 + tier * 14 + (improved ? 14 : 0),
    pips: 12 + tier * 18 + (tier === 3 && first ? 60 : 0),
    friend: 4 + tier * 3,
  };
}

/** Run the contest: score, pay out, record the ribbon and mark the host as done for today. Call once per entry. */
export function enterContest(host: VillagerDef, theme: Theme, worn: Worn): ContestResult | null {
  if (hostedToday(host.id)) return null;
  const pieces = piecesOf(worn);
  if (!pieces.length) return null;
  const fit = fitOutfit(theme, pieces);
  const scores = judgeOutfit(theme, fit, judgesFor(host));
  const total = scores.reduce((s, j) => s + j.stars, 0) / (scores.length * 5);
  const tier = tierFor(total);
  const prev = state.style.ribbons[theme.id];
  const improved = prev === undefined || tier > prev;
  const pay = payout(tier, improved, prev === undefined || prev < 3);
  state.style.hosted[host.id] = dayKey();
  state.style.entries++;
  if (improved) state.style.ribbons[theme.id] = tier;
  earn(pay.pips);
  addPoints(host.id, pay.friend);
  for (const j of scores.slice(1)) addPoints(j.judge.id, 2);
  grantXp('style', pay.xp);
  bump('styled');
  moment('outfit', player.x, player.y);
  toast(`${RIBBONS[tier].icon} ${RIBBONS[tier].name}! +${pay.pips} pips, +${pay.xp} Style XP`);
  changed(); // the wardrobe hands out any ribbon or Style-level prizes on change
  return { theme, fit, scores, total, tier, improved, ...pay };
}

/** Ribbons she has won, best tier per theme. */
export const ribbonOf = (themeId: string): number | undefined => state.style.ribbons[themeId];
