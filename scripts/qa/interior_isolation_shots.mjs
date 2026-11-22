// Beeldronde voor de binnenruimte-isolatie (22-11): beelden binnen een paar gebouwen, de loketset en de flat, met een proefblok dat
// met de snede aan weg moet zijn en met hem uit zichtbaar. Één headless Electron met een wegwerpprofiel.
//   node scripts/qa/interior_isolation_shots.mjs [--out=<map>] [--game-dir=<gestagede game/>] [--settle=<ms>] [--window=1280x720] [--slot]
// Beelden: <out>/shots-<naam>.png via `[capture] <naam>` (desktop/devtools.js); metingen in <out>/result.json.
// Vereist een gestagede game (GDE_PREBUILT_WORLD=... GDE_STAGE_OUT=<map>/game node desktop/build.mjs); ELECTRON_EXE=<pad> als
// desktop/node_modules/electron ontbreekt. Nooit poort 9000, nooit echte opslag, één Electron tegelijk.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-isolatie-beeld')));
const GAME = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
const WINDOW = arg('window', '1280x720');
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(path.join(GAME, 'js', 'interiorisolation.js'))) { console.error(`de stage in ${GAME} bevat de nieuwe code niet`); process.exit(2); }

let slot = null;
if (process.argv.includes('--slot')) {
  for (let t = 0; t < 120 && !slot; t++) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (!slot) await sleep(5000);
  }
  if (!slot) throw new Error('geen Electron-slot');
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);

fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(os.tmpdir(), `gde-test-iso-${process.pid}`); fs.mkdirSync(profile, { recursive: true });
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__iso = ${JSON.stringify({ settle: Number(arg('settle', 3500)) })};\n` + fs.readFileSync(path.join(HERE, 'interior_isolation_shots.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: GAME };
delete env.ELECTRON_RUN_AS_NODE;
const throttleUit = ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
const child = spawn(electron, ['.', '--windowed', '--stil', ...throttleUit, '--force-device-scale-factor=1', `--window-size=${WINDOW}`, `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const killer = setTimeout(() => child.kill('SIGKILL'), 20 * 60 * 1000);
const code = await new Promise((res) => child.on('close', res));
clearTimeout(killer);
fs.writeFileSync(path.join(OUT, 'run.log'), log);
release();
let res = null;
for (const l of log.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) { try { res = JSON.parse(m[1]); } catch { /* ingekort */ } } }
const shots = fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f)).sort();
const nan = log.split(/\r?\n/).filter((l) => /Computed radius is NaN/i.test(l)).length;
const shaderFouten = log.split(/\r?\n/).filter((l) => /THREE\.WebGLProgram|shader error|GLSL|VALIDATE_STATUS/i.test(l)).slice(0, 8);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ exit: code, beelden: shots, resultaat: res, nanRegels: nan, shaderFouten }, null, 1));
console.log(`exit ${code}, beelden ${shots.length}, NaN-regels ${nan}, shaderfouten ${shaderFouten.length}`);
console.log(JSON.stringify(res && { ruimten: res.ruimten, naSet: res.naSet, flat: res.flat, meldingen: res.meldingen }, null, 1));
process.exit(res ? 0 : 1);
