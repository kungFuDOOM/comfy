// Body-shape tables shared by the 3D model and the 2D thumbnails, so both draw the same silhouette.
// Heights are in the player model's hip-relative units (the torso runs 0..0.56); radii are around the spine.

export type SleeveLen = 0 | 1 | 2 | 3; // none, short, long, puffy-short

/** Dresses: one piece from the shoulders to the hem. */
export interface DressSpec { yh: number; rh: number; rw: number; rt: number; sleeve: SleeveLen }
export const DRESS_SHAPES: Record<string, DressSpec> = {
  aline: { yh: 0, rh: 0.35, rw: 0.2, rt: 0.14, sleeve: 1 },
  ballgown: { yh: 0, rh: 0.47, rw: 0.17, rt: 0.13, sleeve: 3 },
  tutu: { yh: 0.09, rh: 0.47, rw: 0.21, rt: 0.14, sleeve: 0 },
  pinafore: { yh: 0.02, rh: 0.36, rw: 0.2, rt: 0.15, sleeve: 3 },
  sweater: { yh: 0.04, rh: 0.31, rw: 0.24, rt: 0.16, sleeve: 2 },
  onesie: { yh: 0, rh: 0.33, rw: 0.27, rt: 0.17, sleeve: 2 },
  raincoat: { yh: 0.02, rh: 0.37, rw: 0.24, rt: 0.16, sleeve: 2 },
  coat: { yh: 0.03, rh: 0.36, rw: 0.22, rt: 0.16, sleeve: 2 },
  shirtdress: { yh: 0.05, rh: 0.33, rw: 0.21, rt: 0.15, sleeve: 1 },
  smock: { yh: 0.08, rh: 0.37, rw: 0.26, rt: 0.15, sleeve: 3 },
  sailordress: { yh: 0.06, rh: 0.36, rw: 0.2, rt: 0.14, sleeve: 1 },
  gown: { yh: 0, rh: 0.32, rw: 0.17, rt: 0.13, sleeve: 2 },
  mini: { yh: 0.12, rh: 0.33, rw: 0.2, rt: 0.14, sleeve: 1 },
};

/** Tops: the upper slice of the body, from the hem `yb` up to the collar. */
export interface TopSpec { yb: number; puff: number; flare: number; sleeve: SleeveLen }
export const TOP_SHAPES: Record<string, TopSpec> = {
  tee: { yb: 0.29, puff: 1.03, flare: 1, sleeve: 1 },
  sweater: { yb: 0.24, puff: 1.12, flare: 1.05, sleeve: 2 },
  cardigan: { yb: 0.22, puff: 1.08, flare: 1.04, sleeve: 2 },
  hoodie: { yb: 0.23, puff: 1.14, flare: 1.04, sleeve: 2 },
  jacket: { yb: 0.27, puff: 1.06, flare: 1.02, sleeve: 2 },
  blouse: { yb: 0.27, puff: 1.04, flare: 1.04, sleeve: 3 },
  crop: { yb: 0.36, puff: 1.03, flare: 1, sleeve: 1 },
  tank: { yb: 0.29, puff: 1.0, flare: 1, sleeve: 0 },
  vest: { yb: 0.27, puff: 1.06, flare: 1.02, sleeve: 0 },
  shirt: { yb: 0.26, puff: 1.04, flare: 1.02, sleeve: 2 },
  jersey: { yb: 0.24, puff: 1.05, flare: 1.02, sleeve: 1 },
};

/** Bottoms: skirts hang from the waist; pants colour the legs; overalls add a bib. */
export interface BottomSpec { kind: 'skirt' | 'pants' | 'shorts' | 'overalls'; yh: number; rh: number; seg?: number }
export const BOTTOM_SHAPES: Record<string, BottomSpec> = {
  skirt: { kind: 'skirt', yh: 0.08, rh: 0.33 },
  mini: { kind: 'skirt', yh: 0.16, rh: 0.31 },
  pleated: { kind: 'skirt', yh: 0.09, rh: 0.34, seg: 16 },
  maxi: { kind: 'skirt', yh: 0.01, rh: 0.35 },
  tutu: { kind: 'skirt', yh: 0.1, rh: 0.46 },
  shorts: { kind: 'shorts', yh: 0.19, rh: 0.27 },
  pants: { kind: 'pants', yh: 0.2, rh: 0.27 },
  overalls: { kind: 'overalls', yh: 0.2, rh: 0.27 },
};

/** Base body radius at a hip-relative height (the "skin" torso the clothes sit over). */
const BODY_R: [number, number][] = [[0, 0.3], [0.1, 0.3], [0.25, 0.27], [0.38, 0.22], [0.5, 0.16], [0.56, 0.12]];
export function bodyR(y: number): number {
  if (y <= BODY_R[0][0]) return BODY_R[0][1];
  for (let i = 1; i < BODY_R.length; i++) {
    if (y <= BODY_R[i][0]) { const [y0, r0] = BODY_R[i - 1], [y1, r1] = BODY_R[i]; return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0); }
  }
  return BODY_R[BODY_R.length - 1][1];
}

/** True for bottoms that colour the legs (pants, overalls). */
export const coversLegs = (shape: string) => { const k = BOTTOM_SHAPES[shape]?.kind; return k === 'pants' || k === 'overalls'; };
