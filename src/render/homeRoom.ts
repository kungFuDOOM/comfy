// Home interior: a cozy dollhouse-style room (back wall + side wall, cut-away front) floating far above the island so
// nothing else is in shot. render/homeRoom drives a "home" scene (stage.ts): the world renders at a soft midday light,
// a Director frames the room inside the part of the screen the decorate tray leaves free, and the pieces from
// state.home are synced to meshes each frame (pop-in, glide when moved, quarter-turn spins).
import * as THREE from 'three';
import { paintFloor, paintWall } from '../art/homePatterns';
import { currentAccessory } from '../boutique';
import { floorById, HOME_D, HOME_W, wallById } from '../homeData';
import { inRoom } from '../home';
import { state, type HomeItem } from '../state';
import { getClock } from '../time';
import { currentLook } from '../wardrobe';
import { createDecor } from './dynamic';
import { celebrate, Shape } from './celebrate';
import { makeToon, PALETTE } from './materials';
import { Batch, G, makeLabel } from './util';
import { getWorld, runScene } from './stage';
import type { Director } from './world3d';

/** Floor centre of the room, far above the island (the dressing room sits lower, and never at the same time). */
const B = new THREE.Vector3(30, 120, 24);
const X0 = B.x - HOME_W / 2, Z0 = B.z - HOME_D / 2;
const WALL_H = 3.4;
const FLOOR_Y = B.y;

export const cellCenter = (cx: number, cy: number) => new THREE.Vector3(X0 + cx + 0.5, FLOOR_Y, Z0 + cy + 0.5);

