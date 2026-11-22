// Beelden van de zeefdruk-kaart (22-11, #1009; alleen voor het oog van de ontwerper, geen test). Statische canvas-renders in headless Chrome op een
// tijdelijk profiel buiten de repo, via een lokale server op een willekeurige poort; geen Electron, geen opslag van het spel.
//   node scripts/kaart_ds3_beeld.mjs <uitmap> paletten [huidig,A,B,C]   een contactblad: per palet drie schalen (provincie, stad, wijk) met labels en markers
//   node scripts/kaart_ds3_beeld.mjs <uitmap> iconen [cvd]             alle marker-soorten in drie maten op elk grondvlak, 1x en 2x, optioneel in een kleurenblind-simulatie
//   node scripts/kaart_ds3_beeld.mjs <uitmap> legenda                  de legenda zoals mapview.js hem opbouwt (alleen de iconen en kleuren)
// Het Chrome-pad komt uit CHROME, three.js uit THREE (anders zoekt hij in de gewone plekken en slaat hij over).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'gde-kaart-ds3'));
const MODE = process.argv[3] || 'paletten';
const ARG = process.argv[4] || '';
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
const THREE = [process.env.THREE, path.join(ROOT, 'desktop/build/game/vendor/npm/three@0.160.0/build/three.module.js'), path.join(os.tmpdir(), 'cpuperf/s0/game/vendor/npm/three@0.160.0/build/three.module.js')].find((p) => p && fs.existsSync(p));
if (!CHROME || !THREE) { console.log('SKIP geen Chrome of geen three.js'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });

const HEAD = `<!doctype html><meta charset="utf-8"><title>kaart-ds3</title>
<script type="importmap">{"imports":{"three":"/vendor/three.module.js","https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script>
<style>html,body{margin:0;background:#2a2823;color:#ece6d2;font:12px/1.25 Arial,sans-serif}.t{padding:3px 6px}</style>`;

