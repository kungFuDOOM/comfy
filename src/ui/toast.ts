// Toasts: little pink notes at the top of the screen. Self-contained so they also work over the main menu
// and the intro (e.g. "controller connected"), before the gameplay HUD exists.
import { bus } from '../bus';
import { h } from './dom';

let box: HTMLElement | null = null;

function showToast(msg: string) {
  if (!box) { box = h('div', 'toasts'); box.setAttribute('role', 'status'); document.getElementById('ui')!.append(box); }
  const t = h('div', 'toast', msg);
  box.append(t);
  while (box.children.length > 4) box.firstChild?.remove();
  setTimeout(() => t.classList.add('out'), 3800);
  setTimeout(() => t.remove(), 4400);
}

bus.on('toast', showToast);
