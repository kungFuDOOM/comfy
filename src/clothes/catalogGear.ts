// Hats, shoes, bags and face pieces. These layer freely on top of whatever outfit you wear.
import { def, type Opt, type Var } from './build';
import type { Slot, StyleId } from './types';

const mk = (slot: Slot) => (style: StyleId, id: string, name: string, shape: string, color: string, trim: string, price: number, desc: string, o?: Opt, vars?: Var[]) =>
  def(slot, style, id, name, shape, color, trim, price, desc, o, vars);
const H = mk('hat'), S = mk('shoes'), G = mk('bag'), F = mk('face');

// ================= HATS =================
H('kawaii', 'pink_bow', 'Big Pink Hair Bow', 'bow', '#ff8fb6', '#ffffff', 35, 'A bow as big as a cookie.', { tint: 'Pink' },
  [{ t: 'Mint', color: '#8fe0c0' }, { t: 'Lilac', color: '#c9a8ff' }, { t: 'Butter', color: '#ffe27a' }, { t: 'Cloud', color: '#ffffff', trim: '#ffb3cf' }]);
H('kawaii', 'polka_ribbon', 'Polka Ribbon Bow', 'bow', '#fff0f6', '#ff9ec0', 35, 'Polka dots, two long ribbon tails.', { tint: 'Cream', pattern: 'polka', ink: '#ff8fb6', deco: ['tails'] },
  [{ t: 'Sky', color: '#eef8ff', ink: '#79bde8' }]);
H('kawaii', 'strawberry_beret', 'Strawberry Beret', 'beret', '#ff9ec0', '#fff4f0', 45, 'A soft beret with a stem on top.', { tint: 'Strawberry' },
  [{ t: 'Cream', color: '#fff0e0', trim: '#ff9ec0' }, { t: 'Lilac', color: '#d8c8f4' }]);
H('kawaii', 'cherry_clips', 'Cherry Hair Clips', 'clips', '#ff5f85', '#6fbf7e', 30, 'Two cherries for your bangs.', { tint: 'Cherry', deco: ['cherry'] });
H('kawaii', 'cloud_headband', 'Cloud Headband', 'headband', '#ffffff', '#bfe3f7', 35, 'A fluffy puff sits on top of your head.', { tint: 'Cloud', deco: ['cloud'] });
H('kawaii', 'heart_antenna', 'Heart Antenna Band', 'antennae', '#ffb3cf', '#ff6f9c', 35, 'Boing! Two tiny hearts, bouncing.', { tint: 'Pink', deco: ['hearts'] },
  [{ t: 'Star', color: '#ffe27a', trim: '#ffb3cf' }]);
H('cottage', 'flower_crown', 'Blossom Flower Crown', 'flowercrown', '#8fd49c', '#ffb3cf', 45, 'Fresh daisies and pink blossoms around a leaf ring.', { tint: 'Blossom' },
  [{ t: 'Sunny', color: '#8fd49c', trim: '#ffe27a' }, { t: 'Lilac', color: '#8fd49c', trim: '#d4b8ff' }]);
H('cottage', 'straw_bonnet', 'Straw Meadow Bonnet', 'sunhat', '#ffe9b8', '#ff9ec0', 50, 'Tied with a ribbon under your chin. Smells of hay.', { tint: 'Straw', deco: ['ribbon'] });
H('cottage', 'knit_bobble_beanie', 'Bobble Beanie', 'beanie', '#f6e6d2', '#ffb3cf', 40, 'Knitted with a big, bouncy pom-pom.', { tint: 'Oat' },
  [{ t: 'Rose', color: '#ffd1de' }, { t: 'Mint', color: '#cdeedd' }]);
H('cozy', 'earmuff_fluffs', 'Fluffy Earmuffs', 'earmuffs', '#ffd0dc', '#ffffff', 40, 'Two clouds for your ears.', { tint: 'Pink' },
  [{ t: 'Sky', color: '#c6e4fa' }, { t: 'Cream', color: '#fff0dc' }]);
H('cozy', 'cuddle_bear_hood', 'Teddy Bear Hood', 'bearhood', '#e4c8a6', '#fff0dc', 55, 'Round ears and a sleepy bear smile.', { tint: 'Cocoa' },
  [{ t: 'Cream', color: '#fff3e4' }]);
