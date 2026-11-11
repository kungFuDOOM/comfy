// Game orchestration: loop, interaction, and hooking simulation up to the Three.js renderer.
import { cheetahDataUrl } from './art/cheetah';
import { currentOutfit } from './boutique';
import { updateBrew } from './cafe';
import { spawnOne, updateCollect } from './collect';
import { decorHint, useYard } from './decorate';
import { gardenHint, tickGarden, useGarden } from './garden';
import { axis, initInput } from './input';
import { updateLanterns } from './lanterns';
import { initNpcs, npcs, talkedToday, updateNpcs, type Npc } from './npc';
import { faceToward, frontTile, placePlayer, player, tileOf, updatePlayer, walkTo, cancelPath } from './player';
import { selectSlot } from './inventory';
import { createWorld3D, type World3D } from './render/world3d';
import { saveGame } from './save';
import { state } from './state';
import { getClock } from './time';
import { closePanel, isPanelOpen } from './ui/dom';
import { buildHud, setHint, tickHud } from './ui/hud';
import { openBag, openBoutique, openCafe, openDialogue, openHelp, openJournal, openMarket } from './ui/panels';
import { TS, buildWorld, inYard, isPlotTile, isSolidTile, stations, type Station } from './world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
let world3d: World3D;
let saveTimer = 0;
let seenHelpTimer = 0.8;

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
  // Raycast the 3D scene: villager / station / else the ground point (world px, 1 tile = TS).
  const pick = world3d.pick(sx, sy, npcs);
  if (!pick) return;
  const around = (x: number, y: number) => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
  if (pick.kind === 'npc') {
    const n = npcs.find((v) => v.def.id === pick.id)!;
    if (Math.hypot(n.x - player.x, n.y - player.y) < 46) { faceToward(n.x, n.y); openDialogue(n.def); return; }
    walkTo(around(Math.floor(n.x / TS), Math.floor((n.y - 4) / TS)), () => { faceToward(n.x, n.y); openDialogue(n.def); });
    return;
  }
  if (pick.kind === 'station') {
    const st = stations.find((s) => s.id === pick.id)!;
    const goals = [] as { x: number; y: number }[];
    for (let i = 0; i < st.w; i++) goals.push(...around(st.x + i, st.y));
    walkTo(goals, () => openStation(st));
    return;
  }
  const wx = pick.wx, wy = pick.wy;
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
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
  world3d.render({
    t, dt, hour: clock.hour, season: clock.season,
    player, outfit: currentOutfit(), npcs, talkedToday,
  });
}

export function startGame() {
  buildWorld();
  initNpcs();
  placePlayer();
  if (!state.spawns.length) for (let i = 0; i < 10; i++) spawnOne(player.x, player.y);
  document.documentElement.style.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
  document.documentElement.style.setProperty('--cheetah-pink', `url(${cheetahDataUrl('pink')})`);
  world3d = createWorld3D(canvas);
  world3d.resize();
  window.addEventListener('resize', () => world3d.resize());
  buildHud({ interact, journal: (tab) => !isPanelOpen() && openJournal(tab), bag: () => !isPanelOpen() && openBag(), help: () => !isPanelOpen() && openHelp() });
  initInput(canvas, { onKey, onClick: handleClick, onWheel: (d) => !isPanelOpen() && selectSlot(state.sel + d) });
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  world3d.snapCamera(player.x, player.y);

  let last = performance.now(), hudT = 0;
  const frame = (now: number) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
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
