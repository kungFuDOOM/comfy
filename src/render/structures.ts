// Architecture + props. Each building / station / prop is merged into a handful of meshes:
// one vertex-colored body, one warm-window (emissive) mesh, and one mesh per cheetah print.
import * as THREE from 'three';
import { buildings, props, stations, type Building, type Prop, type Station } from '../world';
import { cheetahToon, contactShadow, lightPool, makeToon, PALETTE, vertexToon, type CheetahKind } from './materials';
import { ball, Batch, G, makeLabel, mat } from './util';
import { tileHeight } from './terrain';

const STYLE = {
  cafe: { wall: '#fff4e6', base: '#f3c9b4', roof: '#f29aa6', ridge: '#ffffff', name: 'Puddle & Pip Café' },
  boutique: { wall: '#ffe6f0', base: '#ffb9d2', roof: '#ff9ec0', ridge: '#ffffff', name: 'Spot & Bow' },
  house: { wall: '#fff0e6', base: '#ecd3e6', roof: '#c9a8e8', ridge: '#ffffff', name: 'Home Sweet Nook' },
};
const GLASS = '#fff0d0'; // warm even by day; glows at night
const COFFEE = '#9a6a50';
const ROOF_H = 1.7;

/** Everything one model needs: body, glowing glass, and the two prints. */
class Kit {
  v = new Batch(); glow = new Batch(); classic = new Batch(); pink = new Batch();
  print(k: CheetahKind) { return k === 'classic' ? this.classic : this.pink; }
  into(g: THREE.Group) {
    if (!this.v.empty) g.add(this.v.build());
    if (!this.glow.empty) g.add(this.glow.build(vertexToon(PALETTE.windowGlow)));
    if (!this.classic.empty) g.add(this.classic.build(cheetahToon('classic')));
    if (!this.pink.empty) g.add(this.pink.build(cheetahToon('pink')));
  }
}

/** Gabled roof prism spanning width w (x) and depth d (z), ridge along x. */
function roofGeo(w: number, d: number, h: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, h); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function windowAt(k: Kit, x: number, y: number, z: number, w: number, h: number, frame = '#ffffff') {
  k.v.add(G.box(w + 0.18, h + 0.18, 0.08), frame, { x, y, z });
  k.glow.add(G.box(w, h, 0.06), GLASS, { x, y, z: z + 0.04 });
  k.v.add(G.box(0.05, h, 0.04), frame, { x, y, z: z + 0.07 });
  k.v.add(G.box(w, 0.05, 0.04), frame, { x, y, z: z + 0.07 });
  k.v.add(G.box(w + 0.3, 0.07, 0.18), frame, { x, y: y - h / 2 - 0.1, z: z + 0.06 });
}

function flowerBox(b: Batch, x: number, y: number, z: number, w: number) {
  b.add(G.box(w, 0.16, 0.22), PALETTE.wood, { x, y, z });
  const n = Math.round(w / 0.2);
  for (let i = 0; i < n; i++) b.add(G.ball(0.095, 8), ['#ff8fb6', '#ffffff', '#ffc9dc', PALETTE.leaf][i % 4], { x: x - w / 2 + (i + 0.5) * (w / n), y: y + 0.12 + (i % 2) * 0.03, z: z + (i % 3) * 0.02 });
}

/** Striped awning with a scalloped front edge. (x,y,z) is the centre of the sloped sheet. */
function stripedAwning(b: Batch, x: number, y: number, z: number, w: number, depth: number, c1: string, c2: string, tilt = 0.5) {
  const n = Math.max(4, Math.round(w * 3)), sw = w / n;
  const ez = z + (Math.cos(tilt) * depth) / 2, ey = y - (Math.sin(tilt) * depth) / 2;
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + (i + 0.5) * sw, c = i % 2 ? c1 : c2;
    b.add(G.box(sw, 0.06, depth), c, { x: sx, y, z, rx: tilt });
    b.add(G.cyl(sw / 2, sw / 2, 0.05, 10), c, { x: sx, y: ey - 0.01, z: ez, rx: Math.PI / 2 });
  }
}

/** Cheetah-print awning with a pink scalloped edge. */
function cheetahAwning(k: Kit, kind: CheetahKind, x: number, y: number, z: number, w: number, depth: number, tilt = 0.5) {
  k.print(kind).add(G.box(w, 0.06, depth), '#ffffff', { x, y, z, rx: tilt, uv: [w / 0.9, depth / 0.9] });
  const n = Math.max(4, Math.round(w * 3)), sw = w / n;
  const ez = z + (Math.cos(tilt) * depth) / 2, ey = y - (Math.sin(tilt) * depth) / 2;
  for (let i = 0; i < n; i++) k.v.add(G.cyl(sw / 2, sw / 2, 0.05, 10), i % 2 ? PALETTE.pink : '#ffffff', { x: x - w / 2 + (i + 0.5) * sw, y: ey - 0.01, z: ez, rx: Math.PI / 2 });
}

/** Mug on a saucer with coffee in it. s = size multiplier (1 = table mug). */
function mug(b: Batch, x: number, y: number, z: number, s = 1, color = '#ffffff', stripe?: string) {
  b.add(G.cyl(0.1, 0.075, 0.016, 14), '#ffffff', { x, y: y + 0.008 * s, z, s });
  b.add(G.cyl(0.07, 0.055, 0.1, 14), color, { x, y: y + 0.066 * s, z, s });
  if (stripe) b.add(G.cyl(0.068, 0.062, 0.035, 14), stripe, { x, y: y + 0.06 * s, z, s: [s * 1.03, s, s * 1.03] });
  b.add(G.cyl(0.06, 0.06, 0.01, 14), COFFEE, { x, y: y + 0.113 * s, z, s });
  b.add(G.torus(0.032, 0.011, 12), color, { x: x + 0.078 * s, y: y + 0.066 * s, z, s });
}

