// Pieces that are never sold: quest rewards, skill rewards, crafting unlocks and the region party hats.
// (Also two shop dresses the old "Spotted Sunhat Set" save migrates onto.)
import { def } from './build';

// ---- the old Spotted Sunhat Set, now two pieces: a plain sundress + a hat with a cheetah band ----
def('dress', 'cottage', 'sun_dress', 'Sunshine Sundress', 'aline', '#ffd6e7', '#ffffff', 85, 'A sunny dress with a bow at the waist.', { tint: 'Pink', deco: ['bow', 'belt'] },
  [{ t: 'Butter', color: '#fff0a8' }, { t: 'Sky', color: '#c4e6f8' }]);
def('hat', 'cheetah', 'spotted_sun', 'Spotted Sunhat', 'sunhat', '#fff4dc', '#7a4a3a', 60, 'A wide sunhat with a cheetah-print band.', { tint: 'Classic', trimPattern: 'cheetah', deco: ['ribbon'] });

// ---- quest rewards (the friend who asked gives you something to wear) ----
const Q = (quest: string): { k: 'quest'; quest: string } => ({ k: 'quest', quest });
def('bag', 'cottage', 'errand_satchel', "Mimsy's Errand Satchel", 'satchel', '#ffd6e6', '#ffffff', 0, 'A sleepy-soft satchel for carrying small favours.', { tint: 'Rose', src: Q('lq_errand') });
def('bottom', 'cozy', 'plank_mender_overalls', 'Plank-Mender Overalls', 'overalls', '#c9a28a', '#fff4e6', 0, 'Sturdy overalls with a hammer loop. For bridge-menders only.', { tint: 'Oak', deco: ['pocket', 'buttons'], src: Q('lq_bridge') });
def('hat', 'cafe', 'tart_beret', 'Warm Tart Beret', 'beret', '#ffd9b0', '#ff8f9f', 0, 'A golden beret with a berry on top. Smells like the oven.', { tint: 'Golden', src: Q('lq_brioche') });
def('hat', 'fairy', 'pressed_petal_crown', 'Pressed Petal Crown', 'flowercrown', '#c3e8c8', '#ffd0e6', 0, 'Pressed petals, framed in a quiet little ring.', { tint: 'Petal', deco: ['sparkle'], src: Q('lq_oolie') });
def('dress', 'cafe', 'frosting_apron_dress', 'Frosting Apron Dress', 'pinafore', '#ffd0e6', '#ffffff', 0, 'A baker\'s pinafore dotted with sprinkles.', { tint: 'Pink', pattern: 'sprinkles', deco: ['apron', 'ruffle'], src: Q('lq_tuppi') });
def('hat', 'sailor', 'lighthouse_cap', 'Lighthouse Keeper Cap', 'sailor', '#ffffff', '#ffd36e', 0, 'A cap with a golden lamp stitched on. Marlo approves.', { tint: 'Gold', src: Q('lq_marlo') });
def('face', 'kawaii', 'window_shopper_specs', 'Window-Shopper Specs', 'round', '#ff9ec0', '#ffffff', 0, 'For looking at shiny things in shiny windows.', { tint: 'Pink', src: Q('q_boutique') });
def('bag', 'cottage', 'treasure_tote', 'Treasure Trail Tote', 'tote', '#fff4e6', '#ff9ec0', 0, 'A canvas tote with a map stitched on the pocket.', { tint: 'Cream', pattern: 'stars', ink: '#ffc9a8', src: Q('q_collect') });
def('hat', 'holiday', 'lantern_glow_band', 'Afterglow Headband', 'headband', '#ffe27a', '#ff9ec0', 0, 'A soft headband that looks like a little lantern.', { tint: 'Glow', deco: ['stars'], src: Q('q_lantern') });

