// Modal panels: dialogue, café, boutique, market, journal, bag, help.
import { startAct } from '../actions';
import { drawPlayer, drawVillager } from '../art/characters';
import { cheetahDataUrl } from '../art/cheetah';
import { coinIcon, itemIcon } from '../art/icons';
import { drawLantern, LANTERN_KINDS } from '../art/lantern';
import { enterPlace, leavePlace, sfx } from '../audio';
import { toast } from '../bus';
import { canBrew, brewing, isUnlocked, recipesFor, startBrew } from '../cafe';
import { buyDecor, currentAccessory, ownedAccessories, toggleAccessory } from '../boutique';
import { CLOTHES, SLOTS, STYLES, clothById, variantsOf, type ClothDef, type Slot, type StyleId } from '../clothes';
import { START_WORN } from '../clothes/start';
import { buyCloth, canTakeOff, dailyStock, endPreview, equipOn, howToGet, isSold, isWorn, lookIsOwned, owns, previewing, previewItem, resolveLook, selectedCloth, takeOff, tryOn, wearItem, wearPreview } from '../wardrobe';
import { PARTY_HAT, checklist, regionComplete } from '../regions';
import { dragSpin, dressing, nudgeSpin } from '../dressing';
import { startDressingRoom, stopDressingRoom } from '../render/dressingRoom';
import { CURRENCY, EVENT_PANTRY, ITEMS, QUESTS, SHOP_DECOR, SKILLS, type Bench, type Recipe, SHOP_INGREDIENTS, SHOP_SEEDS, VILLAGERS, type VillagerDef } from '../data';
import { addItem, assignHotbar, BAG_SLOTS, BANK_SLOTS, count, earn, moveStack, removeItem, spend, tidyBag } from '../inventory';
import { LOG_QUESTS, questsFrom, questStatus, questVisible, startQuest, statusText, turnIn } from '../questlog';
import { AREA_LIST } from '../areas';
import { barrierForArea, requirementMet, requirementText } from '../unlocks';
import { hasMovedIn } from '../npc';
import { isAreaOpen } from '../state';
import { skillName, skillProgress } from '../skills';
import { lanternCounts, SETS, slotPos } from '../lanterns';
import { give, talk } from '../npc';
import { recipeFriendOk, birthdayDone, celebrateBirthday, addPoints, bondLabel, hearts, infoOf, isBirthday, knownTastes } from '../friends';
import { heartRow, renderFriendsTab, tasteTag } from './friendsUi';
import { progress } from '../quests';
import { state } from '../state';
import { getClock } from '../time';
import { glyphEl } from '../input/prompts';
import { btn, h, openPanel, type PanelApi } from './dom';
import { renderEventsTab } from './eventsUi';
import { clearPetTrial, renderPetBody } from './petUi';
import { eventItemOpen, getActiveEvents } from '../events';
import { openShift } from './shiftUi';
import { SHIFTS_PER_DAY, orderable, shiftsLeft } from '../shift';
import { openCookieBake } from '../events/cookieBake';
import { canBakePie, openPieBake } from '../events/pieBake';
import { openPause } from './menuPanels';
import { npcs } from '../npc';
import { GROVE } from '../world';
import { renderMap } from './mapPanel';

const price = (n: number) => h('span', 'price', coinIcon(14), String(n));

function canvasEl(w: number, h2: number, draw: (g: CanvasRenderingContext2D) => void, cls = '') {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * dpr; c.height = h2 * dpr; c.style.width = w + 'px'; c.style.height = h2 + 'px'; c.className = cls;
  const g = c.getContext('2d')!; g.scale(dpr, dpr); draw(g);
  return c;
}

// ---------- Dialogue ----------
const TYPE_CPS = 46;
/** Speech bubble that types out its text with a per-speaker blip; tap it to show the whole line at once. */
function typedBubble(text: string, speaker: string, api: PanelApi): HTMLElement {
  const shownEl = h('span', ''), restEl = h('span', 'cs-rest');
  restEl.style.visibility = 'hidden'; // reserves the bubble's final size so it does not reflow
  restEl.textContent = text;
  const el = h('div', 'bubble', shownEl, restEl);
  let n = 0;
  const reveal = (to: number) => {
    n = Math.min(text.length, to);
    shownEl.textContent = text.slice(0, n);
    restEl.textContent = text.slice(n);
  };
  const t0 = performance.now();
  const iv = window.setInterval(() => {
    const want = Math.floor(((performance.now() - t0) / 1000) * TYPE_CPS);
    if (want <= n) return;
    for (let i = n; i < Math.min(text.length, want); i++) if (/\S/.test(text[i]) && i % 2 === 0) { sfx.blip(speaker, i); break; }
    reveal(want);
    if (n >= text.length) clearInterval(iv);
  }, 30);
  api.cleanup(() => clearInterval(iv));
  el.addEventListener('click', () => { reveal(text.length); clearInterval(iv); });
  return el;
}

