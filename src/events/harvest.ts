// Harvest Hush Feast: the first seasonal event. Real dates Nov 20 to Nov 30, 2026, feast day Nov 26.
// Gather pumpkins and apples, bake pies at the café oven, hand pies to friends, and join the feast on the 26th.
import { bus, toast } from '../bus';
import { ITEMS } from '../data';
import { bumpEvent, eventFlag, isEventActive, isPeakDay, registerEvent, setEventFlag, type EventDef, type EventSpot } from '../events';
import { player, tileOf } from '../player';
import { TS, setDynamicBlock } from '../world';
import { refreshFeast } from './feastSeats';
import { startFeast } from './feast';
import { TABLE_TILES } from './harvestLayout';
import { createHarvestWorld } from './harvestWorld';

export const HARVEST = 'harvest';

const table: EventSpot = {
  id: 'harvest-table',
  rect: [50.95, 40, 52.05, 44],
  reach: 52,
  approach: [{ x: 51, y: 44 }, { x: 50, y: 44 }, { x: 52, y: 44 }, { x: 51, y: 45 }],
  label: 'Harvest Feast Table',
  prompt: 'Join the feast',
  run() {
    if (isPeakDay(HARVEST)) { startFeast(eventFlag(HARVEST, 'feastDone')); return; }
    toast('The long table is set and the lanterns are warm. Everyone gathers here on Nov 26 for the feast! 🍂');
  },
};

export const harvestEvent: EventDef = {
  id: HARVEST,
  name: 'Harvest Hush Feast',
  icon: '🍂',
  start: '2026-11-20',
  end: '2026-11-30',
  peakDay: '2026-11-26',
  blurb: 'The island thanks the Long Frost for ending and Cocoa Leaf for warming it up: pumpkins, pies, lanterns, and one big table for all of Sugarlily Isle.',
  banner: 'The Harvest Hush Feast has begun! Gather, bake, and share pies.',
  peakBanner: 'It is Feast Day! Everyone is waiting at the long table in the square.',
  items: [
    'hh_acorn_cap', 'hh_pie_basket', 'hh_pumpkin_knit', 'hh_maple_cardigan', 'hh_cocoa_cardigan', 'hh_cranberry_scarf',
    'hh_plaid_scarf', 'hh_leaf_crown', 'hh_feast_pinafore', 'hh_corduroy_skirt', 'd_cornucopia', 'd_haybale', 'd_pieshelf',
  ],
  activities: [
    { id: 'gather', icon: '🎃', title: 'Gather the Harvest', desc: 'Sugar pumpkins and rosy apples turn up around the island. The café pantry sells them too, and cinnamon.', counter: 'gathered', goal: 20 },
    { id: 'bake', icon: '🥧', title: 'Bake Pies', desc: 'Café oven, Bake tab: a three-step timing game. Press when the heart is in the pink zone. Two perfects bakes a Golden Pie (two pies!).', counter: 'pies', goal: 10 },
    { id: 'gift', icon: '💝', title: 'Pies for Friends', desc: 'Every villager adores pie. Give a pie to a different friend each time.', counter: 'pieFriends', goal: 5 },
    { id: 'feast', icon: '🍽️', title: 'Join the Feast', desc: 'On Nov 26 all your friends gather at the long table in the square. Sit down together and say thank you.', counter: 'feast', goal: 1 },
  ],
  milestones: [
    { id: 'g5', counter: 'gathered', goal: 5, title: 'Orchard Helper: Acorn Cap', reward: { items: ['hh_acorn_cap'] } },
    { id: 'g12', counter: 'gathered', goal: 12, title: 'Basket Full: Harvest Plaid Scarf Knit', reward: { items: ['hh_plaid_scarf'] } },
    { id: 'g20', counter: 'gathered', goal: 20, title: 'Leaf Gatherer: Falling Leaf Crown', reward: { items: ['hh_leaf_crown'] } },
    { id: 'p1', counter: 'pies', goal: 1, title: 'First Pie: Pumpkin Spice Knit Sweater', reward: { items: ['hh_pumpkin_knit'] } },
    { id: 'p3', counter: 'pies', goal: 3, title: 'Pie Baker: Maple Leaf Cardigan', reward: { items: ['hh_maple_cardigan'] } },
    { id: 'p6', counter: 'pies', goal: 6, title: 'Pie Shelf Pro: Pie Cooling Shelf', reward: { pips: 60, items: ['d_pieshelf'] } },
    { id: 'p10', counter: 'pies', goal: 10, title: 'Master Baker: Cocoa Cream Cardigan', reward: { pips: 100, items: ['hh_cocoa_cardigan'] } },
    { id: 'f1', counter: 'pieFriends', goal: 1, title: 'Pie Delivery: Pie Delivery Basket', reward: { items: ['hh_pie_basket'] } },
    { id: 'f3', counter: 'pieFriends', goal: 3, title: 'Neighborly: Cranberry Scarf Sweater', reward: { items: ['hh_cranberry_scarf'] } },
    { id: 'f5', counter: 'pieFriends', goal: 5, title: 'Sweetest Neighbor: Cozy Hay Bale', reward: { pips: 80, items: ['d_haybale'] } },
    { id: 'feast', counter: 'feast', goal: 1, title: 'Thank You Feast: Feast Day Pinafore, Corduroy Skirt, Cornucopia', reward: { pips: 200, items: ['hh_feast_pinafore', 'hh_corduroy_skirt', 'd_cornucopia'] } },
  ],
  world: createHarvestWorld(),
  spots: () => [table],
  onStart() { syncTable(); },
};

registerEvent(harvestEvent);

// ---- the feast table blocks its tiles while the event is on ----
let tableUp = false;
function syncTable() {
  refreshFeast();
  const want = isEventActive(HARVEST);
  if (want === tableUp) return;
  tableUp = want;
  for (const t of TABLE_TILES) setDynamicBlock(t.x, t.y, want);
  if (want) {
    // someone standing where the table appears gets a gentle nudge east
    const me = tileOf();
    if (TABLE_TILES.some((t) => t.x === me.x && t.y === me.y)) player.x = 53.5 * TS;
  }
}
bus.on('eventsChanged', syncTable);

// ---- pies handed to friends ----
bus.on('gift', (g: { villager: string; item: string }) => {
  const it = ITEMS[g.item];
  if (!it || it.event !== HARVEST || !it.loved || !isEventActive(HARVEST)) return; // leftover pies after the event count for nothing
  bumpEvent(HARVEST, 'pieGifts', 1);
  if (!eventFlag(HARVEST, `pie_${g.villager}`)) {
    setEventFlag(HARVEST, `pie_${g.villager}`);
    bumpEvent(HARVEST, 'pieFriends', 1);
  }
});
