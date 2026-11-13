// Photo mode UI: a clean full-screen camera view with a soft tool sheet (pose, face, filter, frame, stickers),
// a shutter, a review card (save PNG / keep in the album) and the album. Works with mouse, keyboard, pad and touch.
// The HUD is hidden by `body.photo-on` (photo.css); the camera itself is driven through World3D.
import './photo.css';
import { cssFilter, cssWash, drawFrame, drawSticker, FILTERS, FRAMES, STICKERS } from '../art/photoArt';
import { sfx } from '../audio';
import { setInputLock } from '../input';
import type { Action } from '../input/dispatch';
import {
  addSticker, addToAlbum, canvasToBlob, composeShot, downloadBlob, enterPhoto, EXPRESSIONS, filterDef, leavePhoto, MAX_STICKERS, photo,
  photoCaption, POSES, removeFromAlbum, removeSticker, setPose, TURNS, type PlacedSticker,
} from '../photo';
import type { World3D } from '../render/world3d';
import { MAX_PHOTOS } from '../save';
import { state } from '../state';
import { h } from './dom';

type Tab = 'pose' | 'face' | 'filter' | 'frame' | 'stickers';
const TABS: [Tab, string][] = [['pose', '✿ Pose'], ['face', '☺ Face'], ['filter', '❀ Filter'], ['frame', '❒ Frame'], ['stickers', '✧ Stickers']];

let open: (() => void) | null = null; // closes the photo mode that is currently open (null = none)

