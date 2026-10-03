// GDE Groningen desktop shell: serves the (offline, vendored) game from app://game/
// so ES modules, fetch, AudioWorklet and localStorage behave exactly like
// on http://localhost, without a server or an internet connection.
const { app, BrowserWindow, Menu, protocol, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

// window mode survives restarts; fullscreen unless the player chose windowed
const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');
function loadWindowState() {
  try { return { fullscreen: true, ...JSON.parse(fsSync.readFileSync(STATE_FILE(), 'utf8')) }; } catch (e) { return { fullscreen: true }; }
}
function saveWindowState(state) {
  try { fsSync.writeFileSync(STATE_FILE(), JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const SCHEME = 'app';
const HOST = 'game';
// GTE_GAME_DIR serves another staged copy (perf runs against an older build)
const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : process.env.GTE_GAME_DIR || path.join(__dirname, 'build', 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
};

// Saves, settings and achievements live in userData, which Electron names
// after the app. The game was called "GTE VI" until 0.24: keep that folder,
// or a rename would orphan every save. Same for appId / AppUserModelId.
const LEGACY_NAME = 'GTE VI';
app.setPath('userData', path.join(app.getPath('appData'), LEGACY_NAME));
// the name everywhere, also when run unpackaged (npm start): menu, About
// panel, Dock, Windows taskbar grouping
const APP_NAME = 'GDE Groningen';
app.setName(APP_NAME);
// test runs (--stil / --smoke-test) get a throwaway profile, so they never
// touch the player's saves, settings or achievements
// --trailer[=WxH] plays the trailer for recordings (js/trailer.js), also on a
// throwaway profile; --trailer-shot=N one shot, --trailer-cut=kort the short
// cut, --trailer-frames=<dir> saves every frame as a png,
// --trailer-video[=<file.mp4>] encodes the run straight to an MP4 with sound
// (trailervideo.js; default ~/Downloads, 1920x1080 unless --trailer=WxH)
const VIDEO = process.argv.find((a) => a === '--trailer-video' || a.startsWith('--trailer-video='));
const TRAILER = process.argv.find((a) => a === '--trailer' || a.startsWith('--trailer=')) || (VIDEO && '--trailer');
const argValue = (name) => { const a = process.argv.find((x) => x.startsWith(name + '=')); return a ? a.slice(name.length + 1) : null; };
const TRAILER_SIZE = TRAILER && TRAILER.includes('=') ? TRAILER.split('=')[1] : VIDEO ? '1920x1080' : null;
let video = null;
if (VIDEO) {
  const tv = require('./trailervideo.js');
  const ffmpeg = tv.findFfmpeg();
  if (!ffmpeg) { console.error('[video] ffmpeg not found (looked in /opt/homebrew/bin, /usr/local/bin and PATH); install it, e.g. brew install ffmpeg'); process.exit(1); }
  try {
    video = { tv, ffmpeg, out: tv.resolveOutput(VIDEO.includes('=') ? VIDEO.slice(VIDEO.indexOf('=') + 1) : null, __dirname) };
  } catch (e) { console.error('[video]', e.message); process.exit(1); }
}
// --benchmark[=N] runs the benchmark N times from the title screen, logs every
// shot's fps / draw calls / GPU memory and quits (throwaway profile)
const BENCH = process.argv.find((a) => a === '--benchmark' || a.startsWith('--benchmark='));
if (TRAILER || BENCH || process.argv.includes('--stil') || process.argv.some((a) => a.startsWith('--smoke-test') || a.startsWith('--story-test') || a.startsWith('--validate-spots'))) {
  // GTE_TEST_PROFILE picks another throwaway dir, so parallel test runs
  // don't block each other through the single-instance lock
  app.setPath('userData', path.join(require('os').tmpdir(), process.env.GTE_TEST_PROFILE || 'gte-vi-test-profile'));
}
if (process.platform === 'win32') app.setAppUserModelId('nl.natuspella.gte-vi');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// the theme song starts on the title screen without waiting for a click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// laptops with an integrated and a separate GPU: render on the separate one
app.commandLine.appendSwitch('force_high_performance_gpu');

async function serve(request) {
  const url = new URL(request.url);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(GAME_DIR, rel));
  if (!file.startsWith(GAME_DIR)) return new Response('Forbidden', { status: 403 });
  try {
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    // media elements ask for byte ranges (seeking, buffering ahead): answer
    // with just that slice, so the player never re-reads a track from byte 0
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
    if (range && (range[1] || range[2])) {
      const fh = await fs.open(file, 'r');
      try {
        const size = (await fh.stat()).size;
        const start = range[1] ? +range[1] : Math.max(0, size - +range[2]);
        const end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
        if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
        const buf = Buffer.alloc(end - start + 1);
        await fh.read(buf, 0, buf.length, start);
        return new Response(buf, { status: 206, headers: { 'content-type': type, 'cache-control': 'no-cache', 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(buf.length) } });
      } finally {
        await fh.close();
      }
    }
    const body = await fs.readFile(file);
    return new Response(body, { status: 200, headers: { 'content-type': type, 'cache-control': 'no-cache', 'accept-ranges': 'bytes', 'content-length': String(body.length) } });
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}

function buildMenu() {
  if (process.platform !== 'darwin') { Menu.setApplicationMenu(null); return; }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: APP_NAME, submenu: [
      { role: 'about', label: `Over ${APP_NAME}` }, { type: 'separator' },
      { role: 'hide', label: `Verberg ${APP_NAME}` }, { role: 'hideOthers', label: 'Verberg andere' }, { role: 'unhide', label: 'Toon alles' },
      { type: 'separator' }, { role: 'quit', label: `Stop ${APP_NAME}` },
    ] },
    { label: 'Beeld', submenu: [{ role: 'togglefullscreen', label: 'Volledig scherm' }, { role: 'reload', label: 'Herladen' }] },
    { label: 'Venster', submenu: [{ role: 'minimize', label: 'Minimaliseer' }, { role: 'close', label: 'Sluit venster' }] },
  ]));
}

