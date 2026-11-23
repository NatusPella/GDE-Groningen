// Beelden van de ruimtes van akte 1 (vertical slice, 23-11): de keuken van de opening (introkitchen3d.js) en de flat van Tammo
// en Tessa (home3d.js buildFlat3D), headless in Chrome met three.js uit de vendor-cache. Geen Electron, geen wereld: de set staat
// alleen, met het licht van de wereld nagebootst (hemel- en zonlicht zoals scene3d.js, ACES-tonemapping). Per camerastandpunt
// één JPEG in de uitvoermap, met het label ervoor (voor of na).
//   node scripts/akte1/sets_render.mjs --tag=voor|na [--out=docs/beeld-23-11/akte1] [--bron=<map met game/js>] [--chrome=<pad>]
// De pagina met voor- en na-beelden naast elkaar: node scripts/akte1/sets_pagina.mjs
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { vindVendorCache } from '../lib/vendorcache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const TAG = arg('tag', 'na');
// --bron=<map>: de spelcode uit een andere map (de voor-beelden: git archive van de oude stand), standaard deze worktree
const SRC = path.resolve(ROOT, arg('bron', '.'));
const OUT = path.resolve(ROOT, arg('out', 'docs/beeld-23-11/akte1'));
const VENDOR = vindVendorCache(ROOT).dirs[0];
const NPM = VENDOR ? path.join(VENDOR, 'npm/three@0.160.0') : null;
const CHROME = arg('chrome') || [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.log('SKIP geen Chrome gevonden'); process.exit(0); }
if (!NPM || !fs.existsSync(NPM)) { console.log('SKIP three.js ontbreekt in de vendor-cache (cd desktop && npm run stage)'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });

