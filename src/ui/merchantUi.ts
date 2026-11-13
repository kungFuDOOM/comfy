// The traveling merchant's shop window (a small dialogue and today's rare finds) and her HUD chip.
import './merchant.css';
import { startAct } from '../actions';
import { drawMerchant } from '../art/merchantPortrait';
import { itemIcon } from '../art/icons';
import { clothById, SLOTS } from '../clothes';
import { CURRENCY } from '../data';
import { buyStock, closingText, greeting, line, meetToday, merchantPresent, nextVisitText, stockDesc, stockName, stockOwned, visitStock } from '../merchant';
import { LINES, MERCHANT } from '../merchantData';
import { state, type MerchantStock } from '../state';
import { btn, h, openPanel } from './dom';
import { canvasEl, clothThumb, price, typedBubble } from './panels';
import { toast } from '../bus';

function stockRow(s: MerchantStock, onBuy: () => void): HTMLElement {
  const cloth = s.kind === 'cloth' ? clothById(s.ref) : undefined;
  const sold = s.left <= 0, owned = stockOwned(s);
  const tags = h('div', 'tags');
  if (cloth) tags.append(h('span', 'mer-tag', `Outfit · ${SLOTS.find((x) => x.id === cloth.slot)?.label ?? cloth.slot}`));
  else tags.append(h('span', 'mer-tag', s.ref.startsWith('seed_') ? `Seeds ×${s.qty}` : 'Decor'));
  if (!sold) tags.append(h('span', 'mer-tag left', s.left === 1 ? 'Last one!' : `${s.left} left`));
  const act = sold ? btn('Sold out', () => undefined, 'small', true) : owned ? btn('Owned ✓', () => undefined, 'small', true) : btn(price(s.price), onBuy, 'small', state.coins < s.price);
  return h('div', 'card row-card mer-row' + (sold || owned ? ' sold' : ''),
    cloth ? clothThumb(cloth, false) : itemIcon(s.ref, 40),
    h('div', 'grow', h('b', '', stockName(s)), h('div', 'muted', stockDesc(s)), tags), act);
}

/** Open the stall: she greets you, and today's rare finds are laid out on the counter. */
export function openMerchant() {
  if (!merchantPresent()) { toast(`${MERCHANT.name} is away right now. She is back ${nextVisitText()}.`); return; }
  meetToday();
  startAct('wave', 1.1);
  let say = greeting();
  let note = '';
  openPanel(MERCHANT.stall, (body, api) => {
    const stock = visitStock();
    const portrait = canvasEl(110, 120, (g) => { g.fillStyle = '#f7eefd'; g.fillRect(0, 0, 110, 120); drawMerchant(g, 55, 112, 1.25, performance.now() / 1000); }, 'portrait');
    body.append(
      h('div', 'dlg', portrait, h('div', 'dlg-main',
        h('div', 'dlg-sub', `${MERCHANT.name} · ${MERCHANT.species}`),
        typedBubble(say, MERCHANT.id, api),
        note ? h('div', 'note', note) : null)),
      h('div', 'mer-sec', "Today's rare finds"),
      ...stock.map((s) => stockRow(s, () => {
        const r = buyStock(s);
        note = r === 'ok' ? `−${s.price} ${CURRENCY}` : '';
        say = r === 'ok' ? line('bought') : r === 'poor' ? line('broke') : r === 'closed' ? line('closing') : line('gone');
        api.rerender();
      })),
      h('div', 'muted small mer-note', `Her stock changes every visit. Open until ${closingText()}; next visit ${nextVisitText()}.`),
      h('div', 'row mer-foot', btn('Chat', () => { say = LINES.gossip[Math.floor(Math.random() * LINES.gossip.length)]; note = ''; api.rerender(); }), btn('Bye!', () => { say = line('bye'); api.close(); }, 'ghost')),
    );
  });
}

// ---- HUD chip ----
let chip: HTMLButtonElement | null = null, sub: HTMLElement | null = null;

/** Create the chip (once) inside the HUD's top row. It shows only while her stall is open. */
export function buildMerchantChip(parent: HTMLElement) {
  if (chip) return;
  sub = h('span', 'mer-sub');
  chip = h('button', 'chip merchant', h('span', 'mer-ico', '🎪'), h('span', 'mer-text', h('span', '', `${MERCHANT.name.split(' ')[0]} is in town`), sub));
  chip.type = 'button';
  chip.hidden = true;
  chip.title = `${MERCHANT.stall}: east of Sugarlily Square`;
  chip.addEventListener('click', () => toast(`${MERCHANT.stall} is just east of Sugarlily Square, open until ${closingText()}.`));
  parent.append(chip);
}

export function refreshMerchantChip() {
  if (!chip || !sub) return;
  const on = merchantPresent();
  if (chip.hidden === on) chip.hidden = !on;
  if (on) sub.textContent = `Stall open until ${closingText()}`;
}
