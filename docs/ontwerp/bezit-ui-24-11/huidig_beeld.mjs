// Beelden van de huidige schermen van Land en bedrijf in Electron (review 24-11). Een gestagede game-map met een wereld is nodig (GDE_PREBUILT_WORLD, zie het geheugen eigen-js-stagen); het slot en het wegwerpprofiel komen van scripts/lib/electronrunner.cjs, de uitvoermap moet binnen .claude/worktrees staan.
//   node docs/ontwerp/bezit-ui-24-11/huidig_beeld.mjs --out=.scr/bezit-ontwerp/huidig/r1 --size=1920x1080 --scenes=docs/ontwerp/bezit-ui-24-11/huidig_scenes.js --game=<gestagede game-map> [--only=leeg|gevuld]
import fs from 'node:fs'; import path from 'node:path';
import runner from '../../../scripts/lib/electronrunner.cjs';
const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out')); const size = arg('size', '1920x1080'); const only = arg('only', '').split(',').filter(Boolean);
const scenes = fs.readFileSync(path.resolve(arg('scenes')), 'utf8');
const electron = process.env.ELECTRON_EXE || runner.findElectron(ROOT);
const { out, profile, tmp } = runner.prepareRunDir(OUT);
const script = path.join(out, `_page-${size}.js`);
fs.writeFileSync(script, `window.__dsOnly = ${JSON.stringify(only)};\n` + scenes);
const env = { ...runner.electronEnv({ profile, tmp }), GDE_NO_THROTTLE: '1', GDE_GAME_DIR: path.resolve(arg('game')) };
const r = await runner.runElectron({ electron, cwd: path.join(ROOT, 'desktop'), env, out, timeoutMin: Number(process.env.GDE_TIMEOUT_MIN || 4), slot: { label: 'bezit-ui ' + size },
  args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${size}`, '--in-process-gpu', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion', `--smoke-test=${path.join(out, size + '.png')}`, `--perf-script=${script}`] });
runner.removeProfile(profile);
console.log(size, r.perfScript ? String(r.perfScript).slice(0, 2000) : 'geen resultaat', 'exit', r.code);
