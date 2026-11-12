// Café shift window: customer order ticket -> three-step timing mini-game (pour, steam, flourish) -> serve -> next
// customer -> recap. Copies the feel of events/pieBake.ts: a big press button, a sweeping heart, no way to fail.
// Closing the window never spends anything (the pantry supplies the ingredients, see shift.ts).
import { drawVillager } from '../art/characters';
import { drawCup } from '../art/shiftCup';
import { itemIcon } from '../art/icons';
import { enterPlace, leavePlace, sfx } from '../audio';
import { toast } from '../bus';
import { ITEMS } from '../data';
import { SHIFTS_PER_DAY, TIER_QUIP, countShift, orderLine, orderable, pickCustomers, serveCustomer, shiftsLeft, type Customer, type ServeResult } from '../shift';
import { skillLevel } from '../skills';
import { state } from '../state';
import { btn, h, isPanelOpen, openPanel, type PanelApi } from './dom';
import './shift.css';

type Rating = 'perfect' | 'nice' | 'cozy';
const RATING_TEXT: Record<Rating, string> = { perfect: 'Perfect! ✿', nice: 'Nice!', cozy: 'Cozy and close' };
const STEPS = [
  { name: 'Pour the base', hint: 'Press when the heart is in the pink zone', press: 'Pour!', width: 0.32, speed: 0.75 },
  { name: 'Steam the milk', hint: 'A touch quicker. Listen for the hum', press: 'Steam!', width: 0.28, speed: 0.95 },
  { name: 'Foam flourish', hint: 'One swirl for a pretty top', press: 'Swirl!', width: 0.24, speed: 1.1 },
];

/**
 * Start a shift (the café panel's Shifts tab calls this). `onExit` runs after the window closes, once nothing else has
 * opened in its place: the café passes "reopen me on the Shifts tab", so Done / ✕ / Back land her at the counter again.
 */
