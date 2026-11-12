// 2D clothes for the player sprite / wardrobe thumbnails. Same shape vocabulary as the 3D library
// (clothes/shapes.ts + render/clothes3d.ts), drawn with the chunky outlined style of art/characters.ts.
import { BOTTOM_SHAPES, DRESS_SHAPES, TOP_SHAPES } from '../clothes/shapes';
import type { ClothDef, Look } from '../clothes/types';
import { cheetahPattern } from './cheetah';
import { INK, circle, fs, heart, ink, oc, oe, shade, star } from './draw';
import { patternFill } from './patterns';

export interface P2 { side: number; back: boolean; step: number }
const LW = 1.05;
const Y = (units: number) => -3.4 - units * 27; // hip-relative model height -> sprite y
const SKIN = '#ffe4d4';

/** Fill style for an item: its colour, or its print. */
export function fillOf(ctx: CanvasRenderingContext2D, c: ClothDef, zoom = 0.17): string | CanvasPattern {
  if (c.pattern === 'cheetah') return cheetahPattern(ctx, 'classic', 0.32);
  if (c.pattern === 'cheetahpink') return cheetahPattern(ctx, 'pink', 0.32);
  return c.pattern ? patternFill(ctx, c.pattern, c.color, c.ink, zoom) : c.color;
}
const trimFill = (ctx: CanvasRenderingContext2D, c: ClothDef) =>
  c.trimPattern === 'cheetah' ? cheetahPattern(ctx, 'classic', 0.22) : c.trim;
const has = (c: ClothDef | undefined, k: string) => !!c?.deco?.includes(k);

function bellPath(ctx: CanvasRenderingContext2D, top: number, bot: number, wt: number, wb: number) {
  ctx.beginPath();
  ctx.moveTo(-wt, top + 1.5);
  ctx.quadraticCurveTo(-wt, top, -wt + 2, top);
  ctx.lineTo(wt - 2, top);
  ctx.quadraticCurveTo(wt, top, wt, top + 1.5);
  ctx.quadraticCurveTo(wb + 0.4, bot - 3, wb, bot - 1.6);
  ctx.quadraticCurveTo(wb - 0.5, bot, wb - 2.5, bot);
  ctx.lineTo(-wb + 2.5, bot);
  ctx.quadraticCurveTo(-wb + 0.5, bot, -wb, bot - 1.6);
  ctx.quadraticCurveTo(-wb - 0.4, bot - 3, -wt, top + 1.5);
  ctx.closePath();
}

/** Trim colour band along the bottom of a body piece. */
function hemBand(ctx: CanvasRenderingContext2D, c: ClothDef, path: () => void, y0: number, h: number) {
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = trimFill(ctx, c); ctx.fillRect(-14, y0 - h, 28, h + 2);
  ctx.beginPath(); ctx.moveTo(-14, y0 - h); ctx.lineTo(14, y0 - h); ink(ctx, 0.6);
  ctx.restore();
}

// ---------- arms / legs ----------
export function sleeveFill(ctx: CanvasRenderingContext2D, look: Look): { len: number; fill: string | CanvasPattern } {
  const c = look.dress ?? look.top;
  const len = (look.dress ? DRESS_SHAPES[c.shape]?.sleeve : TOP_SHAPES[c.shape]?.sleeve) ?? 1;
  const fromTrim = look.dress && c.shape === 'pinafore';
  return { len, fill: fromTrim ? c.trim : fillOf(ctx, c) };
}

export function drawArms(ctx: CanvasRenderingContext2D, look: Look, p: P2) {
  const sw = p.step * 2.4, { len, fill } = sleeveFill(ctx, look);
  for (const sx of [-1, 1]) {
    const y = -12.3 + sw * (p.side ? 0.3 : 0.5) * (sx < 0 ? 1 : -1);
    oe(ctx, sx * 8.3, y, 2.6, 3.3, len >= 2 ? fill : SKIN, LW, INK, -sx * 0.35);
    if (len === 1 || len === 3) oe(ctx, sx * 8.0, y - 1.7, 2.7, len === 3 ? 2.2 : 1.7, fill, 0.8, INK, -sx * 0.35);
  }
}

