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
    case 'rod':
      ctx.strokeStyle = '#c99a7a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 28); ctx.quadraticCurveTo(14, 12, 26, 5); ctx.stroke();
      ctx.strokeStyle = '#a8d8ee'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(26, 5); ctx.quadraticCurveTo(29, 14, 24, 21); ctx.stroke();
      circle(ctx, 24, 23, 2.4, '#ff8fb6'); circle(ctx, 9, 24, 3, '#ffb3cf');
      break;
    case 'glowberry':
      circle(ctx, 16, 18, 10, 'rgba(255,230,120,0.35)'); circle(ctx, 16, 19, 8, '#c79bff'); circle(ctx, 13, 16, 2.2, '#e6d4ff');
      circle(ctx, 20, 21, 1, '#fff3a8'); circle(ctx, 14, 23, 1, '#fff3a8');
      ctx.fillStyle = '#7fcf8e'; ctx.beginPath(); ctx.moveTo(16, 11); ctx.quadraticCurveTo(10, 4, 8, 8); ctx.quadraticCurveTo(13, 12, 16, 11); ctx.fill();
      break;
    case 'moonpetal':
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - 1.57; ctx.save(); ctx.translate(16 + Math.cos(a) * 6, 15 + Math.sin(a) * 6); ctx.rotate(a + 1.57); ellipse(ctx, 0, 0, 3.8, 7, '#e6d9ff'); ctx.restore(); }
      circle(ctx, 16, 15, 3.4, '#fff3a8'); star(ctx, 16, 15, 2, '#fff');
      break;
    case 'pearlshell':
      ctx.fillStyle = '#ffc2da'; ctx.beginPath(); ctx.moveTo(16, 27); ctx.bezierCurveTo(2, 22, 4, 6, 16, 5); ctx.bezierCurveTo(28, 6, 30, 22, 16, 27); ctx.fill();
      ctx.strokeStyle = '#ff8fb6'; ctx.lineWidth = 1.4; ctx.stroke();
      for (const k of [-6, -2, 2, 6]) { ctx.beginPath(); ctx.moveTo(16, 26); ctx.lineTo(16 + k * 1.6, 8 + Math.abs(k) * 0.5); ctx.stroke(); }
      circle(ctx, 16, 15, 4, '#fff'); circle(ctx, 14.8, 13.8, 1.2, '#ffe9f2');
      break;
    case 'rare_beans':
      for (const [x, y, r] of [[12, 17, -0.4], [20, 14, 0.5], [18, 23, 0.1]] as number[][]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r); ellipse(ctx, 0, 0, 5.5, 7.5, '#4a3a6a');
        ctx.strokeStyle = '#2d2244'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(3, 0, 0, 6); ctx.stroke(); ctx.restore();
      }
      star(ctx, 8, 8, 3, '#fff3a8'); star(ctx, 26, 25, 2.4, '#fff3a8');
      break;
    case 'minnow': case 'perch': case 'koi': {
      const body = id === 'minnow' ? '#bfe6f2' : id === 'perch' ? '#9ad6b0' : '#fffaf5';
      const fin = id === 'minnow' ? '#8fcde4' : id === 'perch' ? '#5fae78' : '#ffb3cf';
      ctx.fillStyle = fin; ctx.beginPath(); ctx.moveTo(23, 16); ctx.lineTo(30, 9); ctx.lineTo(30, 23); ctx.closePath(); ctx.fill();
      ellipse(ctx, 14, 16, 11, 7.5, body); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(14, 16, 11, 7.5, 0, 0, 7); ctx.stroke();
      if (id === 'perch') { ctx.strokeStyle = '#5fae78'; ctx.lineWidth = 1.6; for (const x of [11, 15, 19]) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 22); ctx.stroke(); } }
      if (id === 'koi') { circle(ctx, 12, 12, 3, '#ff8fb6'); circle(ctx, 18, 19, 2.4, '#ffd0e2'); }
      circle(ctx, 8, 14.5, 1.6, '#4a3a4a'); circle(ctx, 8.4, 14.1, 0.5, '#fff'); circle(ctx, 6, 19, 1.4, 'rgba(255,143,182,0.6)');
      break;
    }
    case 'berry_tart':
      ellipse(ctx, 16, 22, 13, 5, '#e0b07a'); ellipse(ctx, 16, 19, 13, 5, '#f4cf9a'); ellipse(ctx, 16, 18, 10, 3.6, '#fff3e0');
      for (const [x, y] of [[11, 17], [16, 16], [21, 17], [14, 19], [19, 19]] as number[][]) circle(ctx, x, y, 2.6, '#ff8fb6');
      circle(ctx, 15, 15.5, 0.8, '#ffd0e2');
      break;
    case 'blossom_scone':
      ctx.fillStyle = '#f0c48a'; ctx.beginPath(); ctx.moveTo(4, 24); ctx.quadraticCurveTo(6, 8, 16, 8); ctx.quadraticCurveTo(26, 8, 28, 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d9a468'; ctx.lineWidth = 1.4; ctx.stroke();
      for (const [x, y] of [[12, 16], [19, 14], [16, 20], [22, 20]] as number[][]) { circle(ctx, x, y, 2, '#ff9ec0'); circle(ctx, x, y, 0.8, '#fff3a8'); }
      break;
    case 'cloud_cake':
      rr(ctx, 6, 16, 20, 11, 4); ctx.fillStyle = '#ffd6e7'; ctx.fill(); ctx.strokeStyle = '#ffa6c6'; ctx.lineWidth = 1.2; ctx.stroke();
      for (const [x, y, r] of [[10, 14, 5], [16, 11, 6.5], [22, 14, 5]] as number[][]) circle(ctx, x, y, r, '#fff');
      circle(ctx, 16, 5, 2.2, '#ff5c8a'); heart(ctx, 16, 21, 2.4, '#fff');
      break;
    case 'lantern_latte': case 'star_brew': {
      const top = id === 'lantern_latte' ? '#c79bff' : '#5a4a7a';
      ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(25, 18, 4, -1.4, 1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(25, 12); ctx.quadraticCurveTo(24, 27, 15.5, 27); ctx.quadraticCurveTo(7, 27, 6, 12); ctx.fillStyle = id === 'star_brew' ? '#3a2d52' : '#fff'; ctx.fill();
      ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.4; ctx.stroke();
      ellipse(ctx, 15.5, 12, 9.5, 3, top);
      star(ctx, 15.5, 12, 2, '#fff3a8');
      if (id === 'star_brew') { star(ctx, 11, 21, 1.6, '#fff3a8'); star(ctx, 19, 19, 1.4, '#fff3a8'); }
      break;
    }
    case 'pumpkin':
      ellipse(ctx, 16, 27, 9.5, 2.2, 'rgba(120,70,100,0.16)');
      ellipse(ctx, 9.6, 18.4, 6.4, 8.2, '#ffa763'); ellipse(ctx, 22.4, 18.4, 6.4, 8.2, '#ffa763');
      ellipse(ctx, 13, 18.4, 6.6, 8.8, '#ffb877'); ellipse(ctx, 19, 18.4, 6.6, 8.8, '#ffb877');
      ellipse(ctx, 16, 18.4, 5.4, 9, '#ffc88c');
      ctx.strokeStyle = '#f08d4e'; ctx.lineWidth = 1; for (const x of [10.4, 16, 21.6]) { ctx.beginPath(); ctx.moveTo(16 + (x - 16) * 0.35, 10.5); ctx.quadraticCurveTo(x - (16 - x) * 0.2, 18.5, 16 + (x - 16) * 0.45, 26.5); ctx.stroke(); }
      rr(ctx, 14.4, 5.2, 3.2, 6, 1.4); ctx.fillStyle = '#86c279'; ctx.fill();
      ctx.strokeStyle = '#86c279'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(17.6, 8); ctx.quadraticCurveTo(23, 5.5, 22.5, 10); ctx.stroke();
      circle(ctx, 11.6, 20.4, 1.7, 'rgba(255,128,160,0.55)'); circle(ctx, 20.4, 20.4, 1.7, 'rgba(255,128,160,0.55)');
      break;
    case 'apple':
      ellipse(ctx, 16, 27.4, 8, 1.8, 'rgba(120,70,100,0.16)');
      circle(ctx, 11.6, 18.4, 7.4, '#ff7f93'); circle(ctx, 20.4, 18.4, 7.4, '#ff7f93'); ellipse(ctx, 16, 20, 8.6, 7.4, '#ff7f93');
      circle(ctx, 11.4, 15.6, 2.2, '#ffc4cf'); circle(ctx, 20.4, 22, 1.2, '#ff9aab');
      ctx.strokeStyle = '#a8704f'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(16, 11.6); ctx.quadraticCurveTo(16.4, 8.6, 18.4, 6.4); ctx.stroke();
      ctx.fillStyle = '#86c279'; ctx.beginPath(); ctx.moveTo(18, 8.6); ctx.quadraticCurveTo(23, 4.2, 26.4, 7.4); ctx.quadraticCurveTo(22, 11, 18, 8.6); ctx.fill();
      break;
    case 'cinnamon':
      for (const [dy, rot] of [[-3, -0.12], [3.4, 0.1]] as number[][]) {
        ctx.save(); ctx.translate(16, 16 + dy); ctx.rotate(rot);
        rr(ctx, -11, -3.6, 22, 7.2, 3.6); ctx.fillStyle = '#c98a5e'; ctx.fill();
        circle(ctx, 11, 0, 3.6, '#b87648'); circle(ctx, 11, 0, 1.9, '#d9a279'); circle(ctx, 11, 0, 0.7, '#a2653d');
        ctx.strokeStyle = '#a87049'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-8, -1.2); ctx.lineTo(7, -1.2); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = '#ff8fb6'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(14.4, 8.6); ctx.lineTo(14.4, 24); ctx.stroke();
      heart(ctx, 14.4, 12.4, 2.6, '#ff8fb6');
      break;
    case 'pumpkin_pie': case 'apple_pie': {
      const pump = id === 'pumpkin_pie';
      ellipse(ctx, 16, 25, 13, 3.4, 'rgba(120,70,100,0.16)');
      ellipse(ctx, 16, 20.4, 13, 6.6, '#e7b27a'); ellipse(ctx, 16, 19, 13, 6.4, '#f5cf9c');
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; circle(ctx, 16 + Math.cos(a) * 12.4, 19 + Math.sin(a) * 6, 1.5, '#f5cf9c'); }
      ellipse(ctx, 16, 19, 10.6, 4.9, pump ? '#ffa14f' : '#f0b565');
      if (pump) {
        ellipse(ctx, 16, 18.4, 8, 3.2, '#ffb36a');
        for (const [x, y] of [[10, 18], [14.5, 16.4], [19.5, 16.6], [22.4, 19]] as number[][]) circle(ctx, x, y, 2.3, '#fff'); circle(ctx, 16.4, 18.6, 3, '#fff');
        heart(ctx, 16.4, 18.6, 1.8, '#ff9ec0');
      } else {
        ctx.strokeStyle = '#f5cf9c'; ctx.lineWidth = 2.1;
        for (const k of [-6, -2, 2, 6]) { ctx.beginPath(); ctx.moveTo(16 + k - 3.6, 15.2); ctx.lineTo(16 + k + 3.6, 22.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(16 + k + 3.6, 15.2); ctx.lineTo(16 + k - 3.6, 22.6); ctx.stroke(); }
        circle(ctx, 16, 19, 2.4, '#ff7f93'); circle(ctx, 15.4, 18.3, 0.8, '#ffc4cf');
      }
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (const x of [12, 16, 20]) { ctx.beginPath(); ctx.moveTo(x, 12); ctx.quadraticCurveTo(x + 2, 9, x, 6.4); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke(); }
      break;
    }
    case 'twig': {
      ctx.strokeStyle = '#c99a86'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 25); ctx.lineTo(25, 8); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(10, 11); ctx.moveTo(19, 14); ctx.lineTo(24, 18); ctx.stroke();
      circle(ctx, 10, 10, 2.2, '#ffb3cf'); circle(ctx, 25, 19, 2, '#ffb3cf'); circle(ctx, 26, 7, 2.4, '#ffd9e8');
      break;
    }
    case 'plank': {
      rr(ctx, 4, 10, 24, 12, 3); ctx.fillStyle = '#f2c3b0'; ctx.fill(); ctx.strokeStyle = '#d9937e'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = '#e3a692'; ctx.lineWidth = 1; for (const y of [13.5, 16, 18.5]) { ctx.beginPath(); ctx.moveTo(7, y); ctx.lineTo(25, y); ctx.stroke(); }
      circle(ctx, 8, 16, 1.2, '#ff8fb6'); circle(ctx, 24, 16, 1.2, '#ff8fb6');
      break;
    }
    case 'bow_pin':
      ctx.fillStyle = '#ff8fb6'; ctx.beginPath(); ctx.moveTo(16, 15); ctx.quadraticCurveTo(4, 4, 4, 15); ctx.quadraticCurveTo(4, 26, 16, 15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, 15); ctx.quadraticCurveTo(28, 4, 28, 15); ctx.quadraticCurveTo(28, 26, 16, 15); ctx.fill();
      circle(ctx, 16, 15, 3.6, '#ff5c8a'); ctx.strokeStyle = '#ffd0e2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(16, 18); ctx.lineTo(12, 27); ctx.moveTo(16, 18); ctx.lineTo(20, 27); ctx.stroke();
      break;
    case 'shell_charm':
      ctx.strokeStyle = '#ff8fb6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(16, 8, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd9e8'; ctx.beginPath(); ctx.moveTo(16, 29); ctx.bezierCurveTo(6, 25, 7, 14, 16, 13); ctx.bezierCurveTo(25, 14, 26, 25, 16, 29); ctx.fill();
      ctx.strokeStyle = '#ffa6c6'; ctx.lineWidth = 1.3; ctx.stroke();
      for (const k of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(16, 28); ctx.lineTo(16 + k * 1.4, 16); ctx.stroke(); }
      break;
    case 'petal_pin':
      ctx.fillStyle = '#e6d9ff'; ctx.beginPath(); ctx.moveTo(16, 4); ctx.quadraticCurveTo(28, 14, 16, 28); ctx.quadraticCurveTo(4, 14, 16, 4); ctx.fill();
      ctx.strokeStyle = '#b9a2e0'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(16, 25); ctx.stroke(); star(ctx, 16, 14, 3, '#fff3a8');
      break;
    // ---- Twinkle Season (events/twinkle.ts) ----
    case 'ginger':
      ctx.save(); ctx.translate(16, 17); ctx.rotate(-0.5);
      rr(ctx, -9, -5, 18, 10, 5); ctx.fillStyle = '#e2b27a'; ctx.fill(); ctx.strokeStyle = '#b97f48'; ctx.lineWidth = 1.2; ctx.stroke();
      circle(ctx, -3, -1, 1.4, '#c78a52'); circle(ctx, 3, 1, 1.2, '#c78a52');
      ctx.restore();
      ctx.strokeStyle = '#ff8fb6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(23, 22); ctx.stroke();
      heart(ctx, 23, 10, 2.8, '#ff8fb6');
      break;
    case 'peppermint':
      for (const [x, y, c] of [[10, 12, '#ff8fb6'], [20, 11, '#ffffff'], [14, 20, '#ffffff'], [23, 21, '#ff8fb6'], [8, 22, '#ffc2d8']] as [number, number, string][]) {
        rr(ctx, x - 2.6, y - 1.6, 5.2, 3.2, 1.4); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      star(ctx, 16, 16, 3, '#fff3a8');
      break;
    case 'gingerbread':
      ellipse(ctx, 16, 26, 11, 2.6, 'rgba(120,70,100,0.16)');
      ctx.beginPath(); ctx.moveTo(16, 26); ctx.bezierCurveTo(1, 16, 5, 3, 16, 10); ctx.bezierCurveTo(27, 3, 31, 16, 16, 26); ctx.closePath();
      ctx.fillStyle = '#d99b64'; ctx.fill(); ctx.strokeStyle = '#a86d3c'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = '#fff6ee'; ctx.lineWidth = 1.6; ctx.setLineDash([2.2, 2.2]); ctx.beginPath(); ctx.moveTo(16, 23); ctx.bezierCurveTo(5, 16, 8, 8, 16, 13); ctx.bezierCurveTo(24, 8, 27, 16, 16, 23); ctx.stroke(); ctx.setLineDash([]);
      circle(ctx, 12.4, 15.4, 1.2, '#ff8fb6'); circle(ctx, 19.6, 15.4, 1.2, '#ff8fb6'); ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(16, 17.6, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    case 'peppermint_cookie': {
      ellipse(ctx, 16, 26, 11, 2.6, 'rgba(120,70,100,0.16)');
      circle(ctx, 16, 16, 11, '#f7dcb2'); ctx.strokeStyle = '#d9ae78'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(16, 16, 11, 0, 7); ctx.stroke();
      ctx.lineWidth = 3; ctx.lineCap = 'butt';
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.strokeStyle = i % 2 ? '#ffffff' : '#ff8fb6'; ctx.beginPath(); ctx.arc(16, 16, 7.4, a, a + 0.9); ctx.stroke(); }
      ctx.lineCap = 'round'; circle(ctx, 16, 16, 2.2, '#ff8fb6');
      break;
    }
    case 'ornament':
      ctx.strokeStyle = '#d9c28a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(16, 8); ctx.stroke();
      rr(ctx, 13, 6.4, 6, 3.6, 1.4); ctx.fillStyle = '#ffd36e'; ctx.fill();
      circle(ctx, 16, 18, 9, '#ff9ec0'); ctx.strokeStyle = '#ff7aa8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(16, 18, 9, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(8.4, 16); ctx.quadraticCurveTo(16, 21, 23.6, 16); ctx.stroke();
      circle(ctx, 12.4, 14, 2, 'rgba(255,255,255,0.8)'); star(ctx, 16, 22, 2.2, '#fff3a8');
      break;
    case 'cocoa_pink': case 'cocoa_mint': case 'cocoa_star': {
      const rim = id === 'cocoa_mint' ? '#9fe0c8' : id === 'cocoa_star' ? '#ffd36e' : '#ff9ec0';
      ellipse(ctx, 16, 27, 10, 2.4, 'rgba(120,70,100,0.16)');
      ctx.beginPath(); ctx.moveTo(7, 12); ctx.lineTo(25, 12); ctx.quadraticCurveTo(24, 26, 16, 26); ctx.quadraticCurveTo(8, 26, 7, 12); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = rim; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(26, 17, 4, -1.2, 1.2); ctx.stroke();
      ellipse(ctx, 16, 12, 9, 3, '#a8643f'); circle(ctx, 11.6, 10.6, 3.2, '#fff'); circle(ctx, 16.6, 9.8, 3.6, '#fff'); circle(ctx, 20.8, 11, 2.8, '#fff');
      if (id === 'cocoa_star') { star(ctx, 16.4, 8, 2.4, '#ffd36e'); star(ctx, 11.4, 9, 1.5, '#ffb3cf'); }
      else if (id === 'cocoa_mint') { ctx.strokeStyle = '#ff6f94'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(17, 10); ctx.lineTo(21, 3); ctx.quadraticCurveTo(23, 1, 24.6, 3); ctx.stroke(); }
      else heart(ctx, 16.4, 9.2, 2.4, '#ff8fb6');
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.1; for (const x of [11, 17]) { ctx.beginPath(); ctx.moveTo(x, 5); ctx.quadraticCurveTo(x + 2, 3, x, 1); ctx.stroke(); }
      break;
    }
    case 'candy_charm':
      ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(16, 6, 3, 0, 7); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(16, 26); ctx.lineTo(16, 13); ctx.quadraticCurveTo(16, 8.4, 20.4, 8.4); ctx.quadraticCurveTo(24, 8.4, 24, 12); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#ff8fb6'; ctx.setLineDash([3, 4.6]); ctx.beginPath(); ctx.moveTo(16, 26); ctx.lineTo(16, 13); ctx.quadraticCurveTo(16, 8.4, 20.4, 8.4); ctx.quadraticCurveTo(24, 8.4, 24, 12); ctx.stroke(); ctx.setLineDash([]);
      heart(ctx, 16, 24, 2.6, '#ff6f94');
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