function createWindow() {
  // --trailer=3840x2160: that many device pixels of page, whatever the screen
  // --window-size=1280x720: a test run's window in CSS px (HUD layout checks with --smoke-test)
  const size = argValue('--window-size');
  const rec = TRAILER_SIZE ? TRAILER_SIZE.split('x').map(Number) : size ? size.split('x').map((v) => Number(v) * (require('electron').screen.getPrimaryDisplay().scaleFactor || 1)) : null;
  const recScale = rec ? require('electron').screen.getPrimaryDisplay().scaleFactor || 1 : 1;
  const win = new BrowserWindow({
    ...(rec && rec[0] > 0 && rec[1] > 0
      ? { width: Math.round(rec[0] / recScale), height: Math.round(rec[1] / recScale), useContentSize: true, enableLargerThanScreen: true, resizable: false }
      : { width: 1600, height: 900, minWidth: 960, minHeight: 600 }),
    backgroundColor: '#0c140e',
    title: APP_NAME,
    autoHideMenuBar: true,
    show: false,
    fullscreen: !rec && !process.argv.includes('--windowed') && loadWindowState().fullscreen,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.once('ready-to-show', () => win.show());
  const syncFullscreen = () => {
    const on = win.isFullScreen();
    if (!process.argv.includes('--windowed')) saveWindowState({ fullscreen: on });
    win.webContents.send('gte:fullscreen', on);
  };
  win.on('enter-full-screen', syncFullscreen);
  win.on('leave-full-screen', syncFullscreen);
  // the page's own <title> would overwrite the window title; keep it short
  win.on('page-title-updated', (e) => e.preventDefault());
  // anything that is not the game opens in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    // F11, Alt+Enter (the Windows habit) and Ctrl+Cmd+F on the Mac toggle
    // fullscreen; swallowed so the game never sees the Enter/F
    const macFull = process.platform === 'darwin' && input.control && input.meta && input.key.toLowerCase() === 'f';
    if (input.key === 'F11' || (input.alt && input.key === 'Enter') || macFull) {
      if (!input.isAutoRepeat) win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
  });
  // test switches: --stil loads the silent game, --smoke-test=<png> logs the
  // renderer's errors, saves a screenshot after a few seconds and quits
  const silent = process.argv.includes('--stil');
  const smoke = process.argv.find((a) => a.startsWith('--smoke-test='));
  // --hitch turns on the in-game frame-time probe (js/hitchprobe.js)
  // --dev opens the hidden story dev panel (F9), --story-test[=<dir>] runs
  // the automated story test: screenshots per step and report.json in <dir>
  // --validate-spots[=<dir>]: the story test's spot check only (js/spotcheck.js)
  const spotsOnly = process.argv.find((a) => a === '--validate-spots' || a.startsWith('--validate-spots='));
  const storyTest = process.argv.find((a) => a === '--story-test' || a.startsWith('--story-test=')) || spotsOnly;
  const trailerShot = argValue('--trailer-shot'), trailerCut = argValue('--trailer-cut'), trailerFrames = argValue('--trailer-frames');
  const query = [(silent || storyTest) && 'stil', process.argv.includes('--audio-graph') && 'audiograf', process.argv.includes('--hitch') && 'hitch', process.argv.includes('--dev') && 'dev', storyTest && 'storytest', spotsOnly && 'spotsonly',
    // automated runs never get the first-launch attract intro
    (smoke || storyTest || process.argv.includes('--perf-test')) && !TRAILER && 'noattract',
    TRAILER && 'trailer', TRAILER && trailerShot && `shot=${encodeURIComponent(trailerShot)}`, TRAILER && trailerCut && `cut=${encodeURIComponent(trailerCut)}`,
    TRAILER && (trailerFrames || video) && 'frames', video && 'video', video && 'stil', process.argv.includes('--attract') && 'attract',
    !TRAILER && BENCH && `benchmark=${argValue('--benchmark') || 1}`,
    // --preset=laag: that graphics preset for this run only (not saved)
    argValue('--preset') && `preset=${encodeURIComponent(argValue('--preset'))}`,
    // --gfx-advice[=<gpu string>]: the first-run graphics advice also in a test run
    process.argv.some((a) => a === '--gfx-advice' || a.startsWith('--gfx-advice=')) && 'gfxadvies',
    // --nobatch: city buildings drawn one by one (A/B of buildingbatch3d.js)
    process.argv.includes('--nobatch') && 'nobatch',
    argValue('--gfx-advice') && `gpu=${encodeURIComponent(argValue('--gfx-advice'))}`].filter(Boolean).join('&');
  // --profile-load[=ms]: a CPU profile of the page load (default 20 s from navigation)
  if (process.argv.some((a) => a === '--profile-load' || a.startsWith('--profile-load='))) {
    win.webContents.once('did-navigate', () => runProfile(win, Number(argValue('--profile-load')) || 20000).catch((err) => console.log('[profile]', err.message)));
  }
  // --benchmark --profile: a CPU profile of 30 s of the first run
  if (BENCH && process.argv.includes('--profile'))win.webContents.once('did-finish-load', () => setTimeout(() => runProfile(win, 30000), 25000));
  if (BENCH || TRAILER || argValue('--bench-eval')) {
    win.webContents.on('console-message', (e, legacyLevel, legacyMessage) => {
      const message = String(e.message !== undefined ? e.message : legacyMessage);
      if (message.startsWith('[trailer]') || message.startsWith('[mem]') || message.startsWith('[load]')) console.log(message);
    });
  }
  // --bench-eval=<file>: debug script run in the page as soon as it loads
  // (e.g. a GPU-memory tracker for --benchmark or --perf-script runs)
  // --cpu-throttle=4: slows the page's CPU like DevTools does (perf runs on a
  // weak machine stand-in, scripts/perf/run.sh)
  const throttle = Number(argValue('--cpu-throttle'));
  if (throttle > 1) win.webContents.once('did-finish-load', async () => {
    const dbg = win.webContents.debugger;
    try { if (!dbg.isAttached()) dbg.attach('1.3'); await dbg.sendCommand('Emulation.setCPUThrottlingRate', { rate: throttle }); } catch (e) { console.log('[cpu-throttle]', e.message); }
  });
  const evalFile = argValue('--bench-eval');
  if (evalFile) win.webContents.on('dom-ready', () => win.webContents.executeJavaScript(fsSync.readFileSync(evalFile, 'utf8')).catch((e) => console.log('[bench-eval]', e.message)));
  if (video) {
    const [W, H] = TRAILER_SIZE.split('x').map(Number);
    video.run = video.tv.setupTrailerVideo({ ipcMain, win, out: video.out, size: [W - (W % 2), H - (H % 2)], gameDir: GAME_DIR, ffmpeg: video.ffmpeg });
    // the page quits after its last frame: let ffmpeg finish the file first
    app.on('before-quit', (e) => {
      if (video.closed) return;
      e.preventDefault();
      video.run.finish().then((code) => { video.closed = true; app.exit(code ? 1 : 0); });
    });
  } else if (TRAILER && trailerFrames) {
    fsSync.mkdirSync(trailerFrames, { recursive: true });
    ipcMain.removeHandler('gte:capture-frame');
    ipcMain.handle('gte:capture-frame', async (e, n) => {
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(trailerFrames, `frame-${String(n).padStart(5, '0')}.png`), img.toPNG());
      return true;
    });
  }
  win.loadURL(`${SCHEME}://${HOST}/index.html${query ? '?' + query : ''}`);
  if (storyTest) runStoryTest(win, storyTest.includes('=') ? storyTest.slice(storyTest.indexOf('=') + 1) : path.join(require('os').tmpdir(), 'gte-story-test'));
  if (smoke) {
    win.webContents.on('console-message', function (e, legacyLevel, legacyMessage) {
      const level = e.level !== undefined ? e.level : legacyLevel;
      const message = e.message !== undefined ? e.message : legacyMessage;
      if (level === 'error' || level === 3 || /error|fail/i.test(String(message))) console.log('[renderer]', message);
    });
    win.webContents.on('did-fail-load', (e, code, desc, url) => console.log('[load failed]', code, desc, url));
    setTimeout(async () => {
      try {
        // --smoke-eval=<js> runs in the page first (e.g. open a menu), so the
        // screenshot shows that state
        const evalArg = process.argv.find((a) => a.startsWith('--smoke-eval='));
        if (evalArg) {
          await win.webContents.executeJavaScript(evalArg.slice('--smoke-eval='.length));
          await new Promise((r) => setTimeout(r, 1500));
        }
        const img = await win.webContents.capturePage();
        fsSync.writeFileSync(smoke.split('=')[1], img.toPNG());
        const info = await win.webContents.executeJavaScript(`JSON.stringify({
          ready: !!window.__debug, canvas: !!document.querySelector('canvas'),
          version: (document.querySelector('.ss-ver') || {}).textContent || '',
          font: document.fonts.check('40px Bebas Neue'),
          desktop: !!window.gteDesktop, fullscreen: window.gteDesktop ? window.gteDesktop.isFullscreen() : null,
          menu: [...document.querySelectorAll('#start-screen .ss-item')].map((e) => e.firstChild && e.firstChild.textContent).join(' | '),
          pauseButtons: [...document.querySelectorAll('#pause-menu .pm-game [data-action]')].map((b) => b.dataset.action).join(','),
          fullscreenToggle: !!document.querySelector('[data-desktop="fullscreen"]'),
        })`);
        console.log('[smoke]', info);
        // --perf-script=<file>: after starting a game, run the file's body as an
        // async function in the page and log what it returns
        const scriptArg = process.argv.find((a) => a.startsWith('--perf-script='));
        if (scriptArg) {
          // console.log('[capture] name') from the script saves a screenshot
          // next to the smoke-test png: <smoke>-<name>.png
          win.webContents.on('console-message', async (e, legacyLevel, legacyMessage) => {
            const message = String(e.message !== undefined ? e.message : legacyMessage);
            // console.log('[profile] 8000') from the script: a CPU profile of that many ms
            if (message.startsWith('[profile] ')) { runProfile(win, Number(message.slice(10)) || 6000).catch((err) => console.log('[profile]', err.message)); return; }
            if (!message.startsWith('[capture] ')) return;
            const img = await win.webContents.capturePage();
            fsSync.writeFileSync(smoke.split('=')[1].replace(/\.png$/, `-${message.slice(10).trim()}.png`), img.toPNG());
          });
          const body = fsSync.readFileSync(scriptArg.slice(14), 'utf8');
          await win.webContents.executeJavaScript(`(async () => {
            const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
            key('Enter', 'Enter');
            await new Promise((r) => setTimeout(r, 2500));
            const w = window.__debug && window.__debug.world;
            for (let i = 0; i < 25 && w && w.paused; i++) { key(' ', 'Space'); await new Promise((r) => setTimeout(r, 700)); }
          })()`);
          const out = await win.webContents.executeJavaScript(`(async () => { ${body}\n })()`);
          console.log('[perf-script]', typeof out === 'string' ? out : JSON.stringify(out));
        }
        if (process.argv.includes('--perf-test')) {
          // --perf-at=x,y,heading[;x,y,heading...] teleports the player to fixed
          // spots so runs are comparable (the new-game spawn is a random landmark)
          const atArg = process.argv.find((a) => a.startsWith('--perf-at='));
          const spots = atArg ? atArg.slice(10).split(';').map((s) => s.split(',').map(Number)) : [null];
          const expArg = process.argv.find((a) => a.startsWith('--perf-exp='));
          const expFiles = expArg ? expArg.slice(11).split('+').map((f) => fsSync.readFileSync(f, 'utf8')) : ['null'];
          const expSrc = expFiles.pop(), expPre = expFiles.join(';\n');
          await win.webContents.executeJavaScript(`(async () => {
            const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
            key('Enter', 'Enter');
            await new Promise((r) => setTimeout(r, 2500));
            const w = window.__debug && window.__debug.world;
            for (let i = 0; i < 25 && w && w.paused; i++) { key(' ', 'Space'); await new Promise((r) => setTimeout(r, 700)); }
            await new Promise((r) => setTimeout(r, 3000));
          })()`);
          for (const spot of spots) {
          const perf = await win.webContents.executeJavaScript(`(async () => {
            const spot = ${JSON.stringify(spot)};
            const w = window.__debug && window.__debug.world;
            // cutscenes (e.g. the new-wijk flyover a teleport triggers) are skipped
            // so every spot is measured from the street-level follow camera
            const cine = await import('/js/cinematics.js').catch(() => null);
            clearInterval(window.__perfSkip);
            window.__perfSkip = cine && setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
            if (spot && w) {
              const p = w.player;
              const s = (w.map.findOpenSpawn && w.map.findOpenSpawn(spot[0], spot[1], 80)) || { x: spot[0], y: spot[1] };
              p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
              if (Number.isFinite(spot[2])) { p.angle = spot[2]; w.camYaw = spot[2]; }
              await new Promise((r) => setTimeout(r, 6000));
            }
            const measure = async (ms) => {
              const t = []; let last = performance.now(); const t0 = last;
              await new Promise((res) => { const f = () => { const n = performance.now(); t.push(n - last); last = n; if (n - t0 < ms) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
              t.sort((a, b) => a - b);
              const avg = t.reduce((a, b) => a + b, 0) / t.length;
              return { fps: +(1000 / avg).toFixed(1), p50: +t[Math.floor(t.length * 0.5)].toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1) };
            };
            const r = window.__scene3d && window.__scene3d.renderer;
            // draw calls / triangles per frame, main view vs shadow map
            const sc = window.__scene3d;
            let calls = 0, tris = 0, shadowCalls = 0, frames = 0;
            const orig = r.render.bind(r);
            r.render = function (scene, camera) { const c0 = r.info.render.calls, t0 = r.info.render.triangles; orig(scene, camera); calls += r.info.render.calls; tris += r.info.render.triangles; };
            const sm = r.shadowMap; const origSm = sm.render.bind(sm);
            sm.render = function (...a) { const before = r.info.render.calls; origSm(...a); shadowCalls += r.info.render.calls - before; };
            r.info.autoReset = true;
            const tc = performance.now();
            await new Promise((res) => { const f = () => { frames++; if (performance.now() - tc < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
            r.render = orig; sm.render = origSm;
            const counts = { callsPerFrame: Math.round(calls / frames), trisPerFrame: Math.round(tris / frames), shadowCallsPerFrame: Math.round(shadowCalls / frames), geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs.length };
            let meshes = 0, visibleMeshes = 0, instanced = 0; sc.scene.traverse((o) => { if (o.isMesh) { meshes++; if (o.visible) visibleMeshes++; if (o.isInstancedMesh) instanced++; } });
            counts.meshes = meshes; counts.visibleMeshes = visibleMeshes; counts.instanced = instanced;
            // which kinds of meshes are drawn: group by the first named ancestor / userData kind
            const groups = new Map();
            sc.scene.traverseVisible((o) => {
              if (!o.isMesh) return;
              let a = o, label = '';
              while (a && !label) { label = a.userData && (a.userData.kind || a.userData.type || a.userData.propKind) || a.name || ''; a = a.parent; }
              const key = (label || 'unnamed') + (o.castShadow ? ' [shadow]' : '');
              groups.set(key, (groups.get(key) || 0) + 1);
            });
            counts.topGroups = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
            const out = { at: w ? [Math.round(w.player.x), Math.round(w.player.y)] : null, counts, dpr: window.devicePixelRatio, css: [innerWidth, innerHeight], vehicles: w ? w.vehicles.length : 0, peds: w ? w.pedestrians.length : 0 };
            const pr0 = window.__perfPr0 || (window.__perfPr0 = r ? r.getPixelRatio() : 0);
            const prs = spot ? [pr0] : [pr0, 1.5, 1];
            for (const pr of prs) {
              if (r && pr) { r.setPixelRatio(pr); window.dispatchEvent(new Event('resize')); if (sc.postfx) sc.postfx.rebuild(); await new Promise((res) => setTimeout(res, 800)); }
              out['pr' + pr] = await measure(5000);
            }
            // --perf-exp=<file>: [[name, () => undoFn], ...] toggled one at a time
            ${expPre}
            const exps = ${expSrc};
            if (exps) {
              out.exp = {}; if (window.__perfInfo) out.info = window.__perfInfo;
              for (const [name, apply] of exps) {
                let undo = null;
                try { undo = apply(); } catch (e) { out.exp[name] = 'ERR ' + e.message; continue; }
                await new Promise((res) => setTimeout(res, 1000));
                const m = await measure(4000);
                let c = 0, sc2 = 0, fr = 0; const o2 = r.render.bind(r), os2 = sm.render.bind(sm);
                r.render = function (a, b) { o2(a, b); c += r.info.render.calls; };
                sm.render = function (...a) { const b0 = r.info.render.calls; os2(...a); sc2 += r.info.render.calls - b0; };
                const t1 = performance.now();
                await new Promise((res) => { const f = () => { fr++; if (performance.now() - t1 < 1000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
                r.render = o2; sm.render = os2;
                out.exp[name] = { fps: m.fps, p50: m.p50, calls: Math.round(c / fr), shadow: Math.round(sc2 / fr) };
                try { if (undo) undo(); } catch (e) { /* ignore */ }
                await new Promise((res) => setTimeout(res, 500));
              }
            }
            if (window.__perfInfo2) out.info2 = window.__perfInfo2;
            return JSON.stringify(out);
          })()`);
          console.log('[perf]', perf);
          if (spot) fsSync.writeFileSync(smoke.split('=')[1].replace(/\.png$/, `-at${spots.indexOf(spot)}.png`), (await win.webContents.capturePage()).toPNG());
          }
          if (process.argv.includes('--profile')) await runProfile(win);
        }
      } catch (err) {
        console.log('[smoke error]', err && err.message);
      }
      app.quit();
    }, 14000);
  }
}

