// Always-on HUD: clock/season, pips, lanterns, hotbar, hint, quick buttons. (Toasts live in ui/toast.ts.)
import { coinIcon, itemIcon } from '../art/icons';
import { drawLantern } from '../art/lantern';
import { bus } from '../bus';
import { ITEMS, CURRENCY } from '../data';
import { selectSlot } from '../inventory';
import { getClock } from '../time';
import { state } from '../state';
import { unclaimedGifts, unreadLetters } from '../friends';
import { glyphEl, type PromptKey } from '../input/prompts';
import { h } from './dom';
import { buildEventBanner, refreshEventBanner } from './eventsUi';
import { buildMerchantChip, refreshMerchantChip } from './merchantUi';

let mailEl: HTMLButtonElement, mailCount: HTMLElement;
let clockEl: HTMLElement, seasonEl: HTMLElement, coinEl: HTMLElement, lanternEl: HTMLElement, hotbarEl: HTMLElement, hintEl: HTMLElement, lanternCanvas: HTMLCanvasElement;

export function buildHud(actions: { mail(): void; skills(): void; journal(tab: string): void; bag(): void; help(): void; map(): void; photo(): void }) {
  const ui = document.getElementById('ui')!;
  clockEl = h('div', 'clock');
  seasonEl = h('div', 'season');
  coinEl = h('span', '');
  lanternCanvas = document.createElement('canvas');
  lanternCanvas.width = lanternCanvas.height = 56; lanternCanvas.style.width = lanternCanvas.style.height = '28px';
  lanternEl = h('span', '');
  mailCount = h('span', '');
  mailEl = h('button', 'chip mail', h('span', 'mail-ico', '✉'), mailCount);
  mailEl.type = 'button'; mailEl.hidden = true; mailEl.title = 'Letters from friends';
  mailEl.onclick = () => actions.mail();
  const top = h('div', 'hud-top',
    h('div', 'chip time', clockEl, seasonEl),
    h('div', 'chip coin', coinIcon(20), coinEl),
    mailEl,
    (() => { const b = h('button', 'chip lantern', lanternCanvas, lanternEl); b.title = 'Afterglow Lanterns (L)'; b.onclick = () => actions.journal('lanterns'); return b; })(),
  );
  buildMerchantChip(top);
  const quick = h('div', 'hud-quick',
    ...([['✿ Journal', () => actions.journal('quests'), 'journal'], ['✧ Skills', actions.skills, 'skills'], ['❀ Log', () => actions.journal('collection'), 'collection'], ['❖ Bag', actions.bag, 'bag'], ['🗺 Map', actions.map, 'map'], ['📷 Photo', actions.photo, 'photo'], ['? Help', actions.help, 'help']] as [string, () => void, PromptKey][])
      .map(([t, f, k]) => { const b = h('button', 'btn small', t, glyphEl(k)); b.onclick = f; return b; }),
  );
  hotbarEl = h('div', 'hotbar');
  hintEl = h('div', 'hint');
  ui.append(top, quick, hotbarEl, hintEl);
  buildEventBanner(() => actions.journal('events'));
  bus.on('change', refreshHud);
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
  refreshEventBanner();
  refreshMerchantChip();
  const g = lanternCanvas.getContext('2d')!;
  g.clearRect(0, 0, 56, 56);
  g.save(); g.scale(1.6, 1.6); drawLantern(g, 'gift', 17.5, 17.5, 0.9, performance.now() / 1000, 0.7); g.restore();
}

export function refreshHud() {
  coinEl.textContent = `${state.coins} ${CURRENCY}`;
  lanternEl.textContent = String(state.lanterns.length);
  const unread = unreadLetters(), gifts = unclaimedGifts();
  mailEl.hidden = unread + gifts === 0;
  mailCount.textContent = String(unread || gifts);
  mailEl.title = unread ? `${unread} new ${unread === 1 ? 'letter' : 'letters'} from friends` : `${gifts} ${gifts === 1 ? 'gift' : 'gifts'} waiting in your letters`;
  hotbarEl.replaceChildren();
  state.hotbar.forEach((id, i) => {
    const slot = h('button', 'slot' + (i === state.sel ? ' sel' : ''), h('span', 'key', String(i + 1)));
    if (id) {
      slot.append(itemIcon(id, 34));
      if (ITEMS[id].kind !== 'tool') slot.append(h('span', 'qty', String(state.inv[id] ?? 0)));
      slot.title = ITEMS[id].name;
    }
    slot.type = 'button';
    slot.tabIndex = -1; // chosen by tap / click / 1-9 / LB RB, never by Tab focus
    slot.setAttribute('aria-label', `Hotbar slot ${i + 1}${id ? ': ' + ITEMS[id].name : ''}`);
    slot.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); selectSlot(i); });
    hotbarEl.append(slot);
  });
  const sel = state.hotbar[state.sel];
  hotbarEl.append(h('div', 'slot-name', sel ? ITEMS[sel].name : ''));
}
