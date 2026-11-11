// Shared drawing helpers for the chunky vector-cute style.
// Everything is drawn with soft rounded shapes and a warm plum outline (INK).

export const INK = '#5b3a4e';
export const INK_SOFT = 'rgba(91,58,78,0.55)';
export const SHADOW = 'rgba(70,56,110,0.2)';
export const FONT = '"Fredoka", ui-rounded, "Nunito", "Trebuchet MS", system-ui, sans-serif';

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Rounded rect with independent corner radii [tl, tr, br, bl]. Appends to the current path. */
export function rrc(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: [number, number, number, number]) {
  const [tl, tr, br, bl] = r;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr) ctx.arcTo(x + w, y, x + w, y + tr, tr); else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br);
  if (br) ctx.arcTo(x + w, y + h, x + w - br, y + h, br); else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl) ctx.arcTo(x, y + h, x, y + h - bl, bl); else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl);
  if (tl) ctx.arcTo(x, y, x + tl, y, tl); else ctx.lineTo(x, y);
  ctx.closePath();
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.fill();
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
  ctx.fill();
}

/** Stroke the current path with the cute outline. */
export function ink(ctx: CanvasRenderingContext2D, w = 1, col = INK) {
  ctx.lineWidth = w;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Fill then outline the current path. */
export function fs(ctx: CanvasRenderingContext2D, fill: string | CanvasPattern | CanvasGradient, w = 1, col = INK) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (w > 0) ink(ctx, w, col);
}

/** Outlined circle. */
export function oc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | CanvasPattern, w = 1, col = INK) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  fs(ctx, fill, w, col);
}

/** Outlined ellipse. */
export function oe(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasPattern, w = 1, col = INK, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
  fs(ctx, fill, w, col);
}

/** Outlined rounded rect. */
export function orr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasPattern | CanvasGradient, lw = 1, col = INK) {
  rr(ctx, x, y, w, h, r);
  fs(ctx, fill, lw, col);
}

/** Soft ground shadow. */
export function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.2) {
  ellipse(ctx, x, y, rx, ry, `rgba(70,56,110,${a})`);
}

export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, outline = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.0, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.0, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
  ctx.closePath();
  ctx.fill();
  if (outline) ink(ctx, outline);
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, outline = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.48;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  if (outline) ink(ctx, outline);
}

/** Four-point twinkle. */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.fill();
}

/** Tiny five-petal flower. */
export function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, center = '#ffd36e', outline = 0) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = petal;
    ctx.fill();
    if (outline) ink(ctx, outline, INK_SOFT);
  }
  circle(ctx, x, y, r * 0.34, center);
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16), nb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round((((na >> s) & 255) * (1 - t)) + (((nb >> s) & 255) * t)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Cute big shiny eye. (x, y) = eye center. */
export function eye(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, blink: boolean, iris = '#3a2333') {
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.quadraticCurveTo(x, y + ry * 0.7, x + rx, y);
    ink(ctx, Math.max(0.8, rx * 0.45), iris);
    return;
  }
  ellipse(ctx, x, y, rx, ry, iris);
  // soft lower iris glow
  ellipse(ctx, x, y + ry * 0.45, rx * 0.62, ry * 0.36, 'rgba(255,170,210,0.55)');
  circle(ctx, x + rx * 0.32, y - ry * 0.38, rx * 0.48, '#ffffff');
  circle(ctx, x - rx * 0.35, y + ry * 0.3, rx * 0.22, '#ffffff');
}

export function blush(ctx: CanvasRenderingContext2D, x: number, y: number, rx = 2.2, ry = 1.3) {
  ellipse(ctx, x, y, rx, ry, 'rgba(255,120,160,0.55)');
  circle(ctx, x - rx * 0.3, y - ry * 0.2, ry * 0.32, 'rgba(255,255,255,0.75)');
}

export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
