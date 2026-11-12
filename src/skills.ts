// Soft skills: total XP is stored, the level is derived from it so the two can never drift apart.
import { sfx } from './audio';
import { changed, toast } from './bus';
import { SKILLS, type SkillId } from './data';
import { state } from './state';

export const MAX_LEVEL = 25;

/** XP needed to climb from `level` to `level + 1`: quick at first, gently slower later. */
export const xpToNext = (level: number) => Math.round(40 * level ** 1.6);

const totals: number[] = [0];
for (let l = 1; l < MAX_LEVEL; l++) totals.push(totals[l - 1] + xpToNext(l));
/** Total XP at which `level` begins. */
export const xpAtLevel = (level: number) => totals[Math.max(0, Math.min(MAX_LEVEL, level) - 1)];

export const skillXp = (id: SkillId) => Math.max(0, state.skills[id] ?? 0);

export function levelFor(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= totals[l]) l++;
  return l;
}

export const skillLevel = (id: SkillId) => levelFor(skillXp(id));

export interface SkillProgress { level: number; into: number; need: number; maxed: boolean }
export function skillProgress(id: SkillId): SkillProgress {
  const xp = skillXp(id), level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: 1, need: 1, maxed: true };
  return { level, into: xp - xpAtLevel(level), need: xpToNext(level), maxed: false };
}

export const skillName = (id: SkillId) => SKILLS.find((s) => s.id === id)!.name;

/** The one way XP is earned. Toasts and plays a sting on level-up. */
export function grantXp(id: SkillId, amount: number) {
  if (amount <= 0) return;
  const before = skillLevel(id);
  state.skills[id] = skillXp(id) + amount;
  const after = skillLevel(id);
  if (after > before) {
    toast(`${skillName(id)} level ${after}! ✿ Something new might be within reach.`);
    sfx.levelUp();
  }
  changed();
}
