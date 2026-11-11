// Player and villager art: chunky kawaii sprites drawn in code. (x, y) is the foot-center.
import type { OutfitDef, VillagerDef } from '../data';
import { cheetahPattern } from './cheetah';
import { INK, blush, circle, ellipse, eye, fs, heart, ink, oc, oe, orr, rr, shadow, shade, star } from './draw';

export type Facing = 'up' | 'down' | 'left' | 'right';

const SKIN = '#ffe4d4';
const HAIR = '#8b5443';
const LW = 1.05; // outline weight in world px

interface Pose { side: number; back: boolean; step: number; bob: number; sq: number; blink: boolean }

function pose(t: number, facing: Facing, moving: boolean, seed: number, speed = 10): Pose {
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const w = t * speed;
  return {
    side,
    back: facing === 'up',
    step: moving ? Math.sin(w) : 0,
    bob: moving ? -Math.abs(Math.sin(w)) * 2.2 : Math.sin(t * 2.2 + seed) * 0.45,
    sq: moving ? 1 + Math.cos(w * 2) * 0.035 : 1 + Math.sin(t * 2.2 + seed) * 0.018,
    blink: ((t + seed * 1.7) % 4.2) < 0.13,
  };
}

/** Squash & stretch around the feet. */
function applyBody(ctx: CanvasRenderingContext2D, p: Pose) {
  ctx.translate(0, p.bob);
  ctx.scale(2 - p.sq, p.sq);
}

