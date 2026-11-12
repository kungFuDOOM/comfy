// The Harvest Hush Feast script: who says what around the table. A leaf module (no imports).

export interface FeastLine { who: string; text: string }

/** Opening toast by the host. */
export const FEAST_OPEN: FeastLine[] = [
  { who: 'mimsy', text: 'Everyone, everyone, shhh. Cocoa Leaf is almost over, the pies are warm, and we are all here. That never happens!' },
  { who: 'mimsy', text: 'The Hush Bell is still asleep, but this island is waking up. So let us say thank you, one friend at a time.' },
];

/** What each friend says. `pie` is used when you have given them a pie during the event. */
export const FEAST_THANKS: Record<string, { text: string; pie: string }> = {
  zuzu: {
    text: 'Darling, you brought colour back to this island. Also you wear hats like you mean it. Thank you!',
    pie: 'That pie you gave me is going in my diary, between the hats. Thank you for all of it, bestie!',
  },
  bramble: {
    text: 'Fine. I will say it once. The garden is happier since you showed up. So am I. Do not tell the sprouts.',
    pie: 'Remember the pie? I ate it slowly. Twice. ...Thank you. That is all. Pass the gravy.',
  },
  nimbus: {
    text: 'I only drift in at dusk, but today I stayed. Because of you. Every lantern on the hill is a little thank you.',
    pie: 'Your pie warmed the whole grove. The lanterns glowed extra pink that night. Thank you, dear.',
  },
  brioche: {
    text: 'You turned up with a smile and, honestly, that is the best pastry. Thank you for sitting at my blanket!',
    pie: 'A pie from YOU, at MY table. I might cry into the gravy. Pass a napkin, please. Thank you!',
  },
  oolie: {
    text: 'I am not good at... speeches. But you are the reason I came out of the blossoms. Thank you. Quietly.',
    pie: 'I kept a crumb of your pie in my pressed-flower book. It is a very good page. Thank you.',
  },
  tuppi: {
    text: 'You are the sprinkles on all my cakes! Hee! I mean it! Thank you, thank you, thank you, wiggle!',
    pie: 'Your pie was so good I baked a cake about it. It is still wiggling. Thank you, friend!',
  },
  marlo: {
    text: 'You climbed all the way up to my lighthouse and made the light brighter. Thank you, from every flipper.',
    pie: 'Pie and a sunset: perfect. You brought both. Thank you, friend of the Bell.',
  },
  mimsy: {
    text: 'And you, dear newcomer, who floated in on a balloon: thank you for waking us up. Gently. Like a good alarm.',
    pie: 'I told everyone about your pie. Twice. Maybe five times. Thank you, from the sleepiest heart on the isle.',
  },
};
export const FEAST_THANKS_FALLBACK = {
  text: 'You made this island feel like home. Thank you for every kind little thing!',
  pie: 'Your pie made my whole week. Thank you for being such a good friend!',
};

/** The all-together moment. */
export const FEAST_GROUP: FeastLine[] = [
  { who: 'mimsy', text: 'Right! On three! One... two...' },
  { who: 'mimsy', text: 'THANK YOU, FRIEND!  (That was everyone. Even Bramble. Especially Bramble.)' },
];

export const FEAST_CLOSE: FeastLine = {
  who: 'mimsy',
  text: 'Now eat, eat! And take these home: a little something from all of us. Happy Harvest Hush!',
};
