// Quest log: short authored quests with real beats (offered -> active -> ready to turn in -> done).
// The older auto-completing stat goals live in quests.ts and stay as they are.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { ITEMS } from './data';
import { addItem, count, earn, removeItem } from './inventory';
import { requestDone } from './friends';
import { isAreaOpen, state } from './state';
import { VILLAGERS } from './data';

export type LogStatus = 'available' | 'active' | 'ready' | 'done';

export interface LogQuest {
  id: string;
  title: string;
  giver: string;
  /** Shown while the quest is active. */
  steps: string;
  want: { item: string; n: number };
  reward: number;
  rewardItem?: string;
  /** What the giver says when offering it, and when the player brings the goods. */
  offer: string;
  thanks: string;
}

export const LOG_QUESTS: LogQuest[] = [
  {
    id: 'lq_errand', title: "Mimsy's Soft Errand", giver: 'mimsy',
    steps: 'Pick 3 Puffberries from the berry bushes in Ribbon Meadow, the grassy patch just west of the café, and bring them back to Mimsy.',
    want: { item: 'puffberry', n: 3 },
    reward: 60, rewardItem: 'rod',
    offer: "Oh, you're up! Could you pick three puffberries from the bushes in Ribbon Meadow, just west of the café? Just wander over, press the interact button, and gather. I'd go myself, but the sunny seat will get cold.",
    thanks: 'Puffberries! You are a treasure. Take this little Dew-line Rod too — the shy fish by the shore love a patient friend.',
  },
  {
    id: 'lq_bridge', title: 'Mend the Bridge', giver: 'mimsy',
    steps: 'Gather Sugarwood Twigs from the stumps in Ribbon Meadow, craft 3 Sugarwood Planks (2 twigs each) at the Crafting Table, and bring them to Mimsy.',
    want: { item: 'plank', n: 3 },
    reward: 80,
    offer: "There's a sweet little bridge north of the square that lost its planks in the Long Frost. If we mend it, the whole pond side of the island wakes up! Could you gather some sugarwood twigs from the stumps by the meadow, and craft three planks at the Crafting Table by the boutique? I'll hold the ladder. Sleepily.",
    thanks: 'Three perfect planks! Now go and give the bridge a good pat — I think it will mend itself out of pure joy.',
  },
  {
    id: 'lq_brioche', title: "Brioche's Warm Fix", giver: 'brioche',
    steps: 'Bake a Puffberry Tart at the café oven (2 puffberries, milk and honey) and bring it to Brioche.',
    want: { item: 'berry_tart', n: 1 },
    reward: 90,
    offer: 'You look like you could use a pastry. A puffberry tart, specifically. Actually — could YOU bake one and bring it to me? It is the only cure for my picnic blanket having no tart on it.',
    thanks: 'A warm tart, still glowing! This fixes everything. Everything! Here, a little something for your pocket.',
  },
  {
    id: 'lq_oolie', title: "Oolie's Pressed Petals", giver: 'oolie',
    steps: 'Gather 3 Ribbon Blossoms from the flower patches and bring them to Oolie for pressing.',
    want: { item: 'blossom', n: 3 },
    reward: 70,
    offer: '...Um. I need three ribbon blossoms for my press. They are very, very easy to pick. Just... gently. If it is not too much trouble.',
    thanks: 'Oh... they are perfect. I will press them tonight. ...You can have one. When it is dry. Thank you.',
  },
  {
    id: 'lq_tuppi', title: "Tuppi's Frosting Berries", giver: 'tuppi',
    steps: 'Pick 3 Puffberries and bring them to Tuppi for the pond-side frosting.',
    want: { item: 'puffberry', n: 3 },
    reward: 70,
    offer: 'Hee! I am out of berries for my frosting! Could you pick me three puffberries? The frosting is wiggling impatiently. Wiggle, wiggle!',
    thanks: 'Puffberries! Hee hee! The frosting is going to be SO pink. Here, for your trouble!',
  },
  {
    id: 'lq_marlo', title: "Marlo's Sea-glass Shelf", giver: 'marlo',
    steps: 'Dig up 3 Dewdrop Shells on the beach and bring them to Marlo for the lighthouse shelf.',
    want: { item: 'shell', n: 3 },
    reward: 100, rewardItem: 'bow_pin',
    offer: 'Ahoy! My shelf is missing three dewdrop shells. They live on the sand, near the waterline. Bring me three and I will hum you a sea shanty. A short one.',
    thanks: 'Three beauties! They will sit right beside the sea glass. Here — a ribbon clip, for a fellow friend of the light.',
  },
];

export const questById = (id: string) => LOG_QUESTS.find((q) => q.id === id)!;

export function questStatus(q: LogQuest): LogStatus {
  const s = state.questLog[q.id];
  if (s === 'done') return 'done';
  if (!s) return 'available';
  return count(q.want.item) >= q.want.n ? 'ready' : 'active';
}

export function startQuest(q: LogQuest) {
  if (state.questLog[q.id]) return;
  state.questLog[q.id] = 'active';
  sfx.confirm();
  toast(`New quest: ${q.title}`);
  changed();
}

export function turnIn(q: LogQuest): boolean {
  if (questStatus(q) !== 'ready' || !removeItem(q.want.item, q.want.n)) return false;
  state.questLog[q.id] = 'done';
  earn(q.reward);
  let extra = '';
  if (q.rewardItem) { addItem(q.rewardItem); extra = ` + ${ITEMS[q.rewardItem].name}`; }
  sfx.quest();
  toast(`Quest complete: ${q.title}! +${q.reward} pips${extra} ♥`);
  requestDone(q.giver); // finishing a friend's request warms them up
  changed();
  return true;
}

const giverName = (q: LogQuest) => VILLAGERS.find((v) => v.id === q.giver)?.name.split(' ')[0] ?? 'your friend';
export const statusText = (q: LogQuest, st: LogStatus): string => ({
  available: `Talk to ${giverName(q)} to begin`,
  active: 'In progress',
  ready: `Ready to turn in — bring it to ${giverName(q)}!`,
  done: 'Complete',
})[st];
/** A quest is listed once its giver lives on the island. */
export const questVisible = (q: LogQuest) => { const g = VILLAGERS.find((v) => v.id === q.giver); return !g?.area || isAreaOpen(g.area); };

export const questsFrom = (giver: string) => LOG_QUESTS.filter((q) => q.giver === giver);
