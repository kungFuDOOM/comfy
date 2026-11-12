// Workbenches: the café counter (brew), café oven (bake) and boutique worktable (craft) share one short timer.
import { sfx } from './audio';
import { RECIPES, ITEMS, type Recipe } from './data';
import { changed, toast } from './bus';
import { addItem, count, removeItem } from './inventory';
import { bump } from './quests';
import { grantXp, skillLevel } from './skills';

export const recipeById = (id: string) => RECIPES.find((x) => x.id === id)!;
export const recipesFor = (bench: Recipe['bench']) => RECIPES.filter((r) => r.bench === bench);
export const isUnlocked = (r: Recipe) => skillLevel(r.skill) >= r.level;

export const canBrew = (id: string) => {
  const r = recipeById(id);
  return isUnlocked(r) && Object.entries(r.needs).every(([k, n]) => count(k) >= n);
};

export const brewing = { id: '', left: 0, total: 0 };

export function startBrew(id: string): boolean {
  if (brewing.id || !canBrew(id)) return false;
  const r = recipeById(id);
  for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
  brewing.id = id; brewing.left = brewing.total = r.seconds;
  changed();
  return true;
}

export function updateBrew(dt: number) {
  if (!brewing.id) return;
  brewing.left -= dt;
  if (brewing.left <= 0) {
    const r = recipeById(brewing.id);
    addItem(brewing.id);
    const name = ITEMS[brewing.id].name;
    toast(r.bench === 'brew' ? `${name} is ready! Serve it to a friend ☕` : r.bench === 'bake' ? `${name} is out of the oven! 🧁` : `You made a ${name}! 🎀`);
    sfx.ding();
    grantXp(r.skill, r.xp);
    bump(r.stat);
    brewing.id = '';
    changed();
  }
}
