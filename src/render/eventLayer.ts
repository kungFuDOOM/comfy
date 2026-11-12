// Seasonal event decorations in the 3D world. Builds each active event's EventWorld once when it starts, drops it
// (and frees its GPU memory) when the event ends, and lets it animate every frame.
import * as THREE from 'three';
import { getActiveEvents, type EventDef } from '../events';

export interface EventLayer { group: THREE.Group; update(t: number): void }

function dispose(o: THREE.Object3D) {
  o.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose();
    }
  });
}

export function createEventLayer(): EventLayer {
  const group = new THREE.Group();
  const built = new Map<string, { def: EventDef; obj: THREE.Group }>();
  let sig = '', checkAt = 0;

  return {
    group,
    update(t) {
      // look at the calendar twice a second, not every frame
      if (t >= checkAt || t < checkAt - 2) {
        checkAt = t + 0.5;
        const active = getActiveEvents().filter((e) => e.world);
        const next = active.map((e) => e.id).join(',');
        if (next !== sig) {
          sig = next;
          for (const [id, rec] of built) if (!active.some((e) => e.id === id)) { group.remove(rec.obj); dispose(rec.obj); built.delete(id); }
          for (const e of active) if (!built.has(e.id)) { const obj = e.world!.build(); group.add(obj); built.set(e.id, { def: e, obj }); }
        }
      }
      for (const rec of built.values()) rec.def.world?.update?.(t);
    },
  };
}