export function openShift(onExit?: () => void) {
  if (shiftsLeft() <= 0) { toast('You have worked today\'s shifts. Come back tomorrow ☾'); return; }
  if (!orderable().length) { toast('Unlock a café drink first ☕'); return; }
  const customers = pickCustomers();
  if (!customers.length) { toast('No customers yet. Make some friends first!'); return; }
  let idx = 0, phase: 'order' | 'make' | 'serve' | 'recap' = 'order', step = 0, ratings: Rating[] = [];
  let locked = false, closed = false, counted = false, result: ServeResult | null = null;
  let zoneC = 0.5, pos = 0, t0 = performance.now(), note = '';
  const tot = { tips: 0, friend: 0, xp: 0, served: 0, unlocks: [] as string[] };
  const lvl0 = skillLevel('brewing'), wardrobe0 = state.ownedClothes.length;
  const newZone = () => { zoneC = 0.22 + Math.random() * 0.56; t0 = performance.now(); pos = 0; };
  const perfects = () => ratings.filter((r) => r === 'perfect').length;

  openPanel('Café Shift ☕', (body, api) => {
    const c = customers[idx];
    if (phase === 'recap') return renderRecap(body, api);
    body.append(h('div', 'shift-count', `Customer ${idx + 1} of ${customers.length}`), customerHead(c));
    if (phase === 'order') return renderOrder(body, api, c);
    if (phase === 'make') return renderMake(body, api, c);
    renderServe(body, api, c);
  }, () => {
    closed = true;
    leavePlace();
    if (phase !== 'recap' && tot.served > 0) toast(`Closed up early: ${tot.tips} pips in tips ✿`);
    // deferred: closePanel() may be running inside another openPanel(), which must win
    if (onExit) setTimeout(() => { if (!isPanelOpen()) onExit(); }, 0);
  });
  enterPlace('cafe'); // replacing the café window ran its leavePlace(); keep the café music through the shift

  function customerHead(c: Customer) {
    const cv = document.createElement('canvas');
    cv.width = 90; cv.height = 100; cv.style.width = '90px'; cv.style.height = '100px';
    const g = cv.getContext('2d')!; g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 90, 100);
    drawVillager(g, c.def, 45, 90, performance.now() / 1000, 'down', false, 1.9);
    cv.className = 'portrait';
    return h('div', 'shift-customer', cv, h('div', 'grow', h('b', '', c.def.name), h('div', 'muted', c.def.personality)));
  }

  function renderOrder(body: HTMLElement, api: PanelApi, c: Customer) {
    body.append(
      h('div', 'bubble', orderLine(c)),
      h('div', 'shift-ticket', itemIcon(c.drink, 56), h('div', 'grow', h('b', '', ITEMS[c.drink].name), h('div', 'muted', ITEMS[c.drink].desc))),
      h('div', 'shift-note', 'The café pantry supplies the ingredients for shifts. Your bag stays untouched.'),
      btn('Start making ☕', () => { phase = 'make'; step = 0; ratings = []; note = ''; newZone(); api.rerender(); }, 'shift-go'),
    );
  }

  function cupCanvas(c: Customer, stepDone: number) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 150 * dpr; cv.height = 110 * dpr; cv.style.width = '150px'; cv.style.height = '110px'; cv.className = 'shift-cup';
    const g = cv.getContext('2d')!; g.scale(dpr, dpr);
    drawCup(g, 150, 110, { drink: c.drink, step: stepDone, perfects: perfects() });
    return cv;
  }

  function renderMake(body: HTMLElement, api: PanelApi, c: Customer) {
    const s = STEPS[step];
    const bar = h('div', 'pie-bar');
    const zone = h('div', 'pie-zone');
    zone.style.left = `${(zoneC - s.width / 2) * 100}%`; zone.style.width = `${s.width * 100}%`;
    const core = h('div', 'pie-zone-core');
    core.style.left = `${(zoneC - s.width / 5) * 100}%`; core.style.width = `${(s.width / 5) * 2 * 100}%`;
    const marker = h('div', 'pie-marker', '♥');
    bar.append(zone, core, marker);
    const noteEl = h('div', 'pie-note', note || s.hint);
    const press = btn(s.press, () => stop(), 'pie-press shift-press');
    const prog = h('div', 'pie-steps', ...STEPS.map((x, i) => h('span', 'pie-step' + (i < step ? ' done' : i === step ? ' now' : ''), i < step ? '✓ ' : '', x.name)));
    body.append(
      h('div', 'muted', `${ITEMS[c.drink].name}: three cozy steps. There is no way to fail, only to be extra pretty.`),
      cupCanvas(c, step), prog, bar, noteEl, press,
    );
    let raf = 0;
    const loop = () => {
      if (!locked) {
        const t = ((performance.now() - t0) / 1000) * s.speed;
        pos = Math.abs((((t % 2) + 2) % 2) - 1);
        marker.style.left = `${pos * 100}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    api.cleanup(() => cancelAnimationFrame(raf));

    function stop() {
      if (locked) return;
      locked = true;
      const d = Math.abs(pos - zoneC);
      const rating: Rating = d <= s.width / 5 ? 'perfect' : d <= s.width / 2 ? 'nice' : 'cozy';
      ratings.push(rating);
      note = RATING_TEXT[rating];
      noteEl.textContent = note; noteEl.classList.add(rating);
      sfx.tick();
      setTimeout(() => {
        if (closed) return; // closed mid-drink: nothing was spent, and the panel must not come back
        locked = false; note = '';
        step++;
        if (step >= STEPS.length) finishDrink(c); else newZone();
        api.rerender();
      }, 650);
    }
  }

  function finishDrink(c: Customer) {
    if (phase !== 'make' || closed) return; // never serve twice or after closing
    if (!counted) { counted = true; tot.unlocks.push(...countShift()); }
    result = serveCustomer(c, perfects());
    tot.tips += result.tip; tot.friend += result.friend; tot.xp += result.xp; tot.served++;
    sfx.ding();
    phase = 'serve';
  }

  function renderServe(body: HTMLElement, api: PanelApi, c: Customer) {
    const r = result!, last = idx >= customers.length - 1;
    body.append(
      cupCanvas(c, 3),
      h('div', 'pie-note perfect', TIER_QUIP[perfects()]),
      h('div', 'bubble', r.text),
      h('div', 'shift-pay', h('span', '', `+${r.tip} pips`), h('span', '', `+${r.friend} ♥`), h('span', '', `+${r.xp} Barista XP`)),
      btn(last ? 'Close up shop ✿' : 'Next customer', () => { if (phase !== 'serve') return; if (last) { phase = 'recap'; } else { idx++; phase = 'order'; } api.rerender(); }, 'shift-go'),
    );
  }

  function renderRecap(body: HTMLElement, api: PanelApi) {
    const lvl = skillLevel('brewing');
    const clothes = state.ownedClothes.length - wardrobe0;
    body.append(h('div', 'shift-recap',
      h('b', '', 'Shift complete! ✿'),
      h('div', 'muted', `${tot.served} cozy cup${tot.served === 1 ? '' : 's'} served. Shifts left today: ${shiftsLeft()} of ${SHIFTS_PER_DAY}.`),
      h('div', 'shift-pay', h('span', '', `${tot.tips} pips in tips`), h('span', '', `+${tot.friend} ♥`), h('span', '', `+${tot.xp} Barista XP`)),
      lvl > lvl0 ? h('div', '', `Barista level ${lvl}! ☕`) : null,
      tot.unlocks.length ? h('div', '', `New for home: ${tot.unlocks.join(', ')}`) : null,
      clothes > 0 ? h('div', '', `New in your wardrobe: ${clothes} piece${clothes === 1 ? '' : 's'} ✿`) : null,
      btn('Done', () => api.close(), 'shift-go'),
    ));
  }
}
