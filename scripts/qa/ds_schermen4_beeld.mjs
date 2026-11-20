// Prestaties, Foto's, Kaart en Samen spelen in beeld (designsysteem, fase 4, #980): één Electron (wegwerpprofiel, sluit af)
// opent de schermen zoals een speler ze opent en neemt beelden en metingen (ds_schermen4_beeld.page.js).
//   node scripts/qa/ds_schermen4_beeld.mjs [--out=<map>] [--prefix=voor] [--size=1280x720] [--settle=8000] [--stap=prestaties,fotos,kaart,samen]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-<prefix><hoogte>-*.png, ds4_<prefix><formaat>.json, run-*.log.
// Draai alleen als er geen andere game-Electron draait (één instantie tegelijk).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-ds-schermen4')));
const PREFIX = arg('prefix', 'x');
const SIZE = arg('size', '1280x720');
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${process.pid}`); // absoluut: %TEMP% is soms niet schrijfbaar
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__ds4 = ${JSON.stringify({ settle: Number(arg('settle', 8000)), prefix: `${PREFIX}${SIZE.split('x')[1]}`, stap: arg('stap', 'prestaties,fotos,kaart,samen').split(',') })};\n` + fs.readFileSync(path.join(HERE, 'ds_schermen4_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, ...(arg('touch', '') ? ['--touch'] : []),
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 30 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, `run-${PREFIX}${SIZE}.log`), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, `ds4_${PREFIX}${SIZE}.json`), l.slice(14));
console.log(l ? l.slice(14, 4000) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