const PAGE = `<!doctype html><meta charset="utf-8"><title>akte1-sets</title>
<script type="importmap">{"imports":{"three":"/__three/build/three.module.js","https://cdn.jsdelivr.net/npm/three@0.160.0/":"/__three/","three/addons/":"/__three/examples/jsm/"}}</script>
<body style="margin:0;background:#222">
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const post = (url, body) => fetch(url, { method: 'POST', body });
const log = (m) => post('/log', String(m));
window.addEventListener('error', (e) => log('error ' + e.message));
try {
const W = 960, H = 540;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const world = (scene) => {
  scene.add(new THREE.HemisphereLight(0xb4cdea, 0x6f6454, 0.9));
  const sun = new THREE.DirectionalLight(0xffd29a, 3.3); sun.position.set(-30, 18, 10); scene.add(sun);
};
const shot = async (scene, name, from, at, fov = 50) => {
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.05, 200);
  cam.position.set(...from); cam.lookAt(...at);
  renderer.info.reset();
  renderer.render(scene, cam);
  const info = renderer.info.render;
  await post('/jpg?name=' + encodeURIComponent(name) + '&calls=' + info.calls + '&tris=' + info.triangles, renderer.domElement.toDataURL('image/jpeg', 0.86).split(',')[1]);
};

// 0. het meubelblad: elk meubel uit het interieurregister met een paal van 1,8 m en een pijl naar de voorkant (+x); lod 0 en lod 1
if (${JSON.stringify(process.argv.includes('--blad'))}) {
  const { INTERIEUR_IDS } = await import('/game/js/propregister.js');
  const { interiorPropGeometry, INTERIOR_PROP_MATERIALS, interiorPropSize, interiorProp } = await import('/game/js/interiorprops3d.js');
  // lod 1 komt uit het centrale LOD-systeem (lodkit3d.js): het eerste lichtere niveau van een geplaatst exemplaar
  const geoVan = (id, lod) => { if (!lod) return interiorPropGeometry(id, 0); const e = interiorProp(id).userData.lod.entries[0]; return (e[1] || e[0]).geometry; };
  const T = 240, cols = 6;
  const rows = Math.ceil(INTERIEUR_IDS.length / cols);
  for (const lod of [0, 1]) {
    const sheet = document.createElement('canvas'); sheet.width = T * cols; sheet.height = T * rows;
    const g2 = sheet.getContext('2d');
    renderer.setSize(T, T);
    for (let i = 0; i < INTERIEUR_IDS.length; i++) {
      const id = INTERIEUR_IDS[i];
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe8e4da);
      scene.add(new THREE.HemisphereLight(0xb4cdea, 0x6f6454, 0.9));
      const sun = new THREE.DirectionalLight(0xffd29a, 3.0); sun.position.set(20, 25, 12); scene.add(sun);
      const gg = geoVan(id, lod);
      const m = new THREE.Mesh(gg, gg.groups.length > 1 ? INTERIOR_PROP_MATERIALS : INTERIOR_PROP_MATERIALS[gg.groups.length ? gg.groups[0].materialIndex : 0]); scene.add(m);
      const s = interiorPropSize(id), r = Math.max(...s, 1.8);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a6fdb })); pole.position.set(0, 0.9, -s[2] / 2 - 0.25); scene.add(pole);
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(s[0] / 2, 0.02, 0), 0.6, 0xd03030); scene.add(arrow);
      const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
      cam.position.set(r * 2.0, r * 0.9, r * 0.7); cam.lookAt(0, s[1] / 2, 0);
      renderer.render(scene, cam);
      const x = (i % cols) * T, y = Math.floor(i / cols) * T;
      g2.drawImage(renderer.domElement, x, y);
      g2.fillStyle = 'rgba(0,0,0,0.6)'; g2.fillRect(x, y, T, 18); g2.fillStyle = '#fff'; g2.font = '12px sans-serif';
      g2.fillText(id + ' ' + s.map((v) => v.toFixed(2)).join('x') + ' ' + (geoVan(id, lod).attributes.position.count / 3) + 't', x + 4, y + 13);
    }
    await post('/jpg?name=meubelblad-lod' + lod + '&calls=0&tris=0', sheet.toDataURL('image/jpeg', 0.86).split(',')[1]);
  }
  renderer.setSize(W, H);
}

// 1. de keuken van de opening (plan: u = x, v = z, h = y; de tafel op de oorsprong)
if (!${JSON.stringify(process.argv.includes('--alleen-blad'))}) {
  const { buildKitchen } = await import('/game/js/introkitchen3d.js');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);
  world(scene);
  const kit = buildKitchen(0, 0, 0);
  scene.add(kit.group);
  for (const c of kit.tableCups) c.visible = true;
  await shot(scene, 'keuken-breed', [0.75, 1.62, 1.5], [-1.2, 1.0, -0.9], 64);
  await shot(scene, 'keuken-schouder', [1.55, 1.3, 0.55], [-0.82, 1.05, -0.05], 45);
  await shot(scene, 'keuken-aanrecht', [-0.4, 1.55, 1.5], [0.4, 0.95, -1.6], 58);
  await shot(scene, 'keuken-deur', [-1.7, 1.55, -0.9], [1.3, 1.1, 1.75], 55);
  await shot(scene, 'keuken-raam', [1.6, 1.45, -0.3], [-2.2, 1.35, 0.1], 55);
  // het deurshot van de naamkaart (intromontage.js tammoCard) met een maatpop van 1,78 m in de deur (romp, hoofd op 1,66 m ooghoogte);
  // de balken geven de letterbox van 2,39:1 aan
  const pop = new THREE.Group();
  const huid = new THREE.MeshStandardMaterial({ color: 0xd9a77e }), jas = new THREE.MeshStandardMaterial({ color: 0x3d6fa8 });
  const romp = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 4, 10), jas); romp.position.y = 1.0; pop.add(romp);
  const hoofd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), huid); hoofd.scale.y = 1.15; hoofd.position.y = 1.64; pop.add(hoofd);
  pop.position.set(1.3, 0, 1.62); scene.add(pop);
  kit.hinge.rotation.y = -1.25;
  const tag = '${TAG}';
  const camZ = tag === 'voor' ? [0.3, 1.6, 1.56] : [0.02, 1.66, 1.62];
  const cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 200);
  cam.position.set(1.25, camZ[1], camZ[0]); cam.lookAt(1.3, camZ[2], 1.62);
  renderer.render(scene, cam);
  const lb = document.createElement('canvas'); lb.width = W; lb.height = H;
  const lg = lb.getContext('2d'); lg.drawImage(renderer.domElement, 0, 0);
  const bar = Math.round((H - W / 2.39) / 2); lg.fillStyle = '#000'; lg.fillRect(0, 0, W, bar); lg.fillRect(0, H - bar, W, bar);
  await post('/jpg?name=keuken-deurshot&calls=0&tris=0', lb.toDataURL('image/jpeg', 0.86).split(',')[1]);
  scene.remove(pop);
  kit.dispose();
}

// 2. de flat van Tammo en Tessa in Paddepoel (cutaway: de wanden tot heuphoogte, de camera erboven zoals in het spel)
if (!${JSON.stringify(process.argv.includes('--alleen-blad'))}) {
  const { makeFlatPlan } = await import('/game/js/flatplan.js');
  const { buildFlat3D, setFlatFacade } = await import('/game/js/home3d.js');
  const FP = makeFlatPlan();
  const flat = { ox: 0, oy: 0, angle: 0, floorY: 0, w: FP.w, d: FP.d, tower: { w: 22, d: 18 }, rooms: FP.rooms, walls: FP.walls, spots: FP.spots, solids: FP.solids };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec3e0);
  world(scene);
  const g = buildFlat3D(flat);
  setFlatFacade(g, 1);
  scene.add(g);
  await shot(scene, 'flat-overzicht', [5.5, 13, -5.5], [5.5, 0, 4.6], 55);
  await shot(scene, 'flat-woonkamer', [6.3, 3.6, -0.4], [2.8, 0.5, 3.6], 60);
  await shot(scene, 'flat-keuken', [5.6, 3.4, 4.6], [9.6, 0.6, 1.2], 60);
  await shot(scene, 'flat-slaapkamers', [7.2, 4.6, 4.2], [7.2, 0.4, 8.0], 62);
}
await post('/done', 'ok');
} catch (e) { await log('FOUT ' + (e && e.stack || e)); await post('/done', 'fout'); }
</script>`;

