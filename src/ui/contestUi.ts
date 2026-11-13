// Styling contest window: theme card -> pick an outfit from the wardrobe -> the judges react one by one -> ribbon.
// Nothing here can go wrong or cost anything: leaving at any point just closes the window, and the contest only counts
// (and the host only becomes "done for today") when she presses Enter. The rules and payout are in contest.ts.
import { drawPlayer } from '../art/characters';
import { sfx } from '../audio';
import { CLOTHES, SLOTS, type ClothDef, type Slot } from '../clothes';
import { START_WORN } from '../clothes/start';
import { tagIcon, tagLabel } from '../clothes/tags';
import { RIBBONS, enterContest, fitOutfit, judgesFor, piecesOf, ribbonOf, type ContestResult, type Theme, type Worn } from '../contest';
import type { VillagerDef } from '../data';
import { canTakeOff, equipOn, owns, resolveLook, wearOutfit } from '../wardrobe';
import { state } from '../state';
import { portrait } from './friendsUi';
import { btn, h, openPanel, type PanelApi } from './dom';
import './contest.css';

const tidy = (w: Worn): Worn => {
  const n = { ...w };
  if (!n.dress) { n.top ??= START_WORN.top; n.bottom ??= START_WORN.bottom; }
  return n;
};
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const first = (def: VillagerDef) => def.name.split(' ')[0];

/**
 * Open the contest hosted by `host` for `theme`. `thumb` draws a wardrobe piece's little picture (it lives in
 * panels.ts, so the caller passes it in).
 */
