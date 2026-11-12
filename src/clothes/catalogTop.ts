// Tops and bottoms. Mix and match: a dress replaces both, equipping either takes the dress off.
import { def, type Opt, type Var } from './build';
import type { StyleId } from './types';

const T = (style: StyleId, id: string, name: string, shape: string, color: string, trim: string, price: number, desc: string, o?: Opt, vars?: Var[]) =>
  def('top', style, id, name, shape, color, trim, price, desc, o, vars);
const B = (style: StyleId, id: string, name: string, shape: string, color: string, trim: string, price: number, desc: string, o?: Opt, vars?: Var[]) =>
  def('bottom', style, id, name, shape, color, trim, price, desc, o, vars);

// ================= TOPS =================
// -- cozy / cottage / kawaii --
T('cozy', 'cream_knit', 'Cream Cozy Knit', 'sweater', '#fff1e0', '#ffc9dc', 0, 'Your comfy everyday knit, with a heart stitched on.', { src: { k: 'start' }, tint: 'Cream', deco: ['heart'] });
T('cozy', 'cream_tee', 'Cloud-Soft Tee', 'tee', '#fff6ee', '#ffc9dc', 0, 'Simple, soft and always clean. Mostly.', { src: { k: 'start' }, tint: 'Cream' });
T('cozy', 'cable_knit_jumper', 'Cable-Knit Jumper', 'sweater', '#f6e6d2', '#ffffff', 60, 'A cuddly jumper with braids in it, like a hug in wool.', { tint: 'Oat', deco: ['turtle'] },
  [{ t: 'Rose', color: '#ffd1de' }, { t: 'Mint', color: '#d6efe2' }, { t: 'Lavender', color: '#e2d6f6' }]);
T('cozy', 'argyle_vest_knit', 'Argyle Knit Sweater', 'sweater', '#fff2ef', '#ffb3cf', 65, 'Diamond-patterned and delightfully tidy.', { tint: 'Blush', pattern: 'argyle', ink: '#ff9ec0', deco: ['collar'] },
  [{ t: 'Sky', color: '#eef6ff', ink: '#8fc4ee' }]);
T('cozy', 'bunny_ear_hoodie', 'Bunny Ear Hoodie', 'hoodie', '#fff0f6', '#ffb3cf', 75, 'The hood has ears. Obviously.', { tint: 'Pink', deco: ['hood', 'bunnyears', 'pocket'] },
  [{ t: 'Cloud', color: '#f4f6ff', trim: '#bcd0f4' }]);
T('kawaii', 'bear_paw_hoodie', 'Teddy Paw Hoodie', 'hoodie', '#e8c9a8', '#fff0dc', 75, 'Round ears on the hood and paw prints on the pocket.', { tint: 'Cocoa', deco: ['hood', 'bearears', 'pocket'] },
  [{ t: 'Cream', color: '#fff3e4', trim: '#e8c9a8' }]);
T('kawaii', 'strawberry_milk_tee', 'Strawberry Milk Tee', 'tee', '#ffe0e8', '#ffffff', 50, 'Pink as the last sip of a strawberry milk.', { tint: 'Milk', pattern: 'strawberry', ink: '#ff6f8f' });
T('kawaii', 'star_moon_pajama_top', 'Star & Moon Pajama Top', 'shirt', '#cdd8ff', '#ffffff', 55, 'Piped in white, dotted with sleepy stars.', { tint: 'Dusk', pattern: 'stars', ink: '#fff3a8', deco: ['collar', 'buttons'] });
T('kawaii', 'candy_stripe_cardigan', 'Candy-Stripe Cardigan', 'cardigan', '#fff6f8', '#ffb3cf', 65, 'Buttoned up in peppermint pink stripes.', { tint: 'Pink', pattern: 'stripes', ink: '#ffc6d8', deco: ['buttons', 'openfront'] });
T('cottage', 'puff_sleeve_blouse', 'Puff-Sleeve Blouse', 'blouse', '#fffaf2', '#ffd6e6', 60, 'Billowy sleeves, a lace collar, a very polite bow.', { tint: 'Cream', deco: ['collar', 'bow'] },
  [{ t: 'Sage', color: '#e6f4e6' }, { t: 'Rose', color: '#ffe6ee' }]);