export function openDialogue(def: VillagerDef) {
  const npc = npcs.find((n) => n.def.id === def.id);
  if (npc) npc.busy = true;
  startAct('wave', 1.1);
  let line = '';
  let note = '';
  const first = talk(def);
  line = first.text; note = first.gain ? `+${first.gain} friendship` : '';
  openPanel(def.name, (body, api) => {
    const portrait = canvasEl(110, 120, (g) => { g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 110, 120); drawVillager(g, def, 55, 108, performance.now() / 1000, 'down', false, 2.3); }, 'portrait');
    const giftable = Object.keys(state.inv).filter((id) => ['crop', 'drink', 'collectible', 'ingredient', 'seed', 'fish', 'treat', 'accessory'].includes(ITEMS[id].kind));
    body.append(...[
      h('div', 'dlg',
        portrait,
        h('div', 'dlg-main',
          h('div', 'dlg-sub', `${def.speciesName} · ${def.personality}`),
          heartRow(def.id, 'big'),
          h('div', 'muted small', `${bondLabel(def.id)} · ${hearts(def.id)}/10 ♥`),
          typedBubble(line, def.id, api),
          note ? h('div', 'note', note) : null,
        ),
      ),
      isBirthday(def.id) ? h('div', 'card fr-banner', h('div', 'grow', `🎂 It is ${def.name.split(' ')[0]}'s birthday! Gifts count double.`), btn(birthdayDone(def.id) ? '✓ Wished' : 'Wish happy birthday', () => { if (celebrateBirthday(def.id)) { addPoints(def.id, 20); line = infoOf(def.id)?.bdayThanks ?? 'Thank you!'; note = '+20 friendship ♥'; api.rerender(); } }, 'small', birthdayDone(def.id))) : null,
      ...questsFrom(def.id).map((q) => questBlock(q, (t) => { line = t; note = ''; api.rerender(); })).filter((e): e is HTMLElement => !!e),
      h('div', 'sub', (() => { const k = knownTastes(def.id).love; return `Give or serve something (${k.length ? `${def.name.split(' ')[0]} loves: ${k.map((l) => ITEMS[l].name).join(', ')}` : 'you are still learning what they love'})`; })()),
      giftable.length ? h('div', 'chips', ...giftable.map((id) => {
        const label = ITEMS[id].kind === 'drink' || ITEMS[id].kind === 'treat' ? 'Serve' : 'Give';
        const c = h('button', 'chip-item', itemIcon(id, 26), h('span', '', `${label} ${ITEMS[id].name} ×${count(id)} ${tasteTag(def.id, id)}`.trim()));
        c.addEventListener('click', () => { const r = give(def, id); if (r) { line = r.text; note = r.gain ? `+${r.gain} friendship ♥${r.birthday ? ' (birthday bonus!)' : ''}` : ''; api.rerender(); } });
        return c;
      })) : h('div', 'muted', 'Your bag has nothing to share yet. Brew a drink at the café or collect something lovely!'),
      h('div', 'row', btn('Chat again', () => { const r = talk(def); line = r.text; note = ''; api.rerender(); }), btn('Bye!', () => api.close(), 'ghost')),
    ].filter((e): e is HTMLElement => !!e));
  }, () => { if (npc) npc.busy = false; });
}

/** A quest offer / reminder / turn-in card inside a giver's dialogue. */
function questBlock(q: (typeof LOG_QUESTS)[number], say: (line: string) => void): HTMLElement | null {
  const st = questStatus(q);
  if (st === 'done') return null;
  const want = `${ITEMS[q.want.item].name} ${Math.min(count(q.want.item), q.want.n)}/${q.want.n}`;
  const card = h('div', 'card quest-offer', h('b', '', `✿ ${q.title}`));
  if (st === 'available') {
    card.append(h('div', 'muted', q.steps), btn('Sure, I\'ll help!', () => { startQuest(q); say(q.offer); }, 'small'));
  } else if (st === 'active') {
    card.append(h('div', 'muted', q.steps), h('div', 'needs', h('span', 'need no', itemIcon(q.want.item, 16), want)));
  } else {
    card.append(h('div', 'muted', 'You have everything they asked for!'),
      btn(h('span', 'inline', 'Hand it over ', price(q.reward)), () => { if (turnIn(q)) say(q.thanks); }, 'small'));
  }
  return card;
}

// ---------- Café ----------
const BENCH_VERB: Record<Bench, string> = { brew: 'Brew', bake: 'Bake', craft: 'Craft' };
const BENCH_INTRO: Record<Bench, string> = {
  brew: 'Brew a drink, then offer it to a friend — serving a cup is a lovely moment.',
  bake: 'Warm treats from the café oven. Berries and blossoms from the meadow work wonders.',
  craft: 'Make small handmade accessories at the Crafting Table. Sell them, or keep them close.',
};

/** Recipe cards for one bench (locked ones stay visible but greyed), plus the shared timer bar. */
function recipeList(body: HTMLElement, api: PanelApi, bench: Bench) {
  body.append(h('div', 'muted', BENCH_INTRO[bench]));
  for (const r of recipesFor(bench) as Recipe[]) {
    const def = ITEMS[r.id], open = isUnlocked(r);
    const seasonal = !!r.event;
    const ok = seasonal ? canBakePie(r) : canBrew(r.id) && !brewing.id;
    body.append(h('div', 'card row-card' + (open ? '' : ' locked'),
      itemIcon(r.id, 40),
      h('div', 'grow', h('b', '', def.name), h('div', 'muted', def.desc),
        open ? null : h('div', 'lock-note', r.friend && !recipeFriendOk(r.friend) ? `🔒 Reach 10 hearts with ${VILLAGERS.find((v) => v.id === r.friend)?.name.split(' ')[0] ?? 'a friend'} to learn it` : `🔒 Needs ${skillName(r.skill)} level ${r.level}`),
        h('div', 'needs', ...Object.entries(r.needs).map(([k, n]) => h('span', count(k) >= n ? 'need ok' : 'need no', itemIcon(k, 16), `${ITEMS[k].name} ${count(k)}/${n}`))),
        open ? h('div', 'muted small', `${seasonal ? (r.event === 'twinkle' ? 'Seasonal cookies, a little timing game · ' : 'Seasonal pie, a little timing game · ') : ''}+${r.xp} ${skillName(r.skill)} XP`) : null),
      btn(seasonal ? (r.event === 'twinkle' ? 'Bake 🍪' : 'Bake 🥧') : BENCH_VERB[bench], () => { if (seasonal) (r.event === 'twinkle' ? openCookieBake : openPieBake)(r.id); else if (startBrew(r.id)) api.rerender(); }, '', !ok || !open),
    ));
  }
  if (brewing.id) {
    const bar = h('div', 'bar', h('div', 'fill'));
    body.append(h('div', 'brewing', `Making ${ITEMS[brewing.id].name}…`, bar));
    const iv = setInterval(() => {
      if (!brewing.id) { api.rerender(); return; }
      (bar.firstChild as HTMLElement).style.width = `${100 - (brewing.left / brewing.total) * 100}%`;
    }, 80);
    api.cleanup(() => clearInterval(iv));
  }
}

