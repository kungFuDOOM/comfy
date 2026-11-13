// Static content tables: items, outfits, recipes, villagers, quests, collectibles.
import type { AreaId } from './areas';

export type ItemKind = 'tool' | 'seed' | 'crop' | 'ingredient' | 'drink' | 'collectible' | 'decor' | 'fish' | 'treat' | 'accessory' | 'garment';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  buy?: number;
  sell?: number;
  desc: string;
  /** Seasonal event this item belongs to (events.ts). Event-only goods can only be made, found or earned while it is on. */
  event?: string;
  /** Chapter of that event in which it becomes available (events.ts); missing = the whole event. */
  chapter?: string;
  /** Relative chance to turn up as a seasonal find (default 3). */
  findWeight?: number;
  /** Every villager adores it as a gift (pies), whatever their usual likes. */
  loved?: boolean;
}

export const CURRENCY = 'pips';

export const ITEMS: Record<string, ItemDef> = {};
const add = (d: ItemDef) => (ITEMS[d.id] = d);

// tools
add({ id: 'trowel', name: 'Tilly Trowel', kind: 'tool', desc: 'Tills a patch of soil in the garden.' });
add({ id: 'can', name: 'Dewdrop Can', kind: 'tool', desc: 'Waters sleepy sprouts.' });
add({ id: 'rod', name: 'Dew-line Rod', kind: 'tool', desc: 'A bendy little rod for the shy fish out past the shallows.' });
// seeds & crops (a small side loop)
add({ id: 'seed_puffberry', name: 'Puffberry Seeds', kind: 'seed', buy: 10, desc: 'Grows fluffy pink berries.' });
add({ id: 'seed_cottonbloom', name: 'Cottonbloom Seeds', kind: 'seed', buy: 16, desc: 'Grows a cloud-soft flower.' });
add({ id: 'puffberry', name: 'Puffberry', kind: 'crop', sell: 28, desc: 'Squishy, sweet, a little bit sparkly.' });
add({ id: 'cottonbloom', name: 'Cottonbloom', kind: 'crop', sell: 44, desc: 'A flower that feels like a cuddle.' });
// café ingredients
add({ id: 'beans', name: 'Cocoa-Roast Beans', kind: 'ingredient', buy: 6, sell: 2, desc: 'Freshly roasted coffee beans.' });
add({ id: 'milk', name: 'Cloud Milk', kind: 'ingredient', buy: 4, sell: 1, desc: 'Extra frothy.' });
add({ id: 'syrup', name: 'Strawberry Syrup', kind: 'ingredient', buy: 7, sell: 2, desc: 'Pink as a sunrise.' });
add({ id: 'honey', name: 'Meadow Honey', kind: 'ingredient', buy: 7, sell: 2, desc: 'Golden and slow.' });
add({ id: 'cocoa', name: 'Velvet Cocoa', kind: 'ingredient', buy: 7, sell: 2, desc: 'Dark, dreamy chocolate.' });
// drinks
add({ id: 'pink_latte', name: 'Pink Puff Latte', kind: 'drink', sell: 38, desc: 'Strawberry-kissed latte with a heart of foam.' });
add({ id: 'honey_cap', name: 'Honey Cloud Cappuccino', kind: 'drink', sell: 36, desc: 'Warm honey under a cloud of milk.' });
add({ id: 'spot_mocha', name: 'Spotted Mocha', kind: 'drink', sell: 40, desc: 'Velvet cocoa with cheetah-spot sprinkles.' });
// collectibles
add({ id: 'shell', name: 'Dewdrop Shell', kind: 'collectible', sell: 14, desc: 'A shell that keeps a morning dewdrop inside.' });
add({ id: 'blossom', name: 'Ribbon Blossom', kind: 'collectible', sell: 12, desc: 'A flower shaped like a tied ribbon.' });
add({ id: 'moth', name: 'Steam-Moth', kind: 'collectible', sell: 30, desc: 'Drifts out of café steam at dusk. Smells like cinnamon.' });
add({ id: 'button', name: 'Starlit Button', kind: 'collectible', sell: 40, desc: 'Found on the hillside. Twinkles when nobody is looking.' });
// gathered goods
add({ id: 'glowberry', name: 'Lanternberry', kind: 'crop', sell: 46, desc: 'A berry that glows faintly pink after dusk.' });
add({ id: 'moonpetal', name: 'Moonpetal', kind: 'crop', sell: 52, desc: 'A pale petal that smells like a lullaby.' });
add({ id: 'pearlshell', name: 'Rosepearl Shell', kind: 'collectible', sell: 58, desc: 'A rosy shell with a tiny pearl tucked inside.' });
add({ id: 'rare_beans', name: 'Starfreckle Beans', kind: 'ingredient', sell: 30, desc: 'Speckled beans that roast up extra dreamy.' });
add({ id: 'twig', name: 'Sugarwood Twig', kind: 'ingredient', sell: 3, desc: 'A sweet-smelling twig that snaps like a cracker.' });
add({ id: 'plank', name: 'Sugarwood Plank', kind: 'ingredient', sell: 12, desc: 'A smooth pink-grained plank. Good for mending things.' });
add({ id: 'minnow', name: 'Puddle Minnow', kind: 'fish', sell: 18, desc: 'Small, round, and always a little surprised.' });
add({ id: 'perch', name: 'Ribbon Perch', kind: 'fish', sell: 42, desc: 'Stripes like a gift ribbon. Wiggles when it is happy.' });
add({ id: 'koi', name: 'Mooncream Koi', kind: 'fish', sell: 90, desc: 'Creamy white with a moon-shaped blush on its cheek.' });
// baked treats
add({ id: 'berry_tart', name: 'Puffberry Tart', kind: 'treat', sell: 44, desc: 'A buttery little tart piled with puffberries.' });
add({ id: 'blossom_scone', name: 'Blossom Scone', kind: 'treat', sell: 48, desc: 'Soft, honeyed, and dotted with petals.' });
add({ id: 'cloud_cake', name: 'Cloud Cake', kind: 'treat', sell: 78, desc: 'So fluffy it nearly floats off the plate.' });
// more drinks
add({ id: 'lantern_latte', name: 'Lanternberry Latte', kind: 'drink', sell: 62, desc: 'A rosy latte that glows a touch at dusk.' });
add({ id: 'star_brew', name: 'Starfreckle Brew', kind: 'drink', sell: 88, desc: 'Dark, sweet, and speckled like a night sky.' });
// handmade accessories
add({ id: 'bow_pin', name: 'Ribbon Bow Clip', kind: 'accessory', sell: 40, desc: 'A hand-tied bow on a tiny clip.' });
add({ id: 'shell_charm', name: 'Seashell Charm', kind: 'accessory', sell: 56, desc: 'A shell on a ribbon. You can hear a tiny tide.' });
// handmade garments: crafting one adds it to the wardrobe for good (see wardrobe.ts)
add({ id: 'blossom_crown', name: 'Handmade Blossom Crown', kind: 'garment', sell: 60, desc: 'Woven by hand from ribbon blossoms. Find it in your wardrobe.' });
add({ id: 'twig_basket', name: 'Twig Basket', kind: 'garment', sell: 50, desc: 'Woven sugarwood twigs. Find it in your wardrobe.' });
add({ id: 'woven_sunhat', name: 'Woven Sunhat', kind: 'garment', sell: 70, desc: 'A hand-woven hat. Find it in your wardrobe.' });
add({ id: 'moonpetal_cape', name: 'Moonpetal Cape', kind: 'garment', sell: 110, desc: 'A short lilac cape. Find it in your wardrobe.' });
add({ id: 'pearl_tiara', name: 'Pearlshell Tiara', kind: 'garment', sell: 160, desc: 'Rosy pearls on silver. Find it in your wardrobe.' });
add({ id: 'petal_pin', name: 'Moonpetal Pin', kind: 'accessory', sell: 96, desc: 'A pressed petal pin that shimmers softly.' });
// Harvest Hush Feast (Nov 2026, see events/harvest.ts): ingredients, pies, and the exclusive decor
add({ id: 'pumpkin', name: 'Sugar Pumpkin', kind: 'crop', buy: 14, sell: 20, event: 'harvest', desc: 'A small, round, blush-orange pumpkin. Smells like a warm kitchen.' });
add({ id: 'apple', name: 'Rosy Apple', kind: 'crop', buy: 9, sell: 14, event: 'harvest', desc: 'Crisp and pink-cheeked, straight from the orchard trees.' });
add({ id: 'cinnamon', name: 'Cinnamon Stick', kind: 'ingredient', buy: 5, sell: 2, event: 'harvest', desc: 'A curl of warm spice. The Moths adore it.' });
add({ id: 'pumpkin_pie', name: 'Pumpkin Cloud Pie', kind: 'treat', sell: 60, event: 'harvest', loved: true, desc: 'Silky pumpkin custard under a ribbon of whipped cream. Everyone loves a slice.' });
add({ id: 'apple_pie', name: 'Rosy Apple Pie', kind: 'treat', sell: 56, event: 'harvest', loved: true, desc: 'A lattice-topped pie with cinnamon apples. Still warm.' });
add({ id: 'd_cornucopia', name: 'Overflowing Cornucopia', kind: 'decor', event: 'harvest', desc: 'A woven horn of plenty, spilling pumpkins, apples and ribbons.' });
add({ id: 'd_haybale', name: 'Cozy Hay Bale', kind: 'decor', event: 'harvest', desc: 'A round hay bale with a pink gingham bow. Surprisingly comfy.' });
add({ id: 'd_pieshelf', name: 'Pie Cooling Shelf', kind: 'decor', event: 'harvest', desc: 'A little shelf of cooling pies, steam curling up forever.' });
// Twinkle Season (Nov 27 to Dec 26 2026, see events/twinkle.ts): spices and cookies (week 2), ornaments and cocoa (week 3),
// keepsakes (week 4) and the exclusive decor
add({ id: 'ginger', name: 'Gingersnap Spice', kind: 'ingredient', buy: 5, sell: 2, event: 'twinkle', chapter: 'wk2', desc: 'Warm, sparkly ginger. Smells like a snowed-in kitchen.' });
add({ id: 'peppermint', name: 'Peppermint Sprinkles', kind: 'ingredient', buy: 5, sell: 2, event: 'twinkle', chapter: 'wk2', desc: 'Pink and white crunchy flecks that tingle on your tongue.' });
add({ id: 'gingerbread', name: 'Gingerbread Heart Cookie', kind: 'treat', sell: 54, event: 'twinkle', chapter: 'wk2', loved: true, desc: 'A honey-brown heart with pink icing frills. Everyone loves one.' });
add({ id: 'peppermint_cookie', name: 'Peppermint Swirl Cookie', kind: 'treat', sell: 56, event: 'twinkle', chapter: 'wk2', loved: true, desc: 'A swirly pink-and-cream cookie with a peppermint crunch.' });
add({ id: 'ornament', name: 'Lost Twinkle Ornament', kind: 'collectible', sell: 10, event: 'twinkle', chapter: 'wk3', findWeight: 6, desc: 'A little glass bauble that rolled off the town tree. It still glows a bit.' });
add({ id: 'cocoa_pink', name: 'Marshmallow Cloud Cocoa', kind: 'drink', buy: 18, sell: 36, event: 'twinkle', chapter: 'wk3', desc: 'Strawberry cocoa under a pillow of marshmallow.' });
add({ id: 'cocoa_mint', name: 'Peppermint Hush Cocoa', kind: 'drink', buy: 18, sell: 36, event: 'twinkle', chapter: 'wk3', desc: 'Cool mint, warm cocoa, one tiny candy cane.' });
add({ id: 'cocoa_star', name: 'Starlight Cocoa', kind: 'drink', buy: 26, sell: 48, event: 'twinkle', chapter: 'wk3', desc: 'Golden cocoa with star sprinkles that twinkle as they melt.' });
add({ id: 'candy_charm', name: 'Candy Cane Charm', kind: 'accessory', sell: 30, event: 'twinkle', chapter: 'wk4', desc: 'A tiny striped charm a friend gave you in return. Keep it, or sell it.' });
add({ id: 'd_tw_tree', name: 'Tiny Twinkle Tree', kind: 'decor', event: 'twinkle', desc: 'A knee-high pine with pink baubles and a star that blinks, just for you.' });
add({ id: 'd_tw_cookies', name: 'Cookie Jar Tower', kind: 'decor', event: 'twinkle', desc: 'A stack of three cookie jars. Do not count the cookies.' });
add({ id: 'd_tw_cocoa', name: 'Cocoa Mug Stand', kind: 'decor', event: 'twinkle', desc: 'Three mugs on a stand, steaming forever.' });
add({ id: 'd_tw_gifts', name: 'Ribbon Gift Stack', kind: 'decor', event: 'twinkle', desc: 'Three wrapped boxes, pink, cream and mint, with enormous bows.' });
add({ id: 'd_tw_star', name: 'Eve Wishing Star', kind: 'decor', event: 'twinkle', desc: 'A soft golden star on a stand. It listens when you whisper.' });
add({ id: 'd_tw_wreath', name: 'Twinkle Wreath', kind: 'decor', event: 'twinkle', desc: 'A snowy wreath with berries, bows and little lights.' });
// recipes a best friend teaches at 10 hearts (see friendData.ts)
add({ id: 'jam_croissant', name: 'Jammy Butter Croissant', kind: 'treat', sell: 66, desc: 'Brioche\'s own recipe: a flaky crescent with a heart of berry jam. Still steaming.' });
add({ id: 'wiggle_cake', name: 'Wiggle Cake', kind: 'treat', sell: 84, desc: 'Tuppi\'s secret cake. It jiggles when you say its name.' });
// decor
add({ id: 'd_pouf', name: 'Pink Pouf', kind: 'decor', buy: 60, desc: 'A squashy seat in bubblegum pink.' });
add({ id: 'd_rug', name: 'Cheetah Rug', kind: 'decor', buy: 120, desc: 'A flat, cheetah-print rug. Very plush.' });
add({ id: 'd_lamp', name: 'Latte Lamp', kind: 'decor', buy: 90, desc: 'A lamp shaped like a coffee cup.' });
add({ id: 'd_shelf', name: 'Bubblegum Bookshelf', kind: 'decor', buy: 140, desc: 'Holds exactly one hundred cozy stories.' });
add({ id: 'd_teacup', name: 'Teacup Planter', kind: 'decor', buy: 50, desc: 'A giant teacup full of blooms.' });
add({ id: 'd_chair', name: 'Cheetah Armchair', kind: 'decor', buy: 150, desc: 'Spotted, swoopy, and dangerously comfy.' });

