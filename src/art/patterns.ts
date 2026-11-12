// Fabric prints, drawn in code as small tileable canvases. The same tile feeds 2D thumbnails (createPattern)
// and the 3D clothes (a repeating CanvasTexture), so a gingham skirt looks the same in both.
// The two cheetah prints keep their own painters (art/cheetah.ts, render/materials.ts); everything else lives here.
import type { PatternId } from '../clothes/types';
import { shade } from './draw';

const S = 64; // logical tile size; painted at 2x
type Paint = (g: CanvasRenderingContext2D, base: string, ink: string) => void;

const CONFETTI = ['#ff9ec0', '#ffe27a', '#8fe0c0', '#c9a8ff', '#ffffff', '#8fd3ff'];
const heartPath = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.7, y - r * 1.1, x, y - r * 0.4);
  g.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.5, y - r * 0.2, x, y + r * 0.9);
  g.closePath();
};
const starPath = (g: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0) => {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
};
const dot = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };

const PAINT: Partial<Record<PatternId, Paint>> = {
  gingham(g, _b, ink) {
    g.globalAlpha = 0.34; g.fillStyle = ink;
    for (const o of [0, 32]) { g.fillRect(o, 0, 16, S); g.fillRect(0, o, S, 16); }
    g.globalAlpha = 1;
  },
  polka(g, _b, ink) { dot(g, 16, 16, 5.5, ink); dot(g, 48, 48, 5.5, ink); dot(g, 48, 16, 2.4, ink); dot(g, 16, 48, 2.4, ink); },
  stripes(g, _b, ink) { g.fillStyle = ink; for (let i = 0; i < 4; i++) g.fillRect(i * 16 + 2, 0, 8, S); },
  stars(g, _b, ink) { g.fillStyle = ink; starPath(g, 16, 16, 8, 0.2); g.fill(); starPath(g, 48, 48, 8, -0.2); g.fill(); dot(g, 48, 16, 1.8, ink); dot(g, 16, 48, 1.8, ink); },
  moons(g, base, ink) {
    for (const [x, y, f] of [[18, 20, 1], [48, 48, -1]] as const) {
      dot(g, x, y, 9, ink); dot(g, x + 4.5 * f, y - 3, 8, base);
    }
    g.fillStyle = ink; starPath(g, 50, 14, 3.6); g.fill(); starPath(g, 14, 50, 3.2); g.fill();
  },
  clouds(g, _b, ink) {
    for (const [x, y, k] of [[20, 22, 1], [50, 50, 0.85]] as const) {
      g.fillStyle = ink; g.beginPath();
      g.arc(x - 6 * k, y + 2, 5.5 * k, 0, 7); g.arc(x, y - 2, 7 * k, 0, 7); g.arc(x + 7 * k, y + 2, 5 * k, 0, 7); g.fill();
      g.fillRect(x - 10 * k, y + 1, 22 * k, 6.5 * k);
    }
  },
  strawberry(g, _b, ink) {
    for (const [x, y] of [[18, 22], [48, 50]]) {
      g.fillStyle = ink; g.beginPath(); g.moveTo(x - 9, y - 4); g.bezierCurveTo(x - 9, y - 9, x + 9, y - 9, x + 9, y - 4); g.bezierCurveTo(x + 8, y + 7, x + 2, y + 11, x, y + 11); g.bezierCurveTo(x - 2, y + 11, x - 8, y + 7, x - 9, y - 4); g.fill();
      g.fillStyle = '#7fd08e'; g.beginPath(); g.ellipse(x - 4, y - 7, 3.6, 1.8, -0.4, 0, 7); g.ellipse(x + 4, y - 7, 3.6, 1.8, 0.4, 0, 7); g.ellipse(x, y - 8.5, 1.8, 3.2, 0, 0, 7); g.fill();
      for (const [dx, dy] of [[-4, -1], [3, 0], [-1, 4], [4, 5], [-5, 5]]) dot(g, x + dx, y + dy, 0.9, '#fff3b0');
    }
    dot(g, 48, 14, 2, '#ffffff'); dot(g, 14, 52, 2, '#ffffff');
  },
  cherry(g, _b, ink) {
    for (const [x, y] of [[20, 24], [48, 52]]) {
      g.strokeStyle = '#6fbf7e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 4, y + 4); g.quadraticCurveTo(x - 2, y - 8, x + 3, y - 12); g.moveTo(x + 5, y + 5); g.quadraticCurveTo(x + 5, y - 6, x + 3, y - 12); g.stroke();
      g.fillStyle = '#8fdc9c'; g.beginPath(); g.ellipse(x + 8, y - 11, 4.2, 2, -0.3, 0, 7); g.fill();
      dot(g, x - 4, y + 5, 5, ink); dot(g, x + 5, y + 6, 5, ink);
      dot(g, x - 5.6, y + 3.4, 1.2, '#ffffffaa'); dot(g, x + 3.6, y + 4.4, 1.2, '#ffffffaa');
    }
  },
  hearts(g, _b, ink) { g.fillStyle = ink; heartPath(g, 16, 18, 7); g.fill(); heartPath(g, 48, 50, 7); g.fill(); heartPath(g, 48, 16, 3.4); g.fill(); heartPath(g, 16, 50, 3.4); g.fill(); },
  lace(g, _b, ink) {
    g.strokeStyle = ink; g.lineWidth = 1.5; g.globalAlpha = 0.85;
    for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48], [32, 32]]) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.stroke(); dot(g, x, y, 1.8, ink); }
    for (const [x, y] of [[32, 0], [32, 64], [0, 32], [64, 32]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke(); }
    g.globalAlpha = 1;
  },
  plaid(g, _b, ink) {
    g.fillStyle = ink; g.globalAlpha = 0.38;
    g.fillRect(6, 0, 18, S); g.fillRect(0, 6, S, 18);
    g.globalAlpha = 0.65; g.fillRect(40, 0, 3, S); g.fillRect(0, 40, S, 3); g.fillRect(52, 0, 1.4, S); g.fillRect(0, 52, S, 1.4);
    g.globalAlpha = 1;
  },
  sprinkles(g) {
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    g.lineCap = 'round'; g.lineWidth = 3.2;
    for (let i = 0; i < 16; i++) {
      const x = 6 + rnd() * 52, y = 6 + rnd() * 52, a = rnd() * Math.PI;
      g.strokeStyle = CONFETTI[i % CONFETTI.length];
      g.beginPath(); g.moveTo(x - Math.cos(a) * 3.4, y - Math.sin(a) * 3.4); g.lineTo(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4); g.stroke();
    }
  },
  bats(g, _b, ink) {
    for (const [x, y, k] of [[18, 22, 1], [48, 50, 0.9]] as const) {
      g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = ink;
      g.beginPath(); g.moveTo(0, -4); g.lineTo(-2, -7); g.lineTo(-1, -3.5); g.lineTo(1, -3.5); g.lineTo(2, -7); g.closePath(); g.fill(); // ears
      g.beginPath(); g.ellipse(0, 0, 3, 4, 0, 0, 7); g.fill(); // body
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 2, -2); g.quadraticCurveTo(s * 10, -8, s * 12, -1); g.quadraticCurveTo(s * 10, -2, s * 8.5, 1.5); g.quadraticCurveTo(s * 7, 0, s * 5.5, 3); g.quadraticCurveTo(s * 4, 1, s * 2, 3); g.closePath(); g.fill(); }
      g.restore();
    }
    g.fillStyle = ink; starPath(g, 50, 14, 3); g.fill(); dot(g, 14, 50, 1.6, ink);
  },
  flowers(g, _b, ink) {
    for (const [x, y, k] of [[16, 18, 1], [48, 48, 1], [46, 14, 0.6], [14, 50, 0.6]] as const) {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; dot(g, x + Math.cos(a) * 4.2 * k, y + Math.sin(a) * 4.2 * k, 3.2 * k, ink); }
      dot(g, x, y, 2.4 * k, '#ffd86e');
    }
  },
  checker(g, _b, ink) { g.fillStyle = ink; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) g.fillRect(x * 16, y * 16, 16, 16); },
  argyle(g, _b, ink) {
    g.fillStyle = ink; g.globalAlpha = 0.5;
    g.beginPath(); g.moveTo(32, 2); g.lineTo(62, 32); g.lineTo(32, 62); g.lineTo(2, 32); g.closePath(); g.fill();
    g.globalAlpha = 0.8; g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); g.globalAlpha = 1;
  },
  rainbow(g) { ['#ff9ec0', '#ffc48a', '#fff08a', '#a8e6b0', '#9bd4ff', '#c9b0ff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * S) / 6, S, S / 6 + 0.5); }); },
  bubbles(g, _b, ink) {
    const grad = g.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, '#ffc4e4'); grad.addColorStop(0.5, '#c4f0ff'); grad.addColorStop(1, '#e4d0ff');
    g.lineWidth = 1.6;
    for (const [x, y, r] of [[20, 22, 11], [46, 14, 6], [44, 46, 9], [12, 52, 5]]) {
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.strokeStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      dot(g, x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.16), ink);
    }
  },
  snowflakes(g, _b, ink) {
    g.strokeStyle = ink; g.lineWidth = 1.4; g.lineCap = 'round';
    for (const [x, y, r] of [[18, 20, 8], [48, 48, 8], [48, 14, 4], [14, 50, 4]]) {
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; g.beginPath(); g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    }
  },
  scales(g, _b, ink) {
    g.strokeStyle = ink; g.lineWidth = 1.5; g.globalAlpha = 0.75;
    for (let row = 0; row < 5; row++) for (let col = -1; col < 5; col++) {
      g.beginPath(); g.arc(col * 16 + (row % 2 ? 8 : 0), row * 8 - 4, 8, 0, Math.PI); g.stroke();
    }
    g.globalAlpha = 1;
  },
};

const tiles = new Map<string, HTMLCanvasElement>();
/** A tileable canvas for the print, painted over `base` (the fabric colour). Cached. */
export function patternTile(id: PatternId, base: string, ink?: string): HTMLCanvasElement {
  const inkC = ink ?? shade(base, -0.28);
  const key = `${id}|${base}|${inkC}`;
  let c = tiles.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = S * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  PAINT[id]?.(g, base, inkC);
  tiles.set(key, c);
  return c;
}

/** A 2D fill for the print. `zoom` shrinks or grows the motifs relative to the sprite. */
export function patternFill(ctx: CanvasRenderingContext2D, id: PatternId, base: string, ink?: string, zoom = 0.2): CanvasPattern | string {
  const pat = ctx.createPattern(patternTile(id, base, ink), 'repeat');
  if (!pat) return base;
  pat.setTransform(new DOMMatrix().scale(zoom / 2));
  return pat;
}
