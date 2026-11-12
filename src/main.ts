import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import './ui/toast';
import './ui/levelUp';
import { bootIntoGame, bootWithMenu } from './boot';
import { initAudio } from './audio';
import { startIntroCutscene } from './cutscene/intro';
import { startGame } from './game';
import { initDevices } from './input';
import { loadGame } from './save';

loadGame();
initAudio(); // unlocks on the first gesture; nothing plays before that
initDevices(); // prompt glyphs + gamepad hot-plug from the very first screen

// The game opens on the main menu. Shortcuts for testing:
//   ?scene=game  -> straight into play (a brand-new save still gets its arrival first)
//   ?scene=intro -> replay the arrival cutscene, then play
const scene = new URLSearchParams(location.search).get('scene');
if (scene === 'game') bootIntoGame();
else if (scene === 'intro') startIntroCutscene(startGame);
else bootWithMenu();
