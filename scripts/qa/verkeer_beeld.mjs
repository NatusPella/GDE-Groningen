// Verkeer en voertuigen in beeld (24-11: #1018 #1019 #1020 #1023 #1027 #1047 #1049 #1083 #958): één Electron via de veilige runner
// (scripts/lib/electronrunner.cjs: slot in ~/gde-locks, wegwerpprofiel en TEMP in de uitvoermap, --no-sandbox, logboek met hartslag,
// nooit een dialoogvenster, alleen het eigen kind stoppen). De scenario's staan in verkeer_beeld.page.js.
//   node scripts/qa/verkeer_beeld.mjs --out=<map> [--game-dir=<gestagede game>] [--only=reiskaart,taxirit,fiets,dak,fatbike,verkeer,boten,zwem]
// Stagen met de wereld van een andere build: GDE_PREBUILT_WORLD=<.../desktop/build/game/world> GDE_STAGE_OUT=<map>/game node desktop/build.mjs
// Uitvoer: <out>/shots-<naam>.png, verkeer_beeld.json, run.log, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(arg('out', path.join(ROOT, '.tmp-verkeer', 'electron')));
const dirs = R.prepareRunDir(out);
const log = R.makeLog(out, 'run.log');
const gameDir = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir}`); process.exit(2); }
const electron = R.findElectron(ROOT);
const cfg = { only: arg('only', '').split(',').filter(Boolean) };
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__vb = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'verkeer_beeld.page.js'), 'utf8'));
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NO_THROTTLE: '1' } });
const cwd = process.env.GDE_DESKTOP || path.join(ROOT, 'desktop');
try {
  const r = await R.runElectron({ electron, args, cwd, env, out, log, slot: { label: 'verkeer-beeld', maxOthers: 1 }, timeoutMin: 30 });
  R.removeProfile(dirs.profile);
  if (r.perfScript) fs.writeFileSync(path.join(out, 'verkeer_beeld.json'), r.perfScript);
  log(`pagina: ${r.perfScript ? r.perfScript.slice(0, 800) : 'geen resultaat'}; exit ${r.code}`);
  process.exit(r.perfScript ? 0 : 1);
} catch (e) { log('fout: ' + e.message); process.exit(1); }
