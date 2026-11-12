// Game orchestration: loop, interaction, and hooking simulation up to the Three.js renderer.
import { cheetahDataUrl } from './art/cheetah';
import { setMood, sfx, updateDirector } from './audio';
import { currentAccessory, currentOutfit } from './boutique';
import { updateBrew } from './cafe';
import { spawnOne, updateCollect } from './collect';
import { decorHint, useYard } from './decorate';
import { gardenHint, tickGarden, useGarden } from './garden';
import { glyph, initInput, pollInput, readCamera, readMove, readSpin } from './input';
import { dressing, tickDressing } from './dressing';
import { updateLanterns } from './lanterns';
import { initNpcs, npcs, presentNpcs, talkedToday, updateNpcs, type Npc } from './npc';
import { faceToward, frontTile, placePlayer, player, tileOf, updatePlayer, walkTo, cancelPath } from './player';
import { count, selectedItem, selectSlot } from './inventory';
import { nodeAtTile, nodeCenter, nodeHint, nodeNear, updateNodes, useNode } from './nodes';
import { changed, toast } from './bus';
import { sceneActive } from './render/stage';
import { sharedWorld3D, type World3D } from './render/world3d';
import { saveGame } from './save';
import { state } from './state';
import { getClock } from './time';
import { isPanelOpen } from './ui/dom';
import { buildHud, setHint, tickHud } from './ui/hud';
import { openBag, openBoutique, openCafe, openChest, openDialogue, openHelp, openJournal, openMarket } from './ui/panels';
import { openPause } from './ui/menuPanels';
import { T, TS, buildWorld, inYard, isPlotTile, isSolidTile, stations, terrainAt, type Station } from './world';

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
  for (const n of presentNpcs()) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { best = n; bd = d; } }
  return best;
}

function openStation(s: Station) {
  if (s.id === 'cafe') openCafe();
  else if (s.id === 'boutique') openBoutique();
  else if (s.id === 'market') openMarket();
  else if (s.id === 'chest') openChest();
  else openJournal('lanterns');
}

function tileTarget(tx: number, ty: number): Target {
  const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
  if (isPlotTile(tx, ty)) return { label: gardenHint(tx, ty), run: () => useGarden(tx, ty, wx, wy) };
  if (inYard(tx, ty)) return { label: decorHint(tx, ty), run: () => useYard(tx, ty) };
  return null;
}

function currentTarget(): Target {
  const n = npcNear(), s = stationNear(), nd = nodeNear();
  const dn = n ? Math.hypot(n.x - player.x, n.y - player.y) : Infinity;
  const ds = s ? Math.hypot((s.x + s.w / 2) * TS - player.x, s.y * TS + TS / 2 - (player.y - 8)) - 16 : Infinity;
  const dd = nd ? Math.hypot(nodeCenter(nd).x - player.x, nodeCenter(nd).y - (player.y - 8)) : Infinity;
  if (n && dn <= ds && dn <= dd) return { label: `Chat with ${n.def.name.split(' ')[0]}`, run: () => openDialogue(n.def) };
  if (s && ds <= dd) return { label: `${s.label} — ${s.prompt}`, run: () => openStation(s) };
  if (nd) return { label: nodeHint(nd), run: () => useNode(nd) };
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
  const pick = world3d.pick(sx, sy, presentNpcs());
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
  // gathering node: walk up (fishing spots sit in the water, so stand on a neighbouring tile) and use it
  const nd = nodeAtTile(tx, ty);
  if (nd) {
    const c = nodeCenter(nd);
    const go = () => { faceToward(c.x, c.y); useNode(nd); };
    if (Math.hypot(c.x - player.x, c.y - (player.y - 8)) < 54) go();
    else {
      const goals = around(tx, ty).filter((g) => !isSolidTile(g.x, g.y));
      if (!goals.length || !walkTo(goals, go, { x: tx, y: ty })) cancelPath();
    }
    return;
  }
  // plain walking
  const goals = isSolidTile(tx, ty) ? around(tx, ty) : [{ x: tx, y: ty }];
  walkTo(goals);
}

/** X / "use tool": act on the tile in front of the player with the selected hotbar item. */
function useTool() {
  const f = frontTile();
  if (selectedItem() === 'rod') {
    const nd = nodeAtTile(f.x, f.y) ?? nodeNear();
    if (nd?.kind === 'fish') { useNode(nd); return; }
    if (count('rod')) { toast('Face a fishing ripple on the water to cast.'); return; }
  }
  const t = tileTarget(f.x, f.y);
  if (t) t.run();
  else toast('Face a garden plot or your yard to use this.');
}