T('cottage', 'daisy_cardigan', 'Daisy Chain Cardigan', 'cardigan', '#fff8c8', '#ffffff', 65, 'A buttercup cardigan with a tiny daisy on every button.', { tint: 'Buttercup', deco: ['buttons', 'openfront'] },
  [{ t: 'Sage', color: '#d8ecd6' }]);
T('cottage', 'gingham_shirt', 'Gingham Picnic Shirt', 'shirt', '#fff6f6', '#ffffff', 55, 'Checked, collared and ready for a blanket in the sun.', { tint: 'Rose', pattern: 'gingham', ink: '#ff8fb6', deco: ['collar', 'buttons'] },
  [{ t: 'Sky', color: '#f2f9ff', ink: '#79bde8' }]);
// -- preppy / sporty / street / y2k --
T('preppy', 'school_cardigan', 'School Day Cardigan', 'cardigan', '#f6d4dc', '#ffffff', 70, 'A neat cardigan with a crest pocket (a tiny cherry).', { tint: 'Rose', deco: ['buttons', 'openfront', 'pocket'] },
  [{ t: 'Navy', color: '#8394c4' }, { t: 'Cream', color: '#fff0dc' }]);
T('preppy', 'blazer_cute', 'Picture-Day Blazer', 'jacket', '#5f77b3', '#ffffff', 85, 'Smart and snug, with gold buttons.', { tint: 'Navy', deco: ['collar', 'buttons'] },
  [{ t: 'Rose', color: '#d47a96' }]);
T('sporty', 'varsity_jacket', 'Varsity Jacket', 'jacket', '#ffd0dc', '#ffffff', 85, 'Cuffed in cream, with a star on the back.', { tint: 'Pink', deco: ['stripehem', 'zip', 'star'] },
  [{ t: 'Mint', color: '#bdeee0' }, { t: 'Lilac', color: '#d8c8f4' }]);
T('sporty', 'sporty_jersey', 'Team Cloud Jersey', 'jersey', '#ffffff', '#8fd3ff', 55, 'Number zero, captain of naps.', { tint: 'Sky', pattern: 'stripes', ink: '#d8efff', deco: ['collar'] },
  [{ t: 'Pink', color: '#fff', trim: '#ff9ec0', ink: '#ffe0ec' }]);
T('street', 'cloud_hoodie', 'Cloud Hoodie', 'hoodie', '#c6cde6', '#ffffff', 70, 'Oversized and drifty, with a big front pocket.', { tint: 'Fog', deco: ['hood', 'pocket'] },
  [{ t: 'Peach', color: '#ffd9c4' }, { t: 'Sage', color: '#d2e6d2' }]);
T('street', 'sticker_bomber_tee', 'Sticker-Pop Tee', 'tee', '#ffffff', '#ff9ec0', 45, 'Covered in stickers of snacks and smiling stars.', { tint: 'White', pattern: 'hearts', ink: '#ffb3cf' });
T('y2k', 'butterfly_crop', 'Butterfly Crop Top', 'crop', '#ffb0d8', '#ffffff', 50, 'Sparkly, cropped and a little bit retro-future.', { tint: 'Pink', deco: ['bow'] },
  [{ t: 'Sky', color: '#aee0ff' }, { t: 'Lime', color: '#d6f5a8' }]);
