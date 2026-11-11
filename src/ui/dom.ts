// Minimal DOM helpers and the modal panel manager.
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
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

export interface PanelApi { rerender(): void; close(): void; cleanup(fn: () => void): void }
interface Open { root: HTMLElement; cleanups: (() => void)[]; onClose?: () => void }
let current: Open | null = null;

export const isPanelOpen = () => current !== null;

export function openPanel(title: string, render: (body: HTMLElement, api: PanelApi) => void, onClose?: () => void, wide = false) {
  closePanel();
  const root = h('div', 'panel-backdrop');
  const card = h('div', 'panel' + (wide ? ' wide' : ''));
  const head = h('div', 'panel-head', h('div', 'panel-title', title));
  const body = h('div', 'panel-body');
  const x = btn('✕', () => closePanel(), 'close');
  head.append(x);
  card.append(head, body);
  root.append(card);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) closePanel(); });
  document.getElementById('ui')!.append(root);
  const me: Open = { root, cleanups: [], onClose };
  current = me;
  const api: PanelApi = {
    rerender() {
      me.cleanups.splice(0).forEach((f) => f());
      const sc = body.scrollTop;
      body.replaceChildren();
      render(body, api);
      body.scrollTop = sc;
    },
    close: closePanel,
    cleanup: (fn) => me.cleanups.push(fn),
  };
  render(body, api);
  return api;
}

export function closePanel() {
  if (!current) return;
  const c = current;
  current = null;
  c.cleanups.forEach((f) => f());
  c.root.remove();
  c.onClose?.();
}
