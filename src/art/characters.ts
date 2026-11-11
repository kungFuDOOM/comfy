// Player and villager art, drawn in code. (x, y) is the foot-center.
import type { OutfitDef, VillagerDef } from '../data';
import { cheetahPattern } from './cheetah';
import { circle, ellipse, rr, heart } from './draw';

export type Facing = 'up' | 'down' | 'left' | 'right';

export function drawPlayer(
  ctx: CanvasRenderingContext2D, x: number, y: number, outfit: OutfitDef,
  facing: Facing, moving: boolean, t: number, scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const step = moving ? Math.sin(t * 14) : 0;
  const bob = moving ? Math.abs(Math.sin(t * 14)) * -1.6 : Math.sin(t * 2) * 0.35;
  ellipse(ctx, 0, 0, 9, 3.4, 'rgba(120,70,100,0.18)');
  // feet
  circle(ctx, -3.5 + step * 1.8, -1.5, 2.6, '#ffe2cf');
  circle(ctx, 3.5 - step * 1.8, -1.5, 2.6, '#ffe2cf');
  ctx.translate(0, bob);
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  // hair back
  circle(ctx, 0, -22, 10.5, '#7a4a3a');
  // body / outfit
  const fill = outfit.pattern ? cheetahPattern(ctx, outfit.pattern, 0.45) : outfit.body;
  rr(ctx, -7.2, -16, 14.4, 12.5, 5);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = 'rgba(160,80,110,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  if (outfit.id === 'strawberry') { ctx.fillStyle = '#ff7aa8'; rr(ctx, -5, -14, 10, 9, 3); ctx.fill(); circle(ctx, -3, -13.5, 1, '#fff'); circle(ctx, 3, -13.5, 1, '#fff'); }
  if (outfit.id === 'spotted_sun') { ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.45); rr(ctx, -7.2, -7, 14.4, 3.6, 2); ctx.fill(); }
  // trim collar
  ctx.fillStyle = outfit.trim;
  rr(ctx, -4.5, -16.5, 9, 2.6, 1.3); ctx.fill();
  // arms
  circle(ctx, -8 - (side ? 0 : 0), -10 + step * 0.8, 2.4, '#ffe2cf');
  circle(ctx, 8, -10 - step * 0.8, 2.4, '#ffe2cf');
  // head
  circle(ctx, 0, -22, 9, '#ffe9d9');
  if (facing === 'up') {
    circle(ctx, 0, -22, 9.4, '#7a4a3a');
  } else {
    // bangs
    ctx.fillStyle = '#7a4a3a';
    ctx.beginPath();
    ctx.arc(0, -23, 9.6, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(4, -22.5, 0, -25.5);
    ctx.quadraticCurveTo(-4, -22.5, -9.4, -23);
    ctx.fill();
    // face
    const fx = side * 2.4;
    circle(ctx, -3.4 + fx, -20.8, 1.4, '#4a2a2f');
    circle(ctx, 3.4 + fx, -20.8, 1.4, '#4a2a2f');
    circle(ctx, -3.0 + fx, -21.3, 0.5, '#fff');
    circle(ctx, 3.8 + fx, -21.3, 0.5, '#fff');
    ellipse(ctx, -5.6 + fx, -18.2, 2, 1.2, 'rgba(255,130,170,0.55)');
    ellipse(ctx, 5.6 + fx, -18.2, 2, 1.2, 'rgba(255,130,170,0.55)');
    ctx.strokeStyle = '#b5566f'; ctx.lineWidth = 0.9; ctx.beginPath();
    ctx.arc(fx, -18.6, 1.4, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  // hat / accessory
  switch (outfit.hat) {
    case 'bow':
      circle(ctx, 0, -31, 1.8, '#ff7aa8');
      ellipse(ctx, -4.2, -31, 3.6, 2.6, '#ff9ec0');
      ellipse(ctx, 4.2, -31, 3.6, 2.6, '#ff9ec0');
      circle(ctx, 0, -31, 1.7, '#ff6b9b');
      break;
    case 'beret':
      ellipse(ctx, -1, -30.5, 9, 4, '#ff8fb6');
      circle(ctx, -1, -34, 1.4, '#ff6b9b');
      break;
    case 'sunhat':
      ellipse(ctx, 0, -29, 14, 4.2, '#ffe9b8');
      rr(ctx, -6.5, -35, 13, 7, 4); ctx.fillStyle = '#ffe9b8'; ctx.fill();
      ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.4); ctx.fillRect(-6.5, -31, 13, 2.8);
      break;
    default:
      circle(ctx, 6.5, -29.5, 2.2, '#ff9ec0'); // tiny hair clip
      circle(ctx, 6.5, -29.5, 0.9, '#fff');
  }
  ctx.restore();
}

export function drawVillager(
  ctx: CanvasRenderingContext2D, def: VillagerDef, x: number, y: number,
  t: number, facing: Facing, moving: boolean, scale = 1, bubble = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const bob = moving ? Math.abs(Math.sin(t * 10)) * -1.6 : Math.sin(t * 2 + def.name.length) * 0.5;
  ellipse(ctx, 0, 0, 10, 3.6, 'rgba(120,70,100,0.18)');
  ctx.translate(0, bob);
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const c = def.color, a = def.accent;
  const eyes = (ex: number, ey: number, gap: number, r = 1.5) => {
    if (facing === 'up') return;
    circle(ctx, ex - gap + side * 2, ey, r, '#4a2a2f');
    circle(ctx, ex + gap + side * 2, ey, r, '#4a2a2f');
    circle(ctx, ex - gap + side * 2 + 0.5, ey - 0.5, r * 0.35, '#fff');
    circle(ctx, ex + gap + side * 2 + 0.5, ey - 0.5, r * 0.35, '#fff');
    ellipse(ctx, ex - gap - 2.4 + side * 2, ey + 2.8, 2, 1.2, 'rgba(255,120,160,0.5)');
    ellipse(ctx, ex + gap + 2.4 + side * 2, ey + 2.8, 2, 1.2, 'rgba(255,120,160,0.5)');
  };
  switch (def.species) {
    case 'dormouse': {
      ellipse(ctx, 9, -6, 3, 6, a); // tail
      circle(ctx, -8, -29, 6, c); circle(ctx, 8, -29, 6, c); // big round ears
      circle(ctx, -8, -29, 3.5, a); circle(ctx, 8, -29, 3.5, a);
      ellipse(ctx, 0, -11, 10, 9, c);
      circle(ctx, 0, -21, 10, c);
      ellipse(ctx, 0, -9, 6, 5, '#fff7fa');
      ctx.fillStyle = '#fff'; rr(ctx, -6, -11, 12, 9, 3); ctx.fill(); // apron
      heart(ctx, 0, -7, 2.2, a);
      eyes(0, -21, 3.6);
      circle(ctx, side * 2, -18, 1, '#e07a9a');
      break;
    }
    case 'cheetah': {
      ellipse(ctx, 10, -8, 3, 8, def.color); // tail
      for (let i = 0; i < 3; i++) ellipse(ctx, 10, -12 + i * 3.5, 3.1, 1, def.accent);
      ellipse(ctx, 0, -11, 10, 9, c);
      circle(ctx, -7, -29, 4.2, c); circle(ctx, 7, -29, 4.2, c);
      circle(ctx, -7, -29, 2, a); circle(ctx, 7, -29, 2, a);
      circle(ctx, 0, -21, 10, c);
      // spots
      for (const [sx, sy] of [[-5, -26], [4, -27], [-7, -14], [6, -12], [0, -8], [-3, -18]] as [number, number][]) circle(ctx, sx, sy, 1.3, a);
      // signature tear lines
      if (facing !== 'up') {
        ctx.strokeStyle = a; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 3.6 + side * 2, -19.5); ctx.quadraticCurveTo(s * 5.2 + side * 2, -16, s * 4.4 + side * 2, -13.5); ctx.stroke(); }
      }
      // scarf
      ctx.fillStyle = '#ff9ec0'; rr(ctx, -7, -13, 14, 3.4, 1.7); ctx.fill();
      eyes(0, -21.5, 3.6);
      circle(ctx, side * 2, -18, 1, '#6b4331');
      break;
    }
    case 'hedgehog': {
      // pastel spikes
      ctx.fillStyle = a;
      for (let i = -5; i <= 5; i++) {
        const sx = i * 2.7;
        ctx.beginPath(); ctx.moveTo(sx - 2, -16); ctx.lineTo(sx, -33 + Math.abs(i) * 0.9); ctx.lineTo(sx + 2, -16); ctx.fill();
      }
      ellipse(ctx, 0, -11, 10, 9, '#e9d8f7');
      circle(ctx, 0, -21, 9.5, c);
      circle(ctx, -7, -26, 2.6, c); circle(ctx, 7, -26, 2.6, c);
      // straw hat + flower
      ellipse(ctx, 0, -29, 11, 2.8, '#f4dba0');
      rr(ctx, -5.5, -35, 11, 7, 3.5); ctx.fillStyle = '#f4dba0'; ctx.fill();
      circle(ctx, 4, -31, 1.6, '#ff9ec0');
      ellipse(ctx, 0, -9, 6, 5, '#fff');
      eyes(0, -21, 3.3, 1.4);
      circle(ctx, side * 2, -18.2, 1.2, '#d9608a');
      break;
    }
    case 'owl': {
      ellipse(ctx, -10, -11, 3.2, 7, a); ellipse(ctx, 10, -11, 3.2, 7, a); // wings
      ellipse(ctx, 0, -11, 10, 10, c);
      ellipse(ctx, 0, -9, 6.2, 6.5, '#f3ecff');
      circle(ctx, 0, -21, 10.5, c);
      // ear tufts
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-9, -26); ctx.lineTo(-7, -35); ctx.lineTo(-2.5, -29); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -26); ctx.lineTo(7, -35); ctx.lineTo(2.5, -29); ctx.fill();
      if (facing !== 'up') {
        circle(ctx, -4.2 + side * 2, -21.5, 4.2, '#fff'); circle(ctx, 4.2 + side * 2, -21.5, 4.2, '#fff');
        circle(ctx, -4.2 + side * 2, -21.5, 2.1, '#4a2a2f'); circle(ctx, 4.2 + side * 2, -21.5, 2.1, '#4a2a2f');
        circle(ctx, -3.6 + side * 2, -22.2, 0.8, '#fff'); circle(ctx, 4.8 + side * 2, -22.2, 0.8, '#fff');
        ctx.fillStyle = '#ffb95e'; ctx.beginPath(); ctx.moveTo(-1.2 + side * 2, -18); ctx.lineTo(1.2 + side * 2, -18); ctx.lineTo(side * 2, -15.6); ctx.fill();
      }
      // little scarf with star
      ctx.fillStyle = a; rr(ctx, -7, -14, 14, 3, 1.5); ctx.fill();
      break;
    }
  }
  if (bubble) {
    const by = -44 + Math.sin(t * 4) * 1.5;
    rr(ctx, -6.5, by - 7, 13, 12, 5); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.2; ctx.stroke();
    heart(ctx, 0, by - 2, 2.6, '#ff6b9b');
  }
  ctx.restore();
}
