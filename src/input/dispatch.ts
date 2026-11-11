// Device-independent actions. Keyboard, touch and gamepad all funnel through trigger(), which
// routes to the open panel (focus navigation) or to the game handlers.
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

let H: Handlers;
export const setHandlers = (h: Handlers) => { H = h; };

export function trigger(a: Action) {
  if (isPanelOpen()) {
    if (a === 'interact') confirmFocus();
    else if (a === 'hotbarPrev') cycleTab(-1);
    else if (a === 'hotbarNext') cycleTab(1);
    else if (a !== 'tool' && a !== 'camReset') closePanel(); // cancel / bag / journal / help / menu toggle off
    return;
  }
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

export function hotbar(i: number) { if (!isPanelOpen()) H.hotbarSet(i); }
export function click(sx: number, sy: number) { if (!isPanelOpen()) H.click(sx, sy); }
export function navigate(d: Dir) { moveFocus(d); }