// Een synthetische kaart (geen wereld nodig): water, groen, bos, akkers, dorp, wegen per klasse, spoor, gebouwen, kerk, grens, labels.
const SCENE = `
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function drawScene(c, P, label, w, h, schaal, sz) {
  const r = rng(7);
  const lab = (t, x, y, px, a) => { c.font = '600 ' + px + 'px Arial Narrow, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = label.halo; c.globalAlpha = 0.9; c.strokeText(t, x, y); c.globalAlpha = a || 1; c.fillStyle = label.tekst; c.fillText(t, x, y); c.globalAlpha = 1; };
  const poly = (pts, col) => { c.beginPath(); pts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](x, y)); c.closePath(); c.fillStyle = col; c.fill(); };
  const line = (pts, col, lw, dash) => { c.beginPath(); pts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](x, y)); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
  c.fillStyle = P.meadow; c.fillRect(0, 0, w, h);
  const rw = { major: 2.4, normal: 1.4, minor: 1.0, cycle: 0.9, foot: 0.6 };
  const k = schaal === 'wijk' ? 2.4 : schaal === 'stad' ? 1.3 : 0.8;
  if (schaal === 'provincie') {
    poly([[0, 0], [w, 0], [w, 60], [230, 78], [150, 52], [60, 70], [0, 56]], P.water);
    line([[0, 56], [60, 70], [150, 52], [230, 78], [w, 60]], P.waterEdge, 1.2);
    for (const [x, y, rr] of [[70, 120, 36], [250, 170, 40], [160, 205, 26]]) poly(Array.from({ length: 9 }, (_, i) => [x + Math.cos(i * 0.7) * rr * (0.8 + r() * 0.4), y + Math.sin(i * 0.7) * rr * 0.7 * (0.8 + r() * 0.4)]), P.allot);
    for (const [x, y, rr] of [[200, 120, 22], [40, 200, 18]]) poly(Array.from({ length: 8 }, (_, i) => [x + Math.cos(i * 0.8) * rr, y + Math.sin(i * 0.8) * rr * 0.8]), P.forest);
    poly([[110, 95], [140, 90], [150, 115], [120, 125]], P.village);
    line([[0, 140], [110, 112], [240, 130], [w, 100]], P.major, 1.6); line([[130, 80], [140, 210], [150, h]], P.road, 1.0); line([[0, 190], [100, 180], [200, 170], [w, 185]], P.rail, 1.2);
    line([[20, h], [60, 150], [100, 100]], P.minor, 0.8);
    line([[0, 150], [w, 150]], '#000000', 0, []);
    c.save(); c.strokeStyle = label.tekst; c.globalAlpha = 0.55; c.lineWidth = 1; c.setLineDash([6, 3]); c.beginPath(); c.moveTo(285, 70); c.lineTo(300, 140); c.lineTo(285, h); c.stroke(); c.restore();
    lab('WADDENZEE', 110, 28, 11, 0.8); lab('Groningen', 128, 108, 12); lab('DRENTHE', 330, 120, 9, 0.7); lab('Winsum', 60, 150, 9);
  } else {
    // stad en wijk: een raster van straten met blokken, een gracht, een park, spoor
    const n = schaal === 'wijk' ? 4 : 7, cw = w / n, ch = h / (n * 0.7);
    poly([[0, h * 0.62], [w, h * 0.5], [w, h * 0.6], [0, h * 0.74]], P.water);
    line([[0, h * 0.62], [w, h * 0.5]], P.waterEdge, 1.2); line([[0, h * 0.74], [w, h * 0.6]], P.waterEdge, 1.2);
    poly([[w * 0.06, h * 0.06], [w * 0.34, h * 0.06], [w * 0.34, h * 0.3], [w * 0.06, h * 0.3]], P.park);
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(w * 0.1 + r() * w * 0.22, h * 0.1 + r() * h * 0.18, 2.6 * k * 0.6 + 1, 0, 7); c.fillStyle = P.tree; c.fill(); }
    poly([[w * 0.74, h * 0.06], [w * 0.96, h * 0.06], [w * 0.96, h * 0.22], [w * 0.74, h * 0.22]], P.sports);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * cw, y = j * ch * 1.25; if (y > h) continue;
      if (x < w * 0.35 && y < h * 0.32) continue; if (x > w * 0.72 && y < h * 0.24) continue;
      if (y + ch > h * 0.5 && y < h * 0.76) continue;
      const bw = cw * 0.38, bh = ch * 0.46; const cols = P.buildings || [P.building];
      c.fillStyle = (i + j) % 7 === 3 ? P.church : cols[(i * 3 + j) % cols.length];
      for (const [dx, dy] of [[0.12, 0.12], [0.56, 0.12], [0.12, 0.6], [0.56, 0.6]]) c.fillRect(x + cw * dx, y + ch * 1.25 * dy * 0.8, bw, bh * 0.8);
    }
    for (let i = 1; i < n; i++) line([[i * cw, 0], [i * cw, h]], i === 3 ? P.major : P.road, (i === 3 ? 2.4 : 1.4) * k * 0.8);
    for (let j = 1; j < n; j++) { const y = j * ch * 1.25; if (y < h) line([[0, y], [w, y]], j === 2 ? P.major : P.minor, (j === 2 ? 2.4 : 1.0) * k * 0.8); }
    line([[0, h * 0.9], [w * 0.5, h * 0.84], [w, h * 0.88]], P.cycle, 1.0 * k * 0.8); line([[w * 0.15, 0], [w * 0.2, h]], P.foot, 0.7 * k * 0.8, [2, 2]);
    line([[0, h * 0.4], [w, h * 0.36]], P.rail, 2 * k * 0.7); line([[0, h * 0.4], [w, h * 0.36]], P.railTie, 2 * k * 0.7, [1, 5]);
    lab(schaal === 'wijk' ? 'Oosterpoortwijk' : 'Oosterpoort', w * 0.55, h * 0.28, schaal === 'wijk' ? 14 : 11, 0.85); lab('Kwinkenplein', w * 0.3, h * 0.56, 10); lab('Hoendiep', w * 0.5, h * 0.64, 10, 0.9);
  }
  // markers op de scene: dezelfde kinds als in het spel, op de maat van de schaal
  const kinds = schaal === 'provincie' ? [['dorp', 128, 100], ['station', 190, 168], ['player', 160, 130]] : [['shop-super', w * 0.22, h * 0.45], ['horeca', w * 0.42, h * 0.45], ['hospital', w * 0.62, h * 0.16], ['sj-taxi', w * 0.72, h * 0.42], ['station', w * 0.85, h * 0.32], ['garage', w * 0.52, h * 0.8], ['politiebureau', w * 0.3, h * 0.88], ['userWaypoint', w * 0.68, h * 0.8], ['player', w * 0.5, h * 0.5]];
  for (const [kind, x, y] of kinds) { window.__hud.drawMapIconHalo(c, kind, x, y, sz); window.__hud.drawMapIcon(c, kind, x, y, sz, { t: 0, angle: -Math.PI / 4 }); }
}`;

