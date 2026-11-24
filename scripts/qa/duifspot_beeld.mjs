// De duivenspotmissie "Kieken van boven" in beeld (#1025): één Electron (wegwerpprofiel) start de missie, vliegt bij het Groninger Museum
// en neemt beelden met de wereldmarkers (na) en zonder (voor).
//   node scripts/qa/duifspot_beeld.mjs --out=<map> [--settle=9000]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-*.png, duifspot.json, electron.log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import runner from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
// 24-11: via scripts/lib/electronrunner.cjs (slot, --no-sandbox, nooit de systeem-temp)
const OUT = arg('out', null);
if (!OUT) { console.error('geef --out=<map> (niet in de systeem-temp)'); process.exit(2); }
const { out, profile, tmp } = runner.prepareRunDir(OUT);
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__ds = ${JSON.stringify({ settle: Number(arg('settle', 9000)) })};
` + fs.readFileSync(path.join(HERE, 'duifspot_beeld.page.js'), 'utf8'));
const env = { ...runner.electronEnv({ profile, tmp }), GDE_NO_THROTTLE: '1', GDE_GAME_DIR: path.resolve(process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')) };
const electron = process.env.ELECTRON_EXE || runner.findElectron(ROOT);
const r = await runner.runElectron({
  electron, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out, timeoutMin: 8, slot: { label: 'duifspot #1025' },
  args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900', '--in-process-gpu',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`],
});
runner.removeProfile(profile);
if (r.perfScript) fs.writeFileSync(path.join(out, 'duifspot.json'), r.perfScript);
console.log(r.perfScript ? r.perfScript.slice(0, 3000) : 'geen [perf-script]-resultaat', `
exit ${r.code}; uitvoer: ${out}`);
process.exit(r.perfScript ? 0 : 1);