function mouth(ctx: CanvasRenderingContext2D, x: number, y: number, kind: 'smile' | 'w' | 'o' | 'flat' = 'smile', s = 1) {
  ctx.beginPath();
  if (kind === 'w') {
    ctx.moveTo(x - 1.8 * s, y - 0.3 * s);
    ctx.quadraticCurveTo(x - 0.9 * s, y + 1.1 * s, x, y);
    ctx.quadraticCurveTo(x + 0.9 * s, y + 1.1 * s, x + 1.8 * s, y - 0.3 * s);
  } else if (kind === 'o') {
    ctx.ellipse(x, y + 0.3, 0.9 * s, 1.1 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7f9f'; ctx.fill();
  } else if (kind === 'flat') {
    ctx.moveTo(x - 1.2 * s, y + 0.2); ctx.quadraticCurveTo(x, y + 0.7, x + 1.2 * s, y + 0.2);
  } else {
    ctx.arc(x, y - 0.6 * s, 1.5 * s, 0.25, Math.PI - 0.25);
  }
  ink(ctx, 0.85);
}

function feet(ctx: CanvasRenderingContext2D, p: Pose, col: string, spread = 3.6, r = 3) {
  const a = p.step * 2.2;
  oe(ctx, -spread + (p.side ? a * 0.4 : 0), -1.8 - Math.max(0, a) * 0.7, r, r * 0.78, col, LW);
  oe(ctx, spread - (p.side ? a * 0.4 : 0), -1.8 - Math.max(0, -a) * 0.7, r, r * 0.78, col, LW);
}

// ======================= PLAYER =======================
export function drawPlayer(
  ctx: CanvasRenderingContext2D, x: number, y: number, outfit: OutfitDef,
  facing: Facing, moving: boolean, t: number, scale = 1,
) {
  const p = pose(t, facing, moving, 0.3, 11);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  shadow(ctx, 0, 0, 10, 3.4, 0.24);
  feet(ctx, p, outfit.id === 'strawberry' ? '#ff7aa2' : outfit.pattern ? '#8a5443' : '#ff9ec0', 3.4, 2.9);
  applyBody(ctx, p);
  const hx = p.side * 0.8, hy = -27.5; // head center
  const fx = p.side * 3.4;

  // hair buns + back hair (behind body)
  oc(ctx, -9.2 + hx, hy - 8.6, 4.6, HAIR, LW);
  oc(ctx, 9.2 + hx, hy - 8.6, 4.6, HAIR, LW);
  circle(ctx, -10.2 + hx, hy - 9.8, 1.3, shade(HAIR, 0.3));
  circle(ctx, 8.2 + hx, hy - 9.8, 1.3, shade(HAIR, 0.3));
  ctx.beginPath(); ctx.ellipse(hx, hy + 2.5, 11.2, 9.5, 0, 0, Math.PI * 2); fs(ctx, HAIR, LW);

  // arms (behind dress edge, swing with steps)
  const sw = p.step * 2.4;
  oe(ctx, -8.3, -12.3 + sw * (p.side ? 0.3 : 0.5), 2.6, 3.3, outfit.pattern ? '#ffe4d4' : SKIN, LW, INK, 0.35);
  oe(ctx, 8.3, -12.3 - sw * (p.side ? 0.3 : 0.5), 2.6, 3.3, SKIN, LW, INK, -0.35);

  drawOutfitBody(ctx, outfit, p);

  // head
  if (p.back) {
    oc(ctx, hx, hy, 11.6, HAIR, LW);
    ctx.beginPath(); ctx.moveTo(hx - 4, hy - 6); ctx.quadraticCurveTo(hx, hy - 1, hx + 3, hy + 6); ink(ctx, 0.7, shade(HAIR, -0.25));
  } else {
    oc(ctx, hx, hy, 11.6, SKIN, LW);
    // little ears
    if (p.side === 0) { oc(ctx, hx - 11.2, hy + 1.6, 2.2, SKIN, LW); oc(ctx, hx + 11.2, hy + 1.6, 2.2, SKIN, LW); }
    else oc(ctx, hx - p.side * 9.5, hy + 1.8, 2.3, SKIN, LW);
    // bangs with scallops
    ctx.beginPath();
    ctx.arc(hx, hy + 0.2, 12, Math.PI * 1.02, Math.PI * 1.98);
    const b0 = hy - 2.6, bx = hx + p.side * 2;
    ctx.quadraticCurveTo(hx + 11, b0 + 1, bx + 8, b0 + 1.2);
    ctx.quadraticCurveTo(bx + 6, b0 - 3.2, bx + 3.2, b0 + 0.6);
    ctx.quadraticCurveTo(bx + 1, b0 - 3.4, bx - 2, b0 + 0.4);
    ctx.quadraticCurveTo(bx - 4.5, b0 - 3, bx - 7.4, b0 + 1);
    ctx.quadraticCurveTo(hx - 11, b0 + 1, hx - 12, hy + 0.2);
    fs(ctx, HAIR, LW);
    // side locks
    if (p.side <= 0) { ctx.beginPath(); ctx.ellipse(hx - 10.6, hy + 4, 2.4, 5, 0.15, 0, Math.PI * 2); fs(ctx, HAIR, LW); }
    if (p.side >= 0) { ctx.beginPath(); ctx.ellipse(hx + 10.6, hy + 4, 2.4, 5, -0.15, 0, Math.PI * 2); fs(ctx, HAIR, LW); }
    // hair shine
    ctx.beginPath(); ctx.arc(hx - 2, hy - 4, 8.2, Math.PI * 1.2, Math.PI * 1.45); ink(ctx, 1.3, 'rgba(255,255,255,0.45)');
    // face
    const ey = hy + 2.4;
    if (p.side === 0) {
      eye(ctx, hx - 4.4, ey, 2.15, 2.8, p.blink);
      eye(ctx, hx + 4.4, ey, 2.15, 2.8, p.blink);
      blush(ctx, hx - 7.2, ey + 3.6);
      blush(ctx, hx + 7.2, ey + 3.6);
    } else {
      eye(ctx, hx + fx - 2.6, ey, 2.0, 2.8, p.blink);
      eye(ctx, hx + fx + 3.6, ey, 1.6, 2.6, p.blink);
      blush(ctx, hx + fx + p.side * 6.4, ey + 3.6, 1.9, 1.2);
      blush(ctx, hx + fx - p.side * 5.2, ey + 3.6, 1.5, 1.1);
    }
    mouth(ctx, hx + fx * 0.6 + 0.4 * p.side, ey + 4.6, 'w', 0.85);
  }
  // little ahoge curl
  ctx.beginPath(); ctx.moveTo(hx + 0.5, hy - 11.4); ctx.quadraticCurveTo(hx + 3.5, hy - 17, hx + 0.5, hy - 16.4); ink(ctx, 1.1, INK);
  ctx.beginPath(); ctx.moveTo(hx + 0.5, hy - 11.4); ctx.quadraticCurveTo(hx + 3.5, hy - 17, hx + 0.5, hy - 16.4); ink(ctx, 0.5, HAIR);

  drawHat(ctx, outfit, hx, hy, p);
  ctx.restore();
}

function dressPath(ctx: CanvasRenderingContext2D, top: number, bot: number, wt: number, wb: number) {
  ctx.beginPath();
  ctx.moveTo(-wt, top + 1.5);
  ctx.quadraticCurveTo(-wt, top, -wt + 2, top);
  ctx.lineTo(wt - 2, top);
  ctx.quadraticCurveTo(wt, top, wt, top + 1.5);
  ctx.quadraticCurveTo(wb + 0.4, bot - 3, wb, bot - 1.6);
  ctx.quadraticCurveTo(wb - 0.5, bot, wb - 2.5, bot);
  ctx.lineTo(-wb + 2.5, bot);
  ctx.quadraticCurveTo(-wb + 0.5, bot, -wb, bot - 1.6);
  ctx.quadraticCurveTo(-wb - 0.4, bot - 3, -wt, top + 1.5);
  ctx.closePath();
}

function drawOutfitBody(ctx: CanvasRenderingContext2D, o: OutfitDef, p: Pose) {
  const top = -18.5, bot = -3.4;
  const fill = o.pattern ? cheetahPattern(ctx, o.pattern, 0.34) : o.body;
  switch (o.id) {
    case 'strawberry': {
      // cream tee under pink overalls
      dressPath(ctx, top, bot, 6.6, 8); fs(ctx, '#fff6ef', LW);
      ctx.beginPath(); rr(ctx, -5.6, top + 4.4, 11.2, bot - top - 4.4, 3); fs(ctx, o.body, LW);
      // straps + buttons
      ctx.fillStyle = o.body; ctx.fillRect(-5, top + 0.5, 2, 4.5); ctx.fillRect(3, top + 0.5, 2, 4.5);
      circle(ctx, -4, top + 5.4, 0.9, '#fff'); circle(ctx, 4, top + 5.4, 0.9, '#fff');
      // strawberry seeds + pocket heart
      for (const [sx, sy] of [[-3, -8], [2.6, -7], [-0.4, -5.2], [3.4, -10.6], [-3.6, -11.6]]) ellipse(ctx, sx, sy, 0.45, 0.7, '#fff3a8');
      heart(ctx, 0, -10, 1.8, '#ff6f9c');
      break;
    }
    case 'peony': {
      dressPath(ctx, top, bot, 6.6, 9.4); fs(ctx, fill, LW);
      // white peter-pan collar + buttons + ruffle hem
      oe(ctx, -2.6, top + 0.9, 3, 1.8, '#fff', 0.8); oe(ctx, 2.6, top + 0.9, 3, 1.8, '#fff', 0.8);
      circle(ctx, 0, -12.5, 0.8, '#fff'); circle(ctx, 0, -9.5, 0.8, '#fff');
      for (let i = -4; i <= 4; i++) circle(ctx, i * 2, bot - 0.6, 1.2, '#ffd3e3');
      break;
    }
    case 'spotted_sun': {
      dressPath(ctx, top, bot, 6.4, 9.6); fs(ctx, o.body, LW);
      ctx.save(); dressPath(ctx, top, bot, 6.4, 9.6); ctx.clip();
      ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.3); ctx.fillRect(-11, bot - 4.2, 22, 4.2);
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(-9.2, bot - 4.2); ctx.lineTo(9.2, bot - 4.2); ink(ctx, 0.7);
      dressPath(ctx, top, bot, 6.4, 9.6); ink(ctx, LW);
      // little bow at waist
      oe(ctx, -1.8, -12, 1.8, 1.3, '#ff9ec0', 0.7); oe(ctx, 1.8, -12, 1.8, 1.3, '#ff9ec0', 0.7); circle(ctx, 0, -12, 0.8, '#ff6f9c');
      break;
    }
    case 'cheetah_coat': {
      dressPath(ctx, top, bot, 7.2, 8.6); fs(ctx, fill, LW);
      // pink fluffy collar, belt, buttons
      oe(ctx, -3, top + 1, 3.6, 2.1, o.trim, 0.8); oe(ctx, 3, top + 1, 3.6, 2.1, o.trim, 0.8);
      ctx.beginPath(); rr(ctx, -7.6, -10.6, 15.2, 2.4, 1.2); fs(ctx, o.trim, 0.8);
      circle(ctx, 0, -9.4, 1, '#ffd36e');
      break;
    }
    case 'rose_cheetah': {
      dressPath(ctx, top, bot, 6.2, 10); fs(ctx, fill, LW);
      // white sash with a big bow
      ctx.fillStyle = '#fff'; ctx.fillRect(-7, -12.2, 14, 2);
      ctx.beginPath(); ctx.moveTo(-7.3, -12.2); ctx.lineTo(7.3, -12.2); ctx.moveTo(-7.6, -10.2); ctx.lineTo(7.6, -10.2); ink(ctx, 0.6);
      oe(ctx, -2.4, -11.2, 2.4, 1.7, '#fff', 0.8); oe(ctx, 2.4, -11.2, 2.4, 1.7, '#fff', 0.8); oc(ctx, 0, -11.2, 1, '#ff9ec0', 0.7);
      break;
    }
    default: { // cozy knit
      dressPath(ctx, top, bot, 7, 8.4); fs(ctx, fill, LW);
      ctx.strokeStyle = shade(o.body, -0.08); ctx.lineWidth = 0.7;
      for (const k of [-4.5, -1.5, 1.5, 4.5]) { ctx.beginPath(); ctx.moveTo(k * 0.95, top + 3); ctx.lineTo(k * 1.12, bot - 1.5); ctx.stroke(); }
      ctx.beginPath(); rr(ctx, -7.8, bot - 2.6, 15.6, 2.6, 1.3); fs(ctx, o.trim, 0.8);
      ctx.beginPath(); rr(ctx, -4.4, top - 0.6, 8.8, 2.6, 1.3); fs(ctx, o.trim, 0.8);
      heart(ctx, 0, -11, 1.6, '#ff8fb6');
    }
  }
  if (p.back) {
    // hint of a bow on the back for dresses
    if (o.hat === 'bow') { oe(ctx, -2.2, -11, 2.2, 1.5, '#fff', 0.7); oe(ctx, 2.2, -11, 2.2, 1.5, '#fff', 0.7); }
  }
}

