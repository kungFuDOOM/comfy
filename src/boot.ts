// Title flow: main menu -> (New Game -> intro cutscene) -> gameplay. Continue skips the intro.
import { shouldPlayIntro, startIntroCutscene } from './cutscene/intro';
import { bus } from './bus';
import { persist, startGame } from './game';
import { closePanel } from './ui/dom';
import { hasSave, newGame } from './save';
import { fadeTo, setFade } from './ui/fade';
import { startMainMenu, stopMainMenu } from './ui/mainMenu';
import { openConfirmNewGame } from './ui/menuPanels';
import { syncNpcs } from './npc';
import { syncUnlocks } from './unlocks';

let leaving = false;
async function leave(next: () => void) {
  if (leaving) return;
  leaving = true;
  await fadeTo(1, 450);
  stopMainMenu();
  next();
  leaving = false;
}

/** Pause menu -> "Back to title": keep the save, fade out, show the main menu again. Continue resumes without the intro. */
let returning = false;
async function backToTitle() {
  if (returning || leaving) return;
  returning = true;
  persist();
  await fadeTo(1, 450);
  closePanel();
  returning = false;
  bootWithMenu();
}
bus.on('toTitle', () => void backToTitle());

export function bootWithMenu() {
  // open softly: hold the blush cover for the first couple of frames while shaders warm up
  setFade(1);
  requestAnimationFrame(() => requestAnimationFrame(() => void fadeTo(0, 700)));
  startMainMenu({
    onContinue: () => leave(() => { startGame(); void fadeTo(0, 600); }),
    onNewGame: () => {
      const go = () => leave(() => { newGame(); syncUnlocks(); syncNpcs(); startIntroCutscene(startGame); });
      if (hasSave()) openConfirmNewGame(go); else go();
    },
  });
}

/** Straight into play, showing the arrival first on a save that has not seen it. */
export function bootIntoGame() {
  if (shouldPlayIntro()) startIntroCutscene(startGame);
  else startGame();
}
