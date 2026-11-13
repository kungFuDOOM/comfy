// Game orchestration: loop, interaction, and hooking simulation up to the Three.js renderer.
import { cheetahDataUrl } from './art/cheetah';
import { setMood, sfx, updateDirector } from './audio';
import { currentAccessory } from './boutique';
import { currentLook } from './wardrobe';
import { brewing, recipeById, updateBrew } from './cafe';
import { activeAct, cancelAct, derivedAct, endDerived, tickAct, type Act } from './actions';
import { NODES } from './data';
import { spawnOne, updateCollect } from './collect';
import { decorHint, useYard } from './decorate';
import { gardenHint, tickGarden, useGarden } from './garden';
import { glyph, initInput, pollInput, readCamera, readMove, readSpin } from './input';
import { dressing, tickDressing } from './dressing';
import { updateLanterns } from './lanterns';
import { initNpcs, npcs, presentNpcs, talkedToday, updateNpcs, type Npc } from './npc';
import { faceToward, frontTile, placePlayer, player, tileOf, updatePlayer, walkTo, cancelPath } from './player';
import { count, selectedItem, selectSlot } from './inventory';
import { cancelCast, casting, nodeAtTile, nodeCenter, nodeHint, nodeNear, updateNodes, useNode } from './nodes';
import { bus, changed, toast } from './bus';
import { getPetPose, hasPet, petName, petNear, petThePet, petWorldPos, resetPet, updatePet } from './pet';
import { initPetUi, openAdopt, openPetPanel } from './ui/petUi';
import { tickAwards, checkRegions } from './regions';
import { refreshEarned } from './wardrobe';
import { sceneActive } from './render/stage';
import { sharedWorld3D, type World3D } from './render/world3d';
import { saveGame } from './save';
import { activeEventSpots, eventSpotAtTile, tickEvents, type EventSpot } from './events';
import './events/index';
import { state } from './state';
import { getClock } from './time';
import { isPanelOpen } from './ui/dom';
import { buildHud, setHint, tickHud } from './ui/hud';
import { openMap } from './ui/mapPanel';
import { openMerchant } from './ui/merchantUi';
import { merchantPresent, tickMerchant } from './merchant';
import { MERCHANT } from './merchantData';
import { MERCHANT_SPOT, STALL_APPROACH, STALL_CENTER, STALL_TAP } from './merchantLayout';
import { openMailbox } from './ui/friendsUi';
import { syncFriendship, tickFriends } from './friends';
import { openBag, openBoutique, openCafe, openChest, openCrafting, openDialogue, openHelp, openJournal, openMarket } from './ui/panels';
import { openPause } from './ui/menuPanels';
import { barrierHint, barrierNear, syncUnlocks, useBarrier } from './unlocks';
import { T, TS, barrierAtTile, buildWorld, inYard, isPlotTile, isSolidTile, stations, terrainAt, type Station } from './world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
let world3d: World3D;
let saveTimer = 0;
let seenHelpTimer = 0.8;
let markerOn = false;
let eventTimer = 0;
let petHintT = 30; // one gentle nudge per visit toward the Pet Nook while no pet has been adopted

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

/** The nearest seasonal-event spot within reach (a thin rectangle in tile units, so measure to its edge). */
function spotNear(): { s: EventSpot; d: number } | null {
  let best: { s: EventSpot; d: number } | null = null;
  const px = player.x, py = player.y - 8;
  for (const s of activeEventSpots()) {
    const [x0, y0, x1, y1] = s.rect;
    const d = Math.hypot(Math.max(x0 * TS, Math.min(px, x1 * TS)) - px, Math.max(y0 * TS, Math.min(py, y1 * TS)) - py);
    if (d < (s.reach ?? 40) && (!best || d < best.d)) best = { s, d };
  }
  return best;
}

/** Distance (px) to the traveling merchant's counter while her stall is open, else null when out of reach. */
function merchantNear(): number | null {
  if (!merchantPresent()) return null;
  const d = Math.hypot(STALL_CENTER.x * TS - player.x, STALL_CENTER.z * TS - (player.y - 8));
  return d < 76 ? d : null;
}
const faceMerchant = () => faceToward(MERCHANT_SPOT.x * TS, MERCHANT_SPOT.y * TS);
const useMerchant = () => { faceMerchant(); openMerchant(); };

