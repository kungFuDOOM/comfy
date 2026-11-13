// Friendship screens: the heart meter, the Journal's Friends tab (portraits, hearts, birthdays, discovered gift tastes,
// max-heart rewards) and the mailbox. All of the logic lives in friends.ts; the words live in friendData.ts.
import './friends.css';
import { drawVillager } from '../art/characters';
import { itemIcon } from '../art/icons';
import { bus } from '../bus';
import { clothById } from '../clothes';
import { ITEMS, VILLAGERS, type VillagerDef } from '../data';
import { FRIEND_INFO, MAX_HEARTS } from '../friendData';
import {
  birthdayDone, birthdayFriends, birthdayLabel, birthdayText, bondLabel, daysToBirthday, giftLabel, giftWaiting, heartProgress, hearts,
  isBirthday, isMaxed, knownTastes, letterView, markRead, metFriend, takeGift, tasteTotals, unclaimedGifts, unreadLetters,
} from '../friends';
import { AREA_LIST } from '../areas';
import { ensureDaily, state, type Letter } from '../state';
import { btn, h, openPanel, type PanelApi } from './dom';

const first = (def: VillagerDef) => def.name.split(' ')[0];

/** A villager's portrait on a small canvas (the same drawing the dialogue uses). */
export function portrait(def: VillagerDef, w: number, hgt: number, scale: number, silhouette = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * dpr; c.height = hgt * dpr; c.style.width = w + 'px'; c.style.height = hgt + 'px';
  c.className = 'fr-portrait' + (silhouette ? ' sil' : '');
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.fillStyle = '#fff0f6'; g.fillRect(0, 0, w, hgt);
  drawVillager(g, def, w / 2, hgt - 6, 0, 'down', false, scale);
  return c;
}

/** Ten hearts: full, partly filled (progress to the next one) or empty. */
export function heartRow(id: string, cls = ''): HTMLElement {
  const n = hearts(id), part = heartProgress(id);
  const row = h('div', 'heart-row ' + cls);
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `${n} of ${MAX_HEARTS} hearts`);
  for (let i = 0; i < MAX_HEARTS; i++) {
    const on = i < n, p = i === n && part > 0;
    const s = h('span', 'hr' + (on ? ' on' : p ? ' part' : ''), '♥');
    if (p) s.style.setProperty('--fill', `${Math.round(part * 100)}%`);
    row.append(s);
  }
  return row;
}

/** "♥" / "🙂" / "✗" if the player has discovered how this friend feels about an item. */
export function tasteTag(id: string, item: string): string {
  const k = knownTastes(id);
  return k.love.includes(item) ? '♥' : k.like.includes(item) ? '🙂' : k.dislike.includes(item) ? '✗' : '';
}

// ---------- Journal: Friends tab ----------
const open = new Set<string>();

function tasteRow(id: string, kind: 'love' | 'like' | 'dislike'): HTMLElement {
  const label = kind === 'love' ? '♥ Loves' : kind === 'like' ? '🙂 Likes' : '✗ Dislikes';
  const known = knownTastes(id)[kind], total = tasteTotals(id)[kind];
  const row = h('div', 'fr-taste ' + kind, h('span', 'fr-taste-h', label));
  const chips = h('div', 'fr-chips');
  for (const item of known) { const c = h('span', 'fr-item', itemIcon(item, 20), ITEMS[item]?.name ?? item); c.title = ITEMS[item]?.desc ?? ''; chips.append(c); }
  for (let i = known.length; i < total; i++) chips.append(h('span', 'fr-item unk', '?'));
  row.append(chips);
  return row;
}

function rewardBlock(def: VillagerDef): HTMLElement | null {
  const r = FRIEND_INFO[def.id]?.reward;
  if (!r) return null;
  const got = isMaxed(def.id);
  const pic = r.kind === 'recipe' ? itemIcon(r.id, 30) : h('span', 'fr-gift-emoji', ({ hat: '🎀', top: '👚', bottom: '🩳', dress: '👗', shoes: '👟', bag: '👜', face: '🕶️' } as Record<string, string>)[clothById(r.id)?.slot ?? 'hat']);
  const what = r.kind === 'recipe' ? `Recipe: ${ITEMS[r.id]?.name}` : `Outfit: ${clothById(r.id)?.name ?? 'a special piece'}`;
  const bar = h('div', 'bar', h('div', 'fill'));
  (bar.firstChild as HTMLElement).style.width = `${Math.round((hearts(def.id) / MAX_HEARTS) * 100)}%`;
  return h('div', 'fr-reward' + (got ? ' got' : ''),
    pic,
    h('div', 'grow',
      h('div', 'fr-reward-t', got ? `✓ ${what}` : `At ${MAX_HEARTS} hearts: ${what}`),
      h('div', 'muted small', got ? (r.kind === 'recipe' ? 'Learned! Bake it at the café oven.' : 'It is in your wardrobe now.') : r.blurb),
      got ? null : bar));
}