/** Shopping bag with rope handles and a cheetah band. s = size multiplier (1 = about 0.3 tall). */
function shoppingBag(k: Kit, x: number, y: number, z: number, s = 1, color: string = PALETTE.pink, band: CheetahKind = 'classic', ry = 0) {
  k.v.add(G.box(0.26, 0.3, 0.12), color, { x, y: y + 0.15 * s, z, s, ry });
  k.print(band).add(G.box(0.265, 0.09, 0.125), '#ffffff', { x, y: y + 0.2 * s, z, s, ry, uv: [0.26 * s / 0.7, 0.09 * s / 0.7] });
  const c = Math.cos(ry), sn = Math.sin(ry);
  for (const dz of [-0.045, 0.045]) k.v.add(G.torus(0.06, 0.012, 10, Math.PI), PALETTE.cocoa, { x: x + sn * dz * s, y: y + 0.3 * s, z: z + c * dz * s, s, ry });
  // little heart on the front
  for (const dx of [-0.022, 0.022]) k.v.add(G.ball(0.03, 8), '#ffffff', { x: x + (c * dx + sn * 0.062) * s, y: y + 0.09 * s, z: z + (-sn * dx + c * 0.062) * s, s: [s, s, s * 0.4], ry });
}

/** Dress on a form: flared skirt, bodice, neck knob. Print or plain. */
function dressForm(k: Kit, x: number, y: number, z: number, s: number, fill: string | CheetahKind, stand = true) {
  const print = fill === 'classic' || fill === 'pink';
  const b = print ? k.print(fill as CheetahKind) : k.v, col = print ? '#ffffff' : fill;
  if (stand) {
    k.v.add(G.cyl(0.16, 0.19, 0.05, 14), '#ffffff', { x, y: y + 0.025 * s, z, s });
    k.v.add(G.cyl(0.025, 0.025, 0.4, 8), PALETTE.gold, { x, y: y + 0.22 * s, z, s });
  }
  b.add(G.cyl(0.13, 0.36, 0.62, 16), col, { x, y: y + 0.66 * s, z, s, uv: [2.2, 0.8] });
  b.add(G.ball(0.17, 12), col, { x, y: y + 1.02 * s, z, s: [s, s * 1.05, s * 0.85], uv: [1.2, 0.6] });
  k.v.add(G.cyl(0.14, 0.14, 0.06, 14), '#ffffff', { x, y: y + 0.94 * s, z, s: [s * 1.02, s, s * 0.9] }); // sash
  k.v.add(G.cyl(0.05, 0.06, 0.1, 8), '#fff3ea', { x, y: y + 1.22 * s, z, s });
  k.v.add(G.ball(0.045, 8), PALETTE.gold, { x, y: y + 1.3 * s, z, s });
}

let chalkTex: THREE.CanvasTexture | null = null;
function chalkboardMaterial(): THREE.Material {
  if (!chalkTex) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 320;
    const g = c.getContext('2d')!;
    g.fillStyle = '#4d5f5a'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 40; i++) g.fillRect((i * 67) % 256, (i * 131) % 320, 60, 3); // chalk dust
    g.strokeStyle = '#fff7f0'; g.fillStyle = '#fff7f0'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.textAlign = 'center'; g.font = '600 46px Fredoka, ui-rounded, system-ui, sans-serif';
    g.fillText('today', 128, 60);
    // cup doodle
    g.beginPath(); g.moveTo(76, 110); g.lineTo(88, 190); g.lineTo(152, 190); g.lineTo(164, 110); g.closePath(); g.stroke();
    g.beginPath(); g.arc(172, 146, 22, -1.2, 1.3); g.stroke();
    g.beginPath(); g.moveTo(60, 206); g.lineTo(184, 206); g.stroke();
    g.strokeStyle = '#ffb3cf';
    for (const x of [100, 124, 148]) { g.beginPath(); g.moveTo(x, 96); g.bezierCurveTo(x - 10, 86, x + 10, 78, x, 68); g.stroke(); }
    g.fillStyle = '#ffb3cf'; g.font = '600 40px Fredoka, ui-rounded, system-ui, sans-serif';
    g.fillText('pink latte', 128, 262);
    g.fillStyle = '#ffd98a'; g.font = '600 30px Fredoka, ui-rounded, system-ui, sans-serif';
    g.fillText('♥ 3 ♥', 128, 300);
    chalkTex = new THREE.CanvasTexture(c);
    chalkTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = makeToon('#ffffff');
  m.map = chalkTex;
  return m;
}

/** A-frame chalkboard, leaning back so the high camera can read it. */
function chalkboard(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const b = new Batch();
  b.add(G.box(0.62, 0.86, 0.05), PALETTE.wood, { y: 0.45, z: 0, rx: -0.38 });
  b.add(G.box(0.62, 0.8, 0.04), '#c08d70', { y: 0.42, z: -0.3, rx: 0.3 });
  g.add(b.build());
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.72), chalkboardMaterial());
  face.position.set(0, 0.462, 0.03); // just proud of the board's front face
  face.rotation.x = -0.38;
  face.receiveShadow = true;
  g.add(face);
  return g;
}

/** Pedestal poking out of the front roof slope, to carry a big 3D shop sign. Returns the y of its top. */
function roofPedestal(b: Batch, wallH: number, color: string, x: number, z = 1.85): number {
  const top = wallH + 0.6; // kept low so the sign stays in frame from the default follow camera
  b.add(G.box(1.5, 0.8, 1.0), color, { x, y: top - 0.4, z });
  b.add(G.box(1.66, 0.1, 1.16), '#ffffff', { x, y: top, z });
  return top + 0.05;
}

/** World-space points where coffee steam rises (filled while structures are built; read by particles.ts). */
export const steamVents: { x: number; y: number; z: number; big: boolean }[] = [];

