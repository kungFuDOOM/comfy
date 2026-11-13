// Decor furniture drawn in code. (x, y) = foot-center of a 1x1 tile.
import { cheetahPattern } from './cheetah';
import { circle, ellipse, rr, heart, star } from './draw';

export function drawDecor(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  switch (id) {
    case 'd_pouf':
      ellipse(ctx, 0, -1, 11, 3.5, 'rgba(120,70,100,0.18)');
      rr(ctx, -10, -15, 20, 14, 7); ctx.fillStyle = '#ffb3cf'; ctx.fill();
      ellipse(ctx, 0, -14, 9, 4, '#ffcde0');
      circle(ctx, 0, -14, 1.5, '#ff8fb6');
      break;
    case 'd_rug':
      ctx.save();
      rr(ctx, -15, -27, 30, 26, 8);
      ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.5); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#ff9ec0'; ctx.stroke();
      ctx.restore();
      break;
    case 'd_lamp':
      ellipse(ctx, 0, -1, 7, 2.6, 'rgba(120,70,100,0.18)');
      rr(ctx, -1.5, -20, 3, 19, 1.5); ctx.fillStyle = '#c99a7a'; ctx.fill();
      ellipse(ctx, 0, -2, 6.5, 2.2, '#c99a7a');
      ctx.beginPath(); ctx.moveTo(-9, -21); ctx.lineTo(9, -21); ctx.lineTo(6.5, -31); ctx.lineTo(-6.5, -31); ctx.closePath();
      ctx.fillStyle = '#ffe6ef'; ctx.fill(); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.2; ctx.stroke();
      circle(ctx, 0, -26, 2, '#fff3a8');
      break;
    case 'd_shelf':
      ellipse(ctx, 0, -1, 11, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -10, -30, 20, 29, 3); ctx.fillStyle = '#ffc3da'; ctx.fill(); ctx.strokeStyle = '#ff9ec0'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = '#ffe7f0'; ctx.fillRect(-8, -27, 16, 7); ctx.fillRect(-8, -17, 16, 7); ctx.fillRect(-8, -7, 16, 5);
      ['#c9a8e8', '#8fd3c4', '#ffd36e', '#ff8fb6', '#a8d8ee'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(-7 + i * 3, -26 + (i % 2), 2.4, 6); ctx.fillRect(-7 + i * 3, -16 + ((i + 1) % 2), 2.4, 6); });
      break;
    case 'd_teacup':
      ellipse(ctx, 0, -1, 10, 3, 'rgba(120,70,100,0.18)');
      ctx.beginPath(); ctx.moveTo(-10, -14); ctx.quadraticCurveTo(-9, 0, 0, -1); ctx.quadraticCurveTo(9, 0, 10, -14); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.5; ctx.stroke();
      circle(ctx, 0, -17, 4, '#ff9ec0'); circle(ctx, -5, -15, 3, '#fff'); circle(ctx, 5, -15, 3, '#c9a8e8'); circle(ctx, 0, -19, 1.2, '#fff3a8');
      break;
    case 'd_chair':
      ellipse(ctx, 0, -1, 12, 3.4, 'rgba(120,70,100,0.18)');
      rr(ctx, -11, -28, 22, 16, 7); ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.4); ctx.fill();
      rr(ctx, -12, -17, 24, 15, 6); ctx.fill(); ctx.strokeStyle = '#ff9ec0'; ctx.lineWidth = 1.6; ctx.stroke();
      circle(ctx, 0, -12, 2.4, '#ff9ec0');
      break;
    case 'd_cornucopia':
      ellipse(ctx, 0, -1, 14, 3.4, 'rgba(120,70,100,0.18)');
      ctx.beginPath(); ctx.moveTo(-13, -4); ctx.quadraticCurveTo(-14, -22, 2, -20); ctx.quadraticCurveTo(14, -19, 14, -9); ctx.quadraticCurveTo(8, -12, 2, -7); ctx.quadraticCurveTo(-5, -3, -13, -4); ctx.closePath();
      ctx.fillStyle = '#e8b98a'; ctx.fill(); ctx.strokeStyle = '#c98f5f'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#d4a06d'; ctx.lineWidth = 0.9; for (const k of [-9, -4, 1, 6]) { ctx.beginPath(); ctx.moveTo(k, -5 + k * 0.05); ctx.quadraticCurveTo(k + 1, -13, k + 4, -18); ctx.stroke(); }
      circle(ctx, 12, -14, 5.2, '#ffa763'); circle(ctx, 16.5, -9, 4.4, '#ff7f93'); circle(ctx, 8.4, -9.6, 3.6, '#c9a8e8'); circle(ctx, 11.6, -4, 3.4, '#ffd36e');
      circle(ctx, 10.4, -15.6, 1.4, '#ffd0a8'); circle(ctx, 15.4, -10.6, 1.1, '#ffc4cf');
      ctx.strokeStyle = '#ff8fb6'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(5, -9); ctx.quadraticCurveTo(7, -3, 13, -1); ctx.stroke();
      break;
    case 'd_haybale':
      ellipse(ctx, 0, -1, 12, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -11, -19, 22, 18, 7); ctx.fillStyle = '#f3d28b'; ctx.fill(); ctx.strokeStyle = '#d9ae5e'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#e1b96a'; ctx.lineWidth = 0.9; for (const y of [-15, -11, -7, -3.6]) { ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(9, y + 0.5); ctx.stroke(); }
      ctx.strokeStyle = '#f9e3a8'; ctx.beginPath(); ctx.arc(0, -12, 6, 0, 6.3); ctx.stroke();
      ctx.fillStyle = '#ffb3cf'; ctx.fillRect(-1.6, -19, 3.2, 18);
      heart(ctx, 0, -19.5, 3.2, '#ff8fb6');
      break;
    case 'd_pieshelf':
      ellipse(ctx, 0, -1, 12, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -11, -28, 22, 3.2, 1.2); ctx.fillStyle = '#e8b98a'; ctx.fill();
      rr(ctx, -10, -14.6, 20, 3, 1.2); ctx.fill();
      ctx.fillStyle = '#c98f5f'; ctx.fillRect(-9.6, -25, 2.4, 24); ctx.fillRect(7.2, -25, 2.4, 24);
      for (const [x, y, col] of [[-3, -28, '#ffa14f'], [4.2, -28, '#f0b565']] as [number, number, string][]) { ellipse(ctx, x, y - 2.4, 5, 2.4, '#f5cf9c'); ellipse(ctx, x, y - 3, 3.8, 1.6, col); }
      ellipse(ctx, 0, -17.6, 5.4, 2.6, '#f5cf9c'); ellipse(ctx, 0, -18.2, 4, 1.7, '#ff7f93');
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; for (const x of [-3, 4]) { ctx.beginPath(); ctx.moveTo(x, -32); ctx.quadraticCurveTo(x + 2, -35, x, -38); ctx.stroke(); }
      break;
    case 'd_tw_tree':
      ellipse(ctx, 0, -1, 11, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -2, -7, 4, 6, 1); ctx.fillStyle = '#c99a7a'; ctx.fill();
      for (const [y, w, c] of [[-6, 11, '#8fd7ae'], [-14, 9, '#9fe0b8'], [-21, 6.5, '#b0e8c4']] as [number, number, string][]) {
        ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.lineTo(0, y - 12); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#6fc191'; ctx.lineWidth = 1; ctx.stroke();
      }
      circle(ctx, -4, -9, 1.7, '#ff8fb6'); circle(ctx, 5, -16, 1.7, '#ffd36e'); circle(ctx, -2, -20, 1.4, '#fff'); circle(ctx, 6, -8, 1.4, '#c9a8e8');
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.quadraticCurveTo(0, -5, 8, -11); ctx.stroke();
      star(ctx, 0, -34, 4, '#ffe27a');
      break;
    case 'd_tw_cookies':
      ellipse(ctx, 0, -1, 12, 3, 'rgba(120,70,100,0.18)');
      for (const [y, w, c] of [[-1, 10, '#ffd6e4'], [-12, 8.6, '#d8f1e4'], [-22, 7.2, '#fff1c9']] as [number, number, string][]) {
        rr(ctx, -w, y - 10, w * 2, 10, 3); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.2; ctx.stroke();
        rr(ctx, -w - 1, y - 12, w * 2 + 2, 3.2, 1.6); ctx.fillStyle = '#ff9ec0'; ctx.fill();
        circle(ctx, -w * 0.3, y - 5, 2.2, '#d99b64'); circle(ctx, w * 0.35, y - 4.4, 2, '#d99b64');
      }
      heart(ctx, 0, -33, 3, '#ff8fb6');
      break;
    case 'd_cafe_menu':
      ellipse(ctx, 0, -1, 11, 3, 'rgba(120,70,100,0.18)');
      ctx.strokeStyle = '#c99a7a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(-6, -12); ctx.moveTo(9, -1); ctx.lineTo(6, -12); ctx.moveTo(0, -3); ctx.lineTo(0, -12); ctx.stroke();
      rr(ctx, -10, -32, 20, 23, 3.5); ctx.fillStyle = '#ffb3cf'; ctx.fill(); ctx.strokeStyle = '#ff8fb6'; ctx.lineWidth = 1; ctx.stroke();
      rr(ctx, -7.6, -29.6, 15.2, 18.2, 2); ctx.fillStyle = '#5a4048'; ctx.fill();
      heart(ctx, 0, -24.6, 3.2, '#ffd0e2');
      ctx.fillStyle = '#ffe6ef'; ctx.fillRect(-5.4, -19.6, 7, 1.2); ctx.fillRect(-5.4, -17, 5.4, 1.2); ctx.fillRect(-5.4, -14.4, 6.4, 1.2);
      circle(ctx, 4.4, -19, 0.9, '#ffd36e'); circle(ctx, 4.4, -16.4, 0.9, '#ff9ec0'); circle(ctx, 4.4, -13.8, 0.9, '#9fe0c8');
      rr(ctx, -8, -9.6, 16, 2, 1); ctx.fillStyle = '#c99a7a'; ctx.fill();
      ellipse(ctx, -3, -33.4, 3, 2.1, '#ff8fb6', -0.35); ellipse(ctx, 3, -33.4, 3, 2.1, '#ff8fb6', 0.35); circle(ctx, 0, -33, 1.5, '#ffd0e2');
      break;
    case 'd_cafe_succulent':
      ellipse(ctx, 0, -1, 10, 2.8, 'rgba(120,70,100,0.18)');
      ellipse(ctx, 0, -2.4, 9.5, 2.4, '#fff'); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -2.4, 9.5, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ff9ec0'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(7.6, -9, 3.2, -1.3, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7.5, -15); ctx.lineTo(7.5, -15); ctx.quadraticCurveTo(7, -3, 0, -3); ctx.quadraticCurveTo(-7, -3, -7.5, -15); ctx.closePath(); ctx.fillStyle = '#ffd0e2'; ctx.fill(); ctx.strokeStyle = '#ff9ec0'; ctx.lineWidth = 1.3; ctx.stroke();
      heart(ctx, 0, -9, 2.2, '#ff8fb6');
      for (const [x, y, rot, c] of [[-7, -17.5, -1.15, '#8fd3aa'], [7, -17.5, 1.15, '#8fd3aa'], [-4.4, -21, -0.6, '#8fd3aa'], [4.4, -21, 0.6, '#8fd3aa'], [0, -22.6, 0, '#a6e0bd'], [-2.4, -18.6, -0.5, '#a6e0bd'], [2.4, -18.6, 0.5, '#a6e0bd']] as [number, number, number, string][]) {
        ellipse(ctx, x, y, 2.7, 4.6, c, rot); circle(ctx, x + Math.sin(rot) * 4, y - Math.cos(rot) * 4, 0.9, '#ff9ec0');
      }
      ellipse(ctx, 0, -17.6, 2.6, 3.2, '#c2efd2');
      rr(ctx, -8, -16.4, 16, 2.6, 1.3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 0.9; ctx.stroke();
      break;
    case 'd_tw_cocoa':
      ellipse(ctx, 0, -1, 12, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -11, -16, 22, 3, 1.4); ctx.fillStyle = '#e8b98a'; ctx.fill(); rr(ctx, -11, -28, 22, 3, 1.4); ctx.fill();
      ctx.fillStyle = '#c98f5f'; ctx.fillRect(-9.6, -25, 2.4, 24); ctx.fillRect(7.2, -25, 2.4, 24);
      for (const [x, y, c] of [[-4, -16, '#ff9ec0'], [4, -16, '#9fe0c8'], [0, -28, '#ffd36e']] as [number, number, string][]) {
        rr(ctx, x - 4, y - 7, 8, 7, 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 1.3; ctx.stroke(); ellipse(ctx, x, y - 6.6, 3.6, 1.2, '#a8643f');
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; for (const x of [-4, 4]) { ctx.beginPath(); ctx.moveTo(x, -25); ctx.quadraticCurveTo(x + 2, -28, x, -31); ctx.stroke(); }
      break;
    case 'd_tw_gifts':
      ellipse(ctx, 0, -1, 13, 3.2, 'rgba(120,70,100,0.18)');
      for (const [x, y, w, hh, c, rb] of [[-5, -1, 12, 10, '#ffc2d8', '#fff'], [7, -1, 9, 8, '#c8ecd9', '#ff8fb6'], [0, -11, 9, 8, '#fff1d6', '#ff8fb6']] as [number, number, number, number, string, string][]) {
        rr(ctx, x - w / 2, y - hh, w, hh, 1.6); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(255,143,182,0.7)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = rb; ctx.fillRect(x - 0.9, y - hh, 1.8, hh); ctx.fillRect(x - w / 2, y - hh / 2 - 0.9, w, 1.8);
      }
      heart(ctx, 0, -19.4, 3.4, '#ff8fb6'); circle(ctx, 0, -19.2, 1, '#fff');
      break;
    case 'd_tw_star':
      ellipse(ctx, 0, -1, 9, 2.6, 'rgba(120,70,100,0.18)');
      ctx.fillStyle = '#e8b98a'; ctx.fillRect(-1.2, -16, 2.4, 15); rr(ctx, -5, -3, 10, 2.6, 1.2); ctx.fill();
      circle(ctx, 0, -25, 12, 'rgba(255,230,140,0.28)'); star(ctx, 0, -25, 9, '#ffd95e');
      circle(ctx, 0, -25, 2.2, '#fff6c8'); circle(ctx, 10, -34, 1, '#fff'); circle(ctx, -10, -17, 1.1, '#fff');
      break;
    case 'd_tw_wreath':
      ellipse(ctx, 0, -1, 10, 2.8, 'rgba(120,70,100,0.18)');
      ctx.fillStyle = '#e8b98a'; ctx.fillRect(-1.2, -9, 2.4, 8); rr(ctx, -5, -3, 10, 2.6, 1.2); ctx.fill();
      ctx.strokeStyle = '#8fd7ae'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -19, 9, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#b0e8c4'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -19, 9, 0.3, 4.2); ctx.stroke();
      for (const [x, y, c] of [[-8, -22, '#ff8fb6'], [7, -14, '#ff8fb6'], [-4, -11, '#fff'], [8, -24, '#ffd36e']] as [number, number, string][]) circle(ctx, x, y, 1.7, c);
      for (const sx of [-1, 1]) { ellipse(ctx, sx * 3.6, -28, 3.6, 2.2, '#ffb3cf'); }
      circle(ctx, 0, -28, 1.8, '#ff8fb6');
      break;
    case 'd_fishbowl':
      ellipse(ctx, 0, -1, 11, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -6, -5, 12, 4, 2); ctx.fillStyle = '#e8b98a'; ctx.fill();
      circle(ctx, 0, -14, 11, 'rgba(190,230,248,0.75)'); ctx.strokeStyle = '#8fcde4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -14, 11, 0, 7); ctx.stroke();
      ellipse(ctx, 0, -9, 9, 4, 'rgba(255,224,238,0.75)');
      ellipse(ctx, -1, -14, 4.6, 3.2, '#fffaf5'); circle(ctx, -2, -17, 1.6, '#ff8fb6'); ctx.fillStyle = '#ffb3cf'; ctx.beginPath(); ctx.moveTo(3, -14); ctx.lineTo(7, -17); ctx.lineTo(7, -11); ctx.fill();
      circle(ctx, -4, -14.6, 0.9, '#4a3a4a'); circle(ctx, 5, -20, 1.3, 'rgba(255,255,255,0.8)'); circle(ctx, 7, -23, 0.9, 'rgba(255,255,255,0.8)');
      ellipse(ctx, -4, -20, 3, 1.4, 'rgba(255,255,255,0.7)', -0.6);
      break;
    case 'd_forage_basket':
      ellipse(ctx, 0, -1, 13, 3.2, 'rgba(120,70,100,0.18)');
      circle(ctx, -5, -16, 4.4, '#ff8fb6'); circle(ctx, 3, -18, 4, '#ffd0e2'); circle(ctx, 8, -14, 3.4, '#c79bff'); circle(ctx, -1, -13, 3.4, '#ff9ec0');
      ctx.fillStyle = '#ff9ec0'; ctx.beginPath(); ctx.arc(-9, -15, 3.4, Math.PI, 0); ctx.fill(); circle(ctx, -9.6, -17, 0.9, '#fff'); circle(ctx, -7.6, -16.4, 0.7, '#fff');
      rr(ctx, -12, -15, 24, 13, 4); ctx.fillStyle = '#e6b98a'; ctx.fill(); ctx.strokeStyle = '#c98f5f'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#c98f5f'; ctx.lineWidth = 1; for (const x of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x, -3); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(12, -9); ctx.stroke();
      break;
    case 'd_gem_stand':
      ellipse(ctx, 0, -1, 11, 3, 'rgba(120,70,100,0.18)');
      rr(ctx, -9, -8, 18, 7, 2.5); ctx.fillStyle = '#ffd6e6'; ctx.fill(); ctx.strokeStyle = '#ffa6c6'; ctx.lineWidth = 1.2; ctx.stroke();
      for (const [x, y, w, c, e] of [[-6, -8, 3.6, '#b8f0d8', '#7fd4b0'], [-1.5, -8, 4, '#ffc94d', '#e8a52a'], [3.5, -8, 3.6, '#ffc2da', '#e07aa5'], [7, -8, 2.6, '#d4b8ff', '#a98ad8']] as [number, number, number, string, string][]) {
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.6, y - w * 1.6); ctx.lineTo(x, y - w * 2.1); ctx.lineTo(x + w * 0.6, y - w * 1.6); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = e; ctx.lineWidth = 1; ctx.stroke();
      }
      star(ctx, 0, -22, 2.8, '#fff3a8');
      break;
    case 'd_cafe_sign':
      ellipse(ctx, 0, -1, 10, 2.8, 'rgba(120,70,100,0.18)');
      ctx.strokeStyle = '#c98f5f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(-5, -22); ctx.moveTo(8, -1); ctx.lineTo(5, -22); ctx.stroke();
      rr(ctx, -9, -30, 18, 17, 3); ctx.fillStyle = '#6a4a58'; ctx.fill(); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff0f6'; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(3, -23); ctx.quadraticCurveTo(3, -17, -1, -17); ctx.quadraticCurveTo(-5, -17, -5, -23); ctx.fill();
      heart(ctx, -1, -21, 1.6, '#ff8fb6'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(4, -20.5, 1.8, -1.4, 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(6, -15); ctx.stroke();
      break;
    default:
      circle(ctx, 0, -8, 6, '#ffb3cf');
  }
  ctx.restore();
}

export const FLAT_DECOR = new Set(['d_rug']);
export { heart };
