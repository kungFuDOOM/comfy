// Game orchestration: loop, camera, rendering order, interaction.
import { drawPlayer } from './art/characters';
import { drawDecor, FLAT_DECOR } from './art/decor';
import { cheetahDataUrl } from './art/cheetah';
import { currentOutfit } from './boutique';
import { updateBrew } from './cafe';
import { drawSpawn, spawnOne, updateCollect } from './collect';
import { decorHint, useYard } from './decorate';
import { drawPlots, gardenHint, tickGarden, useGarden } from './garden';
import { axis, initInput } from './input';
import { drawGroveLanterns, updateLanterns } from './lanterns';
import { drawNpc, initNpcs, npcs, updateNpcs, type Npc } from './npc';
import { faceToward, frontTile, placePlayer, player, tileOf, updatePlayer, walkTo, cancelPath } from './player';
import { selectSlot } from './inventory';
import { saveGame } from './save';
import { state } from './state';
import { darkness, getClock, skyTint } from './time';
import { closePanel, isPanelOpen } from './ui/dom';
import { buildHud, setHint, tickHud } from './ui/hud';
import { openBag, openBoutique, openCafe, openDialogue, openHelp, openJournal, openMarket } from './ui/panels';
import {
  MAP_H, MAP_W, TS, buildWorld, collectWorldDrawables, drawGround, drawParticles, glows,
  inYard, isPlotTile, isSolidTile, makeParticles, stations, type Station,
} from './world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const cam = { x: 0, y: 0, zoom: 2, w: 0, h: 0 };
const particles = makeParticles(46);
let dpr = 1;
let saveTimer = 0;
let seenHelpTimer = 0.8;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  // show roughly 15 tiles tall on desktop; a little tighter on small screens
  cam.zoom = Math.max(1.1, Math.min(2.8, window.innerHeight / (13.5 * TS)));
  if (window.innerWidth < 600) cam.zoom = Math.max(1.4, window.innerWidth / (11 * TS));
  cam.w = window.innerWidth / cam.zoom;
  cam.h = window.innerHeight / cam.zoom;
}

// ---- Interaction ----
type Target = { label: string; run: () => void } | null;

function stationNear(): Station | null {
  let best: Station | null = null, bd = 56;
  for (const s of stations) {
    const cx = (s.x + s.w / 2) * TS, cy = s.y * TS + TS / 2;
    const d = Math.hypot(cx - player.x, cy - (player.y - 8));
    if (d < bd + (s.w - 1) * 16) { best = s; bd = d; }
  }
  return best;
}

function npcNear(): Npc | null {
  let best: Npc | null = null, bd = 46;
  for (const n of npcs) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { best = n; bd = d; } }
  return best;
}

function openStation(s: Station) {
  if (s.id === 'cafe') openCafe();
  else if (s.id === 'boutique') openBoutique();
  else if (s.id === 'market') openMarket();
  else openJournal('lanterns');
}

function tileTarget(tx: number, ty: number): Target {
  const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
  if (isPlotTile(tx, ty)) return { label: gardenHint(tx, ty), run: () => useGarden(tx, ty, wx, wy) };
  if (inYard(tx, ty)) return { label: decorHint(tx, ty), run: () => useYard(tx, ty) };
  return null;
}

function currentTarget(): Target {
  const n = npcNear(), s = stationNear();
  const dn = n ? Math.hypot(n.x - player.x, n.y - player.y) : Infinity;
  const ds = s ? Math.hypot((s.x + s.w / 2) * TS - player.x, s.y * TS + TS / 2 - (player.y - 8)) - 16 : Infinity;
  if (n && dn <= ds) return { label: `Chat with ${n.def.name.split(' ')[0]}`, run: () => openDialogue(n.def) };
  if (s) return { label: `${s.label} — ${s.prompt}`, run: () => openStation(s) };
  const f = frontTile();
  return tileTarget(f.x, f.y);
}

function interact() {
  if (isPanelOpen()) return;
  currentTarget()?.run();
}

function handleClick(sx: number, sy: number) {
  if (isPanelOpen()) return;
  const wx = sx / cam.zoom + cam.x, wy = sy / cam.zoom + cam.y;
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  const around = (x: number, y: number) => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
  // villager?
  const n = npcs.find((v) => Math.hypot(v.x - wx, v.y - 14 - wy) < 22);
  if (n) {
    if (Math.hypot(n.x - player.x, n.y - player.y) < 46) { faceToward(n.x, n.y); openDialogue(n.def); return; }
    walkTo(around(Math.floor(n.x / TS), Math.floor((n.y - 4) / TS)), () => { faceToward(n.x, n.y); openDialogue(n.def); });
    return;
  }
  // station?
  const st = stations.find((s) => tx >= s.x && tx < s.x + s.w && Math.abs(wy - (s.y * TS + TS / 2)) < 50 && wy < (s.y + 1) * TS + 4);
  if (st) {
    const goals = [] as { x: number; y: number }[];
    for (let i = 0; i < st.w; i++) goals.push(...around(st.x + i, st.y));
    walkTo(goals, () => openStation(st));
    return;
  }
  // plot / yard tile
  if (isPlotTile(tx, ty) || inYard(tx, ty)) {
    const me = tileOf();
    const adj = Math.abs(me.x - tx) + Math.abs(me.y - ty) === 1;
    const go = () => { faceToward(tx * TS + 16, ty * TS + 16); tileTarget(tx, ty)?.run(); };
    if (adj) go();
    else if (!walkTo(around(tx, ty), go, { x: tx, y: ty })) cancelPath();
    return;
  }
  // plain walking
  const goals = isSolidTile(tx, ty) ? around(tx, ty) : [{ x: tx, y: ty }];
  walkTo(goals);
}