export function createBuilding(b: Building): THREE.Group {
  const st = STYLE[b.id];
  const g = new THREE.Group();
  const k = new Kit();
  const w = b.x1 - b.x0 + 1, d = b.y1 - b.y0 + 1, wallH = b.id === 'house' ? 2.2 : 2.6;
  const cx = b.x0 + w / 2, cz = b.y0 + d / 2, base = tileHeight(b.x0, b.y1);
  g.position.set(cx, base, cz);
  const W = w - 0.3, D = d - 0.3, front = D / 2 + 0.02;
  const roofW = w + 0.6, roofD = d + 0.5;

  // shell: walls, plinth, corner posts, roof with white piping
  k.v.add(G.box(W, wallH, D), st.wall, { y: wallH / 2 });
  k.v.add(G.box(W + 0.1, 0.36, D + 0.1), st.base, { y: 0.18 });
  for (const sx of [-1, 1]) k.v.add(G.box(0.22, wallH, 0.22), '#ffffff', { x: sx * (W / 2 - 0.05), y: wallH / 2, z: D / 2 - 0.05 });
  k.v.add(roofGeo(roofW, roofD, ROOF_H), st.roof, { y: wallH });
  k.v.add(G.cyl(0.11, 0.11, roofW + 0.1, 10), st.ridge, { y: wallH + ROOF_H, rz: Math.PI / 2 });
  k.v.add(G.cyl(0.09, 0.09, roofW + 0.06, 10), st.ridge, { y: wallH + 0.03, z: roofD / 2, rz: Math.PI / 2 });
  // rows of rounded shingle bumps on the front slope
  const slope = Math.atan2(ROOF_H, roofD / 2);
  for (let r = 1; r <= 3; r++) {
    const s = (r / 4) * Math.hypot(ROOF_H, roofD / 2);
    k.v.add(G.cyl(0.05, 0.05, roofW - 0.1, 8), '#ffffff', { y: wallH + s * Math.sin(slope) + 0.02, z: roofD / 2 - s * Math.cos(slope), rz: Math.PI / 2, s: [1, 1, 0.6] });
  }

  g.add(contactShadow(w + 0.9, d + 0.9, 'rect', 0.3));
  // warm window light spilling onto the ground in front at night
  { const pool = lightPool(w * 0.9, 2.4, PALETTE.windowGlow, 0.28, 'rect'); pool.position.set(0, 0.12, front + 1.1); g.add(pool); }

  if (b.id === 'cafe') {
    // big warm windows with flower boxes and short striped awnings tucked under the eave
    for (const wx of [-2.3, 2.3]) {
      windowAt(k, wx, 1.08, front, 1.4, 1.05);
      flowerBox(k.v, wx, 0.36, front + 0.16, 1.5);
      stripedAwning(k.v, wx, 2.28, front + 0.27, 1.9, 0.6, PALETTE.pink, '#ffffff');
    }
    // door: cocoa-rose with a round glowing window
    k.v.add(G.box(1.1, 1.82, 0.08), '#ffffff', { y: 0.91, z: front });
    k.v.add(G.box(0.92, 1.7, 0.08), '#e58aa6', { y: 0.85, z: front + 0.03 });
    k.glow.add(G.cyl(0.24, 0.24, 0.05, 18), GLASS, { y: 1.25, z: front + 0.07, rx: Math.PI / 2 });
    k.v.add(G.torus(0.25, 0.03, 20), '#ffffff', { y: 1.25, z: front + 0.08 });
    k.v.add(G.ball(0.05, 8), PALETTE.gold, { x: 0.32, y: 0.85, z: front + 0.1 });
    k.v.add(G.box(1.3, 0.1, 0.4), '#ffffff', { y: 0.05, z: front + 0.2 });
    // chimney
    k.v.add(G.box(0.5, 1.1, 0.5), '#ffe1d2', { x: -2.6, y: wallH + 1.25, z: -0.6 });
    k.v.add(G.box(0.62, 0.14, 0.62), '#ffffff', { x: -2.6, y: wallH + 1.84, z: -0.6 });
    // giant coffee cup sign on the roof, with steam
    const sx = -2.35, sz = 1.85, top = roofPedestal(k.v, wallH, '#ffe1d2', sx, sz);
    mug(k.v, sx - 0.06, top, sz, 6, '#ffffff', PALETTE.pink);
    // latte-art heart
    for (const dx of [-0.07, 0.07]) k.v.add(G.ball(0.1, 10), '#fff4e6', { x: sx - 0.06 + dx, y: top + 0.69, z: sz - 0.03, s: [1, 0.12, 1] });
    k.v.add(G.cone(0.16, 0.2, 3), '#fff4e6', { x: sx - 0.06, y: top + 0.69, z: sz + 0.09, rx: Math.PI / 2, s: [1, 1, 0.1] });
    // steam is animated by particles.ts
    steamVents.push({ x: cx + sx - 0.06, y: base + top + 0.72, z: cz + sz, big: true });
  } else if (b.id === 'boutique') {
    // display bays: glowing backdrop, ledge, dresses on forms, cheetah awning
    const looks: [string | CheetahKind, string | CheetahKind][] = [['classic', '#ff8fb6'], ['pink', '#ffffff']];
    [-2.3, 2.3].forEach((wx, i) => {
      k.v.add(G.box(1.86, 1.62, 0.1), '#ffffff', { x: wx, y: 1.13, z: front });
      k.glow.add(G.box(1.66, 1.42, 0.06), GLASS, { x: wx, y: 1.15, z: front + 0.04 });
      k.v.add(G.box(1.96, 0.12, 0.5), PALETTE.pink, { x: wx, y: 0.38, z: front + 0.22 });
      k.v.add(G.box(1.9, 0.38, 0.44), '#ffd6e7', { x: wx, y: 0.19, z: front + 0.2 });
      for (const sx of [-1, 1]) k.v.add(G.box(0.08, 1.5, 0.08), '#ffffff', { x: wx + sx * 0.92, y: 1.15, z: front + 0.42 });
      dressForm(k, wx - 0.42, 0.44, front + 0.24, 0.82, looks[i][0], false);
      dressForm(k, wx + 0.42, 0.44, front + 0.24, 0.82, looks[i][1], false);
      // sunhat / bow accents on the forms
      k.v.add(G.cyl(0.2, 0.22, 0.03, 14), '#fff4dc', { x: wx + 0.42, y: 1.56, z: front + 0.24 });
      k.v.add(G.ball(0.1, 10), '#fff4dc', { x: wx + 0.42, y: 1.59, z: front + 0.24, s: [1, 0.7, 1] });
      for (const sx of [-1, 1]) k.v.add(G.ball(0.07, 8), PALETTE.rose, { x: wx - 0.42 + sx * 0.07, y: 1.55, z: front + 0.26, s: [1, 0.8, 0.5] });
      cheetahAwning(k, 'classic', wx, 2.28, front + 0.27, 2.1, 0.6);
    });
    // pink door with a heart window under a little pink-cheetah canopy
    k.v.add(G.box(1.14, 1.84, 0.08), '#ffffff', { y: 0.92, z: front });
    k.v.add(G.box(0.94, 1.72, 0.08), '#ff7fae', { y: 0.86, z: front + 0.03 });
    k.v.add(G.cyl(0.47, 0.47, 0.08, 18), '#ff7fae', { y: 1.72, z: front + 0.03, rx: Math.PI / 2, s: [1, 1, 0.55] });
    for (const dx of [-0.075, 0.075]) k.glow.add(G.ball(0.11, 10), GLASS, { x: dx, y: 1.32, z: front + 0.07, s: [1, 1, 0.25] });
    k.glow.add(G.cone(0.17, 0.2, 3), GLASS, { y: 1.19, z: front + 0.07, rz: Math.PI, s: [1, 1, 0.15] });
    k.v.add(G.ball(0.055, 8), PALETTE.gold, { x: 0.33, y: 0.86, z: front + 0.1 });
    k.v.add(G.box(1.3, 0.1, 0.4), '#ffffff', { y: 0.05, z: front + 0.2 });
    cheetahAwning(k, 'pink', 0, 2.3, front + 0.25, 1.4, 0.55);
    // cheetah-print trim: a wide band along the bottom of the front roof slope and along the ridge
    const s = 0.42;
    k.classic.add(G.box(roofW + 0.02, 0.05, 0.7), '#ffffff', { y: wallH + s * Math.sin(slope) + 0.04, z: roofD / 2 - s * Math.cos(slope) + 0.02, rx: slope, uv: [roofW / 0.9, 0.78] });
    k.classic.add(G.box(roofW + 0.04, 0.3, 0.5), '#ffffff', { y: wallH + ROOF_H - 0.08, uv: [roofW / 0.9, 0.5] });
    // giant shopping-bag sign on the roof
    const top = roofPedestal(k.v, wallH, '#ffd6e7', 2.35);
    shoppingBag(k, 2.15, top, 1.8, 3, PALETTE.rose, 'classic', 0.12);
    shoppingBag(k, 2.78, top, 1.95, 1.9, '#ffffff', 'pink', -0.3);
  } else {
    for (const wx of [-w / 2 + 1.3, w / 2 - 1.3]) { windowAt(k, wx, wallH * 0.55, front, 1.0, 0.85); flowerBox(k.v, wx, wallH * 0.55 - 0.66, front + 0.16, 1.1); }
    k.v.add(G.box(1.06, 1.6, 0.08), '#ffffff', { y: 0.8, z: front });
    k.v.add(G.box(0.88, 1.5, 0.08), PALETTE.pink, { y: 0.75, z: front + 0.03 });
    k.v.add(G.ball(0.05, 8), PALETTE.gold, { x: 0.3, y: 0.75, z: front + 0.1 });
    k.v.add(G.box(0.5, 1.2, 0.5), '#ffc3da', { x: w / 2 - 0.9, y: wallH + 1.2 });
    k.v.add(G.box(0.62, 0.14, 0.62), '#ffffff', { x: w / 2 - 0.9, y: wallH + 1.84 });
  }
  k.into(g);

  const label = makeLabel(st.name, 3.2);
  label.position.set(0, wallH + 0.7, front + 0.5);
  label.rotation.x = -0.25;
  g.add(label);
  return g;
}