T('y2k', 'fuzzy_zip_hoodie', 'Fuzzy Zip Hoodie', 'hoodie', '#ffd0ec', '#ffffff', 75, 'Fuzzy like a marshmallow, zipped to the chin.', { tint: 'Marshmallow', deco: ['hood', 'zip'] });
// -- rocker / grunge / goth --
T('punk', 'leather_jacket_cute', 'Moto Jacket (Faux, Fluffy)', 'jacket', '#34303e', '#c8c8d8', 95, 'Faux leather, silver studs, ever so soft inside.', { tint: 'Black', deco: ['zip', 'studs', 'collar'] },
  [{ t: 'Pink', color: '#ff8fb6', trim: '#ffffff' }]);
T('punk', 'band_tee_neon_lamb', 'Neon Lamb Band Tee', 'tee', '#2f2d3a', '#ff8fb6', 50, 'The Neon Lambs. They only exist in this shop, and they are loud.', { tint: 'Black', deco: ['logo:lamb'] });
T('punk', 'band_tee_cosmic_cat', 'Cosmic Catnap Band Tee', 'tee', '#f3e9ff', '#7a5ac8', 50, 'Cosmic Catnap: a band that only plays lullabies, loudly.', { tint: 'Lilac', deco: ['logo:star'] });
T('grunge', 'oversized_flannel', 'Oversized Flannel', 'shirt', '#9a5a72', '#2a1a2a', 60, 'Worn-in, tied around the waist or just worn. Soft as a cloud.', { tint: 'Berry', pattern: 'plaid', ink: '#2a1a2a', deco: ['collar', 'buttons'] },
  [{ t: 'Moss', color: '#6a8f72', ink: '#1f2a22' }]);
T('grunge', 'faded_stripe_tee', 'Faded Stripe Tee', 'tee', '#d8d0dc', '#8a7a98', 40, 'Soft from a thousand washes.', { tint: 'Dust', pattern: 'stripes', ink: '#a89cb8' });
T('goth', 'lace_trim_blouse', 'Lace-Trim Blouse', 'blouse', '#2f2938', '#cfc4e0', 70, 'Black with a delicate lace collar and moon-button cuffs.', { tint: 'Raven', pattern: 'lace', ink: '#4a4058', deco: ['collar', 'buttons', 'ruffle'] });
T('goth', 'bat_wing_cape', 'Bat-Wing Cape Top', 'tee', '#2b2433', '#7d5a96', 75, 'A tee with a swishy bat-wing cape. Totally harmless.', { tint: 'Midnight', deco: ['cape', 'bow'] });
T('pastelgoth', 'moon_phase_sweater', 'Moon-Phase Sweater', 'sweater', '#efe4ff', '#c9b0f2', 70, 'Crescents and full moons knitted in lilac.', { tint: 'Lavender', pattern: 'moons', ink: '#b79bea', deco: ['turtle'] },
  [{ t: 'Mint', color: '#dcf6ec', ink: '#8fd3b8' }]);
T('pastelgoth', 'ghostie_hoodie', 'Ghostie Hoodie', 'hoodie', '#ffffff', '#e0d0f6', 75, 'A friendly ghost on the front. Boo! (Hi!)', { tint: 'White', deco: ['hood', 'pocket', 'ghost'] });
// -- witchy / fairy / boho / western / vintage --
T('witchy', 'spell_book_cardigan', 'Spellbook Cardigan', 'cardigan', '#7a5aa8', '#ffd36e', 75, 'Deep violet, with star buttons and a hidden pocket for snacks.', { tint: 'Violet', deco: ['buttons', 'openfront', 'star'] });
T('witchy', 'moon_cape', 'Moonlit Cape', 'tee', '#5a4a8c', '#ffd36e', 80, 'A short cape clasped with a golden moon.', { tint: 'Twilight', deco: ['cape', 'moonbrooch'] });
T('fairy', 'petal_wrap_top', 'Petal Wrap Top', 'blouse', '#ffe0ea', '#ffffff', 60, 'Soft petals gather at the shoulders.', { tint: 'Rose', deco: ['ruffle', 'wings'] },
  [{ t: 'Mint', color: '#d8f5e6' }]);
