// Main-menu backdrop: the live island with villagers pottering about, a balloon idling in the sky,
// and a slow drifting camera. Purely visual; the DOM menu sits on top (ui/mainMenu.ts).
import * as THREE from 'three';
import { currentOutfit } from '../boutique';
import { initNpcs, npcs, updateNpcs } from '../npc';
import { state } from '../state';
import { getClock } from '../time';
import { createBalloon, type Balloon } from './balloon';
import { getWorld, runScene } from './stage';
import type { Director } from './world3d';

export interface MenuSceneOptions {
  /** Game-clock hour for the lighting. Default: a warm late afternoon. Pass getClock().hour to follow real time. */
  hour?: number;
}

const FOCUS = new THREE.Vector3(30, 0.6, 17.5); // between the café, the boutique and the square
let stop: (() => void) | null = null;
let balloon: Balloon | null = null;

export const menuSceneRunning = () => stop !== null;

export function startMenuScene(opts: MenuSceneOptions = {}) {
  if (stop) return;
  const world = getWorld();
  initNpcs();
  balloon ??= createBalloon();
  const b = balloon;
  world.scene.add(b.group);
  const hour = opts.hour ?? 17.2;
  const t0 = performance.now() / 1000;

  const director: Director = {
    stage() {
      // a brand-new save has nobody on the island yet: they arrive in the intro
      world.playerMesh.root.visible = state.seenIntro;
    },
    shoot(camera, focus, f) {
      const t = f.t - t0;
      const portrait = camera.aspect < 1;
      const yaw = 0.18 + Math.sin(t * 0.06) * 0.52;
      const pitch = 0.54 + Math.sin(t * 0.043 + 1) * 0.04;
      const dist = (38 + Math.sin(t * 0.05 + 2) * 2.5) * (portrait ? 1 + (1 - camera.aspect) * 0.75 : 1);
      focus.set(FOCUS.x + Math.sin(t * 0.037) * 2.2, FOCUS.y, FOCUS.z + Math.cos(t * 0.031) * 1.4);
      const horiz = Math.cos(pitch) * dist;
      camera.position.set(focus.x + Math.sin(yaw) * horiz, focus.y + Math.sin(pitch) * dist, focus.z + Math.cos(yaw) * horiz);
      camera.lookAt(focus);
      // leave room for the menu: slide the picture right on wide screens, down a little on tall ones
      const w = window.innerWidth, h = window.innerHeight;
      if (portrait) camera.setViewOffset(w, h, 0, -h * 0.06, w, h);
      else camera.setViewOffset(w, h, -w * 0.14, h * 0.02, w, h);

      b.group.position.set(41 + Math.sin(t * 0.05) * 4, 8.2 + Math.sin(t * 0.33) * 0.35, 14 + Math.cos(t * 0.041) * 2.5);
      b.group.rotation.y = t * 0.08;
      b.animate(f.t, 1);
    },
  };
  world.setDirector(director);

  const halt = runScene('menu', (t, dt) => {
    updateNpcs(dt);
    world.render({
      t, dt, hour, season: getClock().season,
      player: { x: state.px, y: state.py, facing: state.facing, moving: false },
      outfit: currentOutfit(), npcs, talkedToday: () => true,
    });
  });
  stop = () => {
    halt();
    world.setDirector(null);
    world.scene.remove(b.group);
  };
}

export function stopMenuScene() {
  stop?.();
  stop = null;
}
