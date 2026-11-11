// Static content tables: items, outfits, recipes, villagers, quests, collectibles.
export type ItemKind = 'tool' | 'seed' | 'crop' | 'ingredient' | 'drink' | 'collectible' | 'decor';

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

// --- Cafe ---
export interface Recipe {
  id: string;
  needs: Record<string, number>;
  seconds: number;
}
export const RECIPES: Recipe[] = [
  { id: 'pink_latte', needs: { beans: 1, milk: 1, syrup: 1 }, seconds: 3 },
  { id: 'honey_cap', needs: { beans: 1, milk: 1, honey: 1 }, seconds: 3 },
  { id: 'spot_mocha', needs: { beans: 1, milk: 1, cocoa: 1 }, seconds: 4 },
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
export type Species = 'dormouse' | 'cheetah' | 'hedgehog' | 'owl';
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
    id: 'zuzu', name: 'Zuzu Spotswood', species: 'cheetah', speciesName: 'Spotted Cheetah Cub',
    personality: 'Bold boutique diva', color: '#fbe0ae', accent: '#7a4a3a',
    likes: ['spot_mocha', 'moth'], home: { x: 37, y: 15 }, radius: 2.5,
    bio: 'Runs the Spot & Bow Boutique. Believes every day deserves a runway.',
    lines: [
      ['Darling, nice to meet you. The boutique is always open for dreamers.', 'Spots are not a pattern. They are a lifestyle.'],
      ['Ooh, that color works on you. I have a hat for that.', 'Fashion tip: pink goes with everything. Cheetah goes with everything else.'],
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
    id: 'nimbus', name: 'Nimbus Hollowell', species: 'owl', speciesName: 'Moon Owl',
    personality: 'Gentle lantern keeper', color: '#d9ccf5', accent: '#ffd36e',
    likes: ['button', 'honey_cap'], home: { x: 44, y: 11 }, radius: 1.5,
    bio: 'Keeper of the Afterglow Grove. Knows the name of every light.',
    lines: [
      ['Welcome, little wanderer. The grove loves a warm heart.', 'Each lantern remembers the moment it was born.'],
      ['The hillside glows brighter when kind things are done.', 'Pour a drink for a friend, and a light may drift my way.'],
      ['I will tell you a secret: the constellations are a map. Keep collecting.', 'Your lanterns are my favorites. Do not tell the others.'],
    ],
    phase: {
      morning: 'The lanterns sleep in the day. How lovely.',
      day: 'Quiet hours. Time for reading and tea.',
      evening: 'The first lights are drifting up now.',
      night: 'Look up. Isn\'t it wonderful?',
    },
    loved: 'A gift fit for the grove! My feathers are all aflutter.', liked: 'How kind. The grove will remember this.', meh: 'Thank you, dear. Every gift is a small light.',
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
];
