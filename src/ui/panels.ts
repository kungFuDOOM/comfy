// Modal panels: dialogue, café, boutique, market, journal, bag, help.
import { drawPlayer, drawVillager } from '../art/characters';
import { cheetahDataUrl } from '../art/cheetah';
import { coinIcon, itemIcon } from '../art/icons';
import { drawLantern, LANTERN_KINDS } from '../art/lantern';
import { toast } from '../bus';
import { canBrew, brewing, startBrew } from '../cafe';
import { buyDecor, buyOutfit, currentOutfit, endPreview, outfitById, tryOn, wear } from '../boutique';
import { CURRENCY, ITEMS, OUTFITS, QUESTS, RECIPES, SHOP_DECOR, SHOP_INGREDIENTS, SHOP_SEEDS, VILLAGERS, type VillagerDef } from '../data';
import { addItem, assignHotbar, count, earn, removeItem, spend } from '../inventory';
import { lanternCounts, SETS, slotPos } from '../lanterns';
import { give, hearts, talk } from '../npc';
import { progress } from '../quests';
import { state } from '../state';
import { getClock } from '../time';
import { glyphEl } from '../input/prompts';
import { btn, h, openPanel, type PanelApi } from './dom';
import { npcs } from '../npc';
import { GROVE } from '../world';

const price = (n: number) => h('span', 'price', coinIcon(14), String(n));
const hearts5 = (id: string) => { const n = hearts(id); return '♥'.repeat(n) + '♡'.repeat(5 - n); };

function canvasEl(w: number, h2: number, draw: (g: CanvasRenderingContext2D) => void, cls = '') {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * dpr; c.height = h2 * dpr; c.style.width = w + 'px'; c.style.height = h2 + 'px'; c.className = cls;
  const g = c.getContext('2d')!; g.scale(dpr, dpr); draw(g);
  return c;
}

// ---------- Dialogue ----------
export function openDialogue(def: VillagerDef) {
  const npc = npcs.find((n) => n.def.id === def.id);
  if (npc) npc.busy = true;
  let line = '';
  let note = '';
  const first = talk(def);
  line = first.text; note = first.gain ? `+${first.gain} friendship` : '';
  openPanel(def.name, (body, api) => {
    const portrait = canvasEl(110, 120, (g) => { g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 110, 120); drawVillager(g, def, 55, 108, performance.now() / 1000, 'down', false, 2.3); }, 'portrait');
    const giftable = Object.keys(state.inv).filter((id) => ['crop', 'drink', 'collectible', 'ingredient', 'seed'].includes(ITEMS[id].kind));
    body.append(
      h('div', 'dlg',
        portrait,
        h('div', 'dlg-main',
          h('div', 'dlg-sub', `${def.speciesName} · ${def.personality}`),
          h('div', 'hearts', hearts5(def.id)),
          h('div', 'bubble', line),
          note ? h('div', 'note', note) : null,
        ),
      ),
      h('div', 'sub', `Give or serve something (${def.name.split(' ')[0]} likes: ${def.likes.map((l) => ITEMS[l].name).join(', ')})`),
      giftable.length ? h('div', 'chips', ...giftable.map((id) => {
        const label = ITEMS[id].kind === 'drink' ? 'Serve' : 'Give';
        const c = h('button', 'chip-item', itemIcon(id, 26), h('span', '', `${label} ${ITEMS[id].name} ×${count(id)}`));
        c.addEventListener('click', () => { const r = give(def, id); if (r) { line = r.text; note = r.gain ? `+${r.gain} friendship ♥` : ''; api.rerender(); } });
        return c;
      })) : h('div', 'muted', 'Your bag has nothing to share yet. Brew a drink at the café or collect something lovely!'),
      h('div', 'row', btn('Chat again', () => { const r = talk(def); line = r.text; note = ''; api.rerender(); }), btn('Bye!', () => api.close(), 'ghost')),
    );
  }, () => { if (npc) npc.busy = false; });
}

