// Focus navigation inside the open panel, for gamepad / keyboard (D-pad, stick, arrows).
// Spatial: pick the nearest focusable in the pressed direction; fall back to scrolling the body.
export type Dir = 'up' | 'down' | 'left' | 'right';

const SEL = 'button:not(:disabled), [tabindex]:not([tabindex="-1"])';
const panelEl = () => document.querySelector<HTMLElement>('.panel');
const bodyEl = () => document.querySelector<HTMLElement>('.panel-body');

function items(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(SEL)].filter((e) => e.getClientRects().length > 0);
}

function clearRing() { document.querySelectorAll('.pf').forEach((e) => e.classList.remove('pf')); }

export function setFocus(el: HTMLElement, ring = true, scroll = true) {
  clearRing();
  el.focus({ preventScroll: true });
  if (ring) el.classList.add('pf');
  if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Focus the first useful control (skips the ✕ close button unless it is the only one). */
export function focusFirst(ring = true) {
  const root = panelEl();
  if (!root) return;
  const all = items(root);
  const pick = all.find((e) => !e.classList.contains('close')) ?? all[0];
  if (pick) setFocus(pick, ring, false);
}

export function moveFocus(dir: Dir) {
  const root = panelEl();
  if (!root) return;
  const all = items(root);
  const cur = all.find((e) => e === document.activeElement);
  if (!cur) { focusFirst(); return; }
  const c = cur.getBoundingClientRect();
  const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
  let best: HTMLElement | null = null, bs = Infinity;
  for (const el of all) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
    const [p, s] = dir === 'right' ? [dx, dy] : dir === 'left' ? [-dx, dy] : dir === 'down' ? [dy, dx] : [-dy, dx];
    if (p < 2) continue;
    const score = p + Math.abs(s) * 2.5;
    if (score < bs) { bs = score; best = el; }
  }
  if (best) { setFocus(best); return; }
  if (dir === 'up' || dir === 'down') bodyEl()?.scrollBy({ top: dir === 'down' ? 96 : -96, behavior: 'smooth' });
  cur.classList.add('pf');
}

export function confirmFocus() {
  const root = panelEl();
  if (!root) return;
  const a = document.activeElement;
  if (a instanceof HTMLElement && root.contains(a) && a.matches(SEL)) a.click();
  else focusFirst();
}

/** LB/RB (or Q/R): step through the panel's tab row. */
export function cycleTab(d: number) {
  const tabs = [...document.querySelectorAll<HTMLElement>('.panel .tabs .tab')];
  if (tabs.length < 2) return;
  const i = Math.max(0, tabs.findIndex((t) => t.classList.contains('on')));
  tabs[(i + d + tabs.length) % tabs.length].click();
}

// ---- keep focus across panel re-renders ----
export interface Saved { idx: number; text: string; ring: boolean }

export function captureFocus(): Saved | null {
  const root = panelEl();
  const a = document.activeElement;
  if (!root || !(a instanceof HTMLElement) || !root.contains(a)) return null;
  const all = items(root);
  const idx = all.indexOf(a);
  return idx < 0 ? null : { idx, text: a.textContent ?? '', ring: a.classList.contains('pf') };
}

export function restoreFocus(s: Saved | null) {
  const root = panelEl();
  if (!s || !root) return;
  const all = items(root);
  if (!all.length) return;
  const same = all.map((e, i) => [e, i] as const).filter(([e]) => (e.textContent ?? '') === s.text);
  const pick = same.length ? same.reduce((a, b) => (Math.abs(b[1] - s.idx) < Math.abs(a[1] - s.idx) ? b : a))[0] : all[Math.min(s.idx, all.length - 1)];
  pick.focus({ preventScroll: true });
  if (s.ring) pick.classList.add('pf');
}

document.addEventListener('pointerdown', clearRing, true);
