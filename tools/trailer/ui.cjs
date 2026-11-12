// Captures real game UI for the trailer: the Journal's Skills tab (over a rendered frame) and level-up stickers
// (transparent PNGs).   node tools/trailer/ui.cjs <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.TRAILER_URL || 'http://localhost:5173/comfy/';
const CLOCK = `(() => { let vt = 0; performance.now = () => vt; window.__raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = () => 0;
  const xp = (lv) => { let t = 0; for (let l = 1; l < lv; l++) t += Math.round(40 * l ** 1.6); return t; };
  const save = { v: 1, seenIntro: true, seenHelp: true, mapV: 2, coins: 1240,
    unlocked: { blossom: true, pond: true, meadow: true, lighthouse: true, farbeach: true },
    skills: { foraging: xp(12) + 260, fishing: xp(9) + 120, gardening: xp(7) + 60, baking: xp(10) + 300, brewing: xp(14) + 90, crafting: xp(8) + 200 } };
  localStorage.setItem('comfy.save.v1', JSON.stringify(save)); localStorage.setItem('comfy.settings.v1', JSON.stringify({ music: 0, sfx: 0 })); })();`;

(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.addInitScript(CLOCK);
  await page.goto(BASE + '?scene=game&input=keyboard');
  await page.waitForTimeout(2500);

  if (process.argv[3] === 'stickers') return stickers(page, out, browser);
  // 1) Skills tab over a frame of the town at golden hour
  await page.evaluate(async () => {
    const d = await import('/comfy/tools/trailer/driver.ts');
    d.setup();
    document.body.classList.remove('scene', 'scene-cutscene');
    d.render('cafe', 3.2);
    const p = await import('/comfy/src/ui/panels.ts');
    p.openJournal('skills');
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, 'skills.png'), timeout: 180000 });

  await stickers(page, out, browser);
})();

async function stickers(page, out, browser) {
  // level-up stickers on a transparent page
  await page.evaluate(async () => {
    const dom = await import('/comfy/src/ui/dom.ts');
    dom.closePanel?.();
    document.getElementById('game').style.visibility = 'hidden';
    for (const el of document.querySelectorAll('#ui > *')) el.style.display = 'none';
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    window.requestAnimationFrame = window.__raf; // the screenshot needs a real frame; the game loop is already parked
  });
  for (const [id, level] of [['foraging', 5], ['fishing', 4]]) {
    await page.evaluate(async ([id, level]) => {
      const { bus } = await import('/comfy/src/bus.ts');
      const lv = await import('/comfy/src/ui/levelUp.ts');
      lv.dismissLevelUp?.();
      bus.emit('levelup', { id, level, gained: 1 });
    }, [id, level]);
    await page.waitForTimeout(900); // let the hop-in settle (CSS animations run on the real clock)
    await page.screenshot({ path: path.join(out, `levelup-${id}.png`), omitBackground: true, timeout: 180000 });
    await page.waitForTimeout(3500);
  }
  await browser.close();
}
