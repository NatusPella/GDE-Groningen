// Electron-kant van scripts/depth_shots.mjs (#382): serveert een game-map en de vendor-map op 127.0.0.1 (willekeurige poort,
// nooit 9000), laadt scripts/depth_shots.page.html in een wegwerpprofiel, wacht op window.__done en schrijft de PNG's.
// Alles buiten 127.0.0.1 wordt geblokkeerd: er gaat niets over het net.
//   electron scripts/depth_shots.main.cjs --game=<map met js/> --vendor=<map met npm/> --out=<map> --tag=voor|na [--only=a,b]
const { app, BrowserWindow, session } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const GAME = path.resolve(arg('game'));
const VENDOR = path.resolve(arg('vendor'));
const OUT = path.resolve(arg('out'));
const TAG = arg('tag', 'beeld');
const ONLY = arg('only', '');
const PAGE = path.join(__dirname, 'depth_shots.page.html');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css' };

app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), `gde-test-depthshots-${TAG}-`)));
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let file = null;
      if (url === '/' || url === '/page') file = PAGE;
      else if (url.startsWith('/game/')) file = path.join(GAME, url.slice(6));
      else if (url.startsWith('/vendor/')) file = path.join(VENDOR, url.slice(8));
      const ok = file && path.resolve(file).startsWith(path.resolve(url.startsWith('/vendor/') ? VENDOR : url.startsWith('/game/') ? GAME : PAGE)) && fs.existsSync(file) && fs.statSync(file).isFile();
      if (!ok) { rsp.writeHead(404); rsp.end('niet gevonden ' + url); return; }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

app.whenReady().then(async () => {
  const srv = await serve();
  const port = srv.address().port;
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(http:\/\/127\.0\.0\.1:|devtools:|data:|blob:)/.test(d.url) }));
  const win = new BrowserWindow({ width: 1280, height: 720, show: false, webPreferences: { backgroundThrottling: false, contextIsolation: true } });
  win.webContents.on('console-message', (e, level, msg) => console.log('[pagina]', msg));
  win.webContents.on('render-process-gone', (e, d) => { console.log('[pagina] weg', d.reason); app.exit(3); });
  await win.loadURL(`http://127.0.0.1:${port}/?only=${encodeURIComponent(ONLY)}&tag=${TAG}`);
  const t0 = Date.now();
  let done = false;
  while (Date.now() - t0 < 240000) {
    done = await win.webContents.executeJavaScript('window.__done === true');
    if (done) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!done) { console.log('[depth_shots] niet klaar binnen 240 s'); app.exit(2); return; }
  const shots = await win.webContents.executeJavaScript('window.__shots');
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of shots) fs.writeFileSync(path.join(OUT, `${s.name}-${TAG}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
  console.log(`[depth_shots] ${shots.length} beelden in ${OUT}`);
  const info = await win.webContents.executeJavaScript('window.__info');
  console.log('[depth_shots] info ' + JSON.stringify(info));
  srv.close();
  app.exit(0);
});