const PAL_PAGE = `${HEAD}<div id="g"></div><pre id="out" style="display:none">running</pre>
<script type="module">
${SCENE}
const out = { ok: false, errors: [] };
window.addEventListener('error', (e) => out.errors.push('window: ' + e.message));
try {
  window.__hud = await import('/js/hud_panel.js');
  const { mapIconScale } = await import('/js/mapicons.js');
  const { kaartLand } = await import('/js/kaartkleuren.js');
  const { kandidaat } = await import('/scripts/lib/kaart_paletten.mjs');
  const MS = await import('/js/mapstyle.js'); const LABEL = MS.LABEL || { tekst: MS.INK.cream, halo: MS.INK.dark };
  const ids = (new URLSearchParams(location.search).get('p') || 'huidig').split(',');
  const g = document.getElementById('g'); g.style.cssText = 'display:grid;grid-template-columns:repeat(3,360px);gap:4px;padding:4px;width:1100px';
  const dpr = 2;
  for (const id of ids) {
    const pal = id === 'huidig' ? { ...kaartLand(), label: LABEL } : kandidaat(id);
    for (const sch of ['provincie', 'stad', 'wijk']) {
      const d = document.createElement('div'); const cv = document.createElement('canvas'); cv.width = 360 * dpr; cv.height = 240 * dpr; cv.style.cssText = 'width:360px;height:240px;display:block';
      const c = cv.getContext('2d'); c.scale(dpr, dpr);
      drawScene(c, pal.kaart, pal.label, 360, 240, sch, sch === 'provincie' ? mapIconScale(0.5) : mapIconScale(sch === 'wijk' ? 4 : 1.5));
      const t = document.createElement('div'); t.className = 't'; t.textContent = 'palet ' + id + ' - ' + sch; d.append(cv, t); g.appendChild(d);
    }
  }
  out.ok = true;
} catch (e) { out.errors.push('exception: ' + (e && e.stack || e)); }
document.getElementById('out').textContent = JSON.stringify(out);
</script>`;

