// Icons for the Collection Log finds (fish, bugs, shells, forageables, gems), drawn in code in a 0..32 box.
// Same soft look as the other item icons: round shapes, pastel fills, a thin warm outline, one tiny highlight.
import { circle, ellipse, star } from './draw';

type G = CanvasRenderingContext2D;
const LINE = 'rgba(110,51,80,0.28)';

const outline = (g: G, w = 1.2) => { g.strokeStyle = LINE; g.lineWidth = w; g.stroke(); };

function fish(g: G, body: string, fin: string, o: { spots?: string; stripe?: string; big?: boolean; tail?: 'round' | 'fan' } = {}) {
  // tail
  g.fillStyle = fin; g.beginPath();
  if (o.tail === 'fan') { g.moveTo(22, 16); g.quadraticCurveTo(31, 3, 31, 16); g.quadraticCurveTo(31, 29, 22, 16); }
  else { g.moveTo(23, 16); g.lineTo(30, 9); g.lineTo(30, 23); g.closePath(); }
  g.fill();
  ellipse(g, 14, 16, o.big ? 12 : 11, o.big ? 8.5 : 7.5, body);
  g.beginPath(); g.ellipse(14, 16, o.big ? 12 : 11, o.big ? 8.5 : 7.5, 0, 0, 7); outline(g);
  if (o.stripe) { g.strokeStyle = o.stripe; g.lineWidth = 1.6; for (const x of [11, 15, 19]) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 22); g.stroke(); } }
  if (o.spots) for (const [x, y] of [[12, 12], [17, 19], [19, 13]]) circle(g, x, y, 1.6, o.spots);
  ellipse(g, 15, 7.5, 4, 2.2, fin);
  circle(g, 8, 14.5, 1.6, '#4a3a4a'); circle(g, 8.4, 14.1, 0.5, '#fff'); circle(g, 6, 19, 1.4, 'rgba(255,143,182,0.6)');
}

function wing(g: G, x: number, y: number, rx: number, ry: number, rot: number, fill = 'rgba(214,236,255,0.85)') {
  ellipse(g, x, y, rx, ry, fill, rot);
  g.strokeStyle = 'rgba(120,160,200,0.45)'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.stroke();
}

function feelers(g: G, x: number, y: number, col: string) {
  g.strokeStyle = col; g.lineWidth = 1.1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - 1.5, y); g.quadraticCurveTo(x - 4, y - 5, x - 7, y - 5); g.moveTo(x + 1.5, y); g.quadraticCurveTo(x + 4, y - 5, x + 7, y - 5); g.stroke();
}

function face(g: G, x: number, y: number) {
  circle(g, x - 2, y, 1, '#4a3a4a'); circle(g, x + 2, y, 1, '#4a3a4a');
}

/** Draws the icon for `id` and returns true, or returns false when the id is not one of these finds. */
export function drawCollectIcon(g: G, id: string): boolean {
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ok = draw(g, id);
  g.restore();
  return ok;
}

