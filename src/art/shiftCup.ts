// The café shift cup: a cute 2D cup that fills as the drink comes together. Purely visual: the shift rules only
// pass in the options below, and prettier cups (more perfects) get more sparkle, fancier art and a warm glow.
import { circle, ellipse, heart, sparkle, star } from './draw';

export interface CupOpts {
  /** Drink item id (picks the liquid colour). */
  drink: string;
  /** How many steps are done (0 empty, 1 poured, 2 foamed, 3 finished with art). */
  step: number;
  /** Perfect steps so far, which makes the art fancier. */
  perfects: number;
}

const LIQUID: Record<string, string> = {
  pink_latte: '#e79ab4', honey_cap: '#d9a35c', spot_mocha: '#8a5a44', cozy_cocoa: '#9a5f5a',
  cloud_foam: '#c79a7a', ribbon_special: '#d58a9a', lantern_latte: '#ee8aa5', star_brew: '#5a3f4a',
};
/** Chocolatey drinks get marshmallows and cocoa dust instead of plain foam. */
const COCOA = new Set(['cozy_cocoa', 'spot_mocha']);

const PINK = '#ffb3cf', ROSE = '#ff8fb6', GOLD = '#ffd36e', CREAM = '#fffaf4';
/** Sparkle spots around the cup as [x, y, size] in cup-half-widths from the rim centre; used in order. */
const SPARKS: [number, number, number][] = [
  [-1.32, -0.42, 5], [1.5, -0.62, 4.5], [-1.5, 0.5, 3.5], [1.62, 0.25, 3], [-0.95, -0.95, 3.5], [1.05, -1.0, 4], [-1.68, -0.05, 2.6], [1.3, 0.9, 2.6],
];

/** One curly wisp of steam rising from (x, y). */
function wisp(g: CanvasRenderingContext2D, x: number, y: number, len: number, sway: number, alpha: number) {
  const grad = g.createLinearGradient(0, y, 0, y - len);
  grad.addColorStop(0, `rgba(222,170,192,${alpha})`); grad.addColorStop(1, 'rgba(222,170,192,0)');
  g.strokeStyle = grad; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y);
  g.bezierCurveTo(x - sway, y - len * 0.3, x + sway, y - len * 0.62, x - sway * 0.4, y - len);
  g.stroke();
}

