// The Twinkle Advent Calendar window and the small HUD notice for today's unopened door.
import './advent.css';
import { drawPlayer } from '../art/characters';
import { itemIcon } from '../art/icons';
import {
  ADVENT_DOORS, adventNotice, adventPanelAvailable, adventStatusLine, adventTeaser, doorByDay, doorGifts, doorNames,
  doorsSleeping,
  doorState, giftDesc, giftWhere, openDoor, todaysDoor, type AdventDoor, type DoorState,
} from '../advent';
import { clothById, type ClothDef } from '../clothes';
import { START_WORN } from '../clothes/start';
import { btn, h, openPanel } from './dom';
import { equipOn, resolveLook } from '../wardrobe';

function clothPic(c: ClothDef): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 46;
  canvas.height = 52;
  canvas.className = 'advent-pic';
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff0f6';
  g.fillRect(0, 0, 46, 52);
  const look = resolveLook(equipOn({ ...START_WORN }, c));
  const head = c.slot === 'hat' || c.slot === 'face';
  const feet = c.slot === 'shoes';
  const sc = head ? 1.75 : feet ? 2.1 : 1;
  const cy = head ? 26 + 27.5 * sc : feet ? 22 : 46;
  drawPlayer(g, 23, cy, look, 'down', false, 0, sc);
  return canvas;
}

function giftPic(id: string): HTMLCanvasElement {
  const cloth = clothById(id);
  if (cloth) return clothPic(cloth);
  const icon = itemIcon(id, 40);
  icon.className = 'advent-pic';
  return icon;
}

function stateWord(st: DoorState): string {
  switch (st) {
    case 'opened': return 'opened';
    case 'today': return "today's door, ready to open";
    case 'ready': return 'missed, still openable';
    case 'locked': return 'not openable right now';
    case 'asleep': return 'not open yet';
    default: {
      const neverState: never = st;
      return neverState;
    }
  }
}

function doorLabel(door: AdventDoor, st: DoorState): string {
  if (st === 'opened') return `December ${door.day}, opened. ${doorNames(door)}.`;
  return `December ${door.day}, ${stateWord(st)}.`;
}

let picked = 0;

function resultCard(door: AdventDoor, st: DoorState): HTMLElement {
  const best = door.day === 24;
  const card = h('div', 'advent-result' + (best && st === 'opened' ? ' is-best' : ''));
  card.setAttribute('aria-live', 'polite');
  if (st !== 'opened') {
    const headline = st === 'today' ? `December ${door.day} is today` : st === 'ready' ? `December ${door.day} is still open` : `December ${door.day}`;
    const detail = st === 'today'
      ? 'A little gift is tucked inside. Tap the door.'
      : st === 'ready'
        ? 'You missed this day. It stays open through Christmas Day. Tap the door.'
        : doorsSleeping()
          ? 'This one stayed closed. It can open again next December.'
          : best
            ? 'The last door. It waits for Christmas Eve.'
            : 'This door opens on its own day.';
    card.append(h('div', 'advent-result-copy', h('b', '', headline), h('div', 'advent-where', detail)));
    return card;
  }
  const gifts = doorGifts(door);
  card.append(
    h('div', 'advent-pics', ...gifts.map(giftPic)),
    h('div', 'advent-result-copy',
      h('b', '', (best ? 'Best gift · ' : '') + doorNames(door)),
      h('div', 'advent-where', gifts.map((id) => `${giftDesc(id)} ${giftWhere(id)}`).join(' '))),
  );
  return card;
}

/** Open the 24-door calendar. Safe to call when the season is closed; it simply does nothing. */
export function openAdvent() {
  if (!adventPanelAvailable()) return;
  if (!picked) picked = todaysDoor() ?? 1;
  openPanel('Twinkle Advent Calendar', (body, api) => {
    body.parentElement?.classList.add('advent-panel');
    const show = doorByDay(picked) ?? ADVENT_DOORS[0];
    const showState = doorState(show.day);
    body.append(
      h('p', 'muted advent-blurb', 'Twenty-four little doors. One opens each day from December 1 to Christmas Eve. Anything you miss stays openable through Christmas Day.'),
      h('p', 'muted small advent-status', adventStatusLine()),
      resultCard(show, showState),
    );
    const grid = h('div', 'advent-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Advent calendar doors');
    for (const door of ADVENT_DOORS) {
      const st = doorState(door.day);
      const locked = st === 'locked' || st === 'asleep';
      const cls = ['advent-door', `is-${st}`, door.day === 24 ? 'is-best' : ''].filter(Boolean).join(' ');
      const mark = st === 'opened' ? '✓' : st === 'today' ? 'open' : st === 'ready' ? 'open' : 'locked';
      const b = h('button', cls, h('span', 'advent-num', String(door.day)), h('span', 'advent-mark', mark));
      b.type = 'button';
      b.disabled = locked;
      b.setAttribute('aria-label', doorLabel(door, st));
      b.addEventListener('click', () => {
        picked = door.day;
        if (st === 'today' || st === 'ready') {
          openDoor(door.day);
          refreshAdventNotice();
        }
        api.rerender();
      });
      grid.append(b);
    }
    body.append(grid);
  });
}

/** A journal card: open the calendar, or a soft note before December 1. */
export function adventJournalCard(): HTMLElement | null {
  if (adventPanelAvailable()) {
    return h('div', 'card advent-entry',
      h('div', 'grow', h('b', '', 'Twinkle Advent Calendar'), h('div', 'muted small', adventStatusLine())),
      btn('Open the calendar', () => openAdvent(), 'advent-open'));
  }
  if (adventTeaser()) {
    return h('div', 'card advent-entry',
      h('div', 'grow', h('b', '', 'Twinkle Advent Calendar'), h('div', 'muted small', 'The little doors wake up on December 1. One each day, through Christmas Eve.')));
  }
  return null;
}

/** One line for the town-tree window: a button, a teaser, or nothing. */
export function adventTreeRow(): HTMLElement | null {
  return adventJournalCard();
}

// ---- HUD notice ----
let notice: HTMLButtonElement | null = null;
let noticeKey = '';

/** Create the notice once, inside the HUD's top row. Hidden until today's door is still closed. */
export function buildAdventNotice(parent: HTMLElement) {
  if (notice) return;
  notice = h('button', 'advent-notice',
    h('span', 'advent-notice-ico', '✨'),
    h('span', 'advent-notice-text', h('span', 'advent-notice-title', ''), h('span', 'advent-notice-sub', '')));
  notice.type = 'button';
  notice.hidden = true;
  notice.addEventListener('click', () => openAdvent());
  parent.append(notice);
}

export function refreshAdventNotice() {
  if (!notice) return;
  const n = adventNotice();
  if (!n) {
    if (!notice.hidden) { notice.hidden = true; noticeKey = ''; }
    return;
  }
  const key = `${n.title}|${n.sub}`;
  notice.hidden = false;
  notice.setAttribute('aria-label', n.label);
  notice.title = n.label;
  if (key === noticeKey) return;
  noticeKey = key;
  const title = notice.querySelector('.advent-notice-title');
  const sub = notice.querySelector('.advent-notice-sub');
  if (title) title.textContent = n.title;
  if (sub) sub.textContent = n.sub;
}
