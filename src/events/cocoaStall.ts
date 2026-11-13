// The Twinkle cocoa market stall (week 3 on): three cups to buy with pips. Buying counts for the stall's goal, and a
// cup is a drink, so it can be served to a friend like any café drink.
import { startAct } from '../actions';
import { itemIcon } from '../art/icons';
import { toast } from '../bus';
import { CURRENCY, ITEMS } from '../data';
import { bumpEvent, chapterOpen } from '../events';
import { addItem, count, spend } from '../inventory';
import { state } from '../state';
import { btn, h, openPanel } from '../ui/dom';

export const COCOAS = ['cocoa_pink', 'cocoa_mint', 'cocoa_star'];

export function openCocoaStall() {
  if (!chapterOpen('twinkle', 'wk3')) { toast('The cocoa stall opens in week 3 of Twinkle Season.'); return; }
  openPanel('Cocoa Market ☕', (body, api) => {
    body.append(h('div', 'muted', 'Steaming cups from the stall in the square. Sip one, or hand one to a friend: a warm cup makes a lovely moment.'));
    for (const id of COCOAS) {
      const cost = ITEMS[id].buy ?? 0;
      body.append(h('div', 'card row-card', itemIcon(id, 40),
        h('div', 'grow', h('b', '', ITEMS[id].name), h('div', 'muted', ITEMS[id].desc)),
        h('span', 'own', `own ${count(id)}`),
        btn(`${cost} ${CURRENCY}`, () => {
          if (!spend(cost)) { toast('Not enough pips yet.'); return; }
          addItem(id);
          bumpEvent('twinkle', 'cocoa', 1);
          startAct('sip', 1.5);
          toast(`${ITEMS[id].name}, steaming hot ☕`);
          api.rerender();
        }, '', state.coins < cost)));
    }
  });
}