export function drawLegs(ctx: CanvasRenderingContext2D, look: Look, p: P2, hemY: number) {
  const bot = Y(look.dress ? DRESS_SHAPES[look.dress.shape]?.yh ?? 0 : BOTTOM_SHAPES[look.bottom.shape]?.yh ?? 0.08);
  void hemY;
  const kind = look.dress ? 'skirt' : BOTTOM_SHAPES[look.bottom.shape]?.kind ?? 'skirt';
  const pants = kind === 'pants' || kind === 'overalls';
  const a = p.step * 1.4;
  for (const sx of [-1, 1]) {
    const x = sx * 3.4 + (p.side ? sx * -a * 0.2 : 0);
    ctx.beginPath(); ctx.roundRect?.(x - 1.9, bot - 2, 3.8, -2.2 - (bot + 3.6), 1.4);
    ctx.fillStyle = pants ? fillOf(ctx, look.bottom) : SKIN; ctx.fill(); ink(ctx, 0.7);
  }
}

// ---------- body ----------
export function drawBody(ctx: CanvasRenderingContext2D, look: Look, p: P2) {
  const top = -18.5;
  if (look.dress) { drawDress(ctx, look.dress, top); return; }
  drawBottom(ctx, look.bottom);
  drawTop(ctx, look.top, top);
  void p;
}

function drawDress(ctx: CanvasRenderingContext2D, c: ClothDef, top: number) {
  const s = DRESS_SHAPES[c.shape] ?? DRESS_SHAPES.aline;
  const bot = Y(s.yh), wb = s.rh * 27 + 0.4, wt = c.shape === 'onesie' || c.shape === 'sweater' ? 7.2 : 6.4;
  const path = () => bellPath(ctx, top, bot, wt, wb);
  path(); fs(ctx, fillOf(ctx, c), LW);
  hemBand(ctx, c, path, bot, 2.6);
  path(); ink(ctx, LW);
  extras2d(ctx, c, top, bot, wb, true);
}
function drawTop(ctx: CanvasRenderingContext2D, c: ClothDef, top: number) {
  const s = TOP_SHAPES[c.shape] ?? TOP_SHAPES.tee;
  const bot = Y(s.yb), wt = 6.6 * s.puff, wb = 7.1 * s.puff * s.flare;
  const path = () => bellPath(ctx, top, bot, wt, wb);
  path(); fs(ctx, fillOf(ctx, c), LW);
  if (['jacket', 'jersey', 'hoodie', 'sweater', 'cardigan'].includes(c.shape) || has(c, 'ruffle') || has(c, 'stripehem')) hemBand(ctx, c, path, bot, 2.2);
  path(); ink(ctx, LW);
  extras2d(ctx, c, top, bot, wb, false);
}
function drawBottom(ctx: CanvasRenderingContext2D, c: ClothDef) {
  const s = BOTTOM_SHAPES[c.shape] ?? BOTTOM_SHAPES.skirt;
  const waist = Y(0.38), bot = Y(s.yh), wb = s.rh * 27 * (s.kind === 'skirt' ? 1 : 0.85);
  const path = () => bellPath(ctx, waist, bot, 6.4, wb);
  path(); fs(ctx, fillOf(ctx, c), LW);
  if (s.kind === 'skirt') hemBand(ctx, c, path, bot, 2.4);
  path(); ink(ctx, LW);
  if (s.kind === 'overalls') {
    ctx.beginPath(); ctx.roundRect?.(-4.6, Y(0.55), 9.2, Y(0.3) - Y(0.55), 2); fs(ctx, fillOf(ctx, c), LW);
    ctx.fillStyle = fillOf(ctx, c); ctx.fillRect(-5, Y(0.58), 2, 4); ctx.fillRect(3, Y(0.58), 2, 4);
    circle(ctx, -4, Y(0.52), 0.9, '#fff'); circle(ctx, 4, Y(0.52), 0.9, '#fff');
  }
  extras2d(ctx, c, waist, bot, wb, false);
}

