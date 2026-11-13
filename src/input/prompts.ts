// Which input device was used last decides the on-screen prompt glyphs.
// Glyph spans render ALL variants and CSS shows the one matching `body.input-<mode>`, so no refresh is needed.
export type Mode = 'keyboard' | 'gamepad' | 'touch';
export type PromptKey = 'interact' | 'tool' | 'cancel' | 'bag' | 'journal' | 'skills' | 'collection' | 'lantern' | 'bagAlt' | 'help' | 'map' | 'hotbar' | 'run' | 'move' | 'tabs' | 'camera';

const TABLE: Record<PromptKey, Record<Mode, string>> = {
  interact: { keyboard: 'E', gamepad: 'A', touch: 'A' },
  tool: { keyboard: 'F', gamepad: 'X', touch: 'X' },
  cancel: { keyboard: 'Esc', gamepad: 'B', touch: 'B' },
  bag: { keyboard: 'B', gamepad: 'Y', touch: 'Y' },
  journal: { keyboard: 'J', gamepad: 'Start', touch: '' },
  bagAlt: { keyboard: '', gamepad: 'View', touch: '' },
  skills: { keyboard: 'K', gamepad: '', touch: '' },
  collection: { keyboard: 'C', gamepad: '', touch: '' },
  lantern: { keyboard: 'L', gamepad: '', touch: '' },
  help: { keyboard: 'H', gamepad: '', touch: '' },
  map: { keyboard: 'M', gamepad: '', touch: '' },
  hotbar: { keyboard: '1-9', gamepad: 'LB RB', touch: '' },
  run: { keyboard: 'Shift', gamepad: 'B', touch: '' },
  move: { keyboard: '↑↓←→', gamepad: 'D-pad', touch: '' },
  tabs: { keyboard: 'Q R', gamepad: 'LB RB', touch: '' },
  camera: { keyboard: '[ ]', gamepad: 'R-stick', touch: '' },
};

const MODES: Mode[] = ['keyboard', 'gamepad', 'touch'];
const forced = (() => {
  const v = new URLSearchParams(location.search).get('input');
  return v === 'gamepad' || v === 'touch' || v === 'keyboard' ? (v as Mode) : null;
})();

let mode: Mode = forced ?? (matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard');

export const currentMode = () => mode;
export const isForced = () => forced !== null;

function apply() {
  for (const m of MODES) document.body.classList.toggle('input-' + m, m === mode);
}

export function initPrompts() { apply(); }

/**
 * Record the device the player just used. Ignored when ?input= forces a glyph set.
 * The touch overlay (joystick + A/B/X/Y) is only shown while the mode is 'touch' (CSS: body.input-touch).
 */
export function markInput(m: Mode) {
  if (forced || m === mode) return;
  mode = m;
  apply();
}

/** Text glyph for the current mode ('' if the device has no such control). */
export const glyph = (k: PromptKey) => TABLE[k][mode];

const variant = (m: Mode, t: string) => {
  const i = document.createElement('i');
  i.className = 'g g-' + m;
  i.textContent = t;
  if (m !== 'keyboard' && t.length === 1 && 'ABXY'.includes(t)) i.dataset.btn = t.toLowerCase();
  return i;
};

/** Inline glyph element that follows the last-used device automatically. */
export function glyphEl(k: PromptKey): HTMLElement {
  const s = document.createElement('span');
  s.className = 'glyph';
  for (const m of MODES) if (TABLE[k][m]) s.append(variant(m, TABLE[k][m]));
  return s;
}
