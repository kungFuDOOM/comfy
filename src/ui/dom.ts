// Minimal DOM helpers and the modal panel manager.
import { sfx } from '../audio';
import { currentMode, glyphEl, type PromptKey } from '../input/prompts';
import { captureFocus, focusFirst, restoreFocus } from './focus';

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls = '', ...kids: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const k of kids) if (k) el.append(k);
  return el;
}

export function btn(label: string | Node, onClick: () => void, cls = '', disabled = false): HTMLButtonElement {
  const b = h('button', 'btn ' + cls, label);
  b.disabled = disabled;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const was = current;
    onClick();
    // opening / closing a panel already sounds by itself; everything else gets a click
    if (current === was && !cls.includes('close')) { if (cls.includes('tab')) sfx.tick(); else sfx.confirm(); }
  });
  return b;
}

export interface PanelApi { rerender(): void; close(): void; cleanup(fn: () => void): void }
interface Open { root: HTMLElement; cleanups: (() => void)[]; onClose?: () => void }
let current: Open | null = null;

export const isPanelOpen = () => current !== null;

export function openPanel(title: string, render: (body: HTMLElement, api: PanelApi) => void, onClose?: () => void, wide = false) {
  const replacing = current !== null;
  closePanel(true);
  if (!replacing) sfx.open();
  const root = h('div', 'panel-backdrop');
  const card = h('div', 'panel' + (wide ? ' wide' : ''));
  const head = h('div', 'panel-head', h('div', 'panel-title', title));
  const body = h('div', 'panel-body');
  const x = btn('✕', () => closePanel(), 'close');
  head.append(x);
  const foot = h('div', 'panel-foot');
  card.append(head, body, foot);
  root.append(card);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) closePanel(); });
  document.getElementById('ui')!.append(root);
  const me: Open = { root, cleanups: [], onClose };
  current = me;
  const api: PanelApi = {
    rerender() {
      me.cleanups.splice(0).forEach((f) => f());
      const sc = body.scrollTop;
      const saved = captureFocus();
      body.replaceChildren();
      render(body, api);
      body.scrollTop = sc;
      restoreFocus(saved);
    },
    close: closePanel,
    cleanup: (fn) => me.cleanups.push(fn),
  };
  render(body, api);
  fillFoot(foot, !!body.querySelector('.tabs'));
  focusFirst(currentMode() === 'gamepad');
  return api;
}

export function closePanel(silent = false) {
  if (!current) return;
  if (!silent) sfx.back();
  const c = current;
  current = null;
  c.cleanups.forEach((f) => f());
  c.root.remove();
  c.onClose?.();
}

/** Controller/keyboard prompt strip (hidden on touch via CSS). */
function fillFoot(foot: HTMLElement, tabs: boolean) {
  const g = (k: PromptKey, label: string) => h('span', 'pf-item', glyphEl(k), label);
  foot.append(g('move', 'Move'), g('interact', 'Choose'), g('cancel', 'Back'));
  if (tabs) foot.append(g('tabs', 'Tabs'));
}
