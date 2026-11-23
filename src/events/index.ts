// Every seasonal event, registered. Add a new event by writing its module (see harvest.ts) and importing it here.
import '../ui/events.css';
import './harvest';
import './twinkle';
import './petalpicnic';
import './shoredays';
import './costumenight';
import './warmcup';
import './newyear';

export { startFeast, feastPlaying } from './feast';
export { openPieBake, canBakePie } from './pieBake';
export { startGathering, gatheringPlaying } from './gathering';
export { openCookieBake } from './cookieBake';
export { queueTreeLighting, startTreeLighting, treeLightingDue, treeLightingPlaying } from './treeLighting';
export { startFirstSnowfall, firstSnowfallDue, firstSnowfallPlaying, maybeStartFirstSnowfall } from './firstSnowfall';
export { startFirstPie, firstPieDue, firstPiePlaying, maybeStartFirstPie } from './firstPie';
export { startNewYear, newYearPlaying, maybeStartNewYear } from './newYearScene';
export { startGoldenPie, goldenPieDue, goldenPiePlaying, queueGoldenPie } from './goldenPie';