function friendCard(def: VillagerDef, api: PanelApi): HTMLElement {
  const id = def.id, isOpen = open.has(id), today = isBirthday(id);
  const d = ensureDaily();
  const head = h('button', 'fr-head',
    portrait(def, 56, 62, 1.25),
    h('div', 'grow',
      h('div', 'fr-name', h('b', '', def.name), today ? h('span', 'fr-bday-tag', '🎂 Birthday!') : null),
      h('div', 'muted small', `${bondLabel(id)} · ${hearts(id)}/${MAX_HEARTS} ♥`),
      heartRow(id),
      h('div', 'muted small', `🎂 ${birthdayLabel(id)} (${birthdayText(id).toLowerCase()})`)),
    h('span', 'fr-chev', isOpen ? '▴' : '▾'));
  head.type = 'button';
  head.setAttribute('aria-expanded', String(isOpen));
  head.addEventListener('click', () => { if (open.has(id)) open.delete(id); else open.add(id); api.rerender(); });
  const card = h('div', 'card friend-card' + (today ? ' bday' : '') + (isMaxed(id) ? ' maxed' : ''), head);
  if (!isOpen) return card;
  const mine = state.bonds.letters.filter((l) => l.from === id);
  card.append(
    h('div', 'fr-body',
      h('div', 'muted small', `${def.speciesName} · ${def.personality}`),
      h('div', 'muted small', def.bio),
      h('div', 'fr-sec', 'Gift tastes you have discovered'),
      tasteRow(id, 'love'), tasteRow(id, 'like'), tasteRow(id, 'dislike'),
      h('div', 'muted small', 'Give gifts to find out more. A friend sometimes lets a taste slip in a letter, too.'),
      h('div', 'fr-sec', 'Today'),
      h('div', 'fr-today',
        h('span', 'fr-tick' + (d.talked.includes(id) ? ' done' : ''), `${d.talked.includes(id) ? '✓' : '○'} Chatted`),
        h('span', 'fr-tick' + (d.gifted.includes(id) ? ' done' : ''), `${d.gifted.includes(id) ? '✓' : '○'} Gift`),
        h('span', 'fr-tick' + (d.served.includes(id) ? ' done' : ''), `${d.served.includes(id) ? '✓' : '○'} Drink`),
        today ? h('span', 'fr-tick' + (birthdayDone(id) ? ' done' : ''), `${birthdayDone(id) ? '✓' : '○'} Birthday wish`) : null),
      h('div', 'fr-sec', 'Best friend reward'),
      rewardBlock(def),
      mine.length ? h('div', 'fr-sec', `Letters (${mine.length})`) : null,
      mine.length ? btn(`✉ Read letters from ${first(def)}`, () => openMailbox(id), 'small') : null));
  return card;
}

/** The Journal's Friends tab. */
export function renderFriendsTab(body: HTMLElement, api: PanelApi) {
  const unread = unreadLetters(), gifts = unclaimedGifts();
  body.append(h('div', 'muted', 'Hearts grow when you chat each day, give gifts they love, finish their requests and spend event days together. Tap a friend for details.'));
  body.append(h('div', 'row fr-top',
    btn(`✉ Mailbox${unread ? ` (${unread} new)` : gifts ? ` (${gifts} ${gifts === 1 ? 'gift' : 'gifts'})` : ''}`, () => openMailbox(), 'small'),
    h('span', 'muted small', 'Friends write to you as your hearts grow.')));
  // upcoming birthdays, soonest first (friends who have not moved in yet stay a surprise)
  const here = VILLAGERS.filter(metFriend);
  const soon = [...here].sort((a, b) => daysToBirthday(a.id) - daysToBirthday(b.id)).slice(0, 3);
  if (soon.length) {
    body.append(h('div', 'fr-bdays', h('span', 'fr-sec', 'Birthdays'),
      ...soon.map((v) => h('span', 'fr-bd' + (isBirthday(v.id) ? ' now' : ''), `🎂 ${first(v)} · ${birthdayLabel(v.id)} · ${birthdayText(v.id).toLowerCase()}`))));
  }
  const today = birthdayFriends();
  if (today.length) body.append(h('div', 'card fr-banner', `🎂 It is ${today.map(first).join(' and ')}'s birthday today! Gifts count double, and a birthday wish is always welcome.`));
  for (const v of VILLAGERS) {
    if (!metFriend(v)) {
      const area = AREA_LIST.find((a) => a.id === v.area)!;
      body.append(h('div', 'card row-card locked',
        portrait(v, 52, 56, 1.2, true),
        h('div', 'grow', h('b', '', 'Still napping…'), h('div', 'muted', `Somebody is curled up somewhere in ${area.name}.`), h('div', 'lock-note', `🔒 Open ${area.name} to wake them`)),
        h('div', 'hearts', '???')));
      continue;
    }
    body.append(friendCard(v, api));
  }
}

