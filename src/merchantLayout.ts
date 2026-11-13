// Where the traveling merchant's stall stands. Pure constants (tile units: x east, z south), shared by world.ts (paving and
// collision), merchant.ts and the 3D stall, so none of them has to import the other.

/** Where the stall stands: a cobbled pitch east of Sugarlily Square (tile units; world.ts paves it). */
export const PITCH = { x0: 54, y0: 41, x1: 58, y1: 44 };
/** The two solid tiles under the counter, and the spot beside it where Tansy stands (out from under the awning, so she is seen). */
export const STALL_TILES = [{ x: 55, y: 42 }, { x: 56, y: 42 }];
export const STALL_CENTER = { x: 56.0, z: 42.5 };
export const MERCHANT_SPOT = { x: 57.8, y: 42.8 }; // tile units
/** Tiles that count as "the stall" when tapped (counter, awning, and Tansy behind it), and the tiles to walk to in front of it. */
export const STALL_TAP = { x0: 54, y0: 40, x1: 58, y1: 43 };
export const STALL_APPROACH = [{ x: 55, y: 43 }, { x: 56, y: 43 }, { x: 54, y: 43 }, { x: 57, y: 43 }, { x: 54, y: 42 }];
