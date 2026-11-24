// State-driven objects: garden plots, placed decor, collectibles, grove lanterns. Synced from game state each frame.
import * as THREE from 'three';
import { stageOf } from '../garden';
import { FLIGHT, flyers, slotPos } from '../lanterns';
import { LANTERN_KINDS } from '../art/lantern';
import { state, type Spawn } from '../state';
import { AREAS, GROVE, TS } from '../world';
import { contactShadow, PALETTE, toon, vertexToon } from './materials';
import { ball, Batch, box, cyl, G, mat, mesh } from './util';
import { tileHeight } from './terrain';
import { createNodeLayer } from './nodes3d';
import { createBarriers } from './barriers';

const WOOD_D = '#b98763';
const SPAWN_COLOR: Record<string, string> = { shell: '#ffe0d0', blossom: '#ff9ec0', moth: '#fff3a8', frog: '#9fe3a4', snail: '#ffc2d8', button: '#ffffff', pumpkin: '#ffa763', apple: '#ff7f93', ornament: '#ff9ec0', sea_glass: '#b8f0d8', candy_copper: '#ffa98a', rose_quartz: '#ffb3d1', twinkle_geode: '#d4b8ff', frost_opal: '#bfe6ff' };

/** A flat heart facing +z, about 2 units wide; scale it down where it is used. */
const HEART_GEO = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9); s.bezierCurveTo(-1.4, 0.2, -0.5, 1.0, 0, 0.3); s.bezierCurveTo(0.5, 1.0, 1.4, 0.2, 0, -0.9);
  return new THREE.ShapeGeometry(s, 8);
})();

