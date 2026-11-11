// Afterglow Lantern art. Soft paper lanterns, one motif per activity.
import type { LanternKind } from '../state';
import { cheetahPattern } from './cheetah';
import { circle, ellipse, rr, heart, star } from './draw';

export interface LanternMeta { id: LanternKind; name: string; moment: string; top: string; bottom: string; glow: string }

export const LANTERN_KINDS: LanternMeta[] = [
  { id: 'serve', name: 'Steam Lantern', moment: 'Serving a coffee drink', top: '#ffe3cf', bottom: '#f2b79a', glow: '255,190,150' },
  { id: 'gift', name: 'Ribbon Lantern', moment: 'Gifting something a friend likes', top: '#ffd9e8', bottom: '#ff9ec7', glow: '255,150,200' },
  { id: 'decor', name: 'Hearth Lantern', moment: 'Placing a decor piece', top: '#eadcff', bottom: '#c3a8f0', glow: '200,170,255' },
  { id: 'collect', name: 'Sparkle Lantern', moment: 'Finding a collectible', top: '#d9fff0', bottom: '#8fdcc0', glow: '150,240,200' },
  { id: 'outfit', name: 'Spotted Lantern', moment: 'Trying on a boutique outfit', top: '#fff0d0', bottom: '#ffc9dc', glow: '255,200,170' },
  { id: 'garden', name: 'Sprout Lantern', moment: 'Tending a garden plot', top: '#efffd0', bottom: '#b5e68e', glow: '200,255,150' },
];
export const lanternMeta = (k: LanternKind) => LANTERN_KINDS.find((m) => m.id === k)!;

/** (x, y) = center of the lantern body. Size ~ 22 * scale px tall. */
export function drawLantern(ctx: CanvasRenderingContext2D, kind: LanternKind, x: number, y: number, scale = 1, t = 0, glow = 1) {
  const m = lanternMeta(kind);
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.6 + x * 0.13) * 1.4 * scale);
  ctx.rotate(Math.sin(t * 1.1 + x * 0.07) * 0.05);
  ctx.scale(scale, scale);
  // glow halo
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  g.addColorStop(0, `rgba(${m.glow},${0.55 * glow})`);
  g.addColorStop(1, `rgba(${m.glow},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  // string + caps
  ctx.strokeStyle = '#b58a8a'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -11); ctx.stroke();
  rr(ctx, -4.5, -12, 9, 3, 1.5); ctx.fillStyle = '#d9a5b3'; ctx.fill();
  // paper body
  const body = ctx.createLinearGradient(0, -10, 0, 10);
  body.addColorStop(0, m.top); body.addColorStop(1, m.bottom);
  ctx.beginPath();
  ctx.moveTo(-5, -9); ctx.bezierCurveTo(-13, -6, -13, 6, -5, 9);
  ctx.lineTo(5, 9); ctx.bezierCurveTo(13, 6, 13, -6, 5, -9); ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = 'rgba(150,90,110,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
  // paper ribs
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.7;
  for (const k of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(k * 0.55, -9); ctx.quadraticCurveTo(k * 1.5, 0, k * 0.55, 9); ctx.stroke(); }
  // inner light
  ellipse(ctx, 0, 0, 4.5, 6, `rgba(255,250,220,${0.55 * glow})`);
  // motif
  ctx.save();
  switch (kind) {
    case 'serve': // steam wisps
      ctx.strokeStyle = '#8a5a4a'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      for (const dx of [-2.6, 2.6]) { ctx.beginPath(); ctx.moveTo(dx, 4); ctx.bezierCurveTo(dx - 2.5, 1, dx + 2.5, -1, dx, -4); ctx.stroke(); }
      break;
    case 'gift': // ribbon bow
      ellipse(ctx, -2.8, -0.5, 2.8, 2, '#fff'); ellipse(ctx, 2.8, -0.5, 2.8, 2, '#fff'); circle(ctx, 0, -0.5, 1.3, '#ff6b9b');
      break;
    case 'decor': // tiny house + window light
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-3.6, 0.5); ctx.lineTo(0, -3.6); ctx.lineTo(3.6, 0.5); ctx.closePath(); ctx.fill();
      ctx.fillRect(-2.6, 0.5, 5.2, 3.6); ctx.fillStyle = '#c3a8f0'; ctx.fillRect(-0.9, 1.6, 1.8, 2.5);
      break;
    case 'collect':
      star(ctx, 0, 0, 4.4, '#fff');
      break;
    case 'outfit': // cheetah trim band
      ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.3); ctx.fillRect(-9, -2.2, 18, 4.4);
      break;
    case 'garden': // leaf
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 4.5); ctx.bezierCurveTo(-5, 1, -3, -4, 0, -4.5); ctx.bezierCurveTo(3, -4, 5, 1, 0, 4.5); ctx.fill();
      break;
  }
  ctx.restore();
  // tassel
  ctx.strokeStyle = m.bottom; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, 9); ctx.lineTo(-2.4, 14); ctx.moveTo(0, 9); ctx.lineTo(0, 15); ctx.moveTo(2, 9); ctx.lineTo(2.4, 14); ctx.stroke();
  rr(ctx, -4.5, 8.5, 9, 2.2, 1.1); ctx.fillStyle = '#d9a5b3'; ctx.fill();
  ctx.restore();
}
export { heart };