function openStation(s: Station) {
  faceToward((s.x + s.w / 2) * TS, s.y * TS + TS / 2); // turn to the bench, so a brew / craft animates facing it
  if (s.id === 'cafe') openCafe();
  else if (s.id === 'boutique') openBoutique();
  else if (s.id === 'crafting') openCrafting();
  else if (s.id === 'market') openMarket();
  else if (s.id === 'chest') openChest();
  else if (s.id === 'wardrobe') openBag('wardrobe');
  else if (s.id === 'mailbox') openMailbox();
  else if (s.id === 'petbed') { if (state.pet) openPetPanel(); else openAdopt(); }
  else openJournal('lanterns');
}

/** Prompt text for a station (the Pet Nook becomes the pet's bed once someone has moved in). */
function stationText(s: Station): string {
  if (s.id === 'petbed' && state.pet) return `${state.pet.name}'s Bed — Look, rename & dress up`;
  return `${s.label} — ${s.prompt}`;
}

function tileTarget(tx: number, ty: number): Target {
  const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
  if (isPlotTile(tx, ty)) return { label: gardenHint(tx, ty), run: () => useGarden(tx, ty, wx, wy) };
  if (inYard(tx, ty)) return { label: decorHint(tx, ty), run: () => useYard(tx, ty) };
  return null;
}

function currentTarget(): Target {
  const n = npcNear(), s = stationNear(), nd = nodeNear(), bar = barrierNear(), sp = spotNear();
  if (bar && !(n && Math.hypot(n.x - player.x, n.y - player.y) < bar.d)) return { label: barrierHint(bar.b), run: () => useBarrier(bar.b) };
  const dn = n ? Math.hypot(n.x - player.x, n.y - player.y) : Infinity;
  const ds = s ? Math.hypot((s.x + s.w / 2) * TS - player.x, s.y * TS + TS / 2 - (player.y - 8)) - 16 : Infinity;
  const dd = nd ? Math.hypot(nodeCenter(nd).x - player.x, nodeCenter(nd).y - (player.y - 8)) : Infinity;
  const dsp = sp ? sp.d : Infinity;
  const dm = merchantNear() ?? Infinity;
  if (dm < Infinity && dm <= dn && dm <= ds && dm <= dd && dm <= dsp) return { label: `${MERCHANT.stall} — Browse today's rare finds`, run: useMerchant };
  if (sp && dsp <= dn && dsp <= ds && dsp <= dd) return { label: `${sp.s.label}: ${sp.s.prompt}`, run: () => sp.s.run() };
  if (n && dn <= ds && dn <= dd) return { label: `Chat with ${n.def.name.split(' ')[0]}`, run: () => openDialogue(n.def) };
  if (s && ds <= dd) return { label: stationText(s), run: () => openStation(s) };
  if (nd) return { label: nodeHint(nd), run: () => useNode(nd) };
  const f = frontTile();
  const tt = tileTarget(f.x, f.y);
  if (tt) return tt;
  // the pet only claims the prompt when nothing else is in reach, so she never steals a station / villager / node
  if (!dressing.active && petNear(46)) return { label: `Pet ${petName()}`, run: petThePet };
  return null;
}

function interact() {
  if (isPanelOpen()) return;
  currentTarget()?.run();
}

