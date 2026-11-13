// The island map: a top-down pastel painting of the terrain, with place labels, fogged-over locked areas and a blinking "you are here".
import { AREA_LIST, BARRIERS, type AreaId } from '../areas';
import { VILLAGERS } from '../data';
import { player } from '../player';
import { isAreaOpen } from '../state';
import { barrierForArea, requirementText } from '../unlocks';
import { areaAt, AREAS, buildings, MAP_H, MAP_W, stations, T, terrainAt, TS, type StationId } from '../world';
import { h, openPanel, type PanelApi } from './dom';

const COLORS: Record<number, string> = {
  [T.Water]: '#cdeaf5', [T.Sand]: '#fbe9c8', [T.Grass]: '#d3edbd', [T.Path]: '#f4d8c4', [T.Hill]: '#b9dca6',
  [T.Soil]: '#dcb894', [T.Lawn]: '#dcf2c9', [T.Plaza]: '#f8dfe8', [T.Bridge]: '#d9b58c',
};
const INK = '#6e3350', PINK = '#ff9ec0', PINK_D = '#e0709a';

interface Label { x: number; y: number; icon: string; name: string; sub?: string; area: AreaId; prio: number; locked?: boolean }

const STATION_LABEL: Record<StationId, { icon: string; name: string; sub: string }> = {
  cafe: { icon: '☕', name: 'Café', sub: 'Barista / Baking / Shifts' },
  boutique: { icon: '🎀', name: 'Boutique', sub: 'Spot & Bow Boutique' },
  crafting: { icon: '🔨', name: 'Crafting Table', sub: 'Bows, charms & planks' },
  market: { icon: '🛒', name: 'Market', sub: 'Tuppence Cart' },
  grove: { icon: '🏮', name: 'Afterglow Grove', sub: 'Lantern grove' },
  wardrobe: { icon: '👗', name: 'Home Wardrobe', sub: 'Change outfits' },
  petbed: { icon: '🐾', name: 'Pet Nook', sub: 'Adopt & dress a pet' },
  chest: { icon: '📦', name: 'Softkeep Chest', sub: 'Keep your things safe' },
};

/** A land tile of the area nearest its centre of mass, so labels never float in the sea. */
function anchorOf(id: AreaId): { x: number; y: number } {
  if (id === 'pond') return { x: AREAS.pond.cx, y: AREAS.pond.cy };
  if (id === 'lighthouse') return { x: AREAS.cape.cx, y: AREAS.cape.cy + 1 };
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (areaAt(x, y) === id && terrainAt(x, y) !== T.Water) { sx += x; sy += y; n++; }
  const cx = sx / (n || 1), cy = sy / (n || 1);
  let best = { x: Math.round(cx), y: Math.round(cy) }, bd = Infinity;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (areaAt(x, y) !== id || terrainAt(x, y) === T.Water) continue;
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}

function buildLabels(): Label[] {
  const out: Label[] = [];
  for (const a of AREA_LIST) {
    if (a.id === 'town') continue;
    const p = anchorOf(a.id);
    out.push({ ...p, icon: isAreaOpen(a.id) ? '🌸' : '🔒', name: a.name, area: a.id, prio: 0, locked: !isAreaOpen(a.id),
      sub: isAreaOpen(a.id) ? undefined : `Needs ${requirementText(a.req!)}` });
  }
  for (const s of stations) {
    const l = STATION_LABEL[s.id];
    out.push({ x: s.x + (s.w - 1) / 2, y: s.y, icon: l.icon, name: l.name, sub: l.sub, area: areaAt(s.x, s.y), prio: 1 });
  }
  const house = buildings.find((b) => b.id === 'house')!;
  out.push({ x: (house.x0 + house.x1 + 1) / 2, y: (house.y0 + house.y1 + 1) / 2, icon: '🏠', name: 'Your home', area: 'town', prio: 1 });
  for (const v of VILLAGERS) {
    const area = areaAt(v.home.x, v.home.y);
    const open = isAreaOpen(area);
    out.push({ x: v.home.x + 0.5, y: v.home.y + 0.5, icon: '🐾', name: open ? `${v.name.split(' ')[0]}'s home` : 'A friend\'s home', area, prio: 2, locked: !open });
  }
  return out;
}