/** Collars, buttons, bows, belts… the little details, shared by every body piece. */
function extras2d(ctx: CanvasRenderingContext2D, c: ClothDef, top: number, bot: number, wb: number, whole: boolean) {
  const tr = trimFill(ctx, c);
  const mid = (top + bot) / 2;
  if (has(c, 'collar')) { oe(ctx, -2.6, top + 0.9, 3, 1.8, '#fff', 0.8); oe(ctx, 2.6, top + 0.9, 3, 1.8, '#fff', 0.8); }
  if (has(c, 'sailor')) { ctx.beginPath(); ctx.moveTo(-7, top); ctx.lineTo(7, top); ctx.lineTo(0, top + 7); ctx.closePath(); fs(ctx, tr, 0.8); circle(ctx, 0, top + 6.2, 1, '#ff6f84'); }
  if (has(c, 'turtle')) { ctx.beginPath(); ctx.roundRect?.(-3.8, top - 1.6, 7.6, 3.2, 1.4); fs(ctx, fillOf(ctx, c), 0.8); }
  if (has(c, 'fur')) { oe(ctx, -3, top + 1, 3.6, 2.1, '#fff', 0.8); oe(ctx, 3, top + 1, 3.6, 2.1, '#fff', 0.8); }
  if (has(c, 'hood')) { ctx.beginPath(); ctx.ellipse(0, top - 1, 7.6, 2.4, 0, 0, Math.PI); fs(ctx, fillOf(ctx, c), 0.8); }
  if (has(c, 'buttons')) for (const k of [0.25, 0.5, 0.75]) circle(ctx, 0, top + (bot - top) * k, 0.85, c.pattern || c.trim === '#ffffff' ? '#fff' : c.trim);
  if (has(c, 'zip')) { ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.lineTo(0, bot - 1); ink(ctx, 0.7, '#fff'); }
  if (has(c, 'ruffle')) for (let i = -4; i <= 4; i++) oc(ctx, i * (wb / 4.4), bot - 0.6, 1.3, '#fff', 0.5);
  if (has(c, 'belt')) { ctx.beginPath(); ctx.roundRect?.(-wb * 0.62, mid - 0.5, wb * 1.24, 1.8, 0.8); fs(ctx, tr, 0.6); circle(ctx, 0, mid + 0.4, 0.9, '#ffd36e'); }
  if (has(c, 'apron')) { ctx.beginPath(); ctx.roundRect?.(-4.4, mid - 3, 8.8, bot - mid + 3, [1, 1, 2.5, 2.5] as unknown as number); fs(ctx, tr, 0.7); ctx.beginPath(); ctx.roundRect?.(-2.4, bot - 6, 4.8, 2.6, 1); fs(ctx, shade(typeof tr === 'string' ? tr : '#ffffff', -0.08), 0.5); }
  if (has(c, 'pocket')) { ctx.beginPath(); ctx.roundRect?.(-2.6, mid + 1, 5.2, 3.2, 1.2); fs(ctx, tr, 0.6); }
  if (has(c, 'bow')) { oe(ctx, -2.2, mid - 1, 2.2, 1.5, '#fff', 0.7); oe(ctx, 2.2, mid - 1, 2.2, 1.5, '#fff', 0.7); circle(ctx, 0, mid - 1, 0.9, typeof tr === 'string' ? tr : '#ff9ec0'); }
  if (has(c, 'heart')) heart(ctx, 0, mid - 1, 1.6, '#ff8fb6');
  if (has(c, 'star') || has(c, 'logo:star')) star(ctx, 0, mid - 1, 2.2, '#ffd36e', 0.5);
  if (has(c, 'moonbrooch')) { circle(ctx, 0, top + 3, 1.5, '#ffd36e'); circle(ctx, 0.7, top + 2.6, 1.3, typeof c.color === 'string' ? c.color : '#fff'); }
  if (has(c, 'ghost')) { oe(ctx, 0, mid, 2, 2.6, '#fff', 0.6); circle(ctx, -0.7, mid - 0.4, 0.3, INK); circle(ctx, 0.7, mid - 0.4, 0.3, INK); }
  if (has(c, 'logo:lamb')) for (const [x, y] of [[-1, 0], [1, 0], [0, -1.2], [0, 1.2]]) circle(ctx, x, mid + y, 1.1, '#fff');
  if (has(c, 'fringe')) { ctx.strokeStyle = typeof tr === 'string' ? tr : '#fff0d8'; ctx.lineWidth = 0.8; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * (wb / 5.6), bot - 1); ctx.lineTo(i * (wb / 5.6), bot + 1.8); ctx.stroke(); } }
  if (has(c, 'studs')) for (let i = -3; i <= 3; i++) circle(ctx, i * 2, mid, 0.5, '#e8e8f4');
  if (has(c, 'tail') && !whole) circle(ctx, wb * 0.9, bot - 2, 1.6, '#fff');
  if (has(c, 'sparkle')) { star(ctx, -4.5, bot - 5, 1.2, '#fff3a8'); star(ctx, 4, bot - 8, 1, '#fff3a8'); }
  if (has(c, 'poodle')) { oc(ctx, -5, bot - 4, 2.2, '#fff', 0.5); circle(ctx, -5, bot - 6, 1, '#fff'); }
  if (has(c, 'wings')) { oe(ctx, -9.4, top + 4, 2, 4.2, 'rgba(255,255,255,0.85)', 0.6, INK, 0.3); oe(ctx, 9.4, top + 4, 2, 4.2, 'rgba(255,255,255,0.85)', 0.6, INK, -0.3); }
  if (has(c, 'cape')) { ctx.beginPath(); ctx.moveTo(-7, top + 1); ctx.lineTo(-10, bot - 2); ctx.lineTo(-6, bot - 4); ctx.closePath(); fs(ctx, tr, 0.6); ctx.beginPath(); ctx.moveTo(7, top + 1); ctx.lineTo(10, bot - 2); ctx.lineTo(6, bot - 4); ctx.closePath(); fs(ctx, tr, 0.6); }
}

