// Decor furniture drawn in code. (x, y) = foot-center of a 1x1 tile.
import { cheetahPattern } from './cheetah';
import { circle, ellipse, rr, heart } from './draw';

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
    default:
      circle(ctx, 0, -8, 6, '#ffb3cf');
  }
  ctx.restore();
}

export const FLAT_DECOR = new Set(['d_rug']);
export { heart };