function drawBase(c: HTMLCanvasElement, ts: number, labels: Label[]) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = MAP_W * ts, H = MAP_H * ts;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  c.style.width = W + 'px'; c.style.height = H + 'px';
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = COLORS[T.Water]; g.fillRect(0, 0, W, H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = terrainAt(x, y);
    if (t === T.Water) continue;
    g.fillStyle = COLORS[t] ?? COLORS[T.Grass];
    g.fillRect(x * ts, y * ts, ts + 0.6, ts + 0.6);
  }
  // soft shoreline
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1, ts * 0.35);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (terrainAt(x, y) === T.Water) continue;
    if (terrainAt(x, y - 1) === T.Water) { g.beginPath(); g.moveTo(x * ts, y * ts); g.lineTo((x + 1) * ts, y * ts); g.stroke(); }
    if (terrainAt(x, y + 1) === T.Water) { g.beginPath(); g.moveTo(x * ts, (y + 1) * ts); g.lineTo((x + 1) * ts, (y + 1) * ts); g.stroke(); }
    if (terrainAt(x - 1, y) === T.Water) { g.beginPath(); g.moveTo(x * ts, y * ts); g.lineTo(x * ts, (y + 1) * ts); g.stroke(); }
    if (terrainAt(x + 1, y) === T.Water) { g.beginPath(); g.moveTo((x + 1) * ts, y * ts); g.lineTo((x + 1) * ts, (y + 1) * ts); g.stroke(); }
  }
  // buildings
  for (const b of buildings) {
    const x = b.x0 * ts, y = b.y0 * ts, w = (b.x1 - b.x0 + 1) * ts, hh = (b.y1 - b.y0 + 1) * ts;
    g.fillStyle = '#fff4f8'; g.strokeStyle = PINK_D; g.lineWidth = Math.max(1, ts * 0.3);
    g.beginPath(); g.roundRect(x, y, w, hh, ts * 0.8); g.fill(); g.stroke();
    g.fillStyle = b.id === 'house' ? '#ffc9a8' : PINK;
    g.beginPath(); g.roundRect(x, y, w, hh * 0.45, ts * 0.8); g.fill();
  }
  // fog over locked areas: pale lavender, with soft puffs so it looks like mist, not a mask
  for (const a of AREA_LIST) {
    if (isAreaOpen(a.id)) continue;
    g.fillStyle = 'rgba(236,226,248,0.72)';
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (areaAt(x, y) === a.id) g.fillRect(x * ts, y * ts, ts + 0.6, ts + 0.6);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 0; y < MAP_H; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < MAP_W; x += 4) {
      if (areaAt(x, y) !== a.id) continue;
      g.beginPath(); g.arc((x + 0.5) * ts, (y + 0.5) * ts, ts * 2.2, 0, Math.PI * 2); g.fill();
    }
  }
  // barriers still standing
  for (const b of BARRIERS) {
    if (isAreaOpen(b.area)) continue;
    g.fillStyle = '#c9a8e8'; g.strokeStyle = '#fff'; g.lineWidth = 1;
    g.beginPath(); g.arc(b.cx * ts, b.cy * ts, ts * 1.1, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  drawLabels(g, ts, labels);
}

function drawLabels(g: CanvasRenderingContext2D, ts: number, labels: Label[]) {
  const fs = Math.max(9, Math.min(13, ts * 2.2));
  const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const hit = (r: { x0: number; y0: number; x1: number; y1: number }) => taken.some((t) => r.x0 < t.x1 && r.x1 > t.x0 && r.y0 < t.y1 && r.y1 > t.y0);
  g.textBaseline = 'middle'; g.textAlign = 'left';
  for (const l of [...labels].sort((a, b) => a.prio - b.prio)) {
    const px = l.x * ts, py = l.y * ts;
    g.font = `700 ${fs}px "Fredoka", ui-rounded, system-ui, sans-serif`;
    const text = l.name, subText = l.sub && l.prio === 0 ? l.sub : '';
    const iconW = fs + 4;
    const tw = Math.max(g.measureText(text).width, subText ? g.measureText(subText).width * 0.9 : 0);
    const pad = 4, bh = (subText ? fs * 2 + 2 : fs) + pad * 2;
    // try the full pill (icon + name); if it collides with one already placed, fall back to the icon alone
    const full = { x0: px - (iconW + tw + pad * 2) / 2, y0: py - bh / 2, x1: px + (iconW + tw + pad * 2) / 2, y1: py + bh / 2 };
    const small = { x0: px - fs / 2 - 2, y0: py - fs / 2 - 2, x1: px + fs / 2 + 2, y1: py + fs / 2 + 2 };
    const named = !hit(full);
    const r = named ? full : small;
    if (!named && hit(small)) continue;
    taken.push(r);
    g.globalAlpha = l.locked ? 0.8 : 1;
    g.fillStyle = 'rgba(255,250,252,0.92)'; g.strokeStyle = l.locked ? '#c9a8e8' : '#ffc3da'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 8); g.fill(); g.stroke();
    g.fillStyle = INK;
    if (named) {
      g.fillText(l.icon, r.x0 + pad, py - (subText ? fs * 0.55 : 0));
      g.fillText(text, r.x0 + pad + iconW, py - (subText ? fs * 0.55 : 0));
      if (subText) { g.font = `600 ${fs * 0.9}px "Fredoka", ui-rounded, system-ui, sans-serif`; g.fillStyle = '#935a78'; g.fillText(subText, r.x0 + pad + iconW, py + fs * 0.6); }
    } else {
      g.textAlign = 'center'; g.fillText(l.icon, px, py + 1); g.textAlign = 'left';
    }
    g.globalAlpha = 1;
  }
}