// ---------- shoes ----------
export function drawShoes(ctx: CanvasRenderingContext2D, shoes: ClothDef | undefined, p: P2) {
  const a = p.step * 2.2, spread = 3.4;
  for (const sx of [-1, 1]) {
    const x = sx * spread + (p.side ? -sx * a * 0.4 : 0), y = -1.8 - Math.max(0, sx < 0 ? a : -a) * 0.7;
    if (!shoes) { oe(ctx, x, y, 2.9, 2.3, SKIN, LW); continue; }
    const f = fillOf(ctx, shoes, 0.12), s = shoes.shape, tall = ['boot', 'rainboot', 'cowboyboot', 'hightop'].includes(s);
    if (tall) { ctx.beginPath(); ctx.roundRect?.(x - 2.5, y - (s === 'hightop' ? 5 : 7), 5, s === 'hightop' ? 5 : 7, 1.4); fs(ctx, f, 0.8); }
    if (s === 'sandal') { oe(ctx, x, y + 0.4, 3, 1.8, shoes.color, LW); ctx.beginPath(); ctx.moveTo(x - 2.4, y - 0.6); ctx.lineTo(x + 2.4, y - 0.6); ink(ctx, 0.8, shoes.trim); continue; }
    const big = s === 'slipper' ? 1.15 : 1;
    oe(ctx, x, y, 3.2 * big, 2.6 * big, f, LW);
    if (s === 'platform') { ctx.beginPath(); ctx.roundRect?.(x - 3.3, y + 1.4, 6.6, 2.2, 1); fs(ctx, shoes.trim, 0.7); }
    else if (s === 'sneaker' || s === 'hightop' || s === 'rainboot') { ctx.beginPath(); ctx.moveTo(x - 3, y + 2.1); ctx.lineTo(x + 3, y + 2.1); ink(ctx, 1.1, '#fff'); }
    else if (s === 'mary' || s === 'ballet') { ctx.beginPath(); ctx.moveTo(x - 2.2, y - 0.2); ctx.lineTo(x + 2.2, y - 0.2); ink(ctx, 0.8, shoes.trim === shoes.color ? '#fff' : shoes.trim); }
    if (has(shoes, 'ears')) { oe(ctx, x - 1.3, y - 3, 0.9, 2, f, 0.5); oe(ctx, x + 1.3, y - 3, 0.9, 2, f, 0.5); }
    if (has(shoes, 'eyes')) { circle(ctx, x - 1.2, y - 1.4, 0.9, '#fff'); circle(ctx, x + 1.2, y - 1.4, 0.9, '#fff'); }
    if (has(shoes, 'fur')) oe(ctx, x, y - 6.6, 3, 1, '#fff', 0.5);
  }
}

