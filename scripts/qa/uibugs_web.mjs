// Beeldcontrole UI-bugs 24-11 zonder Electron (in de agentomgeving mag electron.exe niet schrijven: profiel-lock 'Toegang geweigerd'):
// dezelfde scenes (scripts/ui/uibugs_scenes.js) in een eigen headless Chrome (wegwerpprofiel, eigen debugpoort, alleen de eigen PID stoppen)
// tegen een gestagede game die dit script zelf op 127.0.0.1 serveert; elke andere host is geblokkeerd (geen contact naar buiten). Het webpad is hetzelfde streamingpad als Electron (AGENTS.md).
//   node scripts/qa/uibugs_web.mjs --game-dir=<gestagede game> --out=<map> [--sizes=1920x1080,1280x720] [--only=1228,1189] [--port=8761] [--cdp=9361]
// Uitvoer: <out>/<maat>-<scene>.png en <out>/uibugs-<maat>.json (wat de scenes maten), run-<maat>.log (console van de pagina).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, '.tmp-qa', 'uibugs-web')));
const GAME = path.resolve(arg('game-dir', path.join(ROOT, 'desktop', 'build', 'game')));
const SIZES = arg('sizes', '1920x1080,1280x720').split(',').filter(Boolean);
const ONLY = arg('only', '');
const PORT = +arg('port', 8761), CDP = +arg('cdp', 9361);
const CHROME = arg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(GAME, 'index.html'))) { console.error('geen gestagede game in ' + GAME); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(GAME, rel === '/' ? 'index.html' : rel);
  if (!f.startsWith(GAME)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(b); });
}).listen(PORT, '127.0.0.1');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let scenes = fs.readFileSync(path.join(ROOT, 'scripts', 'ui', 'uibugs_scenes.js'), 'utf8');
scenes = scenes.replace("console.log('[capture] ' + name);", 'await window.__cap(name);');

for (const size of SIZES) {
  const [W, H] = size.split('x').map(Number);
  const profile = path.join(OUT, `_chrome-${size}-${process.pid}`);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  const kill = () => { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* weg */ } };
  process.on('exit', kill);
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); } catch { await sleep(500); } }
  const tab = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pending = new Map(); const log = []; let shots = 0;
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = async (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === 'Runtime.consoleAPICalled') log.push(`[${d.params.type}] ` + d.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    if (d.method === 'Runtime.exceptionThrown') log.push('[exception] ' + JSON.stringify(d.params.exceptionDetails).slice(0, 400));
    if (d.method === 'Runtime.bindingCalled' && d.params.name === '__capNode') {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `${size}-${d.params.payload}.png`), Buffer.from(r.result.data, 'base64')); shots++;
      await send('Runtime.evaluate', { expression: 'window.__capR && window.__capR()' });
    }
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Runtime.addBinding', { name: '__capNode' });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  // tests schrijven nooit naar echte opslag: dit profiel is een wegwerpprofiel en wordt na de run verwijderd
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__cap = (n) => new Promise((r) => { window.__capR = r; window.__capNode(n); });' });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  const press = async (k) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: 'Digit' + k, text: type === 'keyDown' ? k : undefined, windowsVirtualKeyCode: k.charCodeAt(0) }); };
  const started = async () => { const r = await send('Runtime.evaluate', { expression: "document.body.classList.contains('game-started')", returnByValue: true }); return r.result && r.result.result && r.result.result.value === true; };
  // het startmenu volgens wat er staat (in swiftshader kwam een blinde 1-2-reeks soms te vroeg: 2 koos Samen spelen en de cijfers
  // belandden in het naamveld): keuzekaart 1 = Alleen spelen, moeilijkheidskaart 2 = Standaard, naamkaart terug
  const kaart = async () => { const r = await send('Runtime.evaluate', { expression: "document.querySelector('.dk-kaart') ? 'moeilijk' : document.querySelector('#online-start input') ? 'naam' : document.querySelector('.sk-keuze[data-keuze]') ? 'keuze' : ''", returnByValue: true }); return r.result && r.result.result ? r.result.result.value : ''; };
  await sleep(8000);
  for (let k = 0; k < 90 && !(await started()); k++) {
    const st = await kaart();
    if (st === 'keuze') await press('1');
    else if (st === 'moeilijk') await press('2');
    else if (st === 'naam') await send('Runtime.evaluate', { expression: "(document.querySelector('[data-terug]') || {}).click && document.querySelector('[data-terug]').click()" });
    await sleep(2000);
  }
  const body = `(async () => { window.__shotsOnly = ${JSON.stringify(ONLY)};\n${scenes}\n})()`;
  const res = await send('Runtime.evaluate', { expression: body, awaitPromise: true, returnByValue: true, timeout: 3600 * 1000 });
  const val = res.result && res.result.result ? res.result.result.value : JSON.stringify(res).slice(0, 800);
  fs.writeFileSync(path.join(OUT, `uibugs-${size}.json`), typeof val === 'string' ? val : JSON.stringify(val));
  fs.writeFileSync(path.join(OUT, `run-${size}.log`), log.join('\n'));
  console.log(`${size}: ${shots} beelden`);
  ws.close(); kill(); await sleep(1500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* bezet */ }
}
server.close();
process.exit(0);