/** Enter photo mode. `onExit` runs after everything is torn down. */
export function openPhotoMode(world: World3D, canvas: HTMLCanvasElement, onExit: () => void) {
  if (open) return;
  enterPhoto();
  world.setPhotoCamera(true);
  document.body.classList.add('photo-on');
  const cleanups: (() => void)[] = [];

  let tab: Tab = 'pose';
  let sel: number | null = null; // uid of the selected sticker
  let overlay: HTMLElement | null = null; // review card or album
  let busy = false;

  const root = h('div', 'ph-root');
  const wash = h('div', 'ph-wash');
  const frameCv = h('canvas', 'ph-frame');
  const stickerLayer = h('div', 'ph-stickers');
  const flash = h('div', 'ph-flash');
  const toastEl = h('div', 'ph-toast');
  const sheetBody = h('div', 'ph-sheet-body');
  const stickerTools = h('div', 'ph-sticker-tools');
  const tabsEl = h('div', 'ph-tabs');

  // ---- little helpers ----
  let toastT = 0;
  const say = (msg: string) => {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = window.setTimeout(() => toastEl.classList.remove('on'), 2200);
  };
  cleanups.push(() => clearTimeout(toastT));
  // Taps fire on pointerup for touch/pen (a slightly wobbly finger still counts, and iOS can swallow `click`
  // after a touch that moved); mouse and keyboard use `click`. `clickGuard` drops the synthetic click that
  // follows a handled touch, or one that lands on a control after a backdrop tap closed the overlay.
  let clickGuard = 0;
  const onTap = (b: HTMLElement, fn: () => void) => {
    let down: { id: number; x: number; y: number } | null = null;
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.stopPropagation();
      down = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    b.addEventListener('pointerup', (e) => {
      if (!down || e.pointerId !== down.id) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 18;
      down = null;
      e.stopPropagation();
      if (moved || (b as HTMLButtonElement).disabled) return;
      clickGuard = performance.now() + 600;
      fn();
    });
    b.addEventListener('pointercancel', () => { down = null; });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() < clickGuard) return;
      fn();
    });
  };
  const pbtn = (cls: string, label: string | Node, onClick: () => void, title = '') => {
    const b = h('button', 'btn ' + cls, label);
    b.type = 'button';
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    onTap(b, onClick);
    return b;
  };
  const chip = (label: string | Node, on: boolean, onClick: () => void) => {
    const b = pbtn('ph-chip' + (on ? ' on' : ''), label, () => { sfx.tick(); onClick(); });
    return b;
  };

  // ---- live preview of filter + frame + stickers ----
  const W = () => window.innerWidth, H = () => window.innerHeight;
  function paintFrame() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    frameCv.width = Math.round(W() * dpr); frameCv.height = Math.round(H() * dpr);
    frameCv.style.width = W() + 'px'; frameCv.style.height = H() + 'px';
    const g = frameCv.getContext('2d')!;
    g.clearRect(0, 0, frameCv.width, frameCv.height);
    drawFrame(g, photo.frame, frameCv.width, frameCv.height, photoCaption());
  }
  function applyLook() {
    const f = filterDef();
    canvas.style.filter = f.id === 'natural' ? '' : cssFilter(f);
    wash.style.background = cssWash(f);
    paintFrame();
  }

  // ---- stickers (DOM elements dragged around; drawn with the same art as the saved picture) ----
  const stickerEls = new Map<number, HTMLElement>();
  function styleSticker(s: PlacedSticker, el: HTMLElement) {
    const r = s.size * Math.min(W(), H());
    const side = Math.round(r * 2.7);
    const cv = el.firstChild as HTMLCanvasElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = Math.round(side * dpr);
    cv.style.width = cv.style.height = side + 'px';
    const g = cv.getContext('2d')!;
    g.scale(dpr, dpr);
    drawSticker(g, s.id, side / 2, side / 2, r, s.rot);
    el.style.left = s.x * W() + 'px'; el.style.top = s.y * H() + 'px';
    el.classList.toggle('sel', s.uid === sel);
  }
  function mountSticker(s: PlacedSticker) {
    const el = h('div', 'ph-sticker', document.createElement('canvas'));
    let drag: { id: number; px: number; py: number; moved: boolean } | null = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      drag = { id: e.pointerId, px: e.clientX, py: e.clientY, moved: false };
      el.setPointerCapture(e.pointerId);
      select(s.uid);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
      drag.px = e.clientX; drag.py = e.clientY;
      s.x = Math.max(0.02, Math.min(0.98, s.x + dx / W()));
      s.y = Math.max(0.02, Math.min(0.98, s.y + dy / H()));
      el.style.left = s.x * W() + 'px'; el.style.top = s.y * H() + 'px';
    });
    const end = (e: PointerEvent) => { if (drag && e.pointerId === drag.id) drag = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    stickerEls.set(s.uid, el);
    stickerLayer.append(el);
    styleSticker(s, el);
  }
  function restyleStickers() { for (const s of photo.stickers) { const el = stickerEls.get(s.uid); if (el) styleSticker(s, el); } }
  function select(uid: number | null) {
    sel = uid;
    for (const s of photo.stickers) stickerEls.get(s.uid)?.classList.toggle('sel', s.uid === sel);
    renderStickerTools();
  }
  const selected = () => photo.stickers.find((s) => s.uid === sel);
  function tweak(fn: (s: PlacedSticker) => void) {
    const s = selected();
    if (!s) return;
    fn(s);
    const el = stickerEls.get(s.uid);
    if (el) styleSticker(s, el);
  }
  function dropSticker(uid: number) {
    stickerEls.get(uid)?.remove(); stickerEls.delete(uid);
    removeSticker(uid);
    if (sel === uid) sel = null;
    renderSheet();
  }

  // ---- the tool sheet ----
  function renderStickerTools() {
    stickerTools.replaceChildren();
    if (tab !== 'stickers') return;
    const has = selected() !== undefined;
    stickerTools.append(
      pbtn('ph-mini', '−', () => tweak((s) => { s.size = Math.max(0.04, s.size - 0.015); }), 'Smaller'),
      pbtn('ph-mini', '+', () => tweak((s) => { s.size = Math.min(0.3, s.size + 0.015); }), 'Bigger'),
      pbtn('ph-mini', '↺', () => tweak((s) => { s.rot -= 0.2; }), 'Tilt left'),
      pbtn('ph-mini', '↻', () => tweak((s) => { s.rot += 0.2; }), 'Tilt right'),
      pbtn('ph-mini', '✕', () => { if (sel !== null) dropSticker(sel); }, 'Remove sticker'),
      h('span', 'ph-note', has ? 'Drag it into place' : photo.stickers.length ? 'Tap a sticker to adjust it' : `Tap one to add it (up to ${MAX_STICKERS})`),
    );
    for (const b of Array.from(stickerTools.querySelectorAll('button'))) b.disabled = !has;
  }
  function stickerIcon(id: string) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64; cv.style.width = cv.style.height = '32px';
    drawSticker(cv.getContext('2d')!, id, 32, 32, 20);
    return cv;
  }
  function renderSheet() {
    tabsEl.replaceChildren(...TABS.map(([id, label]) => pbtn('ph-tab' + (id === tab ? ' on' : ''), label, () => { sfx.tick(); tab = id; renderSheet(); })));
    sheetBody.replaceChildren();
    if (tab === 'pose') {
      sheetBody.append(...POSES.map((p) => chip(p.name, photo.pose === p.id, () => { setPose(p.id); renderSheet(); })));
    } else if (tab === 'face') {
      sheetBody.append(
        h('span', 'ph-label', 'Face'),
        ...EXPRESSIONS.map((x) => chip(x.name, photo.expr === x.id, () => { photo.expr = x.id; renderSheet(); })),
        h('span', 'ph-label', 'Turn'),
        ...TURNS.map((t) => chip(t.name, photo.turn === t.v, () => { photo.turn = t.v; renderSheet(); })),
      );
    } else if (tab === 'filter') {
      sheetBody.append(...FILTERS.map((f) => {
        const sw = h('i', 'ph-swatch');
        sw.style.background = f.id === 'natural' ? 'linear-gradient(135deg,#fff,#ffd6e7)' : `rgb(${f.tint[0]}, ${f.tint[1]}, ${f.tint[2]})`;
        return chip(h('span', 'ph-chip-in', sw, f.name), photo.filter === f.id, () => { photo.filter = f.id; applyLook(); renderSheet(); });
      }));
    } else if (tab === 'frame') {
      sheetBody.append(...FRAMES.map((f) => chip(f.name, photo.frame === f.id, () => { photo.frame = f.id; applyLook(); renderSheet(); })));
    } else {
      sheetBody.append(...STICKERS.map((s) => chip(h('span', 'ph-chip-in', stickerIcon(s.id)), false, () => {
        const added = addSticker(s.id);
        if (!added) { say(`That's plenty of stickers (${MAX_STICKERS}) ♡`); return; }
        mountSticker(added);
        select(added.uid);
      })));
      for (const b of Array.from(sheetBody.querySelectorAll('button'))) b.title = 'Add sticker';
    }
    renderStickerTools();
  }

  // ---- shutter, review and album ----
  let reviewUrl: string | null = null; // object URL of the review picture
  function closeOverlay() {
    overlay?.remove(); overlay = null;
    root.classList.remove('ph-modal');
    if (reviewUrl) { URL.revokeObjectURL(reviewUrl); reviewUrl = null; }
  }

  function mountOverlay(el: HTMLElement) {
    // tap anywhere outside the card closes it (the target can be the overlay or a wrapper, so test containment)
    let outside: number | null = null;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      outside = (e.target as Element).closest('.ph-card') ? null : e.pointerId;
    });
    el.addEventListener('pointerup', (e) => {
      const hit = outside === e.pointerId && !(e.target as Element).closest('.ph-card');
      outside = null;
      if (!hit) return;
      clickGuard = performance.now() + 600;
      closeOverlay();
    });
    el.addEventListener('pointercancel', () => { outside = null; });
    el.addEventListener('click', (e) => e.stopPropagation());
    root.classList.add('ph-modal'); // chrome hides, only ✕ Done stays above the overlay
    root.append(el);
  }

  async function snap() {
    if (busy || overlay) return;
    busy = true;
    sfx.shutter();
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    const shot = composeShot(world); // drawn from the 3D view itself, so the preview layers above never end up in it twice
    const blob = shot ? await canvasToBlob(shot) : null;
    busy = false;
    if (!shot || !blob) { say('The camera fogged up — try again ♡'); return; }
    showReview(shot, blob);
  }

  function showReview(shot: HTMLCanvasElement, blob: Blob) {
    closeOverlay();
    reviewUrl = URL.createObjectURL(blob);
    const img = h('img', 'ph-review-img');
    img.src = reviewUrl; img.alt = 'Your photo';
    let kept = false;
    const keep = pbtn('ph-act', '♡ Keep in album', () => {
      if (kept) return;
      const full = state.photos.length >= MAX_PHOTOS;
      if (!addToAlbum(shot)) { say("Couldn't tuck that in the album"); return; }
      kept = true; keep.disabled = true; keep.textContent = '♡ Kept';
      sfx.confirm();
      say(full ? 'Added — the oldest keepsake made room ♡' : 'Tucked into your album ♡');
    });
    const save = pbtn('ph-act primary', '⬇ Save PNG', () => { downloadBlob(blob); sfx.confirm(); say('Saved! Check your downloads ♡'); });
    const again = pbtn('ph-act ghost', 'Take another', closeOverlay);
    const x = pbtn('ph-card-x', '✕', closeOverlay, 'Close');
    overlay = h('div', 'ph-overlay', h('div', 'ph-card', x, h('div', 'ph-card-title', 'Say cheese! ✿'), img, h('div', 'ph-card-row', save, keep, again), h('div', 'ph-note', 'On a phone, press and hold the picture to save it too.')));
    mountOverlay(overlay);
  }

  function showAlbum() {
    closeOverlay();
    const grid = h('div', 'ph-grid');
    const fill = () => {
      grid.replaceChildren();
      if (!state.photos.length) grid.append(h('div', 'ph-empty', 'No keepsakes yet. Snap a photo, then tap “Keep in album” ♡'));
      for (const p of state.photos) {
        const im = h('img', 'ph-thumb'); im.src = p.thumb; im.alt = 'Album photo';
        const when = new Date(p.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const del = pbtn('ph-mini ph-del', '✕', () => { removeFromAlbum(p.at); fill(); title.textContent = `Photo album · ${state.photos.length}/${MAX_PHOTOS}`; }, 'Remove from album');
        grid.append(h('div', 'ph-polaroid', im, h('div', 'ph-cap', `${p.note || 'Photo'} · ${when}`), del));
      }
    };
    const title = h('div', 'ph-card-title', `Photo album · ${state.photos.length}/${MAX_PHOTOS}`);
    fill();
    overlay = h('div', 'ph-overlay', h('div', 'ph-card wide', pbtn('ph-card-x', '✕', closeOverlay, 'Close album'), title, grid,
      h('div', 'ph-note', 'The album keeps small keepsake thumbnails. Use “Save PNG” to keep the full-size photo.'),
      h('div', 'ph-card-row', pbtn('ph-act ghost', 'Close', closeOverlay))));
    mountOverlay(overlay);
  }

  // ---- camera: drag to orbit, pinch / wheel to zoom ----
  const pts = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const pinchDist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  root.addEventListener('pointerdown', (e) => {
    if (e.target !== root || overlay) return;
    e.preventDefault();
    select(null);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { root.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (pts.size === 2) pinch = pinchDist();
  });
  root.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) world.orbit(-dx * 0.0065, dy * 0.0045, 0);
    else if (pts.size === 2) { const d = pinchDist(); world.orbit(0, 0, -(d - pinch) * 0.004); pinch = d; }
  });
  const lift = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size === 1) pinch = 0; };
  root.addEventListener('pointerup', lift);
  root.addEventListener('pointercancel', lift);
  root.addEventListener('wheel', (e) => { e.preventDefault(); if (!overlay) world.orbit(0, 0, e.deltaY * 0.0014); }, { passive: false });
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  // block page scroll/bounce over the camera only; buttons, sheet and the review/album must keep native touch behaviour
  root.addEventListener('touchmove', (e) => {
    if ((e.target as Element).closest('.btn, button, .ph-overlay, .ph-sheet')) return;
    e.preventDefault();
  }, { passive: false });

  // keyboard: arrows / WASD orbit and tilt (the game's [ ] and - = keys keep working too); Space / E = shutter, Esc = leave
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || overlay) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') world.orbit(0.09, 0, 0);
    else if (k === 'arrowright' || k === 'd') world.orbit(-0.09, 0, 0);
    else if (k === 'arrowup' || k === 'w') world.orbit(0, -0.04, 0);
    else if (k === 'arrowdown' || k === 's') world.orbit(0, 0.04, 0);
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  // ---- chrome ----
  const exit = pbtn('ph-top-btn', '✕ Done', () => close(), 'Leave photo mode');
  const reset = pbtn('ph-top-btn', '⟲', () => world.resetCamera(), 'Reset the camera');
  const zin = pbtn('ph-top-btn', '＋', () => world.orbit(0, 0, -0.12), 'Zoom in');
  const zout = pbtn('ph-top-btn', '－', () => world.orbit(0, 0, 0.12), 'Zoom out');
  const album = pbtn('ph-top-btn', '♡ Album', () => showAlbum(), 'Open the photo album');
  const tidy = pbtn('ph-top-btn', '◌', () => root.classList.toggle('ph-clean'), 'Hide or show the controls');
  const top = h('div', 'ph-top', exit, h('div', 'ph-top-mid', zout, zin, reset), h('div', 'ph-top-end', album, tidy));
  const shutter = h('button', 'ph-shutter');
  shutter.type = 'button'; shutter.title = 'Take photo'; shutter.setAttribute('aria-label', 'Take photo');
  shutter.append(h('span', 'ph-shutter-in'));
  onTap(shutter, () => { void snap(); });
  const sheet = h('div', 'ph-sheet', tabsEl, stickerTools, sheetBody);
  const hint = h('div', 'ph-hint', document.body.classList.contains('input-touch')
    ? 'Drag to turn the camera · pinch to zoom'
    : 'Drag to turn the camera · scroll to zoom · Space to snap · Esc to leave');
  hint.setAttribute('aria-hidden', 'true');
  const hintT = window.setTimeout(() => hint.classList.add('off'), 6000);
  cleanups.push(() => clearTimeout(hintT));
  root.append(wash, frameCv, stickerLayer, flash, top, hint, h('div', 'ph-bottom', shutter, sheet), toastEl);
  document.body.append(root);
  applyLook();
  renderSheet();

  const onResize = () => { paintFrame(); restyleStickers(); };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  // gamepad / keyboard actions arrive here while photo mode is up (see input/dispatch.ts)
  const release = setInputLock((a: Action) => {
    if (a === 'cancel' || a === 'menu' || a === 'photo') { if (overlay) closeOverlay(); else close(); }
    else if (a === 'interact') void snap();
    else if (a === 'camReset') world.resetCamera();
  });
  cleanups.push(release);

  function close() {
    if (open !== close) return;
    open = null;
    cleanups.splice(0).forEach((f) => f());
    closeOverlay();
    root.remove();
    canvas.style.filter = '';
    document.body.classList.remove('photo-on');
    world.setPhotoCamera(false);
    leavePhoto();
    sfx.back();
    onExit();
  }
  open = close;
  sfx.open();
  say('Photo mode ✿ pick a pose, then tap the shutter');
}