T('boho', 'crochet_vest', 'Crochet Daisy Vest', 'vest', '#fff3d8', '#ffb86f', 55, 'Hand-crocheted by someone who loves you.', { tint: 'Sun', pattern: 'flowers', ink: '#ffb86f' });
T('boho', 'peasant_blouse', 'Peasant Blouse', 'blouse', '#fff8ee', '#e89a7a', 55, 'Embroidered hems and puff sleeves.', { tint: 'Cream', deco: ['ruffle', 'bow'] });
T('western', 'fringe_vest', 'Fringe Suede Vest', 'vest', '#d9a77a', '#fff0d8', 65, 'Fringe for swishing, a star for sheriffing.', { tint: 'Tan', deco: ['fringe', 'star'] },
  [{ t: 'Rose', color: '#e8a0a8' }]);
T('western', 'rodeo_shirt', 'Rodeo Gingham Shirt', 'shirt', '#fff3e6', '#c9805a', 55, 'Pearl-style snaps and a bandana-bright check.', { tint: 'Sky', pattern: 'gingham', ink: '#78bde6', deco: ['collar', 'buttons'] });
T('vintage', 'cardi_sweater_set', 'Sweater-Set Cardigan', 'cardigan', '#ffd9e6', '#ffffff', 70, 'Pearl buttons and a swishy collar, like 1955.', { tint: 'Pink', deco: ['buttons', 'openfront', 'collar'] });
// -- business / sailor / beach / winter / rainy / holiday / cafe / pajama --
T('business', 'silk_bow_blouse', 'Silky Bow Blouse', 'blouse', '#fff1f4', '#ff9ec0', 70, 'Ready for a meeting about snacks.', { tint: 'Blush', deco: ['bow', 'buttons'] });
T('business', 'tidy_blazer', 'Tidy Pink Blazer', 'jacket', '#ffc8d8', '#ffffff', 90, 'A blazer for important cupcake negotiations.', { tint: 'Pink', deco: ['collar', 'buttons'] },
  [{ t: 'Cream', color: '#f4e8d8' }]);
T('sailor', 'sailor_top', 'Sailor Seaside Top', 'blouse', '#ffffff', '#5b86c8', 55, 'Big square collar, little anchor button.', { tint: 'Navy', deco: ['sailor', 'bow'] },
  [{ t: 'Pink', color: '#fff', trim: '#ff8fb6' }]);
T('sailor', 'breton_stripe_tee', 'Breton Stripe Tee', 'tee', '#ffffff', '#5b86c8', 45, 'Stripes for walking on docks.', { tint: 'Navy', pattern: 'stripes', ink: '#6f96d6' });
T('beach', 'seashell_bikini_top', 'Seashell Swim Top', 'crop', '#ff9ec0', '#ffffff', 45, 'A sweet, frilly swim top for sunny days.', { tint: 'Pink', deco: ['ruffle'] },
  [{ t: 'Sky', color: '#8fd3ff' }]);
T('beach', 'hibiscus_shirt', 'Breezy Hibiscus Shirt', 'shirt', '#fff3e0', '#ff8fb6', 50, 'Open collar, tropical blooms, sunscreen smile.', { tint: 'Sand', pattern: 'flowers', ink: '#ff8fb6', deco: ['collar'] });
T('winter', 'snowflake_sweater', 'Snowflake Sweater', 'sweater', '#dff0ff', '#ffffff', 70, 'Knit in sky blue, with flakes that never melt.', { tint: 'Frost', pattern: 'snowflakes', ink: '#ffffff', deco: ['turtle'] },
  [{ t: 'Rose', color: '#ffe3ee' }]);