// ---------- bags ----------
const HANDS = ['shopping', 'tote', 'basket', 'lunchbox', 'heartbag', 'plush', 'balloon', 'umbrella'];
/** Backpack-style bags peek out behind the body. Call before the body. */
export function drawBagBack(ctx: CanvasRenderingContext2D, bag: ClothDef | undefined) {
  if (!bag || HANDS.includes(bag.shape) || ['purse', 'satchel'].includes(bag.shape)) return;
  const f = fillOf(ctx, bag, 0.15);
  ctx.beginPath(); ctx.roundRect?.(-8, -21, 16, 17, 4); fs(ctx, f, LW);
  if (bag.shape === 'bearpack') {
    if (has(bag, 'bunnyears')) { oe(ctx, -3.5, -26, 1.6, 4, f, 0.8); oe(ctx, 3.5, -26, 1.6, 4, f, 0.8); }
    else { oc(ctx, -5, -22, 2.4, f, 0.8); oc(ctx, 5, -22, 2.4, f, 0.8); }
  }
}
/** The bag in front: hand-held, or on the hip. Call after the body. */
export function drawBagFront(ctx: CanvasRenderingContext2D, bag: ClothDef | undefined, back: boolean) {
  if (!bag || back) return;
  const f = fillOf(ctx, bag, 0.15), tr = bag.trim;
  switch (bag.shape) {
    case 'shopping': oe(ctx, 9.8, -4.6, 3.4, 3.2, f, LW); heart(ctx, 9.8, -4.6, 1.1, '#fff'); ctx.beginPath(); ctx.arc(9.8, -7.6, 1.8, Math.PI, 0); ink(ctx, 0.8, '#fff'); break;
    case 'tote': ctx.beginPath(); ctx.roundRect?.(7, -9, 6.4, 7.4, 1.4); fs(ctx, f, LW); ctx.beginPath(); ctx.arc(10.2, -9, 1.9, Math.PI, 0); ink(ctx, 0.9, tr); break;
    case 'basket': ctx.beginPath(); ctx.roundRect?.(6.8, -6.4, 7, 4.6, 1.6); fs(ctx, f, LW); ctx.beginPath(); ctx.arc(10.3, -6.4, 3.2, Math.PI, 0); ink(ctx, 1, tr); break;
    case 'lunchbox': ctx.beginPath(); ctx.roundRect?.(7, -7.4, 7, 5, 1.2); fs(ctx, f, LW); ctx.fillStyle = tr; ctx.fillRect(7.2, -5.2, 6.6, 0.8); break;
    case 'heartbag': heart(ctx, 10.4, -4.6, 4.2, bag.color, 1); break;
    case 'plush': oe(ctx, 10.4, -3.6, 3, 3.3, f, LW); oc(ctx, 10.4, -8, 2.6, f, LW); oc(ctx, 8.6, -10.3, 1.2, f, 0.7); oc(ctx, 12.2, -10.3, 1.2, f, 0.7); break;
    case 'balloon': for (const [x, y, col] of [[7, -26, bag.color], [11.5, -29, tr], [14.5, -25, '#9bd4ff']] as const) { ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(x, y + 3); ink(ctx, 0.5, '#fff'); oe(ctx, x, y, 2.6, 3.2, col, 0.8); } break;
    case 'umbrella': ctx.beginPath(); ctx.moveTo(9.5, -8); ctx.lineTo(12, -26); ink(ctx, 1, '#fff'); ctx.beginPath(); ctx.ellipse(12, -26, 8, 4.4, -0.1, Math.PI, 0); ctx.closePath(); fs(ctx, f, LW); break;
    case 'purse': ctx.beginPath(); ctx.roundRect?.(-14, -10, 7, 5.4, 1.4); fs(ctx, f, LW); circle(ctx, -10.5, -9.6, 0.8, '#ffd36e'); break;
    case 'satchel': ctx.beginPath(); ctx.roundRect?.(7, -10, 8, 6, 1.4); fs(ctx, f, LW); ctx.fillStyle = tr; ctx.fillRect(7.2, -10, 7.6, 2.4); circle(ctx, 11, -7, 0.8, '#ffd36e'); break;
  }
}

