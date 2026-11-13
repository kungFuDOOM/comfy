// Pie baking: a short, cozy timing game. Three steps (roll the crust, crimp the edge, bake to golden): press the big
// button while the heart is over the pink zone. There is no failing; a better rhythm just earns a Golden Pie
// (two pies). Ingredients are only used up when the pie is finished, so closing the window loses nothing.
import { startAct } from '../actions';
import { sfx } from '../audio';
import { itemIcon } from '../art/icons';
import { changed, toast } from '../bus';
import { ITEMS, RECIPES, type Recipe } from '../data';
import { bumpEvent, chapterOpen } from '../events';
import { addItem, count, removeItem } from '../inventory';
import { bump } from '../quests';
import { grantXp } from '../skills';
import { btn, h, openPanel, type PanelApi } from '../ui/dom';

const STEPS = [
  { name: 'Roll the crust', hint: 'Press when the heart is in the pink zone', width: 0.3, speed: 0.75 },
  { name: 'Crimp the edge', hint: 'A little quicker now. You have got this', width: 0.26, speed: 0.95 },
  { name: 'Bake until golden', hint: 'Pull it out at the perfect moment', width: 0.22, speed: 1.15 },
];
type Rating = 'perfect' | 'nice' | 'cozy';
const RATING_TEXT: Record<Rating, string> = { perfect: 'Perfect! ✿', nice: 'Nice!', cozy: 'Cozy and close' };

/** Seasonal oven recipe with everything in the bag (and its event and chapter open). Shared by the pie and cookie games. */
export const canBakePie = (r: Recipe) => !!r.event && chapterOpen(r.event, r.chapter) && Object.entries(r.needs).every(([k, n]) => count(k) >= n);
const pieRecipes = () => RECIPES.filter((r) => r.event === 'harvest' && r.bench === 'bake');

/** Open the baking window for a pie recipe id. */
export function openPieBake(recipeId: string) {
  const found = RECIPES.find((x) => x.id === recipeId);
  if (!found || !canBakePie(found)) { toast('Bring the ingredients to bake this pie.'); return; }
  const r: Recipe = found;
  let step = 0, ratings: Rating[] = [], made: number | null = null, locked = false, closed = false;
  let zoneC = 0.5, pos = 0, t0 = performance.now(), resultText = '';
  const newZone = () => { zoneC = 0.22 + Math.random() * 0.56; t0 = performance.now(); pos = 0; };
  newZone();

  startAct('bake', 0, { hold: true }); // whisking at the oven until this window closes
  openPanel('Bake a Pie 🥧', (body, api) => {
    const pie = r.id;
    if (made !== null) return renderDone(body, api);
    const s = STEPS[step];
    const bar = h('div', 'pie-bar');
    const zone = h('div', 'pie-zone');
    zone.style.left = `${(zoneC - s.width / 2) * 100}%`; zone.style.width = `${s.width * 100}%`;
    const inner = h('div', 'pie-zone-core');
    inner.style.left = `${(zoneC - s.width / 5) * 100}%`; inner.style.width = `${(s.width / 5) * 2 * 100}%`;
    const marker = h('div', 'pie-marker', '♥');
    bar.append(zone, inner, marker);
    const note = h('div', 'pie-note', resultText || s.hint);
    const press = btn(step === 2 ? 'Take it out!' : step === 1 ? 'Crimp!' : 'Roll!', () => stop(), 'pie-press');
    const prog = h('div', 'pie-steps', ...STEPS.map((x, i) => h('span', 'pie-step' + (i < step ? ' done' : i === step ? ' now' : ''), i < step ? '✓ ' : '', x.name)));
    const pieImg = itemIcon(pie, 84); pieImg.style.opacity = String(0.35 + step * 0.22);
    body.append(
      h('div', 'muted', `${ITEMS[pie].name}: ${STEPS.length} cozy steps. There is no way to fail, only to be extra golden.`),
      h('div', 'pie-head', pieImg, h('div', 'pie-needs', ...Object.entries(r.needs).map(([k, n]) => h('span', 'need ok', itemIcon(k, 18), `${ITEMS[k].name} ×${n}`)))),
      prog, bar, note, press,
    );
    // marker sweeps back and forth until the button is pressed
    let raf = 0;
    const loop = () => {
      if (!locked) {
        const t = ((performance.now() - t0) / 1000) * s.speed;
        const tri = Math.abs(((t % 2) + 2) % 2 - 1); // 0..1..0
        pos = tri;
        marker.style.left = `${pos * 100}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    api.cleanup(() => cancelAnimationFrame(raf));

    function stop() {
      if (locked) return;
      locked = true;
      const d = Math.abs(pos - zoneC);
      const rating: Rating = d <= s.width / 5 ? 'perfect' : d <= s.width / 2 ? 'nice' : 'cozy';
      ratings.push(rating);
      resultText = RATING_TEXT[rating];
      note.textContent = resultText; note.classList.add(rating);
      sfx.tick();
      setTimeout(() => {
        if (closed) return; // window closed mid-step: bake nothing (ingredients stay in the bag), don't revive the panel
        locked = false;
        step++;
        if (step >= STEPS.length) finish();
        else { newZone(); resultText = ''; }
        api.rerender();
      }, 650);
    }
  }, () => { closed = true; });

  function finish() {
    const perfects = ratings.filter((x) => x === 'perfect').length;
    const golden = perfects >= 2;
    // ingredients leave the bag only now
    if (!canBakePie(r)) { made = 0; resultText = 'The ingredients went missing, so nothing was baked.'; return; }
    for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
    made = golden ? 2 : 1;
    addItem(r.id, made);
    grantXp(r.skill, r.xp + perfects * 6);
    bump(r.stat);
    bumpEvent('harvest', 'pies', 1);
    if (golden) bumpEvent('harvest', 'goldenPies', 1);
    sfx.ding();
    toast(golden ? `A Golden ${ITEMS[r.id].name}! You baked two 🥧` : `${ITEMS[r.id].name} is out of the oven! 🥧`);
    changed();
  }

  function renderDone(body: HTMLElement, api: PanelApi) {
    const golden = (made ?? 0) > 1;
    body.append(
      h('div', 'pie-done', itemIcon(r.id, 96), h('b', '', made === 0 ? 'Nothing baked' : golden ? 'Golden Pie! Two pies!' : 'Out of the oven!'),
        h('div', 'muted', made === 0 ? resultText : `${ITEMS[r.id].name} ×${made}. Villagers adore pies as gifts: try handing one to a friend.`)),
      h('div', 'row', ...pieRecipes().map((x) => btn(`Bake ${ITEMS[x.id].name}`, () => { api.close(); openPieBake(x.id); }, '', !canBakePie(x))), btn('Done', () => api.close(), 'ghost')),
    );
  }
}
