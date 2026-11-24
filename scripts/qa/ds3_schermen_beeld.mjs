// Voor/na-beelden van de DS3-schermen (#999 winkels en v2-schermen, #1000 minigames, #1001 Samen spelen): één Electron per formaat
// (wegwerpprofiel, slot via scripts/lib/electronrunner.cjs), de scenes uit scripts/ui/ds3_schermen_scenes.js.
//   node scripts/qa/ds3_schermen_beeld.mjs --out=<map> [--sizes=1920x1080,1280x720] [--only=winkel,loopbaan] [--rustig]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/<formaat>-<scene>.png en scenes-<formaat>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import runner from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg('out', null);
if (!OUT) { console.error('geef --out=<map> (niet in de systeem-temp)'); process.exit(2); }
const sizes = arg('sizes', '1920x1080,1280x720').split(',').filter(Boolean);
const only = arg('only', '').split(',').filter(Boolean);
const rustig = process.argv.includes('--rustig');
const scenes = fs.readFileSync(path.resolve(arg('scenes', path.join(ROOT, 'scripts', 'ui', 'ds3_schermen_scenes.js'))), 'utf8');
const electron = process.env.ELECTRON_EXE || runner.findElectron(ROOT);
let fout = 0;
for (const size of sizes) {
  const { out, profile, tmp } = runner.prepareRunDir(OUT);
  const script = path.join(out, `_page-${size}.js`);
  fs.writeFileSync(script, `window.__dsOnly = ${JSON.stringify(only)}; window.__dsRustig = ${rustig};\n` + scenes);
  const env = { ...runner.electronEnv({ profile, tmp }), GDE_NO_THROTTLE: '1', GDE_GAME_DIR: path.resolve(process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')) };
  const r = await runner.runElectron({
    electron, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out, timeoutMin: 14, slot: { label: 'ds3-schermen ' + size },
    args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${size}`, '--in-process-gpu',
      '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
      `--smoke-test=${path.join(out, size + '.png')}`, `--perf-script=${script}`],
  });
  runner.removeProfile(profile);
  if (r.perfScript) fs.writeFileSync(path.join(out, `scenes-${size}.json`), r.perfScript); else fout++;
  console.log(size, r.perfScript ? r.perfScript.slice(0, 3000) : 'geen [perf-script]-resultaat', `exit ${r.code}`);
}
console.log('uitvoer:', path.resolve(OUT));
process.exit(fout ? 1 : 0);