/** Interactive stations. Each carries userData.stationId for picking. */
export function createStation(s: Station): THREE.Group {
  const g = new THREE.Group();
  g.userData.stationId = s.id;
  const base = tileHeight(s.x, s.y);
  const cx = s.x + s.w / 2, cz = s.y + 0.5;
  g.position.set(cx, base, cz);
  const k = new Kit();
  switch (s.id) {
    case 'cafe': {
      // espresso bar: striped counter, machine, cake dome, mugs, awning on posts
      k.v.add(G.box(2.4, 0.8, 0.8), '#f6c3ad', { y: 0.4 });
      for (let i = 0; i < 8; i++) k.v.add(G.box(0.15, 0.62, 0.03), i % 2 ? '#ffffff' : PALETTE.pink, { x: -1.05 + i * 0.3, y: 0.42, z: 0.405 });
      k.v.add(G.box(2.56, 0.1, 0.94), '#fff7ee', { y: 0.85 });
      // espresso machine
      k.v.add(G.box(0.62, 0.42, 0.44), PALETTE.rose, { x: -0.72, y: 1.11, z: -0.12 });
      k.v.add(G.box(0.66, 0.06, 0.48), '#ffffff', { x: -0.72, y: 1.35, z: -0.12 });
      k.v.add(G.box(0.5, 0.05, 0.2), '#ffffff', { x: -0.72, y: 0.93, z: 0.16 });
      for (const dx of [-0.14, 0.14]) k.v.add(G.cyl(0.04, 0.05, 0.09, 8), PALETTE.gold, { x: -0.72 + dx, y: 1.1, z: 0.14 });
      mug(k.v, -0.86, 0.955, 0.17, 0.75);
      steamVents.push({ x: cx - 0.86, y: base + 1.05, z: cz + 0.17, big: false });
      for (const dx of [-0.16, 0, 0.16]) k.v.add(G.cyl(0.055, 0.045, 0.08, 10), dx ? '#ffffff' : PALETTE.blush, { x: -0.72 + dx, y: 1.42, z: -0.12 });
      // cake under a dome plate
      k.v.add(G.cyl(0.05, 0.1, 0.1, 10), '#ffffff', { x: 0.75, y: 0.95, z: -0.05 });
      k.v.add(G.cyl(0.24, 0.24, 0.03, 16), '#ffffff', { x: 0.75, y: 1.01, z: -0.05 });
      k.v.add(G.cyl(0.18, 0.18, 0.14, 16), '#ffb3cf', { x: 0.75, y: 1.09, z: -0.05 });
      k.v.add(G.cyl(0.185, 0.185, 0.04, 16), '#fff7ee', { x: 0.75, y: 1.17, z: -0.05 });
      k.v.add(G.ball(0.045, 8), '#ff5c8a', { x: 0.75, y: 1.22, z: -0.05 });
      mug(k.v, 0.05, 0.9, 0.12, 1.15, '#ffffff', PALETTE.pink);
      mug(k.v, 0.36, 0.9, 0.22, 1.0, PALETTE.blush);
      for (const x of [-1.2, 1.2]) k.v.add(G.cyl(0.04, 0.05, 2.0, 8), '#ffffff', { x, y: 1.0, z: -0.38 });
      stripedAwning(k.v, 0, 2.02, -0.08, 2.8, 0.8, PALETTE.pink, '#ffffff', 0.4);
      const l = makeLabel('Café', 1.5); l.position.set(0, 2.55, 0.35); g.add(l);
      g.add(contactShadow(3, 1.5, 'rect', 0.22));
      g.add(chalkboard(1.78, 0.25));
      break;
    }
    case 'boutique': {
      // clothes rail with little dresses, hat stand, stacked shopping bags
      k.v.add(G.box(2.0, 0.1, 0.8), '#ffd6e7', { y: 0.05 });
      for (const x of [-0.8, 0.8]) k.v.add(G.cyl(0.03, 0.03, 1.45, 8), PALETTE.gold, { x, y: 0.8, z: -0.1 });
      k.v.add(G.cyl(0.03, 0.03, 1.7, 8), PALETTE.gold, { y: 1.5, z: -0.1, rz: Math.PI / 2 });
      for (const x of [-0.8, 0.8]) k.v.add(G.ball(0.06, 8), PALETTE.gold, { x, y: 1.55, z: -0.1 });
      const rail: (string | CheetahKind)[] = ['pink', '#ffffff', 'classic', '#ff8fb6', 'pink'];
      rail.forEach((f, i) => {
        const x = -0.58 + i * 0.29, print = f === 'classic' || f === 'pink';
        const bt = print ? k.print(f as CheetahKind) : k.v, col = print ? '#ffffff' : f;
        k.v.add(G.torus(0.04, 0.01, 8, Math.PI), '#ffffff', { x, y: 1.5, z: -0.1, ry: Math.PI / 2 });
        bt.add(G.cyl(0.05, 0.2, 0.5, 12), col, { x, y: 1.15, z: -0.1, s: [0.55, 1, 1], uv: [1.2, 0.6] });
        bt.add(G.ball(0.09, 8), col, { x, y: 1.38, z: -0.1, s: [0.55, 0.8, 1.3], uv: [0.6, 0.3] });
      });
      shoppingBag(k, -0.55, 0.1, 0.24, 1.5, PALETTE.rose, 'classic', 0.2);
      shoppingBag(k, -0.1, 0.1, 0.28, 1.15, '#ffffff', 'pink', -0.25);
      shoppingBag(k, 0.5, 0.1, 0.22, 1.3, PALETTE.blush, 'classic', 0.1);
      const l = makeLabel('Boutique', 2.0); l.position.set(0, 2.25, 0.35); g.add(l);
      g.add(contactShadow(2.6, 1.4, 'rect', 0.22));
      break;
    }
    case 'crafting': {
      // Crafting Table: a chunky pink wooden worktable with a pale top, shelf, and little craft supplies
      const WOOD = '#f4a9c4', WOOD_D = '#e58aae', TOP = '#ffd9e6';
      for (const x of [-0.62, 0.62]) for (const z of [-0.3, 0.3]) k.v.add(G.box(0.14, 0.8, 0.14), WOOD_D, { x, y: 0.4, z });
      k.v.add(G.box(1.5, 0.08, 0.1), WOOD, { y: 0.34, z: 0.3 });
      k.v.add(G.box(1.5, 0.08, 0.1), WOOD, { y: 0.34, z: -0.3 });
      k.v.add(G.box(1.46, 0.05, 0.56), WOOD, { y: 0.28 });
      k.v.add(G.box(1.64, 0.12, 0.82), TOP, { y: 0.86 });
      k.v.add(G.box(1.68, 0.05, 0.86), '#ffffff', { y: 0.8 });
      // pegboard back with hanging tools
      k.v.add(G.box(1.5, 0.7, 0.05), WOOD, { y: 1.3, z: -0.36 });
      k.v.add(G.box(0.05, 0.76, 0.07), WOOD_D, { x: -0.76, y: 1.3, z: -0.36 });
      k.v.add(G.box(0.05, 0.76, 0.07), WOOD_D, { x: 0.76, y: 1.3, z: -0.36 });
      for (const [x, y] of [[-0.45, 1.4], [0, 1.3], [0.45, 1.45]]) k.v.add(G.ball(0.03, 8), PALETTE.gold, { x, y, z: -0.32 });
      k.v.add(G.box(0.05, 0.3, 0.03), PALETTE.cocoa, { x: -0.45, y: 1.22, z: -0.32 }); // hammer handle
      k.v.add(G.box(0.2, 0.1, 0.06), '#d8d0dc', { x: -0.45, y: 1.4, z: -0.32 });
      k.v.add(G.torus(0.09, 0.016, 10), PALETTE.gold, { x: 0.45, y: 1.28, z: -0.32 }); // scissor loop
      k.v.add(G.box(0.03, 0.26, 0.02), '#d8d0dc', { x: 0, y: 1.14, z: -0.32 });
      // on the table: thread spools, a bow in progress, a plank stack, a tiny heart pincushion
      k.v.add(G.cyl(0.07, 0.07, 0.14, 10), '#ffffff', { x: -0.55, y: 0.99, z: 0.1 });
      k.v.add(G.cyl(0.075, 0.075, 0.07, 10), '#ff8fb6', { x: -0.55, y: 0.99, z: 0.1 });
      k.v.add(G.cyl(0.06, 0.06, 0.12, 10), '#ffffff', { x: -0.38, y: 0.98, z: 0.2 });
      k.v.add(G.cyl(0.065, 0.065, 0.06, 10), PALETTE.blush, { x: -0.38, y: 0.98, z: 0.2 });
      for (const dx of [-0.1, 0.1]) k.v.add(G.ball(0.085, 10), '#ff8fb6', { x: 0.05 + dx, y: 0.97, z: 0.12, s: [1, 0.8, 0.6] });
      k.v.add(G.ball(0.045, 8), '#ffffff', { x: 0.05, y: 0.97, z: 0.12 });
      for (let i = 0; i < 3; i++) k.v.add(G.box(0.4, 0.045, 0.16), i % 2 ? '#e8c39a' : '#dcae80', { x: 0.55, y: 0.95 + i * 0.048, z: 0.08, ry: i * 0.12 });
      k.v.add(G.ball(0.07, 8), '#ff5c8a', { x: 0.2, y: 0.96, z: -0.15, s: [1, 0.7, 1] });
      const l = makeLabel('Crafting Table', 2.2); l.position.set(0, 1.95, 0.2); g.add(l);
      g.add(contactShadow(2.0, 1.2, 'rect', 0.22));
      break;
    }
    case 'market': {
      const w = s.w;
      k.v.add(G.box(w - 0.2, 0.7, 0.8), '#f7d5b8', { y: 0.45 });
      for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) {
        k.v.add(G.cyl(0.3, 0.3, 0.08, 16), PALETTE.wood, { x, y: 0.3, z: 0.45, rx: Math.PI / 2 });
        k.v.add(G.box(0.08, 1.9, 0.08), PALETTE.wood, { x, y: 1.0, z: -0.35 });
      }
      stripedAwning(k.v, 0, 1.98, -0.05, w + 0.3, 0.8, '#c3e8d6', '#ffffff', 0.4);
      k.v.add(G.ball(0.17), '#ff8fb6', { x: -0.5, y: 0.95 }).add(G.ball(0.17), '#ff8fb6', { x: -0.1, y: 0.95 }).add(G.ball(0.17), '#ffffff', { x: 0.4, y: 0.95 });
      const l = makeLabel('Tuppence Cart', 2.2); l.position.set(0, 2.5, 0.4); g.add(l);
      break;
    }
    case 'chest': {
      // Softkeep Chest: a plump wooden chest with a pink lid, gold clasp and a little bow
      k.v.add(G.box(0.9, 0.45, 0.6), '#d9a77a', { y: 0.225 });
      k.v.add(G.box(0.94, 0.08, 0.64), PALETTE.gold, { y: 0.14 });
      k.v.add(G.cyl(0.3, 0.3, 0.94, 14), '#ffb3cf', { y: 0.5, rz: Math.PI / 2, s: [1, 1, 1.0] });
      k.v.add(G.box(0.14, 0.16, 0.05), PALETTE.gold, { y: 0.46, z: 0.32 });
      k.v.add(G.ball(0.07, 8), '#ffffff', { x: -0.06, y: 0.82, z: 0.0 }).add(G.ball(0.07, 8), '#ffffff', { x: 0.06, y: 0.82, z: 0.0 });
      k.v.add(G.ball(0.05, 8), '#ff8fb6', { y: 0.81, z: 0.0 });
      const l = makeLabel('Softkeep Chest', 1.9); l.position.set(0, 1.55, 0.2); g.add(l);
      g.add(contactShadow(1.5, 1.0, 'rect', 0.22));
      break;
    }
    case 'wardrobe': {
      // Home wardrobe: a tall pink cabinet with two doors, gold knobs, a heart and a bow on top
      k.v.add(G.box(1.2, 1.7, 0.6), '#ffd0e0', { y: 0.85 });
      k.v.add(G.box(1.28, 0.1, 0.66), '#fff4f8', { y: 1.72 });
      for (const sx of [-1, 1]) {
        k.v.add(G.box(0.5, 1.4, 0.04), '#ffe3ee', { x: sx * 0.29, y: 0.85, z: 0.31 });
        k.v.add(G.ball(0.045, 8), PALETTE.gold, { x: sx * 0.08, y: 0.85, z: 0.35 });
        k.v.add(G.ball(0.1, 10), '#ff8fb6', { x: sx * 0.12, y: 1.9, s: [1.1, 0.8, 0.5], rz: sx * 0.3 });
      }
      k.v.add(G.ball(0.06, 8), '#ffffff', { y: 1.9 });
      k.v.add(G.ball(0.06, 8), '#ff7fa9', { x: -0.03, y: 1.2, z: 0.34 }).add(G.ball(0.06, 8), '#ff7fa9', { x: 0.03, y: 1.2, z: 0.34 });
      for (const x of [-0.5, 0.5]) k.v.add(G.ball(0.07, 8), '#fff4f8', { x, y: 0.05 });
      const l = makeLabel('Wardrobe', 1.6); l.position.set(0, 2.45, 0.3); g.add(l);
      g.add(contactShadow(1.7, 1.0, 'rect', 0.22));
      break;
    }
    case 'petbed': {
      // Pet Nook: a woven basket with a pink cushion, a little heart pillow and a ball of yarn
      k.v.add(G.cyl(0.58, 0.5, 0.26, 20), '#e8c79a', { y: 0.13 });
      k.v.add(G.torus(0.56, 0.07, 22), '#f6dfb8', { y: 0.27, rx: Math.PI / 2 });
      k.v.add(G.cyl(0.48, 0.48, 0.07, 20), '#ffc3d6', { y: 0.22 });
      for (const sx of [-1, 1]) k.v.add(G.ball(0.1, 10), '#ff8fb6', { x: sx * 0.07 - 0.2, y: 0.34, z: -0.12, s: [1, 1, 0.55] });
      k.v.add(G.ball(0.11, 10), '#ff8fb6', { x: -0.2, y: 0.28, z: -0.12, s: [1.3, 1, 0.55] });
      k.v.add(G.ball(0.13, 12), '#fff3a8', { x: 0.72, y: 0.13, z: 0.3 });
      k.v.add(G.torus(0.1, 0.012, 14), '#f0b24f', { x: 0.72, y: 0.14, z: 0.3, rx: Math.PI / 2, ry: 0.4 });
      const l = makeLabel('Pet Nook', 1.4); l.position.set(0, 1.05, 0.2); g.add(l);
      g.add(contactShadow(1.5, 1.4, 'round', 0.22));
      break;
    }
    case 'grove': {
      k.v.add(G.cyl(0.8, 0.9, 0.5), '#e8dcf5', { y: 0.25 });
      k.v.add(G.cyl(0.45, 0.55, 0.6), '#f3ecff', { y: 0.8 });
      g.add(ball(0.32, mat('#fff3a8', PALETTE.lampGlow, 'lamp'), 0, 1.4, 0));
      { const pool = lightPool(5, 5, '#ffd0e0', 0.3); pool.position.y = 0.06; g.add(pool); }
      { const l = makeLabel('Afterglow Grove', 2.6); l.position.set(0, 2.3, 0.5); g.add(l); }
      break;
    }
  }
  k.into(g);
  g.traverse((o) => { o.userData.stationId = s.id; });
  return g;
}

