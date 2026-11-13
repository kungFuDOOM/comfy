// The Collection Log UI: a scrapbook with an overview, one page per category, and a Sets page, plus the little
// celebration sticker that pops up when a set is completed. Logic lives in collection.ts.
import { sfx } from '../audio';
import { itemIcon } from '../art/icons';
import { bus } from '../bus';
import { SLOTS, clothById, type ClothDef, type Slot } from '../clothes';
import {
  CATS, SETS, catById, catProgress, currentTitle, entriesIn, entryById, hasEntry, isFresh, markSeen, overallProgress, rewardText,
  setById, setDone, setEntries, setProgress, setTitle, setsOf, type CatId, type Entry, type SetDef,
} from '../collection';
import { ITEMS } from '../data';
import { state } from '../state';
import { btn, h, type PanelApi } from './dom';
import './collection.css';

type Thumb = (c: ClothDef, locked: boolean) => HTMLElement;
type Tab = 'overview' | 'sets' | CatId;

/** What the log was last showing, so it reopens where you left it. */
const view = { tab: 'overview' as Tab, sel: null as string | null, openSet: null as string | null, page: 0, slot: 'all' as Slot | 'all', status: 'all' as 'all' | 'have' | 'missing' };
const PAGE = 20;

/** Item finds show "???" until found; shop catalog pieces keep their names so you can hunt for them. */
const nameHidden = (e: Entry) => e.cat !== 'outfit' && e.cat !== 'furniture' && !hasEntry(e.id);

const bar = (pct: number) => { const b = h('div', 'bar cl-bar', h('div', 'fill')); (b.firstChild as HTMLElement).style.width = `${pct}%`; return b; };

function icon(e: Entry, size: number, thumb: Thumb): HTMLElement {
  const got = hasEntry(e.id);
  if (e.cat === 'outfit') return thumb(clothById(e.id.slice(2))!, !got);
  const el = itemIcon(e.id, size);
  if (!got) el.classList.add('cl-sil');
  return el;
}

const dateOf = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Everything the Journal's Collection tab shows. */
export function renderCollectionLog(body: HTMLElement, api: PanelApi, thumb: Thumb) {
  const rerender = () => api.rerender();
  const go = (tab: Tab) => {
    // leaving a page marks what was new on it as seen
    if (view.tab !== tab) { markCurrentSeen(); view.tab = tab; view.sel = null; view.page = 0; }
    rerender();
  };

  // ----- cover -----
  const all = overallProgress();
  const title = currentTitle();
  body.append(h('div', 'cl-cover',
    h('div', 'cl-cover-text',
      h('div', 'cl-kicker', '✿ Sugarlily Scrapbook ✿'),
      h('div', 'cl-total', `${all.pct}% complete`),
      h('div', 'muted small', `${all.have} pages filled · ${state.collection.done.length}/${SETS.length} sets${title ? ` · ${title}` : ''}`)),
    bar(all.pct)));

  // ----- page tabs -----
  const tabBtn = (id: Tab, icon: string, label: string, badge = 0) => {
    const on = view.tab === id;
    const b = btn(h('span', 'cl-tab-in', h('span', 'cl-tab-ico', icon), h('span', 'cl-tab-txt', label), badge ? h('span', 'cl-badge', String(badge)) : null), () => go(id), 'tab cl-tab' + (on ? ' on' : ''));
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', label);
    return b;
  };
  const freshIn = (cat: CatId) => entriesIn(cat).filter((e) => isFresh(e.id)).length;
  body.append(h('div', 'cl-tabs',
    tabBtn('overview', '✿', 'Overview'),
    ...CATS.map((c) => tabBtn(c.id, c.icon, c.name, view.tab === c.id ? 0 : freshIn(c.id))),
    tabBtn('sets', '★', `Sets ${state.collection.done.length}/${SETS.length}`)));

  if (view.tab === 'overview') overview(body, go, rerender);
  else if (view.tab === 'sets') setsPage(body, rerender);
  else categoryPage(body, view.tab, thumb, rerender);
}

function markCurrentSeen() {
  if (view.tab === 'overview' || view.tab === 'sets') return;
  markSeen(entriesIn(view.tab).map((e) => e.id));
}

