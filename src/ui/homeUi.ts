// Decorate mode for the home interior: a "home" scene (render/homeRoom.ts) plus a tray of furniture, wallpapers and
// floors. Mouse: hover + click/drag. Touch: tap to place or select, drag to move, big buttons for turn / pick up.
// Keyboard and gamepad: a cursor on the grid (arrows / D-pad / stick), confirm to place or grab, bumpers to flip
// through the tray. Everything funnels through tapCell(), so every device behaves the same.
import { paintFloor, paintWall } from '../art/homePatterns';
import { itemIcon } from '../art/icons';
import { sfx } from '../audio';
import { bus, toast } from '../bus';
import { ITEMS } from '../data';
import { canPlaceAt, clearHome, homeItemsAt, moveHome, ownedDecor, pickUpHome, placeHome, rotateHome, setFloor, setWall } from '../home';
import { FLOORS, HOME_D, HOME_W, WALLPAPERS } from '../homeData';
import { count } from '../inventory';
import { markInput } from '../input/prompts';
import { enterHomeRoom, type HomeView } from '../render/homeRoom';
import { sceneActive } from '../render/stage';
import { saveGame } from '../save';
import { state, type HomeItem } from '../state';
import { h } from './dom';
import { fadeTo } from './fade';
import { captureSceneKeys } from './sceneInput';
import './home.css';

type Tab = 'furniture' | 'wall' | 'floor';
const TABS: [Tab, string][] = [['furniture', '🛋 Furniture'], ['wall', '🎀 Wallpaper'], ['floor', '▦ Floors']];

interface Session {
  view: HomeView;
  top: HTMLElement;
  tray: HTMLElement;
  releaseKeys: () => void;
  off: (() => void)[];
  tab: Tab;
  armed: string | null;
  armedRot: number;
  sel: HomeItem | null;
  cur: { x: number; y: number } | null;
  drag: { item: HomeItem; x: number; y: number } | null;
}
let S: Session | null = null;
let busy = false;

export const homeOpen = () => S !== null || busy;

export async function enterHome() {
  if (S || busy || sceneActive()) return;
  busy = true;
  await fadeTo(1, 280);
  const ui = document.getElementById('ui')!;
  const view = enterHomeRoom();
  const top = h('div', 'hm-top'), tray = h('div', 'hm-tray');
  const root = h('div', 'hm-root', top, tray);
  ui.append(root);
  const me: Session = { view, top, tray, releaseKeys: () => {}, off: [() => root.remove()], tab: 'furniture', armed: null, armedRot: 0, sel: null, cur: null, drag: null };
  S = me;
  wire(me);
  render(me);
  await fadeTo(0, 340);
  busy = false;
}

async function leaveHome() {
  const me = S;
  if (!me || busy) return;
  busy = true;
  await fadeTo(1, 240);
  me.releaseKeys();
  me.off.forEach((f) => f());
  me.view.leave();
  S = null;
  saveGame();
  bus.emit('change');
  await fadeTo(0, 320);
  busy = false;
}

// ---------- actions (shared by every input device) ----------
const canvas = () => document.getElementById('game') as HTMLCanvasElement;

function sync(me: Session) {
  const c = me.cur;
  let ok = true;
  if (c) {
    if (me.drag) ok = canPlaceAt(me.drag.item.id, c.x, c.y, me.drag.item);
    else if (me.armed) ok = canPlaceAt(me.armed, c.x, c.y);
    else if (me.sel) ok = canPlaceAt(me.sel.id, c.x, c.y, me.sel);
  }
  const o = me.view.overlay;
  o.cursor = c ? { ...c, ok } : null;
  o.selected = me.sel && state.home.items.includes(me.sel) ? me.sel : null;
  o.ghost = me.armed ? { id: me.armed, rot: me.armedRot } : null;
  o.drag = me.drag;
}

function arm(me: Session, id: string | null) {
  me.armed = id; me.armedRot = 0;
  if (id) me.sel = null;
  render(me);
}

function tapCell(me: Session, c: { x: number; y: number }) {
  me.cur = c;
  if (me.armed) {
    if (!canPlaceAt(me.armed, c.x, c.y)) { toast('That spot is taken — try another tile.'); sfx.tick(); sync(me); return; }
    const id = me.armed;
    const it = placeHome(id, c.x, c.y, me.armedRot);
    if (it) { sfx.confirm(); me.view.burst(c.x, c.y, 'place'); saveGame(); }
    if (count(id) <= 0) me.armed = null;
    render(me);
    return;
  }
  const here = homeItemsAt(c.x, c.y);
  const sel = me.sel;
  if (sel && !here.includes(sel)) {
    // carry the selected piece to the tapped tile, unless something of its own kind is there
    const free = canPlaceAt(sel.id, c.x, c.y, sel);
    if (free) { moveHome(sel, c.x, c.y); sfx.tick(); me.view.burst(c.x, c.y, 'place'); saveGame(); render(me); return; }
    if (!here.length) { toast('Not there!'); sync(me); return; }
  }
  if (!here.length) { me.sel = null; render(me); return; }
  // tapping the held piece again cycles to what lies under / over it (a rug), then lets go
  const i = sel ? here.indexOf(sel) : -1;
  me.sel = i >= 0 ? here[i + 1] ?? null : here[0];
  if (me.sel) sfx.tick();
  render(me);
}

