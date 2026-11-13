// Style rewards: pieces earned by growing the Style skill (milestone levels) or by winning a Golden Bow in a themed
// styling contest (contest.ts). Never sold; wardrobe.ts hands each one out the moment it is earned.
import { def } from './build';

const L = (level: number) => ({ k: 'skill' as const, skill: 'style' as const, level });
const B = (theme: string) => ({ k: 'ribbon' as const, theme, tier: 3 });

// ---- Style level milestones ----
def('hat', 'kawaii', 'st_practice_bow', 'Practice Bow Headband', 'headband', '#ffc2d8', '#ffffff', 0, 'Your first stylist\'s headband. Slightly crooked, entirely proud.', { tint: 'Blush', deco: ['bow'], src: L(2) });
def('top', 'vintage', 'st_swatch_blouse', 'Swatch Patchwork Blouse', 'blouse', '#fff3f6', '#ff9ec0', 0, 'Pinned with tiny fabric swatches, just in case inspiration strikes.', { tint: 'Swatch', pattern: 'gingham', ink: '#ffb3cf', deco: ['collar', 'bow'], src: L(4) });
def('bag', 'preppy', 'st_moodboard_satchel', 'Moodboard Satchel', 'satchel', '#ffe3ee', '#ff8fb6', 0, 'A satchel with a corkboard flap and room for ten good ideas.', { tint: 'Rose', pattern: 'stars', ink: '#ffc2d8', src: L(6) });
def('shoes', 'lolita', 'st_catwalk_janes', 'Catwalk Mary Janes', 'mary', '#ffd9e8', '#ffffff', 0, 'Tap, tap, tap. They sound like a runway even on a gravel path.', { tint: 'Catwalk', deco: ['bow'], src: L(8) });
def('hat', 'cheetah', 'st_spotted_stylist_beret', 'Spotted Stylist Beret', 'beret', '#fff0dc', '#ff9ec0', 0, 'A cream beret with one confident spotted band. Just a little accent.', { tint: 'Stylist', trimPattern: 'cheetah', src: L(10) });
def('bottom', 'preppy', 'st_lookbook_skirt', 'Lookbook Pleated Skirt', 'pleated', '#f3e2ff', '#ffffff', 0, 'Pleats so crisp they look photographed already.', { tint: 'Lilac', src: L(13) });
def('dress', 'y2k', 'st_trendsetter_dress', 'Trendsetter Shirtdress', 'shirtdress', '#d6f0ff', '#ff9ec0', 0, 'Sky blue with a pink belt. Somehow everyone copies it by Tuesday.', { tint: 'Sky', deco: ['collar', 'belt', 'sparkle'], src: L(16) });
def('dress', 'princess', 'st_starlet_gown', 'Starlet Soirée Gown', 'gown', '#ffd9ec', '#fff0b8', 0, 'A blush gown with a sprinkle of gold stars down the skirt.', { tint: 'Starlet', pattern: 'stars', ink: '#ffe08a', deco: ['sparkle', 'bow'], src: L(20) });
def('hat', 'princess', 'st_icon_crown', 'Icon of Sugarlily Crown', 'tiara', '#fff0b8', '#ff9ec0', 0, 'For the island\'s most stylish friend. Wear it humbly. Or not.', { tint: 'Icon', deco: ['sparkle'], tags: ['glam', 'fancy'], src: L(25) });

// ---- Golden Bow prizes: one for every contest theme ----
def('top', 'goth', 'sc_moonlit_blouse', 'Moonlit Lace Blouse', 'blouse', '#3a2f45', '#d9c4f2', 0, 'Black lace with a tiny moon clasp. Perfect for a picnic after dark.', { tint: 'Moonlit', pattern: 'lace', ink: '#6a5a80', deco: ['collar', 'moonbrooch'], src: B('goth_picnic') });
def('hat', 'western', 'sc_blush_rodeo_hat', 'Blushing Rodeo Hat', 'cowboy', '#ffd6e0', '#ff8fb6', 0, 'A pink hat with a braided band. Tips politely to everyone.', { tint: 'Blush', src: B('rodeo_date') });
def('top', 'cafe', 'sc_latte_art_sweater', 'Latte Art Sweater', 'sweater', '#f3dcc4', '#fff6ee', 0, 'A creamy knit with a foam heart stitched on the front.', { tint: 'Latte', deco: ['heart'], src: B('cozy_cafe') });
def('hat', 'beach', 'sc_seashell_sunhat', 'Seashell Sunhat', 'sunhat', '#fff4dc', '#9fe0e8', 0, 'A wide straw hat with a ring of tiny pink shells.', { tint: 'Shell', deco: ['ribbon', 'sparkle'], src: B('beach_day') });
def('dress', 'fairy', 'sc_dewdrop_dress', 'Dewdrop Petal Dress', 'aline', '#e8f6e4', '#ffc2de', 0, 'Layered petals with a dewdrop at every hem. Comes with tiny wings.', { tint: 'Dewdrop', pattern: 'flowers', ink: '#ffc2de', deco: ['wings', 'sparkle'], src: B('fairy_tea') });
def('hat', 'winter', 'sc_snowdrop_earmuffs', 'Snowdrop Earmuffs', 'earmuffs', '#ffffff', '#ffc2d8', 0, 'Fluffy white muffs with a pink snowdrop on each side.', { tint: 'Snowdrop', src: B('snow_stroll') });
def('shoes', 'disco', 'sc_glitterstep_platforms', 'Glitterstep Platforms', 'platform', '#ffd6f0', '#fff0b8', 0, 'Sparkle-soled platforms that make a gentle tinkling sound.', { tint: 'Glitter', deco: ['sparkle'], src: B('glitter_runway') });
def('dress', 'kawaii', 'sc_sugar_fete_pinafore', 'Sugar Fête Pinafore', 'pinafore', '#ffe3ee', '#ffffff', 0, 'Frosting pink with sprinkles and a bow bigger than a cupcake.', { tint: 'Sugar', pattern: 'sprinkles', deco: ['apron', 'bow', 'ruffle'], src: B('frosting_fete') });
