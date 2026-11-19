// The Today card window, the HUD chip that reopens it, and the once-a-day offer on load.
import './today.css';
import { adventWantsPreview } from '../advent';
import { cutsceneParam } from '../cutscene/presets';
import { sceneActive } from '../render/stage';
import { state } from '../state';
import { markTodayShown, noteVisit, shownToday, todayBrief, todayWantsShow } from '../today';
import { btn, h, isPanelOpen, openPanel } from './dom';

export { todayWantsShow };

/** Open the card. Marks today as shown so the automatic greeting stays quiet until tomorrow. */
export function openToday() {
  markTodayShown();
  const brief = todayBrief();
  openPanel('Today', (body, api) => {
    const card = body.parentElement;
    card?.classList.add('today-panel');
    // A still tap anywhere on the card closes it. A drag is a scroll, so it stays open.
    let ax = 0, ay = 0, dragged = false, pressed = false;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) { pressed = false; return; }
      ax = e.clientX; ay = e.clientY; dragged = false; pressed = true;
    };
    const move = (e: PointerEvent) => {
      if (pressed && Math.hypot(e.clientX - ax, e.clientY - ay) > 10) dragged = true;
    };
    const up = () => {
      const close = pressed && !dragged;
      pressed = false; dragged = false;
      if (close) api.close();
    };
    const cancel = () => { pressed = false; dragged = false; };
    card?.addEventListener('pointerdown', down);
    card?.addEventListener('pointermove', move);
    card?.addEventListener('pointerup', up);
    card?.addEventListener('pointercancel', cancel);
    api.cleanup(() => {
      card?.removeEventListener('pointerdown', down);
      card?.removeEventListener('pointermove', move);
      card?.removeEventListener('pointerup', up);
      card?.removeEventListener('pointercancel', cancel);
    });
    const spot = h('span', 'today-spot');
    spot.setAttribute('aria-hidden', 'true');
    body.append(
      h('div', 'today-hello',
        spot,
        h('div', '',
          h('div', 'today-when', brief.when),
          h('p', '', brief.hello),
          brief.streakLine ? h('div', 'today-streak', brief.streakLine) : null,
        ),
      ),
      ...brief.hooks.map((hook) => h('div', 'today-row',
        h('div', 'today-ico', hook.icon),
        h('div', 'today-copy', h('b', '', hook.title), h('span', '', hook.text)),
      )),
    );
    const hint = h('p', 'muted small today-hint', 'Tap anywhere to close. The heart chip, or Journal, brings it back.');
    const go = btn('Tuck it away', () => api.close(), 'today-go');
    const foot = card?.querySelector('.panel-foot');
    if (foot) foot.before(hint, go);
    else card?.append(hint, go);
  });
}

/** A small HUD chip. Hidden with the rest of the HUD while a panel is open. */
export function buildTodayChip(parent: HTMLElement) {
  const chip = h('button', 'chip today-chip', '♡ Today');
  chip.type = 'button';
  chip.title = 'Today’s note';
  chip.setAttribute('aria-label', 'Open today’s note');
  chip.addEventListener('click', () => { if (!isPanelOpen()) openToday(); });
  parent.append(chip);
}

let waitTimer = 0;

/** Keeps waiting, every 500ms, until no panel and no cutscene is up. Opens at most once per day. */
function tryOpen() {
  waitTimer = 0;
  if (isPanelOpen() || sceneActive()) {
    waitTimer = window.setTimeout(tryOpen, 500);
    return;
  }
  if (!todayWantsShow && shownToday()) return;
  openToday();
}

/** Drops any pending or retrying offer (e.g. when leaving play). Does not mark Today as shown. */
export function cancelTodayOffer() {
  window.clearTimeout(waitTimer);
  waitTimer = 0;
}

/**
 * Call when play begins (Continue, or a return from the title).
 * Greets once per calendar day. `?today=show` greets anyway.
 * A first-run help window and a cutscene preview keep the screen.
 */
export function maybeOfferToday() {
  if (cutsceneParam) return;
  noteVisit();
  const force = todayWantsShow;
  if (adventWantsPreview && !force) return;
  if (!force && (!state.seenHelp || shownToday())) return;
  window.clearTimeout(waitTimer);
  waitTimer = window.setTimeout(tryOpen, 700);
}
