// The conversation widget in a villager's window: a softly animated portrait, a speech bubble that types out each tap
// with the friend's own blip voice, a little mood sticker (weather, holiday, gift...), progress dots, and reply pills
// when they ask you something. Tap the bubble (or press A / E / Space) to finish a line, then again for the next one.
// The words come from talk/engine.ts; this file only presents them.
import './talk.css';
import { drawVillager } from '../art/characters';
import { sfx } from '../audio';
import type { VillagerDef } from '../data';
import { currentMode } from '../input/prompts';
import { noteAnswer, plainBeats, type Beat } from '../talk/engine';
import { h } from './dom';
import { setFocus } from './focus';

const CPS = 48;
const PIC_W = 104, PIC_H = 112;

export interface Convo {
  el: HTMLElement;
  /** Say something new (replaces whatever was being said). `note` floats a small chip, e.g. "+6 friendship ♥". */
  say(beats: Beat[], note?: string): void;
  /** Bring the bubble back into view (after a long gift list, say). */
  reveal(): void;
  destroy(): void;
}

export function createConvo(def: VillagerDef): Convo {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pic = document.createElement('canvas');
  pic.className = 'tk-portrait';
  pic.width = PIC_W * dpr; pic.height = PIC_H * dpr;
  const g = pic.getContext('2d')!;
  const mood = h('span', 'tk-mood');
  const note = h('span', 'tk-note');
  const picWrap = h('div', 'tk-pic', pic, mood, note);

  const shown = h('span', ''), rest = h('span', 'tk-rest');
  const text = h('div', 'tk-text', shown, rest);
  text.setAttribute('aria-live', 'polite');
  const next = h('span', 'tk-next');
  next.setAttribute('aria-hidden', 'true');
  const dots = h('span', 'tk-dots');
  const bubble = h('button', 'tk-bubble', h('span', 'tk-name', def.name.split(' ')[0]), text, dots, next);
  bubble.type = 'button';
  const choices = h('div', 'tk-choices');
  const el = h('div', 'tk', picWrap, h('div', 'tk-right', bubble, choices));

  let beats: Beat[] = [];
  let i = 0, line = '', n = 0, t0 = 0, typing = false, asking = false;
  let typeIv = 0;

  // the portrait breathes (and hops while talking)
  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, PIC_W, PIC_H);
    g.fillStyle = '#fff0f6'; g.fillRect(0, 0, PIC_W, PIC_H);
    drawVillager(g, def, PIC_W / 2, PIC_H - 10, performance.now() / 1000, 'down', false, 2.15);
  };
  draw();
  const drawIv = window.setInterval(draw, 90);

  const paint = () => { shown.textContent = line.slice(0, n); rest.textContent = line.slice(n); };
  const hint = () => {
    const more = i < beats.length - 1;
    next.textContent = more ? '▼' : '✿';
    next.className = 'tk-next' + (typing || asking ? '' : more ? ' on' : ' on end');
    bubble.setAttribute('aria-label', typing ? 'Show the whole line' : more ? 'Next' : 'Done');
  };
  const paintDots = () => {
    dots.replaceChildren();
    if (beats.length < 2) return;
    beats.forEach((_, k) => dots.append(h('i', k < i ? 'was' : k === i ? 'on' : '')));
  };

  function finish() {
    clearInterval(typeIv);
    typing = false;
    n = line.length; paint();
    picWrap.classList.remove('talking');
    const ask = beats[i]?.ask;
    if (ask?.length) showChoices(ask, beats[i]?.qid);
    hint();
  }

  function show(k: number) {
    i = k;
    const b = beats[i];
    line = b?.text ?? '';
    n = 0; t0 = performance.now(); typing = true; asking = false;
    choices.replaceChildren();
    paint(); paintDots(); hint();
    if (b?.mood) {
      mood.textContent = b.mood;
      mood.classList.remove('on'); void mood.offsetWidth; mood.classList.add('on');
    }
    picWrap.classList.add('talking');
    clearInterval(typeIv);
    typeIv = window.setInterval(() => {
      const want = Math.floor(((performance.now() - t0) / 1000) * CPS);
      if (want <= n) return;
      for (let c = n; c < Math.min(line.length, want); c++) if (/\S/.test(line[c]) && c % 2 === 0) { sfx.blip(def.id, c); break; }
      n = Math.min(line.length, want); paint();
      if (n >= line.length) finish();
    }, 30);
  }

  function showChoices(ask: [string, string][], qid?: string) {
    asking = true;
    choices.replaceChildren(...ask.map(([label, answer], k) => {
      const b = h('button', 'tk-choice', label);
      b.type = 'button';
      b.style.animationDelay = `${k * 60}ms`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.confirm();
        noteAnswer(def.id, qid, k);
        asking = false;
        const said = h('div', 'tk-said', label);
        choices.replaceChildren(said);
        beats = [...beats.slice(0, i + 1), ...plainBeats(answer)];
        delete beats[i].ask; // answered: it never asks again in this chat
        show(i + 1);
        if (currentMode() !== 'touch') setFocus(bubble, currentMode() === 'gamepad', false);
      });
      return b;
    }));
    const mode = currentMode();
    if (mode !== 'touch') { const first = choices.querySelector<HTMLElement>('.tk-choice'); if (first) setFocus(first, mode === 'gamepad', false); }
  }

  function tap() {
    if (typing) { finish(); return; }
    if (asking) { choices.classList.remove('nudge'); void choices.offsetWidth; choices.classList.add('nudge'); return; }
    if (i < beats.length - 1) { sfx.tick(); show(i + 1); return; }
    // the end: a tiny wiggle so the tap still feels answered
    picWrap.classList.remove('wiggle'); void picWrap.offsetWidth; picWrap.classList.add('wiggle');
  }
  bubble.addEventListener('click', (e) => { e.stopPropagation(); tap(); });
  picWrap.addEventListener('click', (e) => { e.stopPropagation(); tap(); });

  return {
    el,
    say(list, chip) {
      beats = list.length ? list.map((b) => ({ ...b })) : [{ text: '...' }];
      show(0);
      if (chip) {
        note.textContent = chip;
        note.classList.remove('on'); void note.offsetWidth; note.classList.add('on');
      }
    },
    reveal() { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
    destroy() { clearInterval(typeIv); clearInterval(drawIv); },
  };
}
