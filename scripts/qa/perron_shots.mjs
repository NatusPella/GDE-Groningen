// Perrons en trappen (#436) in het echte spel: in één headless Electron (wegwerpprofiel, één instantie, sluit af) loopt
// perron_shots.page.js bij Groningen Noord (perron op de dijk, trap) en Europapark (laag perron, helling) met de echte toetsen
// de trap op, meet de hoogte, zet een trein langs het perron en neemt screenshots.
//   node scripts/qa/perron_shots.mjs --game=<gestagede game-map> [--out=<map>] [--slot] [--only=noord,europapark]
// Staged met: cd desktop && npm run stage (of GDE_PREBUILT_WORLD=... voor eigen JS). ELECTRON_EXE=<pad> als desktop/node_modules
// ontbreekt. GDE_GAME_DIR krijgt backslashes mee. --slot neemt een Electron-slot uit gde-locks (poll elke 4 s).
// Uitvoer: <out>/shots-<naam>.png, perron.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-perron')));
const GAME = arg('game', '');
const ONLY = arg('only', '');
const SETTLE = Number(arg('settle', 7000));
const LOCKS = process.env.GDE_LOCKS || 'C:/Users/abuis/gde-locks';
if (!GAME || !fs.existsSync(path.join(path.resolve(GAME), 'index.html'))) { console.error('geef --game=<gestagede game-map> (met index.html)'); process.exit(2); }

let slot = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function takeSlot() {
  if (!process.argv.includes('--slot')) return;
  for (let i = 0; i < 4000; i++) {
    for (const n of [1, 2, 3]) {
      const dir = path.join(LOCKS, 'electron-' + n);
      try { fs.mkdirSync(dir); slot = dir; return; } catch { /* bezet */ }
    }
    await sleep(4000);
  }
  console.error('geen slot'); process.exit(3);
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-perron-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__ps = ${JSON.stringify({ only: ONLY, settle: SETTLE })};\n` + fs.readFileSync(path.join(HERE, 'perron_shots.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
await takeSlot();
let r;
try {
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: path.resolve(GAME) };
  delete env.ELECTRON_RUN_AS_NODE;
  r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${arg('size', '1600x900')}`, `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
    { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 30 * 60 * 1000, killSignal: 'SIGKILL' });
} finally { release(); }
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let res = null;
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* de laatste regel telt */ } }
if (res) fs.writeFileSync(path.join(OUT, 'perron.json'), JSON.stringify(res, null, 1));
console.log(`resultaat: ${res ? 'ja' : 'nee'}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}, uitvoer: ${OUT}`);
process.exit(r.status === 0 && res ? 0 : 1);
