// Speelcheck van de sluizen (#236): één headless Electron (wegwerpprofiel) laat een sloep door een
// paar sluizen varen en bewaart screenshots en een log per halve seconde.
//   node scripts/qa/sluizen_run.mjs --game-dir=<gestaged game-map> [--out=<map>] [--only=lauwersoog|delfzijl] [--settle=9000]
// De game-map is `desktop/build/game` of een kopie met de provinciewereld (GDE_GAME_DIR);
// GDE_DESKTOP=<map> voor een desktop-map met node_modules; ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: <out>/shots-<id>.png, sluizen.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-sluizen')));
fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-sl-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__sl = ${JSON.stringify({ only: arg('only', ''), settle: Number(arg('settle', 9000)), maxT: Number(arg('max', 240)) })};\n` + fs.readFileSync(path.join(HERE, 'sluizen.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (arg('game-dir')) env.GDE_GAME_DIR = path.resolve(arg('game-dir'));
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'sluizen.json'), JSON.stringify(full, null, 1));
for (const [id, v] of Object.entries(full)) if (v && v.log) console.log(`${id}: doorgekomen ${v.doorgekomen}, fasen ${(v.fasen || []).join('>')}, lift ${v.minLift}..${v.maxLift}, shots ${(v.screenshots || []).join(',')}`); else if (v && v.fout) console.log(`${id}: FOUT ${v.fout}`);
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
process.exit(r.status === 0 && Object.keys(full).length ? 0 : 1);
