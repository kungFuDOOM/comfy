// Twinkle Season: the winter event. Real dates Nov 27 to Dec 26, 2026, in weekly chapters (see `chapters`):
//   Week 1 (Nov 27)  snow and twinkle lights; decorate the town tree
//   Week 2 (Dec 4)   bake cookies at the café oven (a timing game)
//   Week 3 (Dec 11)  hunt lost ornaments around the island; the cocoa market stall opens
//   Week 4 (Dec 18)  gift exchange: friends give a little something back
//   Dec 24 / Dec 25  Christmas Eve and Christmas Day gatherings by the tree (peakDay = Dec 25)
//   Dec 26           still snowy and lit, with every earlier activity open, but no gathering
// New chapters only unlock on their start date (eventDay(), so ?date= and ?event= work); earlier ones stay open.
import { addItem, earn } from '../inventory';
import { bus, toast } from '../bus';
import { ITEMS, VILLAGERS } from '../data';
import { bumpEvent, chapterOpen, eventFlag, isEventActive, registerEvent, setEventFlag, type EventDef, type EventSpot } from '../events';
import { player, tileOf } from '../player';
import { TS, setDynamicBlock } from '../world';
import { openCocoaStall } from './cocoaStall';
import { startGathering } from './gathering';
import { STALL_TILES, TREE_TILE } from './twinkleLayout';
import { gatherKind, refreshGather } from './twinkleSeats';
import { giftBack } from './twinkleText';
import { openTreePanel } from './twinkleTree';
import { createTwinkleWorld } from './twinkleWorld';

export const TWINKLE = 'twinkle';

const treeSpot = (): EventSpot => {
  const kind = gatherKind();
  return {
    id: 'twinkle-tree',
    rect: [44, 41, 47, 44],
    reach: 52,
    approach: [{ x: 46, y: 44 }, { x: 45, y: 44 }, { x: 44, y: 44 }, { x: 46, y: 41 }, { x: 45, y: 41 }],
    label: 'Twinkle Tree',
    prompt: kind ? (kind === 'eve' ? 'Christmas Eve at the tree' : 'Christmas Day at the tree') : 'Decorate the tree',
    run() {
      const k = gatherKind();
      if (k) {
        openTreePanel({ label: k === 'eve' ? 'Join the Christmas Eve gathering ✨' : 'Join the Christmas Day gathering 🎄', run: () => startGathering(k, eventFlag(TWINKLE, `${k}Done`)) });
        return;
      }
      openTreePanel();
    },
  };
};

const stallSpot: EventSpot = {
  id: 'twinkle-cocoa',
  rect: [46, 45, 48, 46],
  reach: 44,
  approach: [{ x: 46, y: 46 }, { x: 47, y: 46 }, { x: 48, y: 45 }, { x: 48, y: 46 }],
  label: 'Cocoa Market',
  prompt: 'Visit the cocoa stall',
  run: openCocoaStall,
};

