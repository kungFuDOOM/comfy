import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import { loadGame } from './save';
import { bootWithMenu } from './boot';
import { startIntroCutscene } from './cutscene/intro';
import { startGame } from './game';

loadGame();
// Preview hooks until the title flow becomes the default boot:
//   ?scene=menu  -> main menu (New Game plays the intro, Continue starts play)
//   ?scene=intro -> the arrival cutscene, then play
const scene = new URLSearchParams(location.search).get('scene');
if (scene === 'menu') bootWithMenu();
else if (scene === 'intro') startIntroCutscene(startGame);
else startGame();