export function openCafe(start: 'brew' | 'bake' | 'shifts' | 'pantry' = 'brew') {
  let tab = start;
  enterPlace('cafe');
  openPanel('Puddle & Pip Café', (body, api) => {
    const t = (id: typeof tab, label: string) => tabBtn(label, tab === id, () => { tab = id; api.rerender(); });
    body.append(h('div', 'tabs', t('brew', 'Brew'), t('bake', 'Bake'), t('shifts', 'Shifts'), t('pantry', 'Pantry')));
    if (tab === 'brew' || tab === 'bake') recipeList(body, api, tab);
    else if (tab === 'shifts') shiftsTab(body);
    else {
      body.append(h('div', 'muted', 'Fresh ingredients for the counter.'));
      for (const id of SHOP_INGREDIENTS) body.append(shopRow(id, ITEMS[id].buy!, () => buyItem(id, api)));
      for (const e of getActiveEvents()) {
        const extra = (EVENT_PANTRY[e.id] ?? []).filter(eventItemOpen); // week-gated goods wait for their chapter
        if (extra.length) body.append(h('div', 'ev-sec', `${e.icon} ${e.name} specials`), ...extra.map((id) => shopRow(id, ITEMS[id].buy!, () => buyItem(id, api))));
      }
    }
  }, () => leavePlace());
}

/** Shifts tab: how a shift works, today's shifts left, and the big Start button. */
function shiftsTab(body: HTMLElement) {
  const left = shiftsLeft(), menu = orderable();
  body.append(
    h('div', 'muted', 'Tie on an apron and run the counter! A few friends drop in, one at a time. Make each order with a little timing game: a prettier cup means bigger tips, more hearts and more Barista XP.'),
    h('div', 'card', h('b', '', `Shifts today: ${left} of ${SHIFTS_PER_DAY} left`),
      h('div', 'muted', `The pantry stocks everything for shifts, so your bag stays untouched. Shifts worked so far: ${state.cafe.shifts}.`),
      h('div', 'muted small', `On the menu: ${menu.map((r) => ITEMS[r.id].name).join(', ') || 'nothing yet'}. More drinks unlock as your Barista level grows.`)),
    btn(left <= 0 ? 'All done for today ☾' : menu.length ? 'Start a shift ☕' : 'Unlock a drink first ☕', () => openShift(() => openCafe('shifts')), 'shift-go', left <= 0 || !menu.length),
  );
}

function buyItem(id: string, api: PanelApi) {
  if (spend(ITEMS[id].buy ?? 0)) { addItem(id); api.rerender(); } else toast('Not enough pips yet.');
}
const tabBtn = (t: string, on: boolean, f: () => void) => btn(t, f, 'tab' + (on ? ' on' : ''));
function shopRow(id: string, cost: number, onBuy: () => void) {
  return h('div', 'card row-card', itemIcon(id, 36), h('div', 'grow', h('b', '', ITEMS[id].name), h('div', 'muted', ITEMS[id].desc)),
    h('span', 'own', `own ${count(id)}`), btn(price(cost), onBuy, '', state.coins < cost));
}

// ---------- Dressing room (boutique Outfits tab, Bag › Wardrobe) ----------
/**
 * Switch the open panel into (or out of) the fitting-room layout: the camera cuts to a close-up of the
 * player in a little boutique fitting room (render/dressingRoom.ts), the card docks to the side (landscape)
 * or the bottom (portrait), and the open area becomes a drag-to-spin stage.
 */
function setDressing(body: HTMLElement, api: PanelApi, on: boolean) {
  const card = body.parentElement!, root = card.parentElement!;
  card.classList.toggle('dress', on);
  root.classList.toggle('dressing', on);
  root.querySelector(':scope > .dress-hint')?.remove();
  if (!on) {
    // leaving the fitting room for another tab: take off whatever was only being tried on
    if (dressing.active) { stopDressingRoom(); endPreview(); }
    document.body.classList.remove('dressing');
    return;
  }
  document.body.classList.add('dressing');
  api.cleanup(() => document.body.classList.remove('dressing')); // re-added straight away by a re-render
  startDressingRoom();
  root.prepend(h('div', 'dress-hint',
    h('span', 'dh-touch', '☜ drag to spin ☞'), h('span', 'dh-keyboard', '[ ] or ◀ ▶ to turn'), h('span', 'dh-gamepad', 'Stick to turn ✿')));
  // drag / swipe anywhere outside the card turns the character, and a flick keeps it twirling
  let id = -1, lx = 0, lt = 0;
  const down = (e: PointerEvent) => {
    if (e.target !== root && !(e.target as Element).classList?.contains('dress-hint')) return;
    id = e.pointerId; lx = e.clientX; lt = performance.now();
    dressing.dragging = true; dressing.vel = 0;
    root.setPointerCapture(id); root.classList.add('dragging');
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const now = performance.now();
    dragSpin(e.clientX - lx, (now - lt) / 1000);
    lx = e.clientX; lt = now;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1; dressing.dragging = false; root.classList.remove('dragging');
    if (performance.now() - lt > 90) dressing.vel = 0; // held still before letting go: no flick
  };
  root.addEventListener('pointerdown', down);
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
  api.cleanup(() => {
    root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up);
    dressing.dragging = false; dressing.hold = 0;
  });
}

