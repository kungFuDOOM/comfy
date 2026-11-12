// Dresses and one-piece looks. A dress replaces top + bottom while it is worn.
import { def, type Opt, type Var } from './build';
import type { StyleId } from './types';

const D = (style: StyleId, id: string, name: string, shape: string, color: string, trim: string, price: number, desc: string, o?: Opt, vars?: Var[]) =>
  def('dress', style, id, name, shape, color, trim, price, desc, o, vars);

// ---- cottage / cozy / kawaii ----
D('cottage', 'peony_pinafore', 'Peony Pinafore', 'pinafore', '#ffb3cf', '#ffffff', 80, 'Pink as a peony, with a blouse that smells of warm bread.', { tint: 'Peony', deco: ['collar', 'buttons'] },
  [{ t: 'Buttercup', color: '#ffe8a8' }, { t: 'Lilac', color: '#dcc8f4' }]);
D('cottage', 'gingham_sundress', 'Picnic Gingham Sundress', 'aline', '#fff6f6', '#ffffff', 90, 'Checked like a picnic blanket. Ants not included.', { tint: 'Rose', pattern: 'gingham', ink: '#ff8fb6', deco: ['bow'] },
  [{ t: 'Mint', color: '#f2fff9', ink: '#6fcaa6' }, { t: 'Sky', color: '#f2f9ff', ink: '#79bde8' }]);
D('cottage', 'meadow_smock', 'Meadow Daisy Smock', 'smock', '#f9f4dc', '#ffffff', 95, 'Tiny daisies all over, like the meadow tucked you in.', { tint: 'Cream', pattern: 'flowers', ink: '#ffa6c6' },
  [{ t: 'Blue', color: '#e9f4ff', ink: '#ffffff' }]);
D('cottage', 'mushroom_pinafore', 'Toadstool Pinafore', 'pinafore', '#ffe4d2', '#ffffff', 85, 'Polka-dotted like a very friendly toadstool.', { tint: 'Peach', pattern: 'polka', ink: '#ffffff', deco: ['collar'] });
D('cozy', 'oatmeal_knit_dress', 'Oatmeal Knit Dress', 'sweater', '#f3e3cf', '#ffd9c2', 85, 'A chunky sweater dress. Sleeves long enough to hide in.', { tint: 'Oat', deco: ['turtle'] },
  [{ t: 'Blush', color: '#ffd9e4' }, { t: 'Sage', color: '#d6ecd6' }]);
D('kawaii', 'strawberry_smock', 'Strawberry Shortcake Smock', 'smock', '#fff1f0', '#ffd0dc', 95, 'Covered in juicy strawberries with sugary seeds.', { tint: 'Cream', pattern: 'strawberry', ink: '#ff5f85', deco: ['ruffle'] },
  [{ t: 'Mint', color: '#e6fbf0' }]);
D('kawaii', 'cherry_picnic_dress', 'Cherry Pop Dress', 'aline', '#fff9ee', '#ff8fa8', 90, 'Pairs of cherries, swinging together. Very sweet.', { tint: 'Vanilla', pattern: 'cherry', ink: '#ff4f70', deco: ['collar'] });
D('kawaii', 'sprinkle_pop_dress', 'Sprinkle Pop Dress', 'smock', '#fff0fa', '#ffb3e0', 100, 'Rainbow sprinkles, no cleanup required.', { tint: 'Frosting', pattern: 'sprinkles', deco: ['ruffle'] },
  [{ t: 'Mint', color: '#e8fff4', trim: '#9fe3c6' }]);
D('kawaii', 'rainbow_cloud_dress', 'Rainbow Cloud Dress', 'aline', '#ffffff', '#ffe27a', 105, 'A rainbow tucked inside a fluffy cloud hem.', { tint: 'Rainbow', pattern: 'rainbow', deco: ['ruffle'] });
D('kawaii', 'bubblegum_hoodie_dress', 'Bubblegum Hoodie Dress', 'sweater', '#ffb0d8', '#ffffff', 95, 'Cuddly, bubblegum pink, with a hood for secret naps.', { tint: 'Bubblegum', deco: ['hood', 'pocket'] },
  [{ t: 'Grape', color: '#cdb4f4' }]);
