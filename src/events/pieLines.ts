// What each villager says when you hand them a pie. A leaf module (no imports) so npc.ts can use it safely.

const PIE: Record<string, string> = {
  mimsy: 'A PIE?! Oh. Oh, I am awake. I am so awake. This is the best day of my whole nap.',
  zuzu: 'Darling, a pie! It matches my whole aesthetic: golden, flaky, and a little bit dramatic. Iconic.',
  bramble: '...You baked this? For me? Hmph. Do not look. My whiskers are doing something silly.',
  nimbus: 'Still warm, even at dusk. The grove will smell like cinnamon for a week. Thank you, dear.',
  brioche: 'Pastry! Of all the things! You and I are going to be best friends forever, I just decided.',
  oolie: 'It is... so pretty. I am going to press a petal beside it so we can remember today. Thank you.',
  tuppi: 'Hee hee! A pie! Its crust is wiggling! No wait, that is me. Hee! Thank you thank you!',
  marlo: 'Pie on the lighthouse steps at sunset. Now THAT is what I call a treasure from the land.',
};
export const pieReply = (villager: string): string =>
  PIE[villager] ?? 'A pie! You are the sweetest. I am going to save the first bite for a very special moment.';

/** One cozy line each, used on feast day when you chat (they are all gathered around the table). */
const CHAT: Record<string, string[]> = {
  mimsy: ['Sit, sit. There is a seat for everyone. Especially you.', 'I have been awake since ten. Ten! For pie!'],
  zuzu: ['Table runner: pink gingham. Napkins: folded like hats. I regret nothing.', 'Fashion tip: wear stretchy things to a feast.'],
  bramble: ['The pumpkins are from my garden. Do not make a fuss. ...Do you like them?', 'The leaves came down on purpose. I asked them to.'],
  nimbus: ['I came early, even before dusk. For you. And for pie.', 'The lanterns look like little suns tonight.'],
  brioche: ['I brought eleven kinds of bread. Just a few. Just in case.', 'Gather close. The warm things are best shared.'],
  oolie: ['The candles flicker like little wings. I like it. Shh.', '*whispers* There is cinnamon in the air. It is my new favorite smell.'],
  tuppi: ['Hee! I made a cake shaped like a pie! It is confused!', 'Everybody is here! Everybody! Wiggle wiggle!'],
  marlo: ['I left the lighthouse lamp on automatic tonight. The Bell can nap by itself.', 'Never seen so many cozy sweaters. It is a sea of knit!'],
};
export const feastChat = (villager: string): string[] => CHAT[villager] ?? ['Happy feast! Isn\'t this just the coziest thing?'];
