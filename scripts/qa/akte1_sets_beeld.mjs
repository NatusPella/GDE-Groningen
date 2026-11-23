// De keuken van de opening en de flat van Tammo en Tessa in de echte wereld (akte 1 op eindniveau, 23-11): één Electron via de veilige
// runner (scripts/lib/electronrunner.cjs: slot in ~/gde-locks, wegwerpprofiel en TEMP in de uitvoermap, --no-sandbox, logboek met
// hartslag, nooit een dialoogvenster, alleen het eigen kind stoppen). De pagina staat in akte1_sets_beeld.page.js.
//   node scripts/qa/akte1_sets_beeld.mjs --out=<map binnen de worktree> [--game-dir=<gestagede game>] [--settle=2500] [--klokken=7.4,21.5]
// Stagen met de wereld van een andere build: GDE_PREBUILT_WORLD=<.../desktop/build/game/world> node desktop/build.mjs
// Uitvoer: <out>/shots-<naam>.png, akte1_sets_beeld.json, run.log, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(arg('out', path.join(ROOT, '.tmp-akte1', 'electron')));
const dirs = R.prepareRunDir(out);
const log = R.makeLog(out, 'run.log');
const gameDir = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir}`); process.exit(2); }
const electron = R.findElectron(ROOT);
const cfg = { settle: Number(arg('settle', 2500)), klokken: arg('klokken', '7.4,21.5').split(',').map(Number) };
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__as = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'akte1_sets_beeld.page.js'), 'utf8'));
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NO_THROTTLE: '1' } });
const cwd = process.env.GDE_DESKTOP || path.join(ROOT, 'desktop');
try {
  const r = await R.runElectron({ electron, args, cwd, env, out, log, slot: { label: 'akte1-sets', maxOthers: 1 }, timeoutMin: 25 });
  R.removeProfile(dirs.profile);
  if (r.perfScript) fs.writeFileSync(path.join(out, 'akte1_sets_beeld.json'), r.perfScript);
  log(`pagina: ${r.perfScript ? r.perfScript.slice(0, 600) : 'geen resultaat'}; exit ${r.code}`);
  process.exit(r.perfScript ? 0 : 1);
} catch (e) { log('fout: ' + e.message); process.exit(1); }
