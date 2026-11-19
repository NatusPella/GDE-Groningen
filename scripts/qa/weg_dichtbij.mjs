// Weg dichtbij (#883): één Electron (wegwerpprofiel) loopt een plekkenlijst af; per plek een straat- en luchtbeeld van de weg
// bij de speler en een meting van de gerenderde scene (weg_dichtbij.page.js).
//   node scripts/qa/weg_dichtbij.mjs --plekken=<json [{naam,x,y,snapR?,road?,zonderLod?}]> [--out=<map>] [--settle=9000] [--url-flags=...]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-wd-*.png, weg_dichtbij.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-weg-dichtbij')));
fs.mkdirSync(OUT, { recursive: true });
const plekken = JSON.parse(fs.readFileSync(path.resolve(arg('plekken')), 'utf8'));
const profile = `gde-test-wd-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__wd = ${JSON.stringify({ plekken, settle: Number(arg('settle', 9000)), R: Number(arg('R', 30)), brug: process.argv.includes('--brug') })};\n` + fs.readFileSync(path.join(HERE, 'weg_dichtbij.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(path.join(os.tmpdir(), profile), { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  ...(process.env.GDE_WD_NOFLAGS ? [] : ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion']),
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, ...(arg('url-flags') ? [`--url-flags=${arg('url-flags')}`] : [])],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 30 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, 'weg_dichtbij.json'), l.slice(14));
console.log(l ? l.slice(14, 600) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
// regressiecontrole (#883): na de wachttijd moet elke weg binnen DRAW_DIST gebouwd zijn (streamPending().roads === 0) en het
// gedetailleerde wegdek van elke weg klaarstaan; anders blijft de speler met gras of akker zonder weg staan.
let fail = !l;
if (l) for (const q of JSON.parse(l.slice(14)).plekken) {
  const open = q.wegen ? q.wegen.filter((w) => !w.geoRoad).length : -1;
  const slecht = q.fout || q.stream.roads > 0 || (q.serie && q.serie[q.serie.length - 1].roads > 0) || open > 0 || q.dists.roadDetailR < q.dists.DRAW_DIST;
  console.log(`${slecht ? 'FAIL' : 'ok  '} ${q.naam}: ${q.fout || `${q.weg}, nog te bouwen ${q.stream.roads}, wegen zonder wegdek ${open}, detailring ${q.dists.roadDetailR}/${q.dists.DRAW_DIST} m`}`);
  if (slecht) fail = true;
}
process.exit(fail ? 1 : 0);
