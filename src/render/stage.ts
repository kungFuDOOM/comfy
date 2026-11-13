// Stage: the shared Three.js world plus a tiny "scene" loop for full-screen scripted moments
// (main menu backdrop, intro cutscene). While a scene runs, the gameplay loop in game.ts idles.
import { cheetahDataUrl } from '../art/cheetah';
import { pollInput } from '../input';
import { buildWorld } from '../world';
import { sharedWorld3D, type World3D } from './world3d';

let world: World3D | null = null;

/** Builds the island + renderer on first use (before or after startGame, either order works). */
export function getWorld(): World3D {
  if (world) return world;
  buildWorld();
  const root = document.documentElement.style;
  if (!root.getPropertyValue('--cheetah')) {
    root.setProperty('--cheetah', `url(${cheetahDataUrl('classic')})`);
    root.setProperty('--cheetah-pink', `url(${cheetahDataUrl('pink')})`);
  }
  const w = sharedWorld3D(document.getElementById('game') as HTMLCanvasElement);
  w.resize();
  window.addEventListener('resize', () => w.resize());
  return (world = w);
}

export type SceneKind = 'menu' | 'cutscene' | 'home';
interface Running { kind: SceneKind; tick(t: number, dt: number): void; raf: number }
let running: Running | null = null;

/** True while the main menu or a cutscene owns the screen (gameplay update/render is paused). */
export const sceneActive = () => running !== null;
export const activeScene = (): SceneKind | null => running?.kind ?? null;

/**
 * Run a scripted scene: `tick(t, dt)` is called every frame (seconds) and should call world.render().
 * Adds `body.scene-<kind>` so CSS can tuck the gameplay HUD away. Returns a stop function.
 */
export function runScene(kind: SceneKind, tick: (t: number, dt: number) => void): () => void {
  stopScene();
  const me: Running = { kind, tick, raf: 0 };
  running = me;
  document.body.classList.add('scene', 'scene-' + kind);
  let last = performance.now();
  const frame = (now: number) => {
    if (running !== me) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    pollInput(dt); // gamepad: menu selection, cutscene advance / skip
    if (running !== me) return;
    me.tick(now / 1000, dt);
    if (running === me) me.raf = requestAnimationFrame(frame);
  };
  me.raf = requestAnimationFrame(frame);
  return () => { if (running === me) stopScene(); };
}

export function stopScene() {
  if (!running) return;
  cancelAnimationFrame(running.raf);
  document.body.classList.remove('scene', 'scene-' + running.kind);
  running = null;
}
