// Proef in de echte game (feedback eigenaar 24-11): klinken de cues van game/js/cutscenesfx.js in een cutscene, staat het bed goed en
// duikt de omgeving onder de stemmen? Eén Electron via scripts/lib/electronrunner.cjs (slot, wegwerpprofiel, --no-sandbox), met
// --stil --audio-graph (de hele geluidsgraaf in een gedempte uitgang: niets te horen, wel te meten) en de audiotap.
//   node scripts/qa/cutscene_sfx_proef.mjs --out=<map buiten de systeem-temp> [--scenes=M01.intro,M02.intro,M03.outro] [--max=420]
// Omgeving: GDE_GAME_DIR=<gestagede game> (desktop/build.mjs met GDE_PREBUILT_WORLD), ELECTRON_EXE als desktop/node_modules ontbreekt.
// Uitvoer: <out>/result.json (per scene de cues met tijd en of er een buffer startte, het bed, de ambience-bus voor en tijdens).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import runner from '../lib/electronrunner.cjs';
import { profileDirFor } from '../lib/testprofile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MAX = Number(arg('max', 420));
const { out, tmp } = runner.prepareRunDir(arg('out', ''));
// het profiel zoals de andere harnassen (scripts/lib/testprofile.mjs): Electron weigert hier soms een profielmap die de runner maakte
const profile = profileDirFor(`gde-test-cutsfx-${process.pid}`, out);
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__tb = ${JSON.stringify({ scenes: arg('scenes', 'M01.intro,M02.intro,M03.outro') })};\n` + fs.readFileSync(path.join(HERE, 'cutscene_sfx.page.js'), 'utf8'));
const electron = runner.findElectron(ROOT);
const env = runner.electronEnv({ profile, tmp, gameDir: process.env.GDE_GAME_DIR, extra: { GDE_MENU_TEST: '1' } });
const res = await runner.runElectron({
  electron, cwd: path.join(ROOT, 'desktop'), env, out, timeoutMin: Math.ceil((MAX + 240) / 60), slot: { label: 'cutscene-sfx' },
  args: ['.', '--windowed', '--stil', '--audio-graph', '--force-device-scale-factor=1', '--window-size=1280x720',
    `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`, `--bench-eval=${path.join(HERE, 'audiotap.js')}`],
});
runner.removeProfile(profile);
if (res.perfScript) fs.writeFileSync(path.join(out, 'result.json'), res.perfScript);
console.log(res.perfScript ? res.perfScript.slice(0, 4000) : 'geen [perf-script]-resultaat', '\nuitvoer:', out);
process.exit(res.perfScript ? 0 : 1);