H('preppy', 'school_beret', 'Prep Beret', 'beret', '#5f77b3', '#ffffff', 45, 'Neat navy beret, tilted just so.', { tint: 'Navy' },
  [{ t: 'Berry', color: '#c47a96' }]);
H('preppy', 'headband_bow', 'Velvet Headband Bow', 'headband', '#ffd0dc', '#ff9ec0', 35, 'A polite headband with a polite bow.', { tint: 'Pink', deco: ['bow'] },
  [{ t: 'Navy', color: '#5f77b3', trim: '#ffffff' }]);
H('sporty', 'sport_cap', 'Sunny Day Cap', 'cap', '#ffffff', '#ff9ec0', 35, 'Adjustable, breathable, cheerful.', { tint: 'White' },
  [{ t: 'Mint', color: '#bdeee0', trim: '#ffffff' }, { t: 'Sky', color: '#bfe3f7', trim: '#ffffff' }]);
H('street', 'bucket_hat', 'Bucket Hat', 'bucket', '#ffd0ec', '#ffffff', 40, 'Soft brim, big attitude.', { tint: 'Bubblegum' },
  [{ t: 'Sage', color: '#cfe6cf' }, { t: 'Lilac', color: '#d8c8f4' }]);
H('street', 'bandana_wrap', 'Gingham Bandana', 'bandana', '#fff6f6', '#ff8fb6', 30, 'Tied in the back with a little knot.', { tint: 'Rose', pattern: 'gingham', ink: '#ff8fb6' });
H('y2k', 'butterfly_clips', 'Butterfly Clips', 'clips', '#aee0ff', '#ffb0d8', 30, 'Tiny shimmering wings in your hair.', { tint: 'Sky', deco: ['butterfly'] },
  [{ t: 'Pink', color: '#ffb0d8', trim: '#ffffff' }]);
H('goth', 'bat_wing_bow', 'Bat-Wing Bow', 'batbow', '#2b2433', '#7d5a96', 40, 'A spooky-cute bow with little bat wings.', { tint: 'Black' },
  [{ t: 'Plum', color: '#5a2f6a' }, { t: 'Pink', color: '#ff8fb6', trim: '#ffffff' }]);
H('goth', 'moon_tiara', 'Crescent Moon Tiara', 'tiara', '#d6c8f0', '#ffd36e', 60, 'A silver crescent that glows a little at night.', { tint: 'Silver', deco: ['moon'] });
H('pastelgoth', 'ghost_hood_beanie', 'Ghostie Beanie', 'beanie', '#ffffff', '#cdb8f4', 40, 'White and round with two tiny eyes.', { tint: 'White', deco: ['ghost'] });
H('witchy', 'witch_hat', 'Little Witch Hat', 'witch', '#5a4a8c', '#ffd36e', 65, 'Pointed, buckled, and bent just so.', { tint: 'Violet', deco: ['buckle'] },
  [{ t: 'Black', color: '#2b2433', trim: '#b88aff' }, { t: 'Forest', color: '#4c7a62' }, { t: 'Pink', color: '#ff8fb6', trim: '#ffffff' }]);
H('fairy', 'fairy_wreath', 'Dewdrop Wreath', 'flowercrown', '#c3e8c8', '#ffffff', 55, 'Tiny buds and drops of morning light.', { tint: 'Dew', deco: ['sparkle'] },
  [{ t: 'Rose', color: '#c3e8c8', trim: '#ffb3cf' }]);
H('princess', 'rose_tiara', 'Rose Tiara', 'tiara', '#ffd36e', '#ff8fb6', 70, 'Pearls, roses and a little sparkle.', { tint: 'Gold', deco: ['jewel'] },
  [{ t: 'Silver', color: '#e6e0f4', trim: '#bfe3f7' }]);
H('lolita', 'lace_headdress', 'Lace Frill Headdress', 'headband', '#fff8f4', '#ffb3cf', 45, 'A pillowy white frill with a pink ribbon.', { tint: 'Ivory', pattern: 'lace', ink: '#ffcfdc', deco: ['bow'] });
H('western', 'cowboy_hat', 'Cowgirl Hat', 'cowboy', '#e8c08a', '#c9805a', 60, 'Wide brim, bright star, easy gallop.', { tint: 'Honey', deco: ['star'] },
  [{ t: 'Pink', color: '#ffb0c8', trim: '#ffffff' }, { t: 'Cream', color: '#fff0dc', trim: '#e8a0a8' }]);