export const SEED_CROP: Record<string, { crop: string; need: number }> = {
  seed_puffberry: { crop: 'puffberry', need: 150 }, // seconds of "wet" time
  seed_cottonbloom: { crop: 'cottonbloom', need: 240 },
};

export const SHOP_SEEDS = ['seed_puffberry', 'seed_cottonbloom'];
export const SHOP_INGREDIENTS = ['beans', 'milk', 'syrup', 'honey', 'cocoa'];
/** Extra café pantry stock while a seasonal event is on (event id to item ids). */
export const EVENT_PANTRY: Record<string, string[]> = { harvest: ['cinnamon', 'pumpkin', 'apple'], twinkle: ['ginger', 'peppermint'] };
/** Seasonal items that also turn up as collectibles around the island while the event is on (event id to item ids). */
export const EVENT_COLLECTIBLES: Record<string, string[]> = { harvest: ['pumpkin', 'apple'], twinkle: ['ornament'] };
export const SHOP_DECOR = ['d_pouf', 'd_rug', 'd_lamp', 'd_shelf', 'd_teacup', 'd_chair'];

// --- Skills ---
export type SkillId = 'foraging' | 'fishing' | 'gardening' | 'baking' | 'brewing' | 'crafting';
export interface SkillDef { id: SkillId; name: string; icon: string; blurb: string }
export const SKILLS: SkillDef[] = [
  { id: 'foraging', name: 'Foraging', icon: '🍓', blurb: 'Picking berries, petals, shells and coffee beans around the island.' },
  { id: 'fishing', name: 'Fishing', icon: '🐟', blurb: 'Sitting by the shore and waiting for something cute to nibble.' },
  { id: 'gardening', name: 'Gardening', icon: '🌱', blurb: 'Tilling, watering and harvesting your little plot.' },
  { id: 'baking', name: 'Baking', icon: '🧁', blurb: 'Turning berries, flowers and honey into sweet treats.' },
  { id: 'brewing', name: 'Brewing', icon: '☕', blurb: 'Pulling lovely drinks at the café counter.' },
  { id: 'crafting', name: 'Crafting', icon: '🎀', blurb: 'Making bows, charms and pins by hand.' },
];

