// Cutscene-stills zonder Electron: dezelfde pagina-script als scripts/qa/cutscene_shots.mjs (cutscene_shots.page.js), maar in een eigen
// headless Chrome (wegwerpprofiel, eigen debugpoort, alleen eigen PID's) tegen een gestagede game die een statische server serveert.
//   node scripts/qa/cutscene_shots_web.mjs --url=http://127.0.0.1:8137/index.html --out=<map> [--only=M01.intro,M02] [--spot=x,y,hoek] [--chrome=<pad>] [--port=9333]
// Per shot een png in <out> (naam = de [capture]-naam van de pagina-script) en features.json (consolemeldingen van de pagina-script).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const URL_ = arg('url', 'http://127.0.0.1:8137/index.html');
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-cutscene-web')));
const ONLY = arg('only', '');
const SPOT = arg('spot', '');
const PORT = +arg('port', 9333);
const W = +arg('w', 1600), H = +arg('h', 900);
const CHROME = arg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
fs.mkdirSync(OUT, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-cs-chrome-'));

const extra = arg('cs', '') ? JSON.parse(arg('cs', '')) : {};
const cs = { ...extra, only: ONLY.split(',').filter(Boolean), settle: +arg('settle', 6000), spot: SPOT ? (([x, y, a]) => ({ x, y, a: a || 0 }))(SPOT.split(',').map(Number)) : undefined };
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `for (let i = 0; i < 120; i++) { if (document.body.classList.contains('game-started')) break; const w = window.__debug && window.__debug.world; if (w && w.paused) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } } await new Promise((r) => setTimeout(r, 500)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
let page = fs.readFileSync(path.join(HERE, arg('page', 'cutscene_shots.page.js')), 'utf8');
page = page.replace("console.log('[capture] ' + name);", "await window.__cap(name);");
const body = `(async () => {\n${WACHT}window.__cs = ${JSON.stringify(cs)};\n${page}\n})()`;

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const kill = () => { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* weg */ } try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* bezet */ } };
process.on('exit', kill);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = null;
for (let i = 0; i < 60 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(500); } }
const tab = targets.find((t) => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0; const pending = new Map(); const log = []; const shots = [];
ws.onmessage = async (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
  if (d.method === 'Runtime.consoleAPICalled') { const t = d.params.args.map((a) => a.value ?? a.description ?? '').join(' '); log.push(`[${d.params.type}] ${t}`); }
  if (d.method === 'Runtime.exceptionThrown') log.push('[exception] ' + JSON.stringify(d.params.exceptionDetails).slice(0, 400));
  if (d.method === 'Runtime.bindingCalled' && d.params.name === '__capNode') {
    const name = d.params.payload;
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'));
    shots.push(name);
    await send('Runtime.evaluate', { expression: 'window.__capR && window.__capR()' });
  }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Runtime.addBinding', { name: '__capNode' });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__cap = (n) => new Promise((r) => { window.__capR = r; window.__capNode(n); });
try { const _g = Storage.prototype.getItem; } catch (e) {}` });
await send('Page.navigate', { url: URL_ });
// het startmenu: 1 = Alleen spelen, 2 = Standaard (zoals GDE_MENU_TEST=1 in Electron)
const press = async (k) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: 'Digit' + k, text: type === 'keyDown' ? k : undefined, windowsVirtualKeyCode: k.charCodeAt(0) }); };
const started = async () => { const r = await send('Runtime.evaluate', { expression: "document.body.classList.contains('game-started')", returnByValue: true }); return r.result && r.result.result && r.result.result.value === true; };
await sleep(8000);
for (let k = 0; k < 6 && !(await started()); k++) { await press('1'); await sleep(2500); await press('2'); await sleep(5000); }
const res = await send('Runtime.evaluate', { expression: body, awaitPromise: true, returnByValue: true, timeout: 3 * 3600 * 1000 }).catch((e) => ({ error: String(e) }));
const val = res.result && res.result.result ? res.result.result.value : JSON.stringify(res).slice(0, 500);
fs.writeFileSync(path.join(OUT, 'features.json'), typeof val === 'string' ? val : JSON.stringify(val));
fs.writeFileSync(path.join(OUT, 'run.log'), log.join('\n'));
console.log(`stills: ${shots.length}, uitvoer: ${OUT}`);
ws.close(); kill();
process.exit(0);
