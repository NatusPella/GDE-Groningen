// Garage-padprobe (#985): voor elke tab van de Garage een graaf van wat de D-pad doet en een BFS vanaf de startfocus; meldt kaarten die niet bereikt worden.
//   node scripts/qa/garage_pad_probe.mjs [--out=<map>] [--cats=all,car,...] [--formaat=1280x720]
// Omgeving zoals controller_sweep.mjs (GDE_GAME_DIR, ELECTRON_EXE, GDE_ELECTRON_FLAGS, GDE_PROFILE_DIR). Uitvoer: <out>/garage-probe.json
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-garage-probe')));
const m = arg('formaat', '1280x720').match(/^(\d{3,4})x(\d{3,4})$/);
fs.mkdirSync(OUT, { recursive: true });
const sweep = fs.readFileSync(path.join(HERE, 'controller_sweep.page.js'), 'utf8').split('\n');
const kop = [...sweep.slice(0, 46), ...sweep.slice(156, 179)].join('\n'); // gamepad en hulpjes, spel starten
const body = fs.readFileSync(path.join(HERE, 'garage_pad_probe.page.js'), 'utf8');
const profile = path.join(process.env.GDE_PROFILE_DIR || OUT, `profiel-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
const script = path.join(OUT, '_probe.js');
fs.writeFileSync(script, `window.__cs = ${JSON.stringify({ naam: arg('formaat', '1280x720'), familie: 'xbox', schermen: [], cats: arg('cats', 'all').split(',') })};\n${kop}\n${body}`);
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1', GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const extra = (process.env.GDE_ELECTRON_FLAGS || '').split(' ').filter(Boolean);
const r = spawnSync(electron, ['.', ...extra, '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${m[1]}x${m[2]}`,
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 15 * 60 * 1000, killSignal: 'SIGKILL' });
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
let j = null;
if (l) { try { j = JSON.parse(l.slice(14)); } catch { /* */ } }
if (!j) { console.log('geen resultaat (exit ' + r.status + ')'); console.log((r.stderr || '').slice(-600)); process.exit(1); }
fs.writeFileSync(path.join(OUT, 'garage-probe.json'), JSON.stringify(j.gp, null, 1));
for (const [t, v] of Object.entries(j.gp.tabs)) console.log(t, `doelen ${v.doelen}, kaarten ${v.kaarten}, bereikt ${v.bereikt}, mist ${v.mist.length}`, v.mist.join(' | '), 'kolommen', v.kolommen.join(','));
console.log((j.overgeslagen || []).join('; '), (j.fouten || []).length + ' fouten');
