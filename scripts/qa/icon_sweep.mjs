// Runtime-iconensweep (opdracht 21-11, Kist Kees-melding): één Electron (wegwezen-profiel) start het spel, toont de Kist Kees-kaarten,
// het instrumentenpaneel en de pauzemenu-tabs en scant de DOM op een toets of knop zonder toetsplaatje (icon_sweep.page.js).
//   node scripts/qa/icon_sweep.mjs [--out=<map>]   (exit 1 bij bevindingen)
// Statisch tegenstuk: scripts/ui/icon_sweep.mjs (in test_all licht).
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-*.png, icon_sweep.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-icon-sweep')));
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${process.pid}`); // absoluut: %TEMP% is soms niet schrijfbaar
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__bz = ${JSON.stringify({ settle: Number(arg('settle', 9000)) })};\n` + fs.readFileSync(path.join(HERE, `icon_sweep.page.js`), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1', TEMP: path.join(OUT, 'tmp'), TMP: path.join(OUT, 'tmp'), TMPDIR: path.join(OUT, 'tmp') };
fs.mkdirSync(path.join(OUT, 'tmp'), { recursive: true });
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--no-sandbox', '--in-process-gpu', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 8 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, `icon_sweep.json`), l.slice(14));
console.log(l ? l.slice(14, 3000) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
let n = 1; try { n = JSON.parse(JSON.parse(l.slice(14))).bevindingen; } catch (e) { try { n = JSON.parse(l.slice(14)).bevindingen; } catch (e2) { n = 1; } }
process.exit(l && n === 0 ? 0 : 1);