// ---------- Café ----------
export function openCafe() {
  let tab: 'brew' | 'pantry' = 'brew';
  openPanel('Puddle & Pip Café', (body, api) => {
    body.append(h('div', 'tabs', tabBtn('Brew', tab === 'brew', () => { tab = 'brew'; api.rerender(); }), tabBtn('Pantry', tab === 'pantry', () => { tab = 'pantry'; api.rerender(); })));
    if (tab === 'brew') {
      body.append(h('div', 'muted', 'Brew a drink, then offer it to a friend — serving a cup is a lovely moment.'));
      for (const r of RECIPES) {
        const def = ITEMS[r.id];
        const ok = canBrew(r.id) && !brewing.id;
        body.append(h('div', 'card row-card',
          itemIcon(r.id, 40),
          h('div', 'grow', h('b', '', def.name), h('div', 'muted', def.desc),
            h('div', 'needs', ...Object.entries(r.needs).map(([k, n]) => h('span', count(k) >= n ? 'need ok' : 'need no', itemIcon(k, 16), `${ITEMS[k].name} ${count(k)}/${n}`)))),
          btn('Brew', () => { if (startBrew(r.id)) { api.rerender(); } }, '', !ok),
        ));
      }
      if (brewing.id) {
        const bar = h('div', 'bar', h('div', 'fill'));
        body.append(h('div', 'brewing', `Brewing ${ITEMS[brewing.id].name}…`, bar));
        const iv = setInterval(() => {
          if (!brewing.id) { api.rerender(); return; }
          (bar.firstChild as HTMLElement).style.width = `${100 - (brewing.left / brewing.total) * 100}%`;
        }, 80);
        api.cleanup(() => clearInterval(iv));
      }
    } else {
      body.append(h('div', 'muted', 'Fresh ingredients for the counter.'));
      for (const id of SHOP_INGREDIENTS) body.append(shopRow(id, ITEMS[id].buy!, () => buyItem(id, api)));
    }
  });
}

function buyItem(id: string, api: PanelApi) {
  if (spend(ITEMS[id].buy ?? 0)) { addItem(id); api.rerender(); } else toast('Not enough pips yet.');
}
const tabBtn = (t: string, on: boolean, f: () => void) => btn(t, f, 'tab' + (on ? ' on' : ''));
function shopRow(id: string, cost: number, onBuy: () => void) {
  return h('div', 'card row-card', itemIcon(id, 36), h('div', 'grow', h('b', '', ITEMS[id].name), h('div', 'muted', ITEMS[id].desc)),
    h('span', 'own', `own ${count(id)}`), btn(price(cost), onBuy, '', state.coins < cost));
}

// ---------- Boutique ----------
export function openBoutique() {
  let tab: 'outfits' | 'decor' = 'outfits';
  openPanel('Spot & Bow Boutique', (body, api) => {
    body.style.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
    body.append(h('div', 'cheetah-band'),
      h('div', 'tabs', tabBtn('Outfits', tab === 'outfits', () => { tab = 'outfits'; api.rerender(); }), tabBtn('Decor', tab === 'decor', () => { tab = 'decor'; api.rerender(); })));
    if (tab === 'outfits') {
      const worn = currentOutfit();
      body.append(h('div', 'muted', 'Try anything on for free. Tap Buy to take it home!'));
      const grid = h('div', 'grid');
      for (const o of OUTFITS) {
        const owned = state.ownedOutfits.includes(o.id);
        const prev = canvasEl(84, 96, (g) => { g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 84, 96); drawPlayer(g, 42, 80, o, 'down', false, 0, 2); });
        grid.append(h('div', 'card outfit' + (worn.id === o.id ? ' worn' : ''), prev, h('b', '', o.name), h('div', 'muted small', o.desc),
          h('div', 'row',
            btn('Try on', () => { tryOn(o.id); api.rerender(); }, 'small ghost'),
            owned ? btn(state.outfit === o.id ? 'Wearing' : 'Wear', () => { wear(o.id); api.rerender(); }, 'small', state.outfit === o.id)
              : btn(h('span', 'inline', 'Buy ', price(o.price)), () => { buyOutfit(o.id); api.rerender(); }, 'small', state.coins < o.price))));
      }
      body.append(grid);
    } else {
      body.append(h('div', 'muted', 'Decor for your yard. Select it on the hotbar and face a yard tile.'));
      for (const id of SHOP_DECOR) body.append(shopRow(id, ITEMS[id].buy!, () => { if (buyDecor(id)) api.rerender(); }));
    }
  }, () => endPreview(), true);
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
export function openBag() {
  let tab: 'items' | 'wardrobe' = 'items';
  openPanel('Bag', (body, api) => {
    body.append(h('div', 'tabs', tabBtn('Items', tab === 'items', () => { tab = 'items'; api.rerender(); }), tabBtn('Wardrobe', tab === 'wardrobe', () => { tab = 'wardrobe'; api.rerender(); })));
    if (tab === 'items') {
      body.append(h('div', 'muted', 'Tap an item to put it in your selected hotbar slot.'));
      const grid = h('div', 'bag');
      for (const id of Object.keys(state.inv)) {
        const cell = h('button', 'bagcell', itemIcon(id, 36), h('span', 'qty', ITEMS[id].kind === 'tool' ? '' : String(state.inv[id])), h('span', 'nm', ITEMS[id].name));
        cell.title = ITEMS[id].desc;
        cell.addEventListener('click', () => { assignHotbar(id); api.rerender(); });
        grid.append(cell);
      }
      body.append(grid);
    } else {
      const grid = h('div', 'grid');
      for (const id of state.ownedOutfits) {
        const o = outfitById(id);
        grid.append(h('div', 'card outfit' + (state.outfit === id ? ' worn' : ''),
          canvasEl(84, 96, (g) => { g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 84, 96); drawPlayer(g, 42, 80, o, 'down', false, 0, 2); }),
          h('b', '', o.name), btn(state.outfit === id ? 'Wearing' : 'Wear', () => { wear(id); api.rerender(); }, 'small', state.outfit === id)));
      }
      body.append(grid);
    }
  });
}

