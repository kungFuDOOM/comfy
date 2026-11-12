// Static content tables: items, outfits, recipes, villagers, quests, collectibles.
export type ItemKind = 'tool' | 'seed' | 'crop' | 'ingredient' | 'drink' | 'collectible' | 'decor' | 'fish' | 'treat' | 'accessory';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  buy?: number;
  sell?: number;
  desc: string;
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
add({ id: 'petal_pin', name: 'Moonpetal Pin', kind: 'accessory', sell: 96, desc: 'A pressed petal pin that shimmers softly.' });
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

// --- Recipes (café counter, café oven, boutique worktable) ---
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
  { id: 'bow_pin', needs: { blossom: 2 }, seconds: 4, bench: 'craft', skill: 'crafting', level: 1, xp: 16, stat: 'crafted' },
  { id: 'shell_charm', needs: { shell: 2, blossom: 1 }, seconds: 5, bench: 'craft', skill: 'crafting', level: 4, xp: 32, stat: 'crafted' },
  { id: 'petal_pin', needs: { moonpetal: 2, pearlshell: 1 }, seconds: 6, bench: 'craft', skill: 'crafting', level: 8, xp: 64, stat: 'crafted' },
];

// --- Boutique ---
export type HatKind = 'none' | 'bow' | 'beret' | 'sunhat';
export type PatternKind = 'classic' | 'pink';
export interface OutfitDef {
  id: string;
  name: string;
  price: number;
  body: string;
  trim: string;
  pattern?: PatternKind;
  hat: HatKind;
  desc: string;
}
export const OUTFITS: OutfitDef[] = [
  { id: 'cozy', name: 'Cream Cozy Sweater', price: 0, body: '#fff1e0', trim: '#ffc9dc', hat: 'none', desc: 'Your comfy everyday knit.' },
  { id: 'peony', name: 'Peony Pinafore', price: 80, body: '#ffb3cf', trim: '#ffffff', hat: 'bow', desc: 'Pink as a peony, with a big bow.' },
  { id: 'strawberry', name: 'Strawberry Milk Overalls', price: 110, body: '#ff9ec0', trim: '#fff4f0', hat: 'beret', desc: 'Sweet overalls and a soft beret.' },
  { id: 'spotted_sun', name: 'Spotted Sunhat Set', price: 130, body: '#ffd6e7', trim: '#7a4a3a', pattern: undefined, hat: 'sunhat', desc: 'A sunny dress with a cheetah-band sunhat.' },
  { id: 'cheetah_coat', name: 'Cheetah Cuddle Coat', price: 150, body: '#f9deb0', trim: '#ff9ec0', pattern: 'classic', hat: 'none', desc: 'Cheetah print from collar to hem.' },
  { id: 'rose_cheetah', name: 'Rosé Cheetah Dress', price: 180, body: '#ffc9dc', trim: '#ffffff', pattern: 'pink', hat: 'bow', desc: 'Pink cheetah print with a bow. Show-stopping.' },
];

// --- Villagers ---
export type Species = 'dormouse' | 'hamster' | 'hedgehog' | 'bunny';
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
    likes: ['pink_latte', 'blossom'], home: { x: 25, y: 15 }, radius: 2,
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
    likes: ['spot_mocha', 'moth'], home: { x: 37, y: 15 }, radius: 2.5,
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
    likes: ['puffberry', 'cottonbloom'], home: { x: 16, y: 22 }, radius: 2.5,
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
    likes: ['button', 'honey_cap'], home: { x: 44, y: 11 }, radius: 1.5, phases: ['evening', 'night'],
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
  { id: 'q_craft', title: 'Handmade With Love', desc: 'Make an accessory at the boutique worktable.', stat: 'crafted', goal: 1, reward: 35, loop: 'Crafting' },
];

// --- Gathering nodes ---
export type NodeKind = 'berry' | 'flower' | 'shell' | 'coffee' | 'fish';
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
  fish: [
    { name: 'Puddle Spot', level: 1, item: 'minnow', xp: 10, respawn: 45, skill: 'fishing', verb: 'Cast a line' },
    { name: 'Ribbon Spot', level: 6, item: 'perch', xp: 30, respawn: 80, skill: 'fishing', rod: true, verb: 'Cast a line' },
    { name: 'Moonlit Spot', level: 12, item: 'koi', xp: 64, respawn: 150, skill: 'fishing', rod: true, verb: 'Cast a line' },
  ],
};

export interface NodeDef { id: string; kind: NodeKind; tier: number; x: number; y: number }
const n = (kind: NodeKind, tier: number, pts: [number, number][]): NodeDef[] =>
  pts.map(([x, y], i) => ({ id: `${kind}${tier}_${i}`, kind, tier, x, y }));
export const NODES: NodeDef[] = [
  // Ribbon Meadow
  ...n('berry', 0, [[11, 14], [10, 13], [12, 10], [15, 12], [9, 15]]),
  ...n('berry', 1, [[7, 13], [18, 13]]),
  ...n('flower', 0, [[6, 15], [11, 11], [16, 15], [8, 16], [13, 14]]),
  ...n('flower', 1, [[9, 12], [19, 10]]),
  // beaches
  ...n('shell', 0, [[4, 16], [4, 20], [4, 24], [6, 12], [19, 39], [27, 40]]),
  ...n('shell', 1, [[38, 40], [55, 22]]),
  // the coffee grove, south-east of the square
  ...n('coffee', 0, [[47, 24], [49, 24], [48, 26]]),
  ...n('coffee', 1, [[50, 26], [51, 23]]),
  // Dewdrop Shore and the west coast
  ...n('fish', 0, [[24, 41], [28, 41], [2, 18], [3, 22]]),
  ...n('fish', 1, [[34, 42], [37, 41], [3, 26]]),
  ...n('fish', 2, [[41, 40], [11, 36]]),
];
