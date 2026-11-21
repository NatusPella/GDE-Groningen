// Headless mock van de interieurs (epic Interieurs, #1150): rendert een paar gegenereerde interieurs naar PNG (deurbeeld en
// plattegrond, plafond weggeknipt) met three.js uit de vendor-cache in headless Chrome, en meet draw calls en driehoeken.
// Geen Electron en geen game/world: synthetische panden (scripts/interior_fixtures.mjs). Schrijft naar docs/beeld-21-11/interieurs/.
//   node scripts/interior_mock_render.mjs [--only=winkel/bakker,kerk] [--chrome=<pad>]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/beeld-21-11/interieurs');
const THREE_FILE = path.join(ROOT, 'desktop/vendor-cache/npm/three@0.160.0/build/three.module.js');
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const CHROME = arg('chrome') || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
if (!CHROME) { console.log('SKIP geen Chrome gevonden'); process.exit(0); }
if (!fs.existsSync(THREE_FILE)) { console.log('SKIP three.js ontbreekt in desktop/vendor-cache (cd desktop && npm run stage)'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });

const CASES = (arg('only') || 'winkel/supermarkt,winkel/bakker,winkel/kleding,winkel/kapper,horeca/cafe,horeca/kroeg,kantoor,woning,kerk,station,bibliotheek,garage/werkplaats,publiek/politie').split(',');

const PAGE = `<!doctype html><meta charset="utf-8"><title>interieurmock</title>
<script type="importmap">{"imports":{"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js":"/__three.js"}}</script>
<body style="margin:0;background:#222">
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { planInterior } from '/game/js/interiorrules.js';
import { buildInteriorGeometry, solidMaterial, lampMaterial, glassMaterial } from '/game/js/interiorbuild3d.js';
import { building } from '/scripts/interior_fixtures.mjs';
import { mulberry32 } from '/game/js/rng.js';
const cases = ${JSON.stringify(CASES)};
const SIZES = { winkel: [8, 11], horeca: [9, 12], kantoor: [10, 14], woning: [7, 11], kerk: [11, 26], station: [14, 14], bibliotheek: [13, 14], garage: [9, 12], publiek: [10, 12] };
const W = 560, H = 360;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.localClippingEnabled = true; document.body.appendChild(renderer.domElement);
const post = (url, body, type) => fetch(url, { method: 'POST', body, headers: type ? { 'content-type': type } : {} });
const results = [];
for (const spec of cases) {
  const [kind, sub = null] = spec.split('/');
  const [w, d] = SIZES[kind] || [9, 12];
  const rnd = mulberry32(5);
  const { b, spot } = building(kind, sub, w, d, rnd);
  const plan = planInterior(b, { spot });
  if (!plan.ok) { results.push({ spec, error: plan.why }); continue; }
  const t0 = performance.now();
  const { geometry, triangles } = buildInteriorGeometry(plan, 0, { x: 0, y: 0 });
  const buildMs = performance.now() - t0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec3e0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.2); sun.position.set(-3, 8, 4); scene.add(sun);
  const mesh = new THREE.Mesh(geometry, [solidMaterial, lampMaterial, glassMaterial]);
  scene.add(mesh);
  const out = document.createElement('canvas'); out.width = W * 2; out.height = H;
  const g = out.getContext('2d');
  const hall = plan.hall;
  // plattegrond-beeld wordt in wereldrichting getoond met de deur onderaan: de deur-as is (0, 0) in lokale frame; wereld = frame
  const fr = plan.frame;
  const toW = (u, v) => [fr.ox + fr.tx * u - fr.nx * v, fr.oy + fr.ty * u - fr.ny * v];
  // 1. deurbeeld: oog 1,6 m, op de deur, kijkt het gebouw in
  const cam = new THREE.PerspectiveCamera(72, W / H, 0.05, 80);
  const [ex, ey] = toW(0, 0.9); const [lx, ly] = toW(0, hall.v1 * 0.8);
  cam.position.set(ex, 1.6, ey); cam.lookAt(lx, 1.2, ly);
  renderer.clippingPlanes = [];
  renderer.info.reset(); renderer.render(scene, cam);
  const calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  g.drawImage(renderer.domElement, 0, 0);
  // 2. plattegrond: boven, plafond weggeknipt
  const [cx, cy] = toW((hall.u0 + hall.u1) / 2, (hall.v0 + hall.v1) / 2);
  const span = Math.max(hall.u1 - hall.u0, hall.v1 - hall.v0) * 1.12;
  const top = new THREE.OrthographicCamera(-span * W / H / 2, span * W / H / 2, span / 2, -span / 2, 0.1, 100);
  top.position.set(cx, 40, cy);
  // de deur onderaan: 'up' van het beeld = de richting van de achterwand
  const [bx, by] = toW(0, 1); top.up.set(bx - fr.ox, 0, by - fr.oy); top.lookAt(cx, 0, cy);
  renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), plan.height - 0.03)];
  renderer.render(scene, top);
  g.drawImage(renderer.domElement, W, 0);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 360, 22);
  g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(spec + '  ' + plan.label + '  ' + (hall.u1 - hall.u0).toFixed(1) + 'x' + (hall.v1 - hall.v0).toFixed(1) + ' m  ' + triangles + ' dr', 6, 16);
  await post('/png?name=' + encodeURIComponent(spec.replace('/', '_')), out.toDataURL('image/png').split(',')[1], 'text/plain');
  results.push({ spec, kind, sub, label: plan.label, hall: [hall.u1 - hall.u0, hall.v1 - hall.v0], items: plan.layout.items.length, npc: plan.layout.npc.length, triangles, drawCallsView: calls, trianglesView: tris, buildMs: Math.round(buildMs * 10) / 10, geometryBytes: geometry.attributes.position.array.byteLength * (26 / 12) });
  geometry.dispose();
}
await post('/done', JSON.stringify(results), 'application/json');
</script>`;

const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (u.pathname === '/png') { fs.writeFileSync(path.join(OUT, u.searchParams.get('name') + '.png'), Buffer.from(body.toString(), 'base64')); res.end('ok'); }
      else if (u.pathname === '/done') { fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(JSON.parse(body.toString()), null, 1)); res.end('ok'); finish(JSON.parse(body.toString())); }
      else res.end('?');
    });
    return;
  }
  if (u.pathname === '/') { res.setHeader('content-type', 'text/html'); res.end(PAGE); return; }
  const file = u.pathname === '/__three.js' ? THREE_FILE : path.join(ROOT, u.pathname);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('404'); return; }
  res.setHeader('content-type', 'text/javascript');
  res.end(fs.readFileSync(file));
});

let chrome = null;
function finish(results) {
  for (const r of results) console.log(r.error ? `  ${r.spec}: ${r.error}` : `  ${r.spec.padEnd(22)} hal ${r.hall.map((x) => x.toFixed(1)).join('x')} m, ${String(r.items).padStart(2)} items, ${String(r.triangles).padStart(5)} driehoeken, ${r.drawCallsView} draw calls, bouw ${r.buildMs} ms`);
  setTimeout(() => { try { chrome.kill(); } catch (e) { /* al weg */ } srv.close(); process.exit(0); }, 300);
}
srv.listen(0, '127.0.0.1', () => {
  const port = srv.address().port;
  const profile = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'gde-interieur-'));
  chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--disable-extensions', `--user-data-dir=${profile}`, '--window-size=1200,800', `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
  setTimeout(() => { console.log('TIMEOUT: de mock werd niet klaar'); try { chrome.kill(); } catch (e) { /* al weg */ } process.exit(1); }, 120000);
});
