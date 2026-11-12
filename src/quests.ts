import { sfx } from './audio';
import { QUESTS, ITEMS, type QuestDef } from './data';
import { changed, toast } from './bus';
import { addItem, earn } from './inventory';
import { state } from './state';

export function bump(stat: string, n = 1) {
  state.stats[stat] = (state.stats[stat] ?? 0) + n;
  for (const q of QUESTS) {
    if (!state.quests[q.id] && (state.stats[q.stat] ?? 0) >= q.goal) complete(q);
  }
  changed();
}

function complete(q: QuestDef) {
  state.quests[q.id] = true;
  earn(q.reward);
  let extra = '';
  if (q.rewardItem) {
    addItem(q.rewardItem);
    extra = ` + ${ITEMS[q.rewardItem].name}`;
  }
  sfx.quest();
  toast(`Quest complete: ${q.title}! +${q.reward} pips${extra}`);
}

export const progress = (q: QuestDef) => Math.min(q.goal, state.stats[q.stat] ?? 0);
