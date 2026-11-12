// Region completion: finish an area (unlock it, meet its friend, gather one of every kind of thing that grows or
// swims there) and you earn that area's party hat. Finish all six and there is an Island Star hat too.
import { sfx } from './audio';
import { bus, changed, toast } from './bus';
import { AREA_LIST, areaById, type AreaId } from './areas';
import { clothById } from './clothes';
import { NODES, NODE_KINDS, type NodeKind } from './data';
import { isAreaOpen, state } from './state';
import { questById } from './questlog';
import { dressing } from './dressing';
import { grantCloth, owns, wearItem } from './wardrobe';
import { areaAt } from './world';

/** The friend whose intro quest counts toward each area (the Pearl Shore has no resident friend). */
const AREA_QUEST: Partial<Record<AreaId, string>> = {
  town: 'lq_errand', blossom: 'lq_oolie', pond: 'lq_tuppi', meadow: 'lq_brioche', lighthouse: 'lq_marlo',
};
export const PARTY_HAT: Record<AreaId, string> = {
  town: 'party_town', blossom: 'party_blossom', pond: 'party_pond', meadow: 'party_meadow', lighthouse: 'party_lighthouse', farbeach: 'party_farbeach',
};
export const STAR_HAT = 'party_star';

const KIND_NAME: Record<NodeKind, string> = { berry: 'berries', flower: 'flowers', wood: 'twigs', coffee: 'coffee cherries', shell: 'shells', fish: 'a fish' };
const KIND_ICON: Record<NodeKind, string> = { berry: '🍓', flower: '🌸', wood: '🪵', coffee: '☕', shell: '🐚', fish: '🐟' };

/** The gather kinds that exist in an area (from the generated nodes, so it always matches the map). */
export function kindsIn(area: AreaId): NodeKind[] {
  const set = new Set<NodeKind>();
  for (const n of NODES) if (areaAt(n.x, n.y) === area) set.add(n.kind);
  return [...set].sort();
}
export const hasGathered = (area: AreaId, kind: NodeKind) => !!state.regionSeen[area]?.includes(kind);
/** Remember the first time each kind of thing is gathered in each area. */
export function noteGathered(area: AreaId, kind: NodeKind) {
  const list = (state.regionSeen[area] ??= []);
  if (!list.includes(kind)) list.push(kind);
}

export interface Step { label: string; done: boolean }
export function checklist(area: AreaId): Step[] {
  const out: Step[] = [{ label: area === 'town' ? 'Sugarlily Town is open' : `${areaById(area).name} is open`, done: isAreaOpen(area) }];
  const qid = AREA_QUEST[area];
  if (qid) { const q = questById(qid); out.push({ label: `“${q.title}” done`, done: state.questLog[qid] === 'done' }); }
  for (const k of kindsIn(area)) out.push({ label: `Gather ${KIND_NAME[k]} here ${KIND_ICON[k]}`, done: hasGathered(area, k) });
  return out;
}
export const regionComplete = (area: AreaId) => checklist(area).every((s) => s.done);
export const allRegionsComplete = () => AREA_LIST.every((a) => regionComplete(a.id));

// ---------- awarding ----------
interface Award { hat: string; area: AreaId | 'star' }
const queue: Award[] = [];

const MIMSY: Record<string, string> = {
  town: 'You finished all of Sugarlily Town! That deserves a hat. A pink one. With a pom. *happy yawn*',
  blossom: 'Every petal in Blossom Grove knows your name now. Here — a hat made of cherry-blossom stripes.',
  pond: 'The whole pond is smiling at you. Take this minty party hat, and do not tell the frogs I helped.',
  meadow: 'Sprinkle Meadow is all yours. A hat to match, with real (pretend) sprinkles. Zzz — I mean, congratulations!',
  lighthouse: 'Even the Hush Bell is dreaming about you. This hat has a tiny bell. It is very quiet. Do not wake it.',
  farbeach: 'The far shore, finished! A pearly hat for the tidiest explorer I know.',
  star: 'You did ALL of it? Every corner? Oh. Oh my. Come here — you get the Island Star hat. I am going to cry sleepily.',
};

/**
 * Award party hats for every region that is now complete and not yet awarded. Safe to call any time (after unlocks,
 * quest turn-ins, gathers, and once on load): hats are written to the save immediately and never given twice; the
 * little ceremony is queued for when the screen is free.
 */
export function checkRegions() {
  let any = false;
  for (const a of AREA_LIST) {
    if (state.partyHats.includes(a.id) || !regionComplete(a.id)) continue;
    state.partyHats.push(a.id);
    grantCloth(PARTY_HAT[a.id], false);
    queue.push({ hat: PARTY_HAT[a.id], area: a.id });
    any = true;
  }
  if (!state.partyHats.includes('star') && allRegionsComplete()) {
    state.partyHats.push('star');
    grantCloth(STAR_HAT, false);
    queue.push({ hat: STAR_HAT, area: 'star' });
    any = true;
  }
  // someone who got the award but lost the hat from the list (never happens normally) still gets it back
  for (const id of state.partyHats) {
    const hat = id === 'star' ? STAR_HAT : PARTY_HAT[id as AreaId];
    if (hat && !owns(hat)) grantCloth(hat, false);
  }
  if (any) changed();
}
bus.on('change', () => checkRegions());

// ---------- the ceremony ----------
let stage: { award: Award; t: number; phase: 'confetti' | 'room' } | null = null;
export const awardBusy = () => stage !== null || queue.length > 0;

/** Call every frame. Starts a ceremony when one is queued and no panel owns the screen. */
export function tickAwards(dt: number, panelOpen: boolean) {
  if (!stage) {
    if (!queue.length || panelOpen || dressing.active) return;
    const award = queue.shift()!;
    stage = { award, t: 0, phase: 'confetti' };
    const who = award.area === 'star' ? 'the whole island' : areaById(award.area).name;
    bus.emit('partyHat', award.hat);
    sfx.partyHat();
    toast(`🎉 ${who} complete! Mimsy: “${MIMSY[award.area]}”`);
    return;
  }
  if (stage.phase === 'confetti') {
    stage.t += dt;
    if (stage.t < 2.2) return;
    if (panelOpen) return;
    // put the hat on and show it off in the dressing room
    const c = clothById(stage.award.hat);
    if (c) { wearItem(c.id); bus.emit('openWardrobe', c.id); }
    stage.phase = 'room';
    stage.t = 0;
    return;
  }
  // the room is open: wait for the panel to close, then the next hat can start
  if (!panelOpen && !dressing.active) stage = null;
}
