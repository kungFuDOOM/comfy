// Cutscene overlay: soft letterbox bars, a place-name card, a typewriter dialogue bubble and a Skip pill.
import './scenes.css';
import { drawVillager } from '../art/characters';
import type { VillagerDef } from '../data';
import { glyphEl } from '../input/prompts';
import { h } from './dom';

export interface CutsceneUi {
  /** Place-name card ("Sugarlily Isle"). */
  showTitle(on: boolean): void;
  /** Open the dialogue bubble for a speaker (draws their portrait). */
  openDialogue(def: VillagerDef, name: string): void;
  closeDialogue(): void;
  /** Show `text` with the first `shown` characters revealed; `done` shows the "next" bobber. */
  setLine(text: string, shown: number, done: boolean): void;
  destroy(): void;
}

export function createCutsceneUi(on: { tap(): void; skip(): void }, title: { name: string; sub: string }): CutsceneUi {
  const card = h('div', 'cs-title', h('div', 'cs-title-sub', title.sub), h('div', 'cs-title-name', title.name), h('div', 'cs-title-rule', '✿'));
  const portrait = document.createElement('canvas');
  portrait.className = 'cs-portrait';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  portrait.width = 96 * dpr; portrait.height = 104 * dpr;
  const nameEl = h('div', 'cs-name');
  const shownEl = h('span', ''), restEl = h('span', 'cs-rest');
  const next = h('span', 'cs-next', '▼');
  const dlg = h('div', 'cs-dlg', portrait, h('div', 'cs-bubble', nameEl, h('div', 'cs-text', shownEl, restEl), next));
  const skip = h('button', 'cs-skip', 'Skip', glyphEl('cancel'));
  skip.type = 'button';
  skip.addEventListener('pointerdown', (e) => e.stopPropagation());
  skip.addEventListener('click', (e) => { e.stopPropagation(); on.skip(); });
  const root = h('div', 'cs', h('div', 'cs-bar top'), h('div', 'cs-bar bottom'), card, dlg, skip);
  root.addEventListener('pointerdown', (e) => { e.preventDefault(); on.tap(); });
  document.getElementById('ui')!.append(root);
  requestAnimationFrame(() => root.classList.add('in'));

  let lastText = '', lastShown = -1;
  return {
    showTitle(v) { card.classList.toggle('on', v); },
    openDialogue(def, name) {
      const g = portrait.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, 96, 104);
      g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 96, 104);
      drawVillager(g, def, 48, 94, 0.4, 'down', false, 2);
      nameEl.textContent = name;
      dlg.classList.add('on');
    },
    closeDialogue() { dlg.classList.remove('on'); },
    setLine(text, shown, done) {
      if (text !== lastText || shown !== lastShown) {
        lastText = text; lastShown = shown;
        shownEl.textContent = text.slice(0, shown);
        restEl.textContent = text.slice(shown); // invisible, keeps the bubble from reflowing as letters appear
      }
      next.classList.toggle('on', done);
    },
    destroy() { root.remove(); },
  };
}
