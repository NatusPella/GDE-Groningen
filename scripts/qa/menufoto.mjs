// Beelden van alle menu's en HUD-onderdelen die in de ronde na 0.64.0 zijn aangepast (opdracht voor feedback van de eigenaar).
// Eén Electron (wegwerpprofiel in de uitvoermap), page-script scripts/qa/menufoto.page.js. Wijzigt geen spelcode.
//   node scripts/qa/menufoto.mjs --out=<map> [--size=1920x1080] [--sets=esc,kaart,samen,hud,laad,reis,duif,bench] [--kern] [--boot]
// Draai het via het slot: node <worktree>\desktop\build\slots\slot.mjs run menufoto -- node scripts/qa/menufoto.mjs ...
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>. --boot legt ook het eerste laadscherm (boot-NN.png) vast.
// Uitvoer: <out>/<nummer>-<scherm>-<breedte>.png, menufoto-<breedte>.json, run-<breedte>.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { profileDirFor } from '../lib/testprofile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-menufoto')));
const SIZE = arg('size', '1920x1080');
const BREEDTE = SIZE.split('x')[0];
fs.mkdirSync(OUT, { recursive: true });
const profile = profileDirFor(`gde-test-mf-${process.pid}`, OUT);
fs.mkdirSync(profile, { recursive: true });
const script = path.join(OUT, `_page-${BREEDTE}-${process.pid}.js`);
const cfg = { size: SIZE, sets: arg('sets', 'esc,kaart,samen,hud,laad,reis,duif,bench').split(','), kern: flag('kern') };
fs.writeFileSync(script, `window.__mf = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'menufoto.page.js'), 'utf8'));
const hoofd = path.join(ROOT, '..', '..', '..', 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const electron = process.env.ELECTRON_EXE || process.env.GDE_ELECTRON || (fs.existsSync(path.join(ROOT, 'desktop', 'node_modules')) ? path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron') : hoofd);
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game'));
delete env.ELECTRON_RUN_AS_NODE;
const bootDir = path.join(OUT, `_boot-${BREEDTE}`);
const bootArgs = flag('boot') ? (fs.mkdirSync(bootDir, { recursive: true }), [`--bench-eval=${path.join(HERE, 'menufoto.boot.js')}`, `--boot-capture=${bootDir}`]) : [];
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, '--no-sandbox', '--in-process-gpu',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, '_s.png')}`, `--perf-script=${script}`, ...bootArgs],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, `run-${BREEDTE}.log`), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
// _s-<naam>.png wordt <naam>.png
for (const f of fs.readdirSync(OUT)) if (/^_s-.+\.png$/.test(f)) fs.renameSync(path.join(OUT, f), path.join(OUT, f.slice(3)));
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, `menufoto-${BREEDTE}.json`), l.slice(14));
console.log(l ? l.slice(14, 4000) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
