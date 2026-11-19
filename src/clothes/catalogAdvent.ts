// Twinkle Advent Calendar exclusives (Dec 1–24). Never sold. Handed out by advent.ts, one door a day,
// and kept in the wardrobe for good. Cheetah print appears once, as a tiny ribbon on a single purse.
import { def } from './build';

const A = { k: 'advent' as const };

def('hat', 'kawaii', 'adv_bauble_bow', 'Bauble Hair Bow', 'bow', '#ff8fb6', '#fff6d4', 0, 'A pink bow with a tiny gold bauble in the knot.', { tint: 'Bauble', deco: ['sparkle'], src: A });
def('hat', 'winter', 'adv_snowbell_muffs', 'Snowbell Earmuffs', 'earmuffs', '#fff0f6', '#ffd0e4', 0, 'Two cloud-soft muffs with a little bell between them.', { tint: 'Snowbell', src: A });
def('shoes', 'cozy', 'adv_cocoa_slippers', 'Cocoa Cloud Slippers', 'slipper', '#f3dcc4', '#ffb3cf', 0, 'Squishy slippers the colour of a warm cocoa, with little cloud ears.', { tint: 'Cocoa', deco: ['ears'], src: A });
def('face', 'kawaii', 'adv_sugarplum_specs', 'Sugarplum Heart Specs', 'heart', '#ffd0e4', '#fff6fb', 0, 'Heart-shaped specs in sugarplum pink. The world looks a bit sweeter.', { tint: 'Sugarplum', src: A });
def('shoes', 'holiday', 'adv_candy_boots', 'Candy Stripe Snow Boots', 'boot', '#ffffff', '#ff8fb6', 0, 'White snow boots with pink candy stripes and a fuzzy cuff.', { tint: 'Candy', pattern: 'stripes', ink: '#ff9ec0', deco: ['fur'], src: A });
def('hat', 'winter', 'adv_night_beanie', 'Pom-Pom Night Beanie', 'beanie', '#d9c6ff', '#fff6fb', 0, 'A lilac knit beanie with a snowy pom-pom and tiny white flakes.', { tint: 'Night', pattern: 'snowflakes', ink: '#ffffff', src: A });
def('top', 'cozy', 'adv_hearth_cardigan', 'Hearth Hug Cardigan', 'cardigan', '#ffd9c8', '#c9926a', 0, 'A cocoa-cream cardigan with wooden buttons and a heart pocket.', { tint: 'Hearth', deco: ['buttons', 'openfront', 'pocket', 'heart'], src: A });
def('bag', 'kawaii', 'adv_bellwish_purse', 'Bellwish Heart Purse', 'heartbag', '#ffb3cf', '#fff6ea', 0, 'A heart-shaped purse with one tiny spotted ribbon. Just a little accent.', { tint: 'Bellwish', trimPattern: 'cheetahpink', deco: ['bow'], src: A });
def('hat', 'princess', 'adv_eve_tiara', 'Eve Sugar Tiara', 'tiara', '#fff0b8', '#ffb3cf', 0, 'A little golden tiara with a pink sugar star.', { tint: 'Eve', deco: ['sparkle', 'jewel'], src: A });
def('dress', 'princess', 'adv_starfall_gown', 'Starfall Hush Gown', 'ballgown', '#ffd6e8', '#fff6d4', 0, 'The last door of the calendar: a blush ballgown covered in tiny gold stars. The best gift of all.', { tint: 'Starfall', pattern: 'stars', ink: '#ffe08a', deco: ['sparkle', 'bow'], src: A });
