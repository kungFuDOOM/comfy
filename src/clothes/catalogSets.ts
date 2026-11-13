// Collection Log set rewards: never sold. Each one is handed out when its set is completed (see collection.ts).
import { def } from './build';

const S = (set: string) => ({ k: 'set' as const, set });

def('hat', 'fairy', 'cs_wisp_crown', 'Wispwing Crown', 'flowercrown', '#d9f4ee', '#fff3a8', 0, 'A ring of tiny dragonfly wings and firefly glow. Dusk Sparklers set reward.', { tint: 'Wisp', deco: ['sparkle'], src: S('dusk_sparklers') });
def('bag', 'beach', 'cs_shell_clutch', 'Pearly Shell Clutch', 'purse', '#ffe3ee', '#ffffff', 0, 'A little clutch shaped like a scallop, pearly pink inside. Pearly Finds set reward.', { tint: 'Pearly', src: S('pearly_finds') });
def('face', 'witchy', 'cs_star_specs', 'Starstone Specs', 'round', '#d8c8f8', '#fff3a8', 0, 'Round lilac frames with a tiny gem at each hinge. Night Jewels set reward.', { tint: 'Starstone', src: S('night_jewels') });
def('hat', 'cafe', 'cs_latte_beret', 'Latte Art Beret', 'beret', '#f3d9c4', '#ff9ec0', 0, 'A creamy beret with a foam heart on top. Cafe Crew set reward.', { tint: 'Latte', deco: ['heart'], src: S('cafe_crew') });
def('hat', 'princess', 'cs_curator_crown', 'Curator\'s Crown', 'tiara', '#fff0b8', '#ff9ec0', 0, 'A golden crown set with a fish, a bug, a shell, a berry and a gem. Island Curator reward.', { tint: 'Curator', deco: ['sparkle'], src: S('island_curator') });