D('lolita', 'tea_party_jsk', 'Tea Party Jumperskirt', 'pinafore', '#ffd6e6', '#ffffff', 130, 'Ruffles, ribbons and room for one more macaron.', { tint: 'Pink', deco: ['ruffle', 'bow', 'collar'] },
  [{ t: 'Sky', color: '#c4e6f8' }, { t: 'Wine', color: '#c78aa5' }]);
D('lolita', 'sugarplum_gown', 'Sugarplum Frill Gown', 'ballgown', '#e6d0f7', '#ffffff', 150, 'Layers of frills that go whoosh when you twirl.', { tint: 'Plum', deco: ['ruffle', 'bow'] },
  [{ t: 'Cream', color: '#fff3e2', trim: '#ffb3cf' }]);
D('princess', 'rosewater_gown', 'Rosewater Ballgown', 'ballgown', '#ffc9dc', '#ffffff', 160, 'A gown the colour of rose tea, with a bow on the back.', { tint: 'Rose', deco: ['ruffle', 'bow', 'sparkle'] },
  [{ t: 'Lilac', color: '#d8c4f6' }, { t: 'Aqua', color: '#bdeaf0' }]);
D('princess', 'starlit_ballgown', 'Starlit Ballgown', 'ballgown', '#cdb8ff', '#ffe27a', 175, 'Every star is hand-stitched. By stars.', { tint: 'Twilight', pattern: 'stars', ink: '#fff3a8', deco: ['sparkle'] });
D('kawaii', 'ballet_tutu_dress', 'Ballet Class Tutu', 'tutu', '#ffd9e6', '#ffffff', 110, 'Pointe shoes optional, twirling mandatory.', { tint: 'Petal', deco: ['bow'] },
  [{ t: 'Lilac', color: '#e0ccf6' }, { t: 'Cloud', color: '#fafcff', trim: '#bfe3f7' }]);

// ---- goth / witchy / fairy ----
D('goth', 'midnight_lace_gown', 'Midnight Lace Gown', 'gown', '#2b2433', '#7d5a96', 140, 'Black lace and a velvet sigh. Spooky, but cuddly.', { tint: 'Midnight', pattern: 'lace', ink: '#6a5a82', deco: ['ruffle', 'moonbrooch'] },
  [{ t: 'Plum', color: '#3d2148', ink: '#8a68a8' }]);
D('goth', 'bat_ruffle_pinafore', 'Bat-Button Pinafore', 'pinafore', '#27222f', '#ffffff', 115, 'A black pinafore with tiny bat buttons and a frilly blouse.', { tint: 'Raven', deco: ['collar', 'buttons', 'ruffle'] });
D('pastelgoth', 'moonmilk_dress', 'Moonmilk Dress', 'aline', '#eadfff', '#ffffff', 105, 'Crescent moons on lavender milk. Sleep is optional.', { tint: 'Lavender', pattern: 'moons', ink: '#a98fe0', deco: ['ruffle'] },
  [{ t: 'Mint', color: '#d6f6ea', ink: '#7cc9aa' }, { t: 'Pink', color: '#ffe0ef', ink: '#f08fb8' }]);
D('pastelgoth', 'bat_hug_dress', 'Batty Hug Dress', 'sweater', '#f4e2ff', '#d6b8f4', 100, 'Little bats hang out all over this soft sweater dress.', { tint: 'Orchid', pattern: 'bats', ink: '#8e72c8', deco: ['hood'] });
D('witchy', 'hedgewitch_robe', 'Hedgewitch Robe', 'gown', '#6a4a9c', '#ffd36e', 135, 'Starry and warm. Smells faintly of tea and thyme.', { tint: 'Violet', pattern: 'stars', ink: '#ffd36e', deco: ['cape'] },
  [{ t: 'Forest', color: '#4c7a62', ink: '#c9f0d0' }]);
