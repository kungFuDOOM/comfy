// Title flow: main menu -> (New Game -> intro cutscene) -> gameplay. main.ts uses this for ?scene=menu;
// make it the default boot when the menu should be the first screen.
import { shouldPlayIntro, startIntroCutscene } from './cutscene/intro';
import { startGame } from './game';
import { hasSave, newGame } from './save';
import { fadeTo } from './ui/fade';
import { startMainMenu, stopMainMenu } from './ui/mainMenu';
import { openConfirmNewGame } from './ui/menuPanels';

let leaving = false;
async function leave(next: () => void) {
  if (leaving) return;
  leaving = true;
  await fadeTo(1, 450);
  stopMainMenu();
  next();
  leaving = false;
}

export function bootWithMenu() {
  startMainMenu({
    onContinue: () => leave(() => { startGame(); void fadeTo(0, 600); }),
    onNewGame: () => {
      const go = () => leave(() => { newGame(); startIntroCutscene(startGame); });
      if (hasSave()) openConfirmNewGame(go); else go();
    },
  });
}

/** Straight into play, showing the arrival first on a save that has not seen it. */
export function bootIntoGame() {
  if (shouldPlayIntro()) startIntroCutscene(startGame);
  else startGame();
}
