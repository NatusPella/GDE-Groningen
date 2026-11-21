// Headless beeldblad van de wapenmodellen (Spullen-wensen 21-11). GEEN Electron: een kleine webserver met de echte game/js en de gevendorde
// three (desktop/vendor-cache), plus headless Chrome voor de PNG. Alle wapens naast elkaar, zoals het voorbeeld in Spullen ze toont.
//   node scripts/ui/weapons_mock.mjs [--bron=spullen] [--uit=<map>] [--only=<wapen,...>] [--hoek=0.6] [--breedte=1600] [--cols=5] [--wit]
// Schrijft <uit>/wapens-<hoek>.png (standaard in de tijdelijke map: de schijf blijft klein). Zet CHROME=<pad> als Chrome elders staat.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = '') => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const UIT = arg('uit') || path.join(os.tmpdir(), 'wapens-beeld');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('geen Chrome gevonden (zet CHROME=<pad>)');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json' };

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#d9d3c0;font:14px sans-serif}#w{position:relative}.l{position:absolute;color:#222;font-weight:700;text-shadow:0 0 3px #fff}</style>
<script type="importmap">{"imports":{"https://cdn.jsdelivr.net/npm/":"/vendor/npm/"}}</script></head><body><div id="w"></div>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const q = new URLSearchParams(location.search);
const P = await import('/game/js/models3d_people.js');
const { WEAPON_KEYS } = await import('/game/js/weapons.js');
const spullen = q.get('bron') === 'spullen';
const S3 = spullen ? await import('/game/js/models3d_spullen.js') : null;
const only = (q.get('only') || '').split(',').filter(Boolean);
const keys = (spullen ? S3.SPUL_TYPES : WEAPON_KEYS).filter((k) => k !== 'fists' && (!only.length || only.includes(k)));
const cols = Number(q.get('cols')) || 5, cw = Math.floor(innerWidth / cols), ch = Math.round(cw * 0.62), rows = Math.ceil(keys.length / cols);
const hoek = Number(q.get('hoek') || 0.6), zoom = Number(q.get('zoom') || 1);
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(cw * cols, ch * rows); r.setScissorTest(true); r.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('w').appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color(0xe6dfc9);
sc.add(new THREE.HemisphereLight(0xfff3dc, 0x6a6a58, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); sc.add(sun);
const rim = new THREE.DirectionalLight(0xbfd4ff, 0.9); rim.position.set(-3, 2, -3); sc.add(rim);
const cam = new THREE.PerspectiveCamera(32, cw / ch, 0.01, 50);
const tri = {};
keys.forEach((k, i) => {
  const m = spullen ? S3.buildSpulMesh({ type: k }) : P.buildWeaponMesh(k);
  const holder = new THREE.Group(); holder.add(m); holder.rotation.y = hoek; sc.add(holder);
  holder.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(holder), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const rad = b.getBoundingSphere(new THREE.Sphere()).radius * 1.0 / zoom;
  const d = rad / Math.sin(THREE.MathUtils.degToRad(16)) * 1.05;
  cam.position.set(c.x + d * 0.12, c.y + d * 0.18, c.z + d); cam.lookAt(c); cam.updateProjectionMatrix();
  const x = (i % cols) * cw, y = ch * (rows - 1 - Math.floor(i / cols));
  r.setViewport(x, y, cw, ch); r.setScissor(x, y, cw, ch); r.render(sc, cam);
  sc.remove(holder);
  let t = 0; m.traverse((o) => { if (o.geometry) t += o.geometry.attributes.position.count / 3; });
  tri[k] = t;
  const lab = document.createElement('div'); lab.className = 'l'; lab.textContent = k + ' ' + t; lab.style.cssText = 'left:' + (x + 8) + 'px;top:' + (Math.floor(i / cols) * ch + 6) + 'px';
  document.getElementById('w').appendChild(lab);
});
window.__klaar = true;
<\/script></body></html>`;

const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/mock.html') { res.writeHead(200, { 'content-type': TYPES['.html'] }); res.end(PAGE); return; }
  const file = u.startsWith('/vendor/') ? path.join(ROOT, 'desktop/vendor-cache', u.slice(8)) : u.startsWith('/game/') ? path.join(ROOT, u) : null;
  if (!file) { res.writeHead(404); res.end(); return; }
  fs.readFile(file, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
fs.mkdirSync(UIT, { recursive: true });
const hoek = arg('hoek', '0.6'), breedte = Number(arg('breedte', '1600')), cols = Number(arg('cols', '5')), only = arg('only');
const bron = arg('bron');
const n = only ? only.split(',').length : bron === 'spullen' ? 23 : 13;
const hoogte = Math.ceil(n / cols) * Math.round((breedte / cols) * 0.62) + 20;
const uit = path.join(UIT, `${bron === 'spullen' ? 'spullen' : 'wapens'}-${only ? only.replace(/,/g, '_') + '-' : ''}${hoek}.png`);
const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'wapens-chrome-'));
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const kind = spawn(CHROME, ['--headless=new', `--user-data-dir=${profiel}`, '--remote-debugging-port=0', '--hide-scrollbars', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
try {
  const ws0 = await new Promise((res, rej) => {
    let buf = '';
    const t = setTimeout(() => rej(new Error('Chrome start niet')), 20000);
    kind.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf); if (m) { clearTimeout(t); res(m[1]); } });
  });
  const doel = await (await fetch(`http://127.0.0.1:${new URL(ws0).port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(doel.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const open = new Map(); const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && open.has(m.id)) { open.get(m.id)(m); open.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map((x) => x.value ?? x.description ?? '').join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('uitzondering: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; open.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: breedte, height: hoogte, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url: `http://127.0.0.1:${port}/mock.html?hoek=${hoek}&cols=${cols}&zoom=${arg('zoom', '1')}${bron ? '&bron=' + bron : ''}${only ? '&only=' + only : ''}` });
  let klaar = false;
  for (let i = 0; i < 80 && !klaar; i++) {
    await wacht(500);
    const r = await cmd('Runtime.evaluate', { expression: 'window.__klaar === true', returnByValue: true });
    klaar = r.result && r.result.result && r.result.result.value === true;
  }
  const shot = await cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(uit, Buffer.from(shot.result.data, 'base64'));
  if (logs.length) console.log(logs.slice(0, 8).join('\n'));
  console.log(klaar ? uit : 'NIET KLAAR ' + uit);
  ws.close();
} finally {
  kind.kill();
  srv.close();
  await wacht(300);
  try { fs.rmSync(profiel, { recursive: true, force: true }); } catch { /* Windows houdt het profiel soms even vast */ }
}
