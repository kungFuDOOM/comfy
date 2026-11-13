// Renders trailer frames from tools/trailer/driver.ts through a headless Chromium (software WebGL).
//   node tools/trailer/capture.cjs scout <outDir> [w h]          one still per shot (mid-point) for framing
//   node tools/trailer/capture.cjs frames <outDir> <shotIds,...> [fps w h]   every frame of the listed shots
// Needs the dev server: npx vite --port 5173
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.TRAILER_URL || 'http://localhost:5173/comfy/';

// Freeze the page's own clock and animation loops; the capture script decides when a frame happens.
const CLOCK = `(() => {
  let vt = 0, id = 0, q = new Map();
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { id++; q.set(id, cb); return id; };
  window.cancelAnimationFrame = (i) => { q.delete(i); };
  let seed = 1234567;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const save = { v: 1, seenIntro: true, seenHelp: true, unlocked: { blossom: true, pond: true, meadow: true, lighthouse: true, farbeach: true }, mapV: 2,
    events: { twinkle: { counters: { tree1: 1, tree2: 3, tree3: 1 }, claimed: [], flags: {} } } };
  try { localStorage.setItem('comfy.save.v1', JSON.stringify(save)); localStorage.setItem('comfy.settings.v1', JSON.stringify({ music: 0, sfx: 0 })); } catch {}
})();`;

async function open(w, h, query = '') {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.addInitScript(CLOCK);
  await page.goto(BASE + (query ? query + '&' : '?') + 'scene=game');
  await page.waitForFunction(() => document.getElementById('game'));
  await page.waitForTimeout(1500);
  const shots = await page.evaluate(async () => {
    const d = await import('/comfy/tools/trailer/driver.ts');
    window.__driver = d;
    return d.setup();
  });
  return { browser, page, shots };
}

async function grab(page, id, t, fps, file) {
  const url = await page.evaluate(([id, t, fps]) => { window.__driver.render(id, t, fps); return document.getElementById('game').toDataURL('image/png'); }, [id, t, fps]);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}

(async () => {
  const [mode, outDir, ...rest] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  if (mode === 'scout') {
    const w = Number(rest[0] || 960), h = Number(rest[1] || 540);
    const only = rest[2] ? rest[2].split(',') : null;
    let cur = { ...(await open(w, h)), query: '' };
    for (const s0 of cur.shots) {
      if (only && !only.includes(s0.id)) continue;
      if (s0.query !== cur.query) { await cur.browser.close(); cur = { ...(await open(w, h, s0.query)), query: s0.query }; }
      const s = s0, page = cur.page;
      // warm up the shot (particles, wandering) at a low frame rate, then grab start / middle / end
      const marks = [0.05, s.dur / 2, s.dur - 0.05];
      let t = 0;
      for (const [i, m] of marks.entries()) {
        while (t < m - 0.25) { await page.evaluate(([id, t]) => window.__driver.render(id, t, 4), [s.id, t]); t += 0.25; }
        t = m;
        await grab(page, s.id, m, 4, path.join(outDir, `${s.id}-${i}.png`));
        console.log('scouted', s.id, m.toFixed(2));
      }
    }
    await cur.browser.close();
    return;
  }
  if (mode === 'frames') {
    const ids = rest[0].split(',');
    const fps = Number(rest[1] || 24), w = Number(rest[2] || 1280), h = Number(rest[3] || 720);
    // shots that need a different page query (seasonal events) get their own page load
    let cur = { ...(await open(w, h)), query: '' };
    for (const id of ids) {
      let s = cur.shots.find((x) => x.id === id);
      if (s.query !== cur.query) {
        await cur.browser.close();
        cur = { ...(await open(w, h, s.query)), query: s.query };
        s = cur.shots.find((x) => x.id === id);
      }
      const { page } = cur;
      const n = Math.ceil(s.dur * fps) + 1; // a frame of slack: the edit trims to the bar line
      const dir = path.join(outDir, id);
      fs.mkdirSync(dir, { recursive: true });
      const t0 = Date.now();
      for (let i = 0; i < n; i++) {
        const file = path.join(dir, `f${String(i).padStart(4, '0')}.png`);
        await grab(page, id, i / fps, fps, file);
        if (i % 24 === 0) console.log(id, i, '/', n, ((Date.now() - t0) / (i + 1) / 1000).toFixed(2) + 's/frame');
      }
    }
    await cur.browser.close();
  }
})();
