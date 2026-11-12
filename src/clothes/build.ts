// Tiny builder for the catalog tables: one call per design, plus colour variants that share its shape.
import type { ClothDef, PatternId, Slot, Source, StyleId } from './types';

export const CLOTHES: ClothDef[] = [];

export interface Opt {
  tint?: string;
  pattern?: PatternId;
  ink?: string;
  trimPattern?: PatternId;
  deco?: string[];
  src?: Source;
}
/** A colour variant of a design: same shape and print, new colours. */
export interface Var { t: string; color: string; trim?: string; ink?: string; pattern?: PatternId }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function def(
  slot: Slot, style: StyleId, id: string, name: string, shape: string,
  color: string, trim: string, price: number, desc: string, o: Opt = {}, vars: Var[] = [],
) {
  const base: ClothDef = {
    id, name, slot, style, shape, color, trim, desc, price: o.src && o.src.k !== 'shop' ? 0 : price,
    pattern: o.pattern, ink: o.ink, trimPattern: o.trimPattern, deco: o.deco,
    group: id, tint: o.tint ?? 'Classic', src: o.src ?? { k: 'shop' },
  };
  CLOTHES.push(base);
  for (const v of vars) {
    CLOTHES.push({ ...base, id: `${id}_${slug(v.t)}`, name: `${v.t} ${name}`, color: v.color, trim: v.trim ?? trim, ink: v.ink ?? o.ink, pattern: v.pattern ?? o.pattern, tint: v.t });
  }
}
