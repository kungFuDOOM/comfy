// Moonlit Costume Night: the autumn festival. Real dates Oct 24 to Oct 31, 2027, costume night Oct 31.
// Main activity: try on the two costumes at the rack in the square (you wear each one as you try it). Side: share a
// treat with three different friends. Soft pink and lavender, kawaii-spooky. Ends before the Harvest Hush Feast (Nov 20).
// Much smaller than Harvest Hush Feast and Twinkle Season: no chapters, no cutscene, three exclusives.
// Preview: ?event=costumenight (costume night) or ?event=costumenight&date=2027-10-26.
import { startAct } from '../actions';
import { itemIcon } from '../art/icons';
import { bus, toast } from '../bus';
import { clothById } from '../clothes';
import { VILLAGERS } from '../data';
import { bumpEvent, claimEventReward, eventFlag, isEventActive, isPeakDay, registerEvent, setEventFlag, type EventDef, type EventSpot } from '../events';
import { btn, h, openPanel } from '../ui/dom';
import { owns, wearItem } from '../wardrobe';
import { createCostumeWorld } from './costumeWorld';

export const COSTUMENIGHT = 'costumenight';

const COSTUMES = [
  { id: 'cn_ghost_hood', key: 'ghost', blurb: 'A floaty white hood with sleepy eyes. Very quiet, very soft.' },
  { id: 'cn_bat_cape', key: 'bat', blurb: 'A lilac cape with paper bat wings and a moon brooch.' },
];

function openRack() {
  if (!isEventActive(COSTUMENIGHT)) return;
  openPanel('Costume Rack 🌙', (body, api) => {
    body.append(h('div', 'muted', 'Two cozy costumes hang on the rack. Try one on and you will wear it for the night. They are yours to keep.'));
    for (const c of COSTUMES) {
      const cloth = clothById(c.id);
      const tried = eventFlag(COSTUMENIGHT, `tried_${c.key}`);
      body.append(h('div', 'card row-card', itemIcon(c.id, 40),
        h('div', 'grow', h('b', '', cloth?.name ?? c.id), h('div', 'muted', c.blurb)),
        btn(tried ? 'Wear again' : 'Try it on', () => {
          if (!tried) {
            setEventFlag(COSTUMENIGHT, `tried_${c.key}`);
            claimEventReward(COSTUMENIGHT, `costume_${c.key}`, { items: [c.id] });
            bumpEvent(COSTUMENIGHT, 'costumes', 1);
          }
          if (owns(c.id)) wearItem(c.id);
          startAct('ponder', 1.4);
          toast(isPeakDay(COSTUMENIGHT) ? 'Boo! Cute and cozy, on costume night 🌙' : 'A very cute costume ✨');
          api.rerender();
        })));
    }
  });
}

const rackSpot: EventSpot = {
  id: 'costumenight-rack',
  rect: [46, 45, 48, 46],
  reach: 44,
  approach: [{ x: 46, y: 46 }, { x: 47, y: 46 }, { x: 48, y: 45 }, { x: 48, y: 46 }],
  label: 'Costume Rack',
  prompt: 'Try on a costume',
  run: openRack,
};

export const costumeNightEvent: EventDef = {
  id: COSTUMENIGHT,
  name: 'Moonlit Costume Night',
  icon: '🌙',
  start: '2027-10-24',
  end: '2027-10-31',
  peakDay: '2027-10-31',
  blurb: 'Paper bats, sleepy pumpkin lanterns and a costume rack in the square: a soft, giggly, not-at-all-scary night for dressing up and sharing treats.',
  banner: 'Moonlit Costume Night is coming! Try a costume at the rack in the square.',
  peakBanner: 'It is Costume Night! Lanterns are lit all over the square.',
  peakTitle: 'Costume Night!',
  peakSub: 'Lanterns are lit in the square',
  items: ['cn_ghost_hood', 'cn_bat_cape', 'd_cn_lantern'],
  activities: [
    { id: 'costumes', icon: '👻', title: 'Try On the Costumes', desc: 'Two costumes hang on the rack in Sugarlily Square. Try both on (you wear each one) and keep them.', counter: 'costumes', goal: 2 },
    { id: 'treats', icon: '🍬', title: 'Share Treats', desc: 'Give a gift to three different friends to spread the treats around.', counter: 'treats', goal: 3 },
  ],
  milestones: [
    { id: 'c2', counter: 'costumes', goal: 2, title: 'Dressed Up: bonus pips', reward: { pips: 40 } },
    { id: 't3', counter: 'treats', goal: 3, title: 'Treat Sharer: Sleepy Moon Lantern', reward: { pips: 40, items: ['d_cn_lantern'] } },
  ],
  world: createCostumeWorld(),
  spots: () => [rackSpot],
};

registerEvent(costumeNightEvent);

// ---- treats shared with friends (one count per friend) ----
bus.on('gift', (g: { villager: string; item: string }) => {
  if (!isEventActive(COSTUMENIGHT) || !VILLAGERS.some((v) => v.id === g.villager)) return;
  if (eventFlag(COSTUMENIGHT, `treat_${g.villager}`)) return;
  setEventFlag(COSTUMENIGHT, `treat_${g.villager}`);
  bumpEvent(COSTUMENIGHT, 'treats', 1);
});