// --- Recipes (café counter, café oven, Crafting Table) ---
export type Bench = 'brew' | 'bake' | 'craft';
export interface Recipe {
  id: string;
  needs: Record<string, number>;
  seconds: number;
  bench: Bench;
  skill: SkillId;
  level: number;
  xp: number;
  /** Quest stat bumped when one is made. */
  stat: string;
  /** Only available while this seasonal event is active (see events.ts). */
  event?: string;
  /** ...and once this chapter of it has started. */
  chapter?: string;
  /** Only learned once you reach 10 hearts with this villager (id). */
  friend?: string;
}
export const RECIPES: Recipe[] = [
  { id: 'pink_latte', needs: { beans: 1, milk: 1, syrup: 1 }, seconds: 3, bench: 'brew', skill: 'brewing', level: 1, xp: 12, stat: 'brewed' },
  { id: 'honey_cap', needs: { beans: 1, milk: 1, honey: 1 }, seconds: 3, bench: 'brew', skill: 'brewing', level: 1, xp: 12, stat: 'brewed' },
  { id: 'spot_mocha', needs: { beans: 1, milk: 1, cocoa: 1 }, seconds: 4, bench: 'brew', skill: 'brewing', level: 1, xp: 14, stat: 'brewed' },
  { id: 'lantern_latte', needs: { beans: 1, milk: 1, glowberry: 1 }, seconds: 5, bench: 'brew', skill: 'brewing', level: 5, xp: 34, stat: 'brewed' },
  { id: 'star_brew', needs: { rare_beans: 1, milk: 1, honey: 1, cocoa: 1 }, seconds: 6, bench: 'brew', skill: 'brewing', level: 10, xp: 70, stat: 'brewed' },
  { id: 'berry_tart', needs: { puffberry: 2, milk: 1, honey: 1 }, seconds: 5, bench: 'bake', skill: 'baking', level: 1, xp: 16, stat: 'baked' },
  { id: 'blossom_scone', needs: { blossom: 2, milk: 1, honey: 1 }, seconds: 5, bench: 'bake', skill: 'baking', level: 4, xp: 30, stat: 'baked' },
  { id: 'cloud_cake', needs: { cottonbloom: 1, milk: 2, syrup: 1 }, seconds: 7, bench: 'bake', skill: 'baking', level: 8, xp: 60, stat: 'baked' },
  // seasonal pies: baked with the little timing game in events/pieBake.ts
  { id: 'pumpkin_pie', needs: { pumpkin: 1, cinnamon: 1, milk: 1 }, seconds: 0, bench: 'bake', skill: 'baking', level: 1, xp: 30, stat: 'baked', event: 'harvest' },
  { id: 'apple_pie', needs: { apple: 2, cinnamon: 1, honey: 1 }, seconds: 0, bench: 'bake', skill: 'baking', level: 1, xp: 30, stat: 'baked', event: 'harvest' },
  // Twinkle cookies: baked with the little timing game in events/cookieBake.ts (week 2 on)
  { id: 'gingerbread', needs: { ginger: 1, honey: 1, milk: 1 }, seconds: 0, bench: 'bake', skill: 'baking', level: 1, xp: 30, stat: 'baked', event: 'twinkle', chapter: 'wk2' },
  { id: 'peppermint_cookie', needs: { peppermint: 1, syrup: 1, milk: 1 }, seconds: 0, bench: 'bake', skill: 'baking', level: 1, xp: 30, stat: 'baked', event: 'twinkle', chapter: 'wk2' },
  { id: 'jam_croissant', needs: { puffberry: 2, milk: 1, honey: 1, syrup: 1 }, seconds: 6, bench: 'bake', skill: 'baking', level: 1, xp: 40, stat: 'baked', friend: 'brioche' },
  { id: 'wiggle_cake', needs: { syrup: 2, milk: 2, honey: 1, cottonbloom: 1 }, seconds: 8, bench: 'bake', skill: 'baking', level: 1, xp: 55, stat: 'baked', friend: 'tuppi' },
  { id: 'bow_pin', needs: { blossom: 2 }, seconds: 4, bench: 'craft', skill: 'crafting', level: 1, xp: 16, stat: 'crafted' },
  { id: 'shell_charm', needs: { shell: 2, blossom: 1 }, seconds: 5, bench: 'craft', skill: 'crafting', level: 4, xp: 32, stat: 'crafted' },
  { id: 'plank', needs: { twig: 2 }, seconds: 3, bench: 'craft', skill: 'crafting', level: 1, xp: 10, stat: 'crafted' },
  { id: 'blossom_crown', needs: { blossom: 4 }, seconds: 5, bench: 'craft', skill: 'crafting', level: 2, xp: 24, stat: 'crafted' },
  { id: 'twig_basket', needs: { twig: 4 }, seconds: 5, bench: 'craft', skill: 'crafting', level: 3, xp: 26, stat: 'crafted' },
  { id: 'woven_sunhat', needs: { twig: 3, blossom: 2 }, seconds: 6, bench: 'craft', skill: 'crafting', level: 4, xp: 34, stat: 'crafted' },
  { id: 'moonpetal_cape', needs: { moonpetal: 3, blossom: 2 }, seconds: 7, bench: 'craft', skill: 'crafting', level: 6, xp: 48, stat: 'crafted' },
  { id: 'pearl_tiara', needs: { pearlshell: 3, moonpetal: 2 }, seconds: 8, bench: 'craft', skill: 'crafting', level: 10, xp: 80, stat: 'crafted' },
  { id: 'petal_pin', needs: { moonpetal: 2, pearlshell: 1 }, seconds: 6, bench: 'craft', skill: 'crafting', level: 8, xp: 64, stat: 'crafted' },
];