T('winter', 'puffer_vest', 'Puffy Puffer Vest', 'vest', '#ffd6e6', '#ffffff', 65, 'Warm as toast and puffed like a marshmallow.', { tint: 'Pink', deco: ['zip'] },
  [{ t: 'Mint', color: '#c8f0dc' }]);
T('rainy', 'rainy_day_poncho', 'Rainy-Day Poncho', 'vest', '#aee2f5', '#ffffff', 55, 'Clear sky colours for cloudy days.', { tint: 'Drizzle', deco: ['hood'] });
T('holiday', 'reindeer_sweater', 'Reindeer Sweater', 'sweater', '#ffe0e4', '#ff6f84', 70, 'A reindeer with a rosy nose, knitted just for you.', { tint: 'Rose', pattern: 'snowflakes', ink: '#ff8f9f', deco: ['turtle'] });
T('cafe', 'barista_shirt', 'Barista Button Shirt', 'shirt', '#fff4ee', '#c9a28a', 55, 'Rolled sleeves and a little cup stitched on.', { tint: 'Latte', deco: ['collar', 'buttons'] });
T('pajama', 'pajama_tee', 'Pillow-Soft Pajama Tee', 'tee', '#fde8f4', '#e0c4f0', 40, 'Moons and clouds: the best bedtime story.', { tint: 'Dreamy', pattern: 'clouds', ink: '#ffffff' });
T('lolita', 'cameo_frill_blouse', 'Cameo Frill Blouse', 'blouse', '#fff8f2', '#e8b0c8', 75, 'Ruffled all the way up, with a sweet little cameo.', { tint: 'Ivory', deco: ['collar', 'ruffle', 'bow'] });
T('costume', 'bumble_bee_vest', 'Bumble Vest', 'vest', '#ffe27a', '#3d3140', 50, 'Buzz buzz! Stripes and a fuzzy collar.', { tint: 'Honey', pattern: 'stripes', ink: '#4a3a4a', deco: ['wings'] });
T('disco', 'disco_halter', 'Disco Sparkle Top', 'crop', '#e9b0ff', '#fff3a8', 55, 'Catches the light, and everyone\'s eye.', { tint: 'Orchid', pattern: 'stars', ink: '#fff3a8' });

// ================= BOTTOMS =================
B('cottage', 'petal_skirt', 'Petal Pastel Skirt', 'skirt', '#ffd0e0', '#ffffff', 0, 'A swishy pastel skirt. Your everyday twirler.', { src: { k: 'start' }, tint: 'Petal' });
B('cottage', 'tiered_prairie_skirt', 'Tiered Prairie Skirt', 'maxi', '#fff4e8', '#ffd0b0', 65, 'Three tiers of soft cotton, for dancing in a field.', { tint: 'Cream', pattern: 'flowers', ink: '#ffb090' },
  [{ t: 'Sage', color: '#e6f2e2', ink: '#9bc79b' }]);
B('cottage', 'gingham_skirt', 'Gingham Picnic Skirt', 'skirt', '#fff6f6', '#ffffff', 55, 'Checked for a good time.', { tint: 'Rose', pattern: 'gingham', ink: '#ff8fb6' },
  [{ t: 'Mint', color: '#f2fff9', ink: '#6fcaa6' }, { t: 'Sky', color: '#f2f9ff', ink: '#79bde8' }]);
B('cozy', 'knit_midi_skirt', 'Knit Midi Skirt', 'maxi', '#f3e3cf', '#ffd9c2', 55, 'Ribbed, snug and swishy at the knee.', { tint: 'Oat' },
  [{ t: 'Rose', color: '#ffd9e4' }]);
B('kawaii', 'cherry_skirt', 'Cherry Pleat Skirt', 'pleated', '#fff9ee', '#ff8fa8', 55, 'Cherries on a pleated skirt. Ripe for twirling.', { tint: 'Vanilla', pattern: 'cherry', ink: '#ff4f70' });
B('kawaii', 'polka_pop_skirt', 'Polka Pop Skirt', 'skirt', '#ffe0ef', '#ffffff', 50, 'Dots, dots, and more dots.', { tint: 'Pink', pattern: 'polka', ink: '#ff9ec0' },
  [{ t: 'Mint', color: '#e2fbf0', ink: '#8fd9b8' }, { t: 'Butter', color: '#fff6d0', ink: '#ffcf6f' }]);