// ---------- hats ----------
export function drawHat(ctx: CanvasRenderingContext2D, hat: ClothDef | undefined, hx: number, hy: number, p: P2) {
  if (!hat) return;
  const f = fillOf(ctx, hat, 0.14), tr = trimFill(ctx, hat), side = p.side, back = p.back;
  switch (hat.shape) {
    case 'bow': bow2(ctx, hx + (back ? 0 : 5.5), hy - 11, 0.95, f, hat.trim, 0.18); break;
    case 'batbow': for (const d of [-1, 1]) { oe(ctx, hx + 5.5 + d * 4, hy - 11, 4, 2.6, f, LW, INK, d * 0.3); } circle(ctx, hx + 5.5, hy - 11, 1.4, hat.trim); break;
    case 'beret': oe(ctx, hx - 1.4, hy - 9.6, 10.6, has(hat, 'flat') ? 3.6 : 4.6, f, LW, INK, -0.12); if (!has(hat, 'flat')) oc(ctx, hx - 1, hy - 14.4, 1.5, hat.trim, 0.8); break;
    case 'sunhat': {
      oe(ctx, hx, hy - 7.6, 16, 4.8, f, LW);
      ctx.beginPath(); ctx.ellipse(hx, hy - 10.5, 8.4, 6.5, 0, Math.PI, 0); ctx.lineTo(hx + 8.4, hy - 8.4); ctx.quadraticCurveTo(hx, hy - 6.5, hx - 8.4, hy - 8.4); ctx.closePath(); fs(ctx, f, LW);
      ctx.fillStyle = tr; ctx.fillRect(hx - 8.4, hy - 11.4, 16.8, 3);
      ctx.beginPath(); ctx.moveTo(hx - 8.4, hy - 11.6); ctx.lineTo(hx + 8.4, hy - 11.6); ctx.moveTo(hx - 8.4, hy - 8.4); ctx.lineTo(hx + 8.4, hy - 8.4); ink(ctx, 0.6);
      break;
    }
    case 'cowboy': oe(ctx, hx, hy - 8.2, 17, 4.2, f, LW); ctx.beginPath(); ctx.roundRect?.(hx - 7.2, hy - 17, 14.4, 9.4, 3.4); fs(ctx, f, LW); ctx.fillStyle = hat.trim; ctx.fillRect(hx - 7.1, hy - 11, 14.2, 2.4); if (has(hat, 'star')) star(ctx, hx, hy - 9.8, 1.4, '#ffd36e'); break;
    case 'witch': oe(ctx, hx, hy - 8.4, 15, 4.2, f, LW); ctx.beginPath(); ctx.moveTo(hx - 7, hy - 9); ctx.quadraticCurveTo(hx - 3, hy - 20, hx + 5, hy - 30); ctx.quadraticCurveTo(hx + 2, hy - 18, hx + 7, hy - 9); ctx.closePath(); fs(ctx, f, LW); ctx.fillStyle = hat.trim; ctx.fillRect(hx - 6.6, hy - 12.2, 13.2, 2.6); break;
    case 'party': {
      ctx.beginPath(); ctx.moveTo(hx - 7.6, hy - 8.4); ctx.lineTo(hx + 4, hy - 31); ctx.lineTo(hx + 8.4, hy - 8.4); ctx.closePath(); fs(ctx, f, LW);
      oe(ctx, hx + 0.4, hy - 8.2, 8.4, 2.1, tr, 0.9);
      if (has(hat, 'star')) star(ctx, hx + 4, hy - 31.5, 3.4, '#ffd36e', 0.6); else oc(ctx, hx + 4, hy - 31.5, 2.6, tr, 0.9);
      if (has(hat, 'bell')) oc(ctx, hx + 8, hy - 28, 1.4, '#ffd36e', 0.6);
      if (has(hat, 'pearls')) for (let i = -2; i <= 2; i++) circle(ctx, hx + 0.4 + i * 3, hy - 7.6 + Math.abs(i) * 0.3, 1, '#fffafd');
      if (has(hat, 'sparkle')) { star(ctx, hx - 9, hy - 20, 1.7, '#fff3a8'); star(ctx, hx + 11, hy - 24, 1.4, '#fff3a8'); star(ctx, hx - 4, hy - 31, 1.2, '#fff3a8'); }
      break;
    }
    case 'catears': for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + d * 3, hy - 10.5); ctx.lineTo(hx + d * 6.5, hy - 19); ctx.lineTo(hx + d * 10.5, hy - 8.5); ctx.closePath(); fs(ctx, f, LW); ctx.beginPath(); ctx.moveTo(hx + d * 5, hy - 11); ctx.lineTo(hx + d * 6.6, hy - 15.6); ctx.lineTo(hx + d * 8.8, hy - 10); ctx.closePath(); ctx.fillStyle = hat.trim; ctx.fill(); } break;
    case 'bunnyears': for (const d of [-1, 1]) { oe(ctx, hx + d * 5, hy - 18.5, 2.8, 8.5, f, LW, INK, d * 0.1); oe(ctx, hx + d * 5, hy - 18, 1.4, 6, hat.trim, 0.4, INK, d * 0.1); } break;
    case 'flowercrown': for (let i = 0; i < 7; i++) { const a = Math.PI * (1.08 + (i / 6) * 0.84); const x = hx + Math.cos(a) * 11.4, y = hy + 1 + Math.sin(a) * 11.4; oc(ctx, x, y, 2.6, i % 2 ? '#fff' : hat.trim, 0.7); circle(ctx, x, y, 0.9, '#ffd86e'); } break;
    case 'beanie': ctx.beginPath(); ctx.ellipse(hx, hy - 4.5, 12.4, 10, 0, Math.PI, 0); ctx.closePath(); fs(ctx, f, LW); ctx.beginPath(); ctx.roundRect?.(hx - 12.4, hy - 6.6, 24.8, 3.6, 1.6); fs(ctx, hat.trim, 0.8); oc(ctx, hx, hy - 15.2, 2.6, hat.trim, 0.8); break;
    case 'bucket': ctx.beginPath(); ctx.moveTo(hx - 8, hy - 9); ctx.lineTo(hx - 6.6, hy - 17); ctx.lineTo(hx + 6.6, hy - 17); ctx.lineTo(hx + 8, hy - 9); ctx.closePath(); fs(ctx, f, LW); oe(ctx, hx, hy - 8.2, 13.6, 3.2, f, LW); break;
    case 'cap': ctx.beginPath(); ctx.ellipse(hx, hy - 6.6, 11.6, 8.6, 0, Math.PI, 0); ctx.closePath(); fs(ctx, f, LW); if (!back) oe(ctx, hx + 2, hy - 6.4, 8.4, 2.2, hat.trim, 0.8); break;
    case 'tiara': for (const [dx, h] of [[-6, 3], [-3, 4.6], [0, 5.8], [3, 4.6], [6, 3]] as const) { ctx.beginPath(); ctx.moveTo(hx + dx - 1.4, hy - 10.4); ctx.lineTo(hx + dx, hy - 10.4 - h); ctx.lineTo(hx + dx + 1.4, hy - 10.4); ctx.closePath(); fs(ctx, f, 0.7); } circle(ctx, hx, hy - 12.2, 1.1, hat.trim); break;
    case 'headband': ctx.beginPath(); ctx.arc(hx, hy + 1, 11.6, Math.PI * 1.06, Math.PI * 1.94); ink(ctx, 2.2, INK); ctx.beginPath(); ctx.arc(hx, hy + 1, 11.6, Math.PI * 1.06, Math.PI * 1.94); ink(ctx, 1.2, typeof f === 'string' ? f : hat.color); if (has(hat, 'bow')) bow2(ctx, hx + 7, hy - 9, 0.62, hat.trim, hat.trim, 0.3); if (has(hat, 'cloud')) { oc(ctx, hx - 1, hy - 13.4, 2.6, '#fff', 0.7); oc(ctx, hx + 2.6, hy - 13.4, 2.2, '#fff', 0.7); } if (has(hat, 'stars')) { star(ctx, hx - 4, hy - 17, 2.2, '#ffe27a', 0.5); star(ctx, hx + 4, hy - 17, 2.2, '#ffe27a', 0.5); } break;
    case 'earmuffs': ctx.beginPath(); ctx.arc(hx, hy + 1, 11.9, Math.PI * 1.0, Math.PI * 2.0); ink(ctx, 1.4, '#fff'); if (!back) { oe(ctx, hx - 11.8, hy + 1, 2.8, 4, f, LW); oe(ctx, hx + 11.8, hy + 1, 2.8, 4, f, LW); } break;
    case 'froghood': case 'bearhood': ctx.beginPath(); ctx.ellipse(hx, hy - 1, 12.6, 12, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); fs(ctx, f, LW); if (hat.shape === 'bearhood') { oc(ctx, hx - 8.6, hy - 11.6, 3, f, LW); oc(ctx, hx + 8.6, hy - 11.6, 3, f, LW); } else { oc(ctx, hx - 5.4, hy - 12, 2.8, '#fff', 0.8); oc(ctx, hx + 5.4, hy - 12, 2.8, '#fff', 0.8); circle(ctx, hx - 5.4, hy - 12, 1, INK); circle(ctx, hx + 5.4, hy - 12, 1, INK); } break;
    case 'bandana': ctx.beginPath(); ctx.roundRect?.(hx - 12, hy - 7.6, 24, 4.6, 2); fs(ctx, f, LW); if (!back) { circle(ctx, hx + 11, hy - 3.6, 1.6, hat.trim); } break;
    case 'santa': ctx.beginPath(); ctx.moveTo(hx - 10, hy - 8.4); ctx.quadraticCurveTo(hx - 6, hy - 22, hx + 6, hy - 22); ctx.quadraticCurveTo(hx + 12, hy - 16, hx + 10, hy - 8.4); ctx.closePath(); fs(ctx, f, LW); oe(ctx, hx, hy - 8.4, 11.6, 2.8, hat.trim, 0.9); oc(ctx, hx + 8, hy - 21, 2.4, hat.trim, 0.8); break;
    case 'sailor': oe(ctx, hx, hy - 9, 11.6, 3.4, f, LW); ctx.beginPath(); ctx.roundRect?.(hx - 8, hy - 14.6, 16, 6, 2); fs(ctx, f, LW); ctx.fillStyle = hat.trim; ctx.fillRect(hx - 8, hy - 10, 16, 1.8); break;
    case 'tophat': ctx.save(); ctx.translate(hx + 5, hy - 11); ctx.rotate(0.3); ctx.beginPath(); ctx.roundRect?.(-4.4, -9, 8.8, 9, 1.4); fs(ctx, f, LW); ctx.fillStyle = hat.trim; ctx.fillRect(-4.4, -3.4, 8.8, 1.8); oe(ctx, 0, 0, 7, 1.8, f, LW); ctx.restore(); break;
    case 'antennae': for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + d * 4, hy - 11); ctx.quadraticCurveTo(hx + d * 5, hy - 16, hx + d * 8, hy - 19); ink(ctx, 1.1); if (has(hat, 'hearts')) heart(ctx, hx + d * 8, hy - 20, 2.2, hat.trim, 0.5); else oc(ctx, hx + d * 8, hy - 19.4, 1.8, f, 0.7); } break;
    case 'clips': if (!back) { if (has(hat, 'cherry')) { oc(ctx, hx + 8.6, hy - 6, 1.9, f, 0.7); oc(ctx, hx + 11, hy - 4.6, 1.9, f, 0.7); } else if (has(hat, 'butterfly')) { oe(ctx, hx + 8, hy - 6.6, 2.1, 1.5, f, 0.6, INK, -0.5); oe(ctx, hx + 11, hy - 6.6, 2.1, 1.5, f, 0.6, INK, 0.5); } else star(ctx, hx + 9, hy - 6, 2.4, hat.color); } break;
  }
  void side;
}
function bow2(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string | CanvasPattern, knot: string, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(d * 3, -5, d * 8, -4.5, d * 7.5, 0); ctx.bezierCurveTo(d * 8, 4.5, d * 3, 5, 0, 0);
    fs(ctx, fill, LW / s);
  }
  oe(ctx, 0, 0, 1.8, 2.1, knot, LW / s);
  ctx.restore();
}