function handleClick(sx: number, sy: number) {
  if (isPanelOpen()) return;
  if (markerOn) { world3d.marker(null); markerOn = false; }
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
  if (pick.kind === 'pet') {
    if (!hasPet()) return;
    const pp = petWorldPos();
    if (petNear(56)) { faceToward(pp.x, pp.y); petThePet(); return; }
    const ptx = Math.floor(pp.x / TS), pty = Math.floor((pp.y - 4) / TS);
    walkTo(around(ptx, pty).filter((g) => !isSolidTile(g.x, g.y)), () => { const q = petWorldPos(); faceToward(q.x, q.y); if (petNear(70)) petThePet(); });
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
  const tapMarker = (ok: boolean) => { if (ok) { world3d.marker(wx, wy); markerOn = true; } else cancelPath(); };
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  // a seasonal-event spot (the feast table): walk to its approach tiles, then use it
  const evSpot = eventSpotAtTile(tx, ty);
  if (evSpot) {
    const goals = (evSpot.approach ?? around(tx, ty)).filter((g) => !isSolidTile(g.x, g.y));
    const go = () => evSpot.run();
    if (spotNear()?.s === evSpot) go();
    else if (!goals.length || !walkTo(goals, go)) cancelPath();
    return;
  }
  // the traveling merchant's stall (counter, awning and the one behind it): walk up to the front and open her shop
  if (merchantPresent() && tx >= STALL_TAP.x0 && tx <= STALL_TAP.x1 && ty >= STALL_TAP.y0 && ty <= STALL_TAP.y1) {
    const goals = STALL_APPROACH.filter((g) => !isSolidTile(g.x, g.y));
    if (merchantNear() !== null) useMerchant();
    else if (!goals.length || !walkTo(goals, () => { if (merchantPresent()) useMerchant(); })) cancelPath();
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
  // a barrier: walk up to it and try the latch
  const bar = barrierAtTile(tx, ty);
  if (bar) {
    const goals = around(tx, ty).filter((g) => !isSolidTile(g.x, g.y));
    const go = () => useBarrier(bar);
    if (!goals.length || !walkTo(goals, go, { x: tx, y: ty })) cancelPath();
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
  tapMarker(walkTo(goals));
}

let intent = false;

/** Stand within reach of a bench (world px). */
function nearStation(id: string, reach = 72) {
  const s = stations.find((v) => v.id === id);
  return !!s && Math.hypot((s.x + s.w / 2) * TS - player.x, s.y * TS + TS / 2 - (player.y - 8)) < reach + (s.w - 1) * 16;
}

/** What the player is busy doing, for the renderer: a started act, else a running cast or a brew at the bench. */
function currentAct(): Act | null {
  const a = activeAct();
  if (a) { endDerived(); return a; }
  if (casting.id) {
    const n = NODES.find((v) => v.id === casting.id);
    if (n) { const c = nodeCenter(n); return derivedAct('fish:' + n.id, 'fish', casting.total - casting.left, casting.total, { tx: c.x, ty: c.y }); }
  }
  if (brewing.id && !intent) {
    const bench = recipeById(brewing.id).bench;
    const st = bench === 'craft' ? 'crafting' : 'cafe';
    if (nearStation(st)) {
      const s = stations.find((v) => v.id === st)!;
      return derivedAct('brew:' + brewing.id, bench, brewing.total - brewing.left, brewing.total, { tx: (s.x + s.w / 2) * TS, ty: s.y * TS + TS / 2 });
    }
  }
  endDerived();
  return null;
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
  // walking (stick, keys, touch joystick or a tap-to-walk path) interrupts whatever the player was doing
  intent = Math.hypot(mv.x, mv.y) > 0.001 || player.path.length > 0;
  if (intent) { cancelAct(); if (casting.id) cancelCast('You reeled your line back in.'); }
  if (activeAct()?.hold && !panel) cancelAct(); // a held act (the bake games) ends with its window
  tickAct(dt);
  if (markerOn && !player.path.length) { world3d.marker(null); markerOn = false; }
  footsteps(player.running);
  updateDirector(dt);
  updateNpcs(dt);
  updatePet(dt);
  updateBrew(dt);
  updateNodes(dt);
  updateLanterns(dt);
  tickGarden();
  eventTimer -= dt;
  if (eventTimer <= 0) { eventTimer = 0.5; tickEvents(); tickFriends(); tickMerchant(); }
  updateCollect(dt, player.x, player.y);
  tickAwards(dt, panel);
  // hint
  const tgt = panel ? null : currentTarget();
  setHint(tgt ? `${glyph('interact')} · ${tgt.label}` : null);
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; persist(); }
  if (petHintT > 0 && !state.pet && state.seenHelp) { petHintT -= dt; if (petHintT <= 0) toast('A cozy Pet Nook is set up beside your house. Come meet a kitten or puppy ♡'); }
  if (seenHelpTimer > 0 && !state.seenHelp) { seenHelpTimer -= dt; if (seenHelpTimer <= 0) openHelp(); }
}

// Footsteps are paced by distance walked (not time), so they match the stride at any speed.
let stepDist = 0, stepAlt = false, lastX = 0, lastY = 0;
function footsteps(run: boolean) {
  const d = Math.hypot(player.x - lastX, player.y - lastY);
  lastX = player.x; lastY = player.y;
  if (!player.moving || d > 20) { if (!player.moving) stepDist = Math.max(0, stepDist - 2); return; } // (big jumps are teleports)
  stepDist += d;
  // One step, in px, in step with the walk/run stride on the character (actors.ts). Run steps are longer.
  if (stepDist < (run ? 18 : 12)) return;
  stepDist = 0; stepAlt = !stepAlt;
  const t = tileOf(), ter = terrainAt(t.x, t.y);
  sfx.step(ter === T.Sand ? 'sand' : ter === T.Path || ter === T.Plaza || ter === T.Bridge ? 'path' : 'grass', stepAlt, run);
}

function surfaceUnder(): 'sand' | 'path' | 'grass' {
  const t = tileOf(), ter = terrainAt(t.x, t.y);
  return ter === T.Sand ? 'sand' : ter === T.Path || ter === T.Plaza || ter === T.Bridge ? 'path' : 'grass';
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
    player: dress ? { x: player.x, y: player.y, facing: 'down', moving: false, running: false, surface: 'grass' } : { ...player, running: player.running, surface: surfaceUnder() }, look: currentLook(), accessory: currentAccessory(), act: dress ? null : currentAct(), pet: dress ? null : getPetPose(), npcs: presentNpcs(), talkedToday,
  });
}

