// Friend Moves In: where each villager's little town house stands, what it looks like, and the words of the move-in
// scene and the housewarming letter. Pure data (nothing here touches the save or the world), so friends.ts, npc.ts,
// the scene and the renderer can all read it without importing each other.
import type { LetterGift } from './friendData';

/** A friend asks to move in once they reach this many hearts ("Dear friends"; the 10-heart "Best friends" rewards stay distinct). */
export const MOVE_IN_HEARTS = 8;
/** Every cottage blocks a 3x3 patch of tiles; the door faces south onto the row just below it. */
export const HOME_SIZE = 3;

export interface TownHomeSpec {
  /** Top-left tile of the 3x3 footprint. Fixed constants, so a cottage never jumps between sessions. */
  x: number; y: number;
  /** Cottage name on its little sign. */
  name: string;
  /** Roof and door colors (the walls are always cream). */
  roof: string; door: string;
  /** The friend's two asking lines, then what they say once the house is there. */
  ask: [string, string]; thanks: string;
  /** Housewarming letter and its small gift (items all exist in data.ts). */
  letter: { subject: string; body: string; gift: LetterGift };
}

/**
 * One spot per villager, all on open town grass: clear of the café (38-44, 30-34), the boutique (51-57, 30-34), your
 * house and yard, the square, the roads, the stations and every tree. Checked against the generated map.
 */
export const TOWN_HOMES: Record<string, TownHomeSpec> = {
  mimsy: {
    x: 34, y: 26, name: "Mimsy's Nap Nook", roof: '#f29aa6', door: '#ff9ec0',
    ask: ['*yawn* Hm. I have been thinking, which is rare before noon. Would it be silly to ask for a little house in town?',
      'A small one. Close enough to smell the beans from the café, far enough that nobody wakes me.'],
    thanks: 'It is the exact size of a nap. Thank you for always being the soft part of my day. Come visit, and bring pillows.',
    letter: { subject: 'A house the size of a nap', body: 'I moved in. I only fell asleep in the doorway twice. The sunny spot by the window is already my favorite, and the second favorite is you. Come and sit whenever you like. I will leave the kettle on, and my eyes mostly open.', gift: { pips: 50, item: 'honey', n: 2 } },
  },
  zuzu: {
    x: 55, y: 24, name: "Dottie's Spotted Nook", roof: '#ffb3cf', door: '#e58aa6',
    ask: ['Darling, a confession. The boutique is fabulous, but my closet has staged a little revolt. Might I have a house of my own nearby?',
      'Spots on the shutters, a hat for every hook. You would visit, of course. Often.'],
    thanks: 'Tiny, tasteful, a touch dramatic. Just like me! You are my favorite neighbor already, and I have not even unpacked.',
    letter: { subject: 'Come see the shutters', body: 'Darling, I am settled! There is a hat on every hook and a spotted cushion on every seat. The shutters are the prettiest thing on the street, after you. Visit soon, and wear something fabulous. Or something cozy. I will be gracious either way.', gift: { pips: 50, item: 'bow_pin' } },
  },
  bramble: {
    x: 31, y: 32, name: "Bramble's Clover Cottage", roof: '#e3b8e8', door: '#c9a8e8',
    ask: ['Ahem. I have been told, by myself, that it is good to live near friends. Hm. Is there a plot going spare? A small one. With dirt.',
      'I do not need much. A window for the sprouts. A door for you. That is all. Do not make a fuss.'],
    thanks: '...Fine. I am making a fuss on the inside. It is a good house. Thank you.',
    letter: { subject: 'A note about the house', body: 'The house is acceptable. Very acceptable. There is a window for the sprouts and a door for visitors. One visitor. You. I put the kettle by the clover pot, because that is where the kettle belongs. Do not tell anyone I wrote this twice.', gift: { pips: 50, item: 'seed_cottonbloom', n: 2 } },
  },
  nimbus: {
    x: 50, y: 24, name: "Nimbus's Fogside Nook", roof: '#c9b8f0', door: '#ffd36e',
    ask: ['Good evening. The fog and I were wondering if there might be a little house for me, somewhere quiet.',
      'I like it when the lamps come on. I would like to be near when they do. If that is all right.'],
    thanks: 'It is so soft here. I will leave a light on for you, in case you wander by at dusk.',
    letter: { subject: 'A light left on', body: 'I have a window now, and a lamp for it. I light it when the sky goes lavender, so you will know somebody is home and glad of you. There is a chair that fits two. Come when the stars are out.', gift: { pips: 50, item: 'honey_cap' } },
  },
  brioche: {
    x: 71, y: 26, name: "Brioche's Crumb Cottage", roof: '#f7c59a', door: '#d9834f',
    ask: ['Oh! I was wondering. The meadow is lovely, but I keep walking into town with warm baskets anyway. Could I have a little house close by?',
      'I would bake something every morning. Or most mornings. Or the mornings I remember.'],
    thanks: 'It smells like a promise already. I will put the kettle on. The oven is always glad to see you.',
    letter: { subject: 'The oven says hello', body: 'I moved in with three baskets and one very surprised rolling pin. The oven is warm, the window is wide, and there is a spare chair with your name on it. I baked you something to say thank you. Come and have a slice.', gift: { pips: 50, item: 'berry_tart' } },
  },
  oolie: {
    x: 23, y: 35, name: "Oolie's Petal Nook", roof: '#e9c8ff', door: '#ff9ec0',
    ask: ['H-hello. I wanted to ask something very small. A little house, in town? I could still visit the blossoms.',
      'It is quieter in my head when you are near. I think I would like to be nearer.'],
    thanks: 'Oh. It is so pretty. I will press a flower in every window. Thank you for being gentle with me.',
    letter: { subject: 'A flower in every window', body: 'I put a pressed blossom in each window, so the light comes through pink. It is very quiet here, and the good kind of quiet. You are welcome any time. You do not even have to talk. I would like that.', gift: { pips: 50, item: 'blossom', n: 2 } },
  },
  tuppi: {
    x: 27, y: 25, name: "Tuppi's Frosting Cottage", roof: '#ff9ec0', door: '#ff8fb6',
    ask: ['Hee! I have a giggly idea. What if I lived in town, close to where the frosting is?',
      'I would still visit the pond. The pond would understand. It is very patient.'],
    thanks: 'It looks like a cupcake! I love it. I will wave at you from the window every single day.',
    letter: { subject: 'It looks like a cupcake', body: 'Hee! I live in a cupcake now. Well, a cottage that thinks it is a cupcake. I wave from the window at everyone who passes, and some of them wave back. Come for cake. There is always cake. There may also be a spoon with your name on it.', gift: { pips: 50, item: 'cloud_cake' } },
  },
  marlo: {
    x: 68, y: 43, name: "Marlo's Seaglass Nook", roof: '#f4a9c4', door: '#a98fd6',
    ask: ['Ahoy-hoy. The lighthouse can keep its own light for a while. I was wondering about a little house nearer to everyone.',
      'I would hum to the Bell from afar. It would not mind. It is a sleeper, after all.'],
    thanks: 'A harbor for a lighthouse keeper! I will hang a bit of sea glass in the window, just for you.',
    letter: { subject: 'Sea glass in the window', body: 'Ahoy-hoy, neighbor! I hung my best sea glass in the window, the pink one in front. When the sun hits it, the whole house hums. The Bell is still sleeping, but it knows where I am. So do you. Come by.', gift: { pips: 50, item: 'shell', n: 2 } },
  },
};

/** The one the preview plays when no `?friend=` is given. */
export const DEFAULT_PREVIEW_FRIEND = 'mimsy';
