// Weer, dag en nacht in beeld (#19, #194, #195): per plek een screenshot voor elk tijdstip (helder) en voor elk weer op
// middag, avond en nacht, plus frametijden met de effecten aan, in één Electron-instantie met wegwerpprofiel.
//   node scripts/qa/weer_nacht.mjs [--out=<map>] [--only=naam,naam] [--settle=<ms>] [--perf-only] [--index=<index-provincie.json>] [--slot]
//   node scripts/qa/weer_nacht_analyse.mjs <map>          (beeldcontroles, contactbladen, rapport)
// ELECTRON_EXE=<pad naar electron.exe> als desktop/node_modules/electron/dist ontbreekt. Vereist een gestagede game/.
// --slot: neemt een Electron-slot volgens C:/Users/abuis/gde-locks/README.txt (mkdir electron-1..3) en geeft het vrij.
// Plekken: Grote Markt, station, A7, kust, weilanden, dorp, water (coordinaten uit index-provincie.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const L = await import(pathToFileURL(path.join(HERE, 'weernachtlogic.mjs')).href);
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-weer-nacht')));
const ONLY = arg('only', '').split(',').filter(Boolean);
const SETTLE = Number(arg('settle', 9000));
const LOCKS = 'C:/Users/abuis/gde-locks';

const idxFile = [arg('index'), path.join(ROOT, 'game', 'world', 'index-provincie.json'), 'C:/Users/abuis/GIT/GDE-Groningen/game/world/index-provincie.json'].filter(Boolean).find((f) => fs.existsSync(f));
if (!idxFile) { console.error('index-provincie.json niet gevonden (geef --index=)'); process.exit(2); }
const index = JSON.parse(fs.readFileSync(idxFile, 'utf8')).global;
const place = (name, kind) => { const q = index.places.find((x) => x.name === name && (!kind || x.kind === kind)); if (!q) throw new Error(`plaats niet gevonden: ${name}`); return q; };
const station = (name) => index.stations.find((x) => x.name === name);
const off = (a, dx, dy) => ({ x: a.x + dx, y: a.y + dy });
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const stad = place('Groningen', 'city');
const PLEKKEN = [
  { naam: 'grotemarkt', ...stad, snapR: 150, soort: 'stad' },
  { naam: 'station', ...station('Groningen'), snapR: 120, soort: 'stad' },
  { naam: 'a7', ...off(place('Hoogkerk'), -1500, 0), road: 'A7', snapR: 4000, soort: 'weg' },
  { naam: 'kust', ...place('Lauwersoog'), snapR: 800, soort: 'kust' },
  { naam: 'weilanden', ...off(place('Winsum'), 1800, 1200), snap: false, soort: 'land' },
  { naam: 'dorp', ...place('Winsum'), soort: 'dorp' },
  { naam: 'water', ...mid(place('Zoutkamp'), place('Winsum')), water: true, soort: 'water' },
].map((s) => ({ ...s, x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10 })).filter((s) => !ONLY.length || ONLY.includes(s.naam));

const cfg = {
  plekken: PLEKKEN, matrix: L.matrix(), settle: SETTLE, perfMs: 4000,
  perf: [['middag', 'helder'], ['middag', 'regenbui'], ['middag', 'onweer'], ['middag', 'mist'], ['avond', 'helder'], ['nacht', 'helder'], ['nacht', 'regenbui']].map(([tijd, weer]) => ({ tijd, weer })),
};
if (process.argv.includes('--perf-only')) { cfg.combos = cfg.matrix; cfg.matrix = []; }
if (process.argv.includes('--list')) { console.log(JSON.stringify({ plekken: PLEKKEN, shots: PLEKKEN.length * cfg.matrix.length })); process.exit(0); }

// een Electron-slot (alleen met --slot)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
async function takeSlot() {
  for (let tries = 0; tries < 120; tries++) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); return; } catch { /* bezet */ }
    }
    await sleep(60000);
  }
  throw new Error('geen Electron-slot gekregen');
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) await takeSlot();

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-wn-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__wnCfg = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'weer_nacht.page.js'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'cfg.json'), JSON.stringify(cfg, null, 1));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
let stdout = '', stderr = '';
const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
child.stdout.on('data', (d) => { stdout += d; });
child.stderr.on('data', (d) => { stderr += d; });
const killer = setTimeout(() => child.kill('SIGKILL'), 90 * 60 * 1000);
const code = await new Promise((res) => child.on('close', res));
clearTimeout(killer);
fs.writeFileSync(path.join(OUT, 'run.log'), `${stdout}\n${stderr}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
release();
let res = {};
for (const l of stdout.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
if (!res.plekken) {
  res.plekken = {};
  for (const l of stdout.split(/\r?\n/)) {
    const m = l.match(/\[wn-result\] (.*)$/);
    if (m) try { const r = JSON.parse(m[1]); res.plekken[r.naam] = r; } catch { /* kapotte regel */ }
  }
}
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
const nan = stdout.split(/\r?\n/).filter((l) => /Computed radius is NaN/.test(l)).length;
const shots = fs.readdirSync(OUT).filter((f) => /^shots-wn-.*\.png$/.test(f)).length;
console.log(`exit ${code}, screenshots ${shots}/${PLEKKEN.length * cfg.matrix.length}, NaN-regels ${nan}`);
console.log(`uitvoer: ${OUT}`);
process.exit(code === 0 && shots ? 0 : 1);