// ---------- overview ----------
function overview(body: HTMLElement, go: (t: Tab) => void, rerender: () => void) {
  body.append(h('div', 'muted', 'Every fish, bug, shell, berry, gem, outfit and chair you have ever owned gets stamped in here. The grey shapes are still out there somewhere. Tap a page to see where to look.'));
  const list = h('div', 'cl-cats');
  for (const c of CATS) {
    const p = catProgress(c.id);
    const row = h('button', 'cl-cat card', h('span', 'cl-cat-icon', c.icon),
      h('span', 'grow', h('span', 'cl-cat-head', h('b', '', c.name), h('span', 'cl-cat-n', `${p.have}/${p.total} · ${p.pct}%`)), bar(p.pct)));
    row.type = 'button';
    row.addEventListener('click', () => { sfx.tick(); go(c.id); });
    list.append(row);
  }
  body.append(list);

  // sets that are closest to done
  const near = SETS.filter((s) => !setDone(s.id) && s.cat !== 'grand')
    .map((s) => ({ s, p: setProgress(s) })).filter((o) => o.p.have > 0)
    .sort((a, b) => b.p.have / b.p.total - a.p.have / a.p.total).slice(0, 3);
  body.append(h('div', 'sub', 'Almost there'));
  if (!near.length) body.append(h('div', 'muted small', 'Find a few things and the sets you are closest to finishing will show up here.'));
  for (const { s, p } of near) {
    const missing = setEntries(s).filter((id) => !hasEntry(id)).map((id) => entryById(id)!).slice(0, 2);
    body.append(h('div', 'card cl-near', h('div', 'grow', h('b', '', s.name), h('div', 'muted small', `${p.have}/${p.total} · Reward: ${rewardText(s.reward)}`),
      ...missing.map((e) => h('div', 'muted small', `${nameHidden(e) ? '???' : e.name}: ${e.hint}`))), btn('Open', () => { view.openSet = s.id; go('sets'); }, 'small')));
  }

  // titles
  const titles = state.collection.titles;
  body.append(h('div', 'sub', 'Titles'));
  if (!titles.length) body.append(h('div', 'muted small', 'Complete sets to earn titles to show off.'));
  else {
    const cur = currentTitle();
    const chip = (t: string | null) => {
      const on = cur === t;
      const el = h('button', 'chip-item' + (on ? ' on' : ''), t === null ? 'No title' : `${on ? '✓ ' : ''}${t}`);
      el.type = 'button';
      el.addEventListener('click', () => { sfx.tick(); setTitle(t); rerender(); });
      return el;
    };
    body.append(h('div', 'chips cl-titles', chip(null), ...titles.map(chip)));
  }
}