let booted = false;
/**
 * Enter (or re-enter) gameplay. The first call builds the renderer, HUD, input and the loop; later calls (after
 * "Back to title" -> Continue) only re-seat the world from the current state, so nothing is built twice.
 */
export function startGame() {
  buildWorld();
  syncUnlocks();
  initNpcs();
  placePlayer();
  resetPet(); // the pet (if adopted) trots in beside her; position is never saved
  for (const n of npcs) n.busy = false;
  if (!state.spawns.length) for (let i = 0; i < 10; i++) spawnOne(player.x, player.y);
  lastX = player.x; lastY = player.y; stepDist = 0;
  setMood('town');
  refreshEarned(false); // pieces earned before this update, and any party hat already deserved (queued for the ceremony)
  checkRegions();
  syncFriendship(); // letters for hearts earned before the mailbox existed
  tickEvents(); // seasonal events: greet, build the table's collision (the 3D decorations follow on the first frame)
  tickMerchant(); // the traveling merchant: open her stall (and its counter's collision) if today is her day
  cancelAct();
  if (booted) {
    cancelPath();
    world3d.snapCamera(player.x, player.y);
    changed();
    tickHud();
    return;
  }
  booted = true;
  initPetUi();
  document.documentElement.style.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
  document.documentElement.style.setProperty('--cheetah-pink', `url(${cheetahDataUrl('pink')})`);
  bus.on('openFriends', () => { openJournal('friends'); });
  bus.on('openWardrobe', () => { if (!isPanelOpen()) openBag('wardrobe'); });
  world3d = sharedWorld3D(canvas);
  world3d.resize();
  window.addEventListener('resize', () => world3d.resize());
  buildHud({ mail: () => !isPanelOpen() && openMailbox(), skills: () => !isPanelOpen() && openJournal('skills'), journal: (tab) => !isPanelOpen() && openJournal(tab), bag: () => !isPanelOpen() && openBag(), help: () => !isPanelOpen() && openHelp(), map: () => !isPanelOpen() && openMap() });
  initInput(canvas, {
    interact, tool: useTool, cancel: cancelPath, pause: openPause,
    bag: openBag, journal: openJournal, help: openHelp, map: openMap,
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
