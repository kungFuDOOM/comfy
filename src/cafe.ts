// Café: brew coffee drinks. Serving happens through villager dialogue.
import { sfx } from './audio';
import { RECIPES, ITEMS } from './data';
import { changed, toast } from './bus';
import { addItem, count, removeItem } from './inventory';
import { bump } from './quests';

export const canBrew = (id: string) => {
  const r = RECIPES.find((x) => x.id === id)!;
  return Object.entries(r.needs).every(([k, n]) => count(k) >= n);
};

export const brewing = { id: '', left: 0, total: 0 };

export function startBrew(id: string): boolean {
  if (brewing.id || !canBrew(id)) return false;
  const r = RECIPES.find((x) => x.id === id)!;
  for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
  brewing.id = id; brewing.left = brewing.total = r.seconds;
  changed();
  return true;
}

export function updateBrew(dt: number) {
  if (!brewing.id) return;
  brewing.left -= dt;
  if (brewing.left <= 0) {
    addItem(brewing.id);
    toast(`${ITEMS[brewing.id].name} is ready! Serve it to a friend ☕`);
    sfx.ding();
    bump('brewed');
    brewing.id = '';
    changed();
  }
}
