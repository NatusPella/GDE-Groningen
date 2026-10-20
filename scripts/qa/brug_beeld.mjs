// Brug-beeld (#235): één headless Electron (wegwerpprofiel) maakt per brug drie beelden (a, b = 4 cm verschoven, c = a) op
// vaste camerastanden (schuin op vier afstanden, op het dek op vijf plekken, onder het dek) en bij een beweegbare brug
// een reeks tijdens het openen en sluiten. brug_beeld_analyse.mjs vergelijkt de beelden (flikkering = a-b boven de ruis a-c).
//   node scripts/qa/brug_beeld.mjs --game-dir=<gestaged game-map> [--lijst=<json [{naam,x,y}]>] [--afstanden=25,60,150,350] [--out=<map>] [--alleen-lijst]
//   node scripts/qa/brug_beeld.mjs --modus=boot --lijst=<json { open: [{naam,x,y,boot}], bots: [{naam,x,y}] }> ...  (boten bij bruggen: brug_boot.page.js)
// GDE_DESKTOP=<map> voor een desktop-map met node_modules; ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Neemt zelf een Electron-slot uit C:/Users/abuis/gde-locks als die map bestaat (--geen-slot slaat dat over).
// Uitvoer: <out>/shots-bb-*.png, brug_beeld.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-brugbeeld')));
fs.mkdirSync(OUT, { recursive: true });
const alleenLijst = flag('alleen-lijst');
const boot = arg('modus', 'beeld') === 'boot'; // boten bij bruggen (brug_boot.page.js): --lijst is dan { open: [...], bots: [...] }
let bruggen = boot ? {} : [];
if (arg('lijst')) bruggen = JSON.parse(fs.readFileSync(path.resolve(arg('lijst')), 'utf8'));
if (!(boot ? Object.keys(bruggen).length : bruggen.length) && !alleenLijst) { console.error('geen bruggen: geef --lijst of --alleen-lijst'); process.exit(2); }
const afstanden = arg('afstanden', '25,60,150,350').split(',').map(Number);
const profile = `gde-test-bb-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__bb = ${JSON.stringify({ bruggen, afstanden, alleenLijst, settle: Number(arg('settle', 4500)) })};\n` + fs.readFileSync(path.join(HERE, 'brug_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (arg('game-dir')) env.GDE_GAME_DIR = path.resolve(arg('game-dir')); // path.resolve: met schuine strepen serveert de app niets
delete env.ELECTRON_RUN_AS_NODE;
const LOCKS = process.env.GDE_LOCKS || 'C:/Users/abuis/gde-locks';
let slot = null;
if (!flag('geen-slot') && !process.env.GDE_SLOT_VAST && fs.existsSync(LOCKS)) {
  for (let poging = 0; poging < 720 && !slot; poging++) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (!slot) { if (poging % 30 === 0) console.log('wacht op een Electron-slot...'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000 + Math.floor(Math.random() * 4000)); }
  }
  if (!slot) { console.error('geen Electron-slot gekregen'); process.exit(3); }
}
let r;
try {
  r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
    { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 60 * 60 * 1000, killSignal: 'SIGKILL' });
} finally {
  if (slot) try { fs.rmdirSync(slot); } catch { /* weg */ }
}
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'brug_beeld.json'), JSON.stringify(full, null, 1));
if (full.beweegbaar) for (const b of full.beweegbaar) console.log(`${b.kind}\t${b.naam}\t${b.x}\t${b.y}\t${b.len} m`);
for (const k of ['open', 'bots']) for (const b of full[k] || []) console.log(`${k} ${b.naam}: ${b.fout ? 'FOUT ' + b.fout : JSON.stringify({ ...b, log: undefined })}`);
for (const b of full.bruggen || []) console.log(`${b.naam} (${b.x}, ${b.y}): ${b.fout ? 'FOUT ' + b.fout : `${b.lengte} m, dek ${b.zMidden} m, ${b.klasse}${b.beweegbaar ? `, ${b.beweegbaar}, open ${b.open}, weer dicht ${b.dichtGegaan}` : ''}`}`);
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
process.exit(r.status === 0 && ((full.bruggen || []).length || full.beweegbaar || (full.open || []).length || (full.bots || []).length) ? 0 : 1);