export function openContest(host: VillagerDef, theme: Theme, thumb: (c: ClothDef, locked: boolean) => HTMLElement) {
  let phase: 'intro' | 'dress' | 'result' = 'intro';
  let draft: Worn = { ...state.worn };
  let slot: Slot = 'dress';
  let result: ContestResult | null = null;
  const judges = judgesFor(host);

  openPanel(`${theme.icon} ${theme.name}`, (body, api) => {
    if (phase === 'intro') renderIntro(body, api);
    else if (phase === 'dress') renderDress(body, api);
    else renderResult(body, api);
  });

  function themeCard() {
    const wants = Object.entries(theme.want).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    return h('div', 'card ct-theme',
      h('div', 'ct-icon', theme.icon),
      h('div', 'grow', h('b', '', theme.name), h('div', 'muted', theme.blurb),
        h('div', 'ct-tags', ...wants.map((t) => h('span', 'ct-tag', `${tagIcon(t)} ${tagLabel(t)}`)),
          theme.accent ? h('span', 'ct-tag accent', `${tagIcon(theme.accent)} ${tagLabel(theme.accent)} accent (just a little!)`) : null)));
  }

  function renderIntro(body: HTMLElement, api: PanelApi) {
    const best = ribbonOf(theme.id);
    body.append(
      h('div', 'bubble', `Welcome to my ${theme.name} contest! Dress up for the theme and we will cheer you on. Every look earns a ribbon.`),
      themeCard(),
      h('div', 'sub', 'Your judges'),
      h('div', 'ct-judges', ...judges.map((j) => h('div', 'ct-judge', portrait(j, 64, 70, 1.35), h('span', 'ct-jname', first(j))))),
      h('div', 'muted small ct-best', best !== undefined ? `Your best ribbon here: ${RIBBONS[best].icon} ${RIBBONS[best].name}` : ''),
      h('div', 'row', btn('Pick my outfit ✿', () => { phase = 'dress'; api.rerender(); }, 'ct-go'), btn('Maybe later', () => api.close(), 'ghost')),
    );
  }

  function previewCanvas(api: PanelApi) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 120 * dpr; cv.height = 150 * dpr; cv.style.width = '120px'; cv.style.height = '150px'; cv.className = 'ct-preview';
    const g = cv.getContext('2d')!;
    const look = resolveLook(draft);
    let raf = 0;
    const loop = (ms: number) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, 120, 150);
      g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 120, 150);
      drawPlayer(g, 60, 128, look, 'down', false, ms / 1000, 2.2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    api.cleanup(() => cancelAnimationFrame(raf));
    return cv;
  }

  function renderDress(body: HTMLElement, api: PanelApi) {
    const fit = fitOutfit(theme, piecesOf(draft));
    const pct = Math.round(fit.score * 100);
    const fill = h('div', 'fill');
    fill.style.width = `${Math.max(4, pct)}%`;
    const mine = CLOTHES.filter((c) => c.slot === slot && owns(c.id));
    const bonus = (c: ClothDef) => fitOutfit(theme, [c]).score;
    mine.sort((a, b) => bonus(b) - bonus(a));
    body.append(
      themeCard(),
      h('div', 'ct-stage', previewCanvas(api),
        h('div', 'grow',
          h('div', 'muted small', 'How well it fits so far'),
          h('div', 'bar ct-meter', fill),
          h('div', 'muted small', pct < 25 ? 'Just getting started. Try pieces marked ✦' : pct < 60 ? 'Getting there!' : pct < 85 ? 'Ooh, looking good!' : 'Judges are going to love this ✿'))),
      h('div', 'dress-filter dress-slots', ...SLOTS.map((s) => btn(h('span', 'inline', s.icon, ' ', s.label), () => { slot = s.id; api.rerender(); }, 'chip-tab' + (slot === s.id ? ' on' : '')))),
    );
    const list = h('div', 'dress-list ct-list');
    if (!mine.length) list.append(h('div', 'muted small', 'Nothing here yet. Shop or earn something for this slot!'));
    for (const c of mine) {
      const on = draft[c.slot] === c.id, fits = bonus(c) > 0;
      const tile = h('button', 'dress-tile ct-tile' + (on ? ' on' : ''), thumb(c, false),
        h('span', 'dt-text', h('b', '', c.name), h('span', 'muted small', on ? '✓ Wearing' : fits ? '✦ Fits the theme' : '')));
      tile.title = c.desc;
      tile.addEventListener('click', () => {
        if (on) { if (canTakeOff(c.slot)) draft = tidy({ ...draft, [c.slot]: null }); }
        else draft = tidy(equipOn(draft, c));
        sfx.tick();
        api.rerender();
      });
      list.append(tile);
    }
    body.append(list,
      h('div', 'row ct-actions',
        btn('Enter the contest 🎀', () => {
          const r = enterContest(host, theme, draft);
          if (!r) { api.close(); return; }
          result = r; phase = 'result';
          wearOutfit(draft); // she stays dressed for the occasion
          api.rerender();
        }, 'ct-go', !piecesOf(draft).length),
        btn('Back', () => { phase = 'intro'; api.rerender(); }, 'ghost')));
  }

  function renderResult(body: HTMLElement, api: PanelApi) {
    const r = result!;
    const rib = RIBBONS[r.tier];
    const rows = r.scores.map((s, i) => {
      const row = h('div', 'ct-score', portrait(s.judge, 48, 54, 1.0),
        h('div', 'grow', h('b', '', first(s.judge)), h('div', 'ct-stars', stars(s.stars)), h('div', 'ct-say', `“${s.line}”`), s.note ? h('div', 'muted small', s.note) : null));
      row.style.animationDelay = `${i * 0.85}s`;
      return row;
    });
    const end = r.scores.length * 0.85 + 0.1;
    const ribbon = h('div', 'ct-ribbon', h('div', 'ct-rib-icon', rib.icon), h('b', '', rib.name),
      h('div', 'muted small', r.improved ? (r.tier === 3 ? 'A Golden Bow! You are a star ✿' : 'A new best for this theme!') : 'You already have a ribbon like this, but it was a lovely look.'),
      h('div', 'shift-pay', h('span', '', `+${r.pips} pips`), h('span', '', `+${r.xp} Style XP`), h('span', '', `+${r.friend} ♥ ${first(host)}`)));
    ribbon.style.animationDelay = `${end}s`;
    ribbon.style.setProperty('--rib', rib.color);
    body.append(h('div', 'ct-scores', ...rows), ribbon);
    const done = btn('Done', () => api.close(), 'ct-go ct-done');
    done.style.animationDelay = `${end + 0.3}s`;
    body.append(done);
    const t = window.setTimeout(() => sfx.ding(), end * 1000);
    api.cleanup(() => clearTimeout(t));
  }
}
