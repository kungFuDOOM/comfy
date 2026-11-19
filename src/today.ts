// The Today card: a once-a-day note of the hooks already in the game.
// The day is getClock().dayKey, so ?date= and a forced ?event= are honored the same way as errands,
// boutique stock, and the advent calendar.
//
// Preview: ?today=show opens the card on load even if it already opened today.
// ?cutscene= still owns the screen. ?advent=open still opens the calendar unless ?today=show is set.
import { adventNotice, isDoorOpened, todaysDoor } from './advent';
import { VILLAGERS } from './data';
import { ensureErrands } from './errands';
import { currentChapter, daysLeft, eventFlag, getActiveEvents, isPeakDay, type EventDef } from './events';
import { doneToday } from './events/festivalKit';
import { birthdayDone, isBirthday, metFriend, unclaimedGifts, unreadLetters } from './friends';
import { LOG_QUESTS, questStatus, questVisible, type LogQuest } from './questlog';
import { saveGame } from './save';
import { ensureDaily, state } from './state';
import { getClock, type Phase } from './time';
import { dailyStock, hash, owns } from './wardrobe';

const params = new URLSearchParams(location.search);
/** ?today=show opens the card on the next load into play, even if it already opened today. */
export const todayWantsShow = params.get('today') === 'show';

export interface TodayHook {
  id: 'errands' | 'friend' | 'boutique' | 'mail' | 'event';
  icon: string;
  title: string;
  text: string;
}

export interface TodayBrief {
  hello: string;
  when: string;
  /** 0 until the first visit is counted. Shown on the card only from 2 up. */
  streak: number;
  streakLine: string;
  hooks: TodayHook[];
}

const first = (id: string) => VILLAGERS.find((v) => v.id === id)?.name.split(' ')[0] ?? 'A friend';

function shiftDay(key: string, delta: number): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + delta);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Count this calendar day as a visit. A missed day starts the streak over at 1, with nothing taken away. */
export function noteVisit(): number {
  const day = getClock().dayKey;
  const t = state.today;
  if (t.lastDay === day) return Math.max(1, t.streak);
  const streak = t.lastDay === shiftDay(day, -1) ? Math.max(1, t.streak) + 1 : 1;
  t.lastDay = day;
  t.streak = streak;
  saveGame();
  return streak;
}

/** Remember that the card opened today, so the next load stays quiet. */
export function markTodayShown() {
  const day = getClock().dayKey;
  if (state.today.lastShown === day) return;
  state.today.lastShown = day;
  saveGame();
}

export const shownToday = () => state.today.lastShown === getClock().dayKey;

function helloFor(phase: Phase): string {
  switch (phase) {
    case 'morning': return 'Good morning. The island kept your seat warm.';
    case 'day': return 'Hello. A few soft things are waiting, if you want them.';
    case 'evening': return 'The lamps are on. Here is what the day still holds.';
    case 'night': return 'A soft night. Nothing here will run away without you.';
    default: {
      const neverPhase: never = phase;
      return neverPhase;
    }
  }
}

function streakLine(n: number): string {
  if (n < 2) return '';
  if (n === 2) return 'Two soft days in a row.';
  return `${n} soft days in a row. The island is glad you came back.`;
}

function pick<T>(list: T[], salt: string): T | undefined {
  if (!list.length) return undefined;
  return list[hash(getClock().dayKey + ':' + salt) % list.length];
}

