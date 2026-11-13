// Photo mode art, all drawn in code: soft filters, cute frames and stickers.
// Everything works on a plain 2D canvas so the live preview and the saved PNG use the very same drawing.
// Stickers and frames are sized from the shorter canvas side, so they look alike at any resolution.

const FONT = '"Fredoka", system-ui, sans-serif';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- filters

export interface FilterDef {
  id: string;
  name: string;
  /** Colour grade: 1 = unchanged. `fade` lifts the blacks (0..~0.15); `sepia` 0..1. */
  sat: number; contrast: number; bright: number; sepia: number; fade: number;
  /** Colour wash laid over the picture: r, g, b (0..255) and strength 0..1. */
  tint: [number, number, number, number];
  /** Corner darkening 0..1, film grain 0..1, and a soft glow (0..1) screened over bright areas. */
  vignette: number; grain: number; bloom: number;
}

export const FILTERS: FilterDef[] = [
  { id: 'natural', name: 'Natural', sat: 1, contrast: 1, bright: 1, sepia: 0, fade: 0, tint: [0, 0, 0, 0], vignette: 0, grain: 0, bloom: 0 },
  { id: 'warm', name: 'Warm', sat: 1.1, contrast: 1.05, bright: 1.03, sepia: 0.1, fade: 0, tint: [255, 168, 96, 0.17], vignette: 0.16, grain: 0, bloom: 0.1 },
  { id: 'pastel', name: 'Pastel', sat: 0.86, contrast: 0.86, bright: 1.1, sepia: 0, fade: 0.07, tint: [255, 205, 232, 0.16], vignette: 0, grain: 0, bloom: 0.12 },
  { id: 'film', name: 'Film', sat: 0.88, contrast: 1.12, bright: 1, sepia: 0.2, fade: 0.04, tint: [255, 226, 180, 0.09], vignette: 0.32, grain: 0.07, bloom: 0 },
  { id: 'dreamy', name: 'Dreamy bloom', sat: 1.05, contrast: 0.94, bright: 1.06, sepia: 0, fade: 0.03, tint: [222, 200, 255, 0.13], vignette: 0.12, grain: 0, bloom: 0.6 },
  { id: 'rosy', name: 'Rosy', sat: 1.12, contrast: 1, bright: 1.04, sepia: 0, fade: 0.02, tint: [255, 150, 190, 0.2], vignette: 0.1, grain: 0, bloom: 0.2 },
];

/** A CSS `filter` string approximating the grade, for the live preview over the game canvas. */
export function cssFilter(f: FilterDef): string {
  const parts = [`saturate(${f.sat})`, `contrast(${f.contrast})`, `brightness(${f.bright})`];
  if (f.sepia) parts.push(`sepia(${f.sepia})`);
  return parts.join(' ');
}

/** CSS background for the preview's wash + vignette + glow overlay (an element above the game canvas). */
export function cssWash(f: FilterDef): string {
  const [r, g, b, a] = f.tint;
  const layers: string[] = [];
  if (f.vignette) layers.push(`radial-gradient(ellipse at center, transparent 55%, rgba(60, 20, 40, ${f.vignette * 0.9}) 130%)`);
  if (f.bloom) layers.push(`radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, ${f.bloom * 0.3}), transparent 70%)`);
  if (a) layers.push(`linear-gradient(rgba(${r}, ${g}, ${b}, ${a}), rgba(${r}, ${g}, ${b}, ${a}))`);
  return layers.join(', ') || 'none';
}

