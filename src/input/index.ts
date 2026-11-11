// Input façade: merges keyboard, touch joystick and gamepad into one movement/camera reading.
import { isPanelOpen } from '../ui/dom';
import { setHandlers, type Handlers } from './dispatch';
import { initGamepad, padCamera, padMove, pollGamepad } from './gamepad';
import { initKeyboard, keyCamera, keyMove } from './keyboard';
import { initPrompts, markInput } from './prompts';
import { initTouch, touchMove } from './touch';

export { glyph, glyphEl, currentMode } from './prompts';

export interface Move {
  /** screen-space direction: x right, y down (so forward = -y), length <= 1 */
  x: number; y: number;
  run: boolean;
  /** analog sources (stick/joystick) scale speed with tilt */
  analog: boolean;
}

/** Strongest source wins: analog stick/joystick if tilted, else the keyboard. */
export function readMove(): Move {
  if (isPanelOpen()) return { x: 0, y: 0, run: false, analog: false };
  const t = touchMove(), p = padMove(), k = keyMove();
  const mt = Math.hypot(t.x, t.y), mp = Math.hypot(p.x, p.y);
  const run = k.run || t.run || p.run;
  if (mt > 0 || mp > 0) {
    const s = mt >= mp ? t : p;
    return { x: s.x, y: s.y, run, analog: true };
  }
  return { x: k.x, y: k.y, run, analog: false };
}

/** Camera rates, each roughly -1..1: orbit (yaw), tilt (pitch), zoom (+ out). */
export function readCamera() {
  if (isPanelOpen()) return { orbit: 0, tilt: 0, zoom: 0 };
  const p = padCamera(), k = keyCamera();
  return { orbit: p.orbit + k.orbit, tilt: p.tilt, zoom: p.zoom + k.zoom };
}

export function pollInput(dt: number) { pollGamepad(dt); }

export function initInput(canvas: HTMLCanvasElement, handlers: Handlers) {
  setHandlers(handlers);
  initPrompts();
  initKeyboard(canvas);
  initTouch(canvas);
  initGamepad();
  document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') markInput('touch'); else markInput('keyboard'); }, true);
}
