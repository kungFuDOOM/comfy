// Friendship content tables: gift tastes, birthdays, warm-up dialogue, mailbox letters and max-heart rewards.
// Pure data (no game logic), keyed by villager id. Logic lives in friends.ts, UI in ui/friendsUi.ts.
// Player-facing text here never uses long dashes.

export const HEART_PTS = 20;
export const MAX_HEARTS = 10;
export const MAX_PTS = HEART_PTS * MAX_HEARTS;

export interface LetterGift { item?: string; n?: number; pips?: number }
export interface LetterDef {
  /** Heart level that delivers it. */
  at: number;
  subject: string;
  body: string;
  gift?: LetterGift;
  /** Gift taste this letter lets slip ("{r}" in the body becomes the item name). */
  reveal?: { kind: 'love' | 'like' | 'dislike'; item: string };
}

export interface Taste { love: string[]; like: string[]; dislike: string[] }

/** What the friend gets for reaching 10 hearts: a wardrobe piece (clothes/catalogFriends.ts) or a café recipe (data.ts, `friend`). */
export interface MaxReward { kind: 'cloth' | 'recipe'; id: string; blurb: string }

export interface FriendInfo {
  /** Real calendar birthday. */
  bday: { m: number; d: number };
  /** Extra tastes. Loved items are the villager's `likes` in data.ts, plus pies and cookies (loved by everyone). */
  like: string[];
  dislike: string[];
  /** Extra chat lines that appear as hearts grow. */
  mid: string[];
  close: string[];
  best: string[];
  /** What they say on their birthday when you wish them well, and a short line when they open a gift on the day. */
  bdayThanks: string;
  /** Birthday thank-you letter. */
  bdayLetter: string;
  reward: MaxReward;
  letters: LetterDef[];
}