H('western', 'neckerchief', 'Western Bandana', 'bandana', '#ff8fa8', '#ffffff', 30, 'Paisley dots and a sunny-day knot.', { tint: 'Pink', pattern: 'polka', ink: '#ffffff' });
H('vintage', 'pillbox_hat', 'Pillbox Hat', 'beret', '#ffc9dc', '#ffffff', 50, 'Neat, round and ever so 1955.', { tint: 'Pink', deco: ['flat', 'ribbon'] });
H('disco', 'sparkle_headband', 'Starlight Headband', 'headband', '#e9b0ff', '#fff3a8', 40, 'Two golden stars bouncing above your hair.', { tint: 'Orchid', deco: ['stars'] });
H('business', 'newsboy_cap', 'Newsboy Cap', 'cap', '#d8c4b4', '#ffffff', 45, 'A flat cap for brisk walks to the café.', { tint: 'Mocha', deco: ['flat'] });
H('sailor', 'sailor_cap', 'Sailor Cap', 'sailor', '#ffffff', '#5b86c8', 40, 'A neat cap with a fluttery ribbon.', { tint: 'Navy' });
H('beach', 'beach_sunhat', 'Beach Sunhat', 'sunhat', '#fff4dc', '#8fd3ff', 45, 'Wide brim, wave-blue ribbon.', { tint: 'Wave', deco: ['ribbon'] },
  [{ t: 'Coral', color: '#fff4dc', trim: '#ffab94' }]);
H('winter', 'bobble_beanie', 'Snowfall Beanie', 'beanie', '#dff0ff', '#ffffff', 40, 'Soft knit with a snowball pom-pom.', { tint: 'Frost', pattern: 'snowflakes', ink: '#ffffff' },
  [{ t: 'Rose', color: '#ffe3ee' }]);
H('holiday', 'santa_hat', 'Cocoa-Time Santa Hat', 'santa', '#ff6f84', '#ffffff', 40, 'Fluffy trim, floppy tip.', { tint: 'Red' },
  [{ t: 'Mint', color: '#8fe0c0' }]);
H('rainy', 'rain_bucket', 'Splashy Rain Hat', 'bucket', '#ffe27a', '#ffffff', 40, 'Keeps the drizzle off your fringe.', { tint: 'Duckling', deco: ['long'] },
  [{ t: 'Sky', color: '#aee2f5' }]);
H('costume', 'cat_ears', 'Kitty Ear Headband', 'catears', '#fff1e6', '#ffb0a0', 35, 'Pointed little ears with pink insides.', { tint: 'Cream' },
  [{ t: 'Black', color: '#3a3446', trim: '#ff9ec0' }, { t: 'Grey', color: '#d6d6e0', trim: '#ffb3cf' }]);
H('costume', 'bunny_ear_band', 'Floppy Bunny Ears', 'bunnyears', '#fff4fa', '#ffb3cf', 40, 'Long ears with soft pink insides.', { tint: 'Cream', deco: ['lop'] },
  [{ t: 'Pink', color: '#ffc9dc', trim: '#fff' }, { t: 'Grey', color: '#d6d6e0', trim: '#ffb3cf' }]);
H('costume', 'frog_hood', 'Froggy Hood', 'froghood', '#a8e6b0', '#ffffff', 50, 'Two bulging eyes. Ribbit.', { tint: 'Lily' });
H('costume', 'bee_antennae', 'Bumble Antennae', 'antennae', '#ffe27a', '#3d3140', 35, 'Buzzy bobbing antennae.', { tint: 'Honey' });
H('costume', 'tophat_mini', 'Mini Magician Hat', 'tophat', '#3a3446', '#ff8fb6', 45, 'Rabbit not included.', { tint: 'Black' },
  [{ t: 'Pink', color: '#ffb3cf', trim: '#ffffff' }]);
