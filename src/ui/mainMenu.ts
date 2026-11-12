// Main menu: "Hushbell" logo + kawaii button frames over the live island backdrop (render/menuScene.ts).
// The menu keeps its own selected index; pointer and keyboard work out of the box, and the exported
// menuNavigate / menuConfirm / menuBack let the input layer drive it from a gamepad or touch buttons.
import './scenes.css';
import { audioReady, setMood, sfx } from '../audio';
import { glyphEl } from '../input/prompts';
import { startMenuScene, stopMenuScene, type MenuSceneOptions } from '../render/menuScene';
import { hasSave } from '../save';
import { closePanel, h, isPanelOpen } from './dom';
import type { Dir } from './focus';
import { openCredits, openSettings } from './menuPanels';
import { captureSceneKeys } from './sceneInput';

export type MenuItemId = 'new' | 'continue' | 'settings' | 'credits';

export interface MainMenuActions {
  onNewGame?(): void;
  onContinue?(): void;
  /** Defaults to the built-in Settings window. */
  onSettings?(): void;
  /** Defaults to the built-in Credits window. */
  onCredits?(): void;
}

export interface MainMenuOptions extends MainMenuActions, MenuSceneOptions {
  /** Show the Continue button. Default: whether a save exists. */
  showContinue?: boolean;
  /** Built-in keyboard handling (arrows / WASD, Enter / E / Space, Esc). Set false if the input layer routes keys itself. */
  keys?: boolean;
}

const ICONS: Record<MenuItemId, string> = {
  // sprout
  new: '<path d="M12 21v-8" /><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z" fill="currentColor" fill-opacity=".25" /><path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7z" fill="currentColor" fill-opacity=".25" />',
  // heart bookmark
  continue: '<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z" fill="currentColor" fill-opacity=".25" />',
  // flower-gear
  settings: '<circle cx="12" cy="12" r="3" /><path d="M12 3.500v2.500M12 18v2.500M3.5 12H6M18 12h2.500M6 6l1.8 1.800M16.2 16.200L18 18M18 6l-1.8 1.800M7.8 16.200L6 18" />',
  // star
  credits: '<path d="M12 3.800l2.4 5 5.4.7-4 3.8 1 5.400L12 16l-4.8 2.7 1-5.4-4-3.8 5.4-.700z" fill="currentColor" fill-opacity=".25" />',
};
const LABELS: Record<MenuItemId, string> = { new: 'New Game', continue: 'Continue', settings: 'Settings', credits: 'Credits' };
const ORDER: MenuItemId[] = ['new', 'continue', 'settings', 'credits'];