B('kawaii', 'rainbow_sprinkle_skirt', 'Sprinkle Mini Skirt', 'mini', '#fff0fa', '#ffb3e0', 55, 'Rainbow sprinkles, bouncy and sweet.', { tint: 'Frosting', pattern: 'sprinkles' });
B('kawaii', 'tutu_skirt', 'Cotton-Candy Tutu', 'tutu', '#ffd9e6', '#ffffff', 60, 'Light as air, sweet as spun sugar.', { tint: 'Pink' },
  [{ t: 'Lilac', color: '#e0ccf6' }, { t: 'Mint', color: '#cdf3e2' }, { t: 'Sky', color: '#cfe8fa' }]);
B('kawaii', 'strawberry_overalls', 'Strawberry Milk Overalls', 'overalls', '#ff9ec0', '#fff4f0', 70, 'Sweet overalls with buttons like little pearls.', { tint: 'Strawberry', deco: ['pocket', 'buttons'] },
  [{ t: 'Blueberry', color: '#a9c4f0' }, { t: 'Cream', color: '#fff0e0' }]);
B('preppy', 'plaid_pleat_skirt', 'Plaid Pleated Skirt', 'pleated', '#5b6a9c', '#ffffff', 60, 'School-day plaid that swishes just right.', { tint: 'Navy', pattern: 'plaid', ink: '#ffffff' },
  [{ t: 'Berry', color: '#9c5b7a' }, { t: 'Forest', color: '#4f7a62' }]);
B('preppy', 'cord_shorts', 'Corduroy Shorts', 'shorts', '#e8c9a8', '#ffffff', 45, 'Soft ridges and deep pockets.', { tint: 'Biscuit', deco: ['pocket'] },
  [{ t: 'Rose', color: '#f0b6c4' }]);
B('sporty', 'track_pants', 'Cloud Track Pants', 'pants', '#c6cde6', '#ffffff', 55, 'Side stripes. Fastest in the nap league.', { tint: 'Fog', deco: ['stripeside'] },
  [{ t: 'Pink', color: '#ffc9dc' }, { t: 'Black', color: '#3a3646' }]);
B('sporty', 'tennis_skort', 'Tennis Pleat Skort', 'pleated', '#ffffff', '#ff9ec0', 55, 'Pleats built for rally-ing.', { tint: 'White' },
  [{ t: 'Mint', color: '#f2fff9', trim: '#7fd9b4' }]);
B('street', 'cargo_pants', 'Pocket-Pal Cargo Pants', 'pants', '#c9d4b4', '#ffffff', 60, 'Pockets for snacks, notes and one tiny frog.', { tint: 'Sage', deco: ['pocket'] },
  [{ t: 'Sand', color: '#e6d6b4' }]);
B('street', 'baggy_jeans', 'Baggy Cloud Jeans', 'pants', '#a8c4ee', '#ffffff', 60, 'Roomy denim with a heart patch on the knee.', { tint: 'Denim', deco: ['pocket'] },
  [{ t: 'Rinse', color: '#cfdef6' }]);
B('y2k', 'low_flare_jeans', 'Flare Sparkle Jeans', 'pants', '#9cb8f0', '#ffffff', 60, 'Flared and glittery, like a 2003 daydream.', { tint: 'Blue', deco: ['flare', 'studs'] },
  [{ t: 'Pink', color: '#ffb0d8' }]);