// ---- skill-level rewards ----
const K = (skill: 'foraging' | 'fishing' | 'gardening' | 'baking' | 'brewing' | 'crafting', level: number) => ({ k: 'skill' as const, skill, level });
def('hat', 'cottage', 'forager_bonnet', "Forager's Bonnet", 'sunhat', '#f6e6c2', '#8fd49c', 0, 'Leaf trim and berry-stained ribbons.', { tint: 'Leaf', deco: ['ribbon'], src: K('foraging', 5) });
def('top', 'cottage', 'moss_cardigan', 'Mossy Forager Cardigan', 'cardigan', '#b7e0b8', '#ffffff', 0, 'Moss-green, pocketed, and slightly smelling of rain.', { tint: 'Moss', deco: ['buttons', 'openfront', 'pocket'], src: K('foraging', 12) });
def('hat', 'rainy', 'angler_bucket', "Angler's Bucket Hat", 'bucket', '#aee2f5', '#ffffff', 0, 'A bucket hat with a lure pinned to the band.', { tint: 'Pond', deco: ['long'], src: K('fishing', 5) });
def('dress', 'rainy', 'koi_raincoat', 'Koi Pond Raincoat', 'raincoat', '#ffd0b8', '#ffffff', 0, 'Orange-and-white scales and a koi on the pocket.', { tint: 'Koi', pattern: 'scales', ink: '#ff9f7a', deco: ['hood', 'buttons'], src: K('fishing', 10) });
def('bottom', 'cozy', 'gardener_overalls', "Gardener's Overalls", 'overalls', '#bfe3c0', '#fff4e6', 0, 'Pockets with space for seed packets.', { tint: 'Sprout', deco: ['pocket', 'buttons'], src: K('gardening', 5) });
def('dress', 'cafe', 'baker_apron_dress', "Baker's Apron Dress", 'pinafore', '#fff6ee', '#ffb3cf', 0, 'A floury-white apron dress with a pink bow.', { tint: 'Flour', deco: ['apron', 'bow'], src: K('baking', 5) });
def('top', 'cafe', 'barista_apron_top', "Barista's Apron Shirt", 'shirt', '#c9a28a', '#fff', 0, 'A latte-brown shirt with a pocket for coffee pencils.', { tint: 'Latte', deco: ['collar', 'apron', 'pocket'], src: K('brewing', 5) });
def('hat', 'fairy', 'moonpetal_halo', 'Moonpetal Halo', 'flowercrown', '#e0d0f6', '#fff3a8', 0, 'Pressed moonpetals that glimmer at dusk.', { tint: 'Moon', deco: ['sparkle'], src: K('brewing', 10) });
def('top', 'kawaii', 'patchwork_cardigan', 'Patchwork Pals Cardigan', 'cardigan', '#ffe0ec', '#ffffff', 0, 'Mismatched patches, matching love.', { tint: 'Patchwork', pattern: 'checker', ink: '#ffc0d6', deco: ['buttons', 'openfront'], src: K('crafting', 8) });

// ---- crafting unlocks (made at the boutique worktable; the recipe id is the item id) ----
const C = (recipe: string) => ({ k: 'craft' as const, recipe });
def('hat', 'cottage', 'blossom_crown', 'Handmade Blossom Crown', 'flowercrown', '#8fd49c', '#ffb3cf', 0, 'Woven by hand from ribbon blossoms.', { tint: 'Blossom', src: C('blossom_crown') });
def('bag', 'cottage', 'twig_basket', 'Twig Basket', 'basket', '#d9b48a', '#ffffff', 0, 'Woven from sugarwood twigs. Sturdy and sweet.', { tint: 'Twig', src: C('twig_basket') });
def('hat', 'cottage', 'woven_sunhat', 'Woven Sunhat', 'sunhat', '#f1d9a0', '#ffb3cf', 0, 'A hand-woven hat with a blossom tucked in.', { tint: 'Woven', deco: ['ribbon'], src: C('woven_sunhat') });
def('top', 'witchy', 'moonpetal_cape', 'Moonpetal Cape', 'tee', '#e0d0f6', '#c9a8ff', 0, 'A short lilac cape stitched from moonpetals.', { tint: 'Moonpetal', deco: ['cape', 'moonbrooch'], src: C('moonpetal_cape') });
def('hat', 'princess', 'pearl_tiara', 'Pearlshell Tiara', 'tiara', '#fff4f8', '#ffc4e0', 0, 'Rosy pearl shells set into a silver band.', { tint: 'Pearl', deco: ['pearls', 'jewel'], src: C('pearl_tiara') });

