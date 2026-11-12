// Touch UI: a floating virtual joystick (appears under the thumb, left half of the screen) and the four
// A/B/X/Y face buttons in an Xbox diamond (right). Nothing else: no shoulder buttons, no menu button.
// Everything is HTML/CSS; the overlay only receives pointer events on the buttons themselves.
// CSS shows it only while the last-used device is touch (body.input-touch).
import { h, isPanelOpen } from '../ui/dom';
import { click, trigger, type Action } from './dispatch';
import { markInput } from './prompts';

const R = 46; // knob travel radius (px)
const DEADZONE = 0.16;
const TAP_MS = 240, TAP_PX = 12;

const joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0, t0: 0, travel: 0 };
let heldRun = false;
let base: HTMLElement, knob: HTMLElement;

/** Joystick vector (|v| <= 1, deadzone removed) in screen space: x right, y down. */
export function touchMove() {
  return { x: joy.x, y: joy.y, run: heldRun };
}

function setJoy(dx: number, dy: number) {
  const d = Math.hypot(dx, dy);
  const k = d > R ? R / d : 1;
  const px = dx * k, py = dy * k;
  knob.style.transform = `translate(${px}px, ${py}px)`;
  const m = Math.min(1, d / R);
  if (m < DEADZONE) { joy.x = joy.y = 0; return; }
  const s = (m - DEADZONE) / (1 - DEADZONE) / m; // rescale so the output ramps from 0 at the deadzone edge
  joy.x = (dx / (d || 1)) * m * s;
  joy.y = (dy / (d || 1)) * m * s;
}

function endJoy(tap: boolean, x: number, y: number) {
  if (joy.id === -1) return;
  const quick = performance.now() - joy.t0 < TAP_MS && joy.travel < TAP_PX;
  joy.id = -1; joy.x = joy.y = 0;
  base.classList.remove('on');
  base.style.left = base.style.top = ''; // back to its resting spot (CSS)
  knob.style.transform = '';
  if (tap && quick) click(x, y); // a quick tap on the left half still taps NPCs / stations / ground
}

function btn(cls: string, label: string, word: string, onDown: () => void, onUp?: () => void) {
  const b = h('button', 'tbtn ' + cls, h('b', '', label), h('small', '', word));
  b.type = 'button';
  b.setAttribute('aria-label', word);
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    markInput('touch');
    b.setPointerCapture(e.pointerId);
    b.classList.add('down');
    onDown();
  });
  const up = () => { b.classList.remove('down'); onUp?.(); };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}

export function initTouch(canvas: HTMLCanvasElement) {
  const ui = document.getElementById('ui')!;

  // ---- floating joystick ----
  knob = h('div', 'joy-knob');
  base = h('div', 'joy-base', h('div', 'joy-ring'), knob);
  ui.append(base);

  // Every touch on the world is either the joystick (left half, first finger), or a tap candidate.
  // A tap only counts if the finger lifts quickly without travelling, so drags never become move taps.
  const taps = new Map<number, { x: number; y: number; t: number; moved: boolean }>();
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    markInput('touch');
    if (isPanelOpen()) return;
    if (e.clientX >= window.innerWidth / 2 || joy.id !== -1) {
      taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), moved: false });
      try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      return;
    }
    joy.id = e.pointerId; joy.t0 = performance.now(); joy.travel = 0;
    const m = 68; // keep the whole base on screen
    joy.ox = Math.min(window.innerWidth - m, Math.max(m, e.clientX));
    joy.oy = Math.min(window.innerHeight - m, Math.max(m, e.clientY));
    base.style.left = joy.ox + 'px'; base.style.top = joy.oy + 'px';
    setJoy(e.clientX - joy.ox, e.clientY - joy.oy);
    base.classList.add('on');
    try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    const t = taps.get(e.pointerId);
    if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_PX) t.moved = true;
    if (e.pointerId !== joy.id) return;
    e.preventDefault();
    joy.travel = Math.max(joy.travel, Math.hypot(e.clientX - joy.ox, e.clientY - joy.oy));
    setJoy(e.clientX - joy.ox, e.clientY - joy.oy);
  });
  const lift = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId === joy.id) endJoy(!cancelled, e.clientX, e.clientY);
    const t = taps.get(e.pointerId);
    if (t) {
      taps.delete(e.pointerId);
      if (!cancelled && !t.moved && performance.now() - t.t < TAP_MS + 120) click(e.clientX, e.clientY);
    }
  };
  canvas.addEventListener('pointerup', (e) => lift(e, false));
  canvas.addEventListener('pointercancel', (e) => lift(e, true));
  canvas.addEventListener('lostpointercapture', (e) => lift(e, true));
  // belt and braces: a finger that ends outside the canvas (or the page) must never leave the stick held
  window.addEventListener('pointerup', (e) => { if (e.pointerId === joy.id) endJoy(false, 0, 0); taps.delete(e.pointerId); });
  window.addEventListener('pointercancel', (e) => { if (e.pointerId === joy.id) endJoy(false, 0, 0); taps.delete(e.pointerId); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { taps.clear(); if (joy.id !== -1) endJoy(false, 0, 0); } });
  // no page scroll / pinch / double-tap zoom while playing
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());

  // ---- face buttons: Xbox diamond (Y top, X left, B right, A bottom). No shoulder or menu buttons:
  // the hotbar is tapped directly and the journal lives on the HUD. ----
  const act = (a: Action) => () => trigger(a);
  const A = btn('a', 'A', 'talk', act('interact'));
  const B = btn('b', 'B', 'run', () => { heldRun = true; trigger('cancel'); }, () => { heldRun = false; });
  const X = btn('x', 'X', 'use', act('tool'));
  const Y = btn('y', 'Y', 'bag', act('bag'));
  ui.append(h('div', 'touch-ui', h('div', 'tp-face', Y, X, B, A)));
  window.addEventListener('blur', () => {
    heldRun = false;
    for (const b of [A, B, X, Y]) b.classList.remove('down');
    taps.clear();
    if (joy.id !== -1) endJoy(false, 0, 0);
  });
}
