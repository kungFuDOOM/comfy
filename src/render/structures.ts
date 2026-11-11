// Placeholder architecture + props: chunky pastel boxes, awnings and signs. Replace per-building later.
import * as THREE from 'three';
import { buildings, props, stations, type Building, type Prop, type Station } from '../world';
import { ball, box, cyl, makeLabel, mat } from './util';
import { tileHeight } from './terrain';

const STYLE = {
  cafe: { wall: '#fff4e6', roof: '#e8a8a8', name: 'Puddle & Pip Café' },
  boutique: { wall: '#ffe6f0', roof: '#ff9ec0', name: 'Spot & Bow' },
  house: { wall: '#fff0e6', roof: '#c9a8e8', name: 'Home Sweet Nook' },
};

/** Gabled roof prism spanning width w (x) and depth d (z). */
function roofPrism(w: number, d: number, h: number, color: string): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, h); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(Math.PI / 2); // ridge along x
  return new THREE.Mesh(geo, mat(color));
}

/** Swap for a real building model later. */
export function createBuilding(b: Building): THREE.Group {
  const st = STYLE[b.id];
  const g = new THREE.Group();
  const w = b.x1 - b.x0 + 1, d = b.y1 - b.y0 + 1, wallH = b.id === 'house' ? 2.2 : 2.6;
  const cx = b.x0 + w / 2, cz = b.y0 + d / 2, base = tileHeight(b.x0, b.y1);
  g.position.set(cx, base, cz);
  g.add(box(w - 0.3, wallH, d - 0.3, st.wall, 0, wallH / 2, 0));
  const roof = roofPrism(w + 0.6, d + 0.5, 1.7, st.roof);
  roof.position.y = wallH;
  g.add(roof);
  const front = (d - 0.3) / 2 + 0.02;
  const win = mat('#d6f1ff', '#ffe6a0');
  for (const wx of [-w / 2 + 1.3, w / 2 - 1.3]) {
    g.add(box(1.1, 0.9, 0.08, win, wx, wallH * 0.55, front));
    g.add(box(1.3, 1.1, 0.04, '#ffffff', wx, wallH * 0.55, front - 0.02));
  }
  if (b.id === 'house') {
    g.add(box(0.9, 1.5, 0.1, '#ff9ec0', 0, 0.75, front));
    g.add(box(0.5, 1.2, 0.5, '#ffc3da', w / 2 - 0.9, wallH + 1.2, 0));
  }
  if (b.id === 'boutique') g.add(box(w + 0.2, 0.3, 0.2, '#d9a35a', 0, wallH - 0.25, front + 0.05)); // trim band (cheetah print later)
  const label = makeLabel(st.name, 3.2);
  label.position.set(0, wallH + 0.55, front + 0.5);
  label.rotation.x = -0.25;
  g.add(label);
  return g;
}

function awning(w: number, c1: string, c2: string): THREE.Group {
  const g = new THREE.Group();
  const n = Math.max(4, Math.round(w * 4));
  for (let i = 0; i < n; i++) {
    const s = box(w / n, 0.08, 0.9, i % 2 ? c1 : c2, -w / 2 + (i + 0.5) * (w / n), 0, 0);
    g.add(s);
  }
  g.rotation.x = 0.35;
  return g;
}

