// Home interior data: the room grid, wallpapers and floors. Patterns are painted in render/homeRoom.ts from `kind`.
export const HOME_W = 8;
export const HOME_D = 6;

export type WallKind = 'stripe' | 'dots' | 'hearts' | 'gingham' | 'clouds';
export type FloorKind = 'checker' | 'planks' | 'tile' | 'plush' | 'herring';
export interface WallDef { id: string; name: string; kind: WallKind; a: string; b: string }
export interface FloorDef { id: string; name: string; kind: FloorKind; a: string; b: string }

export const WALLPAPERS: WallDef[] = [
  { id: 'blush', name: 'Blush Stripes', kind: 'stripe', a: '#ffd3e2', b: '#fff0f5' },
  { id: 'mint', name: 'Mint Polka', kind: 'dots', a: '#d6f3e6', b: '#ffffff' },
  { id: 'lilac', name: 'Lilac Hearts', kind: 'hearts', a: '#e6dafb', b: '#ff9ec0' },
  { id: 'gingham', name: 'Peach Gingham', kind: 'gingham', a: '#ffe0cc', b: '#fff6ee' },
  { id: 'sky', name: 'Cloud Nursery', kind: 'clouds', a: '#d3ecfb', b: '#ffffff' },
];
export const FLOORS: FloorDef[] = [
  { id: 'checker', name: 'Pink Checker', kind: 'checker', a: '#fff0f5', b: '#ffbcd4' },
  { id: 'oak', name: 'Honey Planks', kind: 'planks', a: '#f3d6a8', b: '#e4bd88' },
  { id: 'mintTile', name: 'Mint Tiles', kind: 'tile', a: '#dff6ea', b: '#bfe8d3' },
  { id: 'plush', name: 'Cream Carpet', kind: 'plush', a: '#fff3e2', b: '#f7e2c8' },
  { id: 'herring', name: 'Lavender Herringbone', kind: 'herring', a: '#e4d8f5', b: '#cdbbea' },
];
export const wallById = (id: string) => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
export const floorById = (id: string) => FLOORS.find((f) => f.id === id) ?? FLOORS[0];

/** Flat pieces (rugs) lie on the floor, so one can sit under a standing piece in the same cell. */
const FLAT = new Set(['d_rug']);
export const isFlat = (id: string) => FLAT.has(id);
