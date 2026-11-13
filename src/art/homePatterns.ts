// Wallpaper and floor patterns for the home interior, painted on small canvases (no external assets).
// Used by the 3D room (as repeating textures) and by the decorate tray (as swatch thumbnails).
import type { FloorDef, WallDef } from '../homeData';

const heart = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.beginPath();
  g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s, y - s * 0.35, x - s * 0.45, y - s, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.35, x, y + s * 0.35);
  g.fill();
};

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

/** A seamless wallpaper tile (one repeat). `size` px square. */
export function paintWall(w: WallDef, size = 128): HTMLCanvasElement {
  const [c, g] = canvas(size);
  const u = size / 128;
  g.fillStyle = w.a; g.fillRect(0, 0, size, size);
  switch (w.kind) {
    case 'stripe':
      g.fillStyle = w.b;
      for (let x = 0; x < 128; x += 32) g.fillRect(x * u, 0, 16 * u, size);
      g.fillStyle = 'rgba(255,128,176,0.28)';
      for (let x = 0; x < 128; x += 32) g.fillRect((x + 16) * u - 1, 0, 2 * u, size);
      break;
    case 'dots':
      g.fillStyle = w.b;
      for (const [x, y] of [[32, 32], [96, 32], [64, 96], [0, 96], [128, 96]]) { g.beginPath(); g.arc(x * u, y * u, 11 * u, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(143,211,170,0.55)';
      for (const [x, y] of [[64, 32], [0, 32], [128, 32], [32, 96], [96, 96]]) { g.beginPath(); g.arc(x * u, y * u, 5 * u, 0, Math.PI * 2); g.fill(); }
      break;
    case 'hearts':
      g.fillStyle = w.b;
      heart(g, 32 * u, 34 * u, 13 * u); heart(g, 96 * u, 98 * u, 13 * u);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      heart(g, 96 * u, 34 * u, 7 * u); heart(g, 32 * u, 98 * u, 7 * u);
      break;
    case 'gingham':
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 128; i += 32) { g.fillRect(i * u, 0, 16 * u, size); g.fillRect(0, i * u, size, 16 * u); }
      g.fillStyle = 'rgba(255,160,120,0.22)';
      for (let i = 0; i < 128; i += 32) for (let j = 0; j < 128; j += 32) g.fillRect(i * u, j * u, 16 * u, 16 * u);
      break;
    case 'clouds':
      g.fillStyle = w.b;
      for (const [x, y, r] of [[34, 40, 1], [96, 100, 0.8]] as [number, number, number][]) {
        for (const [dx, dy, rad] of [[-12, 4, 11], [0, -3, 14], [13, 4, 11], [0, 8, 12]]) { g.beginPath(); g.arc((x + dx * r) * u, (y + dy * r) * u, rad * r * u, 0, Math.PI * 2); g.fill(); }
      }
      g.fillStyle = 'rgba(255,200,220,0.8)';
      for (const [x, y] of [[96, 34], [30, 100]]) { g.beginPath(); g.arc(x * u, y * u, 3.2 * u, 0, Math.PI * 2); g.fill(); }
      break;
  }
  return c;
}

/** A seamless floor tile covering 2x2 room cells. */
export function paintFloor(f: FloorDef, size = 128): HTMLCanvasElement {
  const [c, g] = canvas(size);
  const h = size / 2;
  g.fillStyle = f.a; g.fillRect(0, 0, size, size);
  g.fillStyle = f.b;
  switch (f.kind) {
    case 'checker':
      g.fillRect(0, 0, h, h); g.fillRect(h, h, h, h);
      break;
    case 'planks': {
      const ph = size / 4;
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? f.b : f.a; g.fillRect(0, i * ph, size, ph);
        g.fillStyle = 'rgba(150,100,60,0.28)'; g.fillRect(0, i * ph, size, 2);
        g.fillRect(((i * 37) % size) + 8, i * ph, 2, ph);
      }
      break;
    }
    case 'tile':
      g.fillStyle = f.b; g.fillRect(0, 0, size, size);
      g.fillStyle = f.a;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.roundRect(i * h + 4, j * h + 4, h - 8, h - 8, 10); g.fill(); }
      break;
    case 'plush':
      g.fillStyle = f.b;
      for (let i = 0; i < 60; i++) { const x = (i * 53) % size, y = (i * 97) % size; g.fillRect(x, y, 5, 2); }
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.strokeRect(0, 0, size, size);
      break;
    case 'herring': {
      const q = size / 4;
      g.fillStyle = f.b;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if ((i + j) % 2) g.fillRect(i * q, j * q + q * 0.5, q, q * 0.5); else g.fillRect(i * q + q * 0.5, j * q, q * 0.5, q);
      }
      g.strokeStyle = 'rgba(120,90,170,0.2)'; g.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q, size); g.stroke(); g.beginPath(); g.moveTo(0, i * q); g.lineTo(size, i * q); g.stroke(); }
      break;
    }
  }
  return c;
}
