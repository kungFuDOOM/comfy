// Seasonal events UI: the cozy HUD banner and the journal's Events tab. Logic lives in events.ts.
import './events.css';
import { itemIcon } from '../art/icons';
import { clothById, type ClothDef } from '../clothes';
import { ITEMS } from '../data';
import {
  chapterOpen, currentChapter, dateRange, dayLabel, daysLeft, endsText, eventCounter, eventProgress, getActiveEvents, getPastEvents, getUpcomingEvents,
  isPeakDay, ownsEventItem, startsText, type EventDef,
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
  // Lives inside .hud-top (its own wrapped row below the chips) so it can never overlap them, whatever the chip height.
  (document.querySelector('.hud-top') ?? document.getElementById('ui')!).append(banner);
}

/** One banner line per active event, each in its own words (peak copy and chapter copy come from the event). */
function bannerLine(e: EventDef) {
  const peak = isPeakDay(e.id), ch = currentChapter(e);
  const main = peak ? `${e.name}: ${e.peakTitle ?? 'Today is the day!'}` : e.name;
  const sub = peak ? e.peakSub ?? 'The big day is here' : ch?.hud ? `${ch.hud} · ${endsText(e)}` : `${endsText(e)} · tap for activities`;
  return { e, peak, main, sub };
}

/** Cheap enough to call from the HUD tick: only touches the DOM when the text changes. Two events at once get two lines. */
export function refreshEventBanner() {
  if (!banner) return;
  const active = getActiveEvents();
  if (!active.length) { if (!banner.hidden) { banner.hidden = true; bannerKey = ''; } return; }
  const rows = active.map(bannerLine);
  const key = rows.map((r) => `${r.e.id}|${r.main}|${r.sub}`).join('||');
  if (key === bannerKey) return;
  bannerKey = key;
  banner.hidden = false;
  banner.classList.toggle('peak', rows.some((r) => r.peak));
  banner.classList.toggle('multi', rows.length > 1);
  banner.title = rows.map((r) => r.e.blurb).join('\n');
  banner.replaceChildren(...rows.map((r) => h('span', 'ev-row', h('span', 'ev-icon', r.e.icon), h('span', 'ev-text', h('span', '', r.main), h('span', 'ev-sub', r.sub)))));
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
  if (e.chapters && phase !== 'ended') {
    const cur = phase === 'active' ? currentChapter(e) : undefined;
    card.append(h('div', 'ev-sec', 'Chapters'));
    if (cur) card.append(h('div', 'muted small', `Now: ${cur.title}. ${cur.blurb}`));
    for (const c of e.chapters) {
      const open = phase === 'active' && chapterOpen(e.id, c.id), now = cur?.id === c.id;
      card.append(h('div', 'ev-chap' + (now ? ' now' : open ? '' : ' locked'), h('span', '', now ? '✨' : open ? '✓' : '🔒'), h('div', 'grow', c.title), h('span', 'muted small', open ? (now ? 'now' : 'open') : `Unlocks ${dayLabel(c.start)}`)));
    }
  }
  if (phase === 'upcoming') {
    card.append(h('div', 'muted small', `${e.items.length} exclusive items to earn. They are only available while the event is on, and yours to keep forever.`));
    return card;
  }
  if (phase === 'active') {
    card.append(h('div', 'ev-sec', 'Things to do'));
    for (const a of e.activities) {
      const locked = !chapterOpen(e.id, a.chapter);
      const when = a.chapter ? e.chapters?.find((c) => c.id === a.chapter) : undefined;
      const row = h('div', 'ev-act' + (locked ? ' locked' : ''), h('span', 'ev-ai', locked ? '🔒' : a.icon), h('div', 'grow', h('b', '', a.title), h('div', 'muted small', locked && when ? `Unlocks ${dayLabel(when.start)}. ${a.desc}` : a.desc)));
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