// ---- Update ----
function update(dt: number) {
  pollInput(dt);
  const panel = isPanelOpen();
  const cam = readCamera();
  tickDressing(dt, readSpin());
  world3d.orbit(cam.orbit * 1.1 * dt, cam.tilt * 0.6 * dt, cam.zoom * 0.9 * dt);
  // camera-relative movement: input forward (-y) is away from the camera
  const mv = readMove(), yaw = world3d.yaw(), c = Math.cos(yaw), sn = Math.sin(yaw);
  updatePlayer(dt, c * mv.x + sn * mv.y, -sn * mv.x + c * mv.y, mv.run, mv.analog);
  footsteps(player.running);
  updateDirector(dt);
  updateNpcs(dt);
  updateBrew(dt);
  updateNodes(dt);
  updateLanterns(dt);
  tickGarden();
  updateCollect(dt, player.x, player.y);
  // hint
  const tgt = panel ? null : currentTarget();
  setHint(tgt ? `${glyph('interact')} · ${tgt.label}` : null);
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; persist(); }
  if (seenHelpTimer > 0 && !state.seenHelp) { seenHelpTimer -= dt; if (seenHelpTimer <= 0) openHelp(); }
}

// Footsteps are paced by distance walked (not time), so they match the stride at any speed.
let stepDist = 0, stepAlt = false, lastX = 0, lastY = 0;
function footsteps(run: boolean) {
  const d = Math.hypot(player.x - lastX, player.y - lastY);
  lastX = player.x; lastY = player.y;
  if (!player.moving || d > 20) { if (!player.moving) stepDist = Math.max(0, stepDist - 2); return; } // (big jumps are teleports)
  stepDist += d;
  if (stepDist < (run ? 30 : 20)) return;
  stepDist = 0; stepAlt = !stepAlt;
  const t = tileOf(), ter = terrainAt(t.x, t.y);
  sfx.step(ter === T.Sand ? 'sand' : ter === T.Path || ter === T.Plaza ? 'path' : 'grass', stepAlt, run);
}

function surfaceUnder(): 'sand' | 'path' | 'grass' {
  const t = tileOf(), ter = terrainAt(t.x, t.y);
  return ter === T.Sand ? 'sand' : ter === T.Path || ter === T.Plaza ? 'path' : 'grass';
}

/** Write the player's position and the save now. */
export function persist() {
  state.px = player.x; state.py = player.y; state.facing = player.facing;
  saveGame();
}

// ---- Render ----
function render(t: number, dt: number) {
  const clock = getClock();
  // the fitting room keeps a soft, bright midday light so outfits read true at any hour
  const dress = dressing.active;
  world3d.render({
    t, dt, hour: dress ? 12.5 : clock.hour, season: clock.season,
    player: dress ? { x: player.x, y: player.y, facing: 'down', moving: false, running: false, surface: 'grass' } : { ...player, running: player.running, surface: surfaceUnder() }, outfit: currentOutfit(), accessory: currentAccessory(), npcs: presentNpcs(), talkedToday,
  });
}

let booted = false;
/**
 * Enter (or re-enter) gameplay. The first call builds the renderer, HUD, input and the loop; later calls (after
 * "Back to title" -> Continue) only re-seat the world from the current state, so nothing is built twice.
 */
export function startGame() {
  buildWorld();
  initNpcs();
  placePlayer();
  for (const n of npcs) n.busy = false;
  if (!state.spawns.length) for (let i = 0; i < 10; i++) spawnOne(player.x, player.y);
  lastX = player.x; lastY = player.y; stepDist = 0;
  setMood('town');
  if (booted) {
    cancelPath();
    world3d.snapCamera(player.x, player.y);
    changed();
    tickHud();
    return;
  }
  booted = true;
  document.documentElement.style.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
  document.documentElement.style.setProperty('--cheetah-pink', `url(${cheetahDataUrl('pink')})`);
  world3d = sharedWorld3D(canvas);
  world3d.resize();
  window.addEventListener('resize', () => world3d.resize());
  buildHud({ skills: () => !isPanelOpen() && openJournal('skills'), journal: (tab) => !isPanelOpen() && openJournal(tab), bag: () => !isPanelOpen() && openBag(), help: () => !isPanelOpen() && openHelp() });
  initInput(canvas, {
    interact, tool: useTool, cancel: cancelPath, pause: openPause,
    bag: openBag, journal: openJournal, help: openHelp,
    hotbarStep: (d) => selectSlot(state.sel + d), hotbarSet: selectSlot,
    click: handleClick, camReset: () => world3d.resetCamera(),
  });
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  world3d.snapCamera(player.x, player.y);

  // The loop parks itself (just re-arms) while the main menu or a cutscene owns the screen.
  let last = performance.now(), hudT = 0;
  const frame = (now: number) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (sceneActive()) { requestAnimationFrame(frame); return; }
    update(dt);
    render(now / 1000, dt);
    hudT += dt;
    if (hudT > 0.25) { hudT = 0; tickHud(); }
    requestAnimationFrame(frame);
  };
  tickHud();
  requestAnimationFrame(frame);
}
