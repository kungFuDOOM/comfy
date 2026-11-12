// Seasonal event exclusives: never sold. Each piece is handed out by an event's activities while the event is on
// (see events.ts / events/harvest.ts) and stays in the wardrobe for good.
import { def } from './build';

const E = (event: string) => ({ k: 'event' as const, event });

// ---- Harvest Hush Feast (Nov 20 to Nov 30, 2026) ----
const H = E('harvest');
def('top', 'cozy', 'hh_pumpkin_knit', 'Pumpkin Spice Knit Sweater', 'sweater', '#ffc38f', '#fff1dc', 0, 'A chunky, honey-orange sweater with a stitched pumpkin on the front.', { tint: 'Pumpkin', deco: ['turtle', 'heart'], src: H });
def('top', 'cozy', 'hh_maple_cardigan', 'Maple Leaf Cardigan', 'cardigan', '#ff9f8a', '#fff1dc', 0, 'Rosy maple red with wooden buttons and two big pockets.', { tint: 'Maple', deco: ['buttons', 'openfront', 'pocket'], src: H });
def('top', 'cozy', 'hh_cocoa_cardigan', 'Cocoa Cream Cardigan', 'cardigan', '#f3dcc4', '#c9926a', 0, 'Cream knit with cocoa cuffs. Smells faintly of cinnamon.', { tint: 'Cocoa', pattern: 'argyle', ink: '#e7c4a0', deco: ['buttons', 'openfront'], src: H });
def('top', 'cozy', 'hh_cranberry_scarf', 'Cranberry Scarf Sweater', 'sweater', '#ffb3c6', '#ff7d9c', 0, 'A pink knit with a fat cranberry scarf wound twice round.', { tint: 'Cranberry', deco: ['scarf'], src: H });
def('top', 'cozy', 'hh_plaid_scarf', 'Harvest Plaid Scarf Knit', 'sweater', '#ffe2b8', '#e98a5a', 0, 'Warm plaid scarf, creamy sweater, a very good hug.', { tint: 'Plaid', deco: ['scarf', 'heart'], src: H });
def('dress', 'cottage', 'hh_feast_pinafore', 'Feast Day Pinafore', 'pinafore', '#ffd9c2', '#fff6ea', 0, 'A pie-baker\'s pinafore with a gingham bib and tiny embroidered apples.', { tint: 'Apple', pattern: 'gingham', ink: '#ffb8a0', deco: ['apron', 'bow', 'ruffle'], src: H });
def('bottom', 'cozy', 'hh_corduroy_skirt', 'Gingerbread Corduroy Skirt', 'pleated', '#e8b98f', '#fff1dc', 0, 'A swishy pleated skirt the colour of gingerbread.', { tint: 'Ginger', src: H });
def('hat', 'cozy', 'hh_acorn_cap', 'Acorn Cap', 'acorn', '#d9a273', '#a86d46', 0, 'A scaly little acorn cap with a stem. Squirrels nod approvingly.', { tint: 'Acorn', src: H });
def('hat', 'fairy', 'hh_leaf_crown', 'Falling Leaf Crown', 'flowercrown', '#ffb48a', '#ff8f7a', 0, 'A ring of tiny autumn leaves in peach, rose and gold.', { tint: 'Leaf', deco: ['sparkle'], src: H });
def('bag', 'cottage', 'hh_pie_basket', 'Pie Delivery Basket', 'basket', '#e6b98a', '#ffd6e0', 0, 'A woven basket lined with pink gingham, made for carrying pies to friends.', { tint: 'Basket', src: H });

// ---- Twinkle Season (Nov 27 to Dec 26, 2026): pink, snowy and cozy ----
const W = E('twinkle');
// week 1: the town tree
def('hat', 'winter', 'tw_snow_beanie', 'Snow Puff Beanie', 'beanie', '#ffd9e6', '#ffffff', 0, 'A rosy knit beanie with a pom-pom as round as a snowball.', { tint: 'Snow Puff', pattern: 'snowflakes', ink: '#ffffff', src: W });
def('dress', 'holiday', 'tw_frost_coat', 'Candy Frost Coat Dress', 'coat', '#ffc9dc', '#ffffff', 0, 'A pink swing coat with a fluffy white collar and big peppermint buttons.', { tint: 'Candy Frost', deco: ['fur', 'buttons', 'bow'], src: W });
// week 2: cookies
def('dress', 'cottage', 'tw_ginger_pinafore', 'Gingerbread Pinafore', 'pinafore', '#e6b887', '#fff6ee', 0, 'Gingerbread brown with frosting-white frills and a heart pocket.', { tint: 'Gingerbread', deco: ['apron', 'ruffle', 'heart'], src: W });
def('bag', 'cozy', 'tw_cookie_basket', 'Cookie Delivery Basket', 'basket', '#f3d4a8', '#ffc2d8', 0, 'A little basket lined with pink checks, ready for warm cookies.', { tint: 'Cookie', src: W });
// week 3: ornaments and cocoa
def('shoes', 'winter', 'tw_peppermint_boots', 'Peppermint Stripe Boots', 'boot', '#ffffff', '#ff8fb6', 0, 'White snow boots with pink peppermint stripes and fuzzy cuffs.', { tint: 'Peppermint', pattern: 'stripes', ink: '#ff9ec0', deco: ['fur'], src: W });
def('top', 'cozy', 'tw_marshmallow_cardigan', 'Marshmallow Mug Cardigan', 'cardigan', '#fff3e8', '#ff9ec0', 0, 'A cloud-soft cream cardigan with cocoa-brown cuffs and a pink heart button.', { tint: 'Marshmallow', deco: ['buttons', 'openfront', 'pocket'], src: W });
// week 4: gifts
def('top', 'holiday', 'tw_ribbon_sweater', 'Gift Ribbon Sweater', 'sweater', '#ffdbe8', '#ff8fb6', 0, 'A pink knit wrapped in a big satin ribbon with a bow at the shoulder.', { tint: 'Ribbon', deco: ['bow', 'ribbon'], src: W });
// finale: Christmas Eve and Christmas Day
def('dress', 'princess', 'tw_eve_gown', 'Starlit Eve Gown', 'gown', '#ffd2e3', '#fff6d9', 0, 'A blush gown with a snowy hem and tiny gold stars that twinkle when you twirl.', { tint: 'Starlit', pattern: 'stars', ink: '#ffe08a', deco: ['sparkle', 'bow'], src: W });
def('hat', 'princess', 'tw_star_crown', 'Twinkle Star Crown', 'tiara', '#fff0b8', '#ffb3cf', 0, 'A little golden crown with a pink star at the front.', { tint: 'Twinkle', deco: ['sparkle'], src: W });
def('bottom', 'party', 'tw_snow_tutu', 'Snowdrift Tutu', 'tutu', '#fff7fb', '#ffd2e3', 0, 'A frothy tutu in snow white with a ribbon-pink waistband.', { tint: 'Snowdrift', deco: ['bow'], src: W });
