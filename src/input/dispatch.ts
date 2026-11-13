// Device-independent actions. Keyboard, touch and gamepad all funnel through trigger(), which routes to
// the open panel (focus navigation), then to a full-screen scene (main menu / cutscene), then to the game.
import { bus } from '../bus';
import { closePanel, isPanelOpen } from '../ui/dom';
import { dismissLevelUp } from '../ui/levelUp';
import { confirmFocus, cycleTab, moveFocus, type Dir } from '../ui/focus';

export type Action = 'interact' | 'tool' | 'cancel' | 'bag' | 'journal' | 'skills' | 'collection' | 'lantern' | 'help' | 'map' | 'menu' | 'hotbarPrev' | 'hotbarNext' | 'camReset' | 'photo';

export interface Handlers {
  interact(): void;
  tool(): void;
  cancel(): void;
  /** Esc / Start in the world: the pause menu. */
  pause(): void;
  bag(): void;
  journal(tab: string): void;
  help(): void;
  map(): void;
  hotbarStep(d: number): void;
  hotbarSet(i: number): void;
  click(sx: number, sy: number): void;
  camReset(): void;
  /** P / the HUD button: open photo mode. */
  photo(): void;
}

let H: Handlers | null = null;
export const setHandlers = (h: Handlers) => { H = h; };

/** What a full-screen scene understands: move the selection, confirm (A), go back / skip (B). */
export type SceneKey = Dir | 'confirm' | 'back';
let scene: ((k: SceneKey) => void) | null = null;
/** The main menu and cutscenes register here so the gamepad drives them too; returns a release function. */
export function setSceneHandler(fn: (k: SceneKey) => void): () => void {
  scene = fn;
  return () => { if (scene === fn) scene = null; };
}
export const sceneInputActive = () => scene !== null;

/**
 * Photo mode owns the keyboard / pad while it is open: every action goes to its handler (A = shutter, B / Esc = leave)
 * and nothing in the world reacts behind the camera. Returns a release function.
 */
let lock: ((a: Action) => void) | null = null;
export function setInputLock(onAction: (a: Action) => void): () => void {
  lock = onAction;
  return () => { if (lock === onAction) lock = null; };
}
export const inputLocked = () => lock !== null;

export function trigger(a: Action) {
  if (lock) { lock(a); return; }
  // A / B / Esc tuck away a level-up sticker. B / Esc stop there (so Esc doesn't also close the journal);
  // A carries on, so the next gather / talk press is never swallowed.
  if (a === 'cancel' || a === 'menu') { if (dismissLevelUp()) return; }
  else if (a === 'interact') dismissLevelUp();
  if (isPanelOpen()) {
    if (a === 'interact') confirmFocus();
    else if (a === 'hotbarPrev') cycleTab(-1);
    else if (a === 'hotbarNext') cycleTab(1);
    else if (a !== 'tool' && a !== 'camReset') closePanel(); // cancel / bag / journal / help / menu toggle off
    return;
  }
  if (scene) {
    if (a === 'interact') scene('confirm');
    else if (a === 'cancel') scene('back');
    else bus.emit('sceneAction', a); // extra buttons for scenes that want them (home decorating); menus and cutscenes ignore them
    return;
  }
  if (!H) return;
  switch (a) {
    case 'interact': H.interact(); break;
    case 'tool': H.tool(); break;
    case 'cancel': H.cancel(); break;
    case 'bag': H.bag(); break;
    case 'journal': H.journal('quests'); break;
    case 'menu': H.pause(); break;
    case 'skills': H.journal('skills'); break;
    case 'collection': H.journal('collection'); break;
    case 'lantern': H.journal('lanterns'); break;
    case 'help': H.help(); break;
    case 'map': H.map(); break;
    case 'hotbarPrev': H.hotbarStep(-1); break;
    case 'hotbarNext': H.hotbarStep(1); break;
    case 'camReset': H.camReset(); break;
    case 'photo': H.photo(); break;
  }
}

export function hotbar(i: number) { if (!isPanelOpen() && !scene && !lock) H?.hotbarSet(i); }
export function click(sx: number, sy: number) { if (!isPanelOpen() && !scene && !lock) H?.click(sx, sy); }
export function navigate(d: Dir) {
  if (isPanelOpen()) moveFocus(d);
  else scene?.(d);
}