export function drawCup(g: CanvasRenderingContext2D, w: number, h: number, o: CupOpts) {
  g.clearRect(0, 0, w, h);
  g.save();
  g.lineJoin = 'round';
  const cx = w / 2, top = h * 0.42, bot = h * 0.87, hw = w * 0.27, ry = hw * 0.3;
  const liquid = LIQUID[o.drink] ?? '#c79a7a';
  const step = o.step, perfects = Math.max(0, Math.min(3, o.perfects));
  const done = step >= 3;

  // a warm halo behind a perfect cup
  if (done && perfects >= 2) {
    const halo = g.createRadialGradient(cx, top, 4, cx, top + 6, hw * 1.9);
    halo.addColorStop(0, perfects >= 3 ? 'rgba(255,221,130,0.55)' : 'rgba(255,179,207,0.4)'); halo.addColorStop(1, 'rgba(255,221,130,0)');
    g.fillStyle = halo; g.fillRect(0, 0, w, h);
  }

  // saucer
  ellipse(g, cx, bot + 5, hw * 1.2, 5.5, 'rgba(120,70,100,0.14)');
  g.beginPath(); g.ellipse(cx, bot + 1.5, hw * 1.12, 5.5, 0, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = PINK; g.lineWidth = 2; g.stroke();
  ellipse(g, cx, bot + 1, hw * 0.7, 2.6, '#ffe6ef');

  // handle: a chunky pink loop with a white core
  const hy = top + (bot - top) * 0.46;
  g.lineCap = 'round';
  g.strokeStyle = PINK; g.lineWidth = 8; g.beginPath(); g.arc(cx + hw - 3, hy, 12, -1.25, 1.3); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.beginPath(); g.arc(cx + hw - 3, hy, 12, -1.25, 1.3); g.stroke();

  // body
  const bh = bot - top;
  g.beginPath(); g.moveTo(cx - hw, top);
  g.bezierCurveTo(cx - hw, top + bh * 0.78, cx - hw * 0.72, bot, cx - hw * 0.36, bot);
  g.lineTo(cx + hw * 0.36, bot);
  g.bezierCurveTo(cx + hw * 0.72, bot, cx + hw, top + bh * 0.78, cx + hw, top);
  g.closePath();
  const body = g.createLinearGradient(cx - hw, 0, cx + hw, 0);
  body.addColorStop(0, '#fff6fa'); body.addColorStop(0.35, '#ffffff'); body.addColorStop(1, '#ffdfea');
  g.fillStyle = body; g.fill(); g.strokeStyle = PINK; g.lineWidth = 2.5; g.stroke();
  // scalloped band, a heart and two blush dots on the front
  g.save(); g.clip();
  for (let i = -4; i <= 4; i++) circle(g, cx + i * (hw / 4), bot + 1, hw / 6.4, '#ffd0e2');
  g.restore();
  heart(g, cx, top + bh * 0.52, 6.5, done && perfects >= 3 ? ROSE : '#ffc2d8');
  ellipse(g, cx - hw * 0.5, top + bh * 0.56, 3.6, 2.2, 'rgba(255,170,200,0.5)'); ellipse(g, cx + hw * 0.5, top + bh * 0.56, 3.6, 2.2, 'rgba(255,170,200,0.5)');

  // the opening
  g.beginPath(); g.ellipse(cx, top, hw, ry, 0, 0, Math.PI * 2); g.fillStyle = '#ffe3ec'; g.fill();
  g.save(); g.clip();
  if (step < 1) {
    // the pour in progress: a ribbon of drink and the first little puddle
    ellipse(g, cx, top + ry * 0.5, hw * 0.46, ry * 0.42, liquid);
    ellipse(g, cx - 4, top + ry * 0.42, hw * 0.2, ry * 0.12, 'rgba(255,255,255,0.4)');
  } else {
    ellipse(g, cx, top + 2, hw - 4, ry - 2, liquid);
    g.strokeStyle = 'rgba(255,255,255,0.38)'; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx, top + 2, hw - 10, ry - 4.4, 0, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
    if (step === 1) { // crema swirl waiting for its foam
      g.strokeStyle = 'rgba(255,246,236,0.7)'; g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(cx + 3, top + 2.5, hw * 0.34, ry * 0.3, 0, 0.4, Math.PI * 1.7); g.stroke();
    }
  }
  if (step >= 2) {
    // fluffy foam with a bumpy edge
    const fx = hw - 9, fy = ry - 3.6, fcy = top + 1.6;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; circle(g, cx + Math.cos(a) * fx, fcy + Math.sin(a) * fy, 3.4, CREAM); }
    ellipse(g, cx, fcy, fx, fy, CREAM);
    g.strokeStyle = '#ffe9d6'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx, fcy + 0.6, fx - 4, fy - 1.4, 0, 0.25, Math.PI * 0.8); g.stroke();
    if (COCOA.has(o.drink)) { // marshmallows
      for (const [dx, dy, r] of [[-fx * 0.62, -0.6, -0.3], [fx * 0.64, 0.4, 0.25]] as [number, number, number][]) {
        g.save(); g.translate(cx + dx, fcy + dy); g.rotate(r);
        g.beginPath(); g.roundRect(-4.2, -2.6, 8.4, 5.2, 2); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#ffc2d8'; g.lineWidth = 1; g.stroke();
        g.restore();
      }
    }
  }
  if (done) {
    // the flourish, drawn flat on the foam
    g.save(); g.translate(cx, top + 1.6); g.scale(1, 0.62);
    if (perfects >= 3) {
      g.strokeStyle = GOLD; g.lineWidth = 1.6; g.setLineDash([2.5, 3.5]); g.beginPath(); g.arc(0, 0, 11.5, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      star(g, 0, 0, 8.5, GOLD); star(g, 0, 0, 4, '#fff3c4');
      heart(g, -19, 0.5, 5, ROSE); heart(g, 19, 0.5, 5, ROSE);
      circle(g, -27.5, 0, 1.4, GOLD); circle(g, 27.5, 0, 1.4, GOLD);
    } else if (perfects === 2) {
      heart(g, 0, 0, 9.5, ROSE); heart(g, 0, -0.4, 5.2, '#ffc2d8');
      circle(g, -16, 0, 1.8, PINK); circle(g, 16, 0, 1.8, PINK); circle(g, -22, 0, 1.2, PINK); circle(g, 22, 0, 1.2, PINK);
    } else if (perfects === 1) {
      heart(g, 0, 0, 7.5, '#ff9ec0');
      circle(g, -14, 0, 1.4, '#ffd0e2'); circle(g, 14, 0, 1.4, '#ffd0e2');
    } else {
      g.strokeStyle = '#ffd0e2'; g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i * 0.32, r = 1 + i * 0.22; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke();
    }
    g.restore();
    if (COCOA.has(o.drink) || o.drink === 'star_brew') { // cocoa dust / stardust
      const col = o.drink === 'star_brew' ? GOLD : 'rgba(138,90,68,0.55)';
      for (let i = 0; i < 9; i++) { const a = i * 2.4; circle(g, cx + Math.cos(a) * (hw - 16) * (0.55 + (i % 3) * 0.2), top + 1.6 + Math.sin(a) * (ry - 6) * 0.9, 0.8, col); }
    }
  }
  g.restore();
  // rim
  g.beginPath(); g.ellipse(cx, top, hw, ry, 0, 0, Math.PI * 2); g.strokeStyle = PINK; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath(); g.ellipse(cx, top, hw - 1.5, ry - 1, 0, Math.PI * 0.62, Math.PI * 0.9); g.stroke();

  if (step < 1) {
    // pour stream, in front of the rim
    const sx = cx + 2, sy = top + ry * 0.5;
    const stream = g.createLinearGradient(0, 0, 0, sy);
    stream.addColorStop(0, 'rgba(255,255,255,0)'); stream.addColorStop(0.25, liquid);
    g.strokeStyle = stream; g.lineWidth = 5.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx + 9, 0); g.quadraticCurveTo(sx + 1, top * 0.35, sx, sy); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(sx + 5.5, top * 0.3); g.quadraticCurveTo(sx - 0.5, top * 0.55, sx - 1.2, sy - 3); g.stroke();
    circle(g, sx - 9, sy - 5, 1.6, liquid); circle(g, sx + 10, sy - 7, 1.3, liquid); circle(g, sx + 14, sy - 2, 1, liquid);
  } else {
    // steam: more of it, and curlier, as the cup comes together
    const sy = top - ry - 3;
    wisp(g, cx - 11, sy, 22, 5, 0.6); wisp(g, cx + 11, sy, 22, -5, 0.6);
    if (step >= 2) wisp(g, cx, sy - 2, 28, 6, 0.7);
    if (done && perfects >= 2) heart(g, cx + 1, 7, 3.6, perfects >= 3 ? ROSE : PINK);
  }

  // sparkles: two more for every perfect step, plus a full ring for a perfect cup
  const n = step < 1 ? 0 : Math.min(SPARKS.length, perfects * 2 + (done && perfects >= 3 ? 2 : 0));
  for (let i = 0; i < n; i++) {
    const [dx, dy, r] = SPARKS[i];
    const x = cx + dx * hw, y = top + dy * hw * 0.62 + 12;
    sparkle(g, x, y, r + (done ? 1 : 0), i % 3 === 0 ? GOLD : i % 3 === 1 ? '#ff9ec0' : '#ffc76e');
    circle(g, x, y, 0.9, '#fff');
  }
  if (done && perfects >= 3) { heart(g, cx - hw * 1.25, top + hw * 0.5, 2.6, ROSE); heart(g, cx + hw * 1.42, top - hw * 0.5, 2.6, ROSE); }
  g.restore();
}
