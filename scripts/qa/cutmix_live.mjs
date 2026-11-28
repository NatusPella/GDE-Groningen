// De muziekmix van een cutscene echt gemeten (aaa30, 28-11): één Electron via de veilige runner (slot, --no-sandbox, wegwerpprofiel en TEMP in de
// uitvoermap) met --audio-graph. De scène draait twee keer in echte tijd door de host: eerst met de oude stand (cutMixOff), dan met de
// cutscenemix (sfx/cutmix.js). Elke 100 ms: de gain van de muziekbus, de stand van de mix en of er een stem klinkt.
// Niemand heeft het gehoord: dit meet de regeling (de gain waarmee de muziekbus speelt), niet het geluid zelf.
//   node scripts/qa/cutmix_live.mjs --out=<map binnen de worktree> --scene=M05.intro [--game-dir=<stage>]
// Uitvoer: <out>/cutmix.json (voor scripts/qa/cutmix_rapport.mjs), run.log, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const scene = arg('scene', 'M05.intro');
const out = path.resolve(arg('out', path.join(ROOT, '.scr', 'cutmix-' + scene)));
const dirs = R.prepareRunDir(out);
const log = R.makeLog(out, 'run.log');
const gameDir = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir}`); process.exit(2); }
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + "for (let i = 0; i < 120; i++) { if (document.body.classList.contains('game-started')) break; const w = window.__debug && window.__debug.world; if (w && w.paused) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } } await new Promise((r) => setTimeout(r, 500)); }\n"
  + 'await new Promise((r) => setTimeout(r, 4000));\n';
const script = path.join(out, '_page.js');
fs.writeFileSync(script, WACHT + `window.__cm = ${JSON.stringify({ scene })};\n` + fs.readFileSync(path.join(HERE, 'cutmix_live.page.js'), 'utf8'));
const tap = path.join(HERE, 'audiotap.js');
const args = ['.', '--windowed', '--stil', '--audio-graph', `--bench-eval=${tap}`, '--force-device-scale-factor=1', '--window-size=1280x720',
  '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NO_THROTTLE: '1' } });
try {
  const r = await R.runElectron({ electron: R.findElectron(ROOT), args, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out, log, slot: { label: 'cutmix-live', maxOthers: 2 }, timeoutMin: 6 });
  R.removeProfile(dirs.profile);
  if (r.perfScript) fs.writeFileSync(path.join(out, 'cutmix.json'), r.perfScript);
  log(`resultaat: ${r.perfScript ? r.perfScript.slice(0, 400) : 'geen [perf-script]-resultaat'}; exit ${r.code}`);
  process.exit(r.perfScript ? 0 : 1);
} catch (e) { log('fout: ' + e.message); process.exit(1); }
