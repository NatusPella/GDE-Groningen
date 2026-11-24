// Beelden van het echte spel in een headless Chrome (CDP), voor als Electron door drukte of een vergrendeld scherm niet opstart (24-11).
// Het spel is dezelfde gestagede map (desktop/build/<stage>/game), geserveerd op een eigen poort; de scenes zijn dezelfde als bij huidig_beeld.mjs.
//   node docs/ontwerp/bezit-ui-24-11/cdp_beeld.mjs --game=<map> --out=<map> --size=1920x1080 --scenes=<bestand> [--only=leeg|gevuld]
// Eigen profiel en eigen poorten, geen poort 9000 en niet de geïnstalleerde app. Chrome wordt op PID gestopt.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const GAME = path.resolve(arg('game')); const OUT = path.resolve(arg('out')); const SIZE = arg('size', '1920x1080'); const [W, H] = SIZE.split('x').map(Number);
const SCENES = fs.readFileSync(path.resolve(arg('scenes')), 'utf8'); const ONLY = arg('only', '').split(',').filter(Boolean);
const TRAAG = Number(arg('traag', '1'));   // wachttijden van de scenes maal dit getal (software-rendering is traag)
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.bin': 'application/octet-stream', '.gdt': 'application/octet-stream', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.md': 'text/plain' };
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0]); const f = path.join(GAME, u === '/' ? 'index.html' : u);
  if (!f.startsWith(GAME) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port; const DBG = 9300 + Math.floor(Math.random() * 500);
const profiel = path.join(OUT, 'profiel');
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profiel}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const stop = () => { try { chrome.kill(); } catch (e) { /* weg */ } try { server.close(); } catch (e) { /* weg */ } };
process.on('exit', stop);
let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) { await new Promise((r) => setTimeout(r, 500)); try { const l = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json(); const p = l.find((x) => x.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch (e) { /* nog niet */ } }
if (!wsUrl) { console.log('geen Chrome-verbinding'); stop(); process.exit(2); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const wacht = new Map(); const wachtrij = [];
const send = (method, params = {}) => new Promise((res) => { const n = ++id; wacht.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
let shots = 0; let bezig = Promise.resolve();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && wacht.has(m.id)) { wacht.get(m.id)(m.result || m.error); wacht.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled') {
    const t = (m.params.args || []).map((a) => a.value).join(' ');
    const mm = /^\[capture\] (.+)$/.exec(t);
    if (mm) bezig = bezig.then(async () => { const r = await send('Page.captureScreenshot', { format: 'png' }); if (r && r.data) { fs.writeFileSync(path.join(OUT, `${SIZE}-${mm[1].trim()}.png`), Buffer.from(r.data, 'base64')); shots++; } });
  }
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
await new Promise((r) => setTimeout(r, 4000));
const SC = SCENES.split('setTimeout(res, ms)').join(`setTimeout(res, ms * ${TRAAG})`);
const code = `(async () => { window.__dsOnly = ${JSON.stringify(ONLY)}; window.__shotsOnly = ${JSON.stringify(ONLY.join(','))};\n${SC}\n})()`;
const t0 = Date.now();
const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, timeout: 1500000 });
await bezig;
console.log(SIZE, 'klaar', Math.round((Date.now() - t0) / 1000) + 's', shots, 'beelden', JSON.stringify(r && r.result ? r.result.value : r).slice(0, 300));
stop(); process.exit(0);
