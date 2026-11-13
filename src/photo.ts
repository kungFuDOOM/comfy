// Photo mode: the choices (pose, face, filter, frame, stickers), composing the final picture, and the small album.
// The UI lives in ui/photoUi.ts; the camera and the face live in render/world3d.ts and render/actors.ts.
// Nothing here is saved except the album thumbnails (state.photos, capped at MAX_PHOTOS).
import type { Act, ActKind } from './actions';
import { applyFilter, drawFrame, drawSticker, FILTERS, type FilterDef } from './art/photoArt';
import type { Expression } from './render/actors';
import type { World3D } from './render/world3d';
import { MAX_PHOTOS, saveGame } from './save';
import { state } from './state';

export interface PoseDef { id: string; name: string; act: ActKind | null }
export const POSES: PoseDef[] = [
  { id: 'natural', name: 'Natural', act: null },
  { id: 'wave', name: 'Wave', act: 'wave' },
  { id: 'cheer', name: 'Hooray', act: 'cheer' },
  { id: 'dance', name: 'Dance', act: 'sway' },
  { id: 'sip', name: 'Cozy sip', act: 'sip' },
  { id: 'think', name: 'Daydream', act: 'ponder' },
  { id: 'shy', name: 'Shy', act: 'shy' },
];

export const EXPRESSIONS: { id: Expression; name: string }[] = [
  { id: 'sweet', name: 'Sweet' }, { id: 'happy', name: 'Giggly' }, { id: 'dreamy', name: 'Dreamy' }, { id: 'wow', name: 'Wow!' },
];

/** How far she turns from the lens (radians). */
export const TURNS: { name: string; v: number }[] = [
  { name: 'Front', v: 0 }, { name: '¾ left', v: 0.75 }, { name: '¾ right', v: -0.75 }, { name: 'Back', v: Math.PI },
];

export interface PlacedSticker {
  uid: number;
  id: string;
  /** Centre, as a fraction of the picture's width / height. */
  x: number; y: number;
  /** Radius as a fraction of the picture's shorter side. */
  size: number;
  /** Radians. */
  rot: number;
}
export const MAX_STICKERS = 12;

export const photo = {
  active: false,
  pose: 'natural',
  expr: 'sweet' as Expression,
  turn: 0,
  filter: 'natural',
  frame: 'none',
  stickers: [] as PlacedSticker[],
};

let uid = 1;
export const filterDef = (): FilterDef => FILTERS.find((f) => f.id === photo.filter) ?? FILTERS[0];

// ---- the pose, as an Act the player renderer already knows how to play ----
let act: Act | null = null;
let actSeq = 1_000_000; // far above actions.ts's own counter, so the renderer always sees a change when the pose changes
const HOLD = 1e6;

export function setPose(id: string) {
  photo.pose = id;
  const kind = POSES.find((p) => p.id === id)?.act ?? null;
  act = kind ? { kind, t: 0, dur: HOLD, hold: true, seq: ++actSeq } : null;
}

/** The pose act to render while photo mode is open (null = standing naturally). */
export const photoAct = (): Act | null => (photo.active ? act : null);
export function tickPhoto(dt: number) { if (act) act.t += dt; }

export function enterPhoto() {
  photo.active = true;
  photo.stickers = [];
  setPose(photo.pose); // restart the pose so its little effects play again
}
export function leavePhoto() { photo.active = false; act = null; }

// ---- stickers ----
const SPOTS: [number, number][] = [[0.2, 0.22], [0.8, 0.22], [0.14, 0.52], [0.86, 0.52], [0.32, 0.14], [0.68, 0.14]];
export function addSticker(id: string): PlacedSticker | null {
  if (photo.stickers.length >= MAX_STICKERS) return null;
  const n = photo.stickers.length;
  const [x, y] = SPOTS[n % SPOTS.length]; // start clear of the middle, where she stands
  const s: PlacedSticker = { uid: uid++, id, x, y, size: 0.09, rot: ((n % 5) - 2) * 0.12 };
  photo.stickers.push(s);
  return s;
}
export function removeSticker(u: number) { photo.stickers = photo.stickers.filter((s) => s.uid !== u); }

// ---- the picture ----
/** The line on the Polaroid's chin. */
export const photoCaption = () => `Sugarlily Isle · ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

/** The finished shot: the 3D view with the filter baked in, then the frame, then the stickers. Null if the copy fails. */
export function composeShot(world: World3D): HTMLCanvasElement | null {
  const c = world.capture(2000);
  if (!c) return null;
  applyFilter(c, filterDef(), (Date.now() & 0xffff) | 1);
  const g = c.getContext('2d');
  if (!g) return c;
  drawFrame(g, photo.frame, c.width, c.height, photoCaption());
  const m = Math.min(c.width, c.height);
  for (const s of photo.stickers) drawSticker(g, s.id, s.x * c.width, s.y * c.height, s.size * m, s.rot);
  return c;
}

export const canvasToBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/png'));

/** Hand a PNG to the browser as a download (a share sheet / new tab on some phones). */
export function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
  a.href = url;
  a.download = `hushbell-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ---- album (thumbnails only, newest first, capped) ----
const THUMB_W = 160;
export function addToAlbum(c: HTMLCanvasElement): boolean {
  const t = document.createElement('canvas');
  t.width = THUMB_W; t.height = Math.max(1, Math.round((THUMB_W * c.height) / c.width));
  const g = t.getContext('2d');
  if (!g) return false;
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, t.width, t.height);
  state.photos.unshift({ at: Date.now(), thumb: t.toDataURL('image/jpeg', 0.65), note: filterDef().name });
  if (state.photos.length > MAX_PHOTOS) state.photos.length = MAX_PHOTOS;
  saveGame();
  return true;
}

export function removeFromAlbum(at: number) {
  state.photos = state.photos.filter((p) => p.at !== at);
  saveGame();
}
