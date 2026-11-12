// Dressing room (fitting-room try-on view) shared state. No rendering or DOM here:
// render/dressingRoom.ts draws the set and poses the player, ui/dressingUi.ts lays out the panel.

export const dressing = {
  /** The fitting-room camera owns the screen (boutique Outfits tab or Bag › Wardrobe is open). */
  active: false,
  /** Target turn of the character, radians (0 = facing the camera). */
  spin: 0,
  /** Spin velocity (rad/s): drag flicks and button / key nudges coast down from here. */
  vel: 0,
  /** Held spin direction from the on-screen ◀ ▶ buttons (-1, 0, 1). */
  hold: 0,
  /** A finger / mouse is turning the character right now (velocity is measured, not applied). */
  dragging: false,
  /** Bumped to ask the set for a twirl + sparkle (preview, wear, buy). */
  twirls: 0,
};

const SPIN_RATE = 3.2; // rad/s at full stick / held button

/** Called once per frame by the game loop. `rate` is the stick / key reading (-1..1). */
export function tickDressing(dt: number, rate: number) {
  if (!dressing.active) return;
  const drive = Math.max(-1.5, Math.min(1.5, rate + dressing.hold));
  dressing.spin += (drive * SPIN_RATE + (dressing.dragging ? 0 : dressing.vel)) * dt;
  if (dressing.dragging) return;
  dressing.vel *= Math.exp(-dt * 4.5);
  if (Math.abs(dressing.vel) < 0.01) dressing.vel = 0;
}

/** A quick turn: ◀ ▶ clicks, arrow keys / D-pad on the spin buttons. */
export function nudgeSpin(dir: number) { dressing.vel += dir * 5.5; }

/** Drag / swipe: turn with the finger, and keep the flick speed on release. */
export function dragSpin(dxPx: number, dt: number) {
  const d = dxPx * 0.013;
  dressing.spin += d;
  if (dt > 0) dressing.vel = dressing.vel * 0.4 + (d / dt) * 0.6;
}

export function twirl() { dressing.twirls++; }
