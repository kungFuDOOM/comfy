// Quest log: short authored quests with real beats (offered -> active -> ready to turn in -> done).
// The older auto-completing stat goals live in quests.ts and stay as they are.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { ITEMS } from './data';
import { addItem, count, earn, removeItem } from './inventory';
import { state } from './state';

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
    steps: 'Pick 3 Puffberries from the berry bushes in Ribbon Meadow and bring them back to Mimsy.',
    want: { item: 'puffberry', n: 3 },
    reward: 60, rewardItem: 'rod',
    offer: "Oh, you're up! Could you pick three puffberries from the bushes in Ribbon Meadow? Just wander up, press the interact button, and gather. I'd go myself, but the sunny seat will get cold.",
    thanks: 'Puffberries! You are a treasure. Take this little Dew-line Rod too — the shy fish by the shore love a patient friend.',
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
  changed();
  return true;
}

export const STATUS_TEXT: Record<LogStatus, string> = {
  available: 'Talk to Mimsy to begin',
  active: 'In progress',
  ready: 'Ready to turn in — bring it to Mimsy!',
  done: 'Complete',
};

export const questsFrom = (giver: string) => LOG_QUESTS.filter((q) => q.giver === giver);
