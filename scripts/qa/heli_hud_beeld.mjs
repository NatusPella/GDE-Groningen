// De heli-HUD tijdens en na de vlucht in beeld (#1033): één Electron (wegwerpprofiel, slot via scripts/lib/electronrunner.cjs)
// vliegt de Ballonjacht met de automatische piloot en de roostervlucht van M12 (afgebroken), met beelden en een HUD-meting per stap.
//   node scripts/qa/heli_hud_beeld.mjs --out=<map> [--max=330]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-*.png, heli_hud.json, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import runner from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg('out', null);
if (!OUT) { console.error('geef --out=<map> (niet in de systeem-temp)'); process.exit(2); }
const { out, profile, tmp } = runner.prepareRunDir(OUT);
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__hh = ${JSON.stringify({ max: Number(arg('max', 330)) })};\n` + fs.readFileSync(path.join(HERE, 'heli_hud_beeld.page.js'), 'utf8'));
const env = { ...runner.electronEnv({ profile, tmp }), GDE_NO_THROTTLE: '1', GDE_GAME_DIR: path.resolve(process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')) };
const electron = process.env.ELECTRON_EXE || runner.findElectron(ROOT);
const r = await runner.runElectron({
  electron, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out, timeoutMin: 12, slot: { label: 'heli-hud #1033' },
  args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900', '--in-process-gpu',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`],
});
runner.removeProfile(profile);
if (r.perfScript) fs.writeFileSync(path.join(out, 'heli_hud.json'), r.perfScript);
console.log(r.perfScript ? r.perfScript.slice(0, 4000) : 'geen [perf-script]-resultaat', `\nexit ${r.code}; uitvoer: ${out}`);
process.exit(r.perfScript ? 0 : 1);