const texCache = new Map<string, THREE.CanvasTexture>();
function tex(key: string, make: () => HTMLCanvasElement, rx: number, ry: number) {
  let t = texCache.get(key);
  if (!t) {
    t = new THREE.CanvasTexture(make());
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
}

/** The per-room shell: floor, walls, trim, window, slab and clouds. Built once and reused between visits. */
function buildShell() {
  const g = new THREE.Group();

  const floorMat = makeToon('#ffffff');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HOME_W, HOME_D), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(B.x, FLOOR_Y, B.z); floor.receiveShadow = true;

  const wallMatBack = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const wallMatLeft = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(HOME_W, WALL_H), wallMatBack);
  back.position.set(B.x, FLOOR_Y + WALL_H / 2, Z0);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(HOME_D, WALL_H), wallMatLeft);
  left.rotation.y = Math.PI / 2; left.position.set(X0, FLOOR_Y + WALL_H / 2, B.z);

  const trim = new Batch();
  const TRIM = '#fff6ef';
  trim.add(G.box(HOME_W + 0.3, 0.32, 0.16), TRIM, { x: B.x, y: FLOOR_Y + 0.16, z: Z0 + 0.06 });            // baseboards
  trim.add(G.box(0.16, 0.32, HOME_D + 0.1), TRIM, { x: X0 + 0.06, y: FLOOR_Y + 0.16, z: B.z });
  trim.add(G.box(HOME_W + 0.3, 0.14, 0.2), '#ff9ec0', { x: B.x, y: FLOOR_Y + WALL_H + 0.05, z: Z0 });       // top rails (pink)
  trim.add(G.box(0.2, 0.14, HOME_D + 0.3), '#ff9ec0', { x: X0, y: FLOOR_Y + WALL_H + 0.05, z: B.z });
  // floor edge slab: a thick cream-and-pink plinth so the room reads like a toy diorama
  trim.add(G.box(HOME_W + 0.4, 0.5, HOME_D + 0.4), '#ffd9e6', { x: B.x, y: FLOOR_Y - 0.29, z: B.z });
  trim.add(G.box(HOME_W + 0.46, 0.1, HOME_D + 0.46), '#fff4f8', { x: B.x, y: FLOOR_Y - 0.1, z: B.z });
  // back-wall window with a sky pane, pink frame, cross bars and a sill with a tiny plant
  const wx = B.x + 1.5, wy = FLOOR_Y + 1.95, wz = Z0 + 0.04;
  trim.add(G.box(1.7, 1.5, 0.08), '#ff9ec0', { x: wx, y: wy, z: wz });
  trim.add(G.box(1.4, 1.2, 0.1), '#bfe6ff', { x: wx, y: wy, z: wz + 0.02 });
  trim.add(G.box(0.07, 1.2, 0.12), '#ffffff', { x: wx, y: wy, z: wz + 0.04 });
  trim.add(G.box(1.4, 0.07, 0.12), '#ffffff', { x: wx, y: wy, z: wz + 0.04 });
  trim.add(G.box(1.95, 0.1, 0.34), '#ffffff', { x: wx, y: wy - 0.82, z: wz + 0.14 });
  // curtains: soft pink swags on each side with a gold rod
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) trim.add(G.capsule(0.1, 1.5), i % 2 ? '#ff9ec0' : '#ffb3cf', { x: wx + sx * (0.95 + i * 0.12), y: wy - 0.1, z: wz + 0.1, s: [1, 1, 0.7] });
  trim.add(G.cyl(0.04, 0.04, 2.5, 8), PALETTE.gold, { x: wx, y: wy + 0.95, z: wz + 0.1, rz: Math.PI / 2 });
  // a framed heart picture on the side wall
  trim.add(G.box(0.08, 0.9, 0.9), '#fff6ef', { x: X0 + 0.06, y: FLOOR_Y + 2.1, z: Z0 + 2.2 });
  trim.add(G.box(0.1, 0.7, 0.7), '#ffd0e2', { x: X0 + 0.08, y: FLOOR_Y + 2.1, z: Z0 + 2.2 });
  trim.add(G.ball(0.2, 10), '#ff6f9f', { x: X0 + 0.15, y: FLOOR_Y + 2.1, z: Z0 + 2.2, s: [0.4, 1, 1] });
  const trimMesh = trim.build(undefined, false); // no shadows: a long rail shadow across the floor looks like a smudge

  const sign = makeLabel('Home Sweet Home ♡', 2.2);
  sign.position.set(B.x - 1.7, FLOOR_Y + 2.65, Z0 + 0.1);

  // puffy clouds drifting around the diorama
  const clouds = new Batch();
  for (const [x, y, z, s] of [[-7, -1.2, 1, 1.3], [8, -1.8, -2, 1.1], [6.5, 3.2, -5, 1.4], [-6, 3.8, -4, 1], [0, -2.6, 5, 1.2]] as [number, number, number, number][]) {
    for (const [dx, dy, r] of [[-0.9, 0, 0.7], [0, 0.25, 0.95], [1, 0, 0.75], [0.2, -0.1, 0.8]]) clouds.add(G.ball(r * s, 12), '#ffffff', { x: B.x + x + dx * s, y: FLOOR_Y + y + dy * s, z: B.z + z });
  }

  g.add(floor, back, left, trimMesh, sign, clouds.build());
  return {
    group: g,
    style(wall: string, fl: string) {
      const w = wallById(wall), f = floorById(fl);
      wallMatBack.map = tex('w:' + w.id + ':b', () => paintWall(w), HOME_W / 2, WALL_H / 2);
      wallMatLeft.map = tex('w:' + w.id + ':l', () => paintWall(w), HOME_D / 2, WALL_H / 2);
      floorMat.map = tex('f:' + f.id, () => paintFloor(f), HOME_W / 2, HOME_D / 2);
      wallMatBack.needsUpdate = wallMatLeft.needsUpdate = floorMat.needsUpdate = true;
    },
  };
}

let shell: ReturnType<typeof buildShell> | null = null;

// ---- floor markers ----
const SQ = new THREE.RingGeometry(0.56, 0.66, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2).rotateY(Math.PI / 4);
function marker(color: string) {
  const m = new THREE.Mesh(SQ, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false }));
  m.renderOrder = 20; m.visible = false;
  return m;
}
const tileGlow = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2);

