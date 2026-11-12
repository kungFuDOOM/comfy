// Island areas and the cute barriers that guard them. Pure data: the rules live in unlocks.ts, the map in world.ts.
import type { SkillId } from './data';

export type AreaId = 'town' | 'blossom' | 'pond' | 'meadow' | 'lighthouse' | 'farbeach';
export type BarrierId = 'logs' | 'bridge' | 'fog' | 'meadowgate' | 'beachgate';
export type BarrierKind = 'logs' | 'bridge' | 'fog' | 'gate';

/** What it takes to open an area. Exactly one per barrier keeps the prompts clear. */
export type Requirement =
  | { kind: 'skill'; skill: SkillId; level: number }
  | { kind: 'quest'; quest: string; title: string }
  | { kind: 'pips'; cost: number };

export interface Barrier {
  id: BarrierId;
  kind: BarrierKind;
  area: AreaId;
  name: string;
  /** Tiles that block walking while the barrier stands. */
  tiles: { x: number; y: number }[];
  /** Where it is, in tile units (for the model and the "walk up to it" check). */
  cx: number;
  cy: number;
  /** Which way the passage runs, for the model: 'ns' = walking north-south through it, 'ew' = east-west. */
  axis: 'ns' | 'ew';
}

export interface AreaDef {
  id: AreaId;
  name: string;
  blurb: string;
  barrier?: BarrierId;
  req?: Requirement;
  /** Sign text at the entrance. */
  sign?: string;
}

const rect = (x0: number, y0: number, x1: number, y1: number) => {
  const out: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x, y });
  return out;
};

export const BARRIERS: Barrier[] = [
  { id: 'logs', kind: 'logs', area: 'blossom', name: 'Fallen Blossom Logs', tiles: rect(20, 39, 20, 40), cx: 20.5, cy: 40, axis: 'ew' },
  { id: 'bridge', kind: 'bridge', area: 'pond', name: 'Broken Bridge', tiles: rect(47, 22, 48, 23), cx: 48, cy: 23, axis: 'ns' },
  { id: 'fog', kind: 'fog', area: 'lighthouse', name: 'Soft Fog Veil', tiles: rect(48, 11, 51, 11), cx: 50, cy: 11.5, axis: 'ns' },
  { id: 'meadowgate', kind: 'gate', area: 'meadow', name: 'Meadow Gate', tiles: rect(76, 38, 76, 39), cx: 76.5, cy: 39, axis: 'ew' },
  { id: 'beachgate', kind: 'gate', area: 'farbeach', name: 'Seaside Gate', tiles: rect(76, 62, 76, 63), cx: 76.5, cy: 63, axis: 'ew' },
];
export const barrierById = (id: BarrierId) => BARRIERS.find((b) => b.id === id)!;

export const AREA_LIST: AreaDef[] = [
  { id: 'town', name: 'Sugarlily Town', blurb: 'Café, boutique, home, garden, the square and the nearby south shore. Always open.' },
  { id: 'blossom', name: 'Blossom Grove', blurb: 'A pink-canopied forest of petals, berries and flower patches. Oolie lives here.', barrier: 'logs', req: { kind: 'skill', skill: 'foraging', level: 3 }, sign: 'Blossom Grove' },
  { id: 'pond', name: 'Lilypad Pond', blurb: 'A calm freshwater pond with shy fish across the river. Tuppi bakes by the shore.', barrier: 'bridge', req: { kind: 'quest', quest: 'lq_bridge', title: 'Mend the Bridge' }, sign: 'Lilypad Pond' },
  { id: 'meadow', name: 'Sprinkle Meadow', blurb: 'A wide, flowery picnic meadow. Brioche has set up a pastry blanket.', barrier: 'meadowgate', req: { kind: 'pips', cost: 120 }, sign: 'Sprinkle Meadow' },
  { id: 'lighthouse', name: 'Hush Bell Overlook', blurb: 'A breezy cliff with the lighthouse and the sleeping Hush Bell. Marlo keeps the light.', barrier: 'fog', req: { kind: 'skill', skill: 'brewing', level: 3 }, sign: 'Hush Bell Overlook' },
  { id: 'farbeach', name: 'Pearl Shore', blurb: 'A long, quiet far beach with rosy pearl shells and moonlit fish.', barrier: 'beachgate', req: { kind: 'pips', cost: 250 }, sign: 'Pearl Shore' },
];
export const areaById = (id: AreaId) => AREA_LIST.find((a) => a.id === id)!;