function bow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(d * 3, -5, d * 8, -4.5, d * 7.5, 0);
    ctx.bezierCurveTo(d * 8, 4.5, d * 3, 5, 0, 0);
    fs(ctx, col, LW / s);
    ctx.beginPath(); ctx.moveTo(d * 2, -0.6); ctx.quadraticCurveTo(d * 4.5, -1.6, d * 6, -0.4); ink(ctx, 0.5 / s, shade(col, -0.25));
  }
  oe(ctx, 0, 0, 1.8, 2.1, shade(col, -0.12), LW / s);
  ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, o: OutfitDef, hx: number, hy: number, p: Pose) {
  switch (o.hat) {
    case 'bow':
      bow(ctx, hx + (p.back ? 0 : 5.5), hy - 11, 0.95, '#ff8fb6', 0.18);
      break;
    case 'beret':
      oe(ctx, hx - 1.4, hy - 9.6, 10.6, 4.6, '#ff8fb6', LW, INK, -0.12);
      oc(ctx, hx - 1, hy - 14.4, 1.5, '#ff6f9c', 0.8);
      ellipse(ctx, hx - 5, hy - 11, 3, 1.2, 'rgba(255,255,255,0.45)', -0.12);
      break;
    case 'sunhat': {
      oe(ctx, hx, hy - 7.6, 16, 4.8, '#ffe7b3', LW);
      ctx.beginPath(); ctx.ellipse(hx, hy - 10.5, 8.4, 6.5, 0, Math.PI, 0); ctx.lineTo(hx + 8.4, hy - 8.4); ctx.quadraticCurveTo(hx, hy - 6.5, hx - 8.4, hy - 8.4); ctx.closePath(); fs(ctx, '#ffe7b3', LW);
      ctx.save(); ctx.beginPath(); ctx.rect(hx - 9, hy - 11.6, 18, 3.4); ctx.clip();
      ctx.beginPath(); ctx.ellipse(hx, hy - 10.5, 8.4, 6.5, 0, Math.PI, 0); ctx.lineTo(hx + 8.4, hy - 8.4); ctx.lineTo(hx - 8.4, hy - 8.4); ctx.closePath();
      ctx.fillStyle = cheetahPattern(ctx, 'classic', 0.22); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(hx - 8.4, hy - 11.6); ctx.lineTo(hx + 8.4, hy - 11.6); ctx.moveTo(hx - 8.4, hy - 8.4); ctx.lineTo(hx + 8.4, hy - 8.4); ink(ctx, 0.6);
      if (!p.back) { oc(ctx, hx + 6.5, hy - 10.5, 1.8, '#ff9ec0', 0.7); circle(ctx, hx + 6.5, hy - 10.5, 0.7, '#fff3a8'); }
      break;
    }
    default:
      if (!p.back) { star(ctx, hx + 7.5, hy - 7.5, 2.6, '#ffd36e', 0.7); }
  }
}