// CPU profile of the page for ms milliseconds: top functions by self and
// inclusive time, and time per file
async function runProfile(win, ms = 6000) {
  const dbg = win.webContents.debugger;
  if (!dbg.isAttached()) dbg.attach('1.3');
  await dbg.sendCommand('Profiler.enable');
  // GTE_PROFILE_INTERVAL (µs): coarser sampling keeps --cpu-throttle runs near their real speed
  await dbg.sendCommand('Profiler.setSamplingInterval', { interval: Number(process.env.GTE_PROFILE_INTERVAL) || 200 });
  await dbg.sendCommand('Profiler.start');
  await new Promise((r) => setTimeout(r, ms));
  const { profile } = await dbg.sendCommand('Profiler.stop');
  // GTE_PROFILE_OUT=<dir>: also keep the raw profile (scripts/perf/categories.mjs)
  if (process.env.GTE_PROFILE_OUT) {
    fsSync.mkdirSync(process.env.GTE_PROFILE_OUT, { recursive: true });
    fsSync.writeFileSync(path.join(process.env.GTE_PROFILE_OUT, `${Date.now()}.cpuprofile`), JSON.stringify(profile));
  }
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dtSum = profile.timeDeltas.reduce((a, b) => a + b, 0);
  const per = new Map();
  profile.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  for (const [id, us] of per) {
    const n = byId.get(id); const cf = n.callFrame;
    const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + us);
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  console.log('[profile] total ms', (dtSum / 1000).toFixed(0));
  for (const [k, us] of top) console.log('[profile]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', k);
  // inclusive time per function (self + callees)
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  for (const [id, us] of per) {
    const seen = new Set();
    for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
      const cf = byId.get(cur).callFrame;
      const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
      if (seen.has(key)) continue; seen.add(key);
      incl.set(key, (incl.get(key) || 0) + us);
    }
  }
  for (const [k, us] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log('[profile-incl]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', k);
  // per file
  const byFile = new Map();
  for (const [k, us] of self) { const f = k.split(' ').pop().split(':')[0] || '(native)'; byFile.set(f, (byFile.get(f) || 0) + us); }
  for (const [f, us] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log('[profile-file]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', f);
  // detaching would also drop --cpu-throttle for the routes after this one
  if (!(Number(argValue('--cpu-throttle')) > 1)) dbg.detach();
}

function runStoryTest(win, dir) {
  fsSync.mkdirSync(dir, { recursive: true });
  const done = (code) => setTimeout(() => app.exit(code), 300);
  win.webContents.on('console-message', async (e, legacyLevel, legacyMessage) => {
    const level = e.level !== undefined ? e.level : legacyLevel;
    const message = String(e.message !== undefined ? e.message : legacyMessage);
    if (message.startsWith('[storytest-capture] ')) {
      const name = message.slice(20).trim().replace(/[^\w.-]/g, '_');
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(dir, name + '.png'), img.toPNG());
    } else if (message.startsWith('[storytest-done] ')) {
      const report = JSON.parse(message.slice(17));
      fsSync.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(dir, 'report.png'), img.toPNG());
      console.log(`[story-test] ${report.result}: ${report.steps.length} steps, ${report.checks.filter((c) => !c.ok).length} failed checks, report in ${dir}`);
      for (const c of report.checks) if (!c.ok) console.log('[story-test] FAIL', c.name, c.info || '');
      for (const err of report.errors) console.log('[story-test] error', err);
      done(report.result === 'PASS' ? 0 : 1);
    } else if (level === 'error' || level === 3) console.log('[renderer]', message);
  });
  setTimeout(() => { console.log('[story-test] timeout'); done(2); }, 15 * 60 * 1000);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  ipcMain.on('gte:is-fullscreen', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    e.returnValue = w ? w.isFullScreen() : loadWindowState().fullscreen;
  });
  ipcMain.on('gte:set-fullscreen', (e, on) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.setFullScreen(!!on);
  });
  ipcMain.on('gte:quit', () => app.quit());
  ipcMain.handle('gte:save-text', async (e, name, text) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showSaveDialog(w, {
      defaultPath: path.join(app.getPath('documents'), path.basename(name || 'foutrapport.txt')),
      filters: [{ name: 'Tekst', extensions: ['txt'] }],
    });
    if (res.canceled || !res.filePath) return false;
    await fs.writeFile(res.filePath, String(text).slice(0, 2_000_000), 'utf8');
    return true;
  });
  app.whenReady().then(() => {
    app.setAboutPanelOptions({
      applicationName: APP_NAME,
      applicationVersion: app.getVersion(),
      version: '',
      copyright: '© 2026 NatusPella · Made with love in Groningen, with AI',
      credits: 'Zomer vol misdaad · GDE = Grootste Diefstal Ever',
    });
    if (process.platform === 'darwin' && !app.isPackaged && app.dock) app.dock.setIcon(path.join(__dirname, 'resources', 'icon.png'));
    protocol.handle(SCHEME, serve);
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