/** Bake the filter into `c` (a 2D canvas, modified in place). Pure pixel maths, so it works in every browser. */
export function applyFilter(c: HTMLCanvasElement, f: FilterDef, seed = 1): void {
  if (f.id === 'natural') return;
  const g = c.getContext('2d');
  if (!g) return;
  const w = c.width, h = c.height;

  if (f.bloom > 0) { // a soft glow: a heavily shrunk copy, stretched back over the picture with the 'screen' blend
    const glow = document.createElement('canvas');
    glow.width = Math.max(1, Math.round(w / 12)); glow.height = Math.max(1, Math.round(h / 12));
    const gg = glow.getContext('2d');
    if (gg) {
      gg.imageSmoothingQuality = 'high';
      gg.drawImage(c, 0, 0, glow.width, glow.height);
      g.save();
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = Math.min(1, f.bloom * 0.8);
      g.drawImage(glow, 0, 0, w, h);
      g.restore();
    }
  }

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const [tr, tg, tb, ta] = f.tint;
  const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy);
  let rnd = (seed >>> 0) || 1; // tiny xorshift, so grain is steady for a given seed
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i], gr = d[i + 1], b = d[i + 2];
      const l = r * 0.299 + gr * 0.587 + b * 0.114;
      r = l + (r - l) * f.sat; gr = l + (gr - l) * f.sat; b = l + (b - l) * f.sat;
      if (f.sepia) {
        const sr = r * 0.393 + gr * 0.769 + b * 0.189, sg = r * 0.349 + gr * 0.686 + b * 0.168, sb = r * 0.272 + gr * 0.534 + b * 0.131;
        r += (sr - r) * f.sepia; gr += (sg - gr) * f.sepia; b += (sb - b) * f.sepia;
      }
      r = (r - 128) * f.contrast + 128; gr = (gr - 128) * f.contrast + 128; b = (b - 128) * f.contrast + 128;
      r *= f.bright; gr *= f.bright; b *= f.bright;
      if (f.fade) { const k = f.fade * 255; r = k + r * (1 - f.fade); gr = k + gr * (1 - f.fade); b = k + b * (1 - f.fade); }
      if (ta) { r += (tr - r) * ta; gr += (tg - gr) * ta; b += (tb - b) * ta; }
      if (f.vignette) {
        const dd = Math.hypot(x - cx, y - cy) / maxD;
        const v = 1 - f.vignette * Math.max(0, dd - 0.45) * 1.8;
        r *= v; gr *= v; b *= v;
      }
      if (f.grain) {
        rnd ^= rnd << 13; rnd ^= rnd >>> 17; rnd ^= rnd << 5;
        const n = (((rnd >>> 0) % 1000) / 1000 - 0.5) * 255 * f.grain;
        r += n; gr += n; b += n;
      }
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      d[i + 1] = gr < 0 ? 0 : gr > 255 ? 255 : gr;
      d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }
  g.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- shapes

function heartPath(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.5, y - s * 0.05, x - s * 0.8, y - s * 1.1, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.5, y - s * 0.05, x, y + s * 0.9);
  g.closePath();
}