// ---------- category pages ----------
function categoryPage(body: HTMLElement, cat: CatId, thumb: Thumb, rerender: () => void) {
  const def = catById(cat), p = catProgress(cat);
  body.append(h('div', 'cl-page-head', h('div', 'grow', h('b', '', `${def.icon} ${def.name}`), h('div', 'muted small', def.blurb)), h('span', 'tag', `${p.have}/${p.total} · ${p.pct}%`)));
  body.append(bar(p.pct));

  let list = entriesIn(cat);
  if (cat === 'outfit') {
    const slotChip = (id: Slot | 'all', label: string) => btn(label, () => { view.slot = id; view.page = 0; rerender(); }, 'small tab cl-chip' + (view.slot === id ? ' on' : ''));
    body.append(h('div', 'cl-filters', slotChip('all', 'All'), ...SLOTS.map((s) => slotChip(s.id, `${s.icon} ${s.label}`))));
    const stChip = (id: typeof view.status, label: string) => btn(label, () => { view.status = id; view.page = 0; rerender(); }, 'small tab cl-chip' + (view.status === id ? ' on' : ''));
    body.append(h('div', 'cl-filters', stChip('all', 'Everything'), stChip('have', 'Owned'), stChip('missing', 'Missing')));
    list = list.filter((e) => (view.slot === 'all' || clothById(e.id.slice(2))?.slot === view.slot)
      && (view.status === 'all' || (view.status === 'have') === hasEntry(e.id)));
  }
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  view.page = Math.min(view.page, pages - 1);
  const shown = cat === 'outfit' ? list.slice(view.page * PAGE, view.page * PAGE + PAGE) : list;

  body.append(detail(view.sel ? entryById(view.sel) ?? null : null, thumb));

  const grid = h('div', 'bag cl-grid');
  for (const e of shown) {
    const got = hasEntry(e.id), fresh = isFresh(e.id);
    const cell = h('button', 'bagcell cl-cell' + (got ? '' : ' missing') + (view.sel === e.id ? ' sel' : ''), icon(e, 38, thumb),
      h('span', 'nm', nameHidden(e) ? '???' : e.name), fresh ? h('span', 'cl-new', 'NEW') : null);
    cell.type = 'button';
    cell.title = got ? e.name : nameHidden(e) ? 'Not found yet' : `${e.name}: not yet`;
    cell.addEventListener('click', () => { sfx.tick(); markSeen([e.id]); view.sel = view.sel === e.id ? null : e.id; rerender(); });
    grid.append(cell);
  }
  if (!shown.length) grid.append(h('div', 'muted small', 'Nothing matches that filter yet.'));
  body.append(grid);

  if (cat === 'outfit' && pages > 1) {
    body.append(h('div', 'row cl-pager',
      btn('‹ Back', () => { view.page = Math.max(0, view.page - 1); rerender(); }, 'small', view.page === 0),
      h('span', 'muted small', `Page ${view.page + 1} of ${pages}`),
      btn('Next ›', () => { view.page = Math.min(pages - 1, view.page + 1); rerender(); }, 'small', view.page >= pages - 1)));
  }
}

/** The card under the page header: what you tapped, where it lives, and which sets it belongs to. */
function detail(e: Entry | null, thumb: Thumb): HTMLElement {
  if (!e) return h('div', 'cl-detail empty muted small', 'Tap any page to see where it comes from. Grey ones still need finding.');
  const got = hasEntry(e.id);
  const cloth = e.cat === 'outfit' ? clothById(e.id.slice(2)) : undefined;
  const desc = got ? (cloth?.desc ?? ITEMS[e.id]?.desc ?? '') : '';
  const sets = setsOf(e.id);
  return h('div', 'cl-detail card' + (got ? '' : ' missing'),
    h('div', 'cl-detail-pic', icon(e, 56, thumb)),
    h('div', 'grow',
      h('b', '', nameHidden(e) ? '???' : e.name),
      got ? h('div', 'cl-got small', `✓ In your scrapbook since ${dateOf(state.collection.got[e.id])}`) : h('div', 'cl-miss small', 'Not found yet'),
      desc ? h('div', 'muted small', desc) : null,
      got ? null : h('div', 'cl-hint small', `Where to look: ${e.hint}`),
      sets.length ? h('div', 'muted small', `Part of: ${sets.map((s) => `${s.name} ${setProgress(s).have}/${setProgress(s).total}`).join(', ')}`) : null));
}

// ---------- sets ----------
function setsPage(body: HTMLElement, rerender: () => void) {
  const done = SETS.filter((s) => setDone(s.id)).length;
  body.append(h('div', 'muted', `Finish a set to be rewarded with pips, a title, or something to wear or place. ${done} of ${SETS.length} complete.`));
  const order = [...SETS].sort((a, b) => Number(setDone(a.id)) - Number(setDone(b.id)) || setProgress(b).pct - setProgress(a).pct);
  const list = h('div', 'cl-sets');
  for (const s of order) list.append(setCard(s, rerender));
  body.append(list);
}