// --- Boutique ---
// Outfits became the slot-based wardrobe (see clothes/). This is only the cheetah print kind the art helpers share.
export type PatternKind = 'classic' | 'pink';

// --- Villagers ---
export type Species = 'dormouse' | 'hamster' | 'hedgehog' | 'bunny' | 'capybara' | 'moth' | 'axolotl' | 'seal';
export interface VillagerDef {
  id: string;
  name: string;
  species: Species;
  speciesName: string;
  personality: string;
  color: string;
  accent: string;
  likes: string[];
  home: { x: number; y: number };
  radius: number;
  /** Day phases this villager is around for; omitted = always. */
  phases?: ('morning' | 'day' | 'evening' | 'night')[];
  /** Area that must be open before this friend moves in. Omitted = lives in town from the start. */
  area?: AreaId;
  bio: string;
  lines: [string[], string[], string[]]; // by friendship tier
  phase: Record<'morning' | 'day' | 'evening' | 'night', string>;
  loved: string;
  liked: string;
  meh: string;
}

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'mimsy', name: 'Mimsy Brindlewick', species: 'dormouse', speciesName: 'Fluff-eared Dormouse',
    personality: 'Sleepy sweetheart', color: '#f6c6d6', accent: '#ff9ec0',
    likes: ['pink_latte', 'blossom'], home: { x: 43, y: 37 }, radius: 2,
    bio: 'Café regular who has never once been awake before ten.',
    lines: [
      ['Oh! Hi... sorry, I was napping with my eyes open.', 'Do you smell coffee? I always smell coffee.'],
      ['I saved you the sunny seat. Mostly by sitting on it.', 'Today is a good day for a very slow latte.'],
      ['You are my favorite part of waking up. Do not tell the pillows.', 'Let\'s share a cake later? I will bring two forks and one sleepy smile.'],
    ],
    phase: {
      morning: 'Is it morning already? Rude. But pretty.',
      day: 'The patio is perfect right now.',
      evening: 'Golden hour makes my whiskers tingle.',
      night: 'Shhh... the moths are doing their coffee-steam dance.',
    },
    loved: 'A Pink Puff Latte?! My heart just did a little tumble!', liked: 'For me? Squee! This is so sweet.', meh: 'Aww, thank you. I will put it somewhere soft.',
  },
  {
    id: 'zuzu', name: 'Dottie Spotwhisk', species: 'hamster', speciesName: 'Cheetah-spotted Hamster',
    personality: 'Hat-opinionated boutique boss', color: '#fbe0ae', accent: '#7a4a3a',
    likes: ['spot_mocha', 'moth'], home: { x: 55, y: 37 }, radius: 2.5,
    bio: 'Runs the Spot & Bow Boutique and has strong opinions about hats. Believes every day deserves a runway.',
    lines: [
      ['Darling, nice to meet you. The boutique is always open for dreamers.', 'Spots are not a pattern. They are a lifestyle. Also, nice head. Let\'s find it a hat.'],
      ['Ooh, that color works on you. I have a hat for that. I have a hat for everything.', 'Fashion tip: pink goes with everything. Spots go with everything else. Hats go on top.'],
      ['You are officially my favorite model. Do not tell the mannequins.', 'I saved a rack just for your best looks, bestie.'],
    ],
    phase: {
      morning: 'Early light = best photo light. Strike a pose!',
      day: 'The shop is buzzing. Come try something spotted.',
      evening: 'Evening looks are my specialty. Sparkles, anyone?',
      night: 'Shh, the mannequins are resting. Pretty, isn\'t it?',
    },
    loved: 'A Spotted Mocha! You get me. Cheetah-spot sprinkles?! Iconic.', liked: 'Fabulous. I will treasure it, dramatically.', meh: 'Hm, thoughtful! I will find the perfect outfit for it.',
  },
  {
    id: 'bramble', name: 'Bramble Tumbledown', species: 'hedgehog', speciesName: 'Marshmallow Hedgehog',
    personality: 'Grumpy-sweet gardener', color: '#fff0f5', accent: '#c9a8e8',
    likes: ['puffberry', 'cottonbloom'], home: { x: 34, y: 44 }, radius: 2.5,
    bio: 'Pretends not to care about the garden. Names every sprout.',
    lines: [
      ['Hmph. Mind the sprouts. ...Hello.', 'I am not smiling. That is just my face.'],
      ['The puffberries are doing well. I may have sung to them. Once.', 'You water well. Do not let it go to your head.'],
      ['Fine. You are a friend. I made you a tiny crown of clover. Shush.', 'Honestly, the garden is better when you visit.'],
    ],
    phase: {
      morning: 'Dew is on everything. I am fine. It is lovely.',
      day: 'Sun. Soil. Silence. Perfect.',
      evening: 'The sprouts are sleepy. So am I.',
      night: 'Stars are out. The garden is dreaming.',
    },
    loved: '...That is my favorite. Do not look at my face right now.', liked: 'Oh. Hm. That is nice. Thanks.', meh: 'It\'s fine. I will find a spot for it. Thanks.',
  },
  {
    id: 'nimbus', name: 'Nimbus Hollowell', species: 'bunny', speciesName: 'Fog-puff Bunny',
    personality: 'Gentle dusk-time listener', color: '#d9ccf5', accent: '#ffd36e',
    likes: ['button', 'honey_cap'], home: { x: 62, y: 33 }, radius: 1.5, phases: ['evening', 'night'],
    bio: 'A fog-puff bunny who only appears at dusk, keeps the Afterglow Grove, and loves to hear about your day.',
    lines: [
      ['Oh, hello. I only drift in at dusk. Tell me about your day?', 'Each lantern remembers the moment it was born.'],
      ['The hillside glows brighter when kind things are done.', 'Pour a drink for a friend, and a light may drift my way.'],
      ['I will tell you a secret: the constellations are a map. Keep collecting.', 'Your lanterns are my favorites, and your stories. Do not tell the others.'],
    ],
    phase: {
      morning: 'The lanterns sleep in the day. How lovely.',
      day: 'Quiet hours. I am a bit foggy before dusk. Come find me later.',
      evening: 'The first lights are drifting up now.',
      night: 'Look up. Isn\'t it wonderful?',
    },
    loved: 'A gift fit for the grove! My ears are all aflutter.', liked: 'How kind. The grove will remember this.', meh: 'Thank you, dear. Every gift is a small light.',
  },
  {
    id: 'brioche', name: 'Brioche Crumbleton', species: 'capybara', speciesName: 'Pastry-minded Capybara', area: 'meadow',
    personality: 'Warm-pastry problem solver', color: '#f3d3b0', accent: '#d9834f',
    likes: ['berry_tart', 'honey_cap'], home: { x: 82, y: 36 }, radius: 3,
    bio: 'A tubby capybara barista who believes every problem can be solved with a warm pastry. Sets up a picnic café in Sprinkle Meadow.',
    lines: [
      ['Oh, a visitor! Sit, sit. Is something wrong? Have a pastry. That usually fixes it.', 'Nothing a warm croissant cannot soothe. I keep one in each pocket. Do not tell the ants.'],
      ['Tired feet? Pastry. Sad heart? Pastry. Lost your keys? ...Pastry, then we look.', 'The meadow tastes better with butter in the air, I always say.'],
      ['You are my favorite person to share a blanket with. Pass the jam?', 'I baked a whole tray just in case you dropped by. I always bake just in case.'],
    ],
    phase: {
      morning: 'Fresh batch! The whole meadow smells like butter.',
      day: 'Picnic hour is the best hour. Every hour is picnic hour.',
      evening: 'Golden light on a flaky crust. That is what dreams are made of.',
      night: 'Shhh... the dough is proofing. Sleep well, dear.',
    },
    loved: 'A tart?! You are an angel in an apron. Warm pastry for the win!', liked: 'Oh, that is lovely! Pairs perfectly with a pastry, you know.', meh: 'How thoughtful! I will tuck it by the blanket.',
  },
  {
    id: 'oolie', name: 'Oolie Wisperwing', species: 'moth', speciesName: 'Pastel Pressed-flower Moth', area: 'blossom',
    personality: 'Shy whisper-collector', color: '#e6d4ff', accent: '#ff9ec0',
    likes: ['moonpetal', 'blossom'], home: { x: 10, y: 40 }, radius: 3,
    bio: 'A shy pastel moth who collects pressed flowers and whispers her favorite ones. Lives among the blossoms.',
    lines: [
      ['Oh! Um... hello. I am Oolie. I... press flowers. ...That is all.', '*whispers* The tall pink one is my favorite. Do not tell the others.'],
      ['I saved you a pressed petal. It is a little bit crumpled. I hope you like it...', 'The grove hums when it is quiet. Can you hear it? Shhh.'],
      ['You are the only one I whisper to loudly. Which is still quite quietly.', 'Every flower has a secret name. I will tell you one. ...Later. Maybe.'],
    ],
    phase: {
      morning: 'The dew makes the petals extra soft. Perfect for pressing.',
      day: 'Sunlight through the blossoms looks like confetti. Shy confetti.',
      evening: 'The moonpetals are waking up. They are my favorite, I think.',
      night: 'I like the night. It is quiet in a good way.',
    },
    loved: 'A moonpetal?! I... I am going to press this one forever. Thank you.', liked: 'Oh... this one is lovely. I will press it with care.', meh: 'Th-thank you. I will find the right book for it.',
  },
  {
    id: 'tuppi', name: 'Tuppi Frostwiggle', species: 'axolotl', speciesName: 'Blush-cheeked Axolotl', area: 'pond',
    personality: 'Giggly frosting dreamer', color: '#ffc4d8', accent: '#ff8fb6',
    likes: ['cloud_cake', 'puffberry'], home: { x: 45, y: 16 }, radius: 2.5,
    bio: 'A blush-cheeked axolotl baker who dreams in frosting and giggles when it wiggles. Bakes beside the pond.',
    lines: [
      ['Hee! Oh, hi! Sorry, I was dreaming of frosting. Pink frosting. With sprinkles.', 'Do you hear that wiggle? Hee hee! That is the frosting getting excited.'],
      ['I dreamed of a cake that floated away. I chased it all night. It was delicious.', 'The pond is full of wiggles today. I giggle every time.'],
      ['You are the sprinkles on my cake, friend. Hee hee!', 'I made you a tiny cake. It wiggled. It is still wiggling. Hee!'],
    ],
    phase: {
      morning: 'Good morning! The frosting is whipping itself!',
      day: 'Wiggle, wiggle, bake! That is my song!',
      evening: 'The pond turns pink at this hour. Just like frosting!',
      night: 'Goodnight, cakes. Goodnight, wiggles. Hee.',
    },
    loved: 'A cloud cake!! It is so fluffy I might giggle all the way to bed!', liked: 'Ooh! Sweet! Wiggle wiggle!', meh: 'Hee, thank you! I will find it a frosting buddy.',
  },
  {
    id: 'marlo', name: 'Marlo Seaglass', species: 'seal', speciesName: 'Sugar-dusted Seal', area: 'lighthouse',
    personality: 'Dreamy lighthouse keeper', color: '#f4c9dc', accent: '#a98fd6',
    likes: ['shell', 'perch'], home: { x: 53, y: 9 }, radius: 2,
    bio: 'A plump sugar-dusted seal who tends the lighthouse and hums to the Hush Bell. Collects sea glass and sunsets.',
    lines: [
      ['Ahoy-hoy! I keep the light. And, er, the Bell. It is sleeping, but I hum to it.', 'You came all the way up here? The view is worth it. Look at that sea!'],
      ['The Bell does not ring yet, but sometimes I think it hums back.', 'I collect sea glass. Pink ones are rare. Orange ones are shy.'],
      ['When the Bell rings again, I hope you are standing right here beside me.', 'You have been so kind to the island. The light feels brighter with you around.'],
    ],
    phase: {
      morning: 'Morning mist on the sea. I made a little wish on it.',
      day: 'The lighthouse is sparkling. I polished it. Twice.',
      evening: 'Time to light the lamp! It is my favorite part of the day.',
      night: 'The sea is dreaming. I stay up so it does not feel alone.',
    },
    loved: 'Oh! This is a treasure from the sea. My heart is doing little flippers!', liked: 'How lovely. The lighthouse shelf will get a new friend today.', meh: 'Thank you, friend. Every gift shines a little.',
  },
];