function starPath(g: CanvasRenderingContext2D, x: number, y: number, r: number, points = 5, inner = 0.5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points, rr = i % 2 ? r * inner : r;
    g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/** A four-point twinkle. */
function twinklePath(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.closePath();
}

/** Adds a rounded rectangle to the current path (`fresh` starts a new path first). */
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fresh = true) {
  if (fresh) g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------------------------------------------------------------- stickers

export interface StickerDef { id: string; name: string }
export const STICKERS: StickerDef[] = [
  { id: 'heart', name: 'Heart' }, { id: 'star', name: 'Star' }, { id: 'sparkle', name: 'Sparkle' }, { id: 'bow', name: 'Bow' },
  { id: 'flower', name: 'Flower' }, { id: 'cloud', name: 'Cloud' }, { id: 'moon', name: 'Moon' }, { id: 'spots', name: 'Spots' },
  { id: 'cherry', name: 'Cherries' }, { id: 'hush', name: 'Hushbell' },
];

/** Draw one sticker centred at (x, y); `s` is its radius in pixels, `rot` in radians. */
export function drawSticker(g: CanvasRenderingContext2D, id: string, x: number, y: number, s: number, rot = 0): void {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // a soft white die-cut edge + shadow so every sticker reads on any background
  const cut = (path: () => void, fill: string, edge = s * 0.14) => {
    path();
    g.shadowColor = 'rgba(120, 40, 80, 0.3)'; g.shadowBlur = s * 0.2; g.shadowOffsetY = s * 0.07;
    g.lineWidth = edge * 2; g.strokeStyle = '#fff'; g.stroke();
    g.shadowColor = 'transparent';
    g.fillStyle = fill; g.fill();
  };
  const shine = (px: number, py: number, r: number) => { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(px, py, r, r * 0.6, -0.6, 0, TAU); g.fill(); };
  switch (id) {
    case 'heart': {
      cut(() => heartPath(g, 0, 0, s * 0.72), '#ff7fa9');
      shine(-s * 0.38, -s * 0.38, s * 0.13);
      break;
    }
    case 'star': {
      cut(() => starPath(g, 0, 0, s * 0.95, 5, 0.52), '#ffd966');
      shine(-s * 0.22, -s * 0.3, s * 0.11);
      break;
    }
    case 'sparkle': {
      cut(() => twinklePath(g, 0, 0, s), '#fff3a8', s * 0.1);
      cut(() => twinklePath(g, s * 0.62, -s * 0.55, s * 0.3), '#ffd1e6', s * 0.06);
      cut(() => twinklePath(g, -s * 0.6, s * 0.6, s * 0.24), '#d9c6ff', s * 0.05);
      break;
    }
    case 'bow': {
      cut(() => {
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(-s * 0.4, -s * 0.8, -s * 1.1, -s * 0.7, -s * 1, 0);
        g.bezierCurveTo(-s * 1.1, s * 0.7, -s * 0.4, s * 0.8, 0, 0);
        g.bezierCurveTo(s * 0.4, -s * 0.8, s * 1.1, -s * 0.7, s, 0);
        g.bezierCurveTo(s * 1.1, s * 0.7, s * 0.4, s * 0.8, 0, 0);
        g.closePath();
      }, '#ff9ec0');
      cut(() => { g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); }, '#ff6f9f', s * 0.05);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = s * 0.05;
      g.beginPath(); g.moveTo(-s * 0.35, -s * 0.12); g.quadraticCurveTo(-s * 0.65, -s * 0.3, -s * 0.8, -s * 0.12); g.stroke();
      break;
    }
    case 'flower': {
      cut(() => {
        g.beginPath();
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; g.moveTo(Math.cos(a) * s * 0.5 + s * 0.38, Math.sin(a) * s * 0.5); g.arc(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.38, 0, TAU); }
      }, '#ffb3d1');
      g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(0, 0, s * 0.26, 0, TAU); g.fill();
      g.fillStyle = '#ffb347'; g.beginPath(); g.arc(-s * 0.05, -s * 0.05, s * 0.09, 0, TAU); g.fill();
      break;
    }
    case 'cloud': {
      cut(() => {
        g.beginPath();
        g.moveTo(-s * 0.7, s * 0.4);
        g.arc(-s * 0.6, s * 0.1, s * 0.3, Math.PI * 0.5, Math.PI * 1.5);
        g.arc(-s * 0.2, -s * 0.25, s * 0.42, Math.PI * 1.1, Math.PI * 1.95);
        g.arc(s * 0.4, -s * 0.05, s * 0.34, Math.PI * 1.4, Math.PI * 0.45);
        g.lineTo(-s * 0.7, s * 0.4);
        g.closePath();
      }, '#fffafd');
      g.fillStyle = '#ffc9dd'; // blush cheeks on a happy little cloud
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * s * 0.3, s * 0.12, s * 0.09, s * 0.06, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#7a3b58';
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.17, s * 0.02, s * 0.045, 0, TAU); g.fill(); }
      g.strokeStyle = '#7a3b58'; g.lineWidth = s * 0.04; g.beginPath(); g.arc(0, s * 0.07, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      break;
    }
    case 'moon': {
      cut(() => { g.beginPath(); g.arc(0, 0, s * 0.85, 0.35 * Math.PI, 1.65 * Math.PI, false); g.arc(s * 0.38, -s * 0.05, s * 0.68, 1.45 * Math.PI, 0.55 * Math.PI, true); g.closePath(); }, '#ffe9a8');
      cut(() => twinklePath(g, s * 0.42, -s * 0.3, s * 0.22), '#fff', s * 0.04);
      break;
    }
    case 'spots': { // a little cluster of cheetah-print spots (the game's signature accent)
      const spot = (px: number, py: number, r: number, rotS: number) => {
        g.save(); g.translate(px, py); g.rotate(rotS);
        g.fillStyle = '#b9714a';
        g.beginPath(); g.ellipse(0, 0, r, r * 0.74, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffd9a3';
        g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.36, 0, 0, TAU); g.fill();
        g.restore();
      };
      cut(() => { g.beginPath(); g.ellipse(0, 0, s * 0.95, s * 0.75, 0, 0, TAU); }, '#ffe3c4');
      spot(-s * 0.4, -s * 0.15, s * 0.3, 0.4); spot(s * 0.3, -s * 0.3, s * 0.24, -0.5); spot(s * 0.1, s * 0.25, s * 0.28, 0.9); spot(-s * 0.55, s * 0.28, s * 0.16, 0);
      break;
    }
    case 'cherry': {
      g.strokeStyle = '#6fbf8f'; g.lineWidth = s * 0.1;
      g.beginPath(); g.moveTo(-s * 0.35, s * 0.2); g.quadraticCurveTo(-s * 0.2, -s * 0.5, s * 0.1, -s * 0.8); g.moveTo(s * 0.4, s * 0.25); g.quadraticCurveTo(s * 0.3, -s * 0.4, s * 0.1, -s * 0.8); g.stroke();
      cut(() => { g.beginPath(); g.ellipse(s * 0.12, -s * 0.8, s * 0.3, s * 0.14, -0.5, 0, TAU); }, '#8fd9a8', s * 0.05);
      cut(() => { g.beginPath(); g.arc(-s * 0.35, s * 0.4, s * 0.38, 0, TAU); }, '#ff5f8f', s * 0.08);
      cut(() => { g.beginPath(); g.arc(s * 0.4, s * 0.45, s * 0.38, 0, TAU); }, '#ff7fa9', s * 0.08);
      shine(-s * 0.48, s * 0.28, s * 0.1); shine(s * 0.28, s * 0.33, s * 0.1);
      break;
    }
    case 'hush': { // the island's own little stamp
      cut(() => roundRect(g, -s * 0.95, -s * 0.42, s * 1.9, s * 0.84, s * 0.42), '#fff4f9');
      g.fillStyle = '#e0709a';
      g.font = `700 ${s * 0.46}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Hushbell', s * 0.18, s * 0.03);
      cut(() => heartPath(g, -s * 0.66, -s * 0.02, s * 0.17), '#ff7fa9', s * 0.03);
      break;
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- frames

export interface FrameDef { id: string; name: string }
export const FRAMES: FrameDef[] = [
  { id: 'none', name: 'No frame' }, { id: 'polaroid', name: 'Polaroid' }, { id: 'scallop', name: 'Scallop' },
  { id: 'hearts', name: 'Hearts' }, { id: 'gingham', name: 'Gingham' }, { id: 'stamp', name: 'Postage' },
];

/** Paint a frame around the edge of a w x h canvas. `caption` goes on the Polaroid's chin. */
export function drawFrame(g: CanvasRenderingContext2D, id: string, w: number, h: number, caption = ''): void {
  if (id === 'none') return;
  const u = Math.min(w, h) / 100; // one "unit" = 1% of the short side
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  // paint a border as a frame-shaped path: outer rect minus the window (even-odd)
  const border = (x0: number, y0: number, x1: number, y1: number, r: number, fill: string | CanvasPattern) => {
    g.beginPath(); g.rect(0, 0, w, h);
    roundRect(g, x0, y0, w - x0 - x1, h - y0 - y1, r, false); // (same path as the outer rect, so even-odd leaves the window clear)
    g.fillStyle = fill; g.fill('evenodd');
  };
  switch (id) {
    case 'polaroid': {
      const side = 4 * u, chin = 17 * u;
      g.shadowColor = 'rgba(110, 51, 80, 0.3)'; g.shadowBlur = 3 * u;
      border(side, side, side, chin, 1.2 * u, '#fffaf6');
      g.shadowColor = 'transparent';
      g.fillStyle = '#c04d7e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 ${5.2 * u}px ${FONT}`;
      g.fillText(caption || 'Sugarlily Isle', w / 2, h - chin / 2 - 0.5 * u);
      g.fillStyle = '#ff9ec0'; heartPath(g, w / 2 - Math.min(w * 0.36, 34 * u), h - chin / 2, 1.8 * u); g.fill();
      heartPath(g, w / 2 + Math.min(w * 0.36, 34 * u), h - chin / 2, 1.8 * u); g.fill();
      break;
    }
    case 'scallop': {
      const t = 3.2 * u;
      border(t, t, t, t, 3 * u, '#fff3f8');
      g.fillStyle = '#fff3f8';
      const r = 2.6 * u;
      const bump = (cx: number, cy: number) => { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); };
      for (let x = t + r; x < w - t; x += r * 2) { bump(x, t + r * 0.55); bump(x, h - t - r * 0.55); }
      for (let y = t + r; y < h - t; y += r * 2) { bump(t + r * 0.55, y); bump(w - t - r * 0.55, y); }
      g.strokeStyle = '#ffb3cf'; g.lineWidth = 0.7 * u; g.setLineDash([2 * u, 1.6 * u]);
      roundRect(g, t * 0.45, t * 0.45, w - t * 0.9, h - t * 0.9, 2 * u); g.stroke();
      break;
    }
    case 'hearts': {
      const t = 5.5 * u;
      border(t, t, t, t, 3 * u, '#ffd3e3');
      g.fillStyle = '#ff8fb6';
      const row = (cx: number, cy: number, i: number) => { heartPath(g, cx, cy, (1.55 + (i % 2) * 0.35) * u); g.fill(); };
      let i = 0;
      for (let x = t; x < w - t / 2; x += 6 * u) { row(x, t / 2, i); row(w - x, h - t / 2, i++); }
      for (let y = t + 3 * u; y < h - t; y += 6 * u) { row(t / 2, y, i); row(w - t / 2, h - y, i++); }
      g.strokeStyle = '#fff'; g.lineWidth = 0.9 * u;
      roundRect(g, t, t, w - t * 2, h - t * 2, 3 * u); g.stroke();
      break;
    }
    case 'gingham': {
      const t = 5 * u, cell = 2.5 * u;
      const tile = document.createElement('canvas');
      tile.width = tile.height = Math.max(2, Math.round(cell * 2));
      const tg = tile.getContext('2d');
      let fill: string | CanvasPattern = '#ffc3da';
      if (tg) {
        const c = tile.width / 2;
        tg.fillStyle = '#fff6fa'; tg.fillRect(0, 0, tile.width, tile.height);
        tg.fillStyle = 'rgba(255, 143, 182, 0.55)'; tg.fillRect(0, 0, c, tile.height); tg.fillRect(0, 0, tile.width, c);
        tg.fillStyle = 'rgba(255, 143, 182, 0.3)'; tg.fillRect(c, c, c, c);
        fill = g.createPattern(tile, 'repeat') ?? fill;
      }
      border(t, t, t, t, 2 * u, fill);
      g.strokeStyle = '#fff'; g.lineWidth = 0.8 * u;
      roundRect(g, t, t, w - t * 2, h - t * 2, 2 * u); g.stroke();
      // a bow at the corner
      drawSticker(g, 'bow', t + 3.5 * u, t + 3.5 * u, 4.8 * u, -0.4);
      break;
    }
    case 'stamp': {
      const t = 4.5 * u;
      g.fillStyle = '#fffaf2';
      g.beginPath(); g.rect(0, 0, w, h);
      g.rect(t, t, w - t * 2, h - t * 2);
      g.fill('evenodd');
      // perforations: cut half-circles out of the paper's edge with a transparent look (drawn as the backdrop pink)
      g.fillStyle = '#ffd3e3';
      const r = 1.3 * u, step = 3.4 * u;
      for (let x = step / 2; x < w; x += step) { g.beginPath(); g.arc(x, 0, r, 0, TAU); g.fill(); g.beginPath(); g.arc(x, h, r, 0, TAU); g.fill(); }
      for (let y = step / 2; y < h; y += step) { g.beginPath(); g.arc(0, y, r, 0, TAU); g.fill(); g.beginPath(); g.arc(w, y, r, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(224, 112, 154, 0.5)'; g.lineWidth = 0.6 * u;
      g.strokeRect(t, t, w - t * 2, h - t * 2);
      break;
    }
  }
  g.restore();
}