// ---- region completion party hats (never sold; see regions.ts) ----
const R = (area: 'town' | 'blossom' | 'pond' | 'meadow' | 'lighthouse' | 'farbeach' | 'all') => ({ k: 'region' as const, area });
def('hat', 'party', 'party_town', 'Sugarlily Party Hat', 'party', '#ffb3cf', '#ffffff', 0, 'A pink party cone with a pom-pom. For finishing the whole town.', { tint: 'Pink', pattern: 'polka', ink: '#ffffff', deco: ['sparkle'], src: R('town') });
def('hat', 'party', 'party_blossom', 'Blossom Grove Party Hat', 'party', '#ffffff', '#ffb3cf', 0, 'Cherry-blossom stripes with a petal pom-pom.', { tint: 'Blossom', pattern: 'stripes', ink: '#ffc4d8', deco: ['sparkle'], src: R('blossom') });
def('hat', 'party', 'party_pond', 'Lilypad Party Hat', 'party', '#bdf0dc', '#3fb9a8', 0, 'Mint and teal dots, like a pond full of lilypads.', { tint: 'Mint', pattern: 'polka', ink: '#3fb9a8', deco: ['sparkle'], src: R('pond') });
def('hat', 'party', 'party_meadow', 'Sprinkle Meadow Party Hat', 'party', '#fff6fb', '#ffe27a', 0, 'Rainbow sprinkles all over a frosted cone.', { tint: 'Sprinkles', pattern: 'sprinkles', deco: ['sparkle'], src: R('meadow') });
def('hat', 'party', 'party_lighthouse', 'Hush Bell Party Hat', 'party', '#cdb8ff', '#ffd36e', 0, 'Lavender stripes, a golden pom, and a tiny bell that does not ring (the Hush Bell is asleep).', { tint: 'Lavender', pattern: 'stripes', ink: '#ffd36e', deco: ['sparkle', 'bell'], src: R('lighthouse') });
def('hat', 'party', 'party_farbeach', 'Pearl Shore Party Hat', 'party', '#f7eefc', '#ffffff', 0, 'Pearly and iridescent, with a shimmering pom.', { tint: 'Pearl', pattern: 'bubbles', ink: '#ffffff', deco: ['sparkle', 'pearls'], src: R('farbeach') });
def('hat', 'party', 'party_star', 'Island Star Party Hat', 'party', '#ffe27a', '#ff9ec0', 0, 'Golden stars and rainbow ribbons: for befriending the whole island.', { tint: 'Gold', pattern: 'stars', ink: '#ffffff', deco: ['sparkle', 'star', 'rainbowpom'], src: R('all') });

// ---- café shift milestones (worked at Puddle & Pip; see shift.ts) ----
const S = (n: number) => ({ k: 'shift' as const, n });
def('dress', 'cafe', 'pip_pocket_apron', 'Pip Pocket Apron Dress', 'pinafore', '#ffc9dc', '#ffffff', 0, 'A rosy server apron with a heart pocket for order pads.', { tint: 'Rosy', deco: ['apron', 'pocket', 'bow'], src: S(3) });
def('hat', 'cafe', 'foam_headband', 'Cloud-Foam Headband', 'headband', '#fff6fb', '#ff9ec0', 0, 'A fluffy white band that looks like a swirl of foam.', { tint: 'Foam', deco: ['bow'], src: S(5) });
def('bottom', 'cafe', 'puddle_cafe_skirt', 'Puddle Café Skirt', 'pleated', '#f7d4e2', '#ffffff', 0, 'A pleated skirt with a cream hem, made for busy counters.', { tint: 'Blush', src: S(12) });
