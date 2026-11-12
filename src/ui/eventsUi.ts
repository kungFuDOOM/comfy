// Seasonal events UI: the cozy HUD banner and the journal's Events tab. Logic lives in events.ts.
import './events.css';
import { itemIcon } from '../art/icons';
import { clothById, type ClothDef } from '../clothes';
import { ITEMS } from '../data';
import {
  dateRange, daysLeft, endsText, eventCounter, eventProgress, getActiveEvents, getPastEvents, getUpcomingEvents, isPeakDay, ownsEventItem, startsText,
  type EventDef,
} from '../events';
import { h } from './dom';

// ---------- HUD banner ----------
let banner: HTMLButtonElement | null = null, bannerKey = '';

/** Create the banner (once). Clicking it opens the journal's Events tab. */
export function buildEventBanner(open: () => void) {
  if (banner) return;
  banner = h('button', 'event-banner');
  banner.type = 'button';
  banner.hidden = true;
  banner.addEventListener('click', open);
  document.getElementById('ui')!.append(banner);
}

/** Cheap enough to call from the HUD tick: only touches the DOM when the text changes. */
export function refreshEventBanner() {
  if (!banner) return;
  const active = getActiveEvents();
  if (!active.length) { if (!banner.hidden) { banner.hidden = true; bannerKey = ''; } return; }
  const e = active[0];
  const peak = isPeakDay(e.id);
  const main = peak && e.peakBanner ? `${e.name}: Feast Day!` : e.name;
  const sub = peak ? 'Everyone is at the long table in the square' : `${endsText(e)} · tap for activities`;
  const key = `${e.id}|${main}|${sub}|${active.length}`;
  if (key === bannerKey) return;
  bannerKey = key;
  banner.hidden = false;
  banner.classList.toggle('peak', peak);
  banner.title = e.blurb;
  banner.replaceChildren(h('span', 'ev-icon', e.icon), h('span', 'ev-text', h('span', '', main), h('span', 'ev-sub', sub)));
}

// ---------- journal tab ----------
type Thumb = (c: ClothDef, locked: boolean) => HTMLElement;

function endsChip(e: EventDef, phase: 'active' | 'upcoming' | 'ended'): HTMLElement {
  if (phase === 'upcoming') return h('span', 'ev-ends up', startsText(e));
  if (phase === 'ended') return h('span', 'ev-ends done', 'Ended');
  return h('span', 'ev-ends' + (daysLeft(e) <= 2 ? ' soon' : ''), endsText(e));
}

function itemChip(id: string, thumb: Thumb): HTMLElement {
  const c = clothById(id), got = ownsEventItem(id);
  const name = c?.name ?? ITEMS[id]?.name ?? id;
  const pic = c ? thumb(c, !got) : itemIcon(id, 28);
  const chip = h('span', 'ev-item ' + (got ? 'got' : 'miss'), pic, got ? `✓ ${name}` : name);
  chip.title = c ? c.desc : ITEMS[id]?.desc ?? '';
  return chip;
}

function eventCard(e: EventDef, phase: 'active' | 'upcoming' | 'ended', thumb: Thumb): HTMLElement {
  const card = h('div', 'card ev-card' + (phase === 'active' ? ' active' : ''));
  card.append(
    h('div', 'ev-head', h('span', 'ev-big', e.icon), h('div', 'grow', h('div', 'ev-title', e.name), h('div', 'ev-dates', dateRange(e))), endsChip(e, phase)),
    h('div', 'muted', e.blurb),
  );
  if (phase === 'active' && isPeakDay(e.id) && e.peakBanner) card.append(h('div', 'ev-ends soon', `🎉 ${e.peakBanner}`));
  if (phase === 'upcoming') {
    card.append(h('div', 'muted small', `${e.items.length} exclusive items to earn. They are only available while the event is on, and yours to keep forever.`));
    return card;
  }
  if (phase === 'active') {
    card.append(h('div', 'ev-sec', 'Things to do'));
    for (const a of e.activities) {
      const row = h('div', 'ev-act', h('span', 'ev-ai', a.icon), h('div', 'grow', h('b', '', a.title), h('div', 'muted small', a.desc)));
      if (a.counter && a.goal) {
        const n = Math.min(a.goal, eventCounter(e.id, a.counter));
        const bar = h('div', 'bar', h('div', 'fill'));
        (bar.firstChild as HTMLElement).style.width = `${Math.round((n / a.goal) * 100)}%`;
        (row.querySelector('.grow') as HTMLElement).append(h('div', 'muted small', `${n} / ${a.goal}`), bar);
      }
      card.append(row);
    }
    card.append(h('div', 'ev-sec', 'Rewards'));
    const p = eventProgress(e.id);
    for (const m of e.milestones) {
      const got = p.claimed.includes(m.id);
      const cur = Math.min(m.goal, eventCounter(e.id, m.counter));
      card.append(h('div', 'ev-mile' + (got ? ' got' : ''), got ? h('span', 'ev-chk', '✓') : h('span', 'muted small', `${cur}/${m.goal}`), m.title));
    }
  }
  card.append(h('div', 'ev-sec', phase === 'active' ? 'Exclusive items' : 'Items you kept'));
  const items = phase === 'ended' ? e.items.filter(ownsEventItem) : e.items;
  card.append(items.length ? h('div', 'ev-items', ...items.map((i) => itemChip(i, thumb))) : h('div', 'muted small', 'None earned this time.'));
  return card;
}

/** The Events tab: what is on now (with a clear "ends in N days"), what is coming, and what you kept. */
export function renderEventsTab(body: HTMLElement, thumb: Thumb) {
  const active = getActiveEvents(), upcoming = getUpcomingEvents(), past = getPastEvents();
  body.append(h('div', 'muted', 'Seasonal events follow the real calendar. Exclusive items can only be earned while an event is on, and stay yours forever.'));
  if (!active.length) body.append(h('div', 'card', h('div', 'grow muted', upcoming.length ? `No event right now. Next up: ${upcoming[0].name} (${startsText(upcoming[0]).toLowerCase()}).` : 'No event right now. Check back soon!')));
  for (const e of active) body.append(eventCard(e, 'active', thumb));
  if (upcoming.length) body.append(h('div', 'ev-sec', 'Coming up'), ...upcoming.map((e) => eventCard(e, 'upcoming', thumb)));
  if (past.length) body.append(h('div', 'ev-sec', 'Past events'), ...past.map((e) => eventCard(e, 'ended', thumb)));
}