/** Draws the map into `body` (used by the map window and the Journal's Map tab). */
export function renderMap(body: HTMLElement, api: PanelApi) {
  const labels = buildLabels();
  const availW = Math.max(220, (body.clientWidth || Math.min(window.innerWidth, 560)) - 34);
  const availH = Math.max(200, window.innerHeight - 230);
  const ts = Math.max(2, Math.min(availW / MAP_W, availH / MAP_H, 9));
  const base = document.createElement('canvas'), me = document.createElement('canvas');
  base.className = 'map-canvas'; me.className = 'map-me';
  drawBase(base, ts, labels);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  me.width = Math.round(MAP_W * ts * dpr); me.height = Math.round(MAP_H * ts * dpr);
  me.style.width = MAP_W * ts + 'px'; me.style.height = MAP_H * ts + 'px';
  const mg = me.getContext('2d')!;
  let raf = 0;
  const loop = (now: number) => {
    mg.setTransform(dpr, 0, 0, dpr, 0, 0);
    mg.clearRect(0, 0, MAP_W * ts, MAP_H * ts);
    const t = now / 1000, blink = 0.5 + 0.5 * Math.sin(t * 5);
    const x = (player.x / TS) * ts, y = ((player.y - 4) / TS) * ts;
    const r = Math.max(4, ts * 1.6);
    mg.fillStyle = `rgba(255,127,176,${0.18 + 0.25 * blink})`;
    mg.beginPath(); mg.arc(x, y, r * (1.5 + blink * 0.9), 0, Math.PI * 2); mg.fill();
    // little facing arrow
    const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing as 'up'] ?? [0, 1];
    const ang = Math.atan2(f[1], f[0]);
    mg.save(); mg.translate(x, y); mg.rotate(ang);
    mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(r * 1.9, 0); mg.lineTo(r * 0.7, -r * 0.8); mg.lineTo(r * 0.7, r * 0.8); mg.closePath(); mg.fill();
    mg.fillStyle = PINK_D; mg.beginPath(); mg.moveTo(r * 1.6, 0); mg.lineTo(r * 0.85, -r * 0.55); mg.lineTo(r * 0.85, r * 0.55); mg.closePath(); mg.fill();
    mg.restore();
    mg.fillStyle = blink > 0.35 ? '#ff5f9e' : '#ffd0e2'; mg.strokeStyle = '#fff'; mg.lineWidth = 2;
    mg.beginPath(); mg.arc(x, y, r, 0, Math.PI * 2); mg.fill(); mg.stroke();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onResize = () => api.rerender();
  window.addEventListener('resize', onResize);
  api.cleanup(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); });

  const frame = h('div', 'map-frame', base, me);
  frame.style.width = MAP_W * ts + 'px'; frame.style.height = MAP_H * ts + 'px';

  // legend: every place by name, with locked areas explained (also the readable fallback when the map is small)
  const legend = h('div', 'map-legend');
  legend.append(h('div', 'map-leg you', h('span', 'map-dot'), 'You are here'));
  for (const a of AREA_LIST) {
    if (a.id === 'town') continue;
    const open = isAreaOpen(a.id), b = barrierForArea(a.id);
    legend.append(h('div', 'map-leg' + (open ? '' : ' locked'), open ? '🌸' : '🔒', h('b', '', a.name),
      open ? '' : h('span', 'muted small', ` · ${b!.name}: needs ${requirementText(a.req!)}`)));
  }
  for (const s of stations) { const l = STATION_LABEL[s.id]; legend.append(h('div', 'map-leg', l.icon, h('b', '', l.name), h('span', 'muted small', ` · ${l.sub}`))); }
  legend.append(h('div', 'map-leg', '🏠', h('b', '', 'Your home')));
  legend.append(h('div', 'map-leg', '🐾', h('b', '', 'Friends\' homes'), h('span', 'muted small', ' · hidden until their area opens')));
  body.append(h('div', 'map-wrap', frame), legend);
}

export function openMap() {
  openPanel('Island Map', (body, api) => renderMap(body, api), undefined, true);
}
