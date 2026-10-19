// Visuele controle van #124, #130, #157 en #158 (en #185): gerichte screenshots op de huidige
// gestagede build, één headless Electron met een wegwerpprofiel.
//   node scripts/qa/visual_issues.mjs [--out=<map>] [--only=a,b] [--settle=<ms>] [--list]
// Vereist `cd desktop && npm run stage`; ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: <out>/shots-<plek>[-<n>].png, visual.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-visual')));
const ONLY = arg('only', '');
const SETTLE = Number(arg('settle', 8000));
const AUDIO = process.argv.includes('--audio');

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'world', 'index-provincie.json'), 'utf8')).global;
const place = (name, kind) => {
  const p = index.places.find((q) => q.name === name && (!kind || q.kind === kind));
  if (!p) throw new Error(`plaats niet gevonden: ${name}`);
  return { x: p.x, y: p.y };
};
const station = (name) => {
  const s = index.stations.find((q) => q.name === name);
  if (!s) throw new Error(`station niet gevonden: ${name}`);
  return { x: s.x, y: s.y };
};
// het spoor: dichtstbijzijnde routepunt bij het station, kijkrichting langs de lijn
function rail(stationName) {
  const st = station(stationName);
  let best = null;
  for (const r of index.routes) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1], d = Math.hypot((a[0] + b[0]) / 2 - st.x, (a[1] + b[1]) / 2 - st.y);
    if (!best || d < best.d) best = { d, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return best;
}
// punten op de lijn zelf: op booglengte d van het station, met de kijkrichting langs het spoor
// (terug naar het station), zodat de camera echt op het spoor staat en niet op de rechte verlenging
function railPoints(stationName, ds) {
  const st = station(stationName);
  let best = null;
  for (const r of index.routes) for (let i = 0; i < r.pts.length - 1; i++) {
    const d = Math.hypot((r.pts[i][0] + r.pts[i + 1][0]) / 2 - st.x, (r.pts[i][1] + r.pts[i + 1][1]) / 2 - st.y);
    if (!best || d < best.d) best = { d, r, i };
  }
  const walk = (dir) => {
    const out = [];
    let acc = 0, i = best.i, t = 0;
    for (const target of ds) {
      let ran = false;
      while (acc < target && i + dir >= 0 && i + dir < best.r.pts.length) {
        const a = best.r.pts[i], b = best.r.pts[i + dir];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc + len >= target) { t = (target - acc) / len; ran = true; break; }
        acc += len; i += dir; t = 0;
      }
      const a = best.r.pts[i], b = best.r.pts[Math.max(0, Math.min(best.r.pts.length - 1, i + dir))];
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      out.push({ d: target, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, a: Math.atan2(b[1] - a[1], b[0] - a[0]), end: !ran });
    }
    return out;
  };
  const fwd = walk(1), back = walk(-1);
  const reach = (w) => w.filter((p) => !p.end).length;
  return reach(fwd) >= reach(back) ? fwd : back;
}
const off = (p, dx, dy) => ({ x: p.x + dx, y: p.y + dy });
const gm = place('Groningen', 'city');
const water = (name, p, R) => ({ name, type: 'water', issue: 124, ...p, R });
const SPOTS = [
  // #124 / #185: hekken, boerderijen en steigers bij water
  water('w124-zuidhorn', place('Zuidhorn'), 1500),
  water('w124-grijpskerk', station('Grijpskerk'), 1500),
  water('w124-garnwerd', place('Garnwerd'), 1200),
  water('w124-electra', place('Electra'), 1500),
  water('w124-eemshaven', off(place('Eemshaven'), 0, -1500), 3000),
  water('w124-lauwersmeer', off(place('Zoutkamp'), -3000, -2500), 3500),
  water('w124-westerkwartier', place('Leek'), 2000),
  // #189: wegdek-overgangen op de kartbaan Ulrum
  { name: 'u189-kartbaan', type: 'kart', issue: 189, x: -15101, y: -15598 },
  // #188: het laadscherm
  { name: 'l188-laadscherm', type: 'loadscreen', issue: 188, ...gm },
  // #212: het plaatslabel in en om Corpus den Hoorn
  { name: 'o212-corpus', type: 'labelgrid', issue: 212, ...place('Corpus den Hoorn'), rx: 1400, ry: 1000, step: 100 },
  // #115: missiemarkers
  { name: 'm115-markers', type: 'marker', issue: 115, x: gm.x + 120, y: gm.y + 380 },
  // #117: cutscene-geluid (welke geluiden de eerste missies in de rij zetten)
  { name: 's117-cutscenes', type: 'cutsound', issue: 117, ...gm, n: 4 },
  // nacht en weer, stad en dorp
  { name: 'x-weer-stad', type: 'weer', issue: 0, ...gm, a: 0.3 },
  { name: 'x-weer-winsum', type: 'weer', issue: 0, ...place('Winsum'), a: 0 },
  // voertuigen: deuren, kap, uiterlijk
  { name: 'x-voertuigen', type: 'voertuigen', issue: 0, ...off(gm, 150, 100) },
  // #225: deuren, kap en kofferbak (auto, bus, bestelbus, tractor)
  { name: 'y-delen', type: 'voertuigdelen', issue: 225, ...place('Winsum') },
  // #207: zwemmen; #205: schadefases
  { name: 'y5-zwemmen', type: 'zwemmen', issue: 207, ...place('Zuidhorn'), R: 1500 },
  { name: 'y5-flat', type: 'flat', issue: 206, ...place('Winsum') },
  { name: 'y5-flat2', type: 'flat', issue: 206, ...place('Winsum'), plekken: { kast: 'k3', bureau: 'b3', lamp: 'h5', plant: 'h2' } },
  { name: 'y5-schade', type: 'schadefases', issue: 205, ...place('Winsum') },
  // #224, #117, #157: echte scenes (opening-missie, M02 shot 6, een achtervolging, een akte-4 scene)
  { name: 'z-scenes', type: 'cutscenes', issue: 224, ...gm, ids: ['M01', 'M02', 'M21', 'M18'] },
  // #224: M02 intro volledig (shot 6 na ruim 11 s zonder camerabeweging), elke 2 s een beeld; M09 en M23 (voertuigen/colonne), M18 (akte 4)
  { name: 'z2-m02', type: 'cutscenes', issue: 224, ...gm, ids: ['M02'], direct: true, every: 4, max: 12, maxI: 120, at: { x: gm.x - 60, y: gm.y + 80 } },
  { name: 'z3-scenes', type: 'cutscenes', issue: 117, ...gm, ids: ['M09', 'M23', 'M18'], direct: true, every: 10, max: 5, maxI: 100, at: { x: gm.x - 60, y: gm.y + 80 } },
  // #130: kruisingen, op- en afritten, samenkomende rijstroken
  { name: 'k130-stad', type: 'junction', issue: 130, ...gm, R: 400, n: 3 },
  { name: 'k130-haren', type: 'junction', issue: 130, ...place('Haren', 'town'), R: 500, n: 2 },
  { name: 'k130-hoogezand', type: 'junction', issue: 130, ...place('Hoogezand'), R: 500, n: 2 },
  { name: 'k130-afrit-zuidbroek', type: 'ramp', issue: 130, ...place('Zuidbroek') },
  { name: 'k130-afrit-hoogezand', type: 'ramp', issue: 130, ...place('Hoogezand') },
  { name: 'k130-afrit-hoogkerk', type: 'ramp', issue: 130, ...place('Hoogkerk') },
  // #157: een camera ver van de speler (cutscene): speler in de stad, camera bij het spoor
  { name: 'c157-sauwerd', type: 'cinefar', issue: 157, ...gm, cx: rail('Sauwerd').x, cy: rail('Sauwerd').y, a: rail('Sauwerd').a },
  { name: 'c157-station', type: 'cinefar', issue: 157, ...off(gm, -1500, -900), cx: rail('Groningen').x, cy: rail('Groningen').y, a: rail('Groningen').a },
  // #158: spoor op verschillende afstanden
  ...['Sauwerd', 'Winsum', 'Eemshaven', 'Delfzijl'].map((n) => ({ name: 'r158-' + n.toLowerCase(), type: 'raillod', issue: 158, ...(({ x, y, a }) => ({ x, y, a }))(rail(n)), pts: railPoints(n, [40, 150, 400, 900, 1800]) })),
];
for (const s of SPOTS) { s.x = Math.round(s.x * 10) / 10; s.y = Math.round(s.y * 10) / 10; if (s.cx !== undefined) { s.cx = Math.round(s.cx * 10) / 10; s.cy = Math.round(s.cy * 10) / 10; } }
if (process.argv.includes('--list')) { console.log(JSON.stringify(SPOTS)); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-vi-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__vi = ${JSON.stringify({ spots: SPOTS, settle: SETTLE, only: ONLY })};\n` + fs.readFileSync(path.join(HERE, 'visual_issues.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const tap = path.join(HERE, 'audiotap.js');
const r = spawnSync(electron, ['.', '--windowed', '--stil', ...(AUDIO ? ['--audio-graph', `--bench-eval=${tap}`] : []), '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 60 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const lines = (r.stdout || '').split('\n');
let res = {};
for (const l of lines) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
for (const l of lines) { const m = l.match(/^\[vi-spot\] (\S+) (.*)$/); if (m) { res.results = res.results || {}; if (!res.results[m[1]]) try { res.results[m[1]] = JSON.parse(m[2]); } catch { /* ingekort */ } } }
fs.writeFileSync(path.join(OUT, 'visual.json'), JSON.stringify(res, null, 1));
console.log(`plekken: ${Object.keys(res.results || {}).length}/${SPOTS.length}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}, errors: ${(res.errors || []).length}, NaN-regels: ${lines.filter((l) => /NaN/i.test(l) && !/perf-script|vi-spot/.test(l)).length}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && Object.keys(res.results || {}).length ? 0 : 1);