D('witchy', 'cauldron_cutie_dress', 'Cauldron Cutie Dress', 'aline', '#8458b8', '#ffa85c', 110, 'A stirring purple dress with a pumpkin-orange hem.', { tint: 'Grape', deco: ['ruffle', 'belt'] });
D('fairy', 'dewdrop_fairy_dress', 'Dewdrop Fairy Dress', 'aline', '#dcf6e8', '#ffffff', 120, 'Wing-ready, petal-skirted, a little bit shimmery.', { tint: 'Dew', pattern: 'bubbles', ink: '#ffffff', deco: ['wings', 'sparkle'] },
  [{ t: 'Lilac', color: '#e6dcff' }, { t: 'Rose', color: '#ffe0ea' }]);
D('fairy', 'mossglow_gown', 'Mossglow Gown', 'gown', '#c3e8c8', '#8fcf9f', 135, 'Soft green, scattered with glowing wildflowers.', { tint: 'Moss', pattern: 'flowers', ink: '#fffbe0', deco: ['ruffle'] });

// ---- street, rocker, y2k, grunge, sporty, preppy ----
D('punk', 'plaid_riot_pinafore', 'Plaid Pep Pinafore', 'pinafore', '#34303e', '#ffffff', 105, 'Tartan with attitude and a safety pin or two.', { tint: 'Pink Plaid', pattern: 'plaid', ink: '#ff6f9c', deco: ['studs'] },
  [{ t: 'Mint Plaid', color: '#303a3a', ink: '#6fe0b8' }]);
D('punk', 'safety_pin_minidress', 'Safety-Pin Minidress', 'mini', '#2b2a35', '#ff8fb6', 100, 'Black, bold and held together by sparkly pins.', { tint: 'Black', deco: ['studs', 'belt'] });
D('y2k', 'butterfly_babydoll', 'Butterfly Babydoll', 'smock', '#ffb0d8', '#ffffff', 100, 'Frosty pink with a glitter bow. Flip-phone not included.', { tint: 'Pink', deco: ['bow', 'ruffle'] },
  [{ t: 'Sky', color: '#aee0ff' }]);
D('y2k', 'denim_pinny', 'Denim Pocket Pinny', 'pinafore', '#8fb8e8', '#fff', 95, 'Faded blue denim with a heart pocket.', { tint: 'Denim', deco: ['pocket', 'buttons'] });
D('grunge', 'flannel_shirt_dress', 'Flannel Shirt Dress', 'shirtdress', '#8d5468', '#2a1a2a', 90, 'Oversized, soft as a sigh, worn thin on purpose.', { tint: 'Berry', pattern: 'plaid', ink: '#2a1a2a', deco: ['collar', 'buttons'] });
D('sporty', 'tennis_twirl_dress', 'Tennis Twirl Dress', 'mini', '#ffffff', '#ff9ec0', 95, 'Pleated and breezy. Perfect for lazy rallies.', { tint: 'White', pattern: 'stripes', ink: '#ffe0ec', deco: ['belt'] },
  [{ t: 'Mint', color: '#f2fff9', trim: '#7fd9b4', ink: '#d6f5e8' }]);
D('street', 'hoodie_cloud_dress', 'Cloudy Hoodie Dress', 'sweater', '#c6cde6', '#ffffff', 100, 'Huge pocket, huge hood, huge comfort.', { tint: 'Fog', deco: ['hood', 'pocket'] },
  [{ t: 'Peach', color: '#ffd9c4' }]);
D('preppy', 'campus_pleat_pinafore', 'Campus Plaid Pinafore', 'pinafore', '#5b6a9c', '#ffffff', 110, 'Plaid, pleated, and ready for the first bell.', { tint: 'Navy', pattern: 'plaid', ink: '#ffffff', deco: ['collar', 'buttons'] },
  [{ t: 'Berry', color: '#9c5b7a' }]);
D('preppy', 'blazer_dress', 'Cardigan Shirt Dress', 'shirtdress', '#bcd4f0', '#ffffff', 105, 'Tidy collar, shiny buttons. Homework on time, probably.', { tint: 'Sky', deco: ['collar', 'buttons', 'belt'] });

