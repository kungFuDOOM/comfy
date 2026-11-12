// Seasonal event decorations in the 3D world. Builds each active event's EventWorld once when it starts, drops it
// (and frees its GPU memory) when the event ends, and lets it animate every frame.
import * as THREE from 'three';
import { eventDay, getActiveEvents, type EventDef } from '../events';
import { contactGeometry, releaseMaterial } from './materials';
import { forgetLabel } from './util';

export interface EventLayer { group: THREE.Group; update(t: number): void }

function dispose(o: THREE.Object3D) {
  o.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (mesh.isMesh) {
      // the decal plane is shared by every light pool and contact shadow on the island: never free it
      if (mesh.geometry !== contactGeometry) mesh.geometry?.dispose();
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose();
      // one-off light pool / sign materials (cached toon materials are shared and stay)
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mt of mats) { const map = (mt as THREE.MeshBasicMaterial)?.map; if (map) forgetLabel(map); }
      if (mesh.material) releaseMaterial(mesh.material);
    }
  });
}

export function createEventLayer(): EventLayer {
  const group = new THREE.Group();
  const built = new Map<string, { def: EventDef; obj: THREE.Group; sig: string }>();
  let sig = '', builtDay = '', checkAt = 0;

  return {
    group,
    update(t) {
      // look at the calendar twice a second, not every frame. A world is rebuilt when its event starts or stops, when the
      // calendar day changes (weekly chapters, ?date=) or when the world's own signature changes (a decorated tree).
      if (t >= checkAt || t < checkAt - 2) {
        checkAt = t + 0.5;
        const active = getActiveEvents().filter((e) => e.world);
        const sigs = new Map(active.map((e) => [e.id, e.world!.signature?.() ?? '']));
        const day = eventDay().toDateString();
        const next = active.map((e) => `${e.id}:${sigs.get(e.id)}`).join(',') + '|' + day;
        if (next !== sig) {
          sig = next;
          const dayChanged = day !== builtDay;
          for (const [id, rec] of built) {
            if (active.some((e) => e.id === id) && sigs.get(id) === rec.sig && !dayChanged) continue;
            group.remove(rec.obj); dispose(rec.obj); built.delete(id);
          }
          for (const e of active) if (!built.has(e.id)) { const obj = e.world!.build(); group.add(obj); built.set(e.id, { def: e, obj, sig: sigs.get(e.id)! }); }
          builtDay = day;
        }
      }
      for (const rec of built.values()) rec.def.world?.update?.(t);
    },
  };
}