const stats = {};
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      if (u.pathname === '/jpg') {
        const name = u.searchParams.get('name');
        fs.writeFileSync(path.join(OUT, `${name}-${TAG}.jpg`), Buffer.from(body, 'base64'));
        stats[name] = { calls: +u.searchParams.get('calls'), tris: +u.searchParams.get('tris') };
        console.log(`  ${name}-${TAG}.jpg  ${stats[name].calls} draw calls, ${stats[name].tris} driehoeken`);
      } else if (u.pathname === '/log') console.log('  pagina:', body);
      else if (u.pathname === '/done') { finish(body); }
      res.end('ok');
    });
    return;
  }
  if (u.pathname === '/') { res.setHeader('content-type', 'text/html'); res.end(PAGE); return; }
  const file = u.pathname.startsWith('/__three/') ? path.join(NPM, u.pathname.slice(9)) : path.join(SRC, decodeURIComponent(u.pathname));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('404'); return; }
  res.setHeader('content-type', file.endsWith('.json') ? 'application/json' : 'text/javascript');
  res.end(fs.readFileSync(file));
});

let chrome = null;
function finish(status) {
  const f = path.join(OUT, `stats-${TAG}.json`);
  fs.writeFileSync(f, JSON.stringify(stats, null, 1));
  console.log(status === 'ok' ? 'klaar' : 'FOUT in de pagina');
  setTimeout(() => { try { chrome.kill(); } catch (e) { /* al weg */ } srv.close(); process.exit(status === 'ok' ? 0 : 1); }, 300);
}
srv.listen(0, '127.0.0.1', () => {
  const port = srv.address().port;
  const profile = path.join(ROOT, '.tmp-akte1', 'chrome-profiel');
  fs.mkdirSync(profile, { recursive: true });
  chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--disable-extensions', `--user-data-dir=${profile}`, '--window-size=1000,600', `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
  setTimeout(() => { console.log('TIMEOUT'); try { chrome.kill(); } catch (e) { /* al weg */ } process.exit(1); }, 180000);
});
