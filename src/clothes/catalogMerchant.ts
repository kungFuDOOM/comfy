// Rare pieces sold only by Tansy Packlewick, the traveling merchant (see merchant.ts). Never in the boutique, never earned:
// the merchant's own price table lives in merchantData.ts (def() zeroes the price of anything that is not a boutique piece).
import { def } from './build';

const M = { k: 'merchant' as const };

def('hat', 'boho', 'tm_bell_peddler_hat', "Peddler's Jingle Hat", 'sunhat', '#ffe3b8', '#ff9ec0', 0, 'A wide straw hat hung with tiny brass bells. It jingles when you nod.', { tint: 'Straw', deco: ['ribbon'], src: M });
def('dress', 'boho', 'tm_patchwork_dress', 'Patchwork Wanderer Dress', 'smock', '#ffd0e0', '#fff3c4', 0, 'Soft patches from a hundred little towns, stitched with love.', { tint: 'Patchwork', pattern: 'checker', ink: '#ffb3cf', deco: ['ruffle', 'bow'], src: M });
def('top', 'vintage', 'tm_postcard_cardigan', 'Postcard Cardigan', 'cardigan', '#c9ecf2', '#ffffff', 0, 'A cloud-blue knit with stamps and tiny postcards stitched on the pockets.', { tint: 'Sky mail', pattern: 'stars', ink: '#ffffff', deco: ['buttons', 'openfront', 'pocket'], src: M });
def('bag', 'boho', 'tm_traveler_pack', "Traveler's Bundle Pack", 'tote', '#f6d7a8', '#ff9ec0', 0, 'A rolled-up blanket pack with a pink strap and a brass buckle.', { tint: 'Rolled', pattern: 'stripes', ink: '#ffe6bd', src: M });
def('shoes', 'boho', 'tm_cloud_hopper', 'Cloud-Hopper Boots', 'boot', '#f2e6ff', '#ffb3cf', 0, 'Boots for crossing a whole sea of clouds. Cuffs are soft as a sheep.', { tint: 'Cloud', deco: ['fur'], src: M });
def('face', 'vintage', 'tm_stargazer_specs', 'Stargazer Spectacles', 'star', '#ffe27a', '#fff6c8', 0, 'Star-shaped specs that make every evening look a little brighter.', { tint: 'Gold', src: M });