export const twinkleEvent: EventDef = {
  id: TWINKLE,
  name: 'Twinkle Season',
  icon: '❄️',
  start: '2026-11-27',
  end: '2026-12-26',
  peakDay: '2026-12-25',
  blurb: 'Snow settles over Sugarlily Isle, twinkle lights come on, and the whole island counts down to a Christmas Eve and Christmas Day by the town tree.',
  banner: 'Twinkle Season has begun! Snow, lights, and a tree to decorate.',
  peakBanner: 'It is Christmas Day! Everyone is gathered at the town tree.',
  peakTitle: 'Christmas Day!',
  peakSub: 'Everyone is at the tree in the square',
  season: 'snowfluff',
  items: [
    'tw_snow_beanie', 'tw_frost_coat', 'tw_ginger_pinafore', 'tw_cookie_basket', 'tw_peppermint_boots', 'tw_marshmallow_cardigan',
    'tw_ribbon_sweater', 'tw_eve_gown', 'tw_star_crown', 'tw_snow_tutu',
    'd_tw_tree', 'd_tw_cookies', 'd_tw_cocoa', 'd_tw_gifts', 'd_tw_star', 'd_tw_wreath',
  ],
  chapters: [
    { id: 'wk1', title: 'Week 1: Snow and Lights', start: '2026-11-27', hud: 'Week 1 · Decorate the town tree', blurb: 'Snow has covered the island and the twinkle lights are up. The town tree is waiting in the square.', toast: 'Twinkle Season is here! Snow, lights, and a town tree to decorate in the square ✿' },
    { id: 'wk2', title: 'Week 2: Cookie Baking', start: '2026-12-04', hud: 'Week 2 · Bake cookies', blurb: 'The café oven has new cookie recipes. Gingersnap spice and peppermint sprinkles are in the pantry.', toast: 'Week 2: cookie baking! New cookie recipes are in the café oven 🍪' },
    { id: 'wk3', title: 'Week 3: Ornaments and Cocoa', start: '2026-12-11', hud: 'Week 3 · Ornament hunt, cocoa stall', blurb: 'Lost ornaments are rolling around the island, and a cocoa market stall has opened by the square.', toast: 'Week 3: find the lost ornaments, and visit the new cocoa stall ☕' },
    { id: 'wk4', title: 'Week 4: Gift Exchange', start: '2026-12-18', hud: 'Week 4 · Gift exchange', blurb: 'Give a gift to a friend and they give a little something back. There are more presents under the tree.', toast: 'Week 4: gift exchange! Friends give a little something back 🎁' },
    { id: 'eve', title: 'Christmas Eve', start: '2026-12-24', hud: 'Christmas Eve · Gather at the tree', blurb: 'All of Sugarlily Isle gathers by the tree tonight to make wishes and light it up.', toast: 'It is Christmas Eve! Everyone is gathering by the tree in the square ✨' },
    { id: 'day', title: 'Christmas Day', start: '2026-12-25', hud: 'Christmas Day · Gather at the tree', blurb: 'Merry Christmas! The whole island has a present for you at the tree.', toast: 'Merry Christmas! Everyone is at the tree with a present for you 🎄' },
    { id: 'after', title: 'Afterglow', start: '2026-12-26', hud: 'Last day · Catch up on everything', blurb: 'The snow and lights stay up one more day. Every earlier activity is still open.', toast: 'Last day of Twinkle Season: catch up on anything you missed ❄️' },
  ],
  activities: [
    { id: 'tree', icon: '🎄', title: 'Decorate the Town Tree', desc: 'Garland, ornaments, and a glow on top: three cozy steps at the tree in the square.', counter: 'treeSteps', goal: 3, chapter: 'wk1' },
    { id: 'cookies', icon: '🍪', title: 'Bake Cookies', desc: 'Café oven, Bake tab: three trays and a timing game. Press Out! when the heart is in the golden zone. Gingersnap spice and peppermint are in the pantry.', counter: 'batches', goal: 4, chapter: 'wk2' },
    { id: 'hunt', icon: '🔔', title: 'Ornament Hunt', desc: 'Lost ornaments turn up on the grass, the paths, the hill and the sand around the island.', counter: 'gathered', goal: 10, chapter: 'wk3' },
    { id: 'cocoa', icon: '☕', title: 'Cocoa Market Stall', desc: 'Buy a cup at the stall just south of the square. Serve one to a friend for a cozy moment.', counter: 'cocoa', goal: 3, chapter: 'wk3' },
    { id: 'gifts', icon: '🎁', title: 'Gift Exchange', desc: 'Give a gift to a different friend each time. Each one gives a little something back (once each).', counter: 'exchanges', goal: 6, chapter: 'wk4' },
    { id: 'eve', icon: '🌙', title: 'Christmas Eve at the Tree', desc: 'On Dec 24 everyone gathers by the tree to make a wish and light it up.', counter: 'eve', goal: 1, chapter: 'eve' },
    { id: 'day', icon: '⭐', title: 'Christmas Day at the Tree', desc: 'On Dec 25 everyone has a present for you. Join them at the tree.', counter: 'day', goal: 1, chapter: 'day' },
  ],
  milestones: [
    { id: 't2', counter: 'treeSteps', goal: 2, title: 'Tree Trimmer: Snow Puff Beanie', reward: { items: ['tw_snow_beanie'] } },
    { id: 't3', counter: 'treeSteps', goal: 3, title: 'The Tree Twinkles: Candy Frost Coat Dress, Tiny Twinkle Tree', reward: { pips: 60, items: ['tw_frost_coat', 'd_tw_tree'] } },
    { id: 'b1', counter: 'batches', goal: 1, title: 'First Batch: bonus pips', reward: { pips: 40 } },
    { id: 'b2', counter: 'batches', goal: 2, title: 'Cookie Baker: Gingerbread Pinafore', reward: { items: ['tw_ginger_pinafore'] } },
    { id: 'b4', counter: 'batches', goal: 4, title: 'Cookie Jar Champion: Cookie Delivery Basket, Cookie Jar Tower', reward: { pips: 80, items: ['tw_cookie_basket', 'd_tw_cookies'] } },
    { id: 'h5', counter: 'gathered', goal: 5, title: 'Ornament Spotter: Peppermint Stripe Boots', reward: { items: ['tw_peppermint_boots'] } },
    { id: 'h10', counter: 'gathered', goal: 10, title: 'Ornament Rescuer: Marshmallow Mug Cardigan', reward: { pips: 60, items: ['tw_marshmallow_cardigan'] } },
    { id: 'c3', counter: 'cocoa', goal: 3, title: 'Cocoa Regular: Cocoa Mug Stand', reward: { pips: 50, items: ['d_tw_cocoa'] } },
    { id: 'x3', counter: 'exchanges', goal: 3, title: 'Wrapped Up: Gift Ribbon Sweater', reward: { items: ['tw_ribbon_sweater'] } },
    { id: 'x6', counter: 'exchanges', goal: 6, title: 'Giving Heart: Ribbon Gift Stack', reward: { pips: 80, items: ['d_tw_gifts'] } },
    { id: 'eve', counter: 'eve', goal: 1, title: 'Christmas Eve Wish: Starlit Eve Gown, Eve Wishing Star', reward: { pips: 120, items: ['tw_eve_gown', 'd_tw_star'] } },
    { id: 'day', counter: 'day', goal: 1, title: 'Merry Christmas: Twinkle Star Crown, Snowdrift Tutu, Twinkle Wreath', reward: { pips: 200, items: ['tw_star_crown', 'tw_snow_tutu', 'd_tw_wreath'] } },
  ],
  world: createTwinkleWorld(),
  spots: () => (chapterOpen(TWINKLE, 'wk3') ? [treeSpot(), stallSpot] : [treeSpot()]),
  onStart() { refreshGather(); syncBlocks(); },
};