function setCard(s: SetDef, rerender: () => void): HTMLElement {
  const done = setDone(s.id), p = setProgress(s), open = view.openSet === s.id;
  const pills = s.cat === 'grand'
    ? s.members.map((id) => { const m = setById(id)!; return h('span', 'cl-pill' + (setDone(id) ? ' got' : ''), `${setDone(id) ? '✓' : '○'} ${m.name}`); })
    : setEntries(s).map((id) => {
      const e = entryById(id)!, got = hasEntry(id);
      return h('span', 'cl-pill' + (got ? ' got' : ''), got || e.cat === 'furniture' || e.cat === 'outfit' ? `${got ? '✓' : '○'} ${e.name}` : '○ ???');
    });
  const head = h('button', 'cl-set-head', h('span', 'cl-set-icon', done ? '★' : s.cat === 'grand' ? '♛' : catById(s.cat).icon),
    h('span', 'grow', h('b', '', s.name), h('span', 'muted small cl-set-blurb', s.blurb)),
    h('span', 'tag', done ? 'Complete ✓' : `${p.have}/${p.total}`));
  head.type = 'button';
  head.addEventListener('click', () => { sfx.tick(); view.openSet = open ? null : s.id; rerender(); });
  const card = h('div', 'card cl-set' + (done ? ' done' : '') + (open ? ' open' : ''), head, bar(p.pct), h('div', 'cl-pills', ...pills),
    h('div', 'cl-reward small', `${done ? 'Earned' : 'Reward'}: ${rewardText(s.reward)}`));
  if (open && !done) {
    const missing = s.cat === 'grand'
      ? s.members.filter((id) => !setDone(id)).map((id) => h('div', 'muted small', `${setById(id)!.name}: ${setById(id)!.blurb}`))
      : setEntries(s).filter((id) => !hasEntry(id)).map((id) => { const e = entryById(id)!; return h('div', 'cl-hint small', `${nameHidden(e) ? '???' : e.name}: ${e.hint}`); });
    card.append(h('div', 'cl-missing', h('div', 'sub small', 'Still to find'), ...missing));
  }
  return card;
}

// ---------- celebration ----------
// A sticker like the level-up one: no backdrop, never blocks play, tap to tuck away, several in a row queue up.
const SPARKS = ['✦', '✧', '♡', '✿', '★'];
const SHOW_MS = 5200, OUT_MS = 320;
const queue: string[] = [];
let showing: { el: HTMLElement; timer: number } | null = null;

function burst(card: HTMLElement, n: number) {
  const layer = card.querySelector('.setpop-sparks')!;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, r = 60 + Math.random() * 60;
    const s = h('span', 'setpop-spark', SPARKS[i % SPARKS.length]);
    s.style.setProperty('--dx', `${Math.cos(a) * r * 1.6}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * r * 0.85}px`);
    s.style.setProperty('--rot', `${Math.round(Math.random() * 140 - 70)}deg`);
    s.style.animationDelay = `${Math.round(Math.random() * 160)}ms`;
    s.style.fontSize = `${12 + Math.round(Math.random() * 12)}px`;
    layer.append(s);
    setTimeout(() => s.remove(), 1300);
  }
}

function next() {
  const id = queue.shift();
  const s = id ? setById(id) : undefined;
  if (!s) return;
  const icons = s.cat === 'grand' ? [] : setEntries(s).filter((m) => !m.startsWith('c:')).slice(0, 6);
  const el = h('div', 'setpop',
    h('div', 'setpop-sparks'),
    h('div', 'setpop-badge', s.cat === 'grand' ? '♛' : catById(s.cat).icon),
    h('div', 'setpop-text',
      h('div', 'setpop-kicker', '✿ Set complete! ✿'),
      h('div', 'setpop-name', s.name),
      icons.length ? h('div', 'setpop-icons', ...icons.map((m) => itemIcon(m, 24))) : null,
      h('div', 'setpop-reward', `You earned ${rewardText(s.reward)}`),
      h('div', 'setpop-note', 'Find it in Journal › Collection')));
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); dismissSetPopup(); });
  document.getElementById('ui')!.append(el);
  showing = { el, timer: window.setTimeout(dismissSetPopup, SHOW_MS) };
  burst(el, 16);
  sfx.partyHat();
}

function dismissSetPopup() {
  if (!showing) return;
  const cur = showing;
  showing = null;
  clearTimeout(cur.timer);
  cur.el.classList.add('out');
  setTimeout(() => { cur.el.remove(); if (!showing) next(); }, OUT_MS);
}

bus.on('setComplete', (d: { id: string }) => {
  queue.push(d.id);
  if (!showing) next();
});
