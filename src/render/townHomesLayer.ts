// The little town houses friends move into (townHomes.ts decides which exist). Each cottage is built once, the first time
// it is needed, and then only shown or hidden, so a save without `movedIn` never builds (or draws) a single one.
import * as THREE from 'three';
import { shownHomes } from '../townHomes';
import { TOWN_HOMES } from '../townHomeData';
import { createCottage } from './structures';

export interface TownHomesLayer { group: THREE.Group; update(): void }

export function createTownHomesLayer(): TownHomesLayer {
  const group = new THREE.Group();
  const built = new Map<string, THREE.Group>();
  return {
    group,
    update() {
      const show = new Set(shownHomes());
      for (const id of show) {
        if (built.has(id)) continue;
        const obj = createCottage(TOWN_HOMES[id]);
        built.set(id, obj); group.add(obj);
      }
      for (const [id, obj] of built) obj.visible = show.has(id);
    },
  };
}
