// Every villager's voice, keyed by villager id (save ids stay stable across renames: Dottie is `zuzu`).
import type { Voice } from '../types';
import { bramble } from './bramble';
import { brioche } from './brioche';
import { marlo } from './marlo';
import { mimsy } from './mimsy';
import { nimbus } from './nimbus';
import { oolie } from './oolie';
import { tuppi } from './tuppi';
import { zuzu } from './zuzu';

export const VOICES: Record<string, Voice> = { mimsy, zuzu, bramble, nimbus, brioche, oolie, tuppi, marlo };
