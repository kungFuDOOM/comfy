// Cheetah print, drawn entirely in code. Tileable 64x64 pattern in two colorways.
import type { PatternKind } from '../data';

const SIZE = 64;
const COLORS: Record<PatternKind, { bg: string; ring: string; inner: string }> = {
  classic: { bg: '#f9deb0', ring: '#6b4331', inner: '#c98a5e' },
  pink: { bg: '#ffc9dc', ring: '#a8456f', inner: '#ee86ae' },
};

const tiles = new Map<PatternKind, HTMLCanvasElement>();
const patterns = new Map<string, CanvasPattern>();

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cheetahTile(kind: PatternKind): HTMLCanvasElement {
  const cached = tiles.get(kind);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d')!;
  const col = COLORS[kind];
  g.fillStyle = col.bg;
  g.fillRect(0, 0, SIZE, SIZE);
  const rand = rng(kind === 'classic' ? 7 : 19);
  const cell = SIZE / 4;
  g.lineCap = 'round';
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const x = cx * cell + cell / 2 + (rand() - 0.5) * 8;
      const y = cy * cell + cell / 2 + (rand() - 0.5) * 8;
      const r = 4.2 + rand() * 2.8;
      const a0 = rand() * Math.PI * 2;
      const span = Math.PI * (1.2 + rand() * 0.5);
      // wrap around edges so the tile repeats seamlessly
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const ox = x + dx * SIZE, oy = y + dy * SIZE;
          g.fillStyle = col.inner;
          g.globalAlpha = 0.55;
          g.beginPath();
          g.ellipse(ox + 0.6, oy, r * 0.62, r * 0.5, a0, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
          g.strokeStyle = col.ring;
          g.lineWidth = 2.4;
          g.beginPath();
          g.arc(ox, oy, r, a0, a0 + span);
          g.stroke();
          g.lineWidth = 1.8;
          g.beginPath();
          g.arc(ox, oy, r * 0.82, a0 + span + 0.7, a0 + span + 1.6);
          g.stroke();
          g.fillStyle = col.ring;
          g.beginPath();
          g.arc(ox + Math.cos(a0 + 3.4) * r * 1.5, oy + Math.sin(a0 + 3.4) * r * 1.5, 1.3, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
  tiles.set(kind, c);
  return c;
}

/** Canvas pattern for use as fillStyle. Anchored to the current transform. */
export function cheetahPattern(ctx: CanvasRenderingContext2D, kind: PatternKind, scale = 0.5): CanvasPattern {
  const key = kind + scale;
  let p = patterns.get(key);
  if (!p) {
    // pre-scale the tile so it works under any canvas transform
    const src = cheetahTile(kind);
    const c = document.createElement('canvas');
    const s = Math.max(8, Math.round(SIZE * scale));
    c.width = c.height = s;
    c.getContext('2d')!.drawImage(src, 0, 0, s, s);
    p = ctx.createPattern(c, 'repeat')!;
    patterns.set(key, p);
  }
  return p;
}

export function cheetahDataUrl(kind: PatternKind): string {
  return cheetahTile(kind).toDataURL();
}