// ---------- face pieces ----------
export function drawFace(ctx: CanvasRenderingContext2D, face: ClothDef | undefined, hx: number, hy: number, p: P2, ey: number) {
  if (!face || p.back) return;
  const f = fillOf(ctx, face, 0.14), fx = p.side * 3.4;
  const xs = p.side === 0 ? [hx - 4.4, hx + 4.4] : [hx + fx - 2.6, hx + fx + 3.6];
  switch (face.shape) {
    case 'round': case 'square': case 'cateye':
      for (const x of xs) { ctx.beginPath(); if (face.shape === 'square') ctx.roundRect?.(x - 3.2, ey - 3.2, 6.4, 6, 1.2); else ctx.ellipse(x, ey, 3.4, face.shape === 'cateye' ? 2.7 : 3.4, 0, 0, 7); ink(ctx, 1, typeof f === 'string' ? f : face.color); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(xs[0] + 3.2, ey); ctx.lineTo(xs[1] - 3.2, ey); ink(ctx, 0.9, face.color);
      if (face.shape === 'cateye') for (const [i, d] of [[0, -1], [1, 1]] as const) { ctx.beginPath(); ctx.moveTo(xs[i] + d * 3, ey - 1); ctx.lineTo(xs[i] + d * 5, ey - 3.4); ink(ctx, 1.2, face.color); }
      break;
    case 'heart': for (const x of xs) { heart(ctx, x, ey, 3.7, face.trim, 0.6); heart(ctx, x, ey, 3, face.color); } break;
    case 'star': for (const x of xs) { star(ctx, x, ey, 4.5, face.trim, 0.6); star(ctx, x, ey, 3.7, face.color); } break;
    case 'sleepmask': ctx.beginPath(); ctx.roundRect?.(hx - 9, hy - 8.6, 18, 5, 2.4); fs(ctx, f, 0.9); if (has(face, 'eyes')) for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + d * 3.6, hy - 6.2, 1.6, 0.2, Math.PI - 0.2); ink(ctx, 0.7, '#7a5a8a'); } break;
    case 'goggles': ctx.beginPath(); ctx.roundRect?.(hx - 11.4, hy - 7.2, 22.8, 3.2, 1.4); fs(ctx, face.trim, 0.8); for (const d of [-1, 1]) oe(ctx, hx + d * 5, hy - 5.8, 3.8, 2.8, f, 0.9); break;
    case 'whiskers': for (const d of [-1, 1]) for (const t of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(hx + d * (p.side ? 7 : 8.6), ey + 4 + t * 1.4); ctx.lineTo(hx + d * (p.side ? 10.6 : 13), ey + 3 + t * 2.4); ink(ctx, 0.7, face.color); } break;
  }
}
