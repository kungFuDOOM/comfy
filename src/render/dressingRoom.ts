// Dressing room: a cozy little fitting room floating high above the island (nothing else is in shot), with
// striped pink wallpaper, a bulb-ringed mirror, swagged curtains, a clothes rack, a soft spotlight and a
// pedestal. While it is up, a World3D Director moves the player onto the pedestal, turns them with
// dressing.spin, plays a twirl + sparkle burst whenever the outfit changes, and frames the camera on them
// inside whatever part of the screen the outfit panel leaves free.
import * as THREE from 'three';
import { dressing } from '../dressing';
import { OUTFITS } from '../data';
import { cheetahToon, makeToon, PALETTE } from './materials';
import { Batch, G, makeLabel } from './util';
import { sharedWorld3D, type Director, type World3D } from './world3d';

/** Room origin (floor centre), far above the middle of the island so no scenery can creep into frame. */
const B = new THREE.Vector3(30, 60, 24);
const ROOM_R = 13;
const PED_H = 0.19;
const CHAR_H = 2.3;   // feet to the top of the tallest hat, plus a little twirl hop
const CHAR_W = 1.25;
const TWIRL = 0.85;   // seconds
const SPARKS = 44;
const AMBIENT = 12;   // always-on twinkles around the mirror; the rest are burst sparkles

/** The follow camera's look-at point as it was on open; put back on close so the camera doesn't glide in from the sky. */
let restore: { ref: THREE.Vector3; at: THREE.Vector3 } | null = null;
let set: { group: THREE.Group; update(t: number, cam: THREE.Camera): void; burst(t: number): void } | null = null;
let world: World3D | null = null;

function canvasTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const heart = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.beginPath();
  g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s, y - s * 0.35, x - s * 0.45, y - s, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.35, x, y + s * 0.35);
  g.fill();
};