// Het icoonblad: elke marker-soort in drie maten (minikaart 14 px, grote kaart 24 px, legenda 32 px) op vijf grondvlakken, 1x en 2x.
const ICON_PAGE = `${HEAD}<div id="g"></div><pre id="out" style="display:none">running</pre>
<script type="module">
const out = { ok: false, errors: [], total: 0 };
window.addEventListener('error', (e) => out.errors.push('window: ' + e.message));
const CVD = { deuteranopie: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881], protanopie: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998], tritanopie: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039] };
function sim(cv, m) {
  const c = cv.getContext('2d'); const im = c.getImageData(0, 0, cv.width, cv.height), d = im.data;
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, gam = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055);
  for (let i = 0; i < d.length; i += 4) { const r = lin(d[i]), g = lin(d[i + 1]), b = lin(d[i + 2]); d[i] = Math.max(0, Math.min(255, gam(m[0] * r + m[1] * g + m[2] * b))); d[i + 1] = Math.max(0, Math.min(255, gam(m[3] * r + m[4] * g + m[5] * b))); d[i + 2] = Math.max(0, Math.min(255, gam(m[6] * r + m[7] * g + m[8] * b))); }
  c.putImageData(im, 0, 0);
}
try {
  const hud = await import('/js/hud_panel.js');
  const { miniIconScale } = await import('/js/mapicons.js');
  const { MAP_PALETTE, MINI_PALETTE } = await import('/js/mapstyle.js');
  const { SHOP_TYPES } = await import('/js/shopdata.js');
  const { SIDE_JOBS } = await import('/js/sidejobs.js');
  const { ACTIVITY_LEGEND } = await import('/js/activities.js');
  const q = new URLSearchParams(location.search), cvd = q.get('cvd'), dpr = +q.get('dpr') || 1, from = +q.get('from') || 0, count = +q.get('n') || 60;
  const items = [];
  for (const k of ['player', 'partner', 'companion', 'cash', 'userWaypoint', 'missionIdle', 'missionActive', 'waypoint', 'eierbalTip', 'own', 'home', 'homeGarage', 'garage', 'hospital', 'politiebureau', 'station', 'ov-halte', 'livebus', 'horeca', 'flitspaal', 'landmark', 'uitkijkpunt', 'beppe', 'police', 'dorp', 'perceel-koop', 'perceel-eigen-rijp', 'pigeon', 'heli', 'padel', 'onderdeel', 'wrakduik', 'streekuitdaging', 'pg-jelle', 'pg-fjord']) items.push(k);
  for (const k of Object.keys(SHOP_TYPES)) items.push('shop-' + k);
  for (const j of SIDE_JOBS) items.push('sj-' + j.id);
  for (const a of ACTIVITY_LEGEND) items.push(a.kind);
  out.total = items.length;
  const grounds = [['land', MAP_PALETTE.meadow], ['water', MAP_PALETTE.water], ['groen', MAP_PALETTE.park], ['gebouw', MAP_PALETTE.building], ['weg', MAP_PALETTE.major]];
  const sizes = [['mini', 1.4], ['kaart', 2.4], ['legenda', 3.2]];
  const g = document.getElementById('g'); g.style.cssText = 'display:grid;grid-template-columns:repeat(4,330px);gap:2px;padding:2px';
  for (const kind of items.slice(from, from + count)) {
    const cell = document.createElement('div'); cell.style.cssText = 'padding:2px';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:1px';
    for (const [gn, gc] of grounds) for (const [sn, s] of sizes.slice(gn === 'land' ? 0 : 1, gn === 'land' ? 3 : 2)) {
      const W = Math.round(s * 14 + 8), cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = 40 * dpr; cv.style.cssText = 'width:' + W + 'px;height:40px;display:block';
      const c = cv.getContext('2d'); c.scale(dpr, dpr); c.fillStyle = gc; c.fillRect(0, 0, W, 40);
      if (gn === 'weg') { c.fillStyle = MAP_PALETTE.minor; c.fillRect(0, 17, W, 4); c.fillStyle = MAP_PALETTE.major; c.fillRect(0, 19, W, 3); }
      hud.drawMapIconHalo(c, kind, W / 2, 20, s); hud.drawMapIcon(c, kind, W / 2, 20, s, { t: 0, angle: -Math.PI / 4 });
      if (cvd && CVD[cvd]) sim(cv, CVD[cvd]);
      row.appendChild(cv);
    }
    const l = document.createElement('div'); l.textContent = kind; l.style.cssText = 'font-size:10px;color:#cfd6c8'; cell.append(row, l); g.appendChild(cell);
  }
  out.ok = true;
} catch (e) { out.errors.push('exception: ' + (e && e.stack || e)); }
document.getElementById('out').textContent = JSON.stringify(out);
</script>`;

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const pages = { '/pal.html': PAL_PAGE, '/ico.html': ICON_PAGE };
  if (pages[u]) { res.setHeader('content-type', 'text/html'); res.end(pages[u]); return; }
  const f = u === '/vendor/three.module.js' ? THREE : u.startsWith('/vendor/addons/') ? path.join(path.dirname(THREE), '../examples/jsm', u.slice(15)) : u.startsWith('/scripts/') ? path.join(ROOT, u) : u.startsWith('/game/') ? path.join(ROOT, u) : path.join(ROOT, 'game', u);
  fs.readFile(f, (e, b) => {
    if (e) { console.log('404', u); res.statusCode = 404; res.end(); return; }
    res.setHeader('content-type', f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream');
    res.end(b);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-kaartds3-'));
const chrome = (args) => new Promise((resolve) => {
  const child = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=15000', ...args], { stdio: ['ignore', 'pipe', 'ignore'] });
  let dom = '';
  child.stdout.on('data', (d) => { dom += d; });
  const killer = setTimeout(() => child.kill(), 90000);
  child.on('close', () => { clearTimeout(killer); resolve(dom); });
});
const meld = async (url) => {
  const dom = await chrome(['--dump-dom', url]);
  const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
  try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch { return { ok: false, errors: ['geen resultaat: ' + (m && m[1] || dom).slice(0, 300)] }; }
};
const shot = async (file, url, w, h) => { await chrome([`--screenshot=${file}`, `--window-size=${w},${h}`, url]); console.log(fs.existsSync(file) ? 'geschreven ' + file : 'MISLUKT ' + file); };
let code = 0;
if (MODE === 'paletten') {
  const ids = ARG || 'huidig,A,B,C';
  const url = `http://127.0.0.1:${port}/pal.html?p=${ids}`;
  const info = await meld(url);
  if (!info.ok) { console.log('FAIL', info.errors.join('\n')); code = 1; } else {
    const rows = ids.split(',').length;
    await shot(path.join(OUT, 'paletten-' + ids.replace(/,/g, '') + '.png'), url, 1100, rows * 264 + 8);
  }
} else if (MODE === 'iconen') {
  const cvd = ARG && ARG !== 'geen' ? ARG : '';
  const dpr = +process.argv[5] || 1;
  const base = `http://127.0.0.1:${port}/ico.html?dpr=${dpr}${cvd ? '&cvd=' + cvd : ''}`;
  const info = await meld(base);
  if (!info.ok) { console.log('FAIL', info.errors.join('\n')); code = 1; } else {
    const per = 60, pages = Math.ceil(info.total / per);
    console.log(info.total + ' soorten, ' + pages + ' bladen');
    for (let p = 0; p < pages; p++) await shot(path.join(OUT, `iconen${cvd ? '-' + cvd : ''}${dpr > 1 ? '-2x' : ''}-${p + 1}.png`), base + `&from=${p * per}&n=${per}`, 1330, 15 * 78 + 8);
  }
}
server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* een vergrendeld bestand in het tijdelijke profiel */ }
process.exit(code);
