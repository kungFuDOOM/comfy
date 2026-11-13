// The wardrobe catalog: every wearable item in the game, built from the catalog tables.
import './catalogDress';
import './catalogTop';
import './catalogGear';
import './catalogSpecial';
import './catalogEvents';
import './catalogFriends';
import './catalogSets';
import { CLOTHES } from './build';
import type { ClothDef, Slot } from './types';

export { CLOTHES } from './build';
export * from './types';

const byId = new Map<string, ClothDef>(CLOTHES.map((c) => [c.id, c]));
export const clothById = (id: string | null | undefined): ClothDef | undefined => (id ? byId.get(id) : undefined);
export const clothesIn = (slot: Slot) => CLOTHES.filter((c) => c.slot === slot);
/** Everything that shares a design with `c` (its colour variants, `c` included), in catalog order. */
export const variantsOf = (c: ClothDef) => CLOTHES.filter((x) => x.group === c.group && x.slot === c.slot);
/** Pieces that are real cheetah prints (only a handful, on purpose). */
export const isCheetah = (c: ClothDef) => c.pattern === 'cheetah' || c.pattern === 'cheetahpink' || c.trimPattern === 'cheetah';
