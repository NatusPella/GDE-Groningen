// Z-fight-meting (#917): één Electron (wegwerpprofiel) loopt een plekkenlijst af en maakt per plek en per camera-variant
// (near, far) beelden a, b (5 cm vooruit en near 3% groter) en c (= a). Daarna telt node scripts/qa/brug_beeld_analyse.mjs <out> de
// flikkerpixels en zet node scripts/qa/zfight_tabel.mjs <out> ze in een tabel plek x variant.
//   node scripts/qa/zfight_meting.mjs --plekken=<json [{naam,x,y,d,az,h,lz?}|{naam,x,y,oog:true,a,h?,lz?}]> [--varianten=0.5,1.5,2.5,1.5@400] [--out=<map>] [--settle=9000] [--preset=quality:hoog,drawDistance:ver] [--page=near_cam.page.js]
// Variant 'n' of 'n@f': near n meter, far f meter (zonder @f blijft far zoals het spel hem zet); 'auto': het near dat het spel zelf kiest (cameranear.js).
// GDE_GAME_DIR=<gestagede game-map>, GDE_DESKTOP=<desktop-map met node_modules>, ELECTRON_EXE=<pad>; uitvoer: <out>/shots-bb-*.png, zfight_meting.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-zfight')));
fs.mkdirSync(OUT, { recursive: true });
const plekken = JSON.parse(fs.readFileSync(path.resolve(arg('plekken')), 'utf8'));
const varianten = arg('varianten', '0.5,1.5,2.5').split(',').map((s) => { if (s === 'auto') return { id: 'nauto', near: 0, auto: true }; const [n, f] = s.split('@'); return { id: `n${n}${f ? `f${f}` : ''}`, near: Number(n), ...(f ? { far: Number(f) } : {}) }; });
const profile = `gde-test-zf-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__zf = ${JSON.stringify({ plekken, varianten, settle: Number(arg('settle', 9000)) })};\n` + fs.readFileSync(path.join(HERE, arg('page', 'zfight_meting.page.js')), 'utf8'));
const desktop = process.env.GDE_DESKTOP || path.join(ROOT, 'desktop');
const electron = process.env.ELECTRON_EXE || path.join(desktop, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(path.join(os.tmpdir(), profile), { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  ...(arg('preset') ? [`--preset=${arg('preset')}`] : []), `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, ...(arg('url-flags') ? [`--url-flags=${arg('url-flags')}`] : [])],
{ cwd: desktop, env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 60 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'zfight_meting.json'), JSON.stringify(full, null, 1));
for (const b of full.plekken || []) console.log(`${b.naam}: ${b.fout ? 'FOUT ' + b.fout : JSON.stringify(b.varianten)}`);
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
process.exit(r.status === 0 && (full.plekken || []).length ? 0 : 1);
