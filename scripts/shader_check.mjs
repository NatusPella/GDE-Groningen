// Compiles the water mesh shader (all three quality profiles) and the terrain
// shader (with its far water) in headless Chrome with a software GL and reports
// any shader error (#181). A short-lived headless instance on a temporary
// profile; nothing is written to the game's storage. Skips without Chrome.
//   node scripts/shader_check.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const THREE = [path.join(ROOT, 'desktop/build/game/vendor/npm/three@0.160.0/build/three.module.js'), path.join(ROOT, '../../../desktop/build/game/vendor/npm/three@0.160.0/build/three.module.js')].find((p) => fs.existsSync(p));
if (!CHROME || !THREE) { console.log('SKIP no Chrome or no vendored three.js'); process.exit(0); }

const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js":"/vendor/three.module.js"}}</script>
<pre id="out">running</pre>
<script type="module">
const out = { errors: [], programs: 0, ok: false };
const origErr = console.error;
console.error = (...a) => { out.errors.push(a.join(' ').slice(0, 1500)); };
window.addEventListener('error', (e) => out.errors.push('window: ' + e.message));
try {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  const { createWaterMaterial } = await import('/js/water3d.js');
  const { createTerrainMaterial } = await import('/js/terrain3d.js');
  const r = new THREE.WebGLRenderer();
  r.setSize(64, 64);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  cam.position.set(0, 20, 20); cam.lookAt(0, 0, 0);
  scene.add(new THREE.DirectionalLight(0xffffff, 1), new THREE.AmbientLight(0xffffff, 0.5));
  const geo = new THREE.PlaneGeometry(40, 40, 4, 4); geo.rotateX(-Math.PI / 2);
  const n = geo.getAttribute('position').count;
  geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(new Float32Array(n).fill(3), 1));
  geo.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  for (const q of [0, 1, 2]) {
    const m = createWaterMaterial();
    m.defines.WATER_Q = q; m.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, m); mesh.position.y = 0.1; scene.add(mesh);
    r.render(scene, cam);
    scene.remove(mesh);
    out['water' + q] = true;
  }
  const t = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), createTerrainMaterial());
  scene.add(t);
  for (const q of [0, 1, 2]) {
    t.material.defines = { ...(t.material.defines || {}), WATER_Q: q }; t.material.needsUpdate = true;
    r.render(scene, cam);
    out['terrain' + q] = true;
  }
  out.programs = r.info.programs.length;
  out.ok = true;
} catch (e) { out.errors.push('exception: ' + (e && e.stack || e)); }
document.getElementById('out').textContent = JSON.stringify(out);
</script>`;

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/check.html') { res.setHeader('content-type', 'text/html'); res.end(PAGE); return; }
  const f = u === '/vendor/three.module.js' ? THREE : path.join(ROOT, 'game', u);
  if (!f.startsWith(path.join(ROOT, 'game')) && f !== THREE) { res.statusCode = 403; res.end(); return; }
  fs.readFile(f, (e, b) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); res.end(b); } });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-shader-'));
const child = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--virtual-time-budget=20000', '--dump-dom', `http://127.0.0.1:${port}/check.html`], { stdio: ['ignore', 'pipe', 'ignore'] });
let dom = '';
child.stdout.on('data', (d) => { dom += d; });
const killer = setTimeout(() => child.kill(), 90000);
await new Promise((r) => child.on('close', r));
clearTimeout(killer);
server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* a locked file in the temp profile */ }
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
let out;
try { out = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch { console.log('FAIL no result from the page:', (m && m[1] || dom).slice(0, 300)); process.exit(1); }
const bad = out.errors.filter((e) => /Shader Error|Program Info Log|exception|window:/i.test(e));
console.log(`programs ${out.programs}; water ${[0, 1, 2].map((q) => out['water' + q] ? 'ok' : 'x').join('')}, terrain ${[0, 1, 2].map((q) => out['terrain' + q] ? 'ok' : 'x').join('')}`);
for (const e of bad) console.log('FAIL ' + e.slice(0, 800));
console.log(out.ok && !bad.length ? 'shaders compile' : 'SHADER CHECK FAILED');
process.exit(out.ok && !bad.length ? 0 : 1);
