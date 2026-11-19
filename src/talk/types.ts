// Villager conversation types. A leaf module (no imports) so voice files stay pure data.
// Player-facing text in the voices never uses long dashes.

export type TalkPhase = 'morning' | 'day' | 'evening' | 'night';
export type SeasonId = 'blossom' | 'sunsip' | 'cocoa' | 'snowfluff';
export type Sky = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'rainbow';

/** Calendar moments villagers talk about. Event chapters (tree, cookies...) only while Twinkle Season runs. */
export type Holiday =
  | 'halloween' | 'harvestSoon' | 'harvest' | 'feast'
  | 'twinkleSoon' | 'twinkle' | 'tree' | 'cookies' | 'cocoa' | 'giftweek' | 'xmasEve' | 'xmasDay' | 'afterglow'
  | 'newYearEve' | 'newYear' | 'valentine'
  | 'petalpicnic' | 'shoredays' | 'costumenight' | 'warmcup'; // the four small seasonal festivals (events/petalpicnic.ts...)

/** Lifetime stats (state.stats) a villager notices when they change between chats. */
export type Activity =
  | 'fished' | 'foraged' | 'harvested' | 'brewed' | 'baked' | 'crafted' | 'placed'
  | 'tried' | 'collected' | 'lanterns' | 'petcare' | 'styled' | 'served' | 'gifted';

/** One-time remarks about something new on the island. */
export type News = 'pet' | 'meadow' | 'blossom' | 'pond' | 'lighthouse' | 'pearl';

/** Small facts about the player a line can require (see engine.ts `cond`). */
export type Cond = 'hat' | 'noHat' | 'spots' | 'dress' | 'pet' | 'ribbon';

/**
 * A line: plain text, or text with options. A "|" splits it into separate taps.
 * Tokens: {pet} {friend} {when} {days} {item} {skill} {level} {season} {answer}.
 */
export type Line = string | LineObj;
export interface LineObj {
  t: string;
  /** Player reply choices: [button label, what the villager says back]. The reply may use "|" too. */
  ask?: [string, string][];
  /** Gift lines: only for these item ids (and preferred when they match). */
  item?: string[];
  /** Gift lines: only for drinks ('drink') or only for non-drinks ('gift'). */
  kind?: 'drink' | 'gift';
  /** Minimum hearts before this line can come up. */
  min?: number;
  when?: Cond;
}

export interface Voice {
  hello: {
    /** The very first chat ever. */
    first: Line[];
    /** First chat of the day, by friendship tier: 0-1 hearts, 2-4, 5-7, 8-10. */
    t: [Line[], Line[], Line[], Line[]];
    /** Chatting again later the same day. */
    again: Line[];
    /** After a lot of chatting in one day. */
    tired: Line[];
    /** On their own birthday. */
    birthday: Line[];
  };
  bye: Line[];
  byeNight: Line[];
  /** 'late' is the small hours (midnight to dawn). */
  phase: Record<TalkPhase | 'late', Line[]>;
  season: Record<SeasonId, Line[]>;
  sky: Partial<Record<Sky, Line[]>>;
  holiday: Partial<Record<Holiday, Line[]>>;
  /** December, before Christmas Eve. {days} = sleeps until Christmas. */
  countdown: Line[];
  /** Noticing what the player has been up to since the last chat. */
  did: Partial<Record<Activity, Line[]>>;
  /** A skill level-up this session. {skill} {level} */
  levelUp: Line[];
  /** Personality small talk by tier (lower tiers stay in the mix). */
  small: [Line[], Line[], Line[], Line[]];
  /** Little questions with reply choices. */
  ask: Line[];
  /** Later chats that mention an answer you gave. `{answer}` is the choice you picked, with the shouty punctuation trimmed. */
  recall: Line[];
  /** Talking about another friend (only once that friend lives on the island). Keyed by villager id. */
  gossip: Partial<Record<string, Line[]>>;
  /** Another friend's birthday is close. {friend} {when} */
  bdaySoon: Line[];
  gift: {
    love: Line[];
    like: Line[];
    meh: Line[];
    dislike: Line[];
    /** Already had a gift today. */
    again: Line[];
    /** Already had a drink today. */
    drinkAgain: Line[];
    /** A holiday cookie (pies keep their own words in events/pieLines.ts). */
    cookie: Line[];
    /** Later chats about today's (or yesterday's) gift. {item} */
    remember: Line[];
  };
  quest: {
    /** Their quest-log request is in progress. */
    active: Line[];
    /** The player has everything for it. */
    ready: Line[];
    /** They posted an errand on the bulletin board. */
    errand: Line[];
  };
  outfit: Line[];
  news: Partial<Record<News, Line>>;
  /** The traveling merchant is in town. */
  merchant: Line[];
}

/** One tap of a conversation. */
export interface Beat {
  text: string;
  /** A little sticker that pops by the portrait (weather, holiday, gift...). */
  mood?: string;
  ask?: [string, string][];
  /** Stable id of a question line, so the chosen reply can be saved in `talk.answers`. */
  qid?: string;
}
