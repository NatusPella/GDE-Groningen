// Steam store images for GDE Groningen (docs/steam/winkelpagina.md):
//   nice -n 10 node scripts/steam_images.mjs              capture + compose
//   nice -n 10 node scripts/steam_images.mjs --compose    only the capsules, from the saved renders
//   nice -n 10 node scripts/steam_images.mjs --capture [--only=vismarkt,ring]
// One dev server (scripts/devserver.py) and one headless Chrome, both killed
// at the end. The renders come from the trailer (?trailer, held with
// window.__trailer.freeze) and from a short game session (window.__story.jump, __heliRun) for the HUD
// shots. Output: docs/steam/beelden/ (screenshots as JPEG q90 at 1920x1080,
// capsules as PNG; the in-game key-art renders in bron/ as JPEG). The capsule
// layouts are HTML/CSS with the real wordmark (game/index.html .gde-logo) and
// the game's own fonts (game/fonts, OFL, zeefdruk ADR 0040), so no network is needed.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/steam/beelden');
const SHOTS_DIR = path.join(OUT, 'screenshots');
const SRC_DIR = path.join(OUT, 'bron');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.STEAM_PORT || 8797);
const IS_MAIN = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const doCapture = flag('--capture') || !flag('--compose');
const doCompose = flag('--compose') || !flag('--capture');

// Trailer shots (1-based, docs/verhaal/E-trailer.md) held at t seconds.
// key: also rendered at 3840x2160 into bron/ for the capsules.
const TRAILER = [
  { name: 'vismarkt', shot: 3, t: 0.9, key: true },
  { name: 'ringrace', shot: 13, t: 2.4 },
  { name: 'kermis', shot: 19, t: 2.6 },
  { name: 'rondvaart', shot: 17, t: 2.6 },
  { name: 'achtervolging', shot: 12, t: 1.2 },
  { name: 'duif', shot: 10, t: 2.2 },
  { name: 'luchtfoto', shot: 22, t: 3.6, key: true },
  { name: 'zonsopgang', shot: 2, t: 3.4, key: true, only: 'key' },
];
// the published screenshot order (Steam shows the first ones first)
const ORDER = ['missie-hud', 'vismarkt', 'ringrace', 'heli-hud', 'kermis', 'luchtfoto', 'ommeland', 'rondvaart', 'achtervolging', 'duif'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const want = (n) => !ONLY.length || ONLY.includes(n);

// ---------- a minimal CDP client ----------
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const ready = new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ready, send, on: (f) => listeners.add(f), close: () => ws.close() };
}

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-steam-chrome-'));
  const server = spawn('python3', [path.join(ROOT, 'scripts/devserver.py'), String(PORT), path.join(ROOT, 'game')], { stdio: 'ignore' });
  const chrome = spawn(CHROME, [
    '--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0',
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--window-size=1920,1080', 'about:blank',
  ], { stdio: 'ignore' });
  const kill = () => {
    try { chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
    try { server.kill('SIGKILL'); } catch (e) { /* gone */ }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(130); });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(150);
    try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { /* not yet */ }
  }
  if (!port) { kill(); throw new Error('Chrome did not start'); }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  const c = cdp(page.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  c.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') console.log('  [page error]', (m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('  [console]', m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200));
  });
  return { c, kill };
}