/** Interactive stations: counter + awning + sign. Each carries userData.stationId for picking. */
export function createStation(s: Station): THREE.Group {
  const g = new THREE.Group();
  g.userData.stationId = s.id;
  const base = tileHeight(s.x, s.y);
  const cx = s.x + s.w / 2, cz = s.y + 0.5;
  g.position.set(cx, base, cz);
  switch (s.id) {
    case 'cafe':
      g.add(box(2.4, 0.8, 0.8, '#e9b9a0', 0, 0.4, 0));
      g.add(box(2.5, 0.1, 0.9, '#fff2e6', 0, 0.85, 0));
      g.add(cyl(0.12, 0.1, 0.16, '#ffffff', -0.5, 0.97, 0));
      for (const x of [-1.1, 1.1]) g.add(box(0.08, 1.5, 0.08, '#c99a7a', x, 0.75, 0.4));
      { const a = awning(2.6, '#ff9ec0', '#ffffff'); a.position.set(0, 1.6, 0.1); g.add(a); }
      { const l = makeLabel('Café', 1.5); l.position.set(0, 2.4, 0.5); g.add(l); }
      break;
    case 'boutique':
      g.add(box(1.4, 1.8, 0.7, '#ff9ec0', 0, 0.9, 0));
      g.add(box(1.7, 0.3, 0.9, '#d9a35a', 0, 1.95, 0.05));
      { const l = makeLabel('Boutique', 2.0); l.position.set(0, 2.6, 0.5); g.add(l); }
      break;
    case 'market': {
      const w = s.w;
      g.add(box(w - 0.2, 0.7, 0.8, '#f7d5b8', 0, 0.45, 0));
      for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) { g.add(cyl(0.3, 0.3, 0.08, '#c99a7a', x, 0.2, 0.45, 16)); g.add(box(0.08, 1.7, 0.08, '#c99a7a', x, 0.9, 0.35)); }
      const a = awning(w + 0.2, '#c3e8d6', '#ffffff'); a.position.set(0, 1.8, 0.1); g.add(a);
      g.add(ball(0.17, '#ff8fb6', -0.5, 0.95, 0)); g.add(ball(0.17, '#ff8fb6', -0.1, 0.95, 0)); g.add(ball(0.17, '#ffffff', 0.4, 0.95, 0));
      { const l = makeLabel('Tuppence Cart', 2.2); l.position.set(0, 2.5, 0.5); g.add(l); }
      break;
    }
    case 'grove': {
      g.add(cyl(0.8, 0.9, 0.5, '#e8dcf5', 0, 0.25, 0));
      g.add(cyl(0.45, 0.55, 0.6, '#f3ecff', 0, 0.8, 0));
      g.add(ball(0.32, mat('#fff3a8', '#ffe38a'), 0, 1.4, 0));
      { const l = makeLabel('Afterglow Grove', 2.6); l.position.set(0, 2.3, 0.5); g.add(l); }
      break;
    }
  }
  g.traverse((o) => { o.userData.stationId = s.id; });
  return g;
}

export function createProp(p: Prop): THREE.Group | null {
  const g = new THREE.Group();
  g.position.set(p.x + 0.5, tileHeight(p.x, p.y), p.y + 0.5);
  switch (p.type) {
    case 'fence':
      g.add(box(1, 0.1, 0.1, '#ffc3da', 0, 0.45, 0));
      for (const k of [-0.4, -0.13, 0.13, 0.4]) g.add(box(0.12, 0.7, 0.12, '#ffffff', k, 0.35, 0));
      // rails run along whichever axis; fences are fine as posts + rail looking from above
      break;
    case 'table':
      g.add(cyl(0.06, 0.06, 0.6, '#d9a5b3', 0, 0.3, 0));
      g.add(cyl(0.42, 0.42, 0.06, '#ffd0e2', 0, 0.63, 0));
      g.add(cyl(0.1, 0.08, 0.1, '#ffffff', -0.1, 0.72, 0));
      break;
    case 'mannequin':
      g.add(cyl(0.05, 0.05, 0.4, '#d9a5b3', 0, 0.2, 0));
      g.add(cyl(0.2, 0.34, 0.8, p.v ? '#ffc9dc' : '#f9deb0', 0, 0.8, 0));
      g.add(ball(0.17, '#fff3ea', 0, 1.35, 0));
      break;
    case 'fountain':
      g.add(cyl(1.0, 1.1, 0.4, '#ffe0ec', 0, 0.2, 0, 24));
      g.add(cyl(0.85, 0.85, 0.06, '#cfeefe', 0, 0.4, 0, 24));
      g.add(cyl(0.15, 0.2, 0.9, '#ffd0e2', 0, 0.7, 0));
      g.add(ball(0.2, '#ffd36e', 0, 1.25, 0));
      g.userData.fountain = true;
      break;
    case 'lamp':
      g.add(cyl(0.05, 0.06, 1.5, '#c99a7a', 0, 0.75, 0));
      g.add(ball(0.2, mat('#fff3c4', '#ffe38a'), 0, 1.6, 0));
      break;
    case 'sign': {
      g.add(box(0.08, 0.7, 0.08, '#c99a7a', 0, 0.35, 0));
      const l = makeLabel(p.text ?? '', 1.5); l.position.set(0, 0.95, 0.05); g.add(l);
      break;
    }
    default: return null;
  }
  return g;
}

export function createStructures(): THREE.Group {
  const root = new THREE.Group();
  for (const b of buildings) root.add(createBuilding(b));
  for (const s of stations) root.add(createStation(s));
  for (const p of props) { const m = createProp(p); if (m) root.add(m); }
  return root;
}
