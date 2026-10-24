// GDE Groningen desktop shell: serves the (offline, vendored) game from app://game/
// so ES modules, fetch, AudioWorklet and localStorage behave exactly like
// on http://localhost, without a server or an internet connection.
const { app, BrowserWindow, Menu, protocol, shell, ipcMain, dialog } = require('electron');
const { createCoopCore } = require('./coopcore.cjs');
const { haalLiveBussen } = require('./livebussen.cjs');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { argValue, hasFlag } = require('./args.cjs');
const { steamSwitches } = require('./steamflags.cjs');

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
// GDE_GAME_DIR serves another staged copy (perf runs against an older build)
const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : process.env.GDE_GAME_DIR || path.join(__dirname, 'build', 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
};

require('./envcompat.js'); // GTE_* -> GDE_*

// the name everywhere, also when run unpackaged (npm start): menu, About
// panel, Dock, Windows taskbar grouping
const APP_NAME = 'GDE Groningen';
app.setName(APP_NAME);
// the debug harness (devtools.js: test switches, benchmark, perf script, story
// test, trailer) only runs unpackaged or with GDE_DEV=1
const devtools = !app.isPackaged || process.env.GDE_DEV === '1' ? require('./devtools.js') : null;
// test runs get a throwaway profile, so they never touch the player's saves,
// settings or achievements
if (devtools && devtools.isTestRun) {
  // GDE_TEST_PROFILE picks another throwaway dir, so parallel test runs
  // don't block each other through the single-instance lock
  app.setPath('userData', path.join(require('os').tmpdir(), process.env.GDE_TEST_PROFILE || 'gde-test-profile'));
} else {
  // saves, settings and prestaties: "GDE Groningen", copied once from the
  // pre-0.29 folder (userdata.js; on any error it keeps using that one)
  const { chooseUserData } = require('./userdata.js');
  app.setPath('userData', chooseUserData(app.getPath('appData'), APP_NAME, { log: console.log }).dir);
}
if (process.platform === 'win32') app.setAppUserModelId('nl.natuspella.gde-groningen');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// the theme song starts on the title screen without waiting for a click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// laptops with an integrated and a separate GPU: render on the separate one
app.commandLine.appendSwitch('force_high_performance_gpu');
// the Steam overlay (only with --steam-overlay in the launch option, steamflags.cjs)
for (const [name, value] of steamSwitches()) app.commandLine.appendSwitch(name, value);

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
    { label: 'Bewerken', submenu: [{ role: 'undo', label: 'Ongedaan maken' }, { role: 'redo', label: 'Opnieuw' }, { type: 'separator' }, { role: 'cut', label: 'Knippen' }, { role: 'copy', label: 'Kopiëren' }, { role: 'paste', label: 'Plakken' }, { role: 'selectAll', label: 'Alles selecteren' }] },
    { label: 'Beeld', submenu: [{ role: 'togglefullscreen', label: 'Volledig scherm' }, { role: 'reload', label: 'Herladen' }] },
    { label: 'Venster', submenu: [{ role: 'minimize', label: 'Minimaliseer' }, { role: 'close', label: 'Sluit venster' }] },
  ]));
}