function icon(id: MenuItemId): HTMLElement {
  const s = h('span', 'mm-ico');
  s.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</svg>`;
  return s;
}

let logoSeq = 0;
/**
 * The wordmark, drawn as SVG so the thick sticker outline gets round joins: a deep-pink edge with a little
 * "thickness" below it, a white outline, a candy gradient fill and a whisper of cheetah spots.
 */
export function hushbellLogo(small = false): HTMLElement {
  const id = 'cl' + logoSeq++;
  // Absolute x/y per letter (same spacing textLength used to force). Safari drops text-anchor="middle"
  // and textLength when the word is split into tspans, so the letters start at the anchor and the
  // end of "Hushbell" paints past the viewBox — on a phone that clips the title to "Hushbe".
  const tilt: [string, number, number, number][] = [
    ['H', 34, 142, -6], ['u', 99.6, 147, 4], ['s', 157.7, 141, -3], ['h', 205.5, 145, 5],
    ['b', 263.1, 141, -5], ['e', 319.9, 147, 4], ['l', 374.9, 144, -4], ['l', 409.4, 147, 6],
  ];
  const word = (attrs: string) => `<text text-anchor="start" font-family="Fredoka, ui-rounded, system-ui, sans-serif" font-weight="700" font-size="92" ${attrs}>`
    + tilt.map(([ch, x, y, r]) => `<tspan x="${x}" y="${y}" rotate="${r}">${ch}</tspan>`).join('') + '</text>';
  const petals = [0, 72, 144, 216, 288];
  const svg = `<svg viewBox="0 0 480 200" width="480" height="200" preserveAspectRatio="xMidYMid meet" class="logo-svg" aria-hidden="true">
<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.18" stop-color="#ffd0e1"/><stop offset="0.55" stop-color="#ff96bd"/><stop offset="0.95" stop-color="#ee6a9e"/></linearGradient>
<pattern id="${id}p" width="46" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
<path d="M8 9c4-4 11-3 12 2s-4 8-9 7-6-6-3-9z M31 26c3-3 9-2 10 2s-3 7-8 6-5-5-2-8z M30 5c2-2 6-1 6 2s-3 4-5 3-3-3-1-5z M9 29c2-2 5-1 5 2s-2 4-4 3-3-3-1-5z" fill="#d9558c"/>
</pattern>
</defs>
<g stroke-linejoin="round" stroke-linecap="round">
${word('fill="#bf4a7c" stroke="#bf4a7c" stroke-width="34" transform="translate(0 9)"')}
${word('fill="#e56d9d" stroke="#e56d9d" stroke-width="34"')}
${word('fill="#fff" stroke="#fff" stroke-width="17"')}
${word(`fill="url(#${id}g)"`)}
${word(`fill="url(#${id}p)" opacity="0.2"`)}
</g>
<g class="logo-lily" transform="translate(409 50)"><g>
${petals.map((a) => `<ellipse cx="0" cy="-15" rx="10.5" ry="15" transform="rotate(${a})" fill="#fff" stroke="#e56d9d" stroke-width="3"/>`).join('')}
${petals.map((a) => `<ellipse cx="0" cy="-20" rx="4.5" ry="6" transform="rotate(${a})" fill="#ffc3da"/>`).join('')}
<circle r="7.5" fill="#ffd27a" stroke="#f0a94a" stroke-width="2.5"/></g></g>
</svg>`;
  const mark = h('div', 'logo-word', h('span', 'logo-spark s1', '✦'), h('span', 'logo-spark s2', '✦'), h('span', 'logo-spark s3', '♥'));
  mark.insertAdjacentHTML('afterbegin', svg);
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', 'Hushbell');
  return h('div', 'logo' + (small ? ' small' : ''), mark, h('div', 'logo-tag', '✿ Somewhere soft is waking up. ✿'));
}

interface Open {
  root: HTMLElement;
  buttons: Map<MenuItemId, HTMLButtonElement>;
  actions: MainMenuActions;
  sel: MenuItemId;
  releaseKeys: (() => void) | null;
  sndTimer: number;
}
let open: Open | null = null;

export const isMainMenuOpen = () => open !== null;

/** Ids of the buttons currently shown, top to bottom. */
export function menuItems(): MenuItemId[] {
  return open ? ORDER.filter((id) => !open!.buttons.get(id)!.hidden) : [];
}
/** Selected index into menuItems(). */
export const menuSelected = () => (open ? menuItems().indexOf(open.sel) : -1);

let lastSelId: MenuItemId | null = null;
function paintSel() {
  if (!open) return;
  for (const [id, b] of open.buttons) b.classList.toggle('sel', id === open.sel);
  if (lastSelId !== null && lastSelId !== open.sel) sfx.tick();
  lastSelId = open.sel;
}

/** Select by index (wraps) or id. */
export function menuSelect(i: number | MenuItemId) {
  if (!open) return;
  const items = menuItems();
  const id = typeof i === 'number' ? items[((i % items.length) + items.length) % items.length] : i;
  if (!id || !items.includes(id)) return;
  open.sel = id;
  paintSel();
}

/** Move the selection: a direction, or a signed step (+1 = down). Left/right also step so a 2-column layout works. */
export function menuNavigate(d: Dir | number) {
  if (!open || isPanelOpen()) return;
  const step = typeof d === 'number' ? d : d === 'up' || d === 'left' ? -1 : 1;
  menuSelect(menuSelected() + step);
}

function run(id: MenuItemId) {
  if (!open) return;
  const a = open.actions;
  if (id === 'new') a.onNewGame?.();
  else if (id === 'continue') a.onContinue?.();
  else if (id === 'settings') (a.onSettings ?? openSettings)();
  else (a.onCredits ?? openCredits)();
}

/** Activate the selected button (A / Enter). */
export function menuConfirm() {
  if (!open || isPanelOpen()) return;
  const b = open.buttons.get(open.sel);
  if (!b) return;
  b.classList.remove('press');
  void b.offsetWidth;
  b.classList.add('press');
  sfx.confirm();
  run(open.sel);
}

/** B / Esc: closes Settings / Credits if one is open; the top-level menu has nowhere to go back to. */
export function menuBack() {
  if (isPanelOpen()) closePanel();
}

/** Show or hide Continue (e.g. after a save appears or is deleted). Selection moves off a hidden button. */
export function setContinueVisible(show: boolean) {
  if (!open) return;
  open.buttons.get('continue')!.hidden = !show;
  open.root.classList.toggle('has-continue', show);
  if (!show && open.sel === 'continue') open.sel = 'new';
  paintSel();
}

/** Hook or replace button actions after the menu is up. */
export function setMenuActions(a: MainMenuActions) {
  if (open) Object.assign(open.actions, a);
}

/** Show the main menu over the animated island. Safe to call when already open (updates options). */
export function startMainMenu(opts: MainMenuOptions = {}) {
  const showContinue = opts.showContinue ?? hasSave();
  if (open) { setMenuActions(opts); setContinueVisible(showContinue); return; }
  startMenuScene({ hour: opts.hour });
  setMood('menu');

  const buttons = new Map<MenuItemId, HTMLButtonElement>();
  const list = h('div', 'mm-list');
  ORDER.forEach((id, i) => {
    const b = h('button', 'mm-btn mm-' + id, icon(id), h('span', 'mm-label', LABELS[id]), h('span', 'mm-paw', '♥'));
    b.type = 'button';
    b.style.setProperty('--i', String(i));
    b.addEventListener('pointerenter', () => menuSelect(id));
    b.addEventListener('click', () => { menuSelect(id); menuConfirm(); });
    buttons.set(id, b);
    list.append(b);
  });
  const hints = h('div', 'mm-hints',
    h('span', 'pf-item', glyphEl('move'), 'Choose'), h('span', 'pf-item', glyphEl('interact'), 'Select'));
  // browsers keep sound off until the first tap / key / button press: say so, then step aside
  const snd = h('span', 'mm-snd', '♪ Tap or press a key for music');
  const sndTimer = window.setInterval(() => { if (audioReady()) { snd.hidden = true; clearInterval(sndTimer); } }, 300);
  const root = h('div', 'mm',
    h('div', 'mm-veil'),
    h('div', 'mm-col', hushbellLogo(), list),
    h('div', 'mm-foot', hints, snd, h('span', 'mm-ver', 'Sugarlily Isle · v0.1')),
  );
  document.getElementById('ui')!.append(root);

  const { onNewGame, onContinue, onSettings, onCredits } = opts;
  open = { root, buttons, actions: { onNewGame, onContinue, onSettings, onCredits }, sel: showContinue ? 'continue' : 'new', releaseKeys: null, sndTimer };
  setContinueVisible(showContinue);
  if (opts.keys !== false) {
    open.releaseKeys = captureSceneKeys((k) => {
      if (k === 'confirm') menuConfirm();
      else if (k === 'back') menuBack();
      else menuNavigate(k);
    });
  }
}

/** Remove the menu and its backdrop scene. Gameplay (if started) resumes rendering. */
export function stopMainMenu() {
  if (!open) return;
  if (isPanelOpen()) closePanel();
  open.releaseKeys?.();
  clearInterval(open.sndTimer);
  open.root.remove();
  open = null;
  lastSelId = null;
  stopMenuScene();
}
