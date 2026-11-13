// Player activity animations: game logic says *what* the player is doing; render/playerActs.ts poses the toy,
// shows the held prop and plays the little effects. Purely visual: nothing here is saved.
//
// Two sources feed the renderer each frame (see currentAct):
//  - one-shot / held acts started by game code with startAct() (picking berries, watering, waving...)
//  - sustained acts derived from timers that already exist (a fishing cast, a drink brewing at the bench)
// Moving, a click-walk or closing the window a held act belongs to cancels it (game.ts calls cancelAct).

export type ActKind =
  | 'fish' | 'catch' // fishing: cast / wait / bite / reel, then holding the fish up
  | 'pick' | 'mine' | 'chop' // gathering nodes: berries, flowers, coffee / shell beds / sugarwood stumps
  | 'till' | 'plant' | 'water' | 'harvest' // the garden plot
  | 'brew' | 'bake' | 'craft' // benches (café counter, oven, Crafting Table) and the event bake games
  | 'wave' | 'give' | 'place' | 'reach' | 'sip' | 'ponder' // friends, decor, the event tree, cocoa, locked barriers
  | 'cheer' | 'sway' | 'shy'; // photo-mode poses (photo.ts)

export interface Act {
  kind: ActKind;
  /** Seconds since the act began. */
  t: number;
  /** Total length in seconds (Infinity for held acts). */
  dur: number;
  /** Ends when the current window closes rather than on a timer. */
  hold: boolean;
  /** Mirrors a running timer (fishing cast, brewing): stays fully posed until the timer stops. */
  derived?: boolean;
  /** World pixel point the act is aimed at (node, plot, bench...), if any. */
  tx?: number; ty?: number;
  /** Item involved (the caught fish, the crop...) for prop colouring. */
  item?: string;
  /** Changes whenever a new act starts, so the renderer can reset its per-act state. */
  seq: number;
  /** A photo-mode pose (photo.ts): played as an endless, looping performance with its own props, not a one-shot. */
  photo?: boolean;
}

let seq = 0;
let cur: Act | null = null;

export interface ActOpts { tx?: number; ty?: number; item?: string; hold?: boolean }

/** Start (or restart) a player act. `dur` in seconds; held acts ignore it and last until their window closes. */
export function startAct(kind: ActKind, dur: number, o: ActOpts = {}) {
  cur = { kind, t: 0, dur: o.hold ? Infinity : dur, hold: !!o.hold, tx: o.tx, ty: o.ty, item: o.item, seq: ++seq };
}

export function cancelAct() { cur = null; }
export const activeAct = () => cur;

export function tickAct(dt: number) {
  if (!cur) return;
  cur.t += dt;
  if (cur.t >= cur.dur) cur = null;
}

// ---- sustained acts derived from existing timers (one reused object each, keyed so seq stays stable) ----
const derived = new Map<string, Act>();
/** A stable Act view for a timer-driven activity. `key` identifies one run (e.g. the node or recipe id). */
export function derivedAct(key: string, kind: ActKind, t: number, dur: number, o: ActOpts = {}): Act {
  let a = derived.get(key);
  if (!a || a.kind !== kind) {
    a = { kind, t, dur, hold: false, derived: true, seq: ++seq };
    derived.clear(); // only ever one at a time; drop stale keys
    derived.set(key, a);
  }
  a.t = t; a.dur = dur; a.tx = o.tx; a.ty = o.ty; a.item = o.item;
  return a;
}
/** Forget a finished derived act so the next run of the same key restarts its animation. */
export function endDerived() { derived.clear(); }

// ---- tiny world effects requested by game code (picked up by the renderer once) ----
export type FxKind = 'pickup';
export const fxQueue: { kind: FxKind; x: number; y: number }[] = [];
export function playFx(kind: FxKind, x: number, y: number) { if (fxQueue.length < 16) fxQueue.push({ kind, x, y }); }
