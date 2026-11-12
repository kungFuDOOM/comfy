// Where the Harvest Hush Feast happens. Pure constants (tile units: x east, z south), shared by the world
// decorations, the villagers' seats and the table's collision. The long table sits on the east edge of Sugarlily Square.

/** Tiles the feast table blocks (a column on the plaza's east edge, beside the fountain). */
export const TABLE_TILES: { x: number; y: number }[] = [40, 41, 42, 43].map((y) => ({ x: 51, y }));

export const TABLE = { cx: 51.5, z0: 40.05, z1: 43.95, halfW: 0.46, height: 0.62 };
/** Centre of the table, for cameras and confetti. */
export const TABLE_CENTER = { x: TABLE.cx, z: (TABLE.z0 + TABLE.z1) / 2 };

export interface Seat { x: number; z: number; face: 'left' | 'right' }
const ZS = [40.6, 41.55, 42.5, 43.45];
/** Four places on each side of the table. West side faces east, east side faces west. */
export const SEATS: Seat[] = [
  ...ZS.map((z): Seat => ({ x: TABLE.cx - 0.8, z, face: 'right' })),
  ...ZS.map((z): Seat => ({ x: TABLE.cx + 0.8, z, face: 'left' })),
];
/** Fixed seating plan (host at the head of the west side), so friends sit in the same spot every year. */
export const SEAT_ORDER = ['mimsy', 'zuzu', 'brioche', 'tuppi', 'bramble', 'oolie', 'marlo', 'nimbus'];
/** Where the player stands for the toast: the south end of the table. */
export const PLAYER_SEAT = { x: TABLE.cx, z: 44.75 };

/** Posts that hold the lantern canopy over the table (the four corners). */
export const CANOPY_POSTS: { x: number; z: number }[] = [
  { x: TABLE.cx - 1.25, z: 39.75 }, { x: TABLE.cx + 1.25, z: 39.75 },
  { x: TABLE.cx - 1.25, z: 44.25 }, { x: TABLE.cx + 1.25, z: 44.25 },
];

/** Existing lamp posts around the square (world.ts props) that carry garlands and strings of lanterns. */
export const LAMPS = [{ x: 44, z: 37 }, { x: 51, z: 37 }, { x: 45, z: 45 }, { x: 51, z: 45 }];
