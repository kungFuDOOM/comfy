// A small garden plot: till, plant, water, harvest. Grows on a short real-time scale.
import { changed, toast } from './bus';
import { ITEMS, SEED_CROP } from './data';
import { addItem, removeItem, selectedItem } from './inventory';
import { moment } from './lanterns';
import { bump } from './quests';
import { grantXp, skillLevel } from './skills';
import { state, type Plot } from './state';
import { circle, ellipse, rr } from './art/draw';
import { AREAS, TS } from './world';

const WET_MS = 120_000;
const key = (x: number, y: number) => `${x},${y}`;

export function tickGarden(now = Date.now()) {
  for (const p of Object.values(state.plots)) {
    if (!p.crop) continue;
    const from = p.lastTick, to = Math.min(now, p.wetUntil);
    if (to > from && p.progress < p.need) p.progress = Math.min(p.need, p.progress + (to - from) / 1000);
    p.lastTick = now;
  }
}

export const stageOf = (p: Plot) => (p.progress >= p.need ? 3 : Math.min(2, Math.floor((p.progress / p.need) * 3)));

export function gardenHint(x: number, y: number): string {
  const p = state.plots[key(x, y)];
  const sel = selectedItem();
  if (!p) return sel === 'trowel' ? 'Till the soil' : 'Garden soil (use the trowel)';
  if (!p.crop) return sel && SEED_CROP[sel] ? `Plant ${ITEMS[sel].name}` : 'Tilled — select seeds to plant';
  if (p.progress >= p.need) return 'Harvest!';
  return sel === 'can' ? 'Water the sprout' : 'Growing… (use the watering can)';
}

export function useGarden(x: number, y: number, wx: number, wy: number) {
  const k = key(x, y);
  const p = state.plots[k];
  const sel = selectedItem();
  const now = Date.now();
  if (!p) {
    if (sel === 'trowel') { state.plots[k] = { crop: '', progress: 0, wetUntil: 0, lastTick: now, need: 0 }; toast('Tilled! Now plant some seeds.'); grantXp('gardening', 2); }
    else toast('Select the Tilly Trowel (slot 1) to till this soil.');
  } else if (!p.crop) {
    if (sel && SEED_CROP[sel] && removeItem(sel)) {
      p.crop = SEED_CROP[sel].crop; p.need = SEED_CROP[sel].need; p.progress = 0; p.lastTick = now; p.wetUntil = 0;
      toast('Planted! Water it with the Dewdrop Can.'); grantXp('gardening', 3);
    } else toast('Select some seeds from your hotbar first.');
  } else if (p.progress >= p.need) {
    const n = 1 + (Math.random() < 0.4 + 0.02 * (skillLevel('gardening') - 1) ? 1 : 0);
    addItem(p.crop, n);
    toast(`Harvested ${n} ${ITEMS[p.crop].name}!`);
    state.plots[k] = { crop: '', progress: 0, wetUntil: 0, lastTick: now, need: 0 };
    bump('harvested');
    grantXp('gardening', 14);
    moment('garden', wx, wy);
  } else if (sel === 'can') {
    p.wetUntil = now + WET_MS; p.lastTick = Math.min(p.lastTick, now);
    toast('Splish! Watered.'); grantXp('gardening', 1);
  } else toast('Still growing. Water it with the Dewdrop Can!');
  changed();
}

export function drawPlots(ctx: CanvasRenderingContext2D, t: number) {
  const g = AREAS.garden, now = Date.now();
  for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
    const px = x * TS, py = y * TS, p = state.plots[key(x, y)];
    if (!p) { ctx.strokeStyle = 'rgba(190,150,120,0.35)'; ctx.setLineDash([3, 4]); ctx.strokeRect(px + 3.5, py + 3.5, TS - 7, TS - 7); ctx.setLineDash([]); continue; }
    const wet = p.wetUntil > now;
    rr(ctx, px + 2, py + 3, TS - 4, TS - 6, 7); ctx.fillStyle = wet ? '#b98a72' : '#d1a58a'; ctx.fill();
    ctx.strokeStyle = wet ? '#9b6f58' : '#b98a72'; ctx.lineWidth = 1.5;
    for (const dy of [10, 17, 24]) { ctx.beginPath(); ctx.moveTo(px + 7, py + dy); ctx.lineTo(px + TS - 7, py + dy); ctx.stroke(); }
    if (!p.crop) continue;
    drawCrop(ctx, p.crop, stageOf(p), px + TS / 2, py + TS - 6, t);
    if (!wet && p.progress < p.need) { circle(ctx, px + TS - 7, py + 8, 3, 'rgba(160,210,240,0.9)'); ctx.fillStyle = '#6fb3d6'; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', px + TS - 7, py + 11); }
  }
}

function drawCrop(ctx: CanvasRenderingContext2D, crop: string, stage: number, cx: number, by: number, t: number) {
  const sway = Math.sin(t * 1.5 + cx) * 0.8;
  ctx.strokeStyle = '#7fcf8e'; ctx.fillStyle = '#7fcf8e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const h = [6, 12, 15, 17][stage];
  ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx + sway, by - h); ctx.stroke();
  ellipse(ctx, cx - 4 + sway, by - h * 0.6, 4, 2, '#8fe0a0'); ellipse(ctx, cx + 4 + sway, by - h * 0.8, 4, 2, '#8fe0a0');
  if (stage >= 2) circle(ctx, cx + sway, by - h - 2, 3, crop === 'puffberry' ? '#ffc2da' : '#f5f5f5');
  if (stage === 3) {
    if (crop === 'puffberry') { circle(ctx, cx + sway, by - h - 3, 6, '#ff8fb6'); circle(ctx, cx + sway - 2, by - h - 5, 1.5, '#ffd0e2'); }
    else for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; circle(ctx, cx + sway + Math.cos(a) * 4, by - h - 3 + Math.sin(a) * 4, 3.4, '#fff'); }
    const a = 0.5 + Math.sin(t * 5 + cx) * 0.4;
    circle(ctx, cx + 8, by - h - 6, 1.3, `rgba(255,240,160,${a})`);
  }
}
