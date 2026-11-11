// Keyboard + pointer input. Game-level handlers are registered by game.ts.
export const keys = new Set<string>();

export function axis(): [number, number] {
  let x = 0, y = 0;
  if (keys.has('arrowleft') || keys.has('a')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  if (keys.has('arrowup') || keys.has('w')) y -= 1;
  if (keys.has('arrowdown') || keys.has('s')) y += 1;
  return [x, y];
}

export interface InputHandlers {
  onKey(k: string): void;
  onClick(sx: number, sy: number): void;
  onWheel(dir: number): void;
}

export function initInput(canvas: HTMLCanvasElement, h: InputHandlers) {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!keys.has(k)) h.onKey(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    h.onClick(e.clientX, e.clientY);
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); h.onWheel(Math.sign(e.deltaY)); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