function createWindow() {
  // --trailer=3840x2160: that many device pixels of page, whatever the screen
  // --window-size=1280x720: a test run's window in CSS px (HUD layout checks with --smoke-test)
  const size = argValue('--window-size');
  const trailerSize = devtools && devtools.trailerSize;
  const rec = trailerSize ? trailerSize.split('x').map(Number) : size ? size.split('x').map((v) => Number(v) * (require('electron').screen.getPrimaryDisplay().scaleFactor || 1)) : null;
  const recScale = rec ? require('electron').screen.getPrimaryDisplay().scaleFactor || 1 : 1;
  const win = new BrowserWindow({
    ...(rec && rec[0] > 0 && rec[1] > 0
      ? { width: Math.round(rec[0] / recScale), height: Math.round(rec[1] / recScale), useContentSize: true, enableLargerThanScreen: true, resizable: false }
      : { width: 1600, height: 900, minWidth: 960, minHeight: 600 }),
    backgroundColor: '#0c140e',
    title: APP_NAME,
    // Windows/Linux window and taskbar icon (macOS takes the .icns from the bundle); both files are inside the asar when packaged.
    // The .ico carries hand-tuned 16-48 px images for the taskbar and title bar.
    ...(process.platform !== 'darwin' ? { icon: path.join(__dirname, 'resources', process.platform === 'win32' ? 'icon.ico' : 'window-icon.png') } : {}),
    autoHideMenuBar: true,
    // --clip (trailer clips): no frame, so the page is exactly the requested size (a frame costs 16 x 39 px)
    ...(devtools && devtools.clipMode ? { frame: false, x: 0, y: 0 } : {}),
    show: false,
    fullscreen: !rec && !hasFlag('--windowed') && loadWindowState().fullscreen,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.once('ready-to-show', () => {
    if (devtools && devtools.clipMode && rec) win.setBounds({ x: 0, y: 0, width: Math.round(rec[0] / recScale), height: Math.round(rec[1] / recScale) });
    win.show();
  });
  const syncFullscreen = () => {
    const on = win.isFullScreen();
    if (!hasFlag('--windowed')) saveWindowState({ fullscreen: on });
    win.webContents.send('gde:fullscreen', on);
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
  // debug harness (test switches, benchmark, smoke/story test): not in a packaged install
  const query = [...(devtools ? devtools.queryParts() : [])].filter(Boolean).join('&');
  if (devtools) devtools.attach(win, { gameDir: GAME_DIR });
  win.loadURL(`${SCHEME}://${HOST}/index.html${query ? '?' + query : ''}`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  ipcMain.on('gde:is-fullscreen', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    e.returnValue = w ? w.isFullScreen() : loadWindowState().fullscreen;
  });
  ipcMain.on('gde:set-fullscreen', (e, on) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.setFullScreen(!!on);
  });
  ipcMain.on('gde:quit', () => app.quit());
  // Coöp online (#95): TCP + UPnP in het main-proces (coopcore.cjs); alleen op verzoek van het spel (?coop)
  let coop = null;
  const coopFor = (sender) => (coop = coop || createCoopCore({ gameDir: GAME_DIR, ...(process.env.GDE_COOP_TEST ? { upnp: false, localIp: '127.0.0.1' } : {}), emit: (kind, payload) => { if (!sender.isDestroyed()) sender.send('gde:coop-event', kind, payload); } }));
  ipcMain.handle('gde:coop-host', (e, max) => coopFor(e.sender).host({ max: Number(max) || 8 }));
  ipcMain.handle('gde:coop-join', (e, code) => coopFor(e.sender).join(String(code || '').slice(0, 80)));
  ipcMain.on('gde:coop-send', (e, id, bytes) => { if (coop && Number.isInteger(id) && bytes && bytes.length <= 8192) coop.send(id, new Uint8Array(bytes)); });
  ipcMain.on('gde:coop-close', (e, id) => { if (coop && Number.isInteger(id)) coop.close(id); });
  ipcMain.on('gde:coop-max', (e, n) => { if (coop && Number.isInteger(n)) coop.setMax(n); });
  ipcMain.handle('gde:coop-diagnose', (e) => coopFor(e.sender).diagnose());
  ipcMain.handle('gde:coop-stop', () => (coop ? coop.stop() : null));
  app.on('before-quit', () => { if (coop) coop.stop(); }); // sluit de poort op de router weer
  ipcMain.handle('gde:live-bussen', () => haalLiveBussen()); // #395: zonder argumenten: de vaste url, niets van de speler
  ipcMain.handle('gde:save-text', async (e, name, text) => {
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
