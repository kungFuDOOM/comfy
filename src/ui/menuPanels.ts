// Settings (volume + controls help) and Credits windows, opened from the main menu (or anywhere).
import './scenes.css';
import { VILLAGERS } from '../data';
import { sfx } from '../audio';
import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from '../settings';
import { btn, h, openPanel } from './dom';
import { hushbellLogo } from './mainMenu';
import { bus } from '../bus';
import { helpCards, openJournal } from './panels';

type SettingsTab = 'sound' | 'controls';
const TAB_LABELS: Record<SettingsTab, string> = { sound: '♪ Sound', controls: '✿ Controls' };

/** One 0–100 slider card (Music or Sound effects). `onSet` also gets called for the − / + buttons. */
function volumeCard(title: string, hint: string, get: () => number, set: (v: number) => void): HTMLElement {
  const pct = h('span', 'vol-pct');
  const slider = h('input', 'vol-slider');
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
  slider.tabIndex = 0;
  slider.setAttribute('aria-label', title + ' volume');
  const notes = h('span', 'vol-notes', h('i', '', '♪'), h('i', '', '♫'), h('i', '', '♪'));
  const paint = () => {
    const v = Math.round(get() * 100);
    slider.value = String(v);
    slider.style.setProperty('--v', v + '%');
    pct.textContent = v === 0 ? 'Muted' : v + '%';
    notes.dataset.level = v === 0 ? '0' : v < 40 ? '1' : v < 75 ? '2' : '3';
  };
  const nudge = (d: number) => { set(Math.round(get() * 20 + d) / 20); paint(); };
  slider.addEventListener('input', () => { set(Number(slider.value) / 100); paint(); });
  paint();
  return h('div', 'set-card',
    h('div', 'set-head', h('span', 'set-title', title), notes, pct),
    h('div', 'vol-row', btn('−', () => nudge(-1), 'ghost vol-step'), slider, btn('+', () => nudge(1), 'ghost vol-step')),
    h('div', 'muted small', hint),
  );
}

const soundCards = () => [
  volumeCard('Music', 'The island band: a different tune for the menu, the arrival, every time of day, the café and the boutique.',
    getMusicVolume, setMusicVolume),
  volumeCard('Sound effects', 'Footsteps, pips, pickups, gifts, clicks and the little voice-blips when friends talk.',
    getSfxVolume, (v) => { setSfxVolume(v); sfx.coin(); }),
];

function controlsView(): HTMLElement[] {
  return [
    h('p', 'muted', 'Play however is comfiest. The card for the device you touched last hops to the top.'),
    ...helpCards(),
  ];
}

export function openSettings(start: SettingsTab = 'sound', onBack?: () => void) {
  let tab = start;
  openPanel('Settings', (body, api) => {
    body.append(h('div', 'tabs', ...(Object.keys(TAB_LABELS) as SettingsTab[]).map((t) =>
      btn(TAB_LABELS[t], () => { tab = t; api.rerender(); }, 'tab' + (t === tab ? ' on' : '')))));
    if (tab === 'sound') body.append(...soundCards(), h('div', 'cheetah-band'));
    else body.append(...controlsView());
    body.append(h('div', 'row end', btn('Done', () => api.close())));
  }, onBack, true);
}

export function openCredits() {
  const sec = (title: string, ...kids: (Node | string)[]) => h('div', 'cred-sec', h('div', 'cred-title', title), ...kids);
  const line = (a: string, b: string) => h('div', 'cred-line', h('span', 'cred-role', a), h('span', 'cred-dots'), h('span', 'cred-name', b));
  openPanel('Credits', (body, api) => {
    body.append(
      h('div', 'cred-hero', hushbellLogo(true)),
      sec('Made by',
        line('Design, code & art', 'The Hushbell team'),
        line('Island planning', 'The Sugarlily Square committee'),
        line('Quality napping', 'Mimsy (self-appointed)')),
      sec('Starring', ...VILLAGERS.map((v) => line(v.name, v.speciesName)), line('And', 'You')),
      sec('Also waking up', line('Brioche', 'Capybara barista'), line('Oolie', 'Pastel moth'), line('Tuppi', 'Axolotl baker')),
      sec('Built with',
        line('3D rendering', 'three.js (MIT License)'),
        line('Lettering', 'Fredoka (SIL Open Font License)'),
        line('Music & sound', 'Original, synthesized live with the Web Audio API'),
        line('Tooling', 'Vite & TypeScript')),
      sec('Special thanks',
        h('div', 'muted', 'To everyone who walks instead of runs, waters the puffberries, and stops to say hello. And to you, for visiting.')),
      h('div', 'cheetah-band'),
      h('p', 'muted small center', 'Every character, place and drawing here is original to Hushbell.'),
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

/**
 * Pause menu: Esc / Start in the world, or "Pause" in the Journal. The save is written when the game goes back
 * to the title, and on the usual autosave timer in between.
 */
export function openPause() {
  openPanel('Pause menu', (body, api) => {
    body.append(
      h('p', 'muted center', 'The island keeps its slow, sleepy pace while you look around ✿'),
      h('div', 'pause-list',
        btn('Resume', () => api.close(), 'pause-btn primary'),
        btn('Journal', () => { api.close(); openJournal(); }, 'pause-btn'),
        btn('Skills', () => { api.close(); openJournal('skills'); }, 'pause-btn'),
        btn('Settings', () => { openSettings('sound', () => openPause()); }, 'pause-btn'),
        btn('Back to title', () => openConfirmTitle(() => bus.emit('toTitle')), 'pause-btn ghost')),
    );
  });
}

function openConfirmTitle(onYes: () => void) {
  openPanel('Back to the title?', (body, api) => {
    body.append(
      h('p', 'muted', 'Your island is saved automatically, so nothing is lost. You can pick it up again with Continue.'),
      h('div', 'row end', btn('Keep playing', () => api.close(), 'ghost'), btn('Back to title', () => { api.close(); onYes(); })),
    );
  });
}