function rotate(me: Session, dir: number) {
  if (me.armed) { me.armedRot = (me.armedRot + dir + 4) % 4; sfx.tick(); sync(me); return; }
  if (me.sel) { rotateHome(me.sel, dir); sfx.tick(); saveGame(); sync(me); }
}

function pickUp(me: Session) {
  const it = me.sel;
  if (!it) return;
  me.view.burst(it.x, it.y, 'pick');
  pickUpHome(it);
  me.sel = null;
  sfx.pickup();
  saveGame();
  render(me);
}

function cycle(me: Session, d: number) {
  const step = <T,>(list: T[], at: number) => list[(at + d + list.length * 4) % list.length];
  if (me.tab === 'wall') { setWall(step(WALLPAPERS, WALLPAPERS.findIndex((w) => w.id === state.home.wall)).id); sfx.tick(); saveGame(); render(me); }
  else if (me.tab === 'floor') { setFloor(step(FLOORS, FLOORS.findIndex((f) => f.id === state.home.floor)).id); sfx.tick(); saveGame(); render(me); }
  else {
    const list = ownedDecor();
    if (!list.length) return;
    arm(me, step(list, me.armed ? list.indexOf(me.armed) : d > 0 ? -1 : 0));
    sfx.tick();
  }
}

function setTab(me: Session, tab: Tab) {
  me.tab = tab;
  if (tab !== 'furniture') me.armed = null;
  sfx.tick();
  render(me);
}

function moveCursor(me: Session, dx: number, dy: number) {
  const c = me.cur ?? { x: Math.floor(HOME_W / 2), y: Math.floor(HOME_D / 2) };
  me.cur = me.cur ? { x: Math.max(0, Math.min(HOME_W - 1, c.x + dx)), y: Math.max(0, Math.min(HOME_D - 1, c.y + dy)) } : c;
  sfx.tick();
  sync(me);
}

// ---------- DOM ----------
function render(me: Session) {
  if (me.armed && count(me.armed) <= 0) me.armed = null;
  if (me.sel && !state.home.items.includes(me.sel)) me.sel = null;
  buildTop(me);
  buildTray(me);
  sync(me);
}

function hintText(me: Session): string {
  if (me.armed) return `Placing ${ITEMS[me.armed].name}: tap a tile. ↻ turns it.`;
  if (me.sel) return `${ITEMS[me.sel.id].name}: tap a tile or drag to move it.`;
  if (me.tab === 'furniture') return ownedDecor().length ? 'Pick a piece below, or tap one in the room to move it.' : 'Your bag has no decor yet — the boutique sells some!';
  return me.tab === 'wall' ? 'Choose a wallpaper for your walls.' : 'Choose a floor for your room.';
}

function buildTop(me: Session) {
  me.top.replaceChildren(
    h('div', 'hm-title', '🏠 Decorate Home'),
    h('div', 'hm-hint', hintText(me)),
    h('div', 'hm-keys', 'R turn · X pick up · [ ] switch piece · Tab next tab · Esc done'),
    pill('Done ✓', () => void leaveHome(), 'primary'),
  );
}

