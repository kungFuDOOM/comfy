// Renders the trailer's captions, title and end card as transparent 1920x1080 PNGs (HTML + the game's Fredoka font).
//   node tools/trailer/overlays.cjs <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { captions } = require('./timeline.cjs');

// embedded as data URLs: a setContent page cannot load file:// fonts
const font = (w) => 'data:font/woff2;base64,' + fs.readFileSync(path.resolve(__dirname, `../../node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`)).toString('base64');
const BELL = `<svg viewBox="0 0 100 100" width="W" height="W"><path d="M50 10c3 0 5 2 5 5v3c13 3 21 14 21 28v14l8 12H16l8-12V46c0-14 8-25 21-28v-3c0-3 2-5 5-5z" fill="#ffd98a" stroke="#ff8fb6" stroke-width="5" stroke-linejoin="round"/><circle cx="50" cy="80" r="8" fill="#ff8fb6"/><path d="M37 40c2-7 7-11 13-12" stroke="#fff6dc" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;

const css = `
@font-face { font-family: Fredoka; font-weight: 600; src: url(${font(600)}); }
@font-face { font-family: Fredoka; font-weight: 700; src: url(${font(700)}); }
html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; font-family: Fredoka, sans-serif; }
.story { position: absolute; left: 0; right: 0; bottom: 150px; text-align: center; color: #fff; font-weight: 600; font-size: 60px; letter-spacing: 0.5px;
  text-shadow: 0 3px 22px rgba(110, 30, 75, .65), 0 0 3px rgba(110, 30, 75, .8), 0 2px 0 rgba(150, 60, 100, .5); }
.feature { position: absolute; left: 96px; bottom: 92px; display: flex; align-items: center; gap: 18px; padding: 22px 44px 24px 34px; border-radius: 999px;
  background: #fff7fa; border: 6px solid #ffb3cf; color: #b04a78; font-weight: 700; font-size: 50px; transform: rotate(-1.6deg);
  box-shadow: 0 12px 34px rgba(150, 50, 95, .3), inset 0 -6px 0 #ffe3ee; }
.feature.right { left: auto; right: 110px; bottom: 120px; transform: rotate(1.6deg); }
.feature .flower { color: #ff8fb6; font-size: 46px; }
.logo { font-weight: 700; color: #ff7fae; -webkit-text-stroke: 22px #fff; paint-order: stroke fill; letter-spacing: 2px; line-height: 1;
  filter: drop-shadow(0 10px 18px rgba(150, 50, 95, .45)); }
.glow { position: absolute; inset: 0; background: radial-gradient(ellipse 46% 40% at 50% 50%, rgba(255, 246, 250, .55) 0%, rgba(255, 246, 250, .25) 55%, rgba(255, 246, 250, 0) 100%); }
.center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.tag { margin-top: 26px; font-weight: 700; font-size: 58px; color: #a8456f; -webkit-text-stroke: 12px #fff; paint-order: stroke fill;
  filter: drop-shadow(0 4px 10px rgba(150, 50, 95, .35)); }
.end-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(60, 20, 50, .38) 0%, rgba(60, 20, 50, .18) 45%, rgba(40, 10, 35, .5) 100%); }
.sub { margin-top: 40px; color: #fff; font-weight: 600; font-size: 42px; text-shadow: 0 2px 14px rgba(90, 20, 60, .7); }
.url { margin-top: 26px; padding: 18px 46px 20px; border-radius: 999px; background: #fff7fa; border: 6px solid #ffb3cf; color: #b04a78; font-weight: 700; font-size: 50px;
  box-shadow: 0 12px 34px rgba(60, 10, 40, .4), inset 0 -6px 0 #ffe3ee; }
.small { margin-top: 26px; color: #ffe6f0; font-weight: 600; font-size: 32px; letter-spacing: 3px; text-shadow: 0 2px 10px rgba(90, 20, 60, .7); }
.bell { margin-bottom: 8px; filter: drop-shadow(0 8px 14px rgba(150, 50, 95, .4)); }
`;

function html(c) {
  if (c.kind === 'story') return `<div class="story">${c.text}</div>`;
  if (c.kind === 'feature') return `<div class="feature ${c.align || ''}"><span class="flower">✿</span>${c.text}</div>`;
  if (c.kind === 'title') return `<div class="glow"></div><div class="center"><div class="bell">${BELL.replace(/W/g, 150)}</div><div class="logo" style="font-size:250px">Hushbell</div><div class="tag">Somewhere soft is waking up.</div></div>`;
  if (c.kind === 'endcard') return `<div class="end-bg"></div><div class="center"><div class="bell">${BELL.replace(/W/g, 120)}</div><div class="logo" style="font-size:200px">Hushbell</div>
    <div class="sub">A cozy island life-sim · free to play in your browser</div><div class="url">kungfudoom.github.io/comfy</div><div class="small">KEYBOARD · CONTROLLER · TOUCH</div></div>`;
  return null;
}

(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const c of captions) {
    const body = html(c);
    if (!body) continue;
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `${c.id}.png`), omitBackground: true });
    console.log('overlay', c.id);
  }
  await browser.close();
})();
