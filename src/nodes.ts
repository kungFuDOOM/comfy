// Gathering: fixed berry bushes, flower patches, shell beds, coffee shrubs and fishing spots.
// Harvest, deplete, and come back after a cozy wait. Depletion timestamps persist across reloads.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { FISH_POOL, ITEMS, NODES, NODE_BONUS, NODE_KINDS, type NodeDef, type NodeTier } from './data';
import { addItem, count } from './inventory';
import { faceToward, player } from './player';
import { cancelAct, startAct, type ActKind } from './actions';
import { bump } from './quests';
import { skillLevel, skillName, grantXp } from './skills';
import { state } from './state';
import { noteGathered } from './regions';
import { getClock } from './time';
import { TS, areaAt } from './world';
import { isRaining } from './weather';

export const tierOf = (n: NodeDef): NodeTier => NODE_KINDS[n.kind][n.tier];
export const isReady = (n: NodeDef, now = Date.now()) => (state.nodes[n.id] ?? 0) <= now;
export const nodeCenter = (n: NodeDef) => ({ x: (n.x + 0.5) * TS, y: (n.y + 0.5) * TS });

export function nodeAtTile(tx: number, ty: number): NodeDef | null {
  return NODES.find((n) => n.x === tx && n.y === ty) ?? null;
}

/** The node the player is close enough to use. */
export function nodeNear(): NodeDef | null {
  let best: NodeDef | null = null, bd = 54;
  for (const n of NODES) {
    const c = nodeCenter(n), d = Math.hypot(c.x - player.x, c.y - (player.y - 8));
    if (d < bd) { best = n; bd = d; }
  }
  return best;
}

export function nodeHint(n: NodeDef): string {
  const t = tierOf(n);
  if (!isReady(n)) return `${t.name} — resting`;
  if (skillLevel(t.skill) < t.level) return `${t.name} — needs ${skillName(t.skill)} ${t.level}`;
  if (t.rod && !count('rod')) return `${t.name} — needs a Dew-line Rod`;
  return `${t.name} — ${t.verb}`;
}

export const casting = { id: '', left: 0, total: 0 };
const RAIN_FISH_CHANCE = 0.3;
const CAST_SECONDS = 3.2; // cast, a little wait, the bite, then reel in (the animation follows these beats)

/** Gathering animation per node kind. Gathering itself is instant; the act just plays it out. */
const GATHER_ACT: Record<string, [ActKind, number]> = { berry: ['pick', 1.1], flower: ['pick', 1.1], coffee: ['pick', 1.1], shell: ['mine', 1.35], wood: ['chop', 1.55] };

/** Bring the line in early (the player walked off). */
export function cancelCast(msg: string) {
  if (!casting.id) return;
  casting.id = '';
  toast(msg);
}

function lockedMessage(n: NodeDef): string | null {
  const t = tierOf(n);
  if (!isReady(n)) {
    return n.kind === 'fish' ? 'The fish are resting here. Try again in a little while.' : `The ${t.name.toLowerCase()} is resting. Give it a little while to bloom back.`;
  }
  if (skillLevel(t.skill) < t.level) {
    return n.kind === 'fish'
      ? `This spot looks a little too shy until your ${skillName(t.skill)} is level ${t.level}.`
      : `This patch looks a little too shy until your ${skillName(t.skill)} is level ${t.level}.`;
  }
  if (t.rod && !count('rod')) return 'The fish out here need a proper Dew-line Rod. Mimsy might know where to find one.';
  return null;
}

/** Use a node: gather straight away, or start casting a line at a fishing spot. */
export function useNode(n: NodeDef) {
  if (casting.id) { toast('Your line is already in the water…'); return; }
  const msg = lockedMessage(n);
  if (msg) { toast(msg); return; }
  const c = nodeCenter(n);
  faceToward(c.x, c.y);
  if (n.kind === 'fish') {
    cancelAct(); // a fresh cast replaces any catch pose still playing
    casting.id = n.id; casting.left = casting.total = CAST_SECONDS;
    toast('You cast your line… ~');
    sfx.tick();
    return;
  }
  const [kind, dur] = GATHER_ACT[n.kind] ?? ['pick', 1.1];
  startAct(kind, dur, { tx: c.x, ty: c.y, item: tierOf(n).item });
  harvest(n);
}

/** A fishing spot's catch: usually the tier's regular fish, sometimes one of its shy neighbours. */
function pickFish(tier: number, fallback: string): string {
  const pool = FISH_POOL[tier];
  if (!pool) return fallback;
  let r = Math.random() * pool.reduce((a, b) => a + b[1], 0);
  for (const [id, w] of pool) if ((r -= w) <= 0) return id;
  return pool[0][0];
}

/** Gathering sometimes turns up a little extra (a bug, a shell, a gem...). At most one per gather. */
function rollBonus(n: NodeDef) {
  const night = getClock().phase === 'evening' || getClock().phase === 'night';
  for (const b of NODE_BONUS[`${n.kind}:${n.tier}`] ?? []) {
    if (b.when === 'night' && !night) continue;
    if (b.when === 'day' && night) continue;
    if (Math.random() < b.chance) return b;
  }
  return null;
}

function harvest(n: NodeDef) {
  const t = tierOf(n);
  const qty = n.kind === 'fish' ? 1 : 1 + (Math.random() < 0.25 ? 1 : 0);
  const rainCatch = n.kind === 'fish' && isRaining() && Math.random() < RAIN_FISH_CHANCE;
  // in the rain the fish rise: sometimes a rare rainy-day fish takes the bait instead
  const item = rainCatch ? (n.tier >= 1 ? 'cloudcarp' : 'drizzle') : n.kind === 'fish' ? pickFish(n.tier, t.item) : t.item;
  state.nodes[n.id] = Date.now() + t.respawn * 1000;
  addItem(item, qty);
  grantXp(t.skill, rainCatch ? Math.round(t.xp * 1.5) : t.xp);
  noteGathered(areaAt(n.x, n.y), n.kind);
  const what = ITEMS[item].name;
  if (rainCatch) state.found[item] = (state.found[item] ?? 0) + 1;
  if (n.kind === 'fish') { toast(rainCatch ? `A rainy-day catch! You got a ${what} ☔✿` : `You caught a ${what}! ✿`); startAct('catch', 1.7, { item }); }
  else toast(`Gathered ${qty > 1 ? qty + ' ' : ''}${what}${qty > 1 ? ' (a lucky bonus!)' : ''} +${t.xp} ${skillName(t.skill)} XP`);
  const bonus = rollBonus(n);
  if (bonus) { addItem(bonus.item); toast(`${bonus.msg}! ✿`); }
  sfx.harvest();
  bump(n.kind === 'fish' ? 'fished' : 'foraged');
  changed();
}

export function updateNodes(dt: number) {
  if (!casting.id) return;
  const n = NODES.find((v) => v.id === casting.id)!;
  const c = nodeCenter(n);
  if (Math.hypot(c.x - player.x, c.y - (player.y - 8)) > 90) {
    cancelCast('You wandered off, so the line came back in.');
    return;
  }
  casting.left -= dt;
  if (casting.left <= 0) { casting.id = ''; harvest(n); }
}
