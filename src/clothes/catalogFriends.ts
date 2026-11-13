// Best-friend gifts: one wardrobe piece per friend who gives an outfit at 10 hearts (the others teach a recipe).
// Never sold; wardrobe.ts hands each one out when the friendship reaches the tenth heart.
import { def } from './build';

const F = (friend: string) => ({ k: 'friend' as const, friend });

def('hat', 'pajama', 'fr_nap_nightcap', 'Nap-Time Nightcap', 'beanie', '#ffd9e8', '#ffffff', 0, 'A droopy pink nightcap with a star pom, knitted by Mimsy between yawns.', { tint: 'Dreamy', deco: ['sparkle'], src: F('mimsy') });
def('hat', 'cheetah', 'fr_runway_beret', 'Runway Spotted Beret', 'beret', '#fff0dc', '#7a4a3a', 0, 'Dottie\'s signature beret, tilted at exactly the right angle, with a spotted band.', { tint: 'Runway', trimPattern: 'cheetah', src: F('zuzu') });
def('top', 'cottage', 'fr_clover_cardigan', 'Clover Patch Cardigan', 'cardigan', '#cdeccb', '#ffffff', 0, 'Soft clover green with mismatched pockets, patched by a grumpy-sweet gardener.', { tint: 'Clover', pattern: 'flowers', ink: '#a7d8a8', deco: ['buttons', 'openfront', 'pocket'], src: F('bramble') });
def('dress', 'fairy', 'fr_duskfog_dress', 'Duskfog Nightdress', 'aline', '#e3d6fa', '#ffe9a8', 0, 'Lavender mist and tiny golden stars, spun from the mist over the grove.', { tint: 'Dusk', pattern: 'stars', ink: '#ffe9a8', deco: ['bow'], src: F('nimbus') });
def('bag', 'cottage', 'fr_pressed_tote', 'Pressed-Flower Tote', 'tote', '#fff6ee', '#e6d4ff', 0, 'A canvas tote covered in tiny pressed flowers, each one stitched by Oolie.', { tint: 'Pressed', pattern: 'flowers', ink: '#ffc4d8', src: F('oolie') });
def('shoes', 'sailor', 'fr_sea_boots', 'Sea-Glass Deck Boots', 'boot', '#dff3f2', '#ffb3cf', 0, 'Seafoam boots with pink sea-glass buckles. Splash-ready, lighthouse-approved.', { tint: 'Sea glass', src: F('marlo') });
