// Gamepad API, standard (Xbox) mapping. Polled once per frame.
import { toast } from '../bus';
import { isPanelOpen } from '../ui/dom';
import { navigate, sceneInputActive, trigger, type Action } from './dispatch';
import { markInput } from './prompts';

const DEADZONE = 0.2;
const NAV_THRESH = 0.55;
const [A, B, X, Y, LB, RB, LT, RT, BACK, START, , R3, UP, DOWN, LEFT, RIGHT] = Array.from({ length: 16 }, (_, i) => i);

let prev: boolean[] = [];
let ls = { x: 0, y: 0 }, rs = { x: 0, y: 0 }, lt = 0, rt = 0, runHeld = false;
let navDir: 'up' | 'down' | 'left' | 'right' | null = null, navT = 0;

/** Radial deadzone; output rescaled so it ramps smoothly from 0. */
function stick(x: number, y: number) {
  const m = Math.hypot(x, y);
  if (m < DEADZONE) return { x: 0, y: 0 };
  const s = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
  return { x: x * s, y: y * s };
}

export const padMove = () => ({ x: ls.x, y: ls.y, run: runHeld });
/** Right stick orbit (x) + tilt (y), triggers zoom (RT in, LT out). */
export const padCamera = () => ({ orbit: rs.x, tilt: rs.y, zoom: lt - rt });

function release() {
  ls = { x: 0, y: 0 }; rs = { x: 0, y: 0 }; lt = rt = 0; runHeld = false; prev = []; navDir = null;
}

export function initGamepad() {
  window.addEventListener('gamepadconnected', () => {
    toast('♥ Controller connected — hello, little gamepad!');
    markInput('gamepad');
  });
  window.addEventListener('gamepaddisconnected', () => {
    toast('Controller unplugged — keyboard and touch still work ✿');
    release();
  });
}

export function pollGamepad(dt: number) {
  let pads: (Gamepad | null)[] = [];
  try { pads = navigator.getGamepads?.() ?? []; } catch { /* blocked by permissions policy */ }
  // prefer a pad the browser recognised as the standard layout
  const live = pads.filter((p): p is Gamepad => !!p && p.connected);
  const pad = live.find((p) => p.mapping === 'standard') ?? live[0];
  if (!pad) { if (prev.length) release(); return; }
  const btns = pad.buttons.map((b) => b.pressed || b.value > 0.5);
  const edge = (i: number) => btns[i] && !prev[i];
  const raw = pad.axes;
  ls = stick(raw[0] ?? 0, raw[1] ?? 0);
  rs = stick(raw[2] ?? 0, raw[3] ?? 0);
  lt = pad.buttons[LT]?.value ?? 0; rt = pad.buttons[RT]?.value ?? 0;
  if (lt < 0.1) lt = 0; if (rt < 0.1) rt = 0;

  const anyInput = btns.some((b, i) => b && !prev[i]) || Math.hypot(ls.x, ls.y) > 0 || Math.hypot(rs.x, rs.y) > 0 || lt > 0 || rt > 0;
  if (anyInput) markInput('gamepad');

  const panel = isPanelOpen() || sceneInputActive(); // anything with a focus ring / selection
  runHeld = !panel && btns[B];
  const fire = (i: number, a: Action) => { if (edge(i)) trigger(a); };
  fire(A, 'interact');
  fire(B, 'cancel');
  fire(X, 'tool');
  fire(Y, 'bag');
  fire(BACK, 'bag');
  fire(START, 'menu');
  fire(LB, 'hotbarPrev');
  fire(RB, 'hotbarNext');
  fire(R3, 'camReset');

  // D-pad / left stick: menu focus when a window or the main menu is up; D-pad ◀ ▶ steps the hotbar in the world.
  let dir: 'up' | 'down' | 'left' | 'right' | null = null;
  if (btns[UP]) dir = 'up'; else if (btns[DOWN]) dir = 'down'; else if (btns[LEFT]) dir = 'left'; else if (btns[RIGHT]) dir = 'right';
  else if (panel && Math.hypot(ls.x, ls.y) > NAV_THRESH) dir = Math.abs(ls.x) > Math.abs(ls.y) ? (ls.x < 0 ? 'left' : 'right') : ls.y < 0 ? 'up' : 'down';
  if (dir !== navDir) { navDir = dir; navT = dir ? 0.32 : 0; if (dir) step(dir); }
  else if (dir) { navT -= dt; if (navT <= 0) { navT = 0.11; step(dir); } }

  prev = btns;
}

function step(dir: 'up' | 'down' | 'left' | 'right') {
  if (isPanelOpen() || sceneInputActive()) navigate(dir);
  else if (dir === 'left') trigger('hotbarPrev');
  else if (dir === 'right') trigger('hotbarNext');
}
