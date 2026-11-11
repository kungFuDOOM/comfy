// Full-screen soft fade used between the menu, the intro cutscene and gameplay.
import './scenes.css';

let el: HTMLElement | null = null;
function node(): HTMLElement {
  if (!el) {
    el = document.createElement('div');
    el.className = 'scene-fade';
    document.getElementById('ui')!.append(el);
  }
  return el;
}

/** Set the cover immediately (0 = clear, 1 = fully covered). */
export function setFade(alpha: number) {
  const n = node();
  n.style.transition = 'none';
  n.style.opacity = String(alpha);
  n.classList.toggle('on', alpha > 0.01);
}

/** Animate the cover to `alpha` over `ms`; resolves when it gets there. */
export function fadeTo(alpha: number, ms = 600): Promise<void> {
  const n = node();
  n.classList.add('on');
  void n.offsetWidth; // commit the starting opacity so the transition runs
  n.style.transition = `opacity ${ms}ms ease`;
  n.style.opacity = String(alpha);
  return new Promise((res) => setTimeout(() => { if (alpha <= 0.01) n.classList.remove('on'); res(); }, ms + 30));
}