H('boho', 'sunflower_crown', 'Sunflower Crown', 'flowercrown', '#a8d89a', '#ffd86e', 50, 'Golden sunflowers on a woven vine.', { tint: 'Sunny' });
H('cafe', 'baker_beret', 'Baker\'s Beret', 'beret', '#fff6ee', '#c9a28a', 40, 'Dusted with flour. Possibly.', { tint: 'Flour' });
H('grunge', 'faded_beanie', 'Faded Slouch Beanie', 'beanie', '#9a8fa8', '#d8d0dc', 35, 'Soft, slouchy, and worn in.', { tint: 'Dust' });

// ================= SHOES =================
S('cozy', 'rosy_mary_janes', 'Rosy Mary Janes', 'mary', '#ff9ec0', '#ffffff', 0, 'Round toes, one tiny strap. Your everyday shoes.', { src: { k: 'start' }, tint: 'Rosy' });
S('cottage', 'ballet_flats', 'Ballet Slipper Flats', 'ballet', '#ffd6e6', '#ffffff', 40, 'Satin ribbons that tie up the ankle.', { tint: 'Pink' },
  [{ t: 'Lilac', color: '#e0ccf6' }, { t: 'Cream', color: '#fff3e2' }]);
S('preppy', 'mary_jane_strap', 'Strappy School Shoes', 'mary', '#5f77b3', '#ffffff', 45, 'Shiny buckles that click on tile floors.', { tint: 'Navy' },
  [{ t: 'Cherry', color: '#d4607a' }, { t: 'Black', color: '#3a3446' }]);
S('sporty', 'sporty_sneakers', 'Cloud Sneakers', 'sneaker', '#ffffff', '#ff9ec0', 50, 'Bouncy soles and bubbly laces.', { tint: 'White' },
  [{ t: 'Mint', color: '#bdeee0', trim: '#ffffff' }, { t: 'Sky', color: '#bfe3f7', trim: '#ffffff' }, { t: 'Butter', color: '#fff0a8', trim: '#ffffff' }]);
S('street', 'high_tops', 'High-Top Cuties', 'hightop', '#ffd0ec', '#ffffff', 55, 'Tall laces and a star on each ankle.', { tint: 'Bubblegum' },
  [{ t: 'Lilac', color: '#d8c8f4' }]);
S('y2k', 'platform_sneaks', 'Platform Sparkle Sneakers', 'platform', '#ffb0d8', '#ffffff', 60, 'Two extra inches of fun.', { tint: 'Pink' },
  [{ t: 'Sky', color: '#aee0ff' }]);
S('punk', 'combat_boots', 'Cuddly Combat Boots', 'boot', '#3a3446', '#ff8fb6', 65, 'Tough boots with pink laces and zero meanness.', { tint: 'Black' },
  [{ t: 'Cherry', color: '#c4545e' }]);
S('goth', 'platform_boots', 'Moonlit Platform Boots', 'platform', '#2b2433', '#b88aff', 70, 'Chunky soles and tiny moon buckles.', { tint: 'Midnight', deco: ['moon'] },
  [{ t: 'Plum', color: '#4a2a5a' }]);
S('western', 'cowboy_boots', 'Cowgirl Boots', 'cowboyboot', '#d9a77a', '#fff0d8', 65, 'Stitched stars and a little heel.', { tint: 'Tan' },
  [{ t: 'Pink', color: '#ffa0b8' }, { t: 'Cream', color: '#fff0dc', trim: '#e8a0a8' }]);
S('beach', 'beach_sandals', 'Seashell Sandals', 'sandal', '#ffd6a8', '#ff9ec0', 35, 'Toes out, shells on.', { tint: 'Sand' },
  [{ t: 'Sky', color: '#bfe3f7' }, { t: 'Mint', color: '#bdeee0' }]);
S('rainy', 'rain_boots', 'Puddle Splashers', 'rainboot', '#ffe27a', '#ffffff', 45, 'Splash-proof boots with a duck on each ankle.', { tint: 'Duckling' },
  [{ t: 'Pink', color: '#ffb3cf' }, { t: 'Sky', color: '#aee2f5' }, { t: 'Mint', color: '#a8ecd0' }]);
S('winter', 'snow_boots', 'Fuzzy Snow Boots', 'boot', '#f4f6ff', '#ffffff', 60, 'Fleecy tops and sturdy grips.', { tint: 'Snow', deco: ['fur'] },
  [{ t: 'Rose', color: '#ffd6e6' }]);