// ---------- Mailbox ----------
const dayText = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** The mailbox. `from` jumps straight to that friend's letters. */
export function openMailbox(from?: string) {
  let sel: string | null = null;
  let only: string | undefined = from;
  openPanel('Mailbox', (body, api) => {
    const all = state.bonds.letters.filter((l) => (only ? l.from === only : true));
    const letter = sel ? state.bonds.letters.find((l) => l.id === sel) : undefined;
    if (letter) { readView(body, api, letter, () => { sel = null; api.rerender(); }); return; }
    const unread = unreadLetters(), gifts = unclaimedGifts();
    body.append(h('div', 'muted', all.length
      ? `${all.length} ${all.length === 1 ? 'letter' : 'letters'}${unread ? `, ${unread} new` : ''}. Tap one to read it.`
      : 'No letters yet. When your hearts with a friend grow, they will write to you here ✉'));
    if (only) body.append(btn('Show all letters', () => { only = undefined; api.rerender(); }, 'small ghost'));
    const list = h('div', 'mail-list');
    for (const l of all) {
      const def = VILLAGERS.find((v) => v.id === l.from);
      const view = letterView(l);
      if (!def || !view) continue;
      const row = h('button', 'mail-row' + (l.read ? '' : ' unread'),
        portrait(def, 44, 48, 1.0),
        h('div', 'grow', h('b', '', view.subject), h('div', 'muted small', `From ${first(def)} · ${dayText(l.at)}`)),
        giftWaiting(l) ? h('span', 'mail-gift', '🎁') : null,
        l.read ? null : h('span', 'mail-dot', 'new'));
      row.type = 'button';
      row.addEventListener('click', () => { sel = l.id; markRead(l); api.rerender(); });
      list.append(row);
    }
    body.append(list);
    body.append(h('div', 'row end',
      gifts > 1 ? btn(`🎁 Take all gifts (${gifts})`, () => { for (const l of state.bonds.letters) takeGift(l); api.rerender(); }, 'small') : null,
      btn('See friends', () => bus.emit('openFriends'), 'small ghost'),
      btn('Done', () => api.close(), 'small ghost')));
  });
}

function readView(body: HTMLElement, api: PanelApi, l: Letter, back: () => void) {
  const def = VILLAGERS.find((v) => v.id === l.from)!;
  const view = letterView(l)!;
  const paper = h('div', 'letter',
    h('div', 'letter-stamp', '♥'),
    h('div', 'letter-from', `From ${def.name}`),
    h('div', 'letter-subject', view.subject),
    ...view.body.split('\n').map((p) => h('p', 'letter-body', p)),
    h('div', 'letter-sign', view.sign));
  body.append(h('div', 'letter-wrap', portrait(def, 70, 78, 1.6), paper));
  if (view.gift && (view.gift.item || view.gift.pips)) {
    const g = view.gift;
    body.append(h('div', 'card letter-gift',
      g.item ? itemIcon(g.item, 32) : h('span', 'fr-gift-emoji', '✨'),
      h('div', 'grow', h('b', '', l.taken ? 'Gift taken' : 'A little gift is tucked inside'), h('div', 'muted small', giftLabel(g))),
      btn(l.taken ? '✓ Taken' : '🎁 Take it', () => { takeGift(l); api.rerender(); }, 'small', l.taken)));
  }
  body.append(h('div', 'row end', btn('◂ Back to letters', back, 'small'), btn('Done', () => api.close(), 'small ghost')));
}
