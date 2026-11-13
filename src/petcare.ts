// Pet Care: the pet-mastery skill. Pats, playtime and snacks grow it; levels unlock small, cozy things.
// XP only pays for the first few of each care action per (real) day, so it never turns into a grind.
import { bus, changed, toast } from './bus';
import { ITEMS } from './data';
import { addItem, count, earn, removeItem } from './inventory';
import { petHappy, petName } from './pet';
import { bump } from './quests';
import { PET_ITEMS, type PetCare } from './petData';
import { grantXp, skillLevel } from './skills';
import { state } from './state';
import { getClock } from './time';

export type CareKind = 'pat' | 'play' | 'snack';
/** XP per action and how many each day still pay it. */
export const CARE: Record<CareKind, { xp: number; cap: number; label: string }> = {
  pat: { xp: 4, cap: 6, label: 'Pat' },
  play: { xp: 12, cap: 4, label: 'Play' },
  snack: { xp: 10, cap: 3, label: 'Snack' },
};
/** Foods a pet will happily nibble (any one in the bag). */
export const PET_SNACKS = ['berry_tart', 'puffberry', 'minnow', 'blossom_scone'];
export const SNIFF_LEVEL = 5;

/** Today's counters (rolled over with the real date). */
export function careToday(): PetCare {
  const day = getClock().dayKey;
  if (state.petCare.day !== day) state.petCare = { day, pat: 0, play: 0, snack: 0, sniff: 0 };
  return state.petCare;
}
export const careLeft = (k: CareKind) => Math.max(0, CARE[k].cap - careToday()[k]);

/** Count one care action; pays XP while the daily allowance lasts. Returns the XP gained. */
function note(k: CareKind): number {
  const c = careToday();
  const paid = c[k] < CARE[k].cap;
  c[k]++;
  bump('petcare'); // feeds errands and the quest stat
  if (!paid) return 0;
  grantXp('petcare', CARE[k].xp);
  return CARE[k].xp;
}

export const snackOnHand = () => PET_SNACKS.find((id) => count(id) > 0) ?? null;

export function playWithPet(): boolean {
  if (!state.pet) return false;
  petHappy(2.6);
  const xp = note('play');
  toast(`${petName()} chases the toy in happy circles! ${xp ? `+${xp} Pet Care XP` : '♡'}`);
  changed();
  return true;
}

export function feedPet(): boolean {
  if (!state.pet) return false;
  const food = snackOnHand();
  if (!food) { toast(`${petName()} would love a snack: a berry, a tart or a little fish.`); return false; }
  removeItem(food, 1);
  petHappy(2.2);
  const xp = note('snack');
  toast(`${petName()} gobbles the ${ITEMS[food].name}! ${xp ? `+${xp} Pet Care XP` : '♡'}`);
  changed();
  return true;
}

const SNIFF_FINDS = ['shell', 'blossom', 'puffberry', 'shell', 'blossom', 'button'];
/** Level 5 perk: once a day she sniffs out a little treasure. */
export const canSniff = () => !!state.pet && skillLevel('petcare') >= SNIFF_LEVEL && careToday().sniff < 1;
export function sniffOut(): boolean {
  if (!canSniff()) return false;
  careToday().sniff++;
  petHappy(2.4);
  if (Math.random() < 0.3) { const n = 20 + Math.floor(Math.random() * 21); earn(n); toast(`${petName()} dug up ${n} pips! ✿`); }
  else { const id = SNIFF_FINDS[Math.floor(Math.random() * SNIFF_FINDS.length)]; addItem(id); toast(`${petName()} sniffed out a ${ITEMS[id].name}! ✿`); }
  changed();
  return true;
}

/** What each Pet Care level gives, for the care card. */
export function careUnlocks(): { level: number; text: string }[] {
  return [
    ...PET_ITEMS.filter((i) => i.care).map((i) => ({ level: i.care!, text: `${i.name} (pet accessory)` })),
    { level: SNIFF_LEVEL, text: 'Treasure Sniff: a daily surprise' },
  ].sort((a, b) => a.level - b.level);
}

/** Hand out any care accessory the current level has earned. Safe to call often. */
export function syncCareUnlocks() {
  const p = state.pet;
  if (!p) return;
  const lv = skillLevel('petcare');
  for (const it of PET_ITEMS) {
    if (!it.care || lv < it.care || p.owned.includes(it.id)) continue;
    p.owned.push(it.id);
    toast(`${p.name} earned the ${it.name}! Find it in their corner ✿`);
  }
}

/** Wire the pat XP and level-up rewards. Called once from game.ts. */
export function initPetCare() {
  bus.on('petPetted', () => { if (state.pet) { const xp = note('pat'); if (xp) changed(); } });
  bus.on('levelup', (e: { id: string }) => { if (e.id === 'petcare') syncCareUnlocks(); });
}
