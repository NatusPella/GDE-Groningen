// GTE VI desktop shell: serves the (offline, vendored) game from app://game/
// so ES modules, fetch, AudioWorklet and localStorage behave exactly like
// on http://localhost, without a server or an internet connection.
const { app, BrowserWindow, Menu, protocol, shell, ipcMain } = require('electron');
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
const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, 'build', 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
};

// GTE VI everywhere, also when run unpackaged (npm start): menu, About
// panel, Dock, Windows taskbar grouping
app.setName('GTE VI');
// test runs (--stil / --smoke-test) get a throwaway profile, so they never
// touch the player's saves, settings or achievements
if (process.argv.includes('--stil') || process.argv.some((a) => a.startsWith('--smoke-test'))) {
  app.setPath('userData', path.join(require('os').tmpdir(), 'gte-vi-test-profile'));
}
if (process.platform === 'win32') app.setAppUserModelId('nl.natuspella.gte-vi');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// the theme song starts on the title screen without waiting for a click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

async function serve(request) {
  const url = new URL(request.url);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(GAME_DIR, rel));
  if (!file.startsWith(GAME_DIR)) return new Response('Forbidden', { status: 403 });
  try {
    const body = await fs.readFile(file);
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    return new Response(body, { status: 200, headers: { 'content-type': type, 'cache-control': 'no-cache' } });
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}

function buildMenu() {
  if (process.platform !== 'darwin') { Menu.setApplicationMenu(null); return; }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'GTE VI', submenu: [
      { role: 'about', label: 'Over GTE VI' }, { type: 'separator' },
      { role: 'hide', label: 'Verberg GTE VI' }, { role: 'hideOthers', label: 'Verberg andere' }, { role: 'unhide', label: 'Toon alles' },
      { type: 'separator' }, { role: 'quit', label: 'Stop GTE VI' },
    ] },
    { label: 'Beeld', submenu: [{ role: 'togglefullscreen', label: 'Volledig scherm' }, { role: 'reload', label: 'Herladen' }] },
    { label: 'Venster', submenu: [{ role: 'minimize', label: 'Minimaliseer' }, { role: 'close', label: 'Sluit venster' }] },
  ]));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#0c140e',
    title: 'GTE VI',
    autoHideMenuBar: true,
    show: false,
    fullscreen: !process.argv.includes('--windowed') && loadWindowState().fullscreen,
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
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
  });
  // test switches: --stil loads the silent game, --smoke-test=<png> logs the
  // renderer's errors, saves a screenshot after a few seconds and quits
  const silent = process.argv.includes('--stil');
  const smoke = process.argv.find((a) => a.startsWith('--smoke-test='));
  win.loadURL(`${SCHEME}://${HOST}/index.html${silent ? '?stil' : ''}`);
  if (smoke) {
    win.webContents.on('console-message', function (e, legacyLevel, legacyMessage) {
      const level = e.level !== undefined ? e.level : legacyLevel;
      const message = e.message !== undefined ? e.message : legacyMessage;
      if (level === 'error' || level === 3 || /error|fail/i.test(String(message))) console.log('[renderer]', message);
    });
    win.webContents.on('did-fail-load', (e, code, desc, url) => console.log('[load failed]', code, desc, url));
    setTimeout(async () => {
      try {
        const img = await win.webContents.capturePage();
        fsSync.writeFileSync(smoke.split('=')[1], img.toPNG());
        const info = await win.webContents.executeJavaScript(`JSON.stringify({
          ready: !!window.__debug, canvas: !!document.querySelector('canvas'),
          version: (document.querySelector('.ss-ver') || {}).textContent || '',
          font: document.fonts.check('40px Bebas Neue'),
          desktop: !!window.gteDesktop, fullscreen: window.gteDesktop ? window.gteDesktop.isFullscreen() : null,
          menu: [...document.querySelectorAll('#start-screen .ss-item')].map((e) => e.firstChild && e.firstChild.textContent).join(' | '),
          pauseButtons: [...document.querySelectorAll('#pause-menu .pm-game > [data-action]')].map((b) => b.dataset.action).join(','),
          fullscreenToggle: !!document.querySelector('[data-desktop="fullscreen"]'),
        })`);
        console.log('[smoke]', info);
        if (process.argv.includes('--perf-test')) {
          const perf = await win.webContents.executeJavaScript(`(async () => {
            const key = (k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); };
            key('Enter', 'Enter');
            await new Promise((r) => setTimeout(r, 2500));
            const w = window.__debug && window.__debug.world;
            for (let i = 0; i < 25 && w && w.paused; i++) { key(' ', 'Space'); await new Promise((r) => setTimeout(r, 700)); }
            await new Promise((r) => setTimeout(r, 3000));
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
            const out = { counts, dpr: window.devicePixelRatio, css: [innerWidth, innerHeight], vehicles: w ? w.vehicles.length : 0, peds: w ? w.pedestrians.length : 0 };
            for (const pr of [r ? r.getPixelRatio() : 0, 1.5, 1]) {
              if (r && pr) { r.setPixelRatio(pr); window.dispatchEvent(new Event('resize')); await new Promise((res) => setTimeout(res, 800)); }
              out['pr' + pr] = await measure(5000);
            }
            return JSON.stringify(out);
          })()`);
          console.log('[perf]', perf);
          if (process.argv.includes('--profile')) {
            const dbg = win.webContents.debugger;
            dbg.attach('1.3');
            await dbg.sendCommand('Profiler.enable');
            await dbg.sendCommand('Profiler.setSamplingInterval', { interval: 200 });
            await dbg.sendCommand('Profiler.start');
            await new Promise((r) => setTimeout(r, 6000));
            const { profile } = await dbg.sendCommand('Profiler.stop');
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
            // per file
            const byFile = new Map();
            for (const [k, us] of self) { const f = k.split(' ').pop().split(':')[0] || '(native)'; byFile.set(f, (byFile.get(f) || 0) + us); }
            for (const [f, us] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log('[profile-file]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', f);
            dbg.detach();
          }
        }
      } catch (err) {
        console.log('[smoke error]', err && err.message);
      }
      app.quit();
    }, 14000);
  }
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
  app.whenReady().then(() => {
    app.setAboutPanelOptions({
      applicationName: 'GTE VI',
      applicationVersion: app.getVersion(),
      version: '',
      copyright: '© 2026 NatusPella · Made with love in Groningen, with AI',
      credits: 'Grand Theft Eierbal VI',
    });
    if (process.platform === 'darwin' && !app.isPackaged && app.dock) app.dock.setIcon(path.join(__dirname, 'resources', 'icon.png'));
    protocol.handle(SCHEME, serve);
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