// ======================= VILLAGERS =======================
export function drawVillager(
  ctx: CanvasRenderingContext2D, def: VillagerDef, x: number, y: number,
  t: number, facing: Facing, moving: boolean, scale = 1, bubble = false,
) {
  const p = pose(t, facing, moving, def.name.length * 0.37, 9);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  shadow(ctx, 0, 0, 11, 3.6, 0.24);
  switch (def.species) {
    case 'dormouse': dormouse(ctx, def, p, t); break;
    case 'cheetah': cheetah(ctx, def, p, t); break;
    case 'hedgehog': hedgehog(ctx, def, p, t); break;
    case 'owl': owl(ctx, def, p, t); break;
  }
  ctx.restore();
  if (bubble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const by = -50 + Math.sin(t * 3.2) * 1.4;
    ctx.beginPath();
    rr(ctx, -7.5, by - 7.5, 15, 12.5, 6);
    ctx.moveTo(-2, by + 4.6); ctx.lineTo(0, by + 8); ctx.lineTo(2.4, by + 4.6);
    fs(ctx, '#ffffff', 1);
    heart(ctx, 0, by - 1.6, 3, '#ff6f9c');
    circle(ctx, -1.2, by - 3, 0.7, '#fff');
    ctx.restore();
  }
}

/** Generic chubby body + belly. */
function body(ctx: CanvasRenderingContext2D, col: string, belly: string | null, w = 8.6, h = 8.4, cy = -10.6) {
  oe(ctx, 0, cy, w, h, col, LW);
  if (belly) ellipse(ctx, 0, cy + 1.6, w * 0.6, h * 0.62, belly);
}

