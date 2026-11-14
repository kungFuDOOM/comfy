import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import './ui/toast';
import './ui/levelUp';
import { bootCutscenePreview, bootIntoGame, bootWithMenu } from './boot';
import { initAudio } from './audio';
import { startIntroCutscene } from './cutscene/intro';
import { cutsceneParam } from './cutscene/presets';
import { startGame } from './game';
import { initDevices } from './input';
import { loadGame } from './save';

loadGame();
initAudio(); // unlocks on the first gesture; nothing plays before that
initDevices(); // prompt glyphs + gamepad hot-plug from the very first screen

// The game opens on the main menu. Shortcuts for testing:
//   ?scene=game  -> straight into play (a brand-new save still gets its arrival first)
//   ?scene=intro -> replay the arrival cutscene, then play
//   ?cutscene=<id> -> straight into play and preview that scene (harvest-feast, christmas-eve, christmas-day); wins over ?scene=
const scene = new URLSearchParams(location.search).get('scene');
if (cutsceneParam) bootCutscenePreview(cutsceneParam);
else if (scene === 'game') bootIntoGame();
else if (scene === 'intro') startIntroCutscene(startGame);
else bootWithMenu();