// --- Quests ---
export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  stat: string;
  goal: number;
  reward: number;
  rewardItem?: string;
  loop: string;
}
export const QUESTS: QuestDef[] = [
  { id: 'q_brew', title: 'First Sip', desc: 'Brew a drink at the Puddle & Pip Café.', stat: 'brewed', goal: 1, reward: 25, loop: 'Café' },
  { id: 'q_serve', title: 'Cup of Kindness', desc: 'Serve a drink to a villager.', stat: 'served', goal: 1, reward: 40, rewardItem: 'beans', loop: 'Café' },
  { id: 'q_boutique', title: 'Window Shopping', desc: 'Try on an outfit at Spot & Bow Boutique.', stat: 'tried', goal: 1, reward: 30, loop: 'Boutique' },
  { id: 'q_gift', title: 'A Little Something', desc: 'Give a gift to a villager.', stat: 'gifted', goal: 1, reward: 30, loop: 'Friends' },
  { id: 'q_collect', title: 'Treasure Trail', desc: 'Find 3 collectibles around the island.', stat: 'collected', goal: 3, reward: 50, loop: 'Collecting' },
  { id: 'q_decor', title: 'Nest Builder', desc: 'Place a piece of decor in your yard.', stat: 'placed', goal: 1, reward: 40, loop: 'Decorating' },
  { id: 'q_lantern', title: 'First Glow', desc: 'Release your first Afterglow Lantern.', stat: 'lanterns', goal: 1, reward: 60, rewardItem: 'd_pouf', loop: 'Afterglow' },
  { id: 'q_sprout', title: 'Tiny Sprout', desc: 'Harvest something from the garden plot.', stat: 'harvested', goal: 1, reward: 30, loop: 'Garden' },
  { id: 'q_forage', title: 'Basket Full', desc: 'Gather 5 things from bushes, patches, beds and shrubs.', stat: 'foraged', goal: 5, reward: 40, loop: 'Foraging' },
  { id: 'q_fish', title: 'First Nibble', desc: 'Catch a fish at the shore.', stat: 'fished', goal: 1, reward: 35, loop: 'Fishing' },
  { id: 'q_bake', title: 'Warm From the Oven', desc: 'Bake a treat at the café oven.', stat: 'baked', goal: 1, reward: 35, loop: 'Baking' },
  { id: 'q_craft', title: 'Handmade With Love', desc: 'Make an accessory at the Crafting Table.', stat: 'crafted', goal: 1, reward: 35, loop: 'Crafting' },
];

