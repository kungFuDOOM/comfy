// Item and UI icons, drawn in code onto small canvases.
import { ITEMS } from '../data';
import { drawDecor } from './decor';
import { cheetahPattern } from './cheetah';
import { circle, ellipse, rr, star, heart } from './draw';

/** Draw an item centered in a (0..32) box. */
export function drawItem(ctx: CanvasRenderingContext2D, id: string) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (id) {
    case 'trowel':
      ctx.strokeStyle = '#c99a7a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 25); ctx.lineTo(16, 16); ctx.stroke();
      ctx.fillStyle = '#ffb3cf'; ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(24, 5); ctx.lineTo(28, 10); ctx.lineTo(18, 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e07a9a'; ctx.lineWidth = 1.2; ctx.stroke();
      break;
    case 'can':
      rr(ctx, 6, 11, 16, 14, 4); ctx.fillStyle = '#a8d8ee'; ctx.fill(); ctx.strokeStyle = '#6fb3d6'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(21, 16); ctx.lineTo(29, 9); ctx.lineWidth = 3; ctx.strokeStyle = '#6fb3d6'; ctx.stroke();
      ctx.beginPath(); ctx.arc(11, 11, 5, Math.PI, 0); ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, 29, 14, 1.4, '#a8d8ee'); circle(ctx, 27, 18, 1.2, '#a8d8ee');
      break;
    case 'seed_puffberry': case 'seed_cottonbloom': {
      const c = id === 'seed_puffberry' ? '#ff9ec0' : '#ffffff';
      rr(ctx, 8, 5, 16, 22, 3); ctx.fillStyle = '#fff6ea'; ctx.fill(); ctx.strokeStyle = '#e8c9a8'; ctx.lineWidth = 1.2; ctx.stroke();
      circle(ctx, 16, 14, 4.2, c); if (id !== 'seed_puffberry') { ctx.strokeStyle = '#e0c6d6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(16, 14, 4.2, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = '#7fcf8e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, 24); ctx.lineTo(16, 19); ctx.stroke();
      break;
    }
    case 'puffberry':
      circle(ctx, 16, 19, 9, '#ff8fb6'); circle(ctx, 12.5, 15.5, 2.4, '#ffc2da');
      for (const [x, y] of [[19, 17], [15, 23], [21, 22]] as number[][]) circle(ctx, x, y, 1, '#ffd0e2');
      ctx.fillStyle = '#7fcf8e'; ctx.beginPath(); ctx.moveTo(16, 10); ctx.quadraticCurveTo(10, 4, 8, 8); ctx.quadraticCurveTo(13, 11, 16, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, 10); ctx.quadraticCurveTo(22, 4, 25, 8); ctx.quadraticCurveTo(19, 11, 16, 10); ctx.fill();
      break;
    case 'cottonbloom':
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; circle(ctx, 16 + Math.cos(a) * 6.5, 14 + Math.sin(a) * 6.5, 5.2, '#fff'); }
      circle(ctx, 16, 14, 4.5, '#ffe9a8');
      ctx.strokeStyle = '#7fcf8e'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(16, 21); ctx.lineTo(16, 29); ctx.stroke();
      break;
    case 'beans':
      for (const [x, y, r] of [[12, 17, -0.4], [20, 14, 0.5], [18, 23, 0.1]] as number[][]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r); ellipse(ctx, 0, 0, 5.5, 7.5, '#8a5a44');
        ctx.strokeStyle = '#5b3a2c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(3, 0, 0, 6); ctx.stroke(); ctx.restore();
      }
      break;
    case 'milk':
      rr(ctx, 9, 8, 14, 19, 3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#b8d8ee'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 8); ctx.lineTo(16, 3); ctx.lineTo(23, 8); ctx.fillStyle = '#d8ecf8'; ctx.fill(); ctx.stroke();
      heart(ctx, 16, 17, 3, '#ff9ec0');
      break;
    case 'syrup': case 'honey': case 'cocoa': {
      const col = id === 'syrup' ? '#ff8fb6' : id === 'honey' ? '#ffc94d' : '#7a4a3a';
      rr(ctx, 8, 10, 16, 17, 5); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.2; ctx.stroke();
      rr(ctx, 10, 5, 12, 5, 2); ctx.fillStyle = id === 'cocoa' ? '#ffd0e2' : '#fff'; ctx.fill();
      ellipse(ctx, 16, 19, 5, 3.4, 'rgba(255,255,255,0.55)');
      break;
    }
    case 'pink_latte': case 'honey_cap': case 'spot_mocha': {
      const top = id === 'pink_latte' ? '#ffb3cf' : id === 'honey_cap' ? '#ffd78a' : '#9a6a52';
      ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(25, 18, 4, -1.4, 1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(25, 12); ctx.quadraticCurveTo(24, 27, 15.5, 27); ctx.quadraticCurveTo(7, 27, 6, 12); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.4; ctx.stroke();
      ellipse(ctx, 15.5, 12, 9.5, 3, top);
      if (id === 'pink_latte') heart(ctx, 15.5, 12, 1.8, '#fff');
      if (id === 'spot_mocha') { ctx.save(); rr(ctx, 7, 16, 17, 6, 2); ctx.clip(); ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.3); ctx.fillRect(7, 16, 17, 6); ctx.restore(); }
      ctx.strokeStyle = 'rgba(200,150,170,0.7)'; ctx.lineWidth = 1.4;
      for (const dx of [-3, 3]) { ctx.beginPath(); ctx.moveTo(15.5 + dx, 8); ctx.bezierCurveTo(13 + dx, 6, 18 + dx, 4, 15.5 + dx, 2); ctx.stroke(); }
      break;
    }
    case 'shell':
      ctx.fillStyle = '#ffd9e8'; ctx.beginPath(); ctx.moveTo(16, 27); ctx.bezierCurveTo(2, 22, 4, 6, 16, 5); ctx.bezierCurveTo(28, 6, 30, 22, 16, 27); ctx.fill();
      ctx.strokeStyle = '#ffa6c6'; ctx.lineWidth = 1.4; ctx.stroke();
      for (const k of [-6, -2, 2, 6]) { ctx.beginPath(); ctx.moveTo(16, 26); ctx.lineTo(16 + k * 1.6, 8 + Math.abs(k) * 0.5); ctx.stroke(); }
      circle(ctx, 16, 9, 2.2, '#bfe6f2');
      break;
    case 'blossom':
      ellipse(ctx, 9, 15, 7, 5, '#ff9ec0'); ellipse(ctx, 23, 15, 7, 5, '#ff9ec0');
      ctx.fillStyle = '#ffc2da'; ctx.beginPath(); ctx.moveTo(16, 15); ctx.lineTo(10, 28); ctx.lineTo(14, 24); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, 15); ctx.lineTo(22, 28); ctx.lineTo(18, 24); ctx.closePath(); ctx.fill();
      circle(ctx, 16, 15, 3.4, '#ff6b9b');
      break;
    case 'moth':
      ellipse(ctx, 9.5, 13, 8, 6, '#e8c4a8'); ellipse(ctx, 22.5, 13, 8, 6, '#e8c4a8');
      ellipse(ctx, 10.5, 21, 5.5, 4.5, '#d9a98a'); ellipse(ctx, 21.5, 21, 5.5, 4.5, '#d9a98a');
      circle(ctx, 8, 12, 2, '#8a5a44'); circle(ctx, 24, 12, 2, '#8a5a44');
      ellipse(ctx, 16, 17, 2.4, 7.5, '#8a5a44');
      ctx.strokeStyle = '#8a5a44'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(15, 9); ctx.quadraticCurveTo(12, 4, 9, 5); ctx.moveTo(17, 9); ctx.quadraticCurveTo(20, 4, 23, 5); ctx.stroke();
      break;
    case 'button':
      circle(ctx, 16, 16, 12, '#ffe9a8'); circle(ctx, 16, 16, 12, 'rgba(0,0,0,0)');
      ctx.strokeStyle = '#ffc94d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(16, 16, 12, 0, 7); ctx.stroke();
      star(ctx, 16, 16, 6.5, '#ffc94d'); circle(ctx, 14, 15, 1, '#fff'); circle(ctx, 18, 15, 1, '#fff');
      break;
    default:
      if (ITEMS[id]?.kind === 'decor') { drawDecor(ctx, id, 16, 30, 0.95); break; }
      circle(ctx, 16, 16, 8, '#ffb3cf');
  }
  ctx.restore();
}

const cache = new Map<string, string>();
/** Returns a canvas element showing the icon (cached via data URL). */
export function itemIcon(id: string, size = 32): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d')!;
  const key = id + size + dpr;
  const hit = cache.get(key);
  if (hit) {
    const img = new Image(); img.src = hit; img.onload = () => g.drawImage(img, 0, 0);
    return c;
  }
  g.scale((size * dpr) / 32, (size * dpr) / 32);
  drawItem(g, id);
  cache.set(key, c.toDataURL());
  return c;
}

export function coinIcon(size = 18): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d')!;
  g.scale((size * dpr) / 32, (size * dpr) / 32);
  circle(g, 16, 16, 14, '#ffb3cf'); circle(g, 16, 16, 10.5, '#ffd0e2');
  star(g, 16, 16, 7, '#fff');
  return c;
}