function arms(ctx: CanvasRenderingContext2D, col: string, p: Pose, y = -12) {
  const sw = p.step * 2;
  oe(ctx, -8.6, y + sw * 0.5, 2.4, 3.2, col, LW, INK, 0.4);
  oe(ctx, 8.6, y - sw * 0.5, 2.4, 3.2, col, LW, INK, -0.4);
}

function faceEyes(ctx: CanvasRenderingContext2D, p: Pose, hx: number, ey: number, gap: number, rx = 2.1, ry = 2.7) {
  const fx = p.side * 3.2;
  if (p.side === 0) {
    eye(ctx, hx - gap, ey, rx, ry, p.blink);
    eye(ctx, hx + gap, ey, rx, ry, p.blink);
    blush(ctx, hx - gap - 3, ey + 3.4);
    blush(ctx, hx + gap + 3, ey + 3.4);
  } else {
    eye(ctx, hx + fx - gap * 0.6, ey, rx * 0.95, ry, p.blink);
    eye(ctx, hx + fx + gap * 0.9, ey, rx * 0.8, ry * 0.92, p.blink);
    blush(ctx, hx + fx + p.side * (gap + 2.4), ey + 3.4, 1.9, 1.2);
  }
  return hx + fx * 0.7;
}

// --- Mimsy: fluff-eared dormouse ---
function dormouse(ctx: CanvasRenderingContext2D, def: VillagerDef, p: Pose, t: number) {
  const c = def.color, a = def.accent, belly = '#fff5f8';
  feet(ctx, p, shade(c, -0.08), 3.4, 2.7);
  applyBody(ctx, p);
  // curly fluffy tail
  const tw = Math.sin(t * 2.4) * 1.2;
  const tx = p.side ? -p.side * 9 : 9;
  ctx.beginPath(); ctx.moveTo(tx * 0.6, -7); ctx.quadraticCurveTo(tx * 1.5, -6 + tw, tx * 1.3, -15 + tw); ink(ctx, 4.6, INK); ink(ctx, 2.8, c);
  oc(ctx, tx * 1.3, -16 + tw, 3.6, shade(c, 0.25), LW);
  body(ctx, c, belly);
  arms(ctx, c, p);
  // apron with heart pocket
  if (!p.back) {
    ctx.beginPath(); rr(ctx, -5.6, -14.2, 11.2, 10.6, 3.6); fs(ctx, '#ffffff', 0.85);
    heart(ctx, 0, -8.8, 2, a);
    ctx.beginPath(); ctx.moveTo(-4.6, -14); ctx.lineTo(-6, -17.4); ctx.moveTo(4.6, -14); ctx.lineTo(6, -17.4); ink(ctx, 0.8);
  } else {
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(6, -9); ink(ctx, 1.6, '#ffffff');
    oe(ctx, 0, -9, 2.2, 1.6, '#fff', 0.7);
  }
  const hx = p.side * 0.8, hy = -25.5;
  // giant round ears
  for (const d of [-1, 1]) {
    if (p.side === -d && !p.back) continue; // far ear tucked
    oc(ctx, hx + d * 9.6, hy - 9, 6.8, c, LW);
    circle(ctx, hx + d * 9.6, hy - 8.6, 4.4, a);
    circle(ctx, hx + d * 8.4, hy - 10.6, 1.3, 'rgba(255,255,255,0.7)');
  }
  if (p.side && !p.back) { oc(ctx, hx - p.side * 6.5, hy - 10.5, 5.6, c, LW); circle(ctx, hx - p.side * 6.5, hy - 10.2, 3.4, a); }
  oe(ctx, hx, hy, 11.6, 10.6, c, LW);
  // fluffy cheek tufts
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + d * 10.6, hy + 3, 2.4, 0, Math.PI * 2); fs(ctx, c, 0); }
  if (p.back) return;
  // forehead tuft
  ctx.beginPath(); ctx.moveTo(hx - 3, hy - 9.6); ctx.quadraticCurveTo(hx - 1, hy - 13.6, hx + 0.4, hy - 10); ctx.quadraticCurveTo(hx + 2, hy - 13, hx + 3.4, hy - 9.6); fs(ctx, c, LW);
  const ey = hy + 1.4;
  const mx = faceEyes(ctx, p, hx, ey, 4.4, 2.1, 2.6);
  // sleepy lids
  if (!p.blink) {
    const fx = p.side * 3.2;
    const lids = p.side === 0 ? [hx - 4.4, hx + 4.4] : [hx + fx - 2.6, hx + fx + 4];
    for (const lx of lids) {
      ctx.beginPath(); ctx.ellipse(lx, ey - 1.6, 2.6, 1.6, 0, Math.PI, 0); ctx.fillStyle = c; ctx.fill();
      ctx.beginPath(); ctx.moveTo(lx - 2.4, ey - 1.5); ctx.lineTo(lx + 2.4, ey - 1.5); ink(ctx, 0.75);
    }
  }
  // muzzle + nose + whiskers
  ellipse(ctx, mx, ey + 4.4, 3.4, 2.4, belly);
  oe(ctx, mx, ey + 3.4, 1.3, 0.95, '#ff7fa0', 0.6);
  mouth(ctx, mx, ey + 5, 'w', 0.7);
  ctx.beginPath();
  for (const d of [-1, 1]) { ctx.moveTo(mx + d * 3.4, ey + 4); ctx.lineTo(mx + d * 7, ey + 3.2); ctx.moveTo(mx + d * 3.4, ey + 5); ctx.lineTo(mx + d * 7, ey + 5.4); }
  ink(ctx, 0.5, INK);
  // tiny sleeping cap tilted on one ear
  ctx.beginPath(); ctx.moveTo(hx - 6.5, hy - 8.4); ctx.quadraticCurveTo(hx - 2, hy - 18, hx + 3, hy - 15.5); ctx.quadraticCurveTo(hx + 1, hy - 10, hx + 2.6, hy - 8.8); ctx.quadraticCurveTo(hx - 2, hy - 7.2, hx - 6.5, hy - 8.4); fs(ctx, '#b9e6ff', LW);
  oc(ctx, hx + 3.6, hy - 15.6, 1.8, '#ffffff', 0.8);
  star(ctx, hx - 2, hy - 11.6, 1.3, '#ffd36e');
}

