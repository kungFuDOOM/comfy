// The café shift cup: a modest 2D cup that fills as the drink comes together. Fable can polish this (steam, foam
// texture, richer latte art) without touching the shift rules: everything it needs is the options below.
import { ellipse, heart, star } from './draw';

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

export function drawCup(g: CanvasRenderingContext2D, w: number, h: number, o: CupOpts) {
  g.clearRect(0, 0, w, h);
  const cx = w / 2, top = h * 0.3, bot = h * 0.88, hw = w * 0.3;
  ellipse(g, cx, bot + 4, hw + 8, 6, 'rgba(120,70,100,0.16)'); // saucer shadow
  g.strokeStyle = '#ffb3cf'; g.lineWidth = 5; g.beginPath(); g.arc(cx + hw + 2, (top + bot) / 2, 11, -1.5, 1.5); g.stroke(); // handle
  g.beginPath(); g.moveTo(cx - hw, top); g.lineTo(cx + hw, top); g.quadraticCurveTo(cx + hw - 4, bot, cx, bot); g.quadraticCurveTo(cx - hw + 4, bot, cx - hw, top);
  g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#ffb3cf'; g.lineWidth = 2.5; g.stroke();
  if (o.step >= 1) { // the pour
    g.save(); g.clip();
    g.fillStyle = LIQUID[o.drink] ?? '#c79a7a'; g.fillRect(cx - hw, top + 8, hw * 2, bot - top);
    g.restore();
  }
  const rim = o.step >= 1 ? top + 8 : top + 2;
  ellipse(g, cx, rim, hw - 2, 7, o.step >= 2 ? '#fffaf4' : o.step >= 1 ? LIQUID[o.drink] ?? '#c79a7a' : '#fff0f6'); // surface / foam
  if (o.step >= 3) { // the flourish
    if (o.perfects >= 3) { star(g, cx, rim, 6, '#ffd36e'); heart(g, cx - 12, rim, 3, '#ff8fb6'); heart(g, cx + 12, rim, 3, '#ff8fb6'); }
    else if (o.perfects === 2) heart(g, cx, rim, 6, '#ff8fb6');
    else if (o.perfects === 1) heart(g, cx, rim, 4.5, '#ffb3cf');
    else ellipse(g, cx, rim, 6, 2.2, '#ffe3ec');
  }
  if (o.step >= 1) { // a wisp of steam
    g.strokeStyle = 'rgba(200,150,170,0.6)'; g.lineWidth = 2;
    for (const dx of [-8, 8]) { g.beginPath(); g.moveTo(cx + dx, top - 4); g.bezierCurveTo(cx + dx - 4, top - 12, cx + dx + 4, top - 18, cx + dx, top - 26); g.stroke(); }
  }
}
