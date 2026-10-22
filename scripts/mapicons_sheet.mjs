// Contactblad van alle kaarticonen (alleen voor het oog van de ontwerper, geen test).
// Elk icoon staat twee keer: op de minikaart (miniIconScale, MINI_PALETTE-weiland) en op de
// grote kaart (mapIconScale, MAP_PALETTE-weiland), met zijn halo, zoals mapview.js en hud_panel.js ze tekenen.
// Draait hud_panel.js in headless Chrome op een tijdelijk profiel via een lokale server op een
// willekeurige poort; geen Electron, geen opslag van het spel.
//   node scripts/mapicons_sheet.mjs <uitmap> [voor|na] [zoom] [blad]   (schrijft <uitmap>/<naam>-1.png, -2.png ...)
// zoom (standaard 1) vergroot het blad om te lezen; blad (1-based) rendert alleen dat blad.
//   node scripts/mapicons_sheet.mjs <uitmap> wind [zoom]   (de windaanwijzer van de minikaart, #399: zes minikaartjes)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'gde-mapicons'));
const NAME = process.argv[3] || 'blad';
const ZOOM = +process.argv[4] || 1;
const ONLY = +process.argv[5] || 0;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const THREE = [path.join(ROOT, 'desktop/build/game/vendor/npm/three@0.160.0/build/three.module.js'), path.join(ROOT, '../../../desktop/build/game/vendor/npm/three@0.160.0/build/three.module.js')].find((p) => fs.existsSync(p));
if (!CHROME || !THREE) { console.log('SKIP geen Chrome of geen three.js in desktop/build/game/vendor'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });

const COLS = ZOOM > 1 ? 4 : 8, ROWS = 5, CELL_W = 214, CELL_H = 124;
const PAGE = `<!doctype html><meta charset="utf-8"><title>kaarticonen</title>
<script type="importmap">{"imports":{"three":"/vendor/three.module.js","https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script>
<style>
html,body{margin:0}
body{zoom:${ZOOM};background:#101512;color:#e8e4d8;font:11px/1.2 Arial,sans-serif}
#g{display:grid;grid-template-columns:repeat(${COLS},${CELL_W}px);grid-auto-rows:${CELL_H}px;width:${COLS * CELL_W}px}
.c{box-sizing:border-box;padding:4px 6px;border-right:1px solid #243028;border-bottom:1px solid #243028}
.sw{display:flex;gap:4px}
canvas{width:64px;height:80px;display:block;border-radius:4px}
.l{margin-top:4px;word-break:break-all;color:#cfd6c8}
#t{padding:4px 6px;color:#9fb5a2}
</style><div id="t"></div><div id="g"></div><pre id="out" style="display:none">running</pre>
<script type="module">
const q = new URLSearchParams(location.search), page = +q.get('p') || 0;
const out = { ok: false, total: 0, errors: [] };
window.addEventListener('error', (e) => out.errors.push('window: ' + e.message));
try {
  const { drawMapIcon, drawMapIconHalo } = await import('/js/hud_panel.js');
  const { miniIconScale, mapIconScale, mapFillColor } = await import('/js/mapicons.js');
  const { MAP_PALETTE, MINI_PALETTE } = await import('/js/mapstyle.js');
  const { SHOP_TYPES } = await import('/js/shopdata.js');
  const { SIDE_JOBS } = await import('/js/sidejobs.js');
  const { ACTIVITY_LEGEND } = await import('/js/activities.js');
  const items = [];
  const add = (kind, label, opts = {}) => items.push({ kind, label: label || kind, opts });
  for (const k of ['player', 'companion', 'cash', 'car', 'userWaypoint', 'missionIdle', 'missionActive', 'mi-0', 'ma-0', 'mi-5', 'waypoint', 'eierbalTip']) add(k);
  for (const v of ['partner']) for (const f of ['driehoek', 'ruit', 'vierkant', 'cirkel', 'vijfhoek', 'ster', 'plus', 'kruis', 'maan', 'hart', 'bliksem', 'druppel', 'blok', 'golf', 'schild', 'bloem']) add(v, v + ' ' + f, { vorm: f, kleur: '#ff8a3d' });
  for (const v of ['car', 'bike', 'scooter', 'boat', 'heli']) add('own', 'own ' + v, { vkind: v, color: '#d94f4f' });
  for (const k of ['home', 'homeGarage', 'homeMooring', 'homeHelipad', 'garage', 'hospital', 'politiebureau', 'station', 'horeca', 'flitspaal', 'landmark', 'police', 'policeFoot', 'policeBike', 'policeHorse', 'pigeon', 'heli', 'padel', 'dorp', 'dorpKlaar', 'wereldeinde', 'pg-jelle', 'pg-fjord', 'sj-target', 'sj-dot', 'mm-gevaar', 'mm-rival', 'mm-halte', 'mm-ring', 'mm-pad', 'mm-brug', 'mm-subdoel', 'mm-hulp']) add(k);
  for (const k of Object.keys(SHOP_TYPES)) add('shop-' + k);
  add('shop-kleding', 'shop-kleding ontdekt', { state: 'ontdekt' });
  add('shop-kleding', 'shop-kleding vergrendeld', { state: 'vergrendeld' });
  for (const j of SIDE_JOBS) add('sj-' + j.id);
  for (const a of ACTIVITY_LEGEND) add(a.kind);
  out.total = items.length;
  const per = ${COLS * ROWS}, from = page * per;
  document.getElementById('t').textContent = 'kaarticonen, blad ' + (page + 1) + '  (links: grote kaart, schaal ' + mapIconScale(3).toFixed(1) + ' op weiland; rechts: minikaart, schaal ' + miniIconScale(190).toFixed(2) + ')';
  const dpr = 2 * ${ZOOM};
  const g = document.getElementById('g');
  for (const it of items.slice(from, from + per)) {
    const cell = document.createElement('div'); cell.className = 'c';
    const sw = document.createElement('div'); sw.className = 'sw';
    for (const [pal, scale, water] of [[MAP_PALETTE, mapIconScale(3), false], [MAP_PALETTE, mapIconScale(3), true], [MINI_PALETTE, miniIconScale(190), false]]) {
      const cv = document.createElement('canvas'); cv.width = 64 * dpr; cv.height = 80 * dpr;
      const c = cv.getContext('2d'); c.scale(dpr, dpr);
      c.fillStyle = water ? pal.water : pal.meadow; c.fillRect(0, 0, 64, 80);
      c.fillStyle = pal.road; c.fillRect(0, 62, 64, 3);
      const cy = it.kind === 'userWaypoint' ? 52 : 34; // de pin hangt met zijn punt aan het punt
      drawMapIconHalo(c, it.kind, 32, cy, scale);
      drawMapIcon(c, it.kind, 32, cy, scale, { t: 0, angle: -Math.PI / 4, ...it.opts });
      sw.appendChild(cv);
    }
    const l = document.createElement('div'); l.className = 'l'; l.textContent = it.label;
    cell.append(sw, l); g.appendChild(cell);
  }
  out.ok = true;
} catch (e) { out.errors.push('exception: ' + (e && e.stack || e)); }
document.getElementById('out').textContent = JSON.stringify(out);
</script>`;