S('pajama', 'bunny_slippers', 'Bunny Slippers', 'slipper', '#fff4fa', '#ffb3cf', 35, 'Little ears flop with every step.', { tint: 'Cream', deco: ['ears'] },
  [{ t: 'Pink', color: '#ffc9dc' }, { t: 'Cocoa', color: '#e4c8a6' }]);
S('business', 'loafers', 'Tidy Loafers', 'loafer', '#6a4a52', '#ffd36e', 50, 'Polished for important snacks.', { tint: 'Cocoa' },
  [{ t: 'Cream', color: '#f4e8d8' }, { t: 'Rose', color: '#d47a96' }]);
S('sailor', 'sailor_deck_shoes', 'Deck Shoes', 'sneaker', '#ffffff', '#5b86c8', 45, 'Rope-soled and sea-ready.', { tint: 'White' });
S('lolita', 'tea_party_heels', 'Tea-Party Shoes', 'mary', '#ffd6e6', '#ffffff', 55, 'Rounded toe with a bow on top.', { tint: 'Pink', deco: ['bow'] },
  [{ t: 'Sax', color: '#c4e6f8' }]);
S('disco', 'disco_boots', 'Groovy Glitter Boots', 'boot', '#e9b0ff', '#fff3a8', 60, 'Short boots that shimmer.', { tint: 'Orchid' });
S('costume', 'froggy_slippers', 'Froggy Slippers', 'slipper', '#a8e6b0', '#ffffff', 35, 'Goggly eyes on each toe.', { tint: 'Lily', deco: ['eyes'] });
S('cheetah', 'spotted_flats', 'Spotted Flats', 'ballet', '#f9deb0', '#ff9ec0', 50, 'A pair of tiny spots under every step.', { tint: 'Classic', pattern: 'cheetah' });

// ================= BAGS =================
G('kawaii', 'pink_shopping_bag', 'Pink Shopping Bag', 'shopping', '#ff9ec0', '#ffffff', 30, 'A round shopping bag with a heart on it.', { tint: 'Pink' },
  [{ t: 'Mint', color: '#9fe3c6' }, { t: 'Cream', color: '#fff0e0', trim: '#ffb3cf' }]);
G('cottage', 'picnic_basket', 'Picnic Basket', 'basket', '#e8c08a', '#fff6f6', 40, 'A woven basket lined in gingham.', { tint: 'Straw' });
G('cottage', 'daisy_tote', 'Daisy Tote Bag', 'tote', '#fff6e6', '#ffb3cf', 35, 'Canvas with a daisy chain.', { tint: 'Cream', pattern: 'flowers', ink: '#ffb3cf' },
  [{ t: 'Sky', color: '#eef6ff', ink: '#79bde8' }]);
G('kawaii', 'heart_purse', 'Heart Purse', 'heartbag', '#ff8fb6', '#ffffff', 45, 'A little heart that holds just a little bit.', { tint: 'Pink' },
  [{ t: 'Lilac', color: '#c9a8ff' }, { t: 'Butter', color: '#ffe27a' }]);
G('kawaii', 'bunny_backpack', 'Bunny Backpack', 'bearpack', '#fff4fa', '#ffb3cf', 55, 'Floppy ears, zippered pockets, room for snacks.', { tint: 'Cream', deco: ['bunnyears'] },
  [{ t: 'Pink', color: '#ffc9dc', trim: '#ffffff' }]);
G('cozy', 'bear_backpack', 'Teddy Backpack', 'bearpack', '#e4c8a6', '#fff0dc', 55, 'Round ears and a button nose.', { tint: 'Cocoa' },
  [{ t: 'Honey', color: '#f4d08a' }]);
G('preppy', 'school_satchel', 'School Satchel', 'satchel', '#c47a96', '#ffd36e', 50, 'Brass buckles and room for the whole spelling list.', { tint: 'Berry' },
  [{ t: 'Navy', color: '#5f77b3' }, { t: 'Cocoa', color: '#9a6a52' }]);
G('sporty', 'sport_pack', 'Sport Backpack', 'backpack', '#bfe3f7', '#ffffff', 45, 'Straps, zips and a tiny star keychain.', { tint: 'Sky' },
  [{ t: 'Mint', color: '#bdeee0' }, { t: 'Pink', color: '#ffc9dc' }]);
