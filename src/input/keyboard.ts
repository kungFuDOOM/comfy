// Keyboard: WASD/arrows, E/Space, F tool, Shift run, Q/R + 1-9 + wheel hotbar, Esc/B/J/L/H, [ ] orbit, - = zoom.
import { isPanelOpen } from '../ui/dom';
import { confirmFocus } from '../ui/focus';
import { click, hotbar, navigate, trigger } from './dispatch';
import { markInput } from './prompts';

const down = new Set<string>(); // lowercase e.key
const codes = new Set<string>(); // e.code (layout-independent for digits/brackets)

export function keyMove() {
  let x = 0, y = 0;
  if (down.has('arrowleft') || down.has('a')) x -= 1;
  if (down.has('arrowright') || down.has('d')) x += 1;
  if (down.has('arrowup') || down.has('w')) y -= 1;
  if (down.has('arrowdown') || down.has('s')) y += 1;
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l, run: down.has('shift') || codes.has('ShiftLeft') || codes.has('ShiftRight') };
}

export function keyCamera() {
  return {
    orbit: (codes.has('BracketRight') ? 1 : 0) - (codes.has('BracketLeft') ? 1 : 0),
    zoom: (codes.has('Minus') ? 1 : 0) - (codes.has('Equal') ? 1 : 0),
  };
}

const NAV: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
};
const CONFIRM = new Set(['e', ' ', 'enter']);

export function initKeyboard(canvas: HTMLCanvasElement) {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // typing in a text field (the pet name): letters / space / Enter are the field's, not hotkeys. Esc still backs out.
    const tgt = e.target;
    if ((tgt instanceof HTMLInputElement && tgt.type === 'text' || tgt instanceof HTMLTextAreaElement) && e.key !== 'Escape') return;
    const k = e.key.toLowerCase();
    markInput('keyboard');
    const fresh = !down.has(k);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    down.add(k); codes.add(e.code);
    if (e.repeat) { if (isPanelOpen() && NAV[k]) navigate(NAV[k]); return; }
    if (!fresh && !isPanelOpen()) return;

    if (k === 'escape') { trigger('menu'); return; } // closes a window, else opens the pause menu
    if (isPanelOpen()) {
      if (NAV[k]) { e.preventDefault(); navigate(NAV[k]); }
      else if (CONFIRM.has(k)) { e.preventDefault(); confirmFocus(); }
      else if (k === 'q') trigger('hotbarPrev');
      else if (k === 'r') trigger('hotbarNext');
      else if (k === 'b') trigger('bag');
      else if (k === 'j') trigger('journal');
    else if (k === 'k') trigger('skills');
      else if (k === 'k') trigger('skills');
      else if (k === 'c') trigger('collection');
    else if (k === 'l') trigger('lantern');
      else if (k === 'm') trigger('map');
      else if (k === 'h' || k === '?') trigger('help');
      return;
    }
    // a click on a HUD button must not leave it focused (Enter/Space would re-click it)
    const a = document.activeElement;
    if (a instanceof HTMLButtonElement) a.blur();
    if (CONFIRM.has(k)) trigger('interact');
    else if (k === 'f') trigger('tool');
    else if (/^Digit[1-9]$/.test(e.code)) hotbar(Number(e.code.slice(5)) - 1);
    else if (k === 'q') trigger('hotbarPrev');
    else if (k === 'r') trigger('hotbarNext');
    else if (k === 'b') trigger('bag');
    else if (k === 'j') trigger('journal');
    else if (k === 'k') trigger('skills');
    else if (k === 'c') trigger('collection');
    else if (k === 'l') trigger('lantern');
    else if (k === 'm') trigger('map');
    else if (k === 'h' || k === '?') trigger('help');
    else if (e.code === 'Backspace' || e.code === 'Home') trigger('camReset');
  });
  // Space/Enter on a focused panel button would natively click on keyup; we already confirmed on keydown.
  window.addEventListener('keyup', (e) => {
    down.delete(e.key.toLowerCase()); codes.delete(e.code);
    if (isPanelOpen() && (e.key === ' ' || e.key === 'Enter')) e.preventDefault();
  });
  window.addEventListener('blur', () => { down.clear(); codes.clear(); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    markInput('keyboard');
    if (!isPanelOpen()) trigger(e.deltaY > 0 ? 'hotbarNext' : 'hotbarPrev');
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // mouse / pen: click-to-move and tap-to-interact as before (touch is handled by touch.ts)
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    markInput('keyboard');
    click(e.clientX, e.clientY);
  });
}
