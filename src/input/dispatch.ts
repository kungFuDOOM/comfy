// Device-independent actions. Keyboard, touch and gamepad all funnel through trigger(), which routes to
// the open panel (focus navigation), then to a full-screen scene (main menu / cutscene), then to the game.
import { closePanel, isPanelOpen } from '../ui/dom';
import { confirmFocus, cycleTab, moveFocus, type Dir } from '../ui/focus';

export type Action = 'interact' | 'tool' | 'cancel' | 'bag' | 'journal' | 'lantern' | 'help' | 'menu' | 'hotbarPrev' | 'hotbarNext' | 'camReset';

export interface Handlers {
  interact(): void;
  tool(): void;
  cancel(): void;
  bag(): void;
  journal(tab: string): void;
  help(): void;
  hotbarStep(d: number): void;
  hotbarSet(i: number): void;
  click(sx: number, sy: number): void;
  camReset(): void;
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

export function trigger(a: Action) {
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
    return;
  }
  if (!H) return;
  switch (a) {
    case 'interact': H.interact(); break;
    case 'tool': H.tool(); break;
    case 'cancel': H.cancel(); break;
    case 'bag': H.bag(); break;
    case 'journal': H.journal('quests'); break;
    case 'menu': H.journal('quests'); break;
    case 'lantern': H.journal('lanterns'); break;
    case 'help': H.help(); break;
    case 'hotbarPrev': H.hotbarStep(-1); break;
    case 'hotbarNext': H.hotbarStep(1); break;
    case 'camReset': H.camReset(); break;
  }
}

export function hotbar(i: number) { if (!isPanelOpen() && !scene) H?.hotbarSet(i); }
export function click(sx: number, sy: number) { if (!isPanelOpen() && !scene) H?.click(sx, sy); }
export function navigate(d: Dir) {
  if (isPanelOpen()) moveFocus(d);
  else scene?.(d);
}
