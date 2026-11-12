// Level-up popup: a soft pink sticker that hops in near the top of the screen with a little sparkle burst.
// It never traps the player: no backdrop, it fades out on its own, and a tap / click / A / Esc tucks it away.
// Several level-ups in a row queue up; repeat level-ups of the same skill merge into one sticker.
import { sfx } from '../audio';
import { bus } from '../bus';
import { SKILLS, type SkillId } from '../data';
import { h } from './dom';

export interface LevelUpEvent { id: SkillId; level: number; gained: number }

const SHOW_MS = 2900;
const OUT_MS = 320;
const SPARKS = ['✦', '✧', '♡', '✿', '·'];

const queue: LevelUpEvent[] = [];
let showing: { ev: LevelUpEvent; el: HTMLElement; levelEl: HTMLElement; timer: number } | null = null;
let leaving = false;

const def = (id: SkillId) => SKILLS.find((s) => s.id === id)!;

function enqueue(ev: LevelUpEvent) {
  // the same skill climbing again while its sticker is up: just bump the number and restart the timer
  if (showing && !leaving && showing.ev.id === ev.id) {
    showing.ev.level = ev.level;
    showing.ev.gained += ev.gained;
    fillLevel(showing.levelEl, showing.ev);
    showing.levelEl.classList.remove('bump'); void showing.levelEl.offsetWidth; showing.levelEl.classList.add('bump');
    burst(showing.el, 6);
    sfx.levelUp();
    clearTimeout(showing.timer);
    showing.timer = window.setTimeout(dismissLevelUp, SHOW_MS);
    return;
  }
  const waiting = queue.find((q) => q.id === ev.id);
  if (waiting) { waiting.level = ev.level; waiting.gained += ev.gained; }
  else queue.push({ ...ev });
  if (!showing) next();
}

function fillLevel(el: HTMLElement, ev: LevelUpEvent) {
  el.textContent = `Level ${ev.level}`;
  if (ev.gained > 1) el.append(h('span', 'lvl-plus', `+${ev.gained}`));
}

function burst(card: HTMLElement, n: number) {
  const layer = card.querySelector('.lvl-sparks')!;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const r = 52 + Math.random() * 46;
    const s = h('span', 'lvl-spark', SPARKS[i % SPARKS.length]);
    s.style.setProperty('--dx', `${Math.cos(a) * r * 1.5}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * r * 0.8}px`);
    s.style.setProperty('--rot', `${Math.round(Math.random() * 120 - 60)}deg`);
    s.style.animationDelay = `${Math.round(Math.random() * 90)}ms`;
    s.style.fontSize = `${12 + Math.round(Math.random() * 10)}px`;
    layer.append(s);
    setTimeout(() => s.remove(), 1100);
  }
}

function next() {
  const ev = queue.shift();
  if (!ev) return;
  const d = def(ev.id);
  const levelEl = h('div', 'lvl-level');
  fillLevel(levelEl, ev);
  const el = h('div', 'lvlup',
    h('div', 'lvl-sparks'),
    h('div', 'lvl-icon', d.icon),
    h('div', 'lvl-text',
      h('div', 'lvl-kicker', '✿ Level up! ✿'),
      h('div', 'lvl-name', d.name),
      levelEl,
      h('div', 'lvl-note', 'Something new might be within reach.')));
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); dismissLevelUp(); });
  document.getElementById('ui')!.append(el);
  leaving = false;
  showing = { ev, el, levelEl, timer: window.setTimeout(dismissLevelUp, SHOW_MS) };
  burst(el, 12);
  sfx.levelUp();
}

/** Tuck the current sticker away. Returns true if there was one (so the input that closed it is consumed). */
export function dismissLevelUp(): boolean {
  if (!showing || leaving) return false;
  const cur = showing;
  leaving = true;
  clearTimeout(cur.timer);
  cur.el.classList.add('out');
  setTimeout(() => {
    cur.el.remove();
    if (showing === cur) { showing = null; leaving = false; }
    next();
  }, OUT_MS);
  return true;
}

export const levelUpShowing = () => !!showing && !leaving;

bus.on('levelup', enqueue);