function errandHook(): TodayHook {
  ensureErrands();
  const daily = state.errands.list.filter((e) => e.scope === 'daily');
  const weeklyLeft = state.errands.list.filter((e) => e.scope === 'weekly' && !e.done).length;
  const left = daily.filter((e) => !e.done).length;
  if (!daily.length && weeklyLeft === 0) {
    return { id: 'errands', icon: '📌', title: 'Bulletin board', text: 'No notes yet. Once a friend is settled in, little errands get pinned in the square.' };
  }
  if (left === 0 && weeklyLeft === 0) {
    return { id: 'errands', icon: '📌', title: 'Board swept', text: 'Every note is done. Fresh ones arrive with the next real morning.' };
  }
  if (left === 0) {
    const word = weeklyLeft === 1 ? 'favour is' : 'favours are';
    return { id: 'errands', icon: '📌', title: 'Today’s errands', text: `The daily notes are done. ${weeklyLeft} weekly ${word} still pinned, with no hurry.` };
  }
  const weeklyBit = weeklyLeft ? ` ${weeklyLeft} weekly ${weeklyLeft === 1 ? 'favour stays' : 'favours stay'} up too.` : '';
  const word = left === 1 ? 'errand is' : 'errands are';
  return { id: 'errands', icon: '📌', title: 'Bulletin board', text: `${left} ${word} still on the board in the square.${weeklyBit}` };
}

function friendHook(): TodayHook {
  const here = VILLAGERS.filter(metFriend);
  const daily = ensureDaily();
  const bday = here.filter((v) => isBirthday(v.id) && !birthdayDone(v.id));
  if (bday.length) {
    const v = bday[0];
    const name = first(v.id);
    return { id: 'friend', icon: '🎂', title: `${name}'s birthday`, text: `Stop by with a hello and a little gift. Birthday gifts count double, and a wish is always welcome.` };
  }
  const open = LOG_QUESTS.filter(questVisible).filter((q) => questStatus(q) !== 'done');
  const ready = open.filter((q) => questStatus(q) === 'ready');
  const active = open.filter((q) => questStatus(q) === 'active');
  const available = open.filter((q) => questStatus(q) === 'available');
  const request = (q: LogQuest, kind: 'ready' | 'active' | 'available'): TodayHook => {
    const name = first(q.giver);
    if (kind === 'ready') return { id: 'friend', icon: '✿', title: `${name}'s request`, text: `${q.title} is ready to hand over. ${name} will be so pleased.` };
    if (kind === 'active') return { id: 'friend', icon: '✿', title: `${name} is hoping`, text: `${q.title} is still open. No rush. ${name} is happy you remembered.` };
    return { id: 'friend', icon: '✿', title: `${name} has a request`, text: `Say hello and ask about ${q.title}. It is a small favour, and it can wait.` };
  };
  const chosen = pick(ready, 'ready') ?? pick(active, 'active') ?? pick(available, 'offer');
  if (chosen) {
    const st = questStatus(chosen);
    if (st === 'ready' || st === 'active' || st === 'available') return request(chosen, st);
  }
  const quiet = here.filter((v) => !daily.talked.includes(v.id));
  if (quiet.length) {
    const v = pick(quiet, 'hi')!;
    const name = first(v.id);
    const gift = !daily.gifted.includes(v.id);
    return {
      id: 'friend', icon: '💬', title: `Say hi to ${name}`,
      text: gift ? 'A chat and one small gift still fit in today. Each friend gets one of each.' : 'A little chat still warms the day. You already shared a gift.',
    };
  }
  const ungifted = here.filter((v) => !daily.gifted.includes(v.id));
  if (ungifted.length) {
    const v = pick(ungifted, 'gift')!;
    return { id: 'friend', icon: '🎁', title: `A gift for ${first(v.id)}`, text: 'You have already said hello. One gift a day still makes a heart grow.' };
  }
  return { id: 'friend', icon: '♥', title: 'Friends', text: 'You have already made the rounds. The rest of the day can be lazy and pink.' };
}

function boutiqueHook(): TodayHook {
  const stock = dailyStock();
  const fresh = stock.filter((c) => !owns(c.id)).length;
  if (!stock.length) return { id: 'boutique', icon: '🎀', title: 'Spot & Bow', text: 'The rack is taking a breath. Peek in a little later.' };
  if (fresh === 0) return { id: 'boutique', icon: '🎀', title: 'Boutique restock', text: `Dottie put out ${stock.length} pieces today, and your wardrobe already holds them all.` };
  const piece = fresh === 1 ? 'piece is' : 'pieces are';
  return { id: 'boutique', icon: '🎀', title: 'Boutique restock', text: `A fresh rack is in. ${fresh} of ${stock.length} ${piece} new to you.` };
}

