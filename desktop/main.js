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
