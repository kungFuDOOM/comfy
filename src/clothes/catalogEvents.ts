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