function draw(g: G, id: string): boolean {
  switch (id) {
    // ---- fish ----
    case 'pebble_guppy': fish(g, '#d9cfe8', '#b69be0', { spots: '#b09acb' }); return true;
    case 'tadpole':
      g.strokeStyle = '#7ec0c8'; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 16); g.quadraticCurveTo(26, 8, 30, 14); g.stroke();
      circle(g, 13, 16, 9, '#a9dde2'); g.beginPath(); g.arc(13, 16, 9, 0, 7); outline(g);
      circle(g, 9, 14, 1.8, '#4a3a4a'); circle(g, 9.5, 13.5, 0.6, '#fff'); circle(g, 8, 20, 1.5, 'rgba(255,143,182,0.6)'); circle(g, 17, 12, 1.4, 'rgba(255,255,255,0.7)');
      return true;
    case 'peach_carp': fish(g, '#ffd2b0', '#ff9e8a', { big: true }); return true;
    case 'lace_betta': fish(g, '#f7b0d8', '#c9a8ff', { tail: 'fan', stripe: 'rgba(255,255,255,0.6)' }); return true;
    case 'lavender_ray':
      g.beginPath(); g.moveTo(16, 6); g.quadraticCurveTo(30, 14, 16, 24); g.quadraticCurveTo(2, 14, 16, 6); g.closePath();
      g.fillStyle = '#cdb4f0'; g.fill(); outline(g);
      g.strokeStyle = '#a98ad8'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(16, 23); g.quadraticCurveTo(15, 28, 19, 30); g.stroke();
      circle(g, 12, 13, 1.4, '#4a3a4a'); circle(g, 20, 13, 1.4, '#4a3a4a'); circle(g, 16, 16.5, 1.2, 'rgba(255,143,182,0.7)');
      return true;
    case 'sugar_seahorse':
      g.fillStyle = '#ffd9a8'; g.beginPath(); g.moveTo(14, 5); g.quadraticCurveTo(24, 5, 22, 13); g.quadraticCurveTo(20, 19, 17, 21); g.quadraticCurveTo(14, 27, 19, 28); g.quadraticCurveTo(10, 30, 11, 22); g.quadraticCurveTo(13, 14, 10, 11); g.quadraticCurveTo(9, 5, 14, 5); g.fill(); outline(g);
      g.fillStyle = '#ff9ec0'; g.beginPath(); g.moveTo(21, 14); g.lineTo(27, 12); g.lineTo(25, 18); g.closePath(); g.fill();
      g.strokeStyle = '#ff9ec0'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(12, 5); g.quadraticCurveTo(7, 4, 6, 7); g.stroke();
      circle(g, 15, 9, 1.3, '#4a3a4a'); circle(g, 13, 12, 1.2, 'rgba(255,143,182,0.6)');
      return true;
    // ---- bugs ----
    case 'puff_bee':
      wing(g, 11, 8, 5, 3.4, -0.5); wing(g, 21, 8, 5, 3.4, 0.5);
      ellipse(g, 16, 18, 9, 8, '#ffd96a'); g.beginPath(); g.ellipse(16, 18, 9, 8, 0, 0, 7); outline(g);
      g.fillStyle = '#9a6a52'; for (const x of [12, 16.5, 21]) { g.beginPath(); g.ellipse(x, 18, 1.5, 6.6, 0, 0, 7); g.fill(); }
      face(g, 16, 14.5); circle(g, 13.5, 16.6, 1.2, 'rgba(255,143,182,0.6)'); circle(g, 18.5, 16.6, 1.2, 'rgba(255,143,182,0.6)');
      feelers(g, 16, 10.5, '#9a6a52');
      return true;
    case 'dot_ladybug':
      ellipse(g, 16, 18, 10, 9, '#ff7f9f'); g.beginPath(); g.ellipse(16, 18, 10, 9, 0, 0, 7); outline(g);
      g.beginPath(); g.moveTo(16, 9.5); g.lineTo(16, 27); g.strokeStyle = 'rgba(110,51,80,0.4)'; g.lineWidth = 1.2; g.stroke();
      ellipse(g, 16, 9, 5.6, 4.4, '#4a3a4a');
      for (const [x, y] of [[11.5, 16], [20.5, 16], [12, 22], [20, 22]]) circle(g, x, y, 1.7, '#4a3a4a');
      circle(g, 14.5, 8.6, 1, '#fff'); circle(g, 17.5, 8.6, 1, '#fff'); feelers(g, 16, 6, '#4a3a4a');
      return true;
    case 'glow_fly':
      circle(g, 16, 22, 9, 'rgba(255,240,150,0.35)');
      wing(g, 10, 12, 5.4, 3.2, -0.7); wing(g, 22, 12, 5.4, 3.2, 0.7);
      ellipse(g, 16, 14, 3.4, 6, '#6b5a8a'); ellipse(g, 16, 22, 4.4, 5, '#fff3a0'); g.beginPath(); g.ellipse(16, 22, 4.4, 5, 0, 0, 7); outline(g);
      circle(g, 16, 9, 3, '#8a78aa'); circle(g, 15, 8.6, 0.8, '#fff'); circle(g, 17.4, 8.6, 0.8, '#fff'); feelers(g, 16, 7, '#6b5a8a');
      return true;
    case 'sugar_snail':
      ellipse(g, 15, 24, 12, 3.6, '#fff0e6'); g.beginPath(); g.ellipse(15, 24, 12, 3.6, 0, 0, 7); outline(g, 1);
      g.fillStyle = '#fff0e6'; g.beginPath(); g.ellipse(24.5, 19, 3, 5.4, 0.2, 0, 7); g.fill(); outline(g, 1);
      circle(g, 13, 14.5, 9, '#ffc2da'); g.beginPath(); g.arc(13, 14.5, 9, 0, 7); outline(g);
      g.strokeStyle = '#ff8fb6'; g.lineWidth = 1.6; g.beginPath(); g.arc(13, 14.5, 5.6, 0.4, 5.6); g.arc(13.4, 14.4, 2.6, 3.6, 8.6); g.stroke();
      g.strokeStyle = '#d9a88a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(24, 15); g.lineTo(23, 10); g.moveTo(26, 15); g.lineTo(27.5, 10); g.stroke();
      circle(g, 23, 9.6, 1.2, '#4a3a4a'); circle(g, 27.5, 9.6, 1.2, '#4a3a4a');
      return true;
    case 'bean_beetle':
      ellipse(g, 16, 18, 8.6, 10, '#8a5a44'); g.beginPath(); g.ellipse(16, 18, 8.6, 10, 0, 0, 7); outline(g);
      g.beginPath(); g.moveTo(16, 9); g.lineTo(16, 28); g.strokeStyle = '#5b3a2c'; g.lineWidth = 1.2; g.stroke();
      ellipse(g, 12.5, 15, 1.8, 3.6, 'rgba(255,255,255,0.35)', 0.2);
      circle(g, 16, 8, 3.4, '#6b432f'); circle(g, 14.6, 7.6, 0.8, '#fff'); circle(g, 17.4, 7.6, 0.8, '#fff'); feelers(g, 16, 6, '#5b3a2c');
      return true;
    case 'wisp_dragonfly':
      wing(g, 8, 11, 7, 2.6, -0.25); wing(g, 24, 11, 7, 2.6, 0.25); wing(g, 9, 16, 6.4, 2.4, 0.2); wing(g, 23, 16, 6.4, 2.4, -0.2);
      ellipse(g, 16, 18, 2.2, 10, '#7fd0c4'); g.beginPath(); g.ellipse(16, 18, 2.2, 10, 0, 0, 7); outline(g, 1);
      circle(g, 16, 8, 3.4, '#9ae0d4'); circle(g, 14.4, 7.6, 1, '#4a3a4a'); circle(g, 17.6, 7.6, 1, '#4a3a4a'); star(g, 16, 22, 1.6, '#fff');
      return true;
    // ---- shells ----
    case 'conch':
      g.beginPath(); g.moveTo(5, 24); g.quadraticCurveTo(3, 12, 14, 8); g.quadraticCurveTo(26, 5, 28, 14); g.quadraticCurveTo(29, 24, 18, 26); g.quadraticCurveTo(10, 28, 5, 24); g.closePath();
      g.fillStyle = '#ffc2da'; g.fill(); outline(g);
      g.strokeStyle = '#ff9ec0'; g.lineWidth = 1.4; g.beginPath(); g.arc(19, 15, 6, 0.5, 5.6); g.arc(19.4, 15, 3, 3.6, 8.4); g.stroke();
      ellipse(g, 9, 21, 3, 2, '#ffe0ec', -0.4);
      return true;
    case 'sand_dollar':
      circle(g, 16, 16, 12.5, '#fff1d9'); g.beginPath(); g.arc(16, 16, 12.5, 0, 7); outline(g);
      g.strokeStyle = '#e6c9a0'; g.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - 1.57; g.beginPath(); g.ellipse(16 + Math.cos(a) * 4.8, 16 + Math.sin(a) * 4.8, 2.1, 4.6, a + 1.57, 0, 7); g.stroke(); }
      circle(g, 16, 16, 1.4, '#e6c9a0');
      return true;
    case 'cowrie':
      ellipse(g, 16, 17, 12, 8.6, '#fff4e6'); g.beginPath(); g.ellipse(16, 17, 12, 8.6, 0, 0, 7); outline(g);
      g.strokeStyle = '#d9b28a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(7, 17); g.quadraticCurveTo(16, 14, 25, 17); g.stroke();
      g.lineWidth = 1; for (let x = 9; x <= 23; x += 2.8) { g.beginPath(); g.moveTo(x, 15.4); g.lineTo(x, 18.4); g.stroke(); }
      ellipse(g, 11, 12.6, 3, 1.4, 'rgba(255,255,255,0.9)', -0.3);
      return true;
    case 'swirl_whelk':
      g.beginPath(); g.moveTo(16, 3); g.quadraticCurveTo(24, 10, 22, 17); g.quadraticCurveTo(28, 22, 20, 27); g.quadraticCurveTo(10, 30, 8, 22); g.quadraticCurveTo(6, 14, 14, 10); g.quadraticCurveTo(12, 6, 16, 3); g.closePath();
      g.fillStyle = '#dcc6f5'; g.fill(); outline(g);
      g.strokeStyle = '#b79be0'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(10, 14); g.quadraticCurveTo(18, 14, 22, 17); g.moveTo(9, 21); g.quadraticCurveTo(18, 22, 23, 23); g.stroke();
      circle(g, 13, 24, 1.2, 'rgba(255,255,255,0.8)');
      return true;
    case 'starfish': {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - 1.57, r = i % 2 ? 6.5 : 14; const x = 16 + Math.cos(a) * r, y = 16.5 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); g.fillStyle = '#ffc9a0'; g.fill(); g.strokeStyle = '#ffa98a'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#ffc9a0'; g.fill();
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - 1.57; circle(g, 16 + Math.cos(a) * 8, 16.5 + Math.sin(a) * 8, 1.2, '#fff4e8'); }
      circle(g, 16, 16.5, 2.4, '#ff9ec0'); face(g, 16, 17.2);
      return true;
    }
    // ---- forageables ----
    case 'lucky_clover':
      for (const [x, y] of [[11, 11], [21, 11], [11, 20], [21, 20]]) { circle(g, x, y, 6, '#9fe0a8'); g.beginPath(); g.arc(x, y, 6, 0, 7); outline(g, 1); circle(g, x - 1.5, y - 1.6, 1.3, 'rgba(255,255,255,0.6)'); }
      circle(g, 16, 15.5, 2.4, '#7fcf8e');
      g.strokeStyle = '#7fcf8e'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 18); g.quadraticCurveTo(15, 25, 19, 29); g.stroke();
      return true;
    case 'sweet_mushroom':
      g.fillStyle = '#fff1e6'; g.beginPath(); g.moveTo(12, 17); g.lineTo(20, 17); g.quadraticCurveTo(21, 27, 16, 27); g.quadraticCurveTo(11, 27, 12, 17); g.fill(); outline(g, 1);
      g.beginPath(); g.moveTo(4, 17); g.quadraticCurveTo(4, 4, 16, 4); g.quadraticCurveTo(28, 4, 28, 17); g.quadraticCurveTo(16, 20, 4, 17); g.closePath();
      g.fillStyle = '#ff9ec0'; g.fill(); outline(g);
      for (const [x, y, r] of [[10, 11, 2.2], [17, 8, 2.4], [22, 13, 2], [14, 15, 1.4]]) circle(g, x, y, r, '#fff');
      circle(g, 14.6, 22, 0.9, '#4a3a4a'); circle(g, 17.6, 22, 0.9, '#4a3a4a');
      return true;
    // ---- gems and ore ----
    case 'sea_glass':
      g.beginPath(); g.moveTo(7, 17); g.quadraticCurveTo(5, 8, 14, 6); g.quadraticCurveTo(25, 4, 27, 14); g.quadraticCurveTo(28, 25, 17, 26); g.quadraticCurveTo(8, 27, 7, 17); g.closePath();
      g.fillStyle = '#b8f0d8'; g.fill(); g.strokeStyle = '#7fd4b0'; g.lineWidth = 1.4; g.stroke();
      ellipse(g, 12, 11, 4, 2.4, 'rgba(255,255,255,0.7)', -0.5); circle(g, 20, 20, 1.2, 'rgba(255,255,255,0.6)');
      return true;
    case 'honey_amber':
      g.beginPath(); g.moveTo(16, 3); g.quadraticCurveTo(26, 14, 25, 20); g.quadraticCurveTo(24, 28, 16, 28); g.quadraticCurveTo(8, 28, 7, 20); g.quadraticCurveTo(6, 14, 16, 3); g.closePath();
      g.fillStyle = '#ffc94d'; g.fill(); g.strokeStyle = '#e8a52a'; g.lineWidth = 1.4; g.stroke();
      ellipse(g, 12, 17, 2.6, 5, 'rgba(255,255,255,0.45)', 0.2); ellipse(g, 18.5, 22, 2, 1.2, '#b9771e'); circle(g, 20, 20.6, 0.7, '#b9771e');
      return true;
    case 'candy_copper':
      for (const [x, y, r, c] of [[11, 20, 7.5, '#ffa98a'], [21, 19, 6.5, '#ff9a7c'], [16, 12, 6, '#ffbfa3']] as [number, number, number, string][]) { circle(g, x, y, r, c); g.beginPath(); g.arc(x, y, r, 0, 7); outline(g, 1); }
      circle(g, 14, 10, 1.6, 'rgba(255,255,255,0.8)'); circle(g, 8.5, 18, 1.2, 'rgba(255,255,255,0.6)'); star(g, 24, 8, 2.4, '#fff3a8');
      return true;
    case 'rose_quartz':
      for (const [x, h, w, c] of [[9, 14, 5, '#ffc2da'], [23, 12, 5, '#ffc2da'], [16, 22, 7, '#ff9ec7']] as [number, number, number, string][]) {
        g.beginPath(); g.moveTo(x - w, 27); g.lineTo(x - w * 0.7, 27 - h * 0.7); g.lineTo(x, 27 - h); g.lineTo(x + w * 0.7, 27 - h * 0.7); g.lineTo(x + w, 27); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = '#e07aa5'; g.lineWidth = 1.2; g.stroke();
        g.beginPath(); g.moveTo(x, 27 - h); g.lineTo(x - w * 0.2, 27); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.stroke();
      }
      return true;
    case 'moonstone':
      circle(g, 16, 16, 12, 'rgba(230,220,255,0.4)'); circle(g, 16, 16, 9.6, '#f1ecff'); g.beginPath(); g.arc(16, 16, 9.6, 0, 7); g.strokeStyle = '#c9b6f0'; g.lineWidth = 1.6; g.stroke();
      ellipse(g, 19, 19, 5, 3, 'rgba(190,210,255,0.6)', -0.6); ellipse(g, 12, 11.5, 3.4, 1.8, 'rgba(255,255,255,0.95)', -0.5); star(g, 21, 10, 2, '#fff');
      return true;
    case 'twinkle_geode':
      circle(g, 16, 17, 12, '#cbbfe0'); g.beginPath(); g.arc(16, 17, 12, 0, 7); g.strokeStyle = '#a597c4'; g.lineWidth = 1.6; g.stroke();
      circle(g, 16, 17, 8.6, '#b79bf0');
      for (const [x, y, r] of [[13, 15, 3], [19, 18, 3.2], [15, 21, 2.4], [20, 13, 2]]) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath(); g.fillStyle = '#e6d8ff'; g.fill(); }
      star(g, 22, 8, 2.6, '#fff3a8'); circle(g, 9, 10, 1, '#fff');
      return true;
    case 'frost_opal':
      ellipse(g, 16, 17, 11, 9.5, '#d9f0ff'); g.beginPath(); g.ellipse(16, 17, 11, 9.5, 0, 0, 7); g.strokeStyle = '#9ccfee'; g.lineWidth = 1.5; g.stroke();
      circle(g, 12, 15, 2.4, 'rgba(255,174,214,0.7)'); circle(g, 19, 19, 2.6, 'rgba(170,236,200,0.75)'); circle(g, 20, 13, 1.8, 'rgba(255,236,150,0.8)'); circle(g, 14, 21, 1.4, 'rgba(200,180,255,0.8)');
      ellipse(g, 11.4, 11.6, 3, 1.6, 'rgba(255,255,255,0.9)', -0.5);
      return true;
    default:
      return false;
  }
}
