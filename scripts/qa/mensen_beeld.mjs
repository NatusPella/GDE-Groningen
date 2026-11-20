// Beeldrun van het lopen en de blik (#985): één Electron (wegwerpprofiel, sluit af) loopt mensen_beeld.page.js af.
//   node scripts/qa/mensen_beeld.mjs --out=<map> [--size=1280x720] [--settle=<ms>]
// GDE_GAME_DIR (de gestagede game-map van de build die je wilt zien), ELECTRON_EXE en GDE_ELECTRON_EXTRA_ARGS (bv. --no-sandbox,--in-process-gpu)
// zoals hertest_beeld.mjs. Vergelijk voor en na door twee keer te draaien met een andere GDE_GAME_DIR.
// Uitvoer: <out>/shots-*.png, mensen.json (metingen), run.log. Exit 0 als er een resultaat kwam.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-mensen')));
const SIZE = arg('size', '1280x720');
const SETTLE = Number(arg('settle', 9000));
const ONLY = arg('only', '').split(',').filter(Boolean);
const PAGE = arg('page', 'mensen_beeld.page.js');
fs.mkdirSync(OUT, { recursive: true });
const profile = process.env.GDE_PROFILE_DIR || `gde-test-mensen-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__mensenOnly = ${JSON.stringify(ONLY)};
await new Promise((r) => setTimeout(r, ${SETTLE}));\n` + fs.readFileSync(path.join(HERE, PAGE), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const extra = (process.env.GDE_ELECTRON_EXTRA_ARGS || '').split(',').filter(Boolean);
const r = spawnSync(electron, ['.', ...extra, '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`,
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 8 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.resolve(os.tmpdir(), profile), { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, 'mensen.json'), l.slice(14));
console.log(l ? l.slice(14, 1500) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