// --- Zuzu: spotted cheetah cub ---
function cheetah(ctx: CanvasRenderingContext2D, def: VillagerDef, p: Pose, t: number) {
  const c = def.color, a = def.accent, belly = '#fff6e6';
  feet(ctx, p, c, 3.4, 2.8);
  applyBody(ctx, p);
  // long curvy tail with rings
  const sway = Math.sin(t * 2.6) * 2.4;
  const dir = p.side ? -p.side : 1;
  ctx.beginPath(); ctx.moveTo(dir * 5, -6); ctx.bezierCurveTo(dir * 14, -6, dir * 14, -16 + sway, dir * 10 + sway * 0.4, -22);
  ink(ctx, 5, INK); ink(ctx, 3.1, c);
  const bz = (k: number, p0: number, p1: number, p2: number, p3: number) => {
    const m = 1 - k; return m * m * m * p0 + 3 * m * m * k * p1 + 3 * m * k * k * p2 + k * k * k * p3;
  };
  for (const k of [0.4, 0.62, 0.82]) {
    ctx.beginPath(); ctx.ellipse(bz(k, dir * 5, dir * 14, dir * 14, dir * 10 + sway * 0.4), bz(k, -6, -6, -16 + sway, -22), 1.7, 0.9, 0.4 * dir, 0, Math.PI * 2);
    ctx.fillStyle = a; ctx.fill();
  }
  oc(ctx, dir * 10 + sway * 0.4, -22, 1.9, a, 0.8);
  body(ctx, c, belly);
  for (const [sx, sy] of [[-5, -14], [5.5, -12.5], [-6, -8], [6, -7], [3.6, -16]]) circle(ctx, sx, sy, 0.95, a);
  arms(ctx, c, p);
  // pink neck bow
  if (!p.back) bow(ctx, 0, -18, 0.62, '#ff8fb6');
  const hx = p.side * 0.8, hy = -26;
  // ears with dark backs
  for (const d of [-1, 1]) {
    if (p.side === -d && !p.back) continue;
    oc(ctx, hx + d * 8.2, hy - 9, 4.4, c, LW);
    circle(ctx, hx + d * 8.2, hy - 8.6, 2.4, p.back ? a : '#ffc8d8');
  }
  oe(ctx, hx, hy, 11.8, 10.6, c, LW);
  for (const [sx, sy] of [[-6, -6], [-2.6, -8.4], [2.4, -8.8], [6.4, -6.4], [-9, -1], [9, -0.6], [0, -5.6]]) circle(ctx, hx + sx + p.side * 1.4, hy + sy, 0.95, a);
  // heart sunglasses perched on head
  for (const d of [-1, 1]) heart(ctx, hx + d * 3.4, hy - 8.2, 2.6, '#ff6f9c', 0.8);
  ctx.beginPath(); ctx.moveTo(hx - 1, hy - 8.6); ctx.lineTo(hx + 1, hy - 8.6); ink(ctx, 0.9);
  if (p.back) return;
  const ey = hy + 1.8;
  const mx = faceEyes(ctx, p, hx, ey, 4.5, 2.1, 2.8);
  // signature tear lines
  ctx.beginPath();
  const fx = p.side * 3.2;
  for (const d of p.side === 0 ? [-1, 1] : [p.side]) { ctx.moveTo(hx + fx + d * 2.6 - (p.side ? 2 : 0), ey + 2.4); ctx.quadraticCurveTo(hx + fx + d * 3.6, ey + 4.4, hx + fx + d * 2.8, ey + 6.4); }
  ink(ctx, 0.9, a);
  ellipse(ctx, mx, ey + 5, 3.6, 2.6, belly);
  ctx.beginPath(); ctx.moveTo(mx - 1.4, ey + 3.4); ctx.lineTo(mx + 1.4, ey + 3.4); ctx.lineTo(mx, ey + 4.8); ctx.closePath(); fs(ctx, '#7a4a3a', 0.5);
  mouth(ctx, mx, ey + 5.6, 'w', 0.75);
}

