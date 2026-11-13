// The Bulletin Board panel: daily and weekly errands as pinned notes, each with a giver portrait, progress and a Claim button.
import { drawVillager } from '../art/characters';
import { CURRENCY, ITEMS, SKILLS, VILLAGERS } from '../data';
import { claimErrand, errandProgress, errandReady, errandsOf, refreshText } from '../errands';
import type { Errand, ErrandScope } from '../errandData';
import { btn, h, openPanel, type PanelApi } from './dom';
import './errands.css';

function portrait(giver: string): HTMLElement {
  const def = VILLAGERS.find((v) => v.id === giver);
  const cv = h('canvas', 'errand-face');
  cv.width = 64; cv.height = 68;
  const g = cv.getContext('2d');
  if (g && def) { g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 64, 68); drawVillager(g, def, 32, 62, 0, 'down', false, 1.4); }
  return cv;
}

function note(e: Errand, api: PanelApi): HTMLElement {
  const p = errandProgress(e), ready = errandReady(e);
  const def = VILLAGERS.find((v) => v.id === e.giver);
  const bar = h('div', 'bar', h('div', 'fill'));
  (bar.firstChild as HTMLElement).style.width = `${Math.round((p / e.n) * 100)}%`;
  const skill = SKILLS.find((s) => s.id === e.skill);
  const rewards = [`${e.pips} ${CURRENCY}`, `+${e.hearts} ♥`, `${e.xp} ${skill?.name ?? ''} XP`, e.gift ? ITEMS[e.gift].name : ''].filter(Boolean).join(' · ');
  const act = e.done
    ? h('div', 'errand-done', '✓ Done')
    : btn(ready ? 'Claim ♡' : e.item ? 'Bring it' : 'Keep going', () => { if (claimErrand(e)) api.rerender(); }, ready ? '' : 'ghost', !ready);
  return h('div', 'errand' + (e.done ? ' done' : ready ? ' ready' : '') + (e.scope === 'weekly' ? ' weekly' : ''),
    h('div', 'errand-pin'),
    portrait(e.giver),
    h('div', 'errand-main',
      h('div', 'errand-from', def?.name ?? 'A friend'),
      h('div', 'errand-text', e.text),
      e.done ? null : h('div', 'errand-prog', bar, h('span', '', `${p} / ${e.n}`)),
      h('div', 'errand-reward', rewards)),
    act);
}

function section(body: HTMLElement, api: PanelApi, scope: ErrandScope) {
  const list = errandsOf(scope);
  body.append(h('div', 'errand-head', h('b', '', scope === 'daily' ? '☀ Today' : '✿ This week'), h('span', 'muted small', refreshText(scope))));
  if (!list.length) body.append(h('div', 'muted', 'Nothing posted right now. Check back soon ♡'));
  for (const e of list) body.append(note(e, api));
}

export function openBoard() {
  openPanel('Bulletin Board', (body, api) => {
    body.append(h('div', 'muted', 'Friends pin little favours here. Finish them for pips, hearts and skill XP. Nothing expires in a scary way: they just refresh with the real day and week.'));
    section(body, api, 'daily');
    section(body, api, 'weekly');
  });
}