// ---- western, vintage, disco, business, sailor, beach, seasonal ----
D('western', 'prairie_sundress', 'Prairie Sundress', 'aline', '#fff8ea', '#c9805a', 100, 'Gingham and ruffles, for dusty trails and sweet tea.', { tint: 'Sky', pattern: 'gingham', ink: '#78bde6', deco: ['ruffle'] });
D('western', 'fringe_dress', 'Fringe Swing Dress', 'mini', '#dba878', '#fff0d8', 105, 'Tan suede-feel with fringe that swishes when you skip.', { tint: 'Tan', deco: ['fringe', 'belt'] });
D('vintage', 'soda_shop_dress', 'Soda Shop Dress', 'aline', '#ffe3e3', '#ffffff', 110, 'Polka dots, a skinny belt, and a cherry on top.', { tint: 'Cherry', pattern: 'polka', ink: '#ff6f8f', deco: ['belt', 'collar'] },
  [{ t: 'Mint', color: '#e2fff2', ink: '#6fcaa6' }]);
D('disco', 'glitter_disco_mini', 'Glitterball Mini', 'mini', '#e9b0ff', '#fff3a8', 105, 'Twinkling stars to boogie in.', { tint: 'Orchid', pattern: 'stars', ink: '#fff3a8', deco: ['sparkle'] });
D('disco', 'sunburst_jumper', 'Sunburst Jumper', 'smock', '#ffcf7a', '#ff9e5c', 95, 'Golden hour in a dress. Bell-bottom spirit.', { tint: 'Honey', pattern: 'stripes', ink: '#ffb25c', deco: ['ruffle'] });
D('business', 'tweed_shift', 'Tweed Tea-Time Shift', 'shirtdress', '#e8d9cc', '#ffffff', 115, 'Tweedy, tidy and very, very sensible. With pockets.', { tint: 'Oat', pattern: 'argyle', ink: '#cdb7a4', deco: ['collar', 'buttons', 'belt'] });
D('sailor', 'harbor_sailor_dress', 'Harbor Sailor Dress', 'sailordress', '#ffffff', '#5b86c8', 100, 'Anchors aweigh! Big square collar, tiny red tie.', { tint: 'Navy', deco: ['sailor', 'bow'] },
  [{ t: 'Pink', color: '#ffe0ec', trim: '#ff8fb6' }, { t: 'Mint', color: '#e8fff4', trim: '#5fc9a0' }]);
D('beach', 'seaside_sundress', 'Seaside Sundress', 'aline', '#ffffff', '#8fd3ff', 95, 'Wave-blue stripes, salt-air soft.', { tint: 'Wave', pattern: 'stripes', ink: '#a7dcf8', deco: ['bow'] });
D('beach', 'swim_frill', 'Frilly Swim Dress', 'mini', '#ff9ec0', '#ffffff', 90, 'A skirted one-piece for splashing in the shallows.', { tint: 'Pink', deco: ['ruffle'] },
  [{ t: 'Mint', color: '#8fe0c0' }, { t: 'Sky', color: '#8fd3ff' }]);
D('beach', 'mermaid_scale_dress', 'Mermaid Shimmer Dress', 'aline', '#b8ece0', '#ffffff', 120, 'Pearly scales, ocean-fresh.', { tint: 'Lagoon', pattern: 'scales', ink: '#5fc2b0', deco: ['ruffle'] });
D('winter', 'snowberry_coat', 'Snowberry Coat Dress', 'coat', '#ffe3ee', '#ffffff', 135, 'Fluffy collar, big buttons, snug as a snowball.', { tint: 'Snowberry', deco: ['buttons', 'fur', 'belt'] },
  [{ t: 'Sky', color: '#d8ecff' }, { t: 'Mint', color: '#dcf6e8' }]);
D('rainy', 'puddle_raincoat', 'Puddle Raincoat', 'raincoat', '#ffe27a', '#ffffff', 100, 'Sunshine yellow with a hood for splishy-splashy days.', { tint: 'Duckling', deco: ['hood', 'buttons'] },
  [{ t: 'Pink', color: '#ffb3cf' }, { t: 'Sky', color: '#aee2f5' }, { t: 'Mint', color: '#a8ecd0' }]);
