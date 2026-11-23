// Voor/na-beeld van de personages in één pagina (scripts/qa/personen_beeld.html) met een wegwerpprofiel.
//   node scripts/qa/personen_beeld.cjs --out=<map> [--wait=<minuten>] [--page=personen_vergelijk]          (aanbevolen: start Electron zelf via de runner)
//   <electron.exe> scripts/qa/personen_beeld.cjs --no-sandbox --out=<map> [--wait=<minuten>]
// Gebruikt de runnerbibliotheek scripts/lib/electronrunner.cjs (docs/KWALITEITSMACHINE.md): onder gewone Node start hij Electron
// met dit bestand, --no-sandbox, zonder ELECTRON_RUN_AS_NODE en met een EXCLUSIEF slot (alle sloten vrij: dan stoort dit venster
// geen fps-meting); in Electron zelf neemt hij dat slot alleen als de Node-kant het niet al deed (--slot-extern).
// Dient de pagina zelf over http op een vrije poort (de worktree, plus de vendor-cache voor three.js); raakt poort 9000 en de
// geïnstalleerde app niet. Profiel en TEMP in de uitvoermap, nooit de systeem-temp; nooit een dialoogvenster; run.log met hartslag.
// Exitcodes: 0 klaar, 1 fout, 4 geen slot.
const fs = require('fs');
const path = require('path');
const http = require('http');
const R = require('../lib/electronrunner.cjs');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(arg('out', path.join(ROOT, '.scr', 'personen-beeld')));
const WAIT_MIN = Number(arg('wait', 20));
// welke pagina in scripts/qa/ (zonder .html): personen_beeld (voor/na) of personen_vergelijk (eigen model naast Quaternius, ADR 0050)
const PAGE = /^[a-z_]+$/.test(arg('page', '')) ? arg('page') : 'personen_beeld';

if (!process.versions.electron) {
  // ---- Node-kant: Electron starten via de runner ----
  (async () => {
    let dirs;
    try { dirs = R.prepareRunDir(OUT); } catch (e) { console.error(e.message); process.exit(1); }
    const log = R.makeLog(dirs.out, 'run.log');
    try {
      const r = await R.runElectron({
        electron: R.findElectron(ROOT), args: [__filename, `--out=${dirs.out}`, '--slot-extern'], cwd: ROOT, out: dirs.out, log,
        env: R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp }), slot: { label: 'personen_beeld', exclusive: true, waitMin: WAIT_MIN }, timeoutMin: 10,
      });
      R.removeProfile(dirs.profile);
      process.exit(r.code === 0 ? 0 : r.code === 4 ? 4 : 1);
    } catch (e) { log('fout: ' + e.message); process.exit(e.code && e.code.startsWith('SLOT') ? 4 : 1); }
  })();
} else {
  // ---- Electron-hoofdproces ----
  const { app, BrowserWindow, session, dialog } = require('electron');
  let dirs;
  try { dirs = R.prepareRunDir(OUT); } catch (e) { process.stderr.write(e.message + '\n'); process.exit(1); }
  // Electron op Windows schrijft stdout niet altijd naar de aanroepende shell: alles gaat ook naar <out>/run.log
  const log = R.makeLog(dirs.out, 'run.log');
  R.guardMainProcess({ app, dialog, log });
  const VENDOR = (process.env.GDE_VENDOR_CACHE || path.resolve(ROOT, '..', '..', '..', 'desktop', 'vendor-cache')).replace(/[\\/]npm$/, '');
  const CDN = '/cdn/';
  let slot = null;
  process.on('exit', () => { if (slot) slot.release(); });

  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
  const serve = () => new Promise((resolve) => {
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

  // wegwerpprofiel onder de uitvoermap (de systeem-temp is in een afgeschermde sessie niet altijd beschrijfbaar)
  app.setPath('userData', dirs.profile);
  app.setPath('temp', dirs.tmp);
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');

  log('start', 'locks', R.locksDir(), process.argv.includes('--slot-extern') ? '(slot door de Node-kant)' : '');
  app.whenReady().then(async () => {
    let code = 0;
    const stopBeat = R.startHeartbeat(log, { status: () => (slot ? `slot ${slot.name}` : 'zonder eigen slot'), slot: null });
    try {
      // de perf-agent meet exclusief: pas beginnen als geen enkel slot meer bezet is; alleen EEXIST telt als bezet
      if (!process.argv.includes('--slot-extern')) {
        try { slot = await R.takeSlot({ label: 'personen_beeld', exclusive: true, waitMin: WAIT_MIN, log }); } catch (e) { log('geen Electron-slot: ' + e.message); code = 4; return; }
      }
      const srv = await serve();
      const port = srv.address().port;
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://cdn.jsdelivr.net/npm/*'] }, (d, cb) => {
        cb({ redirectURL: `http://127.0.0.1:${port}${CDN}${d.url.slice('https://cdn.jsdelivr.net/npm/'.length)}` });
      });
      const win = new BrowserWindow({ show: false, width: 1600, height: 1000, webPreferences: { backgroundThrottling: false } });
      win.webContents.on('console-message', (_e, _l, m) => log('[pagina]', String(_e && _e.message !== undefined ? _e.message : m)));
      await win.loadURL(`http://127.0.0.1:${port}/scripts/qa/${PAGE}.html`);
      const t0 = Date.now();
      while (Date.now() - t0 < 90000 && !(await win.webContents.executeJavaScript('window.__klaar === true'))) await new Promise((r) => setTimeout(r, 500));
      const info = await win.webContents.executeJavaScript('window.__info');
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(dirs.out, 'voor-na.png'), img.toPNG());
      fs.writeFileSync(path.join(dirs.out, 'cijfers.json'), JSON.stringify(info, null, 1));
      log('cijfers', JSON.stringify(info));
      srv.close();
    } catch (e) { log('fout', e); code = 1; } finally {
      stopBeat();
      if (slot) { slot.release(); slot = null; }
      app.exit(code); // het profiel ruimt de Node-kant op (hier is het nog in gebruik)
    }
  });
}
