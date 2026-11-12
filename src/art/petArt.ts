// 2D pet portraits for the adoption card and pet panel (a quick, original kawaii sketch of the 3D pet).
import { coatById, petItemById, type PetKind } from '../petData';

const INK = '#4f2b40';

function ell(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke = '') {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  if (stroke) { g.lineWidth = 1.6; g.strokeStyle = stroke; g.stroke(); }
}

/** Draw into a 120 x 120 design box (scaled to the canvas). */
export function drawPetPortrait(canvas: HTMLCanvasElement, kind: PetKind, coatId: string, headId: string | null = null, bodyId: string | null = null) {
  const g = canvas.getContext('2d')!;
  const k = canvas.width / 120;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.clearRect(0, 0, 120, 120);
  const c = coatById(coatId), edge = 'rgba(110,51,80,0.28)';
  // ground shadow
  ell(g, 60, 108, 34, 6, 'rgba(110,51,80,0.14)');
  // tail
  if (kind === 'kitten') { g.lineWidth = 8; g.lineCap = 'round'; g.strokeStyle = c.body; g.beginPath(); g.moveTo(88, 98); g.quadraticCurveTo(112, 92, 104, 66); g.stroke(); }
  else ell(g, 94, 92, 7, 11, c.body, edge);
  // body + paws
  ell(g, 60, 90, 29, 20, c.body, edge);
  ell(g, 60, 96, 17, 12, c.accent);
  ell(g, 44, 106, 9, 5, c.accent, edge); ell(g, 76, 106, 9, 5, c.accent, edge);
  const sw = petItemById(bodyId);
  if (sw) {
    ell(g, 60, 90, 30, 21, sw.c1, edge);
    for (const y of [82, 92, 102]) { g.lineWidth = 3; g.strokeStyle = sw.c2; g.beginPath(); g.ellipse(60, 90, 29, 20, 0, 0, Math.PI * 2); g.save(); g.clip(); g.beginPath(); g.moveTo(25, y); g.lineTo(95, y); g.stroke(); g.restore(); }
    ell(g, 60, 72, 15, 5, sw.c2, edge);
  }
  // ears
  const ear = (sx: number) => {
    if (kind === 'kitten') {
      g.beginPath(); g.moveTo(60 + sx * 14, 36); g.lineTo(60 + sx * 30, 14); g.lineTo(60 + sx * 34, 44); g.closePath();
      g.fillStyle = c.body; g.fill(); g.strokeStyle = edge; g.lineWidth = 1.6; g.stroke();
      g.beginPath(); g.moveTo(60 + sx * 19, 37); g.lineTo(60 + sx * 29, 22); g.lineTo(60 + sx * 31, 40); g.closePath(); g.fillStyle = c.inner; g.fill();
    } else {
      ell(g, 60 + sx * 33, 48, 10, 19, c.inner === c.body ? c.accent : c.body, edge);
      g.fillStyle = 'rgba(80,40,60,0.12)'; g.beginPath(); g.ellipse(60 + sx * 33, 48, 10, 19, 0, 0, Math.PI * 2); g.fill();
    }
  };
  ear(-1); ear(1);
  // head
  ell(g, 60, 52, 32, 27, c.body, edge);
  ell(g, 60, 62, 15, 10, c.accent);
  if (c.spots) { ell(g, 40, 40, 2.4, 2, '#a8734f'); ell(g, 78, 38, 2, 1.8, '#a8734f'); }
  // face
  for (const sx of [-1, 1]) { ell(g, 60 + sx * 14, 52, 3.6, 5, INK); ell(g, 60 + sx * 14 + 1.2, 50, 1.3, 1.5, '#fff'); ell(g, 60 + sx * 22, 61, 5, 3.2, 'rgba(255,157,189,0.7)'); }
  ell(g, 60, 58, 3.4, 2.4, '#ff8fb6');
  g.strokeStyle = INK; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(60, 60.5); g.quadraticCurveTo(56, 66, 52, 63); g.moveTo(60, 60.5); g.quadraticCurveTo(64, 66, 68, 63); g.stroke();
  if (kind === 'kitten') { g.strokeStyle = 'rgba(79,43,64,0.35)'; g.lineWidth = 1; for (const sx of [-1, 1]) for (const dy of [-2, 2]) { g.beginPath(); g.moveTo(60 + sx * 24, 61 + dy); g.lineTo(60 + sx * 38, 59 + dy * 2); g.stroke(); } }
  else ell(g, 60, 69, 3.2, 3.6, '#ff9fb4');
  // head accessory
  const hd = petItemById(headId);
  if (hd?.shape === 'bow') {
    g.save(); g.translate(86, 30); g.rotate(0.35);
    for (const sx of [-1, 1]) { g.save(); g.rotate(sx * 0.4); ell(g, sx * 8, 0, 9, 6, hd.c1, edge); g.restore(); }
    ell(g, 0, 0, 3.6, 3.6, hd.c2, edge); g.restore();
  } else if (hd?.shape === 'beret') {
    g.save(); g.translate(64, 25); g.rotate(-0.2); ell(g, 0, 0, 24, 8, hd.c1, edge); ell(g, 0, -8, 3.6, 4, hd.c2); g.restore();
  } else if (hd?.shape === 'beanie') {
    g.beginPath(); g.ellipse(60, 30, 25, 19, 0, Math.PI, 0); g.closePath(); g.fillStyle = hd.c1; g.fill(); g.strokeStyle = edge; g.stroke();
    ell(g, 60, 30, 26, 5, hd.c2, edge); ell(g, 60, 10, 6, 6, hd.c2, edge);
  }
}

/** A ready-to-place canvas element. */
export function petPortrait(kind: PetKind, coatId: string, headId: string | null = null, bodyId: string | null = null, px = 120): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * dpr);
  c.style.width = c.style.height = px + 'px';
  c.className = 'pet-portrait';
  drawPetPortrait(c, kind, coatId, headId, bodyId);
  return c;
}
