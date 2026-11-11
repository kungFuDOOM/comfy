// Input routing for full-screen scenes (main menu, cutscene). Keys are swallowed before the gameplay keyboard
// handler sees them and drive any open window's focus ring; the gamepad reaches the same callback through
// input/dispatch (A = confirm, B = back, D-pad / stick = directions).
import { initDevices } from '../input';
import { setSceneHandler, type SceneKey } from '../input/dispatch';
import { markInput } from '../input/prompts';
import { closePanel, isPanelOpen } from './dom';
import { confirmFocus, cycleTab, moveFocus, type Dir } from './focus';

export type { SceneKey };

const NAV: Record<string, Dir> = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
};
const CONFIRM = new Set(['e', ' ', 'enter']);

/** Start listening; returns a function that stops. `onKey` is not called while a window is open over the scene. */
export function captureSceneKeys(onKey: (k: SceneKey) => void): () => void {
  initDevices();
  const releasePad = setSceneHandler(onKey);
  const down = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const act: SceneKey | null = (NAV[k] as Dir | undefined) ?? (CONFIRM.has(k) ? 'confirm' : k === 'escape' || k === 'backspace' ? 'back' : null);
    if (e.target instanceof HTMLInputElement && act !== 'back' && act !== 'up' && act !== 'down') return; // let sliders use ← →
    e.stopImmediatePropagation(); // gameplay keys stay asleep while a scene is up
    markInput('keyboard');
    if (!act) {
      if (isPanelOpen() && (k === 'q' || k === 'r')) cycleTab(k === 'q' ? -1 : 1);
      return;
    }
    e.preventDefault();
    if (isPanelOpen()) {
      if (act === 'back') closePanel();
      else if (act === 'confirm') { if (!e.repeat) confirmFocus(); }
      else moveFocus(act);
      return;
    }
    if (e.repeat && (act === 'confirm' || act === 'back')) return;
    onKey(act);
  };
  // Space would natively "click" a focused button on keyup; we already confirmed on keydown.
  const up = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); };
  window.addEventListener('keydown', down, true);
  window.addEventListener('keyup', up, true);
  return () => { releasePad(); window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); };
}
