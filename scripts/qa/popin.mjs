// POP-IN in het echte spel meten (#1016, #1354): één Electron (wegwerpprofiel) loopt vaste routes (Binnenstad te voet, autorit door het
// centrum, provinciale weg per auto, door een dorp, korte vlucht), de pagina-probe (popin.page.js) meldt per frame wat nieuw getekend
// wordt (plus texture-uploads, shaderlinks, wissels en de tijdlijn per tegel), en een reeks stills (1280x720) van dezelfde route gaat naar
// <out>/shots-<tag>-<route>-<n>.png.
//   node scripts/qa/popin.mjs --tag=voor|na [--out=<map>] [--only=foot,cdrive,a7,dorp,heli] [--dur=30000] [--shots=6] [--view=kort|normaal|ver]
//                             [--cuts=M01.intro,M02.intro,...] (cutscenes via de echte host op een koude plek; gebruik --only=geen voor alleen die) [--cutmax=40]
//                             [--flags=perfoff=texwarm+mensenwacht] (devflags.js, komma-gescheiden: de A/B-stand "voor" op dezelfde build)
//                             [--quiet] (wacht op een stille machine) [--slot] (neemt een Electron-slot)
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/popin-<tag>.json, run-<tag>.log.
// De uitvoermap staat binnen de worktree (Electron geeft EPERM buiten .claude/worktrees).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const runner = require('../lib/electronrunner.cjs');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const OUT = path.resolve(arg('out', path.join(ROOT, '.scr', 'popin')));
const TAG = arg('tag', 'voor');
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${TAG}-${process.pid}`); // absoluut: %TEMP% is soms niet schrijfbaar
const script = path.join(OUT, `_page-${TAG}.js`);
const cfg = { only: arg('only', ''), dur: Number(arg('dur', 0)) || undefined, shots: arg('shots', '') === '' ? undefined : Number(arg('shots', 6)), tag: TAG, view: arg('view', 'kort'), cuts: arg('cuts', ''), cutMaxS: Number(arg('cutmax', 40)) };
fs.writeFileSync(script, `window.__popin = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'popin.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1', TEMP: profile, TMP: profile };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
const args = ['.', '--windowed', '--stil', '--in-process-gpu', '--force-device-scale-factor=1', '--window-size=1280x720',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  ...(arg('flags', '') ? [`--url-flags=${arg('flags', '')}`] : []),
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`];
let res = null;
try {
  res = await runner.runElectron({
    electron, args, cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, out: OUT,
    slot: flag('slot') ? { label: 'popin' } : false, quiet: flag('quiet') ? { maxCpu: 0.5, minFreeGB: 3, waitMin: 20 } : false, timeoutMin: 12,
  });
} catch (e) { console.error('Electron starten mislukt:', e.message); }
runner.removeProfile ? runner.removeProfile(profile) : fs.rmSync(profile, { recursive: true, force: true });
const l = res && res.perfScript;
if (l) fs.writeFileSync(path.join(OUT, `popin-${TAG}.json`), l);
console.log(l ? `resultaat ${l.length} tekens` : 'geen [perf-script]-resultaat', `\nexit ${res && res.code}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