function buildSet() {
  const group = new THREE.Group();
  group.position.copy(B);

  // ---- room shell: unlit so the fitting room always reads warm and cozy, day or night ----
  const wallpaper = canvasTex(256, 512, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#ffc6dc'); grd.addColorStop(0.7, '#ffe0ec'); grd.addColorStop(1, '#fff0f5');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 512);
    g.fillStyle = 'rgba(255,255,255,0.38)';
    for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 30, 512);
    g.fillStyle = 'rgba(255,128,176,0.35)';
    for (let y = 40; y < 512; y += 80) heart(g, 47, y, 11), heart(g, 111, y + 40, 9);
  }, true);
  wallpaper.repeat.set(14, 1);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R, ROOM_R, 7, 56, 1, true), new THREE.MeshBasicMaterial({ map: wallpaper, side: THREE.BackSide }));
  wall.position.y = 3.5;
  const wainscot = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R - 0.05, ROOM_R - 0.05, 1.1, 56, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6ef', side: THREE.BackSide }));
  wainscot.position.y = 0.55;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(ROOM_R - 0.08, 0.05, 6, 72), new THREE.MeshBasicMaterial({ color: '#ff9ec0' }));
  rail.rotation.x = Math.PI / 2; rail.position.y = 1.12;
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R, 48), new THREE.MeshBasicMaterial({ color: '#f7b3cc' }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 7;
  // soft checker floor (lit, so the character's shadow lands on it)
  const checker = canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffe6ef'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffd2e2'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  }, true);
  checker.repeat.set(13, 13);
  const floorMat = makeToon('#ffffff'); floorMat.map = checker;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R, 48), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  // round fluffy rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.75, 40), makeToon('#ffb8d2'));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; rug.receiveShadow = true;
  group.add(wall, wainscot, rail, ceiling, floor, rug);

  // ---- pedestal: cream drum, gold trim, pink cheetah-print top ----
  const ped = new Batch()
    .add(G.cyl(0.78, 0.84, PED_H - 0.01, 32), '#fff4f8', { y: (PED_H - 0.01) / 2 })
    .add(G.torus(0.8, 0.03, 40), PALETTE.gold, { y: PED_H - 0.02, rx: Math.PI / 2 })
    .add(G.torus(0.84, 0.025, 40), PALETTE.gold, { y: 0.02, rx: Math.PI / 2 })
    .build();
  const pedTop = new THREE.Mesh(new THREE.CircleGeometry(0.76, 32), cheetahToon('pink'));
  pedTop.rotation.x = -Math.PI / 2; pedTop.position.y = PED_H; pedTop.receiveShadow = true;
  group.add(ped, pedTop);

  // ---- arched mirror with a ring of little bulbs ----
  const mirror = new THREE.Group();
  mirror.position.set(0, 1.55, -1.85);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.92, 40), new THREE.MeshBasicMaterial({
    map: canvasTex(128, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 128, 256);
      grd.addColorStop(0, '#f4ecff'); grd.addColorStop(0.55, '#dcd6ff'); grd.addColorStop(1, '#ffd9ec');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 256);
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineCap = 'round';
      g.lineWidth = 12; g.beginPath(); g.moveTo(28, 120); g.lineTo(70, 40); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.moveTo(46, 150); g.lineTo(86, 72); g.stroke();
    }),
  }));
  glass.scale.y = 1.3;
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 10, 48), makeToon(PALETTE.gold));
  frame.scale.y = 1.3; frame.castShadow = false;
  const bulbs = new Batch();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.1;
    bulbs.add(G.ball(0.055, 8), '#ffffff', { x: Math.cos(a) * 1.06, y: Math.sin(a) * 1.06 * 1.3, z: 0.05 });
  }
  const bulbMesh = new THREE.Mesh(bulbs.geometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c8').multiplyScalar(1.25) }));
  const crest = new Batch(); // a little heart on top of the frame
  crest.add(G.ball(0.1, 10), PALETTE.rose, { x: -0.07, y: 1.36, z: 0.04 }).add(G.ball(0.1, 10), PALETTE.rose, { x: 0.07, y: 1.36, z: 0.04 })
    .add(G.cone(0.13, 0.17, 12), PALETTE.rose, { y: 1.24, z: 0.04, rx: Math.PI });
  mirror.add(glass, frame, bulbMesh, crest.build());
  group.add(mirror);

  // ---- curtains swagged on both sides, gold rod and a scalloped valance ----
  const curtains = new Batch();
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = sx * (1.7 + i * 0.17), pinch = 1 - Math.abs(i - 2) * 0.05;
      curtains.add(G.capsule(0.1, 3.1), i % 2 ? '#ff9ec0' : '#ffb3cf', { x, y: 1.75, z: -1.55 + Math.sin(i) * 0.05, s: [pinch, 1, 0.8] });
    }
    curtains.add(G.torus(0.42, 0.04, 16), PALETTE.gold, { x: sx * 2.04, y: 1.35, z: -1.5, rx: Math.PI / 2, s: [1, 0.55, 1] }); // tie-back
  }
  curtains.add(G.cyl(0.045, 0.045, 5.2, 10), PALETTE.gold, { y: 3.42, z: -1.6, rz: Math.PI / 2 });
  for (let i = 0; i < 11; i++) curtains.add(G.ball(0.24, 10), i % 2 ? '#ff8fb6' : '#ffc0d8', { x: -2.4 + i * 0.48, y: 3.25, z: -1.48, s: [1, 0.7, 0.45] });
  group.add(curtains.build());

  const sign = makeLabel('Fitting Room ♡', 1.7);
  sign.position.set(0, 3.02, -1.62);
  group.add(sign);

  // ---- clothes rack with tiny dresses in the boutique's colours ----
  const rack = new Batch();
  const rx = -3.3, rz = -0.9;
  for (const dz of [-0.55, 0.55]) rack.add(G.cyl(0.035, 0.035, 2.0, 8), PALETTE.gold, { x: rx, y: 1.0, z: rz + dz });
  rack.add(G.cyl(0.03, 0.03, 1.2, 8), PALETTE.gold, { x: rx, y: 1.95, z: rz, rx: Math.PI / 2 });
  OUTFITS.slice(1, 6).forEach((o, i) => {
    const z = rz - 0.42 + i * 0.21;
    rack.add(G.torus(0.05, 0.012, 10), '#fff4dc', { x: rx, y: 1.92, z, ry: Math.PI / 2 });
    rack.add(G.lathe([[0.001, 0], [0.24, 0], [0.2, 0.25], [0.11, 0.5], [0.001, 0.52]], 12), o.pattern ? '#f2c9a0' : o.body, { x: rx, y: 1.32, z, s: [0.32, 1, 1] });
  });
  // plant in a pink pot, and a little round stool
  rack.add(G.cyl(0.26, 0.2, 0.42, 14), '#ff9ec0', { x: 3.2, y: 0.21, z: -0.9 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9; rack.add(G.ball(0.2, 8), i % 2 ? PALETTE.leaf : PALETTE.mint, { x: 3.2 + Math.cos(a) * 0.16, y: 0.62 + (i % 3) * 0.16, z: -0.9 + Math.sin(a) * 0.16, s: [0.8, 1.3, 0.8] }); }
  rack.add(G.cyl(0.32, 0.28, 0.4, 18), '#fff4f8', { x: 2.5, y: 0.2, z: 0.6 });
  rack.add(G.ball(0.33, 14), '#ffc9dc', { x: 2.5, y: 0.42, z: 0.6, s: [1, 0.35, 1] });
  group.add(rack.build());

  // ---- soft spotlight: a faint cone of light and a glowing pool on the pedestal ----
  const glow = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff0d8', alphaMap: glow, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.position.y = PED_H + 0.01; pool.renderOrder = 2;
  const beamTex = canvasTex(4, 128, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 4, 128);
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 1.15, 5.2, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe8f2', alphaMap: beamTex, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.position.y = 0.3 + 2.6; beam.renderOrder = 3;
  const lamp = new Batch().add(G.cyl(0.16, 0.24, 0.26, 14), PALETTE.gold, { y: 5.6 }).add(G.cyl(0.02, 0.02, 1.4, 6), PALETTE.gold, { y: 6.4 }).build();
  group.add(pool, beam, lamp);

  // ---- sparkles: 4-point stars billboarded at the camera ----
  const star = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, r = i % 2 ? 0.28 : 1;
    const x = Math.sin(a) * r * 0.09, y = Math.cos(a) * r * 0.09;
    if (i) star.lineTo(x, y); else star.moveTo(x, y);
  }
  const sparks = new THREE.InstancedMesh(new THREE.ShapeGeometry(star), new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false, transparent: true, side: THREE.DoubleSide }), SPARKS);
  sparks.frustumCulled = false; sparks.renderOrder = 4;
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const tints = ['#ffffff', '#fff2a8', '#ffb3cf', '#ff8fb8', '#e6cbff'];
  const col = new THREE.Color();
  const seeds = Array.from({ length: SPARKS }, (_, i) => {
    sparks.setColorAt(i, col.set(tints[i % tints.length]));
    const h = (n: number) => { const s = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
    return { a: h(1) * Math.PI * 2, r: h(2), up: h(3), sp: h(4), tw: h(5) };
  });
  group.add(sparks);
  let burstT = -99;
  const o = new THREE.Object3D(), q = new THREE.Quaternion();

  return {
    group,
    burst(t: number) { burstT = t; },
    update(t: number, cam: THREE.Camera) {
      cam.getWorldQuaternion(q);
      const bt = t - burstT;
      for (let i = 0; i < SPARKS; i++) {
        const s = seeds[i];
        let sc = 0;
        if (i < AMBIENT) {
          // slow twinkles drifting around the mirror and curtains
          const a = s.a + t * 0.12 * (s.sp - 0.5);
          o.position.set(Math.cos(a) * (1.3 + s.r * 1.4), 0.6 + s.up * 2.6 + Math.sin(t * 0.7 + s.tw * 6) * 0.08, -1.3 + Math.sin(a) * 0.5);
          sc = 0.55 + 0.45 * Math.max(0, Math.sin(t * (1.6 + s.sp * 1.4) + s.tw * 9));
        } else if (bt >= 0 && bt < 1.5) {
          // burst: a ring that blooms out from the character and floats up
          const life = bt / (1.1 + s.sp * 0.4);
          if (life < 1) {
            const rad = 0.35 + (0.55 + s.r * 0.7) * (1 - Math.pow(1 - life, 3));
            o.position.set(Math.cos(s.a) * rad, PED_H + 0.25 + s.up * 1.5 + life * (0.4 + s.sp * 0.5), Math.sin(s.a) * rad * 0.8 + 0.15);
            sc = Math.sin(Math.min(1, life * 1.4) * Math.PI) * (0.9 + s.tw * 0.8);
          }
        }
        o.quaternion.copy(q);
        o.rotateZ(t * (1 + s.sp) + s.a);
        o.scale.setScalar(sc);
        o.updateMatrix();
        sparks.setMatrixAt(i, o.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;
    },
  };
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** The part of the screen the outfit panel leaves free (CSS px): left of a side-docked panel, or above a bottom one. */
function freeRect() {
  const w = window.innerWidth, h = window.innerHeight;
  const p = document.querySelector<HTMLElement>('.panel.dress')?.getBoundingClientRect();
  if (p && p.left > w * 0.3) return { x: 0, y: 0, w: p.left, h };
  if (p && p.top > h * 0.25) return { x: 0, y: 0, w, h: p.top };
  return { x: 0, y: 0, w, h };
}

export function startDressingRoom() {
  if (dressing.active) return;
  world ??= sharedWorld3D(document.getElementById('game') as HTMLCanvasElement);
  set ??= buildSet();
  const w3 = world, s = set;
  w3.scene.add(s.group);
  dressing.active = true;
  dressing.spin = 0; dressing.vel = 0; dressing.hold = 0; dressing.dragging = false;

  let shown = 0, twirlT = -99, seen = dressing.twirls, lastKey = '', t0 = -1, dist = 0;
  const startTwirl = (t: number) => { if (t - twirlT > 0.12) { twirlT = t; s.burst(t); } };
  const look = new THREE.Vector3();

  const director: Director = {
    stage(f) {
      if (t0 < 0) { t0 = f.t; twirlT = f.t + 0.25; s.burst(f.t + 0.25); } // a little hello twirl as the camera arrives
      const key = f.outfit.id + '|' + (f.accessory ?? '');
      if (lastKey && key !== lastKey) startTwirl(f.t);
      lastKey = key;
      if (dressing.twirls !== seen) { seen = dressing.twirls; startTwirl(f.t); }

      shown += (dressing.spin - shown) * (1 - Math.pow(0.0005, f.dt));
      const tw = (f.t - twirlT) / TWIRL;
      let turn = 0, hop = 0, lean = 0, sq = 0;
      if (tw >= 0 && tw < 1) { turn = ease(tw) * Math.PI * 2; hop = Math.sin(Math.PI * Math.min(1, tw * 1.15)) * 0.2; }
      else if (tw >= 1 && tw < 1.9) {
        // "ta-da": a squashy landing, then a little sway pose
        const k = tw - 1;
        sq = Math.sin(Math.min(1, k * 4) * Math.PI) * 0.08 * (k < 0.25 ? 1 : 0);
        lean = Math.sin(k * Math.PI * 2.2) * 0.12 * (1 - k / 0.9);
      }
      const p = w3.playerMesh.root;
      p.visible = true;
      p.position.set(B.x, B.y + PED_H + hop, B.z);
      p.rotation.set(0, shown + turn, lean);
      p.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    },
    shoot(camera, focus, f) {
      const w = window.innerWidth, h = window.innerHeight;
      const r = freeRect();
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      // fit the character inside the free area (with breathing room), whichever way is tighter
      const visH = Math.max((CHAR_H / 0.78) * (h / Math.max(80, r.h)), ((CHAR_W / 0.62) * (w / Math.max(80, r.w))) / camera.aspect);
      const want = Math.max(2.6, Math.min(11.5, visH / (2 * tanH)));
      dist = dist ? dist + (want - dist) * (1 - Math.pow(0.002, f.dt)) : want;
      const intro = Math.min(1, (f.t - t0) / 0.7);
      const d = dist * (1 - (1 - ease(intro)) * 0.3); // a soft push-out from close-up on open (stays inside the room)
      look.set(B.x, B.y + PED_H + 0.92, B.z);
      camera.position.set(B.x, look.y + 0.12 + d * 0.13, B.z + d);
      camera.lookAt(look);
      // shift the picture so the character sits in the middle of the free area
      camera.setViewOffset(w, h, w / 2 - (r.x + r.w / 2), h / 2 - (r.y + r.h / 2), w, h);
      if (!restore) restore = { ref: focus, at: focus.clone() };
      focus.copy(look);
      s.update(f.t, camera);
    },
  };
  w3.setDirector(director);
}

export function stopDressingRoom() {
  if (!dressing.active || !world || !set) return;
  dressing.active = false;
  dressing.hold = 0; dressing.vel = 0; dressing.dragging = false;
  world.setDirector(null);
  if (restore) { restore.ref.copy(restore.at); restore = null; }
  world.scene.remove(set.group);
  const p = world.playerMesh.root;
  p.rotation.set(0, 0, 0);
  p.scale.set(1, 1, 1);
}
