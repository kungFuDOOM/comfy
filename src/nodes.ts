// Gathering: fixed berry bushes, flower patches, shell beds, coffee shrubs and fishing spots.
// Harvest, deplete, and come back after a cozy wait. Depletion timestamps persist across reloads.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { ITEMS, NODES, NODE_KINDS, type NodeDef, type NodeTier } from './data';
import { addItem, count } from './inventory';
import { player } from './player';
import { bump } from './quests';
import { skillLevel, skillName, grantXp } from './skills';
import { state } from './state';
import { TS } from './world';

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
const CAST_SECONDS = 1.6;

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
  if (n.kind === 'fish') {
    casting.id = n.id; casting.left = casting.total = CAST_SECONDS;
    toast('You cast your line… ~');
    sfx.tick();
    return;
  }
  harvest(n);
}

function harvest(n: NodeDef) {
  const t = tierOf(n);
  const qty = n.kind === 'fish' ? 1 : 1 + (Math.random() < 0.25 ? 1 : 0);
  state.nodes[n.id] = Date.now() + t.respawn * 1000;
  addItem(t.item, qty);
  grantXp(t.skill, t.xp);
  const what = ITEMS[t.item].name;
  if (n.kind === 'fish') toast(`You caught a ${what}! ✿`);
  else toast(`Gathered ${qty > 1 ? qty + ' ' : ''}${what}${qty > 1 ? ' (a lucky bonus!)' : ''} +${t.xp} ${skillName(t.skill)} XP`);
  sfx.harvest();
  bump(n.kind === 'fish' ? 'fished' : 'foraged');
  changed();
}

export function updateNodes(dt: number) {
  if (!casting.id) return;
  const n = NODES.find((v) => v.id === casting.id)!;
  const c = nodeCenter(n);
  if (Math.hypot(c.x - player.x, c.y - (player.y - 8)) > 90) {
    casting.id = '';
    toast('You wandered off, so the line came back in.');
    return;
  }
  casting.left -= dt;
  if (casting.left <= 0) { casting.id = ''; harvest(n); }
}