function pill(label: string, fn: () => void, cls = '', disabled = false) {
  const b = h('button', 'hm-btn ' + cls, label);
  b.type = 'button'; b.disabled = disabled;
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

function buildTray(me: Session) {
  const tabs = h('div', 'hm-tabs');
  for (const [id, label] of TABS) {
    const b = h('button', 'hm-tab' + (me.tab === id ? ' on' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => setTab(me, id));
    tabs.append(b);
  }
  const body = h('div', 'hm-body');
  if (me.tab === 'furniture') {
    const list = ownedDecor();
    if (!list.length) body.append(h('div', 'hm-empty', 'No decor in your bag. Buy some at Spot & Bow Boutique (Decor tab) and come back ♡'));
    for (const id of list) {
      const card = h('button', 'hm-card' + (me.armed === id ? ' on' : ''), itemIcon(id, 44), h('span', 'hm-name', ITEMS[id].name), h('span', 'hm-qty', '×' + count(id)));
      card.type = 'button';
      card.addEventListener('click', () => { sfx.tick(); arm(me, me.armed === id ? null : id); });
      body.append(card);
    }
  } else if (me.tab === 'wall') {
    for (const w of WALLPAPERS) body.append(swatch(w.name, paintWall(w, 64), state.home.wall === w.id, () => { setWall(w.id); sfx.confirm(); saveGame(); render(me); }));
  } else {
    for (const f of FLOORS) body.append(swatch(f.name, paintFloor(f, 64), state.home.floor === f.id, () => { setFloor(f.id); sfx.confirm(); saveGame(); render(me); }));
  }

  const hasTool = !!me.armed || !!me.sel;
  const label = me.armed ? ITEMS[me.armed].name : me.sel ? ITEMS[me.sel.id].name : '';
  const bar = h('div', 'hm-actions' + (hasTool ? ' on' : ''),
    h('span', 'hm-sel', label),
    pill('↻ Turn', () => rotate(me, 1), '', !hasTool),
    me.armed ? pill('✕ Cancel', () => arm(me, null)) : pill('⤴ Pick up', () => pickUp(me), '', !me.sel),
    pill('Tidy up', () => { if (state.home.items.length) { clearHome(); me.sel = null; sfx.pickup(); saveGame(); render(me); } else toast('The room is already empty.'); }, 'ghost'),
  );
  me.tray.replaceChildren(tabs, body, bar);
}

function swatch(name: string, c: HTMLCanvasElement, on: boolean, fn: () => void) {
  c.className = 'hm-swatch-img';
  const b = h('button', 'hm-card swatch' + (on ? ' on' : ''), c, h('span', 'hm-name', name));
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}

// ---------- input wiring ----------
function wire(me: Session) {
  const cv = canvas();
  const down = { id: -1, cell: null as { x: number; y: number } | null, item: null as HomeItem | null };
  const pickAt = (e: PointerEvent) => me.view.pick(e.clientX, e.clientY);

  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const c = pickAt(e);
    down.id = e.pointerId; down.cell = c; down.item = null;
    if (c) {
      me.cur = c;
      if (!me.armed) down.item = homeItemsAt(c.x, c.y)[0] ?? null;
    }
    sync(me);
  };
  const onMove = (e: PointerEvent) => {
    const c = pickAt(e);
    if (e.pointerType === 'mouse' && down.id === -1 && c) { me.cur = c; sync(me); return; }
    if (e.pointerId !== down.id || !c) return;
    me.cur = c;
    // dragging a piece: grab what was under the pointer on press (or the selected piece) and carry it
    if (!me.drag && !me.armed && down.item && down.cell && (c.x !== down.cell.x || c.y !== down.cell.y)) {
      me.sel = down.item;
      me.drag = { item: down.item, x: c.x, y: c.y };
      render(me);
    }
    if (me.drag) { me.drag.x = c.x; me.drag.y = c.y; }
    sync(me);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== down.id) return;
    down.id = -1;
    const drag = me.drag;
    if (drag) {
      me.drag = null;
      if ((drag.x !== drag.item.x || drag.y !== drag.item.y)) {
        if (moveHome(drag.item, drag.x, drag.y)) { sfx.tick(); me.view.burst(drag.x, drag.y, 'place'); saveGame(); }
        else toast('That spot is taken.');
      }
      render(me);
      return;
    }
    const c = pickAt(e) ?? down.cell;
    if (c) tapCell(me, c); else if (me.sel && !me.armed) { me.sel = null; render(me); }
  };
  const onCancel = (e: PointerEvent) => { if (e.pointerId === down.id) { down.id = -1; me.drag = null; sync(me); } };
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onCancel);
  me.off.push(() => { cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onCancel); });

  // extra keys (registered before the scene key capture, which swallows everything it does not know)
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'r') rotate(me, e.shiftKey ? -1 : 1);
    else if (k === 'x' || k === 'delete') pickUp(me);
    else if (k === '[') cycle(me, -1);
    else if (k === ']') cycle(me, 1);
    else if (k === 'tab') setTab(me, e.shiftKey ? TABS[(TABS.findIndex(([id]) => id === me.tab) + TABS.length - 1) % TABS.length][0] : nextTab(me));
    else return;
    markInput('keyboard');
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey, true);
  me.off.push(() => window.removeEventListener('keydown', onKey, true));

  me.releaseKeys = captureSceneKeys((k) => {
    if (busy) return;
    if (k === 'confirm') tapCell(me, me.cur ?? { x: Math.floor(HOME_W / 2), y: Math.floor(HOME_D / 2) });
    else if (k === 'back') {
      if (me.armed) arm(me, null);
      else if (me.sel) { me.sel = null; render(me); }
      else void leaveHome();
    } else {
      // cursor movement is camera-relative on screen, which is the room's own axes here (the camera never turns)
      moveCursor(me, k === 'left' ? -1 : k === 'right' ? 1 : 0, k === 'up' ? -1 : k === 'down' ? 1 : 0);
    }
  });

}

const nextTab = (me: Session) => TABS[(TABS.findIndex(([id]) => id === me.tab) + 1) % TABS.length][0];

// gamepad extras routed by input/dispatch: X turns, Y / View picks up, bumpers flip through the tray, Start = next tab
bus.on('sceneAction', (a: string) => {
  const me = S;
  if (!me || busy) return;
  if (a === 'tool') rotate(me, 1);
  else if (a === 'bag') pickUp(me);
  else if (a === 'hotbarPrev') cycle(me, -1);
  else if (a === 'hotbarNext') cycle(me, 1);
  else if (a === 'menu') setTab(me, nextTab(me));
});
