// Settings (volume + controls help) and Credits windows, opened from the main menu (or anywhere).
import './scenes.css';
import { VILLAGERS } from '../data';
import { getVolume, setVolume } from '../settings';
import { btn, h, openPanel } from './dom';
import { comfyLogo } from './mainMenu';
import { helpCards } from './panels';

type SettingsTab = 'sound' | 'controls';
const TAB_LABELS: Record<SettingsTab, string> = { sound: '♪ Sound', controls: '✿ Controls' };

function volumeCard(): HTMLElement {
  const pct = h('span', 'vol-pct');
  const slider = h('input', 'vol-slider');
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
  slider.tabIndex = 0;
  slider.setAttribute('aria-label', 'Volume');
  const notes = h('span', 'vol-notes', h('i', '', '♪'), h('i', '', '♫'), h('i', '', '♪'));
  const paint = () => {
    const v = Math.round(getVolume() * 100);
    slider.value = String(v);
    slider.style.setProperty('--v', v + '%');
    pct.textContent = v === 0 ? 'Muted' : v + '%';
    notes.dataset.level = v === 0 ? '0' : v < 40 ? '1' : v < 75 ? '2' : '3';
  };
  const nudge = (d: number) => { setVolume(Math.round(getVolume() * 20 + d) / 20); paint(); };
  slider.addEventListener('input', () => { setVolume(Number(slider.value) / 100); paint(); });
  paint();
  return h('div', 'set-card',
    h('div', 'set-head', h('span', 'set-title', 'Volume'), notes, pct),
    h('div', 'vol-row', btn('−', () => nudge(-1), 'ghost vol-step'), slider, btn('+', () => nudge(1), 'ghost vol-step')),
    h('div', 'muted small', 'The island band is still tuning up — music and sound effects arrive in a later update, and they will follow this slider.'),
  );
}

function controlsView(): HTMLElement[] {
  return [
    h('p', 'muted', 'Play however is comfiest. The card for the device you touched last hops to the top.'),
    ...helpCards(),
  ];
}

export function openSettings(start: SettingsTab = 'sound') {
  let tab = start;
  openPanel('Settings', (body, api) => {
    body.append(h('div', 'tabs', ...(Object.keys(TAB_LABELS) as SettingsTab[]).map((t) =>
      btn(TAB_LABELS[t], () => { tab = t; api.rerender(); }, 'tab' + (t === tab ? ' on' : '')))));
    if (tab === 'sound') body.append(volumeCard(), h('div', 'cheetah-band'));
    else body.append(...controlsView());
    body.append(h('div', 'row end', btn('Done', () => api.close())));
  }, undefined, true);
}

export function openCredits() {
  const sec = (title: string, ...kids: (Node | string)[]) => h('div', 'cred-sec', h('div', 'cred-title', title), ...kids);
  const line = (a: string, b: string) => h('div', 'cred-line', h('span', 'cred-role', a), h('span', 'cred-dots'), h('span', 'cred-name', b));
  openPanel('Credits', (body, api) => {
    body.append(
      h('div', 'cred-hero', comfyLogo(true)),
      sec('Made by',
        line('Design, code & art', 'The Comfy team'),
        line('Island planning', 'The Sugarlily Square committee'),
        line('Quality napping', 'Mimsy (self-appointed)')),
      sec('Starring', ...VILLAGERS.map((v) => line(v.name, v.speciesName)), line('And', 'You')),
      sec('Built with',
        line('3D rendering', 'three.js (MIT License)'),
        line('Lettering', 'Fredoka (SIL Open Font License)'),
        line('Tooling', 'Vite & TypeScript')),
      sec('Special thanks',
        h('div', 'muted', 'To everyone who walks instead of runs, waters the puffberries, and stops to say hello. And to you, for visiting.')),
      h('div', 'cheetah-band'),
      h('p', 'muted small center', 'Every character, place and drawing in Comfy is original to this game.'),
      h('div', 'row end', btn('Lovely!', () => api.close())),
    );
  });
}

/** "Start over?" check before New Game replaces an existing save. */
export function openConfirmNewGame(onYes: () => void) {
  openPanel('Start a new island?', (body, api) => {
    body.append(
      h('p', 'muted', 'You already have an island on this device. Starting a new game replaces it — your pips, outfits, friendships and lanterns begin again.'),
      h('div', 'row end', btn('Keep my island', () => api.close(), 'ghost'), btn('Start fresh', () => { api.close(); onYes(); })),
    );
  });
}
