// Draait een beeldscript (scripts/ui/personages2_scenes.js of een ander --perf-script) in EEN Electron via de gedeelde runner
// (slot in ~/gde-locks, --no-sandbox, profiel en TEMP in de uitvoermap). Zelfde argumenten als scripts/ui_shots.mjs.
//   GDE_GAME_DIR=<gestagede game> ELECTRON_EXE=<electron.exe> node scripts/qa/personages2_run.mjs --scenes=<bestand> --out=<map in de worktree> [--size=1600x900] [--flags=a=1] [--timeout=10]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../lib/electronrunner.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const size = arg('size', '1600x900');
const out = path.resolve(arg('out', path.join(root, '.scr', 'p2')));
const scenes = path.resolve(arg('scenes', path.join(root, 'scripts', 'ui', 'personages2_scenes.js')));
const flags = ['dynvast', ...arg('flags', '').split(',').filter(Boolean)].join(',');
const run = R.prepareRunDir(out);
const script = path.join(out, '_scenes.js');
const only = arg('only', '');   // --only=voetbal: een scene met rijen (personages2_kleding.js) doet alleen de rijen met deze naam
fs.writeFileSync(script, (only ? `window.__p2Only = ${JSON.stringify(only)};
` : '') + fs.readFileSync(scenes, 'utf8'));
const png = path.join(out, size + '.png');
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=' + size, '--url-flags=' + flags, '--smoke-test=' + png, '--perf-script=' + script];
const electron = process.env.ELECTRON_EXE || R.findElectron(root);
const gameDir = process.env.GDE_GAME_DIR || path.join(root, 'desktop', 'build', 'game');
const env = R.electronEnv({ profile: run.profile, tmp: run.tmp, gameDir });
const res = await R.runElectron({ electron, args, cwd: path.join(root, 'desktop'), env, out, slot: { label: 'personages2' }, timeoutMin: Number(arg('timeout', 12)) });
fs.rmSync(run.profile, { recursive: true, force: true });
const log = fs.existsSync(path.join(out, 'electron.log')) ? fs.readFileSync(path.join(out, 'electron.log'), 'utf8') : '';
for (const l of log.split(/\r?\n/)) if (l.startsWith('[p2]') || /\[renderer\].*(error|NaN)/i.test(l)) console.log(l.slice(0, 300));
console.log('exit', res.code, 'beelden in', out, fs.readdirSync(out).filter((f) => f.endsWith('.png')).length);