function mailHook(): TodayHook | null {
  const unread = unreadLetters();
  const gifts = unclaimedGifts();
  if (!unread && !gifts) return null;
  if (unread && gifts) {
    const letters = unread === 1 ? 'letter' : 'letters';
    return { id: 'mail', icon: '✉', title: 'Mailbox', text: `${unread} unread ${letters}, and a gift still tucked inside.` };
  }
  if (unread) {
    const word = unread === 1 ? 'letter is' : 'letters are';
    return { id: 'mail', icon: '✉', title: 'Mailbox', text: `${unread} unread ${word} waiting by the yard.` };
  }
  const word = gifts === 1 ? 'gift is' : 'gifts are';
  return { id: 'mail', icon: '✉', title: 'Mailbox', text: `${gifts} ${word} waiting inside a letter you already opened.` };
}

function festivalNudge(ev: EventDef): string | null {
  if (ev.id === 'petalpicnic') {
    const left = ['a', 'b', 'c'].filter((id) => !doneToday(ev.id, `blanket_${id}`)).length;
    if (left > 0) return `${left} picnic ${left === 1 ? 'blanket is' : 'blankets are'} still free in the square today.`;
  }
  if (ev.id === 'shoredays' && !doneToday(ev.id, 'lemonade')) return 'The lemonade stand saved you a glass today.';
  if (ev.id === 'harvest' && isPeakDay(ev.id) && !eventFlag(ev.id, 'feastDone')) return 'The long table in the square is waiting for you.';
  if (ev.id === 'twinkle' && isPeakDay(ev.id) && !eventFlag(ev.id, 'dayDone')) return 'Everyone is at the town tree with a present.';
  const eve = ev.id === 'twinkle' && currentChapter(ev)?.id === 'eve' && !eventFlag(ev.id, 'eveDone');
  if (eve) return 'Christmas Eve gathering is at the town tree tonight.';
  return null;
}

function eventHook(): TodayHook | null {
  const notice = adventNotice();
  const active = getActiveEvents();
  const peak = active.find((e) => isPeakDay(e.id));
  if (notice) {
    const door = todaysDoor();
    const closed = door !== null && !isDoorOpened(door);
    const peakBit = peak ? ` ${peak.name} is today as well.` : '';
    if (closed && door !== null) {
      return { id: 'event', icon: '🎁', title: `Door ${door}`, text: `December ${door}'s advent door is still closed. The town tree and the journal both open it.${peakBit}` };
    }
    return { id: 'event', icon: '🎁', title: 'Advent', text: `${notice.label}${peakBit}` };
  }
  if (!active.length) return null;
  const ev = peak ?? [...active].sort((a, b) => daysLeft(a) - daysLeft(b))[0];
  const nudge = festivalNudge(ev);
  const ch = currentChapter(ev);
  const body = nudge
    ?? (peak ? (ev.peakBanner ?? ev.banner) : ch ? `${ch.title}. ${ch.blurb}` : ev.blurb);
  const extra = active.length > 1 ? ` Also on: ${active.filter((e) => e.id !== ev.id).map((e) => e.name).join(', ')}.` : '';
  return { id: 'event', icon: ev.icon, title: ev.name, text: `${body}${extra}` };
}

/** What the card should say right now. Safe to call any time play is running. */
export function todayBrief(): TodayBrief {
  const clock = getClock();
  const streak = Math.max(0, state.today.streak);
  const hooks = [errandHook(), friendHook(), boutiqueHook(), mailHook(), eventHook()].filter((h): h is TodayHook => !!h);
  return {
    hello: helloFor(clock.phase),
    when: `${clock.weekday} · ${clock.season.name}`,
    streak,
    streakLine: streakLine(streak),
    hooks,
  };
}
