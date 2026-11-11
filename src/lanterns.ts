// Afterglow Lanterns: meaningful moments release a paper lantern that drifts to the grove.
import { drawLantern, LANTERN_KINDS, lanternMeta } from './art/lantern';
import { GROVE } from './world';
import { bus, toast } from './bus';
import { earn } from './inventory';
import { bump } from './quests';
import { ensureDaily, state, type LanternKind } from './state';

export const FLIGHT = 6.5; // seconds to drift to the grove
export interface Flyer { id: number; kind: LanternKind; sx: number; sy: number; t: number }
export const flyers: Flyer[] = [];

export interface LanternSet { id: string; name: string; goal: string; unlock: string; done: (c: Record<string, number>, total: number) => boolean; reward: number }
export const SETS: LanternSet[] = [
  { id: 's1', name: 'First Light Cluster', goal: 'Release one of every lantern kind', unlock: 'Moonlit Reading Nook (a cozy hillside nook)', reward: 100,
    done: (c) => LANTERN_KINDS.every((k) => (c[k.id] ?? 0) >= 1) },
  { id: 's2', name: 'Ribbon Constellation', goal: 'Release three of every lantern kind', unlock: 'Lantern Terrace (a rooftop café patio)', reward: 250,
    done: (c) => LANTERN_KINDS.every((k) => (c[k.id] ?? 0) >= 3) },
  { id: 's3', name: 'Sky Full of Wishes', goal: 'Release 30 lanterns in total', unlock: 'Starwatch Hill (a new town area)', reward: 500,
    done: (_c, total) => total >= 30 },
];

export function lanternCounts(): Record<string, number> {
  const c: Record<string, number> = {};
  for (const l of state.lanterns) c[l.kind] = (c[l.kind] ?? 0) + 1;
  return c;
}

/**
 * A meaningful moment happened. The first moment of each kind each day always releases a lantern;
 * later ones have a gentle chance, with a daily cap, so lanterns stay special.
 */
export function moment(kind: LanternKind, wx: number, wy: number): boolean {
  const daily = ensureDaily();
  const n = daily.lanternKinds[kind] ?? 0;
  if (n >= 4) return false;
  if (n > 0 && Math.random() > 0.3) return false;
  daily.lanternKinds[kind] = n + 1;
  const l = { id: state.lanternSeq++, kind, at: Date.now() };
  state.lanterns.push(l);
  flyers.push({ id: l.id, kind, sx: wx, sy: wy - 24, t: 0 });
  toast(`A ${lanternMeta(kind).name} drifts toward the grove ✦`);
  bump('lanterns');
  checkSets();
  bus.emit('change');
  return true;
}

function checkSets() {
  const counts = lanternCounts();
  const total = state.lanterns.length;
  for (const s of SETS) {
    if (!state.setsDone.includes(s.id) && s.done(counts, total)) {
      state.setsDone.push(s.id);
      earn(s.reward);
      toast(`Constellation complete: ${s.name}! +${s.reward} pips. A new nook will wake in a future update ✦`);
    }
  }
}

export const slotPos = (i: number) => {
  const j = i % 26, row = Math.floor(i / 26);
  return { x: GROVE.x + (-6.2 + j * 0.5) * 32, y: GROVE.y + (-2.9 - Math.sin(j * 0.62) * 1.0 - (j % 2) * 0.5 - row * 0.7) * 32 };
};

export function updateLanterns(dt: number) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    flyers[i].t += dt;
    if (flyers[i].t >= FLIGHT) flyers.splice(i, 1);
  }
}

/** Draws settled lanterns + constellation lines + flying lanterns (call after the sky tint). */
export function drawGroveLanterns(ctx: CanvasRenderingContext2D, t: number, night: number) {
  const flying = new Set(flyers.map((f) => f.id));
  const placed = state.lanterns.map((l, i) => ({ l, i })).filter((o) => !flying.has(o.l.id));
  // faint future slots
  const show = Math.max(10, state.lanterns.length + 3);
  for (let i = state.lanterns.length; i < show; i++) {
    const p = slotPos(i);
    ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 2 + i) * 0.15})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  // constellation lines
  ctx.strokeStyle = `rgba(255,255,255,${0.35 + night * 0.35})`;
  ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath();
  placed.forEach((o, k) => { const p = slotPos(o.i); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
  ctx.stroke(); ctx.setLineDash([]);
  for (const o of placed) { const p = slotPos(o.i); drawLantern(ctx, o.l.kind, p.x, p.y, 0.8, t, 0.6 + night * 0.6); }
  for (const f of flyers) {
    const idx = state.lanterns.findIndex((l) => l.id === f.id);
    const to = slotPos(Math.max(0, idx));
    const k = f.t / FLIGHT, e = k * k * (3 - 2 * k);
    const x = f.sx + (to.x - f.sx) * e + Math.sin(f.t * 2.2) * 14 * (1 - k);
    const y = f.sy + (to.y - f.sy) * e - Math.sin(k * Math.PI) * 60;
    drawLantern(ctx, f.kind, x, y, 0.8 + (1 - k) * 0.3, t + f.id, 1.2);
  }
}
