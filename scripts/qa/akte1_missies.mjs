// M01-M06 als speler (akte 1 op eindniveau, 23-11): één Electron via de veilige runner start elke missie met de debug-haak en neemt
// vijf beelden per missie: start, midden, gefaalde poging, Opnieuw proberen, eindkaart (akte1_missies.page.js).
//   node scripts/qa/akte1_missies.mjs --out=<map binnen de worktree> [--settle=5000] [--only=m01,m02] [--game-dir=<stage>]
// 23-11: via de veilige runner (scripts/lib/electronrunner.cjs: slot in ~/gde-locks, --no-sandbox, wegwerpprofiel en TEMP in de
// uitvoermap, logboek met hartslag, alleen het eigen kind stoppen). Uitvoer: <out>/shots-*.png, akte1_missies.json, run.log, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(arg('out', path.join(ROOT, '.tmp-qa', 'akte1-missies')));
const dirs = R.prepareRunDir(out);
const log = R.makeLog(out, 'run.log');
const gameDir = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir}`); process.exit(2); }
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__am = ${JSON.stringify({ settle: Number(arg('settle', 5000)), only: arg('only', '') })};\n` + fs.readFileSync(path.join(HERE, 'akte1_missies.page.js'), 'utf8'));
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NO_THROTTLE: '1' } });
try {
  const r = await R.runElectron({ electron: R.findElectron(ROOT), args, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out, log, slot: { label: 'akte1-missies', maxOthers: 1 }, timeoutMin: 30 });
  R.removeProfile(dirs.profile);
  if (r.perfScript) fs.writeFileSync(path.join(out, 'akte1_missies.json'), r.perfScript);
  log(`pagina: ${r.perfScript ? r.perfScript.slice(0, 3000) : 'geen [perf-script]-resultaat'}; exit ${r.code}`);
  process.exit(r.perfScript ? 0 : 1);
} catch (e) { log('fout: ' + e.message); process.exit(1); }
