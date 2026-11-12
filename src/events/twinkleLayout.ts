// Where Twinkle Season happens. Pure constants (tile units: x east, z south), shared by the world decorations, the
// villagers' places at the gathering, and the tree / stall collision. The tree stands on the west edge of Sugarlily
// Square, left of the fountain (the fountain basin blocks x 47 to 49, the harvest table is on the east edge at x 51).

export const TREE_TILE = { x: 45, y: 42 };
export const TREE = { x: TREE_TILE.x + 0.5, z: TREE_TILE.y + 0.5, height: 3.1 };

/** The cocoa market stall (week 3 on): just south of the plaza, left of the south road. Two tiles wide. */
export const STALL_TILES = [{ x: 46, y: 45 }, { x: 47, y: 45 }];
export const STALL = { x: 47, z: 45.5 };

export interface GatherSpot { x: number; z: number; face: 'up' | 'down' | 'left' | 'right' }
const faceTo = (x: number, z: number): GatherSpot['face'] => {
  const dx = TREE.x - x, dz = TREE.z - z;
  return Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'left' : 'right') : dz < 0 ? 'up' : 'down';
};
/** Eight places in an arc around the tree (the east side, towards the fountain, is left open for the player). */
export const GATHER_ORDER = ['mimsy', 'zuzu', 'brioche', 'tuppi', 'bramble', 'oolie', 'marlo', 'nimbus'];
export const GATHER_SPOTS: GatherSpot[] = GATHER_ORDER.map((_, i) => {
  const a = (60 + (i / (GATHER_ORDER.length - 1)) * 240) * (Math.PI / 180); // 60 to 300 degrees, via the west
  const x = TREE.x + Math.cos(a) * 1.75, z = TREE.z + Math.sin(a) * 1.75;
  return { x, z, face: faceTo(x, z) };
});
/** Where the player stands during the gathering (east of the tree). */
export const PLAYER_SPOT = { x: TREE.x + 1.55, z: TREE.z + 0.2 };

/** Lamp posts around the square and along the roads that carry strings of twinkle lights (existing props in world.ts). */
export const LAMPS = [{ x: 44, z: 37 }, { x: 51, z: 37 }, { x: 45, z: 45 }, { x: 51, z: 45 }];
export const FAR_LAMPS = [{ x: 61, z: 39 }, { x: 34, z: 46 }];
/** Slim light posts along the main roads (visual only, set just off the path edges). [x, z] pairs, each pair faces across the road. */
export const ROAD_POSTS: [number, number][][] = [
  [[46.6, 33], [49.4, 33]], [[46.6, 29], [49.4, 29]], [[46.6, 27], [49.4, 27]],            // north road to the bridge
  [[47.2, 48], [50.8, 48]], [[47.2, 52], [50.8, 52]], [[47.2, 56], [50.8, 56]], [[47.2, 60], [50.8, 60]], // south road
  [[34, 38.4], [34, 40.6]], [[38, 38.4], [38, 40.6]],                                       // west road
  [[58.5, 37.4], [58.5, 39.6]], [[62.5, 37.4], [62.5, 39.6]],                               // east road
];

/** The three tree-decorating steps (week 1). The pick is saved in the event counters under `key` as 1..3 (0 = not done yet). */
export interface TreeStep { key: string; title: string; hint: string; options: { label: string; color: string }[] }
export const TREE_STEPS: TreeStep[] = [
  { key: 'tree1', title: 'Wind the garland', hint: 'A soft ribbon of colour all the way round.', options: [{ label: 'Strawberry pink', color: '#ff8fb6' }, { label: 'Mint cream', color: '#a8f0d0' }, { label: 'Butter gold', color: '#ffd36e' }] },
  { key: 'tree2', title: 'Hang the ornaments', hint: 'Baubles, one by one. Not too many on the left!', options: [{ label: 'Rose baubles', color: '#ff8fb6' }, { label: 'Frosty blue baubles', color: '#bfe3f7' }, { label: 'Golden baubles', color: '#ffd36e' }] },
  { key: 'tree3', title: 'Top it with a glow', hint: 'The last piece, up on the very top.', options: [{ label: 'Gold star', color: '#ffe27a' }, { label: 'Pink heart', color: '#ff8fb6' }, { label: 'Snow moon', color: '#ffffff' }] },
];
