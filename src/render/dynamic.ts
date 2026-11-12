// State-driven objects: garden plots, placed decor, collectibles, grove lanterns. Synced from game state each frame.
import * as THREE from 'three';
import { stageOf } from '../garden';
import { FLIGHT, flyers, slotPos } from '../lanterns';
import { LANTERN_KINDS } from '../art/lantern';
import { state, type Spawn } from '../state';
import { AREAS, GROVE, TS } from '../world';
import { contactShadow, PALETTE, toon } from './materials';
import { ball, box, cyl, mat } from './util';
import { tileHeight } from './terrain';
import { createNodeLayer } from './nodes3d';
import { createBarriers } from './barriers';

const SPAWN_COLOR: Record<string, string> = { shell: '#ffe0d0', blossom: '#ff9ec0', moth: '#fff3a8', button: '#ffffff', pumpkin: '#ffa763', apple: '#ff7f93', ornament: '#ff9ec0' };

/** Placeholder decor models keyed by item id. */
export function createDecor(id: string): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    case 'd_pouf': g.add(cyl(0.35, 0.38, 0.4, '#ffb3cf', 0, 0.2, 0)); break;
    case 'd_rug': g.add(box(0.92, 0.04, 0.92, '#f9deb0', 0, 0.03, 0)); break;
    case 'd_lamp': g.add(cyl(0.04, 0.05, 0.9, PALETTE.wood, 0, 0.45, 0)); g.add(cyl(0.2, 0.3, 0.3, mat('#ffe6ef', PALETTE.lampGlow, 'lamp'), 0, 0.95, 0)); break;
    case 'd_shelf': g.add(box(0.6, 1.0, 0.3, '#ffc3da', 0, 0.5, 0)); break;
    case 'd_teacup': g.add(cyl(0.28, 0.2, 0.3, '#ffffff', 0, 0.15, 0)); g.add(ball(0.2, '#ff9ec0', 0, 0.35, 0)); break;
    case 'd_chair': g.add(box(0.6, 0.4, 0.6, '#f9deb0', 0, 0.2, 0)); g.add(box(0.6, 0.5, 0.12, '#f9deb0', 0, 0.65, -0.24)); break;
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
    default: g.add(ball(0.3, '#ffb3cf', 0, 0.3, 0));
  }
  if (id !== 'd_rug') g.add(contactShadow(0.9));
  return g;
}

function createCrop(crop: string, stage: number): THREE.Group {
  const g = new THREE.Group();
  const h = [0.15, 0.3, 0.42, 0.5][stage];
  g.add(cyl(0.025, 0.03, h, '#7fcf8e', 0, h / 2, 0, 6));
  g.add(ball(0.1, '#8fe0a0', -0.1, h * 0.6, 0, 6)); g.add(ball(0.1, '#8fe0a0', 0.1, h * 0.8, 0, 6));
  if (stage >= 2) g.add(ball(0.08, crop === 'puffberry' ? '#ffc2da' : '#f5f5f5', 0, h + 0.05, 0, 6));
  if (stage === 3) g.add(ball(0.17, crop === 'puffberry' ? '#ff8fb6' : '#ffffff', 0, h + 0.08, 0, 8));
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
