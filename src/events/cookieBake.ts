// Twinkle cookie baking (week 2 on): a tiny oven-timing game, not a copy of the pie panel. Three trays go in one after
// the other; each tray's heat creeps up once from raw to toasty and you press "Out!" when the heart reaches the golden
// zone. There is no failing (a late tray is just extra toasty). Two or more golden trays bake a bonus cookie.
// Ingredients only leave the bag when the last tray is out, so closing the window loses nothing. Every timer is
// cleared when the window closes or redraws, so nothing keeps running (or revives the panel) afterwards.
import { startAct } from '../actions';
import { sfx } from '../audio';
import { itemIcon } from '../art/icons';
import { changed, toast } from '../bus';
import { ITEMS, RECIPES, type Recipe } from '../data';
import { bumpEvent } from '../events';
import { addItem, removeItem } from '../inventory';
import { bump } from '../quests';
import { grantXp } from '../skills';
import { btn, h, openPanel, type PanelApi } from '../ui/dom';
import { canBakePie } from './pieBake';

const TRAYS = [
  { name: 'Tray one', hint: 'Press Out! when the heart is in the golden zone', secs: 3.0, from: 0.58, to: 0.82 },
  { name: 'Tray two', hint: 'The oven is warmer now. Watch the heart', secs: 2.5, from: 0.62, to: 0.84 },
  { name: 'Tray three', hint: 'Last tray. Make it glow', secs: 2.1, from: 0.66, to: 0.86 },
];
type Rating = 'golden' | 'toasty' | 'soft';
const RATING_TEXT: Record<Rating, string> = { golden: 'Golden! ✿', toasty: 'Lovely and toasty', soft: 'Soft and cozy' };

const cookieRecipes = () => RECIPES.filter((r) => r.event === 'twinkle' && r.bench === 'bake');

/** Open the cookie oven for a cookie recipe id. */
export function openCookieBake(recipeId: string) {
  const found = RECIPES.find((x) => x.id === recipeId);
  if (!found || !canBakePie(found)) { toast('Bring the ingredients (and wait for week 2) to bake cookies.'); return; }
  const r: Recipe = found;
  let tray = 0, made: number | null = null, locked = false, closed = false, goldens = 0, resultText = '';
  let startAt = 0, heat = 0, settle = 0, raf = 0;

  const stopTimers = () => { cancelAnimationFrame(raf); clearTimeout(settle); raf = 0; settle = 0; };

  startAct('bake', 0, { hold: true }); // whisking at the oven until this window closes
  openPanel('Bake Cookies 🍪', (body, api) => {
    if (made !== null) return renderDone(body, api);
    const s = TRAYS[tray];
    startAt = performance.now(); heat = 0;
    const bar = h('div', 'ck-bar');
    const zone = h('div', 'ck-zone');
    zone.style.left = `${s.from * 100}%`; zone.style.width = `${(s.to - s.from) * 100}%`;
    const fill = h('div', 'ck-fill');
    const marker = h('div', 'ck-marker', '♥');
    bar.append(fill, zone, marker);
    const note = h('div', 'ck-note', resultText || s.hint);
    const press = btn('Out!', () => out(), 'pie-press');
    press.disabled = locked;
    const prog = h('div', 'pie-steps', ...TRAYS.map((x, i) => h('span', 'pie-step' + (i < tray ? ' done' : i === tray ? ' now' : ''), i < tray ? '✓ ' : '', x.name)));
    body.append(
      h('div', 'muted', `${ITEMS[r.id].name}: three trays, no way to fail, only to be extra golden.`),
      h('div', 'pie-head', itemIcon(r.id, 84), h('div', 'pie-needs', ...Object.entries(r.needs).map(([k, n]) => h('span', 'need ok', itemIcon(k, 18), `${ITEMS[k].name} ×${n}`)))),
      prog, bar, note, press,
    );
    // the heat climbs once; at the end of the bar the tray comes out by itself (toasty, never a failure)
    const loop = () => {
      if (closed) return;
      if (!locked) {
        heat = Math.min(1, (performance.now() - startAt) / 1000 / s.secs);
        marker.style.left = `${heat * 100}%`; fill.style.width = `${heat * 100}%`;
        if (heat >= 1) { out(); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    api.cleanup(stopTimers);

    function out() {
      if (locked || closed) return;
      locked = true;
      cancelAnimationFrame(raf);
      const rating: Rating = heat >= s.from && heat <= s.to ? 'golden' : heat > s.to || heat >= s.from - 0.16 ? 'toasty' : 'soft';
      if (rating === 'golden') goldens++;
      resultText = RATING_TEXT[rating];
      note.textContent = resultText; note.classList.add(rating);
      press.disabled = true;
      sfx.tick();
      settle = window.setTimeout(() => {
        settle = 0;
        if (closed) return; // window closed mid-tray: bake nothing, ingredients stay in the bag
        locked = false; tray++;
        if (tray >= TRAYS.length) finish(); else resultText = '';
        api.rerender();
      }, 650);
    }
  }, () => { closed = true; stopTimers(); });

  function finish() {
    if (!canBakePie(r)) { made = 0; resultText = 'The ingredients went missing, so nothing was baked.'; return; }
    for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
    made = goldens >= 2 ? 3 : 2; // a batch is two cookies, three when the oven loved you
    addItem(r.id, made);
    grantXp(r.skill, r.xp + goldens * 5);
    bump(r.stat);
    bumpEvent('twinkle', 'batches', 1);
    if (goldens >= 2) bumpEvent('twinkle', 'goldenBatches', 1);
    sfx.ding();
    toast(`${ITEMS[r.id].name} ×${made} fresh from the oven! 🍪`);
    changed();
  }

  function renderDone(body: HTMLElement, api: PanelApi) {
    body.append(
      h('div', 'pie-done', itemIcon(r.id, 96), h('b', '', made === 0 ? 'Nothing baked' : goldens >= 2 ? 'A golden batch! Three cookies!' : 'Fresh from the oven!'),
        h('div', 'muted', made === 0 ? resultText : `${ITEMS[r.id].name} ×${made}. Friends adore cookies as gifts: try a gift exchange in week 4.`)),
      h('div', 'row', ...cookieRecipes().map((x) => btn(`Bake ${ITEMS[x.id].name}`, () => { api.close(); openCookieBake(x.id); }, '', !canBakePie(x))), btn('Done', () => api.close(), 'ghost')),
    );
  }
}