/** Placeholder decor models keyed by item id. */
export function createDecor(id: string): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    // ---- the cozy home basics: soft, rounded silhouettes, each merged into one mesh (one draw call) ----
    case 'd_pouf': {
      // a plump tufted pouf: rounded drum, a piped seam, a soft dimpled top with a button, little cream feet
      const b = new Batch();
      b.add(G.lathe([[0.001, 0.05], [0.3, 0.05], [0.36, 0.1], [0.385, 0.22], [0.37, 0.34], [0.32, 0.42], [0.18, 0.455], [0.001, 0.44]], 24), '#ffb3cf');
      b.add(G.torus(0.37, 0.022, 24), '#fff4f8', { y: 0.33, rx: Math.PI / 2 });
      b.add(G.torus(0.335, 0.02, 24), '#fff4f8', { y: 0.08, rx: Math.PI / 2 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.add(G.ball(0.018, 6), '#ff8fb6', { x: Math.cos(a) * 0.2, y: 0.435, z: Math.sin(a) * 0.2 }); }
      b.add(G.ball(0.035, 10), '#ff8fb6', { y: 0.455, s: [1, 0.6, 1] });
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; b.add(G.ball(0.045, 8), '#fff4e6', { x: Math.cos(a) * 0.24, y: 0.035, z: Math.sin(a) * 0.24, s: [1, 0.8, 1] }); }
      g.add(b.build());
      break;
    }
    case 'd_rug': {
      // a plush oval rug: soft cream field, a rosy inner border, a fluffy scalloped hem and two little hearts
      const b = new Batch();
      b.add(G.cyl(0.46, 0.47, 0.035, 32), '#f9deb0', { y: 0.018, s: [1, 1, 0.92] });
      b.add(G.torus(0.36, 0.022, 32), '#ffb3cf', { y: 0.036, rx: Math.PI / 2, s: [1, 0.92, 1] });
      b.add(G.cyl(0.3, 0.3, 0.012, 28), '#fff1d6', { y: 0.04, s: [1, 1, 0.92] });
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; b.add(G.ball(0.042, 6), i % 2 ? '#fff4f8' : '#ffd0e2', { x: Math.cos(a) * 0.465, y: 0.02, z: Math.sin(a) * 0.43, s: [1, 0.45, 1] }); }
      for (const [x, z, c] of [[-0.08, -0.04, '#ff8fb6'], [0.1, 0.06, '#ffb3cf']] as [number, number, string][]) {
        for (const sx of [-1, 1]) b.add(G.ball(0.035, 8), c, { x: x + sx * 0.024, y: 0.045, z: z - 0.01, s: [1, 0.25, 1] });
        b.add(G.cone(0.05, 0.06, 8), c, { x, y: 0.045, z: z + 0.025, rx: Math.PI / 2, s: [1, 1, 0.25] });
      }
      const rug = b.build(vertexToon(), false);
      rug.receiveShadow = true;
      g.add(rug);
      break;
    }
    case 'd_lamp': {
      // a latte floor lamp: rounded foot, slim post with a ring, a pleated bell shade (glows at night) with a pink trim
      const b = new Batch();
      b.add(G.lathe([[0.001, 0], [0.18, 0], [0.19, 0.03], [0.14, 0.06], [0.06, 0.09], [0.001, 0.1]], 20), '#c99a7a');
      b.add(G.cyl(0.026, 0.032, 0.78, 10), '#e8c39a', { y: 0.47 });
      b.add(G.torus(0.04, 0.012, 10), '#ffffff', { y: 0.5, rx: Math.PI / 2 });
      b.add(G.torus(0.3, 0.022, 20), '#ff9ec0', { y: 0.82, rx: Math.PI / 2 });
      b.add(G.torus(0.18, 0.016, 18), '#ff9ec0', { y: 1.13, rx: Math.PI / 2 });
      b.add(G.ball(0.03, 8), PALETTE.gold, { y: 1.18 });
      g.add(b.build());
      const shade = new THREE.Mesh(G.lathe([[0.3, 0.82], [0.27, 0.92], [0.22, 1.04], [0.18, 1.13]], 20), mat('#fff0e0', PALETTE.lampGlow, 'lamp'));
      (shade.material as THREE.Material).side = THREE.DoubleSide;
      shade.castShadow = true;
      g.add(shade);
      break;
    }
    case 'd_shelf': {
      // a little bookshelf: rounded pink case with a scalloped crown, two shelves of books, a plant and a tiny mug
      const b = new Batch();
      b.add(G.rbox(0.64, 1.02, 0.32, 0.05), '#ffc3da', { y: 0.53, z: -0.01 });
      b.add(G.rbox(0.56, 0.94, 0.04, 0.015), '#ffe3ee', { y: 0.53, z: -0.13 }); // back panel
      for (const y of [0.08, 0.42, 0.76]) b.add(G.rbox(0.56, 0.035, 0.27, 0.012), '#fff4f8', { y, z: 0.01 });
      for (let i = 0; i < 5; i++) b.add(G.ball(0.065, 8), i % 2 ? '#ffffff' : '#ff9ec0', { x: -0.26 + i * 0.13, y: 1.05, z: 0.04, s: [1, 0.7, 0.8] });
      const books: [number, number, number, string][] = [[-0.21, 0.24, 0.06, '#9fd9c3'], [-0.15, 0.22, 0.05, '#fff3a8'], [-0.09, 0.26, 0.055, '#c9a8e8'], [-0.035, 0.2, 0.05, '#ff9ec0']];
      for (const [x, h, w, c] of books) { b.add(G.rbox(w, h, 0.2, 0.01), c, { x, y: 0.1 + h / 2, z: 0.02 }); b.add(G.box(w + 0.002, 0.012, 0.202), '#ffffff', { x, y: 0.1 + h * 0.75, z: 0.02 }); }
      b.add(G.rbox(0.05, 0.2, 0.2, 0.01), '#ffd6a8', { x: 0.06, y: 0.2, z: 0.02, rz: -0.3 });
      b.add(G.cyl(0.06, 0.045, 0.08, 10), '#ffffff', { x: 0.18, y: 0.14, z: 0.02 });
      b.add(G.ball(0.07, 10), '#9fe0b8', { x: 0.18, y: 0.22, z: 0.02 });
      b.add(G.ball(0.025, 6), '#ff8fb6', { x: 0.2, y: 0.27, z: 0.07 });
      // upper shelf: a tidy row of books, a tiny latte mug and a heart
      for (let i = 0; i < 3; i++) b.add(G.rbox(0.05, 0.22 - i * 0.02, 0.2, 0.01), ['#ffb3cf', '#bfe6ff', '#fff4e6'][i], { x: 0.06 + i * 0.06, y: 0.44 + (0.22 - i * 0.02) / 2, z: 0.02 });
      b.add(G.cyl(0.045, 0.038, 0.08, 10), '#ffffff', { x: -0.16, y: 0.48, z: 0.03 });
      b.add(G.torus(0.022, 0.007, 8), '#ffffff', { x: -0.11, y: 0.48, z: 0.03 });
      for (const sx of [-1, 1]) b.add(G.ball(0.03, 8), '#ff7fa9', { x: -0.16 + sx * 0.02, y: 0.66, z: 0.04, s: [1, 1, 0.5] });
      b.add(G.cone(0.04, 0.045, 8), '#ff7fa9', { x: -0.16, y: 0.635, z: 0.04, rx: Math.PI, s: [1, 1, 0.5] });
      g.add(b.build());
      break;
    }
    case 'd_teacup': {
      // a teacup planter: a saucer, a rounded cup with a gold rim and handle, soil, and a bushy little bloom
      const b = new Batch();
      b.add(G.cyl(0.33, 0.27, 0.035, 24), '#ffffff', { y: 0.018 });
      b.add(G.torus(0.315, 0.012, 24), '#ffc9dc', { y: 0.036, rx: Math.PI / 2 });
      b.add(G.lathe([[0.001, 0.035], [0.15, 0.035], [0.22, 0.08], [0.27, 0.18], [0.29, 0.29], [0.28, 0.3], [0.001, 0.3]], 22), '#ffffff');
      b.add(G.torus(0.285, 0.014, 24), PALETTE.gold, { y: 0.295, rx: Math.PI / 2 });
      b.add(G.torus(0.08, 0.022, 14), '#ffffff', { x: 0.3, y: 0.18 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.add(G.ball(0.035, 8), '#ffb3cf', { x: Math.cos(a) * 0.255, y: 0.2, z: Math.sin(a) * 0.255, s: [1, 1, 0.4], ry: -a + Math.PI / 2 }); } // a band of pink dots
      b.add(G.cyl(0.26, 0.26, 0.02, 20), '#b98a6f', { y: 0.29 });
      for (const [x, z, r] of [[0, 0, 0.17], [0.11, 0.06, 0.12], [-0.1, 0.05, 0.12], [0.02, -0.11, 0.12]] as [number, number, number][]) b.add(G.ball(r, 10), r > 0.15 ? '#8fd7ae' : '#a6e0bd', { x, y: 0.36 + r * 0.3, z });
      for (const [x, y, z, c] of [[0.0, 0.53, 0.06, '#ff8fb6'], [0.12, 0.45, 0.1, '#ffffff'], [-0.12, 0.46, 0.08, '#ff9ec0'], [0.06, 0.5, -0.1, '#fff3a8']] as [number, number, number, string][]) {
        b.add(G.ball(0.055, 8), c, { x, y, z });
        b.add(G.ball(0.02, 6), '#ffe08a', { x, y: y + 0.03, z: z + 0.03 });
      }
      g.add(b.build());
      break;
    }
    case 'd_chair': {
      // a rounded armchair: plush seat cushion, a curved back with a scalloped top, rolled arms, turned feet and a
      // little pink heart throw cushion
      const b = new Batch(), c = '#f9deb0', cd = '#f0cc98';
      b.add(G.rbox(0.66, 0.24, 0.6, 0.08), cd, { y: 0.24 });
      b.add(G.rbox(0.56, 0.12, 0.5, 0.06), '#fff1d6', { y: 0.41, z: 0.03 });
      b.add(G.rbox(0.66, 0.56, 0.16, 0.08), c, { y: 0.58, z: -0.24, rx: -0.12 });
      for (let i = 0; i < 4; i++) b.add(G.ball(0.1, 10), c, { x: -0.24 + i * 0.16, y: 0.86, z: -0.28, s: [1, 0.8, 0.8] });
      for (const sx of [-1, 1]) {
        b.add(G.capsule(0.08, 0.38, 4, 10), c, { x: sx * 0.3, y: 0.46, z: 0.0, rx: Math.PI / 2 });
        b.add(G.ball(0.085, 10), '#ffffff', { x: sx * 0.3, y: 0.46, z: 0.28, s: [1, 1, 0.4] }); // rolled arm end
        for (const z of [-0.22, 0.22]) b.add(G.lathe([[0.001, 0], [0.035, 0], [0.045, 0.05], [0.03, 0.1], [0.04, 0.12], [0.001, 0.12]], 8), '#c99a7a', { x: sx * 0.26, z });
      }
      b.add(G.rbox(0.3, 0.26, 0.1, 0.05), '#ffc2d8', { y: 0.58, z: -0.12, rx: -0.2 }); // throw cushion
      for (const sx of [-1, 1]) b.add(G.ball(0.032, 8), '#ff7fa9', { x: sx * 0.022, y: 0.61, z: -0.06, rx: -0.2, s: [1, 1, 0.4] });
      b.add(G.cone(0.044, 0.05, 8), '#ff7fa9', { y: 0.583, z: -0.055, rx: Math.PI - 0.2, s: [1, 1, 0.4] });
      g.add(b.build());
      break;
    }
    case 'd_cornucopia': {
      const horn = cyl(0.3, 0.07, 0.8, '#e8b98a', -0.04, 0.36, 0, 12); horn.rotation.z = 1.05; g.add(horn);
      g.add(ball(0.2, '#ffa763', 0.32, 0.62, 0.05)); g.add(ball(0.17, '#ff7f93', 0.4, 0.4, -0.12)); g.add(ball(0.14, '#c9a8e8', 0.18, 0.46, 0.2)); g.add(ball(0.13, '#ffd36e', 0.38, 0.22, 0.14));
      break;
    }
    case 'd_haybale': {
      const bale = cyl(0.42, 0.42, 0.6, '#f3d28b', 0, 0.42, 0, 18); bale.rotation.x = Math.PI / 2; g.add(bale);
      const band = cyl(0.435, 0.435, 0.1, '#ffb3cf', 0, 0.42, 0, 18); band.rotation.x = Math.PI / 2; g.add(band);
      g.add(ball(0.07, '#ff8fb6', 0, 0.86, 0));
      break;
    }
    case 'd_pieshelf': {
      g.add(box(0.8, 0.07, 0.4, '#e8b98a', 0, 0.45, 0)); g.add(box(0.8, 0.07, 0.4, '#e8b98a', 0, 0.95, 0));
      for (const x of [-0.36, 0.36]) g.add(box(0.07, 1.0, 0.36, '#c98f5f', x, 0.5, 0));
      for (const [x, y, c] of [[-0.2, 0.5, '#ffa14f'], [0.2, 0.5, '#f0b565'], [0, 1.0, '#ff7f93']] as [number, number, string][]) { g.add(cyl(0.16, 0.14, 0.07, '#f5cf9c', x, y + 0.06, 0)); g.add(cyl(0.12, 0.12, 0.04, c, x, y + 0.1, 0)); }
      break;
    }
    case 'd_tw_tree': {
      g.add(cyl(0.05, 0.07, 0.18, '#c99a7a', 0, 0.09, 0, 8));
      for (const [y, r, h, c] of [[0.18, 0.36, 0.42, '#8fd7ae'], [0.44, 0.28, 0.4, '#9fe0b8'], [0.68, 0.19, 0.36, '#b0e8c4']] as [number, number, number, string][]) g.add(cyl(0.01, r, h, c, 0, y + h / 2, 0, 12));
      for (const [x, y, z, c] of [[0.2, 0.3, 0.12, '#ff8fb6'], [-0.16, 0.5, 0.1, '#ffd36e'], [0.08, 0.7, -0.1, '#ffffff'], [-0.12, 0.28, -0.18, '#c9a8e8']] as [number, number, number, string][]) g.add(ball(0.04, c, x, y, z, 8));
      g.add(ball(0.06, mat('#ffe27a', '#ffd95e', 'lamp'), 0, 1.08, 0, 8));
      break;
    }
    case 'd_tw_cookies':
      for (const [y, r, c] of [[0.0, 0.22, '#ffd6e4'], [0.3, 0.19, '#d8f1e4'], [0.58, 0.16, '#fff1c9']] as [number, number, string][]) {
        g.add(cyl(r, r, 0.26, c, 0, y + 0.13, 0, 14)); g.add(cyl(r + 0.02, r + 0.02, 0.05, '#ff9ec0', 0, y + 0.28, 0, 14));
      }
      g.add(ball(0.05, '#ff8fb6', 0, 0.9, 0, 8));
      break;
    case 'd_cafe_menu': {
      // a little easel chalkboard: pink frame, chalk heart and menu lines, chalk tray, bow on top
      const board = new THREE.Group(); board.rotation.x = -0.2;
      for (const x of [-0.25, 0.25]) board.add(box(0.05, 0.34, 0.05, '#c99a7a', x, 0.17, 0));
      board.add(box(0.64, 0.72, 0.05, '#ffb3cf', 0, 0.66, 0)); board.add(box(0.52, 0.6, 0.02, '#5a4048', 0, 0.66, 0.025));
      const chalkHeart = mesh(HEART_GEO, '#ffd0e2', 0, 0.8, 0.04); chalkHeart.scale.setScalar(0.11); chalkHeart.castShadow = false; board.add(chalkHeart);
      for (const [x, y, w, c] of [[-0.05, 0.63, 0.3, '#ffe6ef'], [-0.09, 0.56, 0.22, '#ffe6ef'], [-0.06, 0.49, 0.28, '#ffe6ef'], [0.18, 0.63, 0.05, '#ffd36e'], [0.18, 0.56, 0.05, '#ff9ec0'], [0.18, 0.49, 0.05, '#9fe0c8']] as [number, number, number, string][]) board.add(box(w, 0.025, 0.01, c, x, y, 0.04));
      board.add(box(0.44, 0.03, 0.09, '#c99a7a', 0, 0.3, 0.06));
      for (const [x, c] of [[-0.1, '#ffffff'], [0.02, '#ff9ec0']] as [number, string][]) { const chalk = cyl(0.014, 0.014, 0.08, c, x, 0.33, 0.07, 6); chalk.rotation.z = Math.PI / 2; board.add(chalk); }
      for (const x of [-0.07, 0.07]) { const loop = ball(0.07, '#ff8fb6', x, 1.05, 0, 8); loop.scale.set(1, 0.7, 0.55); board.add(loop); }
      board.add(ball(0.04, '#ffd0e2', 0, 1.05, 0.02, 8));
      g.add(board);
      const back = box(0.05, 0.94, 0.05, '#c99a7a', 0, 0.47, -0.32); back.rotation.x = 0.3; g.add(back);
      break;
    }
    case 'd_cafe_succulent': {
      // a plump rosette in a pink latte cup with a saucer, handle and a heart on the front
      g.add(cyl(0.27, 0.22, 0.03, '#ffffff', 0, 0.015, 0, 16));
      g.add(cyl(0.2, 0.13, 0.26, '#ffd0e2', 0, 0.16, 0, 16)); g.add(cyl(0.21, 0.21, 0.03, '#ffffff', 0, 0.29, 0, 16)); g.add(cyl(0.18, 0.18, 0.02, '#b98a6f', 0, 0.3, 0, 16));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 14), mat('#ffb3cf')); handle.position.set(0.2, 0.17, 0); handle.castShadow = true; g.add(handle);
      const cupHeart = mesh(HEART_GEO, '#ff8fb6', 0, 0.17, 0.172); cupHeart.scale.setScalar(0.05); cupHeart.rotation.x = -0.26; cupHeart.castShadow = false; g.add(cupHeart);
      const leafGeo = new THREE.SphereGeometry(0.075, 10, 8);
      for (const [n, dist, tilt, y, sc, c, off] of [[7, 0.115, -0.3, 0.33, 1, '#8fd3aa', 0], [5, 0.065, -0.75, 0.37, 0.85, '#a6e0bd', 0.5], [3, 0.025, -1.2, 0.41, 0.6, '#c2efd2', 0.2]] as [number, number, number, number, number, string, number][]) {
        for (let i = 0; i < n; i++) {
          const pivot = new THREE.Group(); pivot.rotation.y = ((i + off) / n) * Math.PI * 2; pivot.position.y = y;
          const leaf = mesh(leafGeo, c, 0, 0, dist); leaf.scale.set(0.62 * sc, 0.4 * sc, 1.25 * sc); leaf.rotation.x = tilt; pivot.add(leaf);
          if (n === 7) { const tip = ball(0.016, '#ff9ec0', 0, 0, 0.09, 6); leaf.add(tip); tip.scale.set(1 / 0.62, 1 / 0.4, 1 / 1.25); }
          g.add(pivot);
        }
      }
      g.add(ball(0.035, '#d6f5e1', 0, 0.44, 0, 8));
      break;
    }
    case 'd_tw_cocoa':
      g.add(box(0.7, 0.06, 0.34, '#e8b98a', 0, 0.42, 0)); g.add(box(0.7, 0.06, 0.34, '#e8b98a', 0, 0.86, 0));
      for (const x of [-0.31, 0.31]) g.add(box(0.06, 0.9, 0.3, '#c98f5f', x, 0.45, 0));
      for (const [x, y, c] of [[-0.18, 0.45, '#ff9ec0'], [0.18, 0.45, '#9fe0c8'], [0, 0.89, '#ffd36e']] as [number, number, string][]) { g.add(cyl(0.09, 0.07, 0.14, '#ffffff', x, y + 0.08, 0, 12)); g.add(cyl(0.092, 0.092, 0.02, c, x, y + 0.14, 0, 12)); }
      break;
    case 'd_tw_gifts':
      for (const [x, y, z, w, hh, c, rb] of [[-0.14, 0, 0.02, 0.4, 0.3, '#ffc2d8', '#ffffff'], [0.22, 0, -0.04, 0.3, 0.24, '#c8ecd9', '#ff8fb6'], [0.02, 0.3, 0, 0.28, 0.22, '#fff1d6', '#ff8fb6']] as [number, number, number, number, number, string, string][]) {
        g.add(box(w, hh, w, c, x, y + hh / 2, z)); g.add(box(w + 0.01, hh + 0.01, 0.05, rb, x, y + hh / 2, z)); g.add(box(0.05, hh + 0.01, w + 0.01, rb, x, y + hh / 2, z)); g.add(ball(0.06, rb, x, y + hh + 0.04, z, 8));
      }
      break;
    case 'd_tw_star':
      g.add(cyl(0.025, 0.03, 0.55, '#e8b98a', 0, 0.28, 0, 8)); g.add(cyl(0.16, 0.18, 0.04, '#e8b98a', 0, 0.02, 0, 12));
      { const st = ball(0.22, mat('#ffe27a', '#ffd95e', 'lamp'), 0, 0.82, 0, 5); st.scale.set(1, 1, 0.35); g.add(st); }
      break;
    case 'd_tw_wreath': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 20), mat('#8fd7ae')); ring.position.set(0, 0.8, 0); g.add(ring);
      g.add(cyl(0.025, 0.03, 0.5, '#e8b98a', 0, 0.25, -0.04, 8)); g.add(cyl(0.14, 0.16, 0.04, '#e8b98a', 0, 0.02, 0, 12));
      for (const [x, y, c] of [[-0.26, 0.9, '#ff8fb6'], [0.24, 0.7, '#ff8fb6'], [0.1, 0.52, '#ffffff'], [0.27, 0.95, '#ffd36e']] as [number, number, string][]) g.add(ball(0.045, c, x, y, 0.08, 8));
      g.add(ball(0.07, '#ffb3cf', -0.08, 1.12, 0.04, 8)); g.add(ball(0.07, '#ffb3cf', 0.08, 1.12, 0.04, 8)); g.add(ball(0.04, '#ff8fb6', 0, 1.12, 0.06, 8));
      break;
    }
    case 'd_m_musicbox': {
      g.add(box(0.5, 0.24, 0.36, '#ffb3cf', 0, 0.12, 0)); g.add(box(0.54, 0.07, 0.4, '#fff6ea', 0, 0.27, 0));
      const crank = cyl(0.012, 0.012, 0.14, PALETTE.gold, 0.3, 0.14, 0, 6); crank.rotation.z = Math.PI / 2; g.add(crank);
      g.add(ball(0.035, '#ffd36e', 0.38, 0.14, 0, 6));
      g.add(cyl(0.018, 0.018, 0.18, '#ffffff', 0, 0.39, 0, 6)); g.add(ball(0.06, '#ffe3ee', 0, 0.52, 0, 8)); g.add(cyl(0.0, 0.14, 0.1, '#ff9ec0', 0, 0.43, 0, 12));
      break;
    }
    case 'd_m_cloudlamp': {
      g.add(cyl(0.2, 0.24, 0.1, '#ffe3ee', 0, 0.05, 0, 14));
      for (const [x, y, z, r] of [[0, 0.38, 0, 0.26], [-0.2, 0.3, 0.06, 0.18], [0.2, 0.32, -0.04, 0.2], [0.04, 0.58, 0.02, 0.17], [-0.1, 0.5, -0.1, 0.14]] as number[][]) g.add(ball(r, mat('#ffffff', '#fff3f8', 'lamp'), x, y, z, 10));
      break;
    }
    case 'd_m_teapot': {
      const pot = ball(0.4, '#ffd0e0', 0, 0.42, 0, 16); pot.scale.set(1, 0.9, 1); g.add(pot);
      g.add(cyl(0.3, 0.3, 0.05, '#fff6ea', 0, 0.2, 0, 16)); // cream base band
      g.add(cyl(0.2, 0.28, 0.1, '#fff6ea', 0, 0.76, 0, 16)); g.add(ball(0.07, '#ff8fb6', 0, 0.86, 0, 8));
      const spout = cyl(0.045, 0.08, 0.3, '#ffd0e0', 0.5, 0.5, 0, 8); spout.rotation.z = -1.0; g.add(spout);
      const handle = mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 14, Math.PI * 1.2), '#ffd0e0', -0.46, 0.46, 0); handle.rotation.z = Math.PI * 0.4; g.add(handle);
      g.add(box(0.2, 0.3, 0.05, '#c98f5f', 0, 0.3, 0.38)); g.add(ball(0.025, PALETTE.gold, 0.06, 0.3, 0.42, 6)); // little round-ish door
      for (const sx of [-1, 1]) g.add(ball(0.05, '#ff8fb6', sx * 0.22, 0.58, 0.32, 6));
      break;
    }
    case 'd_m_globe': {
      g.add(cyl(0.2, 0.24, 0.07, PALETTE.gold, 0, 0.04, 0, 14)); g.add(cyl(0.03, 0.03, 0.4, PALETTE.gold, 0, 0.26, 0, 8));
      g.add(ball(0.26, '#bfe8f5', 0, 0.62, 0, 16));
      for (const [x, y, z, r, c] of [[0.1, 0.7, 0.2, 0.1, '#ffd0e0'], [-0.14, 0.58, 0.18, 0.08, '#c8f0dc'], [0.17, 0.52, -0.1, 0.07, '#fff0a8']] as [number, number, number, number, string][]) { const land = ball(r, c, x, y, z, 8); land.scale.set(1, 1, 0.5); g.add(land); }
      const ring = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 24), PALETTE.gold, 0, 0.62, 0); ring.rotation.set(0.3, 0, 0.5); g.add(ring);
      break;
    }
    case 'd_m_moonswing': {
      for (const sx of [-1, 1]) g.add(cyl(0.03, 0.04, 1.0, WOOD_D, sx * 0.32, 0.5, 0, 8));
      const bar = cyl(0.025, 0.025, 0.72, WOOD_D, 0, 1.0, 0, 8); bar.rotation.z = Math.PI / 2; g.add(bar);
      const moon = mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 20, Math.PI * 1.15), '#fff0a8', 0, 0.4, 0); moon.rotation.z = Math.PI * 1.42; g.add(moon);
      for (const sx of [-1, 1]) g.add(cyl(0.008, 0.008, 0.55, '#fff6ea', sx * 0.2, 0.7, 0, 4));
      g.add(ball(0.04, '#ffd36e', 0.0, 0.2, 0.08, 6));
      break;
    }
    case 'd_fishbowl': {
      g.add(cyl(0.16, 0.2, 0.08, '#e8b98a', 0, 0.04, 0, 12));
      const glass = ball(0.32, '#bfe6f6', 0, 0.42, 0, 14); glass.scale.set(1, 0.92, 1); g.add(glass);
      g.add(cyl(0.27, 0.27, 0.05, '#ffd9e8', 0, 0.2, 0, 12));
      const fish = ball(0.1, '#fffaf5', 0, 0.42, 0, 8); fish.scale.set(1.5, 1, 1); g.add(fish); g.add(ball(0.04, '#ff8fb6', 0.03, 0.47, 0.06, 6)); g.add(ball(0.06, '#ffb3cf', 0.16, 0.42, 0, 6));
      break;
    }
    case 'd_forage_basket': {
      g.add(cyl(0.34, 0.27, 0.3, '#e6b98a', 0, 0.15, 0, 14));
      g.add(cyl(0.36, 0.36, 0.04, '#c98f5f', 0, 0.3, 0, 14));
      for (const [x, y, z, r, c] of [[-0.12, 0.38, 0.05, 0.12, '#ff8fb6'], [0.1, 0.4, -0.06, 0.11, '#ffd0e2'], [0.16, 0.34, 0.12, 0.09, '#c79bff'], [-0.04, 0.34, -0.14, 0.1, '#ff9ec0']] as [number, number, number, number, string][]) g.add(ball(r, c, x, y, z, 8));
      const cap = ball(0.1, '#ff9ec0', -0.22, 0.38, 0.06, 8); cap.scale.y = 0.7; g.add(cap);
      break;
    }
    case 'd_gem_stand': {
      g.add(box(0.7, 0.24, 0.4, '#ffd6e6', 0, 0.12, 0));
      for (const [x, c, s] of [[-0.24, '#b8f0d8', 0.13], [-0.08, '#ffc94d', 0.15], [0.08, '#ffc2da', 0.13], [0.24, '#d4b8ff', 0.1]] as [number, string, number][]) { const m = ball(s, c, x, 0.24 + s, 0, 5); m.scale.y = 1.4; g.add(m); }
      g.add(ball(0.05, mat('#fff3a8', '#ffe27a', 'lamp'), 0, 0.78, 0, 6));
      break;
    }
    case 'd_cafe_sign': {
      for (const x of [-0.26, 0.26]) g.add(box(0.05, 0.84, 0.05, '#c98f5f', x, 0.42, 0));
      g.add(box(0.7, 0.5, 0.07, '#6a4a58', 0, 0.62, 0)); g.add(box(0.76, 0.56, 0.04, '#ffb3cf', 0, 0.62, -0.03));
      g.add(cyl(0.1, 0.08, 0.12, '#fff0f6', -0.08, 0.66, 0.05, 10)); g.add(ball(0.04, '#ff8fb6', -0.08, 0.7, 0.09, 6)); g.add(box(0.44, 0.03, 0.02, '#ffffff', 0, 0.5, 0.05));
      break;
    }
    case 'd_pp_blanket': {
      g.add(box(0.9, 0.04, 0.8, '#ffc9dc', 0, 0.02, 0)); g.add(box(0.9, 0.045, 0.1, '#ffffff', 0, 0.025, -0.2)); g.add(box(0.9, 0.045, 0.1, '#ffffff', 0, 0.025, 0.2));
      g.add(box(0.26, 0.14, 0.18, '#f3d4a8', 0.12, 0.11, 0.05)); g.add(ball(0.04, '#ffb3cf', -0.25, 0.06, 0.15, 8));
      break;
    }
    case 'd_sd_lemonade': {
      g.add(box(0.7, 0.5, 0.4, '#fff7d6', 0, 0.3, 0)); for (const x of [-0.25, 0, 0.25]) g.add(box(0.12, 0.2, 0.42, '#ffb3cf', x, 0.5, 0));
      g.add(cyl(0.02, 0.5, 0.2, '#ffe27a', 0, 0.78, 0, 4)); g.add(ball(0.1, '#fff3a8', -0.1, 0.62, 0.14, 8)); g.add(ball(0.1, '#fff3a8', 0.12, 0.62, 0.14, 8));
      break;
    }
    case 'd_cn_lantern': {
      const pk = ball(0.3, mat('#ffc9a8', '#c9a8ff', 'lamp'), 0, 0.32, 0, 14); pk.scale.y = 0.85; g.add(pk);
      g.add(cyl(0.025, 0.035, 0.09, '#a3d19a', 0, 0.62, 0, 6)); g.add(ball(0.04, '#7a5a78', -0.1, 0.38, 0.27, 6)); g.add(ball(0.04, '#7a5a78', 0.1, 0.38, 0.27, 6));
      break;
    }
    case 'd_adv_candle':
      g.add(cyl(0.16, 0.18, 0.06, '#e8b98a', 0, 0.03, 0, 12));
      g.add(cyl(0.07, 0.08, 0.42, '#ffb3cf', 0, 0.27, 0, 10));
      g.add(ball(0.05, mat('#ffe27a', '#ffd95e', 'lamp'), 0, 0.52, 0, 8));
      break;
    case 'd_adv_stockings': {
      const rod = cyl(0.02, 0.02, 0.7, '#ff8fb6', 0, 0.72, 0, 8); rod.rotation.z = Math.PI / 2; g.add(rod);
      for (const [x, c] of [[-0.22, '#ffb3cf'], [0, '#fff6ea'], [0.22, '#c8ecd9']] as [number, string][]) {
        g.add(box(0.12, 0.28, 0.04, c, x, 0.5, 0)); g.add(box(0.13, 0.06, 0.045, '#ffffff', x, 0.62, 0));
      }
      break;
    }
    case 'd_adv_froststar':
      g.add(cyl(0.03, 0.04, 0.4, '#e8b98a', 0, 0.2, 0, 8)); g.add(cyl(0.14, 0.16, 0.04, '#e8b98a', 0, 0.02, 0, 12));
      g.add(ball(0.16, mat('#eef7ff', '#d6ecff', 'lamp'), 0, 0.62, 0, 5));
      break;
    case 'd_adv_sleigh':
      g.add(box(0.55, 0.16, 0.28, '#ffb3cf', 0, 0.22, 0)); g.add(box(0.55, 0.05, 0.3, '#ffffff', 0, 0.3, 0));
      g.add(box(0.5, 0.03, 0.04, '#c98f5f', 0, 0.06, 0.12)); g.add(box(0.5, 0.03, 0.04, '#c98f5f', 0, 0.06, -0.12));
      g.add(ball(0.08, '#8fd7ae', 0.12, 0.38, 0, 8));
      break;
    case 'd_adv_wreath': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 18), mat('#7dba8a')); ring.position.y = 0.55; g.add(ring);
      for (const [x, y] of [[-0.16, 0.62], [0.16, 0.48], [0, 0.36], [0.12, 0.7]] as [number, number][]) g.add(ball(0.04, '#ff6f93', x, y, 0.06, 8));
      g.add(ball(0.06, '#ff8fb6', 0, 0.78, 0.04, 8));
      break;
    }
    case 'd_adv_globe':
      g.add(cyl(0.16, 0.18, 0.06, '#e8b98a', 0, 0.03, 0, 12));
      g.add(ball(0.22, '#d2ecf8', 0, 0.32, 0, 14));
      g.add(cyl(0.01, 0.1, 0.16, '#8fd7ae', 0, 0.28, 0, 8));
      g.add(ball(0.04, mat('#ffe27a', '#ffd95e', 'lamp'), 0, 0.38, 0, 6));
      break;
    case 'd_adv_pillow': {
      // a squishy floor cushion with pinched corners, a piped seam and a button
      const b = new Batch();
      b.add(G.rbox(0.56, 0.26, 0.42, 0.12, 3), '#ffc2d8', { y: 0.15 });
      b.add(G.rbox(0.58, 0.025, 0.44, 0.012), '#fff6ea', { y: 0.15 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(G.cone(0.04, 0.07, 6), '#ffc2d8', { x: sx * 0.29, y: 0.15, z: sz * 0.21, dir: [sx, 0, sz] });
      b.add(G.ball(0.04, 8), '#ff8fb6', { y: 0.285, s: [1, 0.5, 1] });
      g.add(b.build());
      break;
    }
    case 'd_adv_bellstar':
      g.add(cyl(0.03, 0.04, 0.28, '#e8b98a', 0, 0.14, 0, 8)); g.add(cyl(0.12, 0.14, 0.04, '#e8b98a', 0, 0.02, 0, 10));
      g.add(cyl(0.12, 0.02, 0.14, '#ffe08a', 0, 0.4, 0, 12)); g.add(ball(0.04, '#fff6c8', 0, 0.32, 0, 8));
      g.add(ball(0.1, mat('#ffe27a', '#ffd95e', 'lamp'), 0, 0.58, 0, 5));
      break;
    case 'd_wc_kettle': {
      g.add(cyl(0.22, 0.28, 0.4, '#ffb3c6', 0, 0.22, 0, 14)); g.add(cyl(0.12, 0.2, 0.08, '#ffffff', 0, 0.46, 0, 14)); g.add(ball(0.05, '#ff8fb6', 0, 0.54, 0, 8));
      g.add(cyl(0.03, 0.05, 0.2, '#e07a9a', 0.3, 0.3, 0, 6));
      break;
    }
    default: g.add(ball(0.3, '#ffb3cf', 0, 0.3, 0));
  }
  if (id !== 'd_rug') g.add(contactShadow(0.9));
  return g;
}

