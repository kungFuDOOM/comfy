// Tansy Packlewick's portrait for the shop window, drawn in code (the 3D model lives in render/actors.ts).
import { circle, ellipse, heart, oc, oe, orr, star } from './draw';

const WOOL = '#f6ecfa', WOOL_D = '#e3d2f1', INK = '#4f2b40';

/** Foot-center based like the villager portraits: (cx, by) is where the neck meets the scarf. */
export function drawMerchant(g: CanvasRenderingContext2D, cx: number, by: number, s = 1, t = 0) {
  g.save();
  g.translate(cx, by);
  g.scale(s, s);
  const bob = Math.sin(t * 2.2) * 0.8;
  // backpack peeking over her shoulders: a striped roll with a little bell
  orr(g, -30, -8, 60, 22, 9, '#ffd0e0', 1, '#d98aa8');
  for (const x of [-18, -4, 10]) orr(g, x, -8, 7, 22, 3, '#fff3c4', 0, '#fff3c4');
  // neck + woolly chest
  oe(g, 0, -20 + bob, 14, 22, WOOL, 1.4, WOOL_D);
  // ears
  for (const sx of [-1, 1]) { oe(g, sx * 15, -64 + bob, 5.5, 13, WOOL, 1.4, WOOL_D, sx * 0.25); ellipse(g, sx * 15, -63 + bob, 2.6, 8, '#ffc0d8', sx * 0.25); }
  // head + topknot fluff
  oe(g, 0, -48 + bob, 21, 19, WOOL, 1.5, WOOL_D);
  oc(g, 0, -66 + bob, 11, '#ffffff', 1.2, WOOL_D); oc(g, -7, -62 + bob, 7, '#ffffff', 1, WOOL_D); oc(g, 7, -62 + bob, 7, '#ffffff', 1, WOOL_D);
  // face
  ellipse(g, 0, -39 + bob, 9, 6.5, '#fff7ee');
  circle(g, -8, -50 + bob, 3, INK); circle(g, 8, -50 + bob, 3, INK);
  circle(g, -7, -51 + bob, 1, '#fff'); circle(g, 9, -51 + bob, 1, '#fff');
  ellipse(g, 0, -42 + bob, 2.6, 1.8, '#c0577d');
  g.strokeStyle = '#c0577d'; g.lineWidth = 1.2; g.lineCap = 'round';
  g.beginPath(); g.arc(-2.2, -39.5 + bob, 2.4, 0.15, Math.PI - 0.5); g.stroke(); g.beginPath(); g.arc(2.2, -39.5 + bob, 2.4, 0.5, Math.PI - 0.15); g.stroke();
  for (const sx of [-1, 1]) ellipse(g, sx * 15, -42 + bob, 4.2, 2.8, 'rgba(255,143,182,0.55)');
  // striped scarf and a star charm
  orr(g, -17, -26 + bob, 34, 9, 4.5, '#ff9ec0', 1, '#d9709a');
  for (const x of [-11, -1, 9]) orr(g, x, -26 + bob, 5, 9, 2, '#fff3c4', 0, '#fff3c4');
  star(g, 11, -14 + bob, 5, '#ffd36e', 1);
  heart(g, -12, -12 + bob, 4, '#ff8fb6');
  g.restore();
}