async function evaluate(c, expr, timeout = 120000) {
  const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text);
  return r.result.value;
}
async function waitFor(c, expr, ms = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evaluate(c, expr)) return true; } catch (e) { /* not yet */ }
    await sleep(400);
  }
  throw new Error('timeout: ' + expr);
}
async function viewport(c, w, h, dpr = 1) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: false });
}
async function goto(c, url) {
  await c.send('Page.navigate', { url });
  await waitFor(c, 'document.readyState === "complete"', 60000);
}
async function shoot(c, file, { jpeg = false, w, h } = {}) {
  const r = await c.send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 90 } : { format: 'png' , ...(w ? { clip: { x: 0, y: 0, width: w, height: h, scale: 1 } } : {}) });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log('  ->', path.relative(ROOT, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
}
// n animation frames in the page (the trailer steps 1/60 s per frame)
const frames = (c, n) => evaluate(c, `new Promise((res) => { let k = 0; const f = () => (++k >= ${n} ? res(k) : requestAnimationFrame(f)); requestAnimationFrame(f); })`, 600000);

// fixed settings for the renders: the High preset, no dynamic resolution
const SETTINGS_INIT = `try {
  if (!sessionStorage.getItem('steam-init')) {
    sessionStorage.setItem('steam-init', '1');
    localStorage.clear();
    localStorage.setItem('gde-settings', JSON.stringify({ quality: 'hoog', shadows: true, drawDistance: 'ver', resolution: 1, autoResolution: false, showHints: false, v: 6 }));
    localStorage.setItem('gde-gfx-advice', 'done');
    localStorage.setItem('gde-muted', '1');
  }
} catch (e) {}`;
const CLEAN_TRAILER_CSS = `#trailer .tr-card, #trailer .tr-name, #trailer .tr-sub, #trailer .tr-bar, #trailer .tr-freeze, #trailer .tr-skip, #trailer .tr-fps, #trailer .tr-flash { display: none !important; }`;

async function captureTrailer(c) {
  const list = TRAILER.filter((s) => want(s.name));
  if (!list.length) return;
  console.log('trailer renders');
  await viewport(c, 1920, 1080, 1);
  await goto(c, `http://127.0.0.1:${PORT}/?trailer&stil`);
  await waitFor(c, '!!window.__trailer', 240000);
  await evaluate(c, `(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(CLEAN_TRAILER_CSS)}; document.head.appendChild(s); return true; })()`);
  for (const s of list) {
    for (const pass of s.only === 'key' ? ['key'] : s.key ? ['shot', 'key'] : ['shot']) {
      await viewport(c, 1920, 1080, pass === 'key' ? 2 : 1);
      await evaluate(c, `window.__trailer.freeze(${s.shot}, ${s.t})`);
      // play up to t at 1/60 s per frame, then let streaming and shadows settle
      await frames(c, Math.ceil(s.t * 60) + 90);
      await sleep(2500);
      await frames(c, 30);
      if (pass === 'key') await shoot(c, path.join(SRC_DIR, `${s.name}.jpg`), { jpeg: true });
      else await shoot(c, path.join(SHOTS_DIR, `${s.name}.jpg`), { jpeg: true });
    }
  }
  await viewport(c, 1920, 1080, 1);
}

// A short game session for the shots with the HUD.
async function captureGame(c) {
  const need = ['missie-hud', 'ommeland', 'heli-hud'].filter(want);
  if (!need.length) return;
  console.log('game renders');
  await viewport(c, 1920, 1080, 1);
  await goto(c, `http://127.0.0.1:${PORT}/?stil`);
  await waitFor(c, '!!document.querySelector("#start-screen .ss-item")', 240000);
  await sleep(1500);
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  // skip the opening trailer and every scene until it is quiet
  await evaluate(c, `(async () => {
    const cine = await import('/js/cinematics.js');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const t0 = performance.now();
    let quiet = performance.now();
    while (performance.now() - t0 < 120000) {
      const started = document.body.classList.contains('game-started');
      if (!started) { window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' })); quiet = performance.now(); }
      if (cine.isCinematicActive()) { cine.skipCinematic(); quiet = performance.now(); }
      if (started && performance.now() - quiet > 2500) return true;
      await sleep(150);
    }
    return false;
  })()`, 180000);
  await evaluate(c, `(() => { const w = window.__debug.world; w.devInvuln = true; return true; })()`);
  for (const n of need) {
    if (n === 'missie-hud') await missionShot(c);
    if (n === 'ommeland') await ommelandShot(c);
    if (n === 'heli-hud') await heliShot(c);
  }
}

// on foot on the Grote Markt with the story objective in the HUD
async function missionShot(c) {
  const ok = await evaluate(c, `(async () => {
    const w = window.__debug.world, p = w.player, S = window.__story;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const cine = await import('/js/cinematics.js');
    S.jump(${JSON.stringify(process.env.STEAM_STEP || 'M03')});
    for (let i = 0; i < 40; i++) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(150); }
    w.clock = 16.2;
    const g = w.storyGuide;
    if (p.inVehicle) p.exitVehicle(w.map, w);
    // across the Grote Markt from the yellow marker, facing it
    const { P } = await import('/js/worldframe.js');
    const [cx, cy] = P(200, 95), [fx, fy] = P(204, 113);
    const gx = g ? g.x : fx, gy = g ? g.y : fy;
    const d = Math.hypot(cx - gx, cy - gy) || 1;
    const tx = gx + (cx - gx) / d * 30, ty = gy + (cy - gy) / d * 30;
    const s = w.map.findOpenSpawn ? (w.map.findOpenSpawn(tx, ty, 40) || { x: tx, y: ty }) : { x: tx, y: ty };
    p.x = s.x; p.y = s.y;
    p.angle = Math.atan2(gy - p.y, gx - p.x); w.camYaw = p.angle;
    // the first-meeting name card and the phone settle first
    for (let i = 0; i < 100; i++) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(150); }
    p.angle = Math.atan2(gy - p.y, gx - p.x); w.camYaw = p.angle;
    await sleep(1500);
    return JSON.stringify({ step: S.current(), guide: g && [g.x, g.y] });
  })()`, 120000);
  console.log('  mission', ok);
  await frames(c, 30);
  await shoot(c, path.join(SHOTS_DIR, 'missie-hud.jpg'), { jpeg: true });
}

// on foot just outside an Ommeland village at sunset, still with the HUD
async function ommelandShot(c) {
  const ok = await evaluate(c, `(async () => {
    const w = window.__debug.world;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const vs = window.__ommeland.villages();
    const v = vs.find((q) => q.name === ${JSON.stringify(process.env.STEAM_VILLAGE || '')}) || vs[0];
    const [x, y] = v.st;
    window.__ommeland.go(x + 40, y + 40);
    w.clock = 19.35;
    await sleep(14000);
    return v.name;
  })()`, 120000);
  console.log('  ommeland', ok);
  await frames(c, 30);
  await shoot(c, path.join(SHOTS_DIR, 'ommeland.jpg'), { jpeg: true });
}

// the balloon hunt in the heli over Stad, on autopilot, with its HUD
async function heliShot(c) {
  const ok = await evaluate(c, `(async () => {
    const w = window.__debug.world;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const cine = await import('/js/cinematics.js');
    w.clock = 18.2;
    window.__heliRun.start('ballonjacht');
    window.__heliRun.autopilot = true;
    for (let i = 0; i < 120; i++) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(150); }
    return JSON.stringify(window.__heliRun.state && Object.keys(window.__heliRun.state() || {}));
  })()`, 120000);
  console.log('  heli', ok);
  await frames(c, 30);
  await shoot(c, path.join(SHOTS_DIR, 'heli-hud.jpg'), { jpeg: true });
}

// ---------- compositions ----------
const FONT_FILES = [['Atkinson Hyperlegible', 400, 'AtkinsonHyperlegible-Regular.ttf'], ['Atkinson Hyperlegible', 700, 'AtkinsonHyperlegible-Bold.ttf'], ['Barlow Condensed', 600, 'BarlowCondensed-SemiBold.ttf'], ['Barlow Condensed', 800, 'BarlowCondensed-ExtraBold.ttf']];
const FONTS = '<style>' + FONT_FILES.map(([fam, w, file]) => `@font-face { font-family: '${fam}'; font-weight: ${w}; src: url('${pathToFileURL(path.join(ROOT, 'game', 'fonts', file)).href}') format('truetype'); }`).join(' ') + '</style>';
// the wordmark as in game/index.html (.gde-logo, zeefdruk sticker), sized by font-size
const LOGO_CSS = `
.gde-logo { display: inline-flex; flex-direction: column; align-items: stretch; text-align: center; font-family: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-weight: 800; line-height: 1; color: #1d1b17;
  padding: 0.07em 0.13em 0.1em; background: #f3ead3; border: 0.035em solid #1d1b17; border-radius: 0.07em; box-shadow: 0.045em 0.045em 0 #1d1b17; }
.gde-logo .gde-mark { line-height: 0.74; padding-top: 0.05em; letter-spacing: 0.01em; color: #0e6b3c; text-shadow: 0.03em 0.03em 0 #e8505b; }
.gde-logo .gde-sign { margin-top: 0.3em; padding: 0.2em 0.5em 0.12em; font-size: 0.25em; font-weight: 800; letter-spacing: 0.09em; text-indent: 0.09em; text-transform: uppercase; color: #1d1b17; background: #f9c80e; border: 0.14em solid #1d1b17; border-radius: 0.2em; }
.gde-logo .gde-sub { margin-top: 0.5em; font: 700 0.13em/1.1 'Atkinson Hyperlegible', Arial, sans-serif; letter-spacing: 0.02em; color: #0e6b3c; }
.gde-logo.big-sub .gde-sub { font-size: 0.16em; }
`;
const logo = (cls = '', sub = true) => `<div class="gde-logo ${cls}"><span class="gde-mark">GDE</span><span class="gde-sign">Groningen</span>${sub ? '<span class="gde-sub">Zomer vol misdaad</span>' : ''}</div>`;

// name, w, h, background render (bron/ or screenshots/), focus (object-position), logo layout
const CAPSULES = [
  { name: 'header_capsule', w: 920, h: 430, bg: 'bron/luchtfoto', pos: '60% 60%', logo: { size: 190, x: 'left', pad: 52, sub: true }, shade: 'left' },
  { name: 'small_capsule', w: 462, h: 174, bg: 'bron/luchtfoto', pos: '50% 40%', logo: { size: 118, x: 'center', sub: false, row: true }, shade: 'full' },
  { name: 'main_capsule', w: 1232, h: 706, bg: 'bron/luchtfoto', pos: '50% 50%', logo: { size: 260, x: 'left', pad: 80, sub: true }, shade: 'left' },
  { name: 'vertical_capsule', w: 748, h: 896, bg: 'bron/zonsopgang', pos: '50% 50%', logo: { size: 250, x: 'center', y: 'bottom', pad: 70, sub: true }, shade: 'bottom' },
  { name: 'library_capsule', w: 600, h: 900, bg: 'bron/zonsopgang', pos: '45% 50%', logo: { size: 210, x: 'center', y: 'bottom', pad: 70, sub: true }, shade: 'bottom' },
  { name: 'library_header', w: 920, h: 430, bg: 'bron/vismarkt', pos: '50% 55%', logo: { size: 190, x: 'left', pad: 52, sub: true }, shade: 'left' },
  { name: 'library_hero', w: 3840, h: 1240, bg: 'bron/luchtfoto', pos: '50% 45%', logo: null, shade: 'none' },
  { name: 'page_background', w: 1438, h: 810, bg: 'bron/vismarkt', pos: '50% 50%', logo: null, shade: 'ambient' },
  { name: 'library_logo', w: 1280, h: 720, bg: null, logo: { size: 470, x: 'center', sub: true }, shade: 'none' },
  { name: 'community_icon', w: 184, h: 184, bg: null, icon: true },
];

function capsuleHtml(cap) {
  const bgUrl = cap.bg ? pathToFileURL(path.join(OUT, cap.bg + '.jpg')).href : null;
  const L = cap.logo;
  const shades = {
    left: 'linear-gradient(90deg, rgba(29,27,23,0.82) 0%, rgba(29,27,23,0.55) 38%, rgba(29,27,23,0) 70%)',
    bottom: 'linear-gradient(0deg, rgba(29,27,23,0.88) 0%, rgba(29,27,23,0.55) 35%, rgba(29,27,23,0) 62%)',
    full: 'radial-gradient(ellipse at center, rgba(29,27,23,0.72) 0%, rgba(29,27,23,0.45) 60%, rgba(29,27,23,0.2) 100%)',
    ambient: 'linear-gradient(180deg, rgba(29,27,23,0.55), rgba(29,27,23,0.85))',
    none: 'none',
  };
  let place = '';
  if (L) {
    const jx = L.x === 'left' ? 'flex-start' : 'center';
    const jy = L.y === 'bottom' ? 'flex-end' : 'center';
    place = `<div class="logo-wrap" style="justify-content:${jx};align-items:${jy};padding:${L.pad || 0}px">${logo(L.row ? 'row' : 'big-sub', L.sub)}</div>`;
  }
  const icon = cap.icon ? `<div class="icon"><span>GDE</span></div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
${LOGO_CSS}
html, body { margin: 0; width: ${cap.w}px; height: ${cap.h}px; overflow: hidden; background: ${cap.bg || cap.icon ? '#1d1b17' : 'transparent'}; }
.bg { position: absolute; inset: 0; background: url('${bgUrl}') center / cover no-repeat; background-position: ${cap.pos || '50% 50%'}; ${cap.shade === 'ambient' ? 'filter: blur(3px) saturate(0.8); transform: scale(1.03);' : ''} }
.shade { position: absolute; inset: 0; background: ${shades[cap.shade || 'none']}; }
.logo-wrap { position: absolute; inset: 0; display: flex; box-sizing: border-box; }
.gde-logo { font-size: ${L ? L.size : 100}px; }
.gde-logo.row { flex-direction: row; align-items: center; gap: 0.12em; }
.gde-logo.row .gde-sign { margin-top: 0; font-size: 0.3em; }
.icon { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #f3ead3; box-shadow: inset 0 0 0 8px #1d1b17; }
.icon span { font: 800 112px/0.8 'Barlow Condensed', sans-serif; padding-top: 10px; margin-bottom: 52px; color: #0e6b3c; text-shadow: 5px 5px 0 #e8505b; }
.icon::after { content: ''; position: absolute; left: 32px; right: 32px; bottom: 34px; height: 22px; border-radius: 4px; background: #f9c80e; border: 4px solid #1d1b17; box-sizing: border-box; }
</style></head><body>${bgUrl ? '<div class="bg"></div><div class="shade"></div>' : ''}${place}${icon}</body></html>`;
}

async function compose(c) {
  console.log('capsules');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-steam-caps-'));
  try {
    for (const cap of CAPSULES) {
      if (!want(cap.name)) continue;
      const missing = cap.bg && !fs.existsSync(path.join(OUT, cap.bg + '.jpg'));
      if (missing) { console.log('  skip', cap.name, '(no render ' + cap.bg + ', run --capture first)'); continue; }
      const f = path.join(tmp, cap.name + '.html');
      fs.writeFileSync(f, capsuleHtml(cap));
      await viewport(c, cap.w, cap.h, 1);
      await c.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: cap.bg || cap.icon ? 1 : 0 } });
      await goto(c, pathToFileURL(f).href);
      await evaluate(c, 'document.fonts.ready.then(() => true)');
      await sleep(400);
      await shoot(c, path.join(OUT, cap.name + '.png'), { w: cap.w, h: cap.h });
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  await c.send('Emulation.setDefaultBackgroundColorOverride', {});
  // screenshots in their published order (01-..., 02-...)
  const shots = fs.existsSync(SHOTS_DIR) ? fs.readdirSync(SHOTS_DIR) : [];
  for (const f of shots) {
    const base = f.replace(/^\d\d-/, '').replace(/\.jpg$/, '');
    const i = ORDER.indexOf(base);
    if (i < 0) continue;
    const want = `${String(i + 1).padStart(2, '0')}-${base}.jpg`;
    if (f !== want) fs.renameSync(path.join(SHOTS_DIR, f), path.join(SHOTS_DIR, want));
  }
}

// shared with scripts/youtube_images.mjs
export { ROOT, launch, evaluate, waitFor, viewport, goto, shoot, frames, sleep, FONTS, LOGO_CSS, logo, SETTINGS_INIT, CLEAN_TRAILER_CSS };

if (IS_MAIN) {
  const { c, kill } = await launch();
  try {
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: SETTINGS_INIT });
    if (doCapture) {
      // unnumbered names while capturing, numbered again in compose
      if (fs.existsSync(SHOTS_DIR)) for (const f of fs.readdirSync(SHOTS_DIR)) if (/^\d\d-/.test(f)) fs.renameSync(path.join(SHOTS_DIR, f), path.join(SHOTS_DIR, f.replace(/^\d\d-/, '')));
      await captureTrailer(c);
      await captureGame(c);
    }
    if (doCompose) await compose(c);
  } finally {
    c.close();
    kill();
  }
  const total = execFileSync('du', ['-sk', OUT]).toString().split('\t')[0];
  console.log(`done, docs/steam/beelden: ${(Number(total) / 1024).toFixed(1)} MB`);
}