function onKey(k: string) {
  if (k === 'escape') { closePanel(); return; }
  if (isPanelOpen()) return;
  if (k === 'e' || k === ' ' || k === 'enter') interact();
  else if (k >= '1' && k <= '9') selectSlot(Number(k) - 1);
  else if (k === 'b') openBag();
  else if (k === 'j') openJournal('quests');
  else if (k === 'l') openJournal('lanterns');
  else if (k === 'h' || k === '?') openHelp();
}

// ---- Update ----
function update(dt: number) {
  const panel = isPanelOpen();
  const [ax, ay] = panel ? [0, 0] : axis();
  updatePlayer(dt, ax, ay);
  updateNpcs(dt);
  updateBrew(dt);
  updateLanterns(dt);
  tickGarden();
  updateCollect(dt, player.x, player.y);
  // camera
  const tx = player.x - cam.w / 2, ty = player.y - 20 - cam.h / 2;
  const k = 1 - Math.pow(0.001, dt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  cam.x = Math.max(-40, Math.min(MAP_W * TS + 40 - cam.w, cam.x));
  cam.y = Math.max(-40, Math.min(MAP_H * TS + 40 - cam.h, cam.y));
  if (cam.w > MAP_W * TS + 80) cam.x = (MAP_W * TS - cam.w) / 2;
  if (cam.h > MAP_H * TS + 80) cam.y = (MAP_H * TS - cam.h) / 2;
  // hint
  setHint(panel ? null : currentTarget() ? `E · ${currentTarget()!.label}` : null);
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; persist(); }
  if (seenHelpTimer > 0 && !state.seenHelp) { seenHelpTimer -= dt; if (seenHelpTimer <= 0) openHelp(); }
}

function persist() {
  state.px = player.x; state.py = player.y; state.facing = player.facing;
  saveGame();
}

// ---- Render ----
function render(t: number, dt: number) {
  const clock = getClock();
  const s = clock.season;
  const night = darkness(clock.hour);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#bfe6f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const m = dpr * cam.zoom;
  ctx.setTransform(m, 0, 0, m, -cam.x * m, -cam.y * m);
  const v = {
    x0: Math.max(0, Math.floor(cam.x / TS) - 1), y0: Math.max(0, Math.floor(cam.y / TS) - 1),
    x1: Math.min(MAP_W - 1, Math.ceil((cam.x + cam.w) / TS) + 1), y1: Math.min(MAP_H - 1, Math.ceil((cam.y + cam.h) / TS) + 1),
  };
  drawGround(ctx, v, s, t);
  drawPlots(ctx, t);
  for (const d of state.decor) if (FLAT_DECOR.has(d.id)) drawDecor(ctx, d.id, d.x * TS + TS / 2, d.y * TS + TS - 2);

  const list: { y: number; fn: (c: CanvasRenderingContext2D) => void }[] = [];
  const push = (y: number, fn: (c: CanvasRenderingContext2D) => void) => list.push({ y, fn });
  collectWorldDrawables(push, v, s, t);
  for (const d of state.decor) if (!FLAT_DECOR.has(d.id)) push(d.y * TS + TS, (c) => drawDecor(c, d.id, d.x * TS + TS / 2, d.y * TS + TS - 2));
  for (const n of npcs) push(n.y, (c) => drawNpc(c, n, t));
  for (const sp of state.spawns) push(sp.y, (c) => drawSpawn(c, sp, t));
  push(player.y, (c) => drawPlayer(c, player.x, player.y, currentOutfit(), player.facing, player.moving, t));
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.fn(ctx);

  drawParticles(ctx, particles, s, cam, t, dt);

  // sky tint (multiply)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [r, g, b] = skyTint(clock.hour);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';

  // self-lit things: glows + lantern grove
  ctx.setTransform(m, 0, 0, m, -cam.x * m, -cam.y * m);
  if (night > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      if (gl.x < cam.x - 90 || gl.x > cam.x + cam.w + 90 || gl.y < cam.y - 90 || gl.y > cam.y + cam.h + 90) continue;
      const rg = ctx.createRadialGradient(gl.x, gl.y, 2, gl.x, gl.y, gl.r);
      rg.addColorStop(0, `rgba(${gl.c},${0.5 * night})`); rg.addColorStop(1, `rgba(${gl.c},0)`);
      ctx.fillStyle = rg; ctx.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  drawGroveLanterns(ctx, t, night);

  // soft pink vignette
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.45, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75);
  vg.addColorStop(0, 'rgba(255,170,205,0)'); vg.addColorStop(1, 'rgba(255,170,205,0.22)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function startGame() {
  buildWorld();
  initNpcs();
  placePlayer();
  if (!state.spawns.length) for (let i = 0; i < 10; i++) spawnOne(player.x, player.y);
  document.documentElement.style.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
  document.documentElement.style.setProperty('--cheetah-pink', `url(${cheetahDataUrl('pink')})`);
  resize();
  window.addEventListener('resize', resize);
  buildHud({ interact, journal: (tab) => !isPanelOpen() && openJournal(tab), bag: () => !isPanelOpen() && openBag(), help: () => !isPanelOpen() && openHelp() });
  initInput(canvas, { onKey, onClick: handleClick, onWheel: (d) => !isPanelOpen() && selectSlot(state.sel + d) });
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  cam.x = player.x - cam.w / 2; cam.y = player.y - cam.h / 2;

  let last = performance.now(), hudT = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render(now / 1000, dt);
    hudT += dt;
    if (hudT > 0.25) { hudT = 0; tickHud(); }
    requestAnimationFrame(frame);
  };
  tickHud();
  requestAnimationFrame(frame);
}