/** What the decorate UI wants shown on top of the placed pieces this frame. */
export interface HomeOverlay {
  cursor: { x: number; y: number; ok: boolean } | null;
  selected: HomeItem | null;
  /** A piece about to be placed (follows the cursor) or being dragged (the real mesh follows). */
  ghost: { id: string; rot: number } | null;
  drag: { item: HomeItem; x: number; y: number } | null;
}

export interface HomeView {
  /** The cell under a screen point (a standing piece's mesh counts for its own cell, even where it overhangs). */
  pick(sx: number, sy: number): { x: number; y: number } | null;
  /** A little sparkle + puff at a cell (placed, picked up). */
  burst(x: number, y: number, kind: 'place' | 'pick'): void;
  /** Cursor, selection and ghost state, set by the decorate UI and read every frame. */
  overlay: HomeOverlay;
  leave(): void;
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3);

interface Mesh3 { g: THREE.Group; born: number; rot: number }

export function enterHomeRoom(): HomeView {
  const world = getWorld();
  shell ??= buildShell();
  const sh = shell;
  sh.style(state.home.wall, state.home.floor);
  world.scene.add(sh.group);

  const itemRoot = new THREE.Group();
  world.scene.add(itemRoot);
  const meshes = new Map<HomeItem, Mesh3>();
  const overlay: HomeOverlay = { cursor: null, selected: null, ghost: null, drag: null };
  const cursor = marker('#ff7fb0'), selRing = marker('#ffffff');
  const glow = new THREE.Mesh(tileGlow, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
  glow.visible = false; glow.position.y = FLOOR_Y + 0.02;
  world.scene.add(cursor, selRing, glow);

  let ghostId = '', ghostRot = 0;
  let ghost: THREE.Group | null = null;
  const dispose = (g: THREE.Object3D) => g.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); }); // (materials are shared + cached: keep)
  const setGhost = (id: string | null) => {
    if (ghost) { itemRoot.remove(ghost); dispose(ghost); ghost = null; }
    ghostId = id ?? '';
    if (id) { ghost = createDecor(id); ghost.userData.ghost = true; itemRoot.add(ghost); }
  };

  const look = new THREE.Vector3(B.x, FLOOR_Y + 0.9, B.z);
  const dir = new THREE.Vector3(Math.sin(0.4) * 0.55, 0.62, Math.cos(0.4) * 0.8).normalize();
  const corners: THREE.Vector3[] = [];
  for (const x of [-1, 1]) for (const y of [-0.5, 1]) for (const z of [-1, 1]) corners.push(new THREE.Vector3(B.x + x * (HOME_W / 2 + 0.3), FLOOR_Y + (y > 0 ? WALL_H + 0.3 : -0.6), B.z + z * (HOME_D / 2 + 0.3)));
  let dist = 0, restore: THREE.Vector3 | null = null, focusRef: THREE.Vector3 | null = null;
  let t0 = -1;
  const tmp = new THREE.Vector3();

  /** The part of the screen the top bar and tray leave free: above a bottom tray, or left of a side-docked one (short landscape screens). */
  const trayRect = () => {
    const w = window.innerWidth, h = window.innerHeight;
    const top = Math.min(document.querySelector<HTMLElement>('.hm-top')?.getBoundingClientRect().bottom ?? 0, h * 0.3);
    const tr = document.querySelector<HTMLElement>('.hm-tray')?.getBoundingClientRect();
    if (tr && tr.top < h * 0.25) return { x: 0, y: top, w: Math.max(120, tr.left), h: h - top };
    return { x: 0, y: top, w, h: Math.max(120, (tr?.top ?? h) - top) };
  };

  const director: Director = {
    stage() { world.playerMesh.root.visible = false; },
    shoot(camera, focus, f) {
      if (t0 < 0) t0 = f.t;
      const w = window.innerWidth, h = window.innerHeight, r = trayRect();
      camera.clearViewOffset();
      // fit the whole room inside the free area: place the camera, project the room's corners, then pull back / in to match
      let d = dist || 18;
      for (let i = 0; i < 4; i++) {
        camera.position.copy(look).addScaledVector(dir, d);
        camera.lookAt(look); camera.updateMatrixWorld();
        let mx = 0, my = 0;
        for (const c of corners) { tmp.copy(c).project(camera); mx = Math.max(mx, Math.abs(tmp.x)); my = Math.max(my, Math.abs(tmp.y)); }
        const k = Math.max(mx / (0.94 * (r.w / w)), my / (0.94 * (r.h / h)));
        d = Math.max(7, Math.min(40, d * k));
      }
      dist = dist ? dist + (d - dist) * (1 - Math.pow(0.002, f.dt)) : d;
      const intro = Math.min(1, (f.t - t0) / 0.8);
      const dd = dist * (1 + (1 - ease(intro)) * 0.25); // a soft pull-in as the room opens
      camera.position.copy(look).addScaledVector(dir, dd);
      camera.lookAt(look);
      camera.setViewOffset(w, h, w / 2 - (r.x + r.w / 2), h / 2 - (r.y + r.h / 2), w, h);
      if (!restore) { restore = focus.clone(); focusRef = focus; }
      focus.copy(look);
    },
  };
  world.setDirector(director);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y), hit = new THREE.Vector3();
  const cellOf = (p: THREE.Vector3) => ({ x: Math.floor(p.x - X0), y: Math.floor(p.z - Z0) });

  let lastWall = state.home.wall, lastFloor = state.home.floor;
  const stopScene = runScene('home', (t, dt) => {
    if (state.home.wall !== lastWall || state.home.floor !== lastFloor) { lastWall = state.home.wall; lastFloor = state.home.floor; sh.style(lastWall, lastFloor); }
    sync(t, dt);
    world.render({
      t, dt, hour: 12.5, season: getClock().season,
      player: { x: state.px, y: state.py, facing: 'down', moving: false },
      look: currentLook(), accessory: currentAccessory(), npcs: [], talkedToday: () => true,
    });
  });

  function place(m: Mesh3, it: HomeItem, t: number, dt: number) {
    const c = cellCenter(it.x, it.y);
    const k = 1 - Math.pow(0.0004, dt);
    const age = t - m.born;
    if (age < 0.001) m.g.position.copy(c).setY(FLOOR_Y + 0.9); else m.g.position.lerp(c, k);
    // a quarter turn glides (clockwise seen from above)
    const want = -it.rot * (Math.PI / 2);
    let dr = want - m.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    m.rot += dr * k;
    m.g.rotation.y = m.rot;
    // pop-in: a springy drop with a squash
    const p = Math.min(1, age / 0.45);
    const s = p >= 1 ? 1 : 1 + Math.sin(p * Math.PI * 2.4) * 0.12 * (1 - p);
    m.g.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5);
  }

  function sync(t: number, dt: number) {
    for (const it of state.home.items) {
      let m = meshes.get(it);
      if (!m) {
        const g = createDecor(it.id);
        g.userData.item = it;
        itemRoot.add(g);
        m = { g, born: t, rot: -it.rot * (Math.PI / 2) };
        meshes.set(it, m);
        place(m, it, t, 0);
      }
      const dragging = overlay.drag?.item === it;
      if (dragging) {
        const c = cellCenter(overlay.drag!.x, overlay.drag!.y);
        m.g.position.lerp(c.setY(FLOOR_Y + 0.12 + Math.sin(t * 6) * 0.03), 1 - Math.pow(0.0001, dt));
        const p = Math.min(1, (t - m.born) / 0.45);
        if (p >= 1) m.g.scale.setScalar(1.06);
      } else place(m, it, t, dt);
    }
    for (const [it, m] of meshes) {
      if (state.home.items.includes(it)) continue;
      itemRoot.remove(m.g); dispose(m.g); meshes.delete(it);
    }

    // ghost of the piece about to be placed, bobbing at the cursor
    if ((overlay.ghost?.id ?? '') !== ghostId) setGhost(overlay.ghost?.id ?? null);
    const cur = overlay.cursor;
    if (ghost && overlay.ghost && cur) {
      ghostRot += (Math.atan2(Math.sin(-overlay.ghost.rot * Math.PI / 2 - ghostRot), Math.cos(-overlay.ghost.rot * Math.PI / 2 - ghostRot))) * (1 - Math.pow(0.0004, dt));
      ghost.visible = true;
      ghost.position.lerp(cellCenter(cur.x, cur.y).setY(FLOOR_Y + 0.18 + Math.sin(t * 4) * 0.05), 1 - Math.pow(0.0001, dt));
      ghost.rotation.y = ghostRot;
      ghost.scale.setScalar(cur.ok ? 1 : 0.85);
    } else if (ghost) ghost.visible = false;

    // markers
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const showCur = !!cur && inRoom(cur.x, cur.y);
    cursor.visible = glow.visible = showCur;
    if (showCur) {
      const c = cellCenter(cur!.x, cur!.y);
      cursor.position.copy(c).setY(FLOOR_Y + 0.03); glow.position.copy(c).setY(FLOOR_Y + 0.02);
      const col = cur!.ok ? '#ff7fb0' : '#ff5a6e';
      (cursor.material as THREE.MeshBasicMaterial).color.set(col);
      (glow.material as THREE.MeshBasicMaterial).color.set(cur!.ok ? '#ffd0e2' : '#ff8a9a');
      cursor.scale.setScalar(1 + pulse * 0.06);
    }
    const sel = overlay.selected;
    selRing.visible = !!sel && !overlay.drag;
    if (sel && selRing.visible) {
      const m = meshes.get(sel);
      if (m) selRing.position.set(m.g.position.x, FLOOR_Y + 0.05, m.g.position.z);
      selRing.scale.setScalar(1.08 + pulse * 0.08);
    }
  }

  return {
    overlay,
    pick(sx, sy) {
      ndc.set((sx / window.innerWidth) * 2 - 1, -((sy / window.innerHeight) * 2 - 1));
      ray.setFromCamera(ndc, world.camera);
      // a standing piece under the pointer wins, so the top of a tall bookshelf selects the shelf, not the cell behind it
      const hits = ray.intersectObjects(itemRoot.children, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.item) o = o.parent;
        const it = o?.userData.item as HomeItem | undefined;
        if (it && meshes.has(it)) return { x: it.x, y: it.y };
      }
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      const c = cellOf(hit);
      return inRoom(c.x, c.y) ? c : null;
    },
    burst(x, y, kind) {
      const at = cellCenter(x, y).setY(FLOOR_Y + 0.5);
      celebrate.burst(at, kind === 'place'
        ? { count: 14, colors: ['#ffb3cf', '#fff3a8', '#ffffff', '#d9c9ff'], shapes: [Shape.Star, Shape.Dot], spread: 0.35, speed: 1.2, up: 1.6, gravity: 1.2, size: [0.12, 0.2], life: [0.6, 1.0] }
        : { count: 8, colors: ['#ffffff', '#ffe9f1'], shapes: [Shape.Puff], spread: 0.3, speed: 0.8, up: 0.9, gravity: 0, size: [0.5, 0.8], life: [0.5, 0.8] });
    },
    leave() {
      stopScene();
      world.setDirector(null);
      if (restore && focusRef) focusRef.copy(restore);
      world.scene.remove(sh.group, itemRoot, cursor, selRing, glow);
      for (const [, m] of meshes) dispose(m.g);
      meshes.clear();
      if (ghost) dispose(ghost);
      const p = world.playerMesh.root;
      p.rotation.set(0, 0, 0); p.scale.set(1, 1, 1);
    },
  };
}
