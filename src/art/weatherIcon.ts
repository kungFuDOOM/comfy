// Tiny cute weather glyphs for the HUD, drawn in code on a 32x32 canvas (same chunky pastel style as the item icons).
import type { WeatherKind } from '../weather';
import { circle, ellipse } from './draw';

const puff = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: string) => {
  circle(ctx, x - 7 * s, y + 2 * s, 5.5 * s, c); circle(ctx, x + 7 * s, y + 2 * s, 5 * s, c);
  circle(ctx, x - 1 * s, y - 2 * s, 7.5 * s, c); ellipse(ctx, x, y + 5 * s, 12.5 * s, 4.5 * s, c);
};

export function drawWeatherIcon(ctx: CanvasRenderingContext2D, kind: WeatherKind, rainbow: boolean, night: boolean) {
  ctx.clearRect(0, 0, 32, 32);
  ctx.lineCap = 'round';
  if (rainbow) {
    const cols = ['#ff8fa8', '#ffc38a', '#ffe88a', '#a8e6a0', '#9ccfff', '#c8a8ff'];
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(16, 24, 13 - i * 2.1, Math.PI, 0); ctx.stroke(); });
    puff(ctx, 6.5, 25, 0.42, '#ffffff'); puff(ctx, 25.5, 25, 0.42, '#ffffff');
    return;
  }
  if (kind === 'sunny') {
    if (night) { // crescent moon with a couple of stars
      circle(ctx, 15, 16, 10, '#fff1b8');
      ctx.globalCompositeOperation = 'destination-out'; circle(ctx, 20.5, 13, 8.5, '#000'); ctx.globalCompositeOperation = 'source-over';
      circle(ctx, 25, 8, 1.6, '#fff1b8'); circle(ctx, 22, 22, 1.2, '#fff1b8');
      return;
    }
    ctx.strokeStyle = '#ffc94d'; ctx.lineWidth = 2.4;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11); ctx.lineTo(16 + Math.cos(a) * 14.5, 16 + Math.sin(a) * 14.5); ctx.stroke(); }
    circle(ctx, 16, 16, 8.5, '#ffe27a'); circle(ctx, 13.5, 13.5, 2.4, 'rgba(255,255,255,0.7)');
    circle(ctx, 13, 17, 1.1, '#6b4a5a'); circle(ctx, 19, 17, 1.1, '#6b4a5a'); circle(ctx, 11, 19.5, 1.6, 'rgba(255,143,182,0.6)'); circle(ctx, 21, 19.5, 1.6, 'rgba(255,143,182,0.6)');
    return;
  }
  if (kind === 'cloudy') { puff(ctx, 17, 13, 0.7, '#dfe6f4'); puff(ctx, 14, 19, 1, '#ffffff'); return; }
  puff(ctx, 16, 12, 0.95, kind === 'rain' ? '#d4def2' : '#e6ecf8');
  if (kind === 'rain') {
    ctx.strokeStyle = '#7fb6f0'; ctx.lineWidth = 2.4;
    for (const [x, y] of [[10, 22], [16, 24], [22, 22]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.6, y + 5); ctx.stroke(); }
  } else {
    for (const [x, y] of [[10, 23], [16, 26], [22, 23]]) { circle(ctx, x, y, 2.1, '#ffffff'); circle(ctx, x, y, 2.1, 'rgba(159,208,255,0.35)'); }
  }
}