export const FRIEND_INFO: Record<string, FriendInfo> = {
  mimsy: {
    bday: { m: 3, d: 12 },
    like: ['honey_cap', 'blossom_scone', 'cloud_cake', 'bow_pin', 'cocoa'],
    dislike: ['twig', 'minnow', 'plank'],
    mid: ['I put your name on the sunny seat. In pencil, so I can change it. I will not change it.', 'You always know when I need a cup. How do you do that?'],
    close: ['I dreamed about you and a very large pillow. It was a good dream.', 'I stayed awake an extra ten minutes to see you walk by. That is a lot, for me.'],
    best: ['You are the reason I get out of bed before ten. Sometimes. On Tuesdays.', 'If the island is waking up, it is partly because you are so cozy to wake up for.'],
    bdayThanks: 'You remembered! I was going to nap through it. Now I will nap AFTER it, happily.',
    bdayLetter: 'Thank you for my birthday. It was the least sleepy day of my whole year. I saved a slice of the feeling for you.',
    reward: { kind: 'cloth', id: 'fr_nap_nightcap', blurb: 'The Nap-Time Nightcap, knitted by Mimsy' },
    letters: [
      { at: 2, subject: 'A tiny hello', body: 'I saved you the sunny seat, mostly by sitting on it. Come say hi again soon. P.S. {r} is very nice. I just wanted you to know.', reveal: { kind: 'like', item: 'blossom_scone' }, gift: { item: 'honey', n: 2 } },
      { at: 4, subject: 'Slow thoughts', body: 'I thought of you while I was almost awake. That is a big deal. Also, a Pink Puff Latte would make my whiskers stand up with joy.', reveal: { kind: 'love', item: 'pink_latte' }, gift: { pips: 40 } },
      { at: 6, subject: 'A secret between pillows', body: 'Please do not tell anyone, but I cannot stand {r}. It makes me sneeze. Otherwise, you are perfect.', reveal: { kind: 'dislike', item: 'twig' }, gift: { item: 'milk', n: 3 } },
      { at: 8, subject: 'Two forks', body: 'I have been saving two forks for a cake with you. Bring a cake. Or do not. I will bring the smile anyway.', gift: { pips: 80, item: 'syrup', n: 2 } },
      { at: 10, subject: 'The softest thing', body: 'You are my favorite part of waking up. I made you something to wear while you nap, which you should do more. It is in your wardrobe now.', gift: { pips: 150 } },
    ],
  },
  zuzu: {
    bday: { m: 6, d: 30 },
    like: ['shell_charm', 'petal_pin', 'bow_pin', 'pearlshell', 'star_brew', 'cocoa'],
    dislike: ['twig', 'minnow', 'plank'],
    mid: ['Between us, you have an eye for color. I have an eye for everything, but yours is promising.', 'I rearranged the window display and thought of your style. Do not make it weird.'],
    close: ['Bestie, I have a rack in the back with your name on it. It is a very fancy rack.', 'Everyone asks who dresses you. I say, nobody, she is a natural. Then I say hats.'],
    best: ['You are officially the face of Spot and Bow. I printed no posters. Yet.', 'The mannequins asked about you. They miss your poses.'],
    bdayThanks: 'A birthday present?! You get me. I will wear this dramatically all day.',
    bdayLetter: 'Darling, my birthday was a runway because of you. Every day should be. Here is a little something sparkly.',
    reward: { kind: 'cloth', id: 'fr_runway_beret', blurb: "Dottie's Runway Spotted Beret" },
    letters: [
      { at: 2, subject: 'Darling!', body: 'The boutique is a better place with you in it. Also, {r} would look divine on the right person. Hint hint.', reveal: { kind: 'like', item: 'shell_charm' }, gift: { item: 'bow_pin' } },
      { at: 4, subject: 'Fashion bulletin', body: 'Fashion bulletin: a Spotted Mocha is the correct answer to most questions. Mine especially. That is all. Kisses.', reveal: { kind: 'love', item: 'spot_mocha' }, gift: { pips: 50 } },
      { at: 6, subject: 'Confidential', body: 'Do not gift me {r}. I will be gracious, but my eyebrow will do things. You have been warned.', reveal: { kind: 'dislike', item: 'minnow' }, gift: { item: 'shell_charm' } },
      { at: 8, subject: 'My muse', body: 'You are my muse. Do not let it go to your hat. I saved the best sunhat for your next visit.', gift: { pips: 100 } },
      { at: 10, subject: 'Backstage pass', body: 'You have earned the top rack, bestie. I made you my signature piece. Wear it loud. It is in your wardrobe.', gift: { pips: 150, item: 'petal_pin' } },
    ],
  },
  bramble: {
    bday: { m: 11, d: 18 },
    like: ['glowberry', 'moonpetal', 'seed_puffberry', 'seed_cottonbloom', 'honey'],
    dislike: ['pink_latte', 'bow_pin', 'syrup'],
    mid: ['Your watering is acceptable. I mean good. I mean, I noticed.', 'I named a sprout after you. It is the small stubborn one. That is a compliment.'],
    close: ['The garden has been more cheerful since you started stopping by. The beans too. They told me.', 'I left a clover by your door. It was an accident. On purpose.'],
    best: ['Fine. You are my best friend on the island. I have said it. Do not make me say it again.', 'I do not do hugs. But if I did, you would be the first. Hypothetically.'],
    bdayThanks: '...A present. For me. Hm. Thank you. Do not look at my face. It is doing a thing.',
    bdayLetter: 'Thank you for remembering my birthday. I did not tell anyone. You found out anyway. I think that is the nicest thing anyone has done. Shush.',
    reward: { kind: 'cloth', id: 'fr_clover_cardigan', blurb: 'The Clover Patch Cardigan, patched by Bramble' },
    letters: [
      { at: 2, subject: 'A note', body: 'Mind the sprouts. That is all. Also, {r} is acceptable to me. Not that I am telling you what to bring.', reveal: { kind: 'like', item: 'moonpetal' }, gift: { item: 'seed_puffberry', n: 2 } },
      { at: 4, subject: 'Garden notes', body: 'I do not write letters. This is a note about the puffberries. They like you. So, I suppose, do I. A fresh Puffberry would not go to waste.', reveal: { kind: 'love', item: 'puffberry' }, gift: { pips: 40 } },
      { at: 6, subject: 'Complaint', body: 'I dislike {r}. Strongly. It is too fussy. I only mention it so you can save your pips.', reveal: { kind: 'dislike', item: 'pink_latte' }, gift: { item: 'seed_cottonbloom', n: 2 } },
      { at: 8, subject: 'A clover crown', body: 'I wove you a clover crown but it fell apart. Here are the leftover clovers. Also a note: you are good company. That is all. Do not frame it.', gift: { pips: 80, item: 'cottonbloom' } },
      { at: 10, subject: 'Do not tell the weeds', body: 'You are a friend. I sewed you a cardigan from the softest things in the garden shed. It is in your wardrobe. It smells like rain. Shush.', gift: { pips: 150 } },
    ],
  },
  nimbus: {
    bday: { m: 12, d: 21 },
    like: ['moth', 'lantern_latte', 'star_brew', 'moonpetal'],
    dislike: ['minnow', 'twig', 'beans'],
    mid: ['I looked for you in the grove. Then I remembered you are not a lantern. I looked anyway.', 'Tell me about your day. All of it. Even the boring part. Especially that.'],
    close: ['The lanterns drift a little closer when you are near. I noticed.', 'I saved a soft spot by the altar. It is yours when you want to sit in the quiet.'],
    best: ['Of all the lights on the hillside, yours is my favorite to watch drift up.', 'You listen like the hush before the Bell. It is the best compliment I know.'],
    bdayThanks: 'On the longest night of the year, you came. I could not ask for a brighter light.',
    bdayLetter: 'My birthday is the longest night. Usually I spend it alone with the lanterns. This year I spent it with you. Thank you for the light.',
    reward: { kind: 'cloth', id: 'fr_duskfog_dress', blurb: 'The Duskfog Nightdress, spun from grove mist' },
    letters: [
      { at: 2, subject: 'Dusk note', body: 'Thank you for visiting at dusk. Most do not. {r} is a lovely thing to bring someone who keeps lanterns.', reveal: { kind: 'like', item: 'moonpetal' }, gift: { item: 'honey', n: 2 } },
      { at: 4, subject: 'A small light', body: 'Each lantern remembers the moment it was born. I think I will remember our chats. A Starlit Button is a thing I cherish, if you ever find one.', reveal: { kind: 'love', item: 'button' }, gift: { pips: 40 } },
      { at: 6, subject: 'Honest hush', body: 'I would rather not receive {r}. It does not feel right in the grove. Everything else, I love.', reveal: { kind: 'dislike', item: 'minnow' }, gift: { item: 'moth' } },
      { at: 8, subject: 'Constellation', body: 'I traced a small constellation on the altar and called it Your Name. It is not official, but the sky seems to agree.', gift: { pips: 90, item: 'button' } },
      { at: 10, subject: 'Fog and thanks', body: 'You are the warmest thing in a cold sky. I spun something from the grove mist for you to wear. It is in your wardrobe now.', gift: { pips: 150 } },
    ],
  },
  brioche: {
    bday: { m: 9, d: 9 },
    like: ['blossom_scone', 'cloud_cake', 'honey', 'milk', 'puffberry'],
    dislike: ['minnow', 'perch', 'koi'],
    mid: ['I baked a little extra. I always bake a little extra. It was for you, I decided just now.', 'Sit, sit! The blanket has room. The pastries have more room.'],
    close: ['Somebody asked me what my favorite pastry is. I said, a friend. Then I got embarrassed and ate three.', 'I keep a croissant in my left pocket just in case you walk by. It is warm right now.'],
    best: ['You are the jam to my croissant. Let me say it louder: THE JAM.', 'The whole meadow smells like butter and like you coming over the hill. Mostly butter. But you.'],
    bdayThanks: 'A gift on my birthday! The pastries will weep with joy. Not that pastries weep. They might.',
    bdayLetter: 'Thank you for the best birthday picnic. I ate cake for lunch, cake for dinner, and you for company. The last one I mean nicely.',
    reward: { kind: 'recipe', id: 'jam_croissant', blurb: "Brioche's Jammy Butter Croissant recipe" },
    letters: [
      { at: 2, subject: 'Warm hello', body: 'Come back anytime! There is always a pastry. Also a secret: {r} is very good with tea.', reveal: { kind: 'like', item: 'blossom_scone' }, gift: { item: 'milk', n: 3 } },
      { at: 4, subject: 'Picnic notes', body: 'The meadow tastes better with you around. If you ever bring a Puffberry Tart, I will probably cry. Happy tears. Buttery ones.', reveal: { kind: 'love', item: 'berry_tart' }, gift: { pips: 45 } },
      { at: 6, subject: 'A gentle warning', body: 'Please, no {r}. I am a baker. I am just not that kind of friend to fish. We are on good terms from afar.', reveal: { kind: 'dislike', item: 'perch' }, gift: { item: 'honey', n: 3 } },
      { at: 8, subject: 'Pocket pastry', body: 'I put a pastry in this envelope. By the time you read it, it may be a crumb. Treat the crumb with respect.', gift: { pips: 90, item: 'berry_tart' } },
      { at: 10, subject: 'My best recipe', body: 'I wrote down my favorite recipe just for you. The Jammy Butter Croissant. Bake it at the café oven. It fixes everything, as you know.', gift: { pips: 150 } },
    ],
  },
  oolie: {
    bday: { m: 4, d: 22 },
    like: ['cottonbloom', 'petal_pin', 'glowberry', 'moth', 'shell'],
    dislike: ['minnow', 'perch', 'beans'],
    mid: ['I pressed a petal in your honor. It is a very small honor. A petal-sized one.', 'You are easy to whisper to. That is not common.'],
    close: ['I told the blossoms about you. They rustled. I think that is a yes.', 'I wrote your name in my flower press. In very tiny letters. Please do not look.'],
    best: ['You are the only one I whisper loudly to. Which is still quite softly.', 'I think I am not shy around you. That is new. Do not make it a big deal. Please. A small one.'],
    bdayThanks: 'You... remembered? Oh. I did not expect that. I am going to cry a little. Quietly. Thank you.',
    bdayLetter: 'Thank you for my birthday. I pressed the day between two pages so I could keep it. You are in the middle.',
    reward: { kind: 'cloth', id: 'fr_pressed_tote', blurb: "Oolie's Pressed-Flower Tote" },
    letters: [
      { at: 2, subject: '...Hello', body: 'Um. This is a note. I do not write many. {r} is something I like very much. You did not hear that from me.', reveal: { kind: 'like', item: 'cottonbloom' }, gift: { item: 'blossom', n: 2 } },
      { at: 4, subject: 'Petals', body: 'I saved you a pressed petal. It is crumpled, but so am I, a little. A moonpetal would make me glow like one.', reveal: { kind: 'love', item: 'moonpetal' }, gift: { pips: 40 } },
      { at: 6, subject: 'A small confession', body: 'I... do not love {r}. It is the smell. Sorry. I am telling you so you do not feel bad if I look away politely.', reveal: { kind: 'dislike', item: 'perch' }, gift: { item: 'glowberry' } },
      { at: 8, subject: 'In my book', body: 'You are on the first page of my flower book. Right at the front. The best petals always are.', gift: { pips: 80, item: 'moonpetal' } },
      { at: 10, subject: 'Pressed with love', body: 'I made you a tote, covered in pressed flowers. I stitched every one myself. It is in your wardrobe. Whisper-soft, I hope.', gift: { pips: 150 } },
    ],
  },
  tuppi: {
    bday: { m: 8, d: 14 },
    like: ['blossom_scone', 'berry_tart', 'syrup', 'pink_latte', 'honey'],
    dislike: ['beans', 'twig', 'minnow'],
    mid: ['Hee! I saved you the wiggliest cupcake. It is still doing a little dance.', 'I have a new idea for pink frosting. It involves more pink. That is the whole idea!'],
    close: ['I dreamed about you again! You were a tiny cake with a tiny hat. Hee hee!', 'Pond-side baking is better when you are here to taste. I only ask for honest wiggles.'],
    best: ['You are the sprinkles on my cake, the cake on my plate, and the plate on my wiggle. Hee!', 'I will bake you a cake for every day you visit. Forever. That is a lot of cake. Hee hee!'],
    bdayThanks: 'A GIFT! On my birthday! I am going to wiggle until I fall into the pond. Thank you!',
    bdayLetter: 'Hee! Thank you for my birthday! I ate frosting for three meals. It is my official birthday diet. You made it extra pink!',
    reward: { kind: 'recipe', id: 'wiggle_cake', blurb: "Tuppi's Wiggle Cake recipe" },
    letters: [
      { at: 2, subject: 'Hee hello!', body: 'I made frosting in your favorite color. I do not know your favorite color. It is pink. Also, {r} is delicious. Just saying!', reveal: { kind: 'like', item: 'syrup' }, gift: { item: 'syrup', n: 2 } },
      { at: 4, subject: 'Wiggle wiggle', body: 'You make my frosting wiggle! I think that is a good thing. A Cloud Cake would make me squeal, you know. Squeal quietly. Hee!', reveal: { kind: 'love', item: 'cloud_cake' }, gift: { pips: 40 } },
      { at: 6, subject: 'Oops, a secret', body: 'I do not like {r}. It is not sweet at all! I tell you so we can stay friends forever. Hee hee.', reveal: { kind: 'dislike', item: 'beans' }, gift: { item: 'puffberry', n: 2 } },
      { at: 8, subject: 'Cake mail', body: 'There was a cake in this envelope but it wiggled away. Here is the receipt. It says: love, Tuppi.', gift: { pips: 90, item: 'cloud_cake' } },
      { at: 10, subject: 'My secret recipe', body: 'I am giving you my secret recipe! The Wiggle Cake! Bake it at the café oven. It must be wiggled. Do not tell the frosting I told you. Hee!', gift: { pips: 150 } },
    ],
  },
  marlo: {
    bday: { m: 2, d: 6 },
    like: ['pearlshell', 'koi', 'minnow', 'shell_charm', 'star_brew', 'button'],
    dislike: ['twig', 'plank', 'cottonbloom'],
    mid: ['Ahoy! I polished the lens, and then I polished it again, and I thought of you. Good lens.', 'The Bell hums a little louder when you visit. I think it is a fan.'],
    close: ['I stayed up for the sunrise and made a wish. It was a friend-shaped wish. You came.', 'I told the sea about you. It said, "I know!" The sea is a gossip.'],
    best: ['When the Bell rings again, I want you right here. I wrote it into the lighthouse log.', 'You make the light feel bigger. That is the biggest thing I can say from up here.'],
    bdayThanks: 'A gift on my birthday! My flippers are tingling. Thank you, thank you, thank you.',
    bdayLetter: 'Thank you for visiting on my birthday. I lit the lamp early so you would find your way. Next year, I will light it even earlier.',
    reward: { kind: 'cloth', id: 'fr_sea_boots', blurb: "Marlo's Sea-Glass Deck Boots" },
    letters: [
      { at: 2, subject: 'Ahoy-hoy', body: 'The sea says hello! Also, {r} is a thing I treasure. In case you ever pass a shore.', reveal: { kind: 'like', item: 'pearlshell' }, gift: { item: 'shell', n: 2 } },
      { at: 4, subject: 'Light-keeper log', body: 'Entry: a friend came by today. Entry: I was happy. Also, Dewdrop Shells make me flap with joy. Just so you know.', reveal: { kind: 'love', item: 'shell' }, gift: { pips: 45 } },
      { at: 6, subject: 'A salty confession', body: 'I would rather not get {r}. It makes the lighthouse smell strange. It is a small thing. I mention it with love.', reveal: { kind: 'dislike', item: 'twig' }, gift: { item: 'perch' } },
      { at: 8, subject: 'Sea glass', body: 'I found a pink piece of sea glass. They are rare. I am keeping it for you. In this envelope is a smaller one, just in case I get greedy.', gift: { pips: 90, item: 'pearlshell' } },
      { at: 10, subject: 'To the best crew', body: 'You are the best crew a lighthouse could ask for. I made you boots stitched from sea glass dreams. They are in your wardrobe. Mind the puddles.', gift: { pips: 150 } },
    ],
  },
};

/** Items everyone is thrilled with (pies and cookies carry `loved` in data.ts). Never listed as a personal taste. */
export const DISLIKE_REPLY: string[] = [
  'Oh. Um. Thank you, it is not quite for me, but I can tell you thought of me.',
  'Hm. That is not my favorite, but your kindness counts. Truly.',
];
export const DISLIKE_REPLY_WARM: string[] = [
  'Ha! Not my cup of tea, but coming from you, I will treasure the thought.',
  'Oh, silly, you know I am not fond of that. But I love that you tried!',
];
