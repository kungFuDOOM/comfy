// Renders the soundtrack (tools/trailer/audio.ts) to a WAV.   node tools/trailer/audio.cjs <out.wav>
const { chromium } = require('playwright');
const fs = require('fs');
const { music, cues, END } = require('./timeline.cjs');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto((process.env.TRAILER_URL || 'http://localhost:5173/comfy/') + '?scene=game');
  await page.waitForTimeout(1000);
  const b64 = await page.evaluate(async ([dur, music, cues]) => {
    const a = await import('/comfy/tools/trailer/audio.ts');
    return a.renderSoundtrack(dur, music, cues);
  }, [END + 0.5, music, cues]);
  fs.writeFileSync(process.argv[2], Buffer.from(b64, 'base64'));
  console.log('wrote', process.argv[2]);
  await browser.close();
})();