// --- Bramble: marshmallow hedgehog gardener ---
function hedgehog(ctx: CanvasRenderingContext2D, def: VillagerDef, p: Pose, _t: number) {
  const c = def.color, a = def.accent;
  feet(ctx, p, '#ffd9e4', 3.4, 2.7);
  applyBody(ctx, p);
  const hx = p.side * 0.8, hy = -24.5;
  // soft spike cloud behind everything
  const spikes = (cx: number, cy: number, rx: number, ry: number, n: number, from: number, to: number) => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const ang = from + ((to - from) * i) / n;
      const r1 = 1, r2 = 1.32;
      const x1 = cx + Math.cos(ang) * rx * r1, y1 = cy + Math.sin(ang) * ry * r1;
      const am = ang + (to - from) / n / 2;
      const x2 = cx + Math.cos(am) * rx * r2, y2 = cy + Math.sin(am) * ry * r2;
      if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
      if (i < n) ctx.lineTo(x2, y2);
    }
    ctx.lineTo(cx, cy);
    ctx.closePath();
  };
  spikes(hx, hy + 4, 12.6, 14, p.back ? 16 : 11, Math.PI * (p.back ? 0.95 : 0.98), Math.PI * (p.back ? 2.05 : 2.02));
  fs(ctx, a, LW);
  ctx.save(); ctx.globalAlpha = 0.5;
  spikes(hx, hy + 4, 9, 10, 9, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = shade(a, 0.4); ctx.fill();
  ctx.restore();
  if (p.back) { body(ctx, a, null, 9, 8.6); arms(ctx, c, p); oe(ctx, hx, hy + 1, 11, 9.5, a, LW); oe(ctx, hx, hy - 9, 10.6, 3.2, '#f6d58e', LW); return; }
  // body with mint gardener apron
  body(ctx, c, null);
  arms(ctx, c, p);
  ctx.beginPath(); rr(ctx, -6, -15, 12, 12, 4); fs(ctx, '#9fe3c6', 0.85);
  ctx.beginPath(); rr(ctx, -3, -10, 6, 4, 1.5); fs(ctx, '#c4f1dc', 0.6);
  // little trowel peeking out of the pocket
  ctx.beginPath(); ctx.moveTo(1.6, -10); ctx.lineTo(3.4, -14.6); ink(ctx, 1, '#c98f6b');
  // head
  oe(ctx, hx, hy, 11, 10, c, LW);
  for (const d of [-1, 1]) { if (p.side === -d) continue; oc(ctx, hx + d * 8.6, hy - 6.6, 2.8, c, LW); circle(ctx, hx + d * 8.6, hy - 6.4, 1.5, '#ffc8d8'); }
  const ey = hy + 1.8;
  const mx = faceEyes(ctx, p, hx, ey, 4.2, 1.9, 2.5);
  // grumpy-sweet brows
  const fx = p.side * 3.2;
  ctx.beginPath();
  const bxs = p.side === 0 ? [[hx - 4.2, -1], [hx + 4.2, 1]] : [[hx + fx - 2.5, -1], [hx + fx + 3.8, 1]];
  for (const [bx, d] of bxs) { ctx.moveTo(bx - 1.8, ey - 4.2 - d * 0.1 + (d < 0 ? -0.6 : 0.6)); ctx.lineTo(bx + 1.8, ey - 4.2 + (d < 0 ? 0.6 : -0.6)); }
  ink(ctx, 0.8);
  oe(ctx, mx, ey + 3.6, 1.6, 1.15, '#4a2a3a', 0.4);
  circle(ctx, mx - 0.5, ey + 3.2, 0.4, '#fff');
  mouth(ctx, mx, ey + 5.4, 'flat', 0.9);
  // straw hat with a pink flower
  oe(ctx, hx, hy - 8.4, 13, 3.6, '#f6d58e', LW);
  ctx.beginPath(); ctx.ellipse(hx, hy - 10, 7, 5, 0, Math.PI, 0); ctx.quadraticCurveTo(hx, hy - 8.4, hx - 7, hy - 10); fs(ctx, '#f6d58e', LW);
  ctx.fillStyle = '#ff9ec0'; ctx.fillRect(hx - 6.8, hy - 11.4, 13.6, 1.6);
  for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2; circle(ctx, hx + 5 + Math.cos(an) * 1.5, hy - 12 + Math.sin(an) * 1.5, 1.2, '#fff'); }
  circle(ctx, hx + 5, hy - 12, 0.9, '#ffd36e');
}