B('y2k', 'micro_pleats', 'Candy Mini Skirt', 'mini', '#ffb0d8', '#ffffff', 50, 'Tiny and tiered, with a charm belt.', { tint: 'Pink', deco: ['belt'] },
  [{ t: 'Lime', color: '#d6f5a8' }]);
B('punk', 'ripped_jeans', 'Patched-Up Jeans', 'pants', '#6a78a8', '#ff8fb6', 60, 'Knees patched with felt hearts and stars.', { tint: 'Indigo', deco: ['patches', 'pocket'] },
  [{ t: 'Black', color: '#34303e' }]);
B('punk', 'plaid_punk_skirt', 'Plaid Stud Skirt', 'pleated', '#34303e', '#c8c8d8', 60, 'Tartan, studded belt, tiny safety pins.', { tint: 'Pink Plaid', pattern: 'plaid', ink: '#ff6f9c', deco: ['belt', 'studs'] },
  [{ t: 'Mint Plaid', color: '#303a3a', ink: '#6fe0b8' }]);
B('grunge', 'distressed_denim_skirt', 'Frayed Denim Skirt', 'mini', '#8fa8d6', '#ffffff', 55, 'Soft fray at the hem, patches on the pockets.', { tint: 'Denim', deco: ['pocket', 'patches'] });
B('goth', 'black_tulle_skirt', 'Black Tulle Skirt', 'tutu', '#2b2433', '#7d5a96', 65, 'Cloud-like black tulle with a violet underlayer.', { tint: 'Black' },
  [{ t: 'Plum', color: '#3d2148' }]);
B('goth', 'lace_hem_skirt', 'Lace-Hem Midi Skirt', 'maxi', '#2f2938', '#cfc4e0', 65, 'Midnight fabric with a snowy lace hem.', { tint: 'Raven', pattern: 'lace', ink: '#4a4058' });
B('pastelgoth', 'moon_skirt', 'Crescent Moon Skirt', 'skirt', '#eadfff', '#ffffff', 55, 'Moons on lilac. Very serene.', { tint: 'Lavender', pattern: 'moons', ink: '#a98fe0' },
  [{ t: 'Mint', color: '#d6f6ea', ink: '#7cc9aa' }]);
B('witchy', 'star_witch_skirt', 'Star-Spun Skirt', 'maxi', '#6a4a9c', '#ffd36e', 65, 'A violet skirt scattered with tiny stars.', { tint: 'Violet', pattern: 'stars', ink: '#ffd36e' });
B('western', 'denim_skirt_fringe', 'Denim Fringe Skirt', 'skirt', '#8fb0e8', '#fff0d8', 55, 'Western denim with a fringed hem.', { tint: 'Denim', deco: ['fringe', 'belt'] });
B('vintage', 'poodle_skirt', 'Sock-Hop Skirt', 'skirt', '#ffb0c8', '#ffffff', 70, 'A big swing skirt with a friendly pink pup appliqué.', { tint: 'Pink', deco: ['poodle', 'belt'] },
  [{ t: 'Sky', color: '#aee0f8' }]);
B('disco', 'bell_bottoms', 'Groovy Bell-Bottoms', 'pants', '#e9b0ff', '#fff3a8', 60, 'Wide bells for slide-dancing.', { tint: 'Orchid', deco: ['flare'] },
  [{ t: 'Honey', color: '#ffcf7a' }]);
B('business', 'tailored_skirt', 'Tidy Pencil Skirt', 'mini', '#ffd0dc', '#ffffff', 60, 'Neat as a pin, soft as a pillow.', { tint: 'Rose', deco: ['belt'] },
  [{ t: 'Charcoal', color: '#6a6678' }]);
B('business', 'wide_trousers', 'Wide-Leg Trousers', 'pants', '#f4e8d8', '#ffffff', 65, 'Flowy and tidy; suitable for important snack meetings.', { tint: 'Cream', deco: ['belt'] },
  [{ t: 'Navy', color: '#6f84b8' }]);
