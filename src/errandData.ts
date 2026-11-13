// Bulletin board errands: types, templates and save sanitising. Pure data (no DOM / game imports) so state.ts and save.ts can use it.
// Progress for "do X" errands is read from the lifetime stats (stats[stat] minus the value when the errand was posted),
// so no gameplay system needs to know errands exist. Deliver errands just check the bag.

export type ErrandScope = 'daily' | 'weekly';

export interface Errand {
  id: string;
  scope: ErrandScope;
  giver: string;
  /** Skill id that earns the XP. */
  skill: string;
  /** Stat to count (do-errands), or an item to hand over (deliver errands). Exactly one is set. */
  stat?: string;
  item?: string;
  n: number;
  /** stats[stat] when the errand was posted. */
  base: number;
  text: string;
  pips: number;
  hearts: number; // friendship points
  xp: number;
  /** Optional extra gift (weekly). */
  gift?: string;
  /** Reward taken. */
  done: boolean;
  /** "Ready!" toast already shown. */
  notified: boolean;
}

export interface ErrandsSave {
  /** Day key / week key the current lists were posted for. */
  day: string;
  week: string;
  list: Errand[];
  /** Day key whose "all three done" bonus was paid. */
  swept: string;
  /** Day key the "new errands" greeting last showed. */
  greeted: string;
}
export const defaultErrands = (): ErrandsSave => ({ day: '', week: '', list: [], swept: '', greeted: '' });

export interface DoKind { stat: string; skill: string; verb: (n: number) => string; daily: [number, number]; weekly: [number, number]; need?: 'rod' | 'pet' }
export const DO_KINDS: DoKind[] = [
  { stat: 'fished', skill: 'fishing', verb: (n) => `Catch ${n} fish at a shimmering fishing spot`, daily: [2, 3], weekly: [6, 8], need: 'rod' },
  { stat: 'foraged', skill: 'foraging', verb: (n) => `Gather from ${n} glimmering spots around the island`, daily: [4, 6], weekly: [14, 18] },
  { stat: 'collected', skill: 'foraging', verb: (n) => `Pick up ${n} shells, blossoms or other finds from the ground`, daily: [3, 4], weekly: [10, 12] },
  { stat: 'served', skill: 'brewing', verb: (n) => `Serve ${n} cafe ${n === 1 ? 'drink' : 'drinks'} to villagers`, daily: [1, 2], weekly: [5, 6] },
  { stat: 'brewed', skill: 'brewing', verb: (n) => `Brew ${n} ${n === 1 ? 'drink' : 'drinks'} at the cafe counter`, daily: [2, 3], weekly: [8, 10] },
  { stat: 'baked', skill: 'baking', verb: (n) => `Bake ${n} ${n === 1 ? 'treat' : 'treats'} at the cafe oven`, daily: [1, 2], weekly: [4, 6] },
  { stat: 'harvested', skill: 'gardening', verb: (n) => `Harvest ${n} ${n === 1 ? 'crop' : 'crops'} from your garden`, daily: [2, 4], weekly: [8, 12] },
  { stat: 'crafted', skill: 'crafting', verb: (n) => `Craft ${n} ${n === 1 ? 'thing' : 'things'} at the Crafting Table`, daily: [1, 2], weekly: [3, 4] },
  { stat: 'gifted', skill: 'foraging', verb: (n) => `Give ${n} ${n === 1 ? 'gift' : 'gifts'} to friends`, daily: [1, 2], weekly: [4, 5] },
  { stat: 'petcare', skill: 'petcare', verb: (n) => `Pat, play with or feed your pet ${n} times`, daily: [3, 5], weekly: [14, 18], need: 'pet' },
];

export interface DeliverKind { item: string; skill: string; daily: [number, number]; weekly: [number, number] }
export const DELIVER_KINDS: DeliverKind[] = [
  { item: 'puffberry', skill: 'gardening', daily: [2, 4], weekly: [8, 10] },
  { item: 'blossom', skill: 'foraging', daily: [2, 4], weekly: [8, 10] },
  { item: 'shell', skill: 'foraging', daily: [2, 3], weekly: [6, 8] },
  { item: 'berry_tart', skill: 'baking', daily: [1, 1], weekly: [3, 3] },
  { item: 'pink_latte', skill: 'brewing', daily: [1, 2], weekly: [3, 4] },
  { item: 'honey_cap', skill: 'brewing', daily: [1, 2], weekly: [3, 4] },
  { item: 'bow_pin', skill: 'crafting', daily: [1, 1], weekly: [2, 3] },
  { item: 'minnow', skill: 'fishing', daily: [1, 2], weekly: [4, 5] },
];

export const WEEKLY_GIFTS = ['cottonbloom', 'glowberry', 'button'];

/** Turn whatever was in a save into a valid ErrandsSave. Never throws. */
export function sanitizeErrands(raw: unknown, valid: { item: (id: string) => boolean; skill: (id: string) => boolean; giver: (id: string) => boolean }): ErrandsSave {
  const validItem = valid.item;
  const base = defaultErrands();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown, max = 100000) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  const list: Errand[] = [];
  if (Array.isArray(r.list)) {
    for (const e of r.list as Record<string, unknown>[]) {
      if (!e || typeof e !== 'object') continue;
      const scope = e.scope === 'weekly' ? 'weekly' : e.scope === 'daily' ? 'daily' : null;
      const id = str(e.id), giver = str(e.giver);
      const stat = str(e.stat) || undefined, item = str(e.item) || undefined;
      if (!scope || !id || !giver || !valid.giver(giver) || (!stat && !item) || (item && !validItem(item)) || !num(e.n)) continue;
      const gift = str(e.gift);
      list.push({
        id, scope, giver, skill: valid.skill(str(e.skill)) ? str(e.skill) : 'foraging', stat: item ? undefined : stat, item, n: Math.max(1, num(e.n, 999)), base: num(e.base, 1e9),
        text: str(e.text).slice(0, 160), pips: num(e.pips, 5000), hearts: num(e.hearts, 200), xp: num(e.xp, 5000),
        gift: gift && validItem(gift) ? gift : undefined, done: !!e.done, notified: !!e.notified,
      });
    }
  }
  return { day: str(r.day), week: str(r.week), list: list.slice(0, 12), swept: str(r.swept), greeted: str(r.greeted) };
}
