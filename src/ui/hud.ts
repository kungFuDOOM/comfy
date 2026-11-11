// Always-on HUD: clock/season, pips, lanterns, hotbar, hint, toasts, quick buttons.
import { coinIcon, itemIcon } from '../art/icons';
import { drawLantern } from '../art/lantern';
import { bus } from '../bus';
import { ITEMS, CURRENCY } from '../data';
import { selectSlot } from '../inventory';
import { getClock } from '../time';
import { state } from '../state';
import { glyphEl, type PromptKey } from '../input/prompts';
import { h } from './dom';

let clockEl: HTMLElement, seasonEl: HTMLElement, coinEl: HTMLElement, lanternEl: HTMLElement, hotbarEl: HTMLElement, hintEl: HTMLElement, toastEl: HTMLElement, lanternCanvas: HTMLCanvasElement;

export function buildHud(actions: { journal(tab: string): void; bag(): void; help(): void }) {
  const ui = document.getElementById('ui')!;
  clockEl = h('div', 'clock');
  seasonEl = h('div', 'season');
  coinEl = h('span', '');
  lanternCanvas = document.createElement('canvas');
  lanternCanvas.width = lanternCanvas.height = 56; lanternCanvas.style.width = lanternCanvas.style.height = '28px';
  lanternEl = h('span', '');
  const top = h('div', 'hud-top',
    h('div', 'chip time', clockEl, seasonEl),
    h('div', 'chip coin', coinIcon(20), coinEl),
    (() => { const b = h('button', 'chip lantern', lanternCanvas, lanternEl); b.title = 'Afterglow Lanterns (L)'; b.onclick = () => actions.journal('lanterns'); return b; })(),
  );
  const quick = h('div', 'hud-quick',
    ...([['✿ Journal', () => actions.journal('quests'), 'journal'], ['❖ Bag', actions.bag, 'bag'], ['? Help', actions.help, 'help']] as [string, () => void, PromptKey][])
      .map(([t, f, k]) => { const b = h('button', 'btn small', t, glyphEl(k)); b.onclick = f; return b; }),
  );
  hotbarEl = h('div', 'hotbar');
  hintEl = h('div', 'hint');
  toastEl = h('div', 'toasts');
  ui.append(top, quick, hotbarEl, hintEl, toastEl);
  bus.on('change', refreshHud);
  bus.on('toast', showToast);
  refreshHud();
}

export function setHint(text: string | null) {
  hintEl.textContent = text ?? '';
  hintEl.classList.toggle('on', !!text);
}

export function tickHud() {
  const c = getClock();
  clockEl.textContent = `${c.label} · ${c.phaseName}`;
  seasonEl.textContent = `${c.weekday}, ${c.dayOfMonth}/${c.month} · ${c.season.name}`;
  seasonEl.title = c.season.blurb;
  const g = lanternCanvas.getContext('2d')!;
  g.clearRect(0, 0, 56, 56);
  g.save(); g.scale(1.6, 1.6); drawLantern(g, 'gift', 17.5, 17.5, 0.9, performance.now() / 1000, 0.7); g.restore();
}

export function refreshHud() {
  coinEl.textContent = `${state.coins} ${CURRENCY}`;
  lanternEl.textContent = String(state.lanterns.length);
  hotbarEl.replaceChildren();
  state.hotbar.forEach((id, i) => {
    const slot = h('button', 'slot' + (i === state.sel ? ' sel' : ''), h('span', 'key', String(i + 1)));
    if (id) {
      slot.append(itemIcon(id, 34));
      if (ITEMS[id].kind !== 'tool') slot.append(h('span', 'qty', String(state.inv[id] ?? 0)));
      slot.title = ITEMS[id].name;
    }
    slot.addEventListener('pointerdown', (e) => { e.preventDefault(); selectSlot(i); });
    hotbarEl.append(slot);
  });
  const sel = state.hotbar[state.sel];
  hotbarEl.append(h('div', 'slot-name', sel ? ITEMS[sel].name : ''));
}

function showToast(msg: string) {
  const t = h('div', 'toast', msg);
  toastEl.append(t);
  while (toastEl.children.length > 4) toastEl.firstChild?.remove();
  setTimeout(() => t.classList.add('out'), 3800);
  setTimeout(() => t.remove(), 4400);
}
