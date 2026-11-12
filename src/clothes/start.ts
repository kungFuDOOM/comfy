// The look a new game starts in, and the pieces everybody owns from the start.
import type { Slot } from './types';

/** A cream cozy knit, a petal-pastel skirt and rosy Mary Janes. Soft, simple, not a single spot. */
export const START_WORN: Record<Slot, string | null> = {
  hat: null, top: 'cream_knit', bottom: 'petal_skirt', dress: null, shoes: 'rosy_mary_janes', bag: null, face: null,
};
export const startClothes = () => ['cream_knit', 'cream_tee', 'petal_skirt', 'rosy_mary_janes'];