registerEvent(twinkleEvent);

// ---- the tree (all season) and the cocoa stall (from week 3) block their tiles ----
let treeUp = false, stallUp = false;
function syncBlocks() {
  refreshGather();
  const wantTree = isEventActive(TWINKLE), wantStall = chapterOpen(TWINKLE, 'wk3');
  if (wantTree !== treeUp) {
    treeUp = wantTree;
    setDynamicBlock(TREE_TILE.x, TREE_TILE.y, wantTree);
    const me = tileOf();
    if (wantTree && me.x === TREE_TILE.x && me.y === TREE_TILE.y) player.x = (TREE_TILE.x + 1.5) * TS; // gently east of the trunk
  }
  if (wantStall !== stallUp) {
    stallUp = wantStall;
    for (const t of STALL_TILES) setDynamicBlock(t.x, t.y, wantStall);
    const me = tileOf();
    if (wantStall && STALL_TILES.some((t) => t.x === me.x && t.y === me.y)) player.y = 47.2 * TS;
  }
}
bus.on('eventsChanged', syncBlocks);

// ---- gift exchange (week 4 on): a gift to a friend, and they give a little something back ----
bus.on('gift', (g: { villager: string; item: string }) => {
  const it = ITEMS[g.item];
  if (!it || it.kind === 'drink' || !chapterOpen(TWINKLE, 'wk4')) return; // drinks are served, not exchanged; leftovers after the season count for nothing
  if (eventFlag(TWINKLE, `ex_${g.villager}`)) return;
  setEventFlag(TWINKLE, `ex_${g.villager}`);
  const name = VILLAGERS.find((v) => v.id === g.villager)?.name.split(' ')[0] ?? 'Your friend';
  addItem('candy_charm');
  earn(12);
  toast(`${name}: "${giftBack(g.villager)}" +${ITEMS.candy_charm.name}, +12 pips`);
  bumpEvent(TWINKLE, 'exchanges', 1);
});