// --- Gathering nodes ---
export type NodeKind = 'berry' | 'flower' | 'shell' | 'coffee' | 'fish' | 'wood';
export interface NodeTier {
  name: string;
  level: number;
  item: string;
  xp: number;
  /** Seconds until it is ready again. */
  respawn: number;
  skill: SkillId;
  /** Needs the Dew-line Rod in the bag. */
  rod?: boolean;
  verb: string;
}
export const NODE_KINDS: Record<NodeKind, NodeTier[]> = {
  berry: [
    { name: 'Puffberry Bush', level: 1, item: 'puffberry', xp: 10, respawn: 60, skill: 'foraging', verb: 'Pick berries' },
    { name: 'Lanternberry Bush', level: 8, item: 'glowberry', xp: 34, respawn: 110, skill: 'foraging', verb: 'Pick berries' },
  ],
  flower: [
    { name: 'Ribbon Blossom Patch', level: 1, item: 'blossom', xp: 9, respawn: 50, skill: 'foraging', verb: 'Gather blossoms' },
    { name: 'Moonpetal Patch', level: 6, item: 'moonpetal', xp: 28, respawn: 100, skill: 'foraging', verb: 'Gather petals' },
  ],
  shell: [
    { name: 'Shell Bed', level: 1, item: 'shell', xp: 8, respawn: 50, skill: 'foraging', verb: 'Dig for shells' },
    { name: 'Rosepearl Bed', level: 7, item: 'pearlshell', xp: 30, respawn: 110, skill: 'foraging', verb: 'Dig for shells' },
  ],
  coffee: [
    { name: 'Coffee Shrub', level: 2, item: 'beans', xp: 14, respawn: 75, skill: 'foraging', verb: 'Pick coffee cherries' },
    { name: 'Starfreckle Shrub', level: 9, item: 'rare_beans', xp: 38, respawn: 120, skill: 'foraging', verb: 'Pick coffee cherries' },
  ],
  wood: [
    { name: 'Sugarwood Stump', level: 1, item: 'twig', xp: 8, respawn: 40, skill: 'foraging', verb: 'Gather twigs' },
  ],
  fish: [
    { name: 'Puddle Spot', level: 1, item: 'minnow', xp: 10, respawn: 45, skill: 'fishing', verb: 'Cast a line' },
    { name: 'Ribbon Spot', level: 6, item: 'perch', xp: 30, respawn: 80, skill: 'fishing', rod: true, verb: 'Cast a line' },
    { name: 'Moonlit Spot', level: 12, item: 'koi', xp: 64, respawn: 150, skill: 'fishing', rod: true, verb: 'Cast a line' },
  ],
};

