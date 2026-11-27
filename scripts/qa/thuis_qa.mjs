// Thuis in beeld en in beweging (#1335, #1343): één Electron (wegwerpprofiel) draait thuis_<page>.page.js (garage: loop en rij de
// privégarage in en uit; flat: de gevel en het interieur). Via de veilige runner (scripts/lib/electronrunner.cjs: slot, --no-sandbox,
// profiel en TEMP in de uitvoermap, alleen het eigen kind stoppen).
//   node scripts/qa/thuis_qa.mjs --out=<map binnen de worktree> [--page=garage|flat] [--settle=9000] [--game-dir=<stage>]
// Uitvoer: <out>/shots-*.png, thuis_<page>.json, run.log, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const page = arg('page', 'garage');
const out = path.resolve(arg('out', path.join(ROOT, '.tmp-qa', 'thuis-' + page)));
const dirs = R.prepareRunDir(out);
const log = R.makeLog(out, 'run.log');
const gameDir = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir}`); process.exit(2); }
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__tq = ${JSON.stringify({ settle: Number(arg('settle', 9000)) })};\n` + fs.readFileSync(path.join(HERE, `thuis_${page}.page.js`), 'utf8'));
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NO_THROTTLE: '1' } });
try {
  const r = await R.runElectron({ electron: R.findElectron(ROOT), args, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out, log, slot: { label: 'thuis-qa', maxOthers: 1 }, timeoutMin: 4 });
  R.removeProfile(dirs.profile);
  if (r.perfScript) fs.writeFileSync(path.join(out, `thuis_${page}.json`), r.perfScript);
  log(`pagina: ${r.perfScript ? r.perfScript.slice(0, 4000) : 'geen [perf-script]-resultaat'}; exit ${r.code}`);
  process.exit(r.perfScript ? 0 : 1);
} catch (e) { log('fout: ' + e.message); process.exit(1); }
