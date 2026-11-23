// Voor/na-beeld van de personages in één pagina (scripts/qa/personen_beeld.html) met een wegwerpprofiel.
//   <electron.exe> scripts/qa/personen_beeld.cjs --out=<map> [--wait=<minuten>]
// Neemt een Electron-slot (<GDE_LOCKS of ~/gde-locks>/electron-1..3, mkdir) en geeft het altijd vrij. Dient de pagina zelf over http op een
// vrije poort (de worktree, plus de vendor-cache voor three.js); raakt poort 9000 en de geïnstalleerde app niet.
const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(arg('out', path.join(ROOT, 'personen-beeld')));
const WAIT_MIN = Number(arg('wait', 20));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const VENDOR = (process.env.GDE_VENDOR_CACHE || path.resolve(ROOT, '..', '..', '..', 'desktop', 'vendor-cache')).replace(/[\\/]npm$/, '');
const CDN = '/cdn/';

let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function takeSlot() {
  fs.mkdirSync(LOCKS, { recursive: true });
  const until = Date.now() + WAIT_MIN * 60000;
  while (Date.now() < until) {
    // de perf-agent meet exclusief: pas beginnen als geen enkel slot meer bezet is (dan ook geen fps-meting die door dit venster verstoord wordt)
    if (fs.readdirSync(LOCKS).some((f) => /^electron-\d+$/.test(f))) { await sleep(Number(process.env.GDE_LOCK_POLL_MS) || 20000); continue; }
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); return true; } catch { /* bezet */ }
    }
    await sleep(Number(process.env.GDE_LOCK_POLL_MS) || 20000);
  }
  return false;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const file = u.startsWith(CDN) ? path.join(VENDOR, 'npm', u.slice(CDN.length)) : path.join(ROOT, u);
      if (!file.startsWith(ROOT) && !file.startsWith(VENDOR)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (e, buf) => {
        if (e) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

app.disableHardwareAcceleration && void 0;
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'gde-personen-')));
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

app.whenReady().then(async () => {
  let code = 0;
  try {
    if (!(await takeSlot())) { console.error('geen Electron-slot gekregen'); code = 4; return; }
    const srv = await serve();
    const port = srv.address().port;
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://cdn.jsdelivr.net/npm/*'] }, (d, cb) => {
      cb({ redirectURL: `http://127.0.0.1:${port}${CDN}${d.url.slice('https://cdn.jsdelivr.net/npm/'.length)}` });
    });
    const win = new BrowserWindow({ show: false, width: 1600, height: 1000, webPreferences: { backgroundThrottling: false } });
    win.webContents.on('console-message', (_e, _l, m) => console.log('[pagina]', m));
    await win.loadURL(`http://127.0.0.1:${port}/scripts/qa/personen_beeld.html`);
    const t0 = Date.now();
    while (Date.now() - t0 < 90000 && !(await win.webContents.executeJavaScript('window.__klaar === true'))) await sleep(500);
    const info = await win.webContents.executeJavaScript('window.__info');
    fs.mkdirSync(OUT, { recursive: true });
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, 'voor-na.png'), img.toPNG());
    fs.writeFileSync(path.join(OUT, 'cijfers.json'), JSON.stringify(info, null, 1));
    console.log('cijfers', JSON.stringify(info));
    srv.close();
  } catch (e) { console.error(e); code = 1; } finally { release(); app.exit(code); }
});