/** Bud / ripe colours per crop (a missing crop looks like cottonbloom). */
const CROP_COLORS: Record<string, [string, string]> = {
  puffberry: ['#ffc2da', '#ff8fb6'], cottonbloom: ['#f5f5f5', '#ffffff'], glowberry: ['#ffe9a8', '#ffc65e'], moonpetal: ['#e6d4ff', '#c9a8ff'],
};

function createCrop(crop: string, stage: number): THREE.Group {
  const g = new THREE.Group();
  const h = [0.15, 0.3, 0.42, 0.5][stage];
  g.add(cyl(0.025, 0.03, h, '#7fcf8e', 0, h / 2, 0, 6));
  g.add(ball(0.1, '#8fe0a0', -0.1, h * 0.6, 0, 6)); g.add(ball(0.1, '#8fe0a0', 0.1, h * 0.8, 0, 6));
  const [bud, ripe] = CROP_COLORS[crop] ?? CROP_COLORS.cottonbloom;
  if (stage >= 2) g.add(ball(0.08, bud, 0, h + 0.05, 0, 6));
  if (stage === 3) g.add(ball(0.17, ripe, 0, h + 0.08, 0, 8));
  return g;
}

export interface Dynamic { group: THREE.Group; update(t: number): void }

export function createDynamic(): Dynamic {
  const group = new THREE.Group();

  // gathering nodes
  const nodeLayer = createNodeLayer();
  group.add(nodeLayer.group);
  const barrierLayer = createBarriers();
  group.add(barrierLayer.group);

  // garden plots
  const plotMeshes = new Map<string, { sig: string; obj: THREE.Group }>();
  const gp = AREAS.garden;
  const plotsRoot = new THREE.Group();
  group.add(plotsRoot);

  // decor
  const decorMeshes = new Map<string, THREE.Group>();
  const decorRoot = new THREE.Group(); group.add(decorRoot);

  // spawns
  const spawnMeshes = new Map<Spawn, THREE.Mesh>();
  const spawnRoot = new THREE.Group(); group.add(spawnRoot);
  const spawnGeo = new THREE.OctahedronGeometry(0.16);

  // lanterns
  const lanternMeshes = new Map<number, THREE.Mesh>();
  const lanternRoot = new THREE.Group(); group.add(lanternRoot);
  const lanternGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.3, 10);
  const lanternPos = (i: number) => {
    const p = slotPos(i);
    return new THREE.Vector3(p.x / TS, 2.6 + (GROVE.y - p.y) / TS * 0.9, GROVE.y / TS - 1.2 - (GROVE.y - p.y) / TS * 0.15);
  };

  return {
    group,
    update(t) {
      const now = Date.now();
      nodeLayer.update(t);
      barrierLayer.update(t);
      // plots
      const seen = new Set<string>();
      for (let y = gp.y0; y <= gp.y1; y++) for (let x = gp.x0; x <= gp.x1; x++) {
        const k = `${x},${y}`, p = state.plots[k];
        if (!p) continue;
        seen.add(k);
        const wet = p.wetUntil > now, stage = p.crop ? stageOf(p) : -1;
        const sig = `${p.crop}|${stage}|${wet}`;
        let rec = plotMeshes.get(k);
        if (!rec || rec.sig !== sig) {
          if (rec) plotsRoot.remove(rec.obj);
          const obj = new THREE.Group();
          obj.position.set(x + 0.5, tileHeight(x, y), y + 0.5);
          obj.add(box(0.88, 0.08, 0.88, wet ? '#c48f8a' : PALETTE.wood, 0, 0.04, 0));
          if (p.crop) { const c = createCrop(p.crop, stage); c.position.y = 0.08; obj.add(c); }
          plotsRoot.add(obj);
          rec = { sig, obj }; plotMeshes.set(k, rec);
        }
      }
      for (const [k, rec] of plotMeshes) if (!seen.has(k)) { plotsRoot.remove(rec.obj); plotMeshes.delete(k); }

      // decor
      const dseen = new Set<string>();
      for (const d of state.decor) {
        const k = `${d.id}@${d.x},${d.y}`;
        dseen.add(k);
        if (!decorMeshes.has(k)) {
          const m = createDecor(d.id); m.position.set(d.x + 0.5, tileHeight(d.x, d.y), d.y + 0.5);
          decorRoot.add(m); decorMeshes.set(k, m);
        }
      }
      for (const [k, m] of decorMeshes) if (!dseen.has(k)) { decorRoot.remove(m); decorMeshes.delete(k); }

      // collectibles
      const sset = new Set(state.spawns);
      for (const s of state.spawns) {
        let m = spawnMeshes.get(s);
        if (!m) {
          m = new THREE.Mesh(spawnGeo, s.item === 'moth' ? mat(SPAWN_COLOR.moth, PALETTE.lampGlow, 'lamp') : mat(SPAWN_COLOR[s.item] ?? '#ffffff'));
          m.castShadow = s.item !== 'moth';
          spawnRoot.add(m); spawnMeshes.set(s, m);
        }
        m.position.set(s.x / TS, tileHeight(Math.floor(s.x / TS), Math.floor(s.y / TS)) + 0.35 + Math.sin(t * 2.5 + s.x) * 0.06 + (s.item === 'moth' ? 0.25 : 0), s.y / TS);
        m.rotation.y = t * 1.5;
      }
      for (const [s, m] of spawnMeshes) if (!sset.has(s)) { spawnRoot.remove(m); spawnMeshes.delete(s); }

      // lanterns (settled + flying)
      const flying = new Map(flyers.map((f) => [f.id, f]));
      const lseen = new Set<number>();
      state.lanterns.forEach((l, i) => {
        lseen.add(l.id);
        let m = lanternMeshes.get(l.id);
        if (!m) {
          const meta = LANTERN_KINDS.find((k) => k.id === l.kind)!;
          m = new THREE.Mesh(lanternGeo, toon(meta.top, { emissive: meta.bottom, glow: 'lamp' })); // paper by day, HDR glow (bloom) at night
          lanternRoot.add(m); lanternMeshes.set(l.id, m);
        }
        const to = lanternPos(i), f = flying.get(l.id);
        if (f) {
          const k = f.t / FLIGHT, e = k * k * (3 - 2 * k);
          m.position.set(f.sx / TS + (to.x - f.sx / TS) * e, (1.2 + (to.y - 1.2) * e) + Math.sin(k * Math.PI) * 1.5, f.sy / TS + (to.z - f.sy / TS) * e);
        } else m.position.copy(to).y += Math.sin(t * 1.6 + i) * 0.05;
      });
      for (const [id, m] of lanternMeshes) if (!lseen.has(id)) { lanternRoot.remove(m); lanternMeshes.delete(id); }
    },
  };
}
