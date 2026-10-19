// Brug-QA (#235): één headless Electron (wegwerpprofiel) maakt per brug vier standen als beeld (naderen, op, onder,
// en bij een beweegbare brug dicht en open); de lijst komt uit een JSON-bestand [{ naam, x, y }] of uit de uitvoer van
// brug_probe.mjs (--out), de slechtste --n bruggen plus de beweegbare uit de stad.
//   node scripts/qa/brug_qa.mjs --game-dir=<gestaged game-map> [--lijst=<json>] [--probe=<probe.json>] [--n=12] [--out=<map>]
// GDE_DESKTOP=<map> voor een desktop-map met node_modules; ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: <out>/shots-bq-*.png, brug_qa.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-brug')));
fs.mkdirSync(OUT, { recursive: true });
let bruggen = [];
if (arg('lijst')) bruggen = JSON.parse(fs.readFileSync(path.resolve(arg('lijst')), 'utf8'));
else if (arg('probe')) {
  const pr = JSON.parse(fs.readFileSync(path.resolve(arg('probe')), 'utf8'));
  const n = Number(arg('n', 12)), seen = new Set();
  // één per straat: de slechtste eerst
  for (const r of pr) { const k = r.name + Math.round(r.at[0] / 200) + Math.round(r.at[1] / 200); if (seen.has(k)) continue; seen.add(k); bruggen.push({ naam: r.name, x: r.at[0], y: r.at[1] }); if (bruggen.length >= n) break; }
}
if (!bruggen.length) { console.error('geen bruggen: geef --lijst of --probe'); process.exit(2); }
const profile = `gde-test-bq-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__bq = ${JSON.stringify({ bruggen, settle: Number(arg('settle', 4500)) })};\n` + fs.readFileSync(path.join(HERE, 'brug_qa.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (arg('game-dir')) env.GDE_GAME_DIR = path.resolve(arg('game-dir')); // path.resolve: met schuine strepen serveert de app niets
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 60 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'brug_qa.json'), JSON.stringify(full, null, 1));
for (const b of full.bruggen || []) console.log(`${b.naam} (${b.x}, ${b.y}): ${b.fout ? 'FOUT ' + b.fout : `${b.lengte} m, dek ${b.zBegin}..${b.zMidden} m${b.beweegbaar ? `, open ${b.open}, weer dicht ${b.dichtGegaan}` : ''}`}`);
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
process.exit(r.status === 0 && (full.bruggen || []).length ? 0 : 1);