B('sailor', 'sailor_skirt', 'Anchor Pleat Skirt', 'pleated', '#5b86c8', '#ffffff', 55, 'Navy pleats with a white hem stripe.', { tint: 'Navy' },
  [{ t: 'Pink', color: '#ff9ec0' }]);
B('beach', 'swim_shorts', 'Boardwalk Shorts', 'shorts', '#8fd3ff', '#ffffff', 40, 'Quick-dry, splash-proof, summer-ready.', { tint: 'Sky', pattern: 'flowers', ink: '#ffffff' },
  [{ t: 'Coral', color: '#ffab94', ink: '#fff0e0' }]);
B('beach', 'sarong_wrap', 'Sunset Sarong', 'maxi', '#ffb69a', '#ffffff', 50, 'A breezy wrap in the colours of golden hour.', { tint: 'Sunset', pattern: 'stripes', ink: '#ffd0b0' });
B('winter', 'fleece_leggings', 'Fleece-Lined Leggings', 'pants', '#c6a8e8', '#ffffff', 50, 'Snug and toasty.', { tint: 'Lilac' },
  [{ t: 'Snow', color: '#f4f6ff' }]);
B('winter', 'tartan_wool_skirt', 'Tartan Wool Skirt', 'pleated', '#c4545e', '#ffffff', 60, 'Warm wool in festive red.', { tint: 'Cranberry', pattern: 'plaid', ink: '#2f6a50' });
B('rainy', 'rain_pants', 'Splash Pants', 'pants', '#ffe27a', '#ffffff', 45, 'Waterproof and puddle-ready.', { tint: 'Duckling' },
  [{ t: 'Pink', color: '#ffb3cf' }]);
B('lolita', 'bell_petticoat_skirt', 'Bell Petticoat Skirt', 'tutu', '#ffd6e6', '#ffffff', 70, 'Bouncy petticoat for the fullest twirls.', { tint: 'Pink', deco: ['ruffle'] },
  [{ t: 'Cream', color: '#fff3e2' }]);
B('fairy', 'petal_tulle_skirt', 'Petal Tulle Skirt', 'tutu', '#dcf6e8', '#ffffff', 65, 'Layered petals in dewy greens.', { tint: 'Dew' },
  [{ t: 'Rose', color: '#ffe0ea' }]);
B('boho', 'patchwork_skirt', 'Patchwork Maxi Skirt', 'maxi', '#ffd8a0', '#c9805a', 60, 'Every patch has a story. Some have two.', { tint: 'Sunset', pattern: 'checker', ink: '#ffb86f' });
B('holiday', 'candy_stripe_skirt', 'Candy-Stripe Skirt', 'skirt', '#ffffff', '#ff6f84', 55, 'Peppermint swirls for a festive swish.', { tint: 'Peppermint', pattern: 'stripes', ink: '#ff7f90' });
B('pajama', 'cloud_pj_pants', 'Cloud Pajama Pants', 'pants', '#cfe6ff', '#ffffff', 45, 'Printed with fluffy sleepy clouds.', { tint: 'Sky', pattern: 'clouds', ink: '#ffffff' },
  [{ t: 'Blush', color: '#ffd9e6' }]);
B('cafe', 'apron_skirt', 'Apron Skirt', 'skirt', '#c9a28a', '#ffffff', 50, 'Pockets for pencils, napkins and pastry tickets.', { tint: 'Latte', deco: ['apron'] });
B('costume', 'tail_shorts', 'Fluffy-Tail Shorts', 'shorts', '#fff0f6', '#ffb3cf', 50, 'Shorts with a cotton-puff tail.', { tint: 'Cloud', deco: ['tail'] });
B('cheetah', 'spotted_skirt', 'Little Spotted Skirt', 'skirt', '#f9deb0', '#ff9ec0', 80, 'A pop of spots on a swishy skirt.', { tint: 'Classic', pattern: 'cheetah' });
