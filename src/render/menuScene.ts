// Main-menu backdrop: the live island with villagers pottering about, a balloon idling in the sky,
// paper lanterns rising over the square, blossom petals on the breeze, and a slow drifting camera.
// Purely visual; the DOM menu sits on top (ui/mainMenu.ts).
import * as THREE from 'three';
import { currentAccessory, currentOutfit } from '../boutique';
import { initNpcs, npcs, updateNpcs } from '../npc';
import { state } from '../state';
import { getClock } from '../time';
import { createBalloon, type Balloon } from './balloon';
import { getWorld, runScene } from './stage';
import { Batch, G } from './util';
import type { Director } from './world3d';

export interface MenuSceneOptions {
  /** Game-clock hour for the lighting. Default: a warm late afternoon. Pass getClock().hour to follow real time. */
  hour?: number;
}

const FOCUS = new THREE.Vector3(48, 0.6, 39.5); // between the café, the boutique and the square
let stop: (() => void) | null = null;
let balloon: Balloon | null = null;
let ambience: Ambience | null = null;

// ---- drifting lanterns + petals (two instanced meshes, unlit so they read as softly glowing paper) ----
const LANTERNS = 18, PETALS = 90;
const RISE = 15;                 // lanterns climb this far, then start again from the rooftops
const LANTERN_TINTS = ['#ffc7a6', '#ff9ec0', '#d3b4f0', '#a9ecd2', '#fff0d6', '#c9efb4']; // one per Afterglow kind
const PETAL_TINTS = ['#ffd3e2', '#ffb3cf', '#fff1f6', '#ff9ec0'];
const h01 = (n: number) => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
const wrap = (v: number, size: number) => ((v % size) + size) % size;
const ease = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

interface Ambience { group: THREE.Group; update(t: number): void }

function createAmbience(): Ambience {
  const group = new THREE.Group();
  const c = new THREE.Color(), o = new THREE.Object3D();

  const paper = new Batch();
  paper.add(G.lathe([[0.1, 0], [0.19, 0.07], [0.235, 0.24], [0.215, 0.41], [0.13, 0.5]], 14), '#ffffff');
  paper.add(G.cyl(0.14, 0.14, 0.045, 14), '#e39ab6', { y: 0.51 });
  paper.add(G.cyl(0.105, 0.105, 0.04, 14), '#e39ab6', { y: -0.01 });
  paper.add(G.ball(0.035, 8), '#fff3c4', { y: -0.09 }); // tassel bead
  const lanterns = new THREE.InstancedMesh(paper.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true }), LANTERNS);
  for (let i = 0; i < LANTERNS; i++) lanterns.setColorAt(i, c.set(LANTERN_TINTS[i % LANTERN_TINTS.length]).multiplyScalar(1.12));

  const petals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.1, 7), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), PETALS);
  for (let i = 0; i < PETALS; i++) petals.setColorAt(i, c.set(PETAL_TINTS[i % PETAL_TINTS.length]));

  for (const m of [lanterns, petals]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); }

  return {
    group,
    update(t) {
      for (let i = 0; i < LANTERNS; i++) {
        const r1 = h01(i + 3), r2 = h01(i + 31), r3 = h01(i + 57);
        const life = wrap(r3 * RISE + t * (0.2 + r1 * 0.12), RISE);
        o.position.set(
          FOCUS.x - 17 + r1 * 34 + Math.sin(t * 0.21 + i * 1.7) * 0.9 + life * 0.12,
          1.6 + life + Math.sin(t * 0.8 + i) * 0.1,
          FOCUS.z - 13 + r2 * 22 + Math.cos(t * 0.17 + i * 2.3) * 0.7);
        o.rotation.set(Math.sin(t * 0.6 + i) * 0.08, t * 0.15 + i, Math.cos(t * 0.5 + i * 1.3) * 0.08);
        o.scale.setScalar((0.95 + r2 * 0.5) * ease(0, 1.6, life) * (1 - ease(RISE - 2.5, RISE, life))); // pop in, melt away
        o.updateMatrix();
        lanterns.setMatrixAt(i, o.matrix);
      }
      lanterns.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < PETALS; i++) {
        const r1 = h01(i + 200), r2 = h01(i + 233), r3 = h01(i + 271);
        const life = wrap(r3 * 11 + t * (0.38 + r1 * 0.3), 11); // falls from 11 units up
        o.position.set(
          FOCUS.x - 22 + wrap(r1 * 44 + t * (0.5 + r2 * 0.4) + Math.sin(t * 1.1 + i) * 0.5, 44),
          11.4 - life,
          FOCUS.z - 15 + wrap(r2 * 30 + t * 0.22 + Math.cos(t * 0.9 + i * 1.9) * 0.4, 30));
        o.rotation.set(t * (0.9 + r1) + i, t * (0.6 + r2) + i * 2, i);
        o.scale.set(1, 0.62, 1).multiplyScalar((0.7 + r3 * 0.7) * Math.min(1, life * 1.5, (11 - life) * 1.5));
        o.updateMatrix();
        petals.setMatrixAt(i, o.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    },
  };
}

export const menuSceneRunning = () => stop !== null;

export function startMenuScene(opts: MenuSceneOptions = {}) {
  if (stop) return;
  const world = getWorld();
  initNpcs();
  balloon ??= createBalloon();
  ambience ??= createAmbience();
  const b = balloon, amb = ambience;
  world.scene.add(b.group, amb.group);
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

      b.group.position.set(59 + Math.sin(t * 0.05) * 4, 8.2 + Math.sin(t * 0.33) * 0.35, 36 + Math.cos(t * 0.041) * 2.5);
      b.group.rotation.y = t * 0.08;
      b.animate(f.t, 1);
      amb.update(t);
    },
  };
  world.setDirector(director);

  const halt = runScene('menu', (t, dt) => {
    updateNpcs(dt);
    world.render({
      t, dt, hour, season: getClock().season,
      player: { x: state.px, y: state.py, facing: state.facing, moving: false },
      outfit: currentOutfit(), accessory: currentAccessory(), npcs, talkedToday: () => true,
    });
  });
  stop = () => {
    halt();
    world.setDirector(null);
    world.scene.remove(b.group, amb.group);
  };
}

export function stopMenuScene() {
  stop?.();
  stop = null;
}