G('goth', 'coffin_purse', 'Moonbox Purse', 'purse', '#2b2433', '#b88aff', 50, 'A starry box purse with a moon clasp.', { tint: 'Midnight', deco: ['moon'] });
G('witchy', 'potion_basket', 'Potion Basket', 'basket', '#7a5aa8', '#ffd36e', 50, 'Tiny bottles rattle gently inside.', { tint: 'Violet' });
G('costume', 'plush_pal', 'Plush Pal', 'plush', '#fff4fa', '#ffb3cf', 45, 'A sleepy bunny that goes everywhere with you.', { tint: 'Bunny' },
  [{ t: 'Bear', color: '#e4c8a6', trim: '#fff0dc' }, { t: 'Duckling', color: '#ffe27a', trim: '#ffb0a0' }]);
G('holiday', 'balloon_bunch', 'Balloon Bunch', 'balloon', '#ff9ec0', '#ffe27a', 40, 'Three bobbing balloons on a ribbon.', { tint: 'Party' });
G('rainy', 'rain_umbrella', 'Daisy Umbrella', 'umbrella', '#ffb3cf', '#ffffff', 45, 'A scalloped parasol for sprinkles.', { tint: 'Pink' },
  [{ t: 'Sky', color: '#aee2f5' }, { t: 'Duckling', color: '#ffe27a' }]);
G('cafe', 'cake_box', 'Pastry Box', 'lunchbox', '#fff0e0', '#ff9ec0', 35, 'Tied with a pink string. Do not shake.', { tint: 'Cream' });
G('cheetah', 'cheetah_purse', 'Cheetah Pocket Purse', 'purse', '#f9deb0', '#ff9ec0', 50, 'A tiny spotted purse for tiny treasures.', { tint: 'Classic', pattern: 'cheetah' });

// ================= FACE =================
F('preppy', 'round_specs', 'Round Spectacles', 'round', '#ffd36e', '#ffffff', 30, 'Perfectly round and very scholarly.', { tint: 'Gold' },
  [{ t: 'Pink', color: '#ff9ec0' }, { t: 'Black', color: '#3a3446' }]);
F('kawaii', 'heart_shades', 'Heart Sunglasses', 'heart', '#ff7aa8', '#ffc9dc', 35, 'Tinted pink, framed with love.', { tint: 'Pink' },
  [{ t: 'Lilac', color: '#b88aff', trim: '#e6d6ff' }, { t: 'Mint', color: '#5fc9a0', trim: '#bdeee0' }]);
F('y2k', 'star_shades', 'Star Sunglasses', 'star', '#ffb0d8', '#fff3a8', 35, 'Shaped like twinkling stars. Very 2002.', { tint: 'Pink' },
  [{ t: 'Sky', color: '#8fd3ff' }]);
F('business', 'cateye_glasses', 'Cat-Eye Glasses', 'cateye', '#ff8fb6', '#ffffff', 35, 'Winged corners for a swish of confidence.', { tint: 'Rose' },
  [{ t: 'Tortoise', color: '#9a6a52' }, { t: 'Black', color: '#3a3446' }]);
F('business', 'square_specs', 'Square Reading Glasses', 'square', '#8a7aa8', '#ffffff', 30, 'Gentle frames for studying cloud shapes.', { tint: 'Plum' });
F('pajama', 'sleep_mask', 'Sleepy Eye Mask', 'sleepmask', '#fde8f4', '#e0c4f0', 25, 'Pushed up on your forehead, ready for a nap.', { tint: 'Dreamy', deco: ['eyes'] },
  [{ t: 'Mint', color: '#dcf6ec' }]);
F('winter', 'snow_goggles', 'Snow Goggles', 'goggles', '#ffb3cf', '#bfe3f7', 40, 'Pushed up on your forehead, ready for sledding.', { tint: 'Pink' },
  [{ t: 'Mint', color: '#8fe0c0' }]);
F('costume', 'whisker_paint', 'Whisker Face Paint', 'whiskers', '#8a6a7a', '#ffb3cf', 20, 'Three little whiskers on each cheek.', { tint: 'Brown' });
F('cheetah', 'cheetah_cateye', 'Spotted Cat-Eye Specs', 'cateye', '#f9deb0', '#6b4331', 45, 'Cat-eye frames with a spotted rim.', { tint: 'Classic', pattern: 'cheetah' });