export interface NodeDef { id: string; kind: NodeKind; tier: number; x: number; y: number }

/**
 * Where gathering nodes live. The island generator (world.ts) turns these into real NODES on valid tiles of the
 * right terrain, so a node can never end up inside a wall or the wrong kind of ground.
 * `on` is the ground it needs; fish spots sit in water next to a walkable bank.
 */
export interface NodeSpec { area: AreaId; kind: NodeKind; tier: number; n: number; on: 'grass' | 'sand' | 'water'; /** Optional tile rect to keep it to one corner of the area. */ rect?: [number, number, number, number] }
export const NODE_SPECS: NodeSpec[] = [
  // Town: starter tier only (Ribbon Meadow, the south shore)
  { area: 'town', kind: 'berry', tier: 0, n: 4, on: 'grass', rect: [24, 30, 40, 38] },
  { area: 'town', kind: 'flower', tier: 0, n: 4, on: 'grass', rect: [24, 30, 40, 38] },
  { area: 'town', kind: 'wood', tier: 0, n: 3, on: 'grass', rect: [24, 30, 40, 38] },
  { area: 'town', kind: 'coffee', tier: 0, n: 3, on: 'grass', rect: [62, 44, 72, 52] },
  { area: 'town', kind: 'shell', tier: 0, n: 6, on: 'sand', rect: [22, 56, 74, 78] },
  { area: 'town', kind: 'fish', tier: 0, n: 3, on: 'water', rect: [22, 56, 74, 79] },
  // Blossom Grove
  { area: 'blossom', kind: 'berry', tier: 0, n: 2, on: 'grass' },
  { area: 'blossom', kind: 'berry', tier: 1, n: 3, on: 'grass' },
  { area: 'blossom', kind: 'flower', tier: 0, n: 3, on: 'grass' },
  { area: 'blossom', kind: 'flower', tier: 1, n: 4, on: 'grass' },
  { area: 'blossom', kind: 'wood', tier: 0, n: 2, on: 'grass' },
  { area: 'blossom', kind: 'coffee', tier: 1, n: 2, on: 'grass' },
  { area: 'blossom', kind: 'shell', tier: 0, n: 3, on: 'sand' },
  // Pond and river
  { area: 'pond', kind: 'fish', tier: 0, n: 2, on: 'water' },
  { area: 'pond', kind: 'fish', tier: 1, n: 3, on: 'water' },
  { area: 'pond', kind: 'fish', tier: 2, n: 1, on: 'water' },
  { area: 'pond', kind: 'flower', tier: 0, n: 2, on: 'grass' },
  { area: 'pond', kind: 'wood', tier: 0, n: 2, on: 'grass' },
  // Flower Meadow
  { area: 'meadow', kind: 'flower', tier: 0, n: 4, on: 'grass' },
  { area: 'meadow', kind: 'flower', tier: 1, n: 4, on: 'grass' },
  { area: 'meadow', kind: 'berry', tier: 0, n: 3, on: 'grass' },
  { area: 'meadow', kind: 'berry', tier: 1, n: 2, on: 'grass' },
  { area: 'meadow', kind: 'coffee', tier: 1, n: 2, on: 'grass' },
  // Hush Bell overlook
  { area: 'lighthouse', kind: 'flower', tier: 1, n: 2, on: 'grass' },
  { area: 'lighthouse', kind: 'berry', tier: 1, n: 1, on: 'grass' },
  { area: 'lighthouse', kind: 'fish', tier: 1, n: 2, on: 'water' },
  { area: 'lighthouse', kind: 'fish', tier: 2, n: 1, on: 'water' },
  // Far beach
  { area: 'farbeach', kind: 'shell', tier: 0, n: 3, on: 'sand' },
  { area: 'farbeach', kind: 'shell', tier: 1, n: 6, on: 'sand' },
  { area: 'farbeach', kind: 'fish', tier: 1, n: 3, on: 'water' },
  { area: 'farbeach', kind: 'fish', tier: 2, n: 3, on: 'water' },
];
/** Filled in by buildWorld() from NODE_SPECS. */
export const NODES: NodeDef[] = [];