export function createProp(p: Prop): THREE.Group | null {
  const g = new THREE.Group();
  g.position.set(p.x + 0.5, tileHeight(p.x, p.y), p.y + 0.5);
  const k = new Kit();
  switch (p.type) {
    case 'fence':
      if (p.v === 1) g.rotation.y = Math.PI / 2; // runs north-south (a border fence)
      k.v.add(G.box(1, 0.1, 0.1), '#ffc3da', { y: 0.45 });
      for (const x of [-0.4, -0.13, 0.13, 0.4]) { k.v.add(G.box(0.12, 0.7, 0.12), '#ffffff', { x, y: 0.35 }); k.v.add(G.ball(0.08, 8), '#ffffff', { x, y: 0.72 }); }
      break;
    case 'table':
      // café table: lace-edged top, two mugs, a bud vase and a pair of stools
      k.v.add(G.cyl(0.2, 0.26, 0.05, 14), '#ffffff', { y: 0.025 });
      k.v.add(G.cyl(0.05, 0.05, 0.6, 8), '#ffffff', { y: 0.3 });
      k.v.add(G.cyl(0.46, 0.46, 0.05, 20), '#ffd0e2', { y: 0.63 });
      k.v.add(G.torus(0.46, 0.035, 22), '#ffffff', { y: 0.63, rx: Math.PI / 2 });
      mug(k.v, -0.2, 0.655, 0.1, 1.25, '#ffffff', PALETTE.pink);
      mug(k.v, 0.17, 0.655, -0.14, 1.25, PALETTE.blush);
      k.v.add(G.cyl(0.035, 0.05, 0.12, 8), '#aee2f5', { x: 0.05, y: 0.715, z: 0.2 });
      k.v.add(G.ball(0.06, 8), PALETTE.rose, { x: 0.05, y: 0.83, z: 0.2 });
      for (const sx of [-1, 1]) {
        // stools tucked in so they stay inside the table's (blocked) tile
        k.v.add(G.cyl(0.035, 0.035, 0.36, 8), '#ffffff', { x: sx * 0.52, y: 0.18, z: 0.22 });
        k.v.add(G.cyl(0.16, 0.16, 0.09, 14), sx > 0 ? PALETTE.pink : '#ffffff', { x: sx * 0.52, y: 0.4, z: 0.22 });
      }
      k.pink.add(G.cyl(0.14, 0.14, 0.04, 14), '#ffffff', { x: -0.52, y: 0.46, z: 0.22, uv: [1.2, 0.4] }); // cheetah cushion
      g.add(contactShadow(1.5, 1.1));
      break;
    case 'mannequin': {
      // boutique dress form on a pedestal, wearing the print
      k.v.add(G.cyl(0.34, 0.38, 0.14, 18), '#ffffff', { y: 0.07 });
      k.v.add(G.cyl(0.3, 0.3, 0.03, 18), PALETTE.pink, { y: 0.15 });
      dressForm(k, 0, 0.14, 0, 1, p.v ? 'pink' : 'classic');
      if (p.v) {
        for (const sx of [-1, 1]) k.v.add(G.ball(0.09, 8), PALETTE.rose, { x: sx * 0.085, y: 1.52, z: 0.02, s: [1, 0.8, 0.5] });
      } else {
        k.v.add(G.cyl(0.3, 0.32, 0.03, 16), '#fff4dc', { y: 1.47, rx: -0.15 });
        k.v.add(G.ball(0.14, 10), '#fff4dc', { y: 1.5, s: [1, 0.7, 1] });
        k.v.add(G.cyl(0.145, 0.15, 0.05, 14), PALETTE.rose, { y: 1.5 });
      }
      g.add(contactShadow(1.0));
      break;
    }
    case 'fountain':
      k.v.add(G.cyl(1.0, 1.1, 0.4, 24), '#ffe0ec', { y: 0.2 });
      k.v.add(G.cyl(0.85, 0.85, 0.06, 24), '#cfeefe', { y: 0.4 });
      k.v.add(G.cyl(0.15, 0.2, 0.9), '#ffd0e2', { y: 0.7 });
      k.v.add(G.ball(0.2), '#ffd36e', { y: 1.25 });
      g.add(contactShadow(2.8));
      g.userData.fountain = true;
      break;
    case 'lamp':
      k.v.add(G.cyl(0.05, 0.06, 1.5), PALETTE.wood, { y: 0.75 });
      { const bulb = ball(0.2, mat('#fff3c4', PALETTE.lampGlow, 'lamp'), 0, 1.6, 0); bulb.castShadow = false; g.add(bulb); }
      g.add(contactShadow(0.6));
      break;
    case 'sign': {
      k.v.add(G.box(0.08, 0.7, 0.08), PALETTE.wood, { y: 0.35 });
      const l = makeLabel(p.text ?? '', 1.5); l.position.set(0, 0.95, 0.05); g.add(l);
      break;
    }
    case 'lighthouse': {
      // The Hush Bell lighthouse: a plump pink-and-cream tower, a gold gallery, a glowing lantern room and a tiny bell on top.
      k.v.add(G.cyl(1.35, 1.5, 0.5, 20), '#f3e4ee', { y: 0.25 });
      k.v.add(G.cyl(1.15, 1.3, 0.3, 20), '#ffd0e2', { y: 0.62 });
      const bands = ['#ffffff', '#ffc3da', '#ffffff', '#ffc3da', '#ffffff'];
      bands.forEach((c, i) => k.v.add(G.cyl(0.95 - i * 0.07, 1.05 - i * 0.07, 0.8, 20), c, { y: 1.25 + i * 0.8 }));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; k.v.add(G.ball(0.1, 8), '#ff8fb6', { x: Math.cos(a) * 0.62, y: 2.2 + (i % 2) * 1.2, z: Math.sin(a) * 0.62 + 0.4, s: [1, 1, 0.3] }); }
      k.v.add(G.cyl(0.9, 0.7, 0.18, 20), PALETTE.gold, { y: 5.35 });
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.v.add(G.cyl(0.03, 0.03, 0.34, 6), '#ffffff', { x: Math.cos(a) * 0.84, y: 5.62, z: Math.sin(a) * 0.84 }); }
      k.v.add(G.torus(0.84, 0.03, 24), '#ffffff', { y: 5.8, rx: Math.PI / 2 });
      k.v.add(G.cyl(0.5, 0.55, 0.12, 16), '#f3e4ee', { y: 5.5 });
      k.v.add(G.cone(0.72, 0.8, 18), '#ff9ec0', { y: 6.75 });
      k.v.add(G.ball(0.12, 8), PALETTE.gold, { y: 7.22 });
      k.v.add(G.cyl(0.04, 0.04, 0.3, 6), PALETTE.wood, { y: 7.1 });
      // door with a heart window
      k.v.add(G.box(0.46, 0.7, 0.1), '#c9a8e8', { y: 0.95, z: 1.33, s: 1 }).add(G.ball(0.07, 8), '#fff3a8', { x: -0.03, y: 1.12, z: 1.4 }).add(G.ball(0.07, 8), '#fff3a8', { x: 0.03, y: 1.12, z: 1.4 });
      const lantern = ball(0.4, mat('#fff3c4', PALETTE.lampGlow, 'lamp'), 0, 5.85, 0);
      lantern.castShadow = false;
      lantern.scale.set(1, 1.1, 1);
      g.add(lantern);
      { const pool = lightPool(6, 6, '#ffe6b0', 0.28); pool.position.y = 0.1; g.add(pool); }
      { const l = makeLabel('Hush Bell Lighthouse', 3.2); l.position.set(0, 8.0, 0.6); g.add(l); }
      g.add(contactShadow(3.4, 3.4, 'round', 0.24));
      break;
    }
    case 'picnic': {
      // Brioche's picnic: a checkered blanket, a basket of pastries, a teapot and a cheetah cushion
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) k.v.add(G.box(0.4, 0.025, 0.4), (i + j) % 2 ? '#ffffff' : '#ffb3cf', { x: -1.0 + i * 0.4 + 0.2, y: 0.013, z: -0.6 + j * 0.4 + 0.2 });
      k.v.add(G.cyl(0.26, 0.22, 0.2, 14), '#e0b27c', { x: -0.55, y: 0.13, z: -0.1 });
      k.v.add(G.torus(0.25, 0.025, 16, Math.PI), '#c8955f', { x: -0.55, y: 0.24, z: -0.1, ry: 0.4 });
      for (const [x, z, c] of [[-0.62, -0.08, '#f2b765'], [-0.5, -0.14, '#f7c98c'], [-0.52, -0.02, '#e49c5a']] as [number, number, string][]) k.v.add(G.ball(0.08, 8), c, { x, y: 0.27, z, s: [1.3, 0.8, 0.9] });
      k.v.add(G.ball(0.15, 12), '#ffffff', { x: 0.35, y: 0.18, z: 0.1, s: [1, 0.85, 1] });
      k.v.add(G.cyl(0.07, 0.1, 0.1, 10), '#ffffff', { x: 0.35, y: 0.33, z: 0.1 });
      k.v.add(G.ball(0.04, 8), '#ff8fb6', { x: 0.35, y: 0.4, z: 0.1 });
      k.v.add(G.cyl(0.02, 0.02, 0.14, 6), '#ffffff', { x: 0.5, y: 0.2, z: 0.1, rz: 1 });
      k.pink.add(G.cyl(0.2, 0.2, 0.1, 14), '#ffffff', { x: 0.7, y: 0.07, z: -0.3, uv: [1.2, 0.4] });
      k.v.add(G.cyl(0.04, 0.04, 1.3, 6), PALETTE.wood, { x: 1.15, y: 0.65, z: -0.6 });
      for (let i = 0; i < 6; i++) k.v.add(new THREE.ConeGeometry(0.65, 0.3, 3, 1, true, (i / 6) * Math.PI * 2, Math.PI / 3), i % 2 ? '#ffb3cf' : '#ffffff', { x: 1.15, y: 1.4, z: -0.6 });
      g.add(contactShadow(2.4, 1.8, 'rect', 0.16));
      break;
    }
    case 'easel': {
      // Oolie's pressed-flower easel: a wooden A-frame holding a framed pressed bloom
      for (const sx of [-1, 1]) k.v.add(G.cyl(0.03, 0.03, 1.2, 6), PALETTE.wood, { x: sx * 0.3, y: 0.6, z: 0.0, rz: -sx * 0.18 });
      k.v.add(G.cyl(0.03, 0.03, 1.1, 6), PALETTE.wood, { y: 0.55, z: -0.32, rx: 0.3 });
      k.v.add(G.box(0.62, 0.62, 0.05), '#fff4e6', { y: 0.82, z: 0.04 });
      k.v.add(G.box(0.7, 0.07, 0.07), '#e6d4ff', { y: 1.17, z: 0.05 }).add(G.box(0.7, 0.07, 0.07), '#e6d4ff', { y: 0.47, z: 0.05 });
      k.v.add(G.box(0.07, 0.7, 0.07), '#e6d4ff', { x: -0.35, y: 0.82, z: 0.05 }).add(G.box(0.07, 0.7, 0.07), '#e6d4ff', { x: 0.35, y: 0.82, z: 0.05 });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; k.v.add(G.ball(0.09, 8), i % 2 ? '#ff9ec0' : '#ffc9dc', { x: Math.cos(a) * 0.12, y: 0.86 + Math.sin(a) * 0.12, z: 0.08, s: [1, 1, 0.3] }); }
      k.v.add(G.ball(0.06, 8), '#fff3a8', { y: 0.86, z: 0.1, s: [1, 1, 0.4] });
      k.v.add(G.cyl(0.01, 0.01, 0.35, 5), '#7fcf8e', { y: 0.62, z: 0.08 });
      g.add(contactShadow(1.0, 1.0));
      break;
    }
    case 'cakestand': {
      // Tuppi's cake stand: two pink tiers with swirls of frosting and a cherry
      k.v.add(G.cyl(0.38, 0.42, 0.06, 18), '#ffffff', { y: 0.03 });
      k.v.add(G.cyl(0.05, 0.05, 0.5, 8), '#ffffff', { y: 0.31 });
      k.v.add(G.cyl(0.4, 0.4, 0.05, 18), '#ffffff', { y: 0.58 });
      k.v.add(G.cyl(0.32, 0.32, 0.22, 18), '#ffc9dc', { y: 0.72 });
      k.v.add(G.cyl(0.33, 0.33, 0.04, 18), '#ffffff', { y: 0.84 });
      k.v.add(G.cyl(0.22, 0.22, 0.2, 18), '#ffb3cf', { y: 0.96 });
      k.v.add(G.ball(0.16, 12), '#ffffff', { y: 1.1, s: [1, 0.7, 1] });
      k.v.add(G.ball(0.07, 8), '#ff4f7e', { y: 1.2 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.v.add(G.ball(0.045, 6), '#ffffff', { x: Math.cos(a) * 0.3, y: 0.83, z: Math.sin(a) * 0.3 }); }
      g.add(contactShadow(1.0, 1.0));
      break;
    }
    default: return null;
  }
  k.into(g);
  return g;
}

export function createStructures(): THREE.Group {
  const root = new THREE.Group();
  for (const b of buildings) root.add(createBuilding(b));
  for (const s of stations) root.add(createStation(s));
  for (const p of props) { const m = createProp(p); if (m) root.add(m); }
  return root;
}