// --- Nimbus: moon owl lantern keeper ---
function owl(ctx: CanvasRenderingContext2D, def: VillagerDef, p: Pose, t: number) {
  const c = def.color, a = def.accent;
  // tiny orange feet
  const st = p.step * 1.8;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 3.4, -1.4 - (d * st > 0 ? d * st * 0.6 : 0), 2.6, 1.6, 0, 0, Math.PI * 2); fs(ctx, '#ffb562', LW); }
  applyBody(ctx, p);
  const flap = p.step ? Math.sin(t * 18) * 0.25 : Math.sin(t * 1.6) * 0.06;
  // wings
  for (const d of [-1, 1]) {
    ctx.save(); ctx.translate(d * 10, -15); ctx.rotate(d * (0.15 + flap));
    ctx.beginPath(); ctx.ellipse(0, 3, 3.6, 7.6, 0, 0, Math.PI * 2); fs(ctx, shade(c, -0.12), LW);
    ctx.beginPath(); ctx.moveTo(-1.5, 5); ctx.quadraticCurveTo(0, 7.5, 1.5, 5); ink(ctx, 0.6, INK_W);
    ctx.restore();
  }
  // egg body + head as one round shape
  oe(ctx, 0, -17.5, 12.6, 16.2, c, LW);
  // ear tufts
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(d * 4, -31); ctx.quadraticCurveTo(d * 9, -38.5, d * 11.2, -36); ctx.quadraticCurveTo(d * 10.4, -30, d * 8.6, -27.6); ctx.closePath(); fs(ctx, c, LW);
  }
  oe(ctx, 0, -17.5, 12.6, 16.2, c, 0);
  if (p.back) {
    for (let r = 0; r < 3; r++) for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 3.6 + (r % 2) * 1.8, -14 + r * 3.6, 1.8, 0, Math.PI); ink(ctx, 0.6, shade(c, -0.2)); }
    oe(ctx, 0, -17.5, 12.6, 16.2, 'rgba(0,0,0,0)', LW);
    return;
  }
  // belly with feather scallops + crescent moon pendant
  oe(ctx, 0, -9.6, 8, 7.6, '#f6f1ff', 0);
  for (let r = 0; r < 2; r++) for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 3.6 + (r % 2) * 1.8 - (r % 2 ? 1.8 : 0), -10 + r * 3.4, 1.6, 0.1, Math.PI - 0.1); ink(ctx, 0.6, '#c9b8ee'); }
  ctx.beginPath(); ctx.arc(0, -17.6, 2.6, Math.PI * 0.25, Math.PI * 1.75); ctx.arc(1.4, -17.6, 2.1, Math.PI * 1.6, Math.PI * 0.4, true); ctx.closePath(); fs(ctx, a, 0.7);
  ctx.beginPath(); ctx.moveTo(-5, -21.6); ctx.quadraticCurveTo(0, -18.6, 5, -21.6); ink(ctx, 0.6, '#c9a64a');
  // face discs + huge eyes
  const fx = p.side * 3;
  for (const d of [-1, 1]) oe(ctx, fx + d * 4.8, -27, 5, 4.8, '#fbf7ff', 0.8);
  if (p.side === 0) {
    eye(ctx, -4.8, -27, 2.7, 3.1, p.blink);
    eye(ctx, 4.8, -27, 2.7, 3.1, p.blink);
    blush(ctx, -8.6, -22.6, 2, 1.2); blush(ctx, 8.6, -22.6, 2, 1.2);
  } else {
    eye(ctx, fx - 4.2, -27, 2.5, 3.1, p.blink);
    eye(ctx, fx + 5, -27, 2.3, 3, p.blink);
    blush(ctx, fx + p.side * 9, -22.6, 1.8, 1.1);
  }
  ctx.beginPath(); ctx.moveTo(fx - 1.6, -23.6); ctx.lineTo(fx + 1.6, -23.6); ctx.lineTo(fx, -21.2); ctx.closePath(); fs(ctx, '#ffb562', 0.7);
  // forehead star
  star(ctx, fx, -33, 1.8, a, 0.6);
}

const INK_W = 'rgba(91,58,78,0.6)';

export { ink, INK };