/** ◀ / ▶: hold (touch / mouse) to keep turning; click, Enter / A, or ◀ ▶ while focused nudge a quarter-ish turn. */
function spinBtn(label: string, aria: string, dir: number) {
  const b = btn(label, () => nudgeSpin(dir), 'small spin');
  b.dataset.spin = String(dir);
  b.setAttribute('aria-label', aria);
  b.title = aria;
  b.addEventListener('pointerdown', () => { dressing.hold = dir; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const) b.addEventListener(ev, () => { dressing.hold = 0; });
  return b;
}

/** Filters the dressing panel remembers while it stays open. */
interface DressUi { slot: Slot | 'all'; style: StyleId | 'all' }
const newDressUi = (): DressUi => ({ slot: 'all', style: 'all' });

/** A small picture of an item on the default look. Hats / glasses zoom to the head, shoes to the feet. Locked items are silhouettes. */
function clothThumb(c: ClothDef, locked: boolean) {
  return canvasEl(46, 52, (g) => {
    g.fillStyle = locked ? '#f3e9ef' : '#fff0f6'; g.fillRect(0, 0, 46, 52);
    const look = resolveLook(equipOn({ ...START_WORN }, c));
    const head = c.slot === 'hat' || c.slot === 'face', feet = c.slot === 'shoes';
    const sc = head ? 1.75 : feet ? 2.1 : 1.0;
    const cy = head ? 26 + 27.5 * sc : feet ? 22 : 46;
    if (locked) { const t = document.createElement('canvas'); t.width = 46; t.height = 52; const tg = t.getContext('2d')!; drawPlayer(tg, 23, cy, look, 'down', false, 0, sc); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#cdbcc9'; tg.fillRect(0, 0, 46, 52); g.drawImage(t, 0, 0); }
    else drawPlayer(g, 23, cy, look, 'down', false, 0, sc);
  });
}

/** The fitting-room controls: turn buttons, the selected piece, Buy / Wear + Back, filters, and a grid of pieces with colour dots. */
function dressingView(body: HTMLElement, api: PanelApi, mode: 'shop' | 'wardrobe', ui: DressUi) {
  const shop = mode === 'shop';
  const sel = selectedCloth();
  const owned = !!sel && owns(sel.id), wearing = !!sel && isWorn(sel.id), sold = !!sel && isSold(sel);
  const status = !sel ? '' : wearing ? 'Wearing ✓' : owned ? 'Yours · trying on' : sold ? 'Trying on' : '🔒 Not earned yet';
  body.append(
    h('div', 'dress-stage',
      spinBtn('◀', 'Turn left', -1),
      h('div', 'dress-name', h('b', '', sel?.name ?? 'Your look'), h('span', 'dress-status', status, sel && !owned && sold ? price(sel.price) : null)),
      spinBtn('▶', 'Turn right', 1)),
    h('div', 'dress-actions',
      !sel ? null
        : !owned ? (sold ? btn(h('span', 'inline', 'Buy ', price(sel.price)), () => { buyCloth(sel.id); api.rerender(); }, 'dress-main', state.coins < sel.price) : btn('Locked 🔒', () => {}, 'dress-main', true))
          : !wearing ? btn('Wear ✿', () => { wearItem(sel.id); api.rerender(); }, 'dress-main')
            : canTakeOff(sel.slot) ? btn('Take off', () => { takeOff(sel.slot); api.rerender(); }, 'dress-main ghost')
              : btn('Wearing ✓', () => {}, 'dress-main', true),
      previewing() && lookIsOwned() ? btn('Wear look', () => { wearPreview(); api.rerender(); }, 'dress-main') : null,
      btn('Back', () => api.close(), 'ghost dress-back')),
  );
  if (sel) body.append(h('div', 'muted small dress-desc', sel.desc, !owned ? ` ${howToGet(sel)}.` : ''));

  // what this view can show: the day's stock, or everything owned plus the not-for-sale pieces still to earn
  const all = shop ? dailyStock() : CLOTHES.filter((c) => owns(c.id) || !isSold(c));
  const slotOk = (c: ClothDef) => ui.slot === 'all' || c.slot === ui.slot;
  const bySlot = all.filter(slotOk);
  const styles = STYLES.filter((st) => bySlot.some((c) => c.style === st.id));
  if (ui.style !== 'all' && !styles.some((st) => st.id === ui.style)) ui.style = 'all';
  const shown = bySlot.filter((c) => ui.style === 'all' || c.style === ui.style);

  const slotTab = (id: Slot | 'all', label: string, icon: string) =>
    btn(h('span', 'inline', icon, ' ', label), () => { ui.slot = id; api.rerender(); }, 'chip-tab' + (ui.slot === id ? ' on' : ''));
  body.append(
    h('div', 'dress-filter dress-slots', slotTab('all', 'All', '✿'), ...SLOTS.map((s) => slotTab(s.id, s.label, s.icon))),
    h('div', 'dress-filter dress-styles',
      btn('All styles', () => { ui.style = 'all'; api.rerender(); }, 'chip-tab small' + (ui.style === 'all' ? ' on' : '')),
      ...styles.map((st) => btn(h('span', 'inline', st.icon, ' ', st.label), () => { ui.style = st.id; api.rerender(); }, 'chip-tab small' + (ui.style === st.id ? ' on' : '')))));

  // one tile per colour family; the dots switch between its colours
  const groups = new Map<string, ClothDef[]>();
  for (const c of shown) (groups.get(c.slot + ':' + c.group) ?? groups.set(c.slot + ':' + c.group, []).get(c.slot + ':' + c.group)!).push(c);
  const list = h('div', 'dress-list');
  if (!groups.size) list.append(h('div', 'muted small', shop ? 'Nothing like that on the racks today. Try another filter!' : 'Nothing here yet. Shop, craft, and finish quests to fill the wardrobe.'));
  for (const fam of groups.values()) {
    const cur = fam.find((c) => c.id === sel?.id) ?? fam.find((c) => isWorn(c.id)) ?? fam[0];
    const mine = owns(cur.id), locked = !mine && !isSold(cur);
    const tile = h('div', 'dress-tile' + (sel?.id === cur.id ? ' on' : '') + (isWorn(cur.id) ? ' worn' : '') + (locked ? ' locked' : ''));
    const main = h('button', 'dt-main', clothThumb(cur, locked),
      h('span', 'dt-text', h('b', '', locked ? '???' : cur.name),
        h('span', 'muted small', isWorn(cur.id) ? '✓ Wearing' : mine ? 'Owned' : locked ? howToGet(cur) : '', !mine && !locked ? price(cur.price) : null)));
    main.title = locked ? howToGet(cur) : cur.desc;
    main.addEventListener('click', () => { if (shop) tryOn(cur.id); else previewItem(cur.id); api.rerender(); });
    tile.append(main);
    const sibs = fam.length > 1 ? fam : variantsOf(cur).filter((v) => shown.includes(v));
    if (sibs.length > 1) {
      tile.append(h('div', 'dress-dots', ...sibs.map((v) => {
        const d = h('button', 'cdot' + (v.id === cur.id ? ' on' : '') + (owns(v.id) ? ' own' : ''));
        d.style.background = v.color; d.style.setProperty('--trim', v.trim);
        d.title = v.tint; d.setAttribute('aria-label', v.tint);
        d.addEventListener('click', () => { if (shop) tryOn(v.id); else previewItem(v.id); api.rerender(); });
        return d;
      })));
    }
    list.append(tile);
  }
  body.append(list);
  // accessories: handmade at the Crafting Table, worn as a small visible clip on the head
  const accs = ownedAccessories(), worn = currentAccessory();
  body.append(h('div', 'sub', 'Hair pins'),
    accs.length ? h('div', 'chips dress-acc', ...accs.map((id) => {
      const c = h('button', 'chip-item' + (worn === id ? ' on' : ''), itemIcon(id, 22), h('span', '', `${ITEMS[id].name}${worn === id ? ' ✓' : ''}`));
      c.title = worn === id ? 'Tap to take it off' : 'Tap to wear it';
      c.addEventListener('click', () => { toggleAccessory(id); api.rerender(); });
      return c;
    })) : h('div', 'muted small', 'Make a bow clip, seashell charm or petal pin at the Crafting Table near the boutique to wear it here.'));
}

// ---------- Crafting Table (standalone station near the boutique) ----------
export function openCrafting() {
  enterPlace('boutique');
  openPanel('Crafting Table', (body, api) => {
    recipeList(body, api, 'craft');
  }, () => leavePlace());
}

// ---------- Boutique ----------
export function openBoutique() {
  let tab: 'outfits' | 'decor' | 'pets' = 'outfits';
  const ui = newDressUi();
  clearPetTrial();
  enterPlace('boutique');
  openPanel('Spot & Bow Boutique', (body, api) => {
    body.style.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
    body.append(h('div', 'cheetah-band'),
      h('div', 'tabs', tabBtn('Outfits', tab === 'outfits', () => { tab = 'outfits'; api.rerender(); }), tabBtn('Decor', tab === 'decor', () => { tab = 'decor'; api.rerender(); }), tabBtn('Pets', tab === 'pets', () => { tab = 'pets'; api.rerender(); })));
    setDressing(body, api, tab === 'outfits');
    if (tab === 'outfits') {
      dressingView(body, api, 'shop', ui);
    } else if (tab === 'pets') {
      renderPetBody(body, api, true);
    } else {
      body.append(h('div', 'muted', 'Decor for your yard. Select it on the hotbar and face a yard tile.'));
      for (const id of SHOP_DECOR) body.append(shopRow(id, ITEMS[id].buy!, () => { if (buyDecor(id)) api.rerender(); }));
    }
  }, () => { stopDressingRoom(); endPreview(); clearPetTrial(); leavePlace(); }, true);
}

// ---------- Market ----------
export function openMarket() {
  let tab: 'buy' | 'sell' = 'buy';
  openPanel('Tuppence Cart', (body, api) => {
    body.append(h('div', 'tabs', tabBtn('Buy', tab === 'buy', () => { tab = 'buy'; api.rerender(); }), tabBtn('Sell', tab === 'sell', () => { tab = 'sell'; api.rerender(); })));
    if (tab === 'buy') {
      for (const id of [...SHOP_SEEDS, ...SHOP_INGREDIENTS]) body.append(shopRow(id, ITEMS[id].buy!, () => buyItem(id, api)));
    } else {
      const ids = Object.keys(state.inv).filter((id) => ITEMS[id].sell && count(id) > 0);
      if (!ids.length) body.append(h('div', 'muted', 'Nothing to sell yet. Harvest, brew, or go treasure hunting!'));
      for (const id of ids) {
        const s = ITEMS[id].sell!;
        body.append(h('div', 'card row-card', itemIcon(id, 36), h('div', 'grow', h('b', '', ITEMS[id].name), h('div', 'muted', `×${count(id)}`)),
          btn(h('span', 'inline', 'Sell 1 ', price(s)), () => { if (removeItem(id)) { earn(s); api.rerender(); } }, 'small'),
          count(id) > 1 ? btn('All', () => { const n = count(id); if (removeItem(id, n)) { earn(s * n); api.rerender(); } }, 'small ghost') : null));
      }
    }
  });
}

// ---------- Bag + wardrobe ----------
/** Old saves may hold more stacks than the bag fits; send the overflow to the chest once and say so. */
function tidyOnOpen() {
  const n = tidyBag();
  if (n > 0) toast(`${n} ${n === 1 ? 'stack' : 'stacks'} moved to the Softkeep Chest to make room.`);
}

export function openBag(start: 'items' | 'wardrobe' | 'pet' = 'items') {
  let tab: 'items' | 'wardrobe' | 'pet' = start;
  const ui = newDressUi();
  tidyOnOpen();
  openPanel('Bag', (body, api) => {
    body.append(h('div', 'tabs', tabBtn('Items', tab === 'items', () => { tab = 'items'; api.rerender(); }), tabBtn('Wardrobe', tab === 'wardrobe', () => { tab = 'wardrobe'; api.rerender(); }),
      state.pet ? tabBtn(state.pet.name, tab === 'pet', () => { tab = 'pet'; api.rerender(); }) : null));
    setDressing(body, api, tab === 'wardrobe');
    if (tab === 'pet') {
      renderPetBody(body, api, false);
    } else if (tab === 'items') {
      const ids = Object.keys(state.inv);
      body.append(h('div', 'muted', `Tap an item to put it in your selected hotbar slot. ${ids.length}/${BAG_SLOTS} slots used.`));
      const grid = h('div', 'bag');
      for (const id of ids) {
        const cell = h('button', 'bagcell', itemIcon(id, 36), h('span', 'qty', ITEMS[id].kind === 'tool' ? '' : String(state.inv[id])), h('span', 'nm', ITEMS[id].name));
        cell.title = ITEMS[id].desc;
        cell.addEventListener('click', () => { assignHotbar(id); api.rerender(); });
        grid.append(cell);
      }
      for (let i = ids.length; i < BAG_SLOTS; i++) grid.append(h('div', 'bagcell empty', h('span', 'nm', '\u00a0')));
      body.append(grid, h('div', 'muted small', 'Spare things keep safe in the Softkeep Chest, in the yard by your home.'));
    } else {
      dressingView(body, api, 'wardrobe', ui);
    }
  }, () => { stopDressingRoom(); endPreview(); });
}

// ---------- Softkeep Chest ----------
export function openChest() {
  let tab: 'bag' | 'chest' = 'bag';
  tidyOnOpen();
  openPanel('Softkeep Chest', (body, api) => {
    const inBag = tab === 'bag';
    const store = inBag ? state.inv : state.bank;
    const ids = Object.keys(store);
    body.append(h('div', 'tabs', tabBtn(`Bag ${Object.keys(state.inv).length}/${BAG_SLOTS}`, inBag, () => { tab = 'bag'; api.rerender(); }),
      tabBtn(`Chest ${Object.keys(state.bank).length}/${BANK_SLOTS}`, !inBag, () => { tab = 'chest'; api.rerender(); })));
    body.append(h('div', 'muted', inBag ? 'Tap an item to tuck 1 into the chest. Tools stay with you.' : 'Tap an item to take 1 back into your bag.'));
    const grid = h('div', 'bag');
    for (const id of ids) {
      const n = store[id], to = inBag ? 'bank' : 'bag';
      const cell = h('button', 'bagcell', itemIcon(id, 36), h('span', 'qty', ITEMS[id].kind === 'tool' ? '' : String(n)), h('span', 'nm', ITEMS[id].name));
      cell.title = ITEMS[id].desc;
      cell.addEventListener('click', () => { moveStack(id, 1, to); api.rerender(); });
      grid.append(cell);
    }
    for (let i = ids.length; i < (inBag ? BAG_SLOTS : BANK_SLOTS); i++) grid.append(h('div', 'bagcell empty', h('span', 'nm', '\u00a0')));
    body.append(grid);
    const movable = ids.filter((id) => !(inBag && ITEMS[id].kind === 'tool'));
    body.append(h('div', 'row end',
      btn(inBag ? 'Move all to chest' : 'Move all to bag', () => {
        let moved = 0;
        for (const id of movable) moved += moveStack(id, store[id] ?? 0, inBag ? 'bank' : 'bag') > 0 ? 1 : 0;
        if (moved) toast(`${moved} ${moved === 1 ? 'stack' : 'stacks'} moved.`);
        api.rerender();
      }, 'small', !movable.length),
      btn('Done', () => api.close(), 'small ghost')));
  }, undefined, true);
}

// ---------- Journal ----------
export function openJournal(start = 'quests') {
  let tab = start;
  openPanel('Journal', (body, api) => {
    const t = (id: string, label: string) => tabBtn(label, tab === id, () => { tab = id; api.rerender(); });
    body.append(h('div', 'tabs', t('quests', 'Quests'), t('skills', 'Skills'), t('collection', 'Collection'), t('friends', 'Friends'), t('island', 'Island'), t('map', 'Map'), t('lanterns', 'Lanterns'), t('events', getActiveEvents().length ? `Events ${getActiveEvents()[0].icon}` : 'Events')));
    // the card widens / goes two-column for skills on phones (scenes.css); other tabs keep their usual size
    body.parentElement?.classList.toggle('skills-open', tab === 'skills');
    if (tab === 'skills') {
      body.append(h('div', 'muted skills-intro', 'Everything you do around the island quietly grows a skill. No rush — there is no losing here.'));
      const list = h('div', 'skills-list');
      for (const sk of SKILLS) {
        const p = skillProgress(sk.id);
        const bar = h('div', 'bar', h('div', 'fill'));
        (bar.firstChild as HTMLElement).style.width = `${p.maxed ? 100 : Math.round((p.into / p.need) * 100)}%`;
        list.append(h('div', 'card skill-card',
          h('div', 'skill-icon', sk.icon),
          h('div', 'grow',
            h('div', 'skill-head', h('span', 'skill-name', sk.name), h('span', 'skill-lvl', `Lv ${p.level}`)),
            h('div', 'muted skill-blurb', sk.blurb), bar,
            h('div', 'muted small skill-xp', p.maxed ? 'Fully bloomed ✿' : `${p.into} / ${p.need} XP to Lv ${p.level + 1}`))));
      }
      body.append(list);
    } else if (tab === 'quests') {
      for (const q of LOG_QUESTS.filter(questVisible)) {
        const st = questStatus(q);
        body.append(h('div', 'card quest' + (st === 'done' ? ' done' : ''),
          h('div', 'grow', h('b', '', (st === 'done' ? '✓ ' : '✿ ') + q.title), h('div', 'muted', st === 'available' ? statusText(q, st) : q.steps), h('div', 'muted small', statusText(q, st))),
          h('span', 'tag', 'Errand'), h('span', 'price', coinIcon(14), String(q.reward))));
      }
      for (const q of QUESTS) {
        const done = !!state.quests[q.id];
        body.append(h('div', 'card quest' + (done ? ' done' : ''),
          h('div', 'grow', h('b', '', (done ? '✓ ' : '') + q.title), h('div', 'muted', q.desc)),
          h('span', 'tag', q.loop), h('span', 'prog', `${progress(q)}/${q.goal}`), h('span', 'price', coinIcon(14), String(q.reward))));
      }
    } else if (tab === 'collection') {
      body.append(h('div', 'muted', 'Everything you have found around the island.'));
      const grid = h('div', 'bag');
      for (const id of ['shell', 'blossom', 'moth', 'button']) {
        const n = state.found[id] ?? 0;
        const cell = h('div', 'bagcell' + (n ? '' : ' locked'), itemIcon(id, 40), h('span', 'qty', n ? `×${n}` : ''), h('span', 'nm', n ? ITEMS[id].name : '???'));
        cell.title = n ? ITEMS[id].desc : 'Not found yet';
        grid.append(cell);
      }
      const hint = { shell: 'Beaches', blossom: 'Meadows & the grove', moth: 'Dusk & night', button: 'The grove hillside' };
      body.append(grid, h('div', 'muted small', `Where to look — ${Object.entries(hint).map(([k, v]) => `${ITEMS[k].name}: ${v}`).join(' · ')}.`));
      body.append(h('div', 'muted small', `Season (${getClock().season.name}): ${getClock().season.blurb}`));
    } else if (tab === 'friends') {
      renderFriendsTab(body, api);
    } else if (tab === 'events') {
      renderEventsTab(body, clothThumb);
    } else if (tab === 'map') {
      renderMap(body, api);
    } else if (tab === 'island') {
      body.append(h('div', 'muted small', state.partyHats.includes('star') ? '🌟 Every region is complete — the Island Star hat is yours!' : 'Complete a region to earn its party hat. Complete all six for the golden Island Star hat.'));
      body.append(h('div', 'muted', 'Sugarlily Isle is bigger than it looks. Cute barriers keep the farther corners shut until you are ready.'));
      for (const a of AREA_LIST) {
        const open = isAreaOpen(a.id);
        const b = barrierForArea(a.id);
        const friend = VILLAGERS.find((v) => v.area === a.id);
        body.append(h('div', 'card row-card' + (open ? '' : ' locked'),
          h('div', 'skill-icon', open ? '🌸' : '🔒'),
          h('div', 'grow',
            h('b', '', a.name),
            h('div', 'muted', a.blurb),
            open
              ? h('div', 'muted small', a.id === 'town' ? 'Open — always' : `Open ✓${friend ? ` · ${friend.name.split(' ')[0]} lives here` : ''}`)
              : h('div', 'lock-note', `🔒 ${b!.name}: needs ${requirementText(a.req!)}${requirementMet(a.req!) ? ' — you can open it now!' : ''}`),
            h('ul', 'region-list', ...checklist(a.id).map((st) => h('li', st.done ? 'done' : '', `${st.done ? '✓' : '○'} ${st.label}`))),
            h('div', 'muted small', regionComplete(a.id) ? `🎉 Complete! ${clothById(PARTY_HAT[a.id])?.name} is in your wardrobe.` : `Finish these for the ${clothById(PARTY_HAT[a.id])?.name}.`))));
      }
    } else {
      renderLanternTab(body, api);
    }
    body.append(h('div', 'row end', btn('❚❚ Pause menu', () => openPause(), 'ghost small')));
  });
}

function renderLanternTab(body: HTMLElement, api: PanelApi) {
  const W = 560, H = 210;
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.className = 'grove-canvas';
  const g = cv.getContext('2d')!;
  const t0 = performance.now();
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5a4a8f'); sky.addColorStop(1, '#f2a7c8');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(t + i) * 0.2})`; g.fillRect((i * 97) % W, (i * 53) % 110, 1.6, 1.6); }
    g.fillStyle = '#b9a2e0'; g.beginPath(); g.moveTo(0, H); g.quadraticCurveTo(W * 0.5, H - 110, W, H); g.fill();
    g.fillStyle = '#a58bd4'; g.beginPath(); g.moveTo(0, H); g.quadraticCurveTo(W * 0.3, H - 70, W * 0.7, H); g.fill();
    // map the world slots into this little preview
    g.save();
    const ox = W / 2 - GROVE.x, oy = H - 60 - GROVE.y;
    g.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    const total = state.lanterns.length;
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.setLineDash([3, 4]); g.beginPath();
    state.lanterns.forEach((_l, i) => { const p = slotPos(i); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); g.stroke(); g.setLineDash([]);
    for (let i = total; i < Math.max(10, total + 3); i++) { const p = slotPos(i); g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(p.x, p.y, 2, 0, 7); g.fill(); }
    state.lanterns.forEach((l, i) => { const p = slotPos(i); drawLantern(g, l.kind, p.x, p.y, 0.95, t, 1.1); });
    g.restore();
  };
  draw();
  const iv = setInterval(draw, 60);
  api.cleanup(() => clearInterval(iv));
  const counts = lanternCounts();
  body.append(cv, h('div', 'muted', `${state.lanterns.length} lanterns glow on the hillside. Do kind things, and more will drift up.`));
  body.append(h('div', 'lantern-kinds', ...LANTERN_KINDS.map((k) => h('div', 'lk',
    canvasEl(40, 44, (c2) => drawLantern(c2, k.id, 20, 22, 0.9, 0, 0.8)), h('b', '', k.name), h('div', 'muted small', k.moment), h('div', 'tag', `×${counts[k.id] ?? 0}`)))));
  body.append(h('div', 'sub', 'Constellation sets'));
  for (const s of SETS) {
    const done = state.setsDone.includes(s.id);
    body.append(h('div', 'card quest' + (done ? ' done' : ''), h('div', 'grow', h('b', '', (done ? '✓ ' : '') + s.name), h('div', 'muted', s.goal),
      h('div', 'muted small', `Unlocks later: ${s.unlock} — arriving in a future update`)), h('span', 'price', coinIcon(14), String(s.reward))));
  }
}

// ---------- Help ----------
type HelpRow = [string, string];
/** One card per device. CSS floats the card for the device used last to the top (body.input-*). */
export const HELP: { mode: 'keyboard' | 'gamepad' | 'touch'; title: string; rows: HelpRow[] }[] = [
  { mode: 'keyboard', title: 'Keyboard & mouse', rows: [
    ['WASD / Arrows', 'Walk, smoothly and relative to the camera'], ['Shift', 'Hold to run'],
    ['E / Space', 'Talk, shop, and use what you are facing'], ['F', 'Use the selected hotbar item on the tile in front'],
    ['Click', 'Walk there, or interact with what you click'], ['1–9 / Q R / Wheel', 'Choose a hotbar slot'],
    ['B', 'Bag & wardrobe'], ['J', 'Journal'], ['K', 'Skills'], ['L', 'Lantern grove'], ['H', 'This help'], ['Esc', 'Pause menu (settings, back to title) · closes a window'],
    ['[ ]  ·  - =', 'Orbit camera  ·  zoom (Backspace resets)'],
  ] },
  { mode: 'gamepad', title: 'Controller', rows: [
    ['Left stick', 'Walk — tilt sets the pace, and a full tilt is a normal walk'], ['A', 'Talk, shop, interact'],
    ['B', 'Hold to run · cancel · close a window'], ['X', 'Use the selected hotbar item on the tile in front'],
    ['Y', 'Bag & wardrobe'], ['LB / RB', 'Previous / next hotbar slot'], ['Start', 'Pause menu (settings, back to title)'], ['View', 'Bag'],
    ['D-pad', 'Move the focus ring in windows (◀ ▶ also steps the hotbar)'],
    ['Right stick', 'Orbit and tilt the camera (click it to reset)'], ['LT / RT', 'Zoom out / zoom in'],
  ] },
  { mode: 'touch', title: 'Touch', rows: [
    ['Drag the left side', 'A joystick appears under your thumb — tilt sets the pace, and a full drag is a normal walk'],
    ['A', 'Talk, shop, interact'], ['B', 'Hold to run · cancel'], ['X', 'Use the selected hotbar item on the tile in front'],
    ['Y', 'Bag & wardrobe'], ['Hotbar', 'Tap a slot to switch tools'], ['Tap the island', 'Walk there, or talk to who you tap'],
    ['Top buttons', 'Journal, skills, bag and this help'], ['Journal › Pause', 'Resume, settings, or back to the title'],
  ] },
];

/** The device cards plus the shared "in any window" note; used by Help and by Settings › Controls. */
export function helpCards(): HTMLElement[] {
  const key = (k: string, pad: boolean) => {
    const el = h('kbd', '', k);
    if (pad && k.length === 1 && 'ABXY'.includes(k)) el.dataset.btn = k.toLowerCase(); // colored like the real buttons
    return el;
  };
  return [
    ...HELP.map((sec) => {
      const el = h('div', 'help-sec', h('div', 'help-title', sec.title),
        h('div', 'help-grid', ...sec.rows.map(([k, v]) => h('div', 'help-row', key(k, sec.mode !== 'keyboard'), h('span', '', v)))));
      el.dataset.mode = sec.mode;
      return el;
    }),
    h('div', 'help-sec menus', h('div', 'help-title', 'In any window'),
      h('div', 'help-menu-row',
        h('span', 'pf-item', glyphEl('move'), 'Move the pink ring'), h('span', 'pf-item', glyphEl('interact'), 'Choose'),
        h('span', 'pf-item', glyphEl('cancel'), 'Back / close'), h('span', 'pf-item', glyphEl('tabs'), 'Switch tabs')),
      h('div', 'muted', 'Controller: D-pad or stick, A, B, LB RB. Keyboard: arrows, E or Enter, Esc, Q R. Touch: just tap — the ring follows your finger.')),
  ];
}

export function openHelp() {
  openPanel('Welcome to Sugarlily Isle', (body, api) => {
    state.seenHelp = true;
    body.append(
      h('p', 'muted', 'Hushbell: the Long Frost put Sugarlily Isle to sleep when the Hush Bell in the lighthouse wound down. Wake it one small kindness at a time — brew, gift, decorate, and light lanterns — until the Bell rings again. Somewhere soft is waking up.'),
      h('p', 'muted small', 'Gather berries, blossoms, shells, coffee cherries and fish from the glimmering spots around the island — they grow back after a while. Everything you do grows a skill (see the Skills tab, or press K). Spare things keep safe in the Softkeep Chest by your home.'),
      h('p', 'muted small', 'Play with a keyboard, a controller or your fingers — the button hints on screen follow whichever you touched last, and its card hops to the top here.'),
      ...helpCards(),
      h('p', 'muted small help-tip', 'Tip: the café, boutique, cart, and grove altar open when you stand close and press the interact button. Time and season follow your real clock. Progress saves automatically.'),
      h('div', 'row end', btn('Let\'s go!', () => api.close())),
    );
  });
}