// de windaanwijzer (#399) op zes minikaartjes: drie windsterktes, vier kaartdraaiingen
const WIND_PAGE = `<!doctype html><meta charset="utf-8"><title>wind</title>
<script type="importmap">{"imports":{"three":"/vendor/three.module.js","https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script>
<style>html,body{margin:0;background:#101512;color:#e8e4d8;font:12px Arial,sans-serif}body{zoom:${ZOOM}}#g{display:grid;grid-template-columns:repeat(3,250px);gap:6px;padding:6px}.c{width:250px}canvas{display:block;width:250px;height:250px}</style>
<div id="g"></div><pre id="out" style="display:none">running</pre>
<script type="module">
const out = { ok: false, errors: [] };
window.addEventListener('error', (e) => out.errors.push('window: ' + e.message));
try {
  const { drawMiniWind, WIND_X, WIND_Y, drawMapIcon } = await import('/js/hud_panel.js');
  const { MINI_PALETTE } = await import('/js/mapstyle.js');
  const { windOp } = await import('/js/zeilrules.js');
  const cases = [[2, 0], [5.5, Math.PI / 2], [9, Math.PI], [2.5, -0.6], [6.5, 2.4], [9, 0.9]];
  const dpr = 2 * ${ZOOM};
  for (const [speed, rot] of cases) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 250 * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const P = MINI_PALETTE;
    c.fillStyle = P.meadow; c.fillRect(0, 0, 250, 250);
    c.fillStyle = P.water; c.fillRect(0, 150, 250, 100); c.fillRect(90, 0, 40, 250);
    c.fillStyle = P.road; c.fillRect(0, 60, 250, 6);
    c.fillStyle = P.building; for (const [x, y] of [[20, 20], [40, 90], [170, 40], [190, 100], [20, 130]]) c.fillRect(x, y, 28, 20);
    drawMapIcon(c, 'player', 125, 125, 1.8, { angle: -Math.PI / 2 + rot });
    drawMiniWind(c, WIND_X, 250 - WIND_Y, { van: 0.5, snelheid: speed }, rot);
    const d = document.createElement('div'); d.className = 'c'; d.appendChild(cv);
    const l = document.createElement('div'); l.textContent = 'wind ' + speed + ' m/s, kaart gedraaid ' + Math.round(rot * 180 / Math.PI) + ' graden, wind uit 0,5 rad';
    d.appendChild(l); document.getElementById('g').appendChild(d);
  }
  out.ok = true;
} catch (e) { out.errors.push('exception: ' + (e && e.stack || e)); }
document.getElementById('out').textContent = JSON.stringify(out);
</script>`;

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/sheet.html') { res.setHeader('content-type', 'text/html'); res.end(PAGE); return; }
  if (u === '/wind.html') { res.setHeader('content-type', 'text/html'); res.end(WIND_PAGE); return; }
  const f = u === '/vendor/three.module.js' ? THREE : u.startsWith('/vendor/addons/') ? path.join(path.dirname(THREE), '../examples/jsm', u.slice(15)) : path.join(ROOT, 'game', u);
  fs.readFile(f, (e, b) => {
    if (e) { console.log('404', u); res.statusCode = 404; res.end(); return; }
    res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream');
    res.end(b);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-sheet-'));
const chrome = (args) => new Promise((resolve) => {
  const child = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=15000', ...args], { stdio: ['ignore', 'pipe', 'ignore'] });
  let dom = '';
  child.stdout.on('data', (d) => { dom += d; });
  const killer = setTimeout(() => child.kill(), 90000);
  child.on('close', () => { clearTimeout(killer); resolve(dom); });
});
if (NAME === 'wind') {
  const file = path.join(OUT, 'wind.png');
  await chrome([`--screenshot=${file}`, `--window-size=${(3 * 256 + 12) * ZOOM},${(2 * 276 + 12) * ZOOM}`, `http://127.0.0.1:${port}/wind.html`]);
  console.log(fs.existsSync(file) ? 'geschreven ' + file : 'MISLUKT ' + file);
  server.close();
  process.exit(0);
}
const dom = await chrome(['--dump-dom', `http://127.0.0.1:${port}/sheet.html?p=0`]);
const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
let info;
try { info = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch { console.log('FAIL geen resultaat van de pagina:', (m && m[1] || dom).slice(0, 300)); server.close(); process.exit(1); }
if (!info.ok) { console.log('FAIL', info.errors.join('\n')); server.close(); process.exit(1); }
const pages = Math.ceil(info.total / (COLS * ROWS));
for (let p = 0; p < pages; p++) {
  if (ONLY && p + 1 !== ONLY) continue;
  const file = path.join(OUT, `${NAME}-${p + 1}.png`);
  await chrome([`--screenshot=${file}`, `--window-size=${COLS * CELL_W * ZOOM},${(ROWS * CELL_H + 26) * ZOOM}`, `http://127.0.0.1:${port}/sheet.html?p=${p}`]);
  console.log(fs.existsSync(file) ? 'geschreven ' + file : 'MISLUKT ' + file);
}
console.log(`${info.total} iconen op ${pages} bladen`);
server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* een vergrendeld bestand in het tijdelijke profiel */ }