D('holiday', 'candy_cane_dress', 'Candy Cane Dress', 'aline', '#ffffff', '#ff6f84', 105, 'Peppermint stripes and a velvet bow.', { tint: 'Peppermint', pattern: 'stripes', ink: '#ff7f90', deco: ['bow', 'ruffle'] });
D('holiday', 'valentine_heart_dress', 'Sweetheart Dress', 'smock', '#ffd9e6', '#ffffff', 100, 'Hearts all the way down. A very good day to wear it.', { tint: 'Blush', pattern: 'hearts', ink: '#ff6f9c', deco: ['ruffle'] });
D('holiday', 'pumpkin_pop_dress', 'Pumpkin Patch Dress', 'smock', '#ffb26b', '#7a4a2a', 100, 'Round and orange and ever so cheerful.', { tint: 'Pumpkin', deco: ['ruffle', 'belt'] });
D('boho', 'wildflower_maxi', 'Wildflower Maxi', 'gown', '#fff2dc', '#ff9a6f', 120, 'Long and breezy, with flowers somebody picked just for you.', { tint: 'Sun', pattern: 'flowers', ink: '#ff8f6f' });
D('boho', 'sunset_peasant_dress', 'Sunset Peasant Dress', 'smock', '#ffcf9a', '#8a4a3a', 100, 'Embroidered hems in sunset colours.', { tint: 'Sunset', deco: ['ruffle', 'belt'] });
D('pajama', 'cloud_nightie', 'Cloud Nightie', 'smock', '#cfe6ff', '#ffffff', 80, 'So fluffy it counts as bedtime.', { tint: 'Sky', pattern: 'clouds', ink: '#ffffff', deco: ['collar'] },
  [{ t: 'Blush', color: '#ffd9e6' }]);
D('cafe', 'cafe_waitress_dress', 'Cafe Cutie Dress', 'aline', '#ffe0e8', '#ffffff', 100, 'A rosy uniform with a frilly white apron.', { tint: 'Rose', deco: ['apron', 'collar'] });

// ---- costume onesies ----
D('costume', 'bunny_onesie', 'Bunny Cuddle Onesie', 'onesie', '#fff4fa', '#ffb3cf', 120, 'Floppy ears, a pom-pom tail and zero regrets.', { tint: 'Cream', deco: ['hood', 'bunnyears', 'tail', 'zip'] },
  [{ t: 'Pink', color: '#ffc9dc', trim: '#fff' }, { t: 'Lilac', color: '#e0d0f6', trim: '#fff' }]);
D('costume', 'bear_onesie', 'Teddy Bear Onesie', 'onesie', '#e4c8a6', '#fff0dc', 120, 'A big warm hug with arms.', { tint: 'Cocoa', deco: ['hood', 'bearears', 'tail', 'zip'] },
  [{ t: 'Honey', color: '#f4d08a' }]);
D('costume', 'frog_onesie', 'Froggy Pond Onesie', 'onesie', '#a8e6b0', '#ffffff', 115, 'Hop hop! Bulging eyes on the hood.', { tint: 'Lily', deco: ['hood', 'frog', 'zip'] });
D('costume', 'bee_onesie', 'Bumble Bee Onesie', 'onesie', '#ffe27a', '#3d3140', 115, 'Buzzy stripes and tiny wings. Honey is a food group.', { tint: 'Honey', pattern: 'stripes', ink: '#4a3a4a', deco: ['hood', 'wings', 'zip'] });
D('costume', 'cat_onesie', 'Kitty Loaf Onesie', 'onesie', '#fff1e6', '#ffb0a0', 120, 'Ears up, tail curled, nap pending.', { tint: 'Cream', deco: ['hood', 'catears', 'tail', 'zip'] },
  [{ t: 'Grey', color: '#d6d6e0', trim: '#ffb3cf' }]);

// ---- cheetah accents (only a few, and these are the real spotted ones) ----
D('cheetah', 'cheetah_coat', 'Cheetah Cuddle Coat', 'coat', '#f9deb0', '#ff9ec0', 150, 'Spotted from collar to hem. A warm, bold hug.', { tint: 'Classic', pattern: 'cheetah', deco: ['buttons', 'fur', 'belt'] });
D('cheetah', 'rose_cheetah', 'Rosé Cheetah Dress', 'aline', '#ffc9dc', '#ffffff', 180, 'Pink cheetah print with a big bow. Show-stopping.', { tint: 'Rosé', pattern: 'cheetahpink', deco: ['bow', 'belt'] });
