// Twinkle Season words: the Eve and Day gatherings, gift-exchange replies and chatter. A leaf module (no imports).

export interface Line { who: string; text: string }

export const EVE_OPEN: Line[] = [
  { who: 'mimsy', text: 'Shhh, listen. Snow does not make a sound, but it is the loudest quiet of the whole year. It is Christmas Eve, and you are all here!' },
  { who: 'mimsy', text: 'The tree has been waiting for tonight. One wish each, and then we light it. No peeking at the presents, Tuppi!' },
];
export const EVE_WISH: Record<string, string> = {
  zuzu: 'I wish for exactly one more hat. Fine, two. It is a wish, it can be greedy!',
  bramble: 'I wish the frost goes easy on the sprouts. ...And that you stay warm. Hmph. Do not read into it.',
  nimbus: 'I wish every window on the hill glows tonight. Mine is already doing its best.',
  brioche: 'I wish for a table that is never empty and a sofa that is never cold. Mostly the sofa.',
  oolie: 'I wish... quietly. It is about you, and it is a good one. That is all you get.',
  tuppi: 'I wish for sprinkles! On everything! On the snow! On Bramble! Wiggle!',
  marlo: 'I wish the sea stays calm and the lighthouse stays bright. And that you visit more. Both are important.',
  mimsy: 'And I wish for one more year of this: the whole island in one place, and you in the middle of it.',
};
export const EVE_GROUP: Line[] = [
  { who: 'mimsy', text: 'Ready? Lights on the count of three. One... two...' },
  { who: 'mimsy', text: 'TWINKLE!  (Oh, it is so pretty. I am not crying. It is snow. On the inside.)' },
];
export const EVE_CLOSE: Line = { who: 'mimsy', text: 'Merry Christmas Eve, dear friend. Take a little glow home, and be here tomorrow for the big day!' };

export const DAY_OPEN: Line[] = [
  { who: 'mimsy', text: 'Merry Christmas! Everyone, everyone: gifts, then cocoa, then more gifts. That is the whole schedule.' },
  { who: 'mimsy', text: 'This year every one of us has one little thing to give you. Nobody argued about it. Much.' },
];
export const DAY_GIFT: Record<string, string> = {
  zuzu: 'It is a scarf, but a dramatic one. Wear it like an entrance. Merry Christmas, bestie!',
  bramble: 'I grew you a tiny evergreen. It is in my pocket. It is a very small tree. It is yours. ...Merry Christmas.',
  nimbus: 'A star I caught on the way down the hill. Do not tell the sky. Merry Christmas, dear.',
  brioche: 'Cinnamon bread, still warm, and the best seat by the fire. Merry Christmas, you!',
  oolie: 'A pressed snow-blossom, for your book of good days. Merry Christmas. Quietly.',
  tuppi: 'A cookie shaped like you! It has sprinkle hair! Merry Christmas wiggle wiggle wiggle!',
  marlo: 'A seashell with the sea inside it. Hold it to your ear on a quiet night. Merry Christmas, friend.',
  mimsy: 'And from me: a spot at every table on this island, forever. Merry Christmas, my favourite newcomer.',
};
export const DAY_GROUP: Line[] = [
  { who: 'mimsy', text: 'Together now, on three: one, two...' },
  { who: 'mimsy', text: 'MERRY TWINKLE CHRISTMAS!  (Even Bramble said it. I heard him. Everybody heard him.)' },
];
export const DAY_CLOSE: Line = { who: 'mimsy', text: 'Now go and be cozy. The snow will keep the island warm until the season ends.' };

export const THANKS_FALLBACK = 'You made this island feel like home. Merry Christmas!';

/** A little something back, said by the friend you gave a gift to during the gift exchange (week 4). */
const BACK: Record<string, string> = {
  mimsy: 'Oh! For me? Here, take this. I made it during a nap, which is the best time to make things.',
  zuzu: 'Darling! Gift for a gift: a little charm. It goes with everything. I checked.',
  bramble: '...Fine. Here. It was going to be a leaf. It is a candy charm now. Do not tell anyone.',
  nimbus: 'Take this, dear. It glowed in my pocket all night, so it must be yours.',
  brioche: 'Swap time! This is the second best thing I own. The first is the blanket. You cannot have the blanket.',
  oolie: 'I... brought you something too. A tiny charm. It is shy, like me. It likes you.',
  tuppi: 'Yay yay yay! Here! I wrapped it three times and then unwrapped it by accident! Wiggle!',
  marlo: 'A charm from the lighthouse drawer. It has been waiting for someone good. That is you.',
};
export const giftBack = (villager: string): string => BACK[villager] ?? 'What a lovely gift! Here is a little something back.';

/** One cozy line each on Christmas Eve / Day, when everybody is gathered at the tree and you chat. */
const CHAT: Record<string, string[]> = {
  mimsy: ['Stand close to the tree. It is the warmest spot on the island. Do not tell the fountain.', 'I have been awake since ten, for snow!'],
  zuzu: ['The tree is wearing pink. I approve. It has taste.', 'I tried on a scarf for each of you. Yours is the best one.'],
  bramble: ['The tree is real, you know. I checked. I talked to it. We have an understanding.', 'It is too cold for sprouts and too nice for complaining.'],
  nimbus: ['The star on top is lovely, but the real ones are nicer. Look up tonight.', 'I came before dusk. Do not make it a thing.'],
  brioche: ['Hot cocoa, a warm hat, and a friend. What else is there? Bread. There is bread.', 'The best presents are the ones that smell like cinnamon.'],
  oolie: ['The lights flicker like little wings. I like them. Shh.', '*whispers* The snow is very good at keeping secrets.'],
  tuppi: ['Is it time for presents? Is it? Now? Now? Now?', 'I put sprinkles on the tree. Do not look at the left side.'],
  marlo: ['Snow on the sea is the quietest thing. Even the gulls whisper.', 'A tree in a square, a friend beside it. Ten out of ten.'],
};
export const twinkleChat = (villager: string): string[] => CHAT[villager] ?? ['Happy Twinkle Season! Is it not the coziest thing?'];