// ---------- Journal ----------
export function openJournal(start = 'quests') {
  let tab = start;
  openPanel('Journal', (body, api) => {
    const t = (id: string, label: string) => tabBtn(label, tab === id, () => { tab = id; api.rerender(); });
    body.append(h('div', 'tabs', t('quests', 'Quests'), t('collection', 'Collection'), t('friends', 'Friends'), t('lanterns', 'Lanterns')));
    if (tab === 'quests') {
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
      const hint = { shell: 'Beaches', blossom: 'Ribbon Meadow', moth: 'Dusk & night', button: 'The grove hillside' };
      body.append(grid, h('div', 'muted small', `Where to look — ${Object.entries(hint).map(([k, v]) => `${ITEMS[k].name}: ${v}`).join(' · ')}.`));
      body.append(h('div', 'muted small', `Season (${getClock().season.name}): ${getClock().season.blurb}`));
    } else if (tab === 'friends') {
      for (const v of VILLAGERS) {
        body.append(h('div', 'card row-card',
          canvasEl(52, 56, (g) => { drawVillager(g, v, 26, 52, 0, 'down', false, 1.2); }),
          h('div', 'grow', h('b', '', v.name), h('div', 'muted', `${v.speciesName} · ${v.personality}`), h('div', 'muted small', v.bio)),
          h('div', 'hearts', hearts5(v.id))));
      }
    } else {
      renderLanternTab(body, api);
    }
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
    ['B', 'Bag & wardrobe'], ['J', 'Journal'], ['L', 'Lantern grove'], ['H', 'This help'], ['Esc', 'Close a window'],
    ['[ ]  ·  - =', 'Orbit camera  ·  zoom (Backspace resets)'],
  ] },
  { mode: 'gamepad', title: 'Controller', rows: [
    ['Left stick', 'Walk — a small tilt strolls, a full tilt runs'], ['A', 'Talk, shop, interact'],
    ['B', 'Hold to run · cancel · close a window'], ['X', 'Use the selected hotbar item on the tile in front'],
    ['Y', 'Bag & wardrobe'], ['LB / RB', 'Previous / next hotbar slot'], ['Start', 'Journal'], ['View', 'Bag'],
    ['D-pad', 'Move the focus ring in windows (◀ ▶ also steps the hotbar)'],
    ['Right stick', 'Orbit and tilt the camera (click it to reset)'], ['LT / RT', 'Zoom out / zoom in'],
  ] },
  { mode: 'touch', title: 'Touch', rows: [
    ['Drag the left side', 'A joystick appears under your thumb — a gentle drag walks, a full drag runs'],
    ['A', 'Talk, shop, interact'], ['B', 'Hold to run · cancel'], ['X', 'Use the selected hotbar item on the tile in front'],
    ['Y', 'Bag & wardrobe'], ['Hotbar', 'Tap a slot to switch tools'], ['Tap the island', 'Walk there, or talk to who you tap'],
    ['Top buttons', 'Journal, bag and this help'],
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
      h('p', 'muted', 'A cozy island of coffee, boutiques, friends, and little glowing lanterns. Wander at your own pace!'),
      h('p', 'muted small', 'Play with a keyboard, a controller or your fingers — the button hints on screen follow whichever you touched last, and its card hops to the top here.'),
      ...helpCards(),
      h('p', 'muted small help-tip', 'Tip: the café, boutique, cart, and grove altar open when you stand close and press the interact button. Time and season follow your real clock. Progress saves automatically.'),
      h('div', 'row end', btn('Let\'s go!', () => api.close())),
    );
  });
}
