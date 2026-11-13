// Unlocking the island: cute barriers, what they ask for, and what happens when they open.
// The data lives in areas.ts, the tiles in world.ts; this is the rules and the messages.
import { startAct } from './actions';
import { sfx } from './audio';
import { bus, changed, toast } from './bus';
import { ITEMS, VILLAGERS } from './data';
import { BARRIERS, areaById, type AreaId, type Barrier, type Requirement } from './areas';
import { count, spend } from './inventory';
import { syncNpcs } from './npc';
import { player } from './player';
import { questById, questStatus } from './questlog';
import { saveGame } from './save';
import { skillLevel, skillName } from './skills';
import { isAreaOpen, state } from './state';
import { TS, barrierOpen, setBarrierOpen } from './world';

export { isAreaOpen };

export const barrierForArea = (id: AreaId) => BARRIERS.find((b) => b.area === id);
const quest = (id: string) => questById(id);

export function requirementMet(r: Requirement): boolean {
  switch (r.kind) {
    case 'skill': return skillLevel(r.skill) >= r.level;
    case 'quest': return state.questLog[r.quest] === 'done';
    case 'pips': return state.coins >= r.cost;
  }
}

/** Short, exact wording of what a barrier needs (journal list and interact prompt). */
export function requirementText(r: Requirement): string {
  switch (r.kind) {
    case 'skill': return `${skillName(r.skill)} level ${r.level}`;
    case 'quest': return `the “${r.title}” quest`;
    case 'pips': return `${r.cost} pips`;
  }
}

/** Why it is still shut, in a friendly voice. Empty when the requirement is met. */
function lockedMessage(b: Barrier, r: Requirement): string {
  const lines: Record<string, string> = {
    logs: 'A tumble of fallen blossom logs blocks the path. They look too heavy to shift yet',
    bridge: 'The little bridge is missing its planks',
    fog: 'A soft fog veil hangs over the path. It only parts for someone who knows their way around warm steam',
    gate: 'A pink gate with a heart-shaped lock',
  };
  const intro = lines[b.kind];
  switch (r.kind) {
    case 'skill': return `${intro} — you need ${skillName(r.skill)} level ${r.level} (you are level ${skillLevel(r.skill)}).`;
    case 'pips': return `${intro}. A tiny sign says: “Open for ${r.cost} pips.” You have ${state.coins}.`;
    case 'quest': {
      const q = quest(r.quest), st = questStatus(q);
      const item = ITEMS[q.want.item].name;
      if (st === 'available') return `${intro}. Mimsy might know how to help — go and say hello!`;
      if (st === 'active' || st === 'ready') return `${intro}. Bring Mimsy ${q.want.n} ${item}${q.want.n > 1 ? 's' : ''} (you have ${Math.min(count(q.want.item), q.want.n)}), then come back.`;
      return `${intro}.`;
    }
  }
}

/** The line shown on the interact prompt while standing at a barrier. */
export function barrierHint(b: Barrier): string {
  const a = areaById(b.area), r = a.req!;
  if (r.kind === 'pips') return `${b.name} — ${state.coins >= r.cost ? `pay ${r.cost} pips to open` : `needs ${r.cost} pips`}`;
  if (requirementMet(r)) return `${b.name} — open it!`;
  return `${b.name} — needs ${requirementText(r)}`;
}

/** The nearest standing barrier the player can reach, with its distance in pixels. */
export function barrierNear(): { b: Barrier; d: number } | null {
  let best: { b: Barrier; d: number } | null = null;
  for (const b of BARRIERS) {
    if (barrierOpen(b.id)) continue;
    for (const t of b.tiles) {
      const d = Math.hypot((t.x + 0.5) * TS - player.x, (t.y + 0.5) * TS - (player.y - 8));
      if (d < 58 && (!best || d < best.d)) best = { b, d };
    }
  }
  return best;
}

/** Interact with a barrier: open it if the requirement is met (paying pips if that is the price), else explain. */
export function useBarrier(b: Barrier) {
  if (barrierOpen(b.id)) return;
  const r = areaById(b.area).req!;
  if (!requirementMet(r)) { sfx.tick(); startAct('ponder', 1.2); toast(lockedMessage(b, r)); return; }
  if (r.kind === 'pips' && !spend(r.cost)) { toast(lockedMessage(b, r)); return; }
  unlockArea(b.area);
}

/** Open an area for good: barrier gone, save written, friends moved in. */
export function unlockArea(id: AreaId) {
  const b = barrierForArea(id);
  if (!b || state.unlocked[id]) return;
  // who already lives here, taken before the area counts as open (so this area's friends register as new arrivals)
  const before = new Set(VILLAGERS.filter((v) => !v.area || isAreaOpen(v.area)).map((v) => v.id));
  state.unlocked[id] = true;
  setBarrierOpen(b.id, true);
  const a = areaById(id);
  toast(`${a.name} is open! ✿`);
  onAreaUnlocked(id);
  syncNpcs();
  for (const v of VILLAGERS) if (v.area === id && !before.has(v.id)) onFriendArrived(v.id);
  saveGame();
  changed();
}

/** Make the world match the save: open exactly the barriers whose areas are unlocked. Call after load / new game. */
export function syncUnlocks() {
  for (const b of BARRIERS) setBarrierOpen(b.id, isAreaOpen(b.area));
}

// ---- Celebration hooks ----
// Only unlockArea() calls these (never syncUnlocks), so restoring a save stays quiet.
// The 3D side listens on the bus: barriers.ts poofs the barrier, world3d.ts throws the move-in party.
/** Called once, right after an area opens (its barrier is already gone). */
export function onAreaUnlocked(id: AreaId) {
  sfx.unlock();
  bus.emit('areaUnlocked', id);
}
/** Called once when a friend moves into a freshly opened area (after syncNpcs, so they are already at home). */
export function onFriendArrived(id: string) {
  const v = VILLAGERS.find((x) => x.id === id);
  if (!v) return;
  toast(`${v.name.split(' ')[0]} has moved in! Go say hello ♥`);
  sfx.welcome(1.25); // lands just after the unlock jingle settles
  bus.emit('friendArrived', id);
}
