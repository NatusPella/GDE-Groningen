// Meetrondes voor de vier door een tester gemelde bugs (#321 intro-camera, #326 voiceover, #329 titelkaart bij grote
// gebouwen, #328 muis vastzetten). Eén Electron (slot uit gde-locks, wegwerpprofiel, BelowNormal), sluit zelf af.
//   node scripts/qa/tester_bugs.mjs --check=intro|audio|caption|lock|achtervolging|cutnabij|pad|padscreens [--out=<map>] [--max=150] [--seed=<n>]
// Omgeving: GDE_GAME_DIR=<map>\game (met backslashes) voor een gestagede build, ELECTRON_EXE=<pad> als
// desktop/node_modules ontbreekt. Het slot wordt altijd vrijgegeven. De page-scripts heten tester_<check>.page.js.
// Bij --check=achtervolging (#117) komt daar de audiotap van scripts/qa/audiotap.js bij: het niveau en elk geluid van de cutscene met de politieauto (M02.intro).
// Bij --check=pad en padscreens (#151) stuurt een nep-controller het spel; padscreens vraagt --max=700.
// Bij --check=audio draait het spel met --stil --audio-graph: de hele geluidsgraaf loopt, maar in een gedempte uitgang (niets te horen).
// Uitvoer: <out>/run.log, <out>/result.json (de [perf-script]-regel), <out>/frames.json (intro: [t,x,y,h,dx,dy,dz,fov,dak,cine,ov,cut]), beelden <out>/shots-*.png.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const CHECK = arg('check', 'intro');
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), `gde-tester-${CHECK}`)));
const MAX = Number(arg('max', 150));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

let slot = null;
async function takeSlot() {
  if (!fs.existsSync(LOCKS) || process.argv.includes('--geen-slot')) return;
  for (;;) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n} genomen`); return; } catch { /* bezet */ }
    }
    await sleep(4000);
  }
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });

const profile = `gde-test-tb-${process.pid}`;
const pageFile = path.join(HERE, `tester_${CHECK}.page.js`);
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__tb = ${JSON.stringify({ maxS: MAX, seed: Number(arg('seed', 1)), every: Number(arg('every', 1500)), ...JSON.parse(arg('opts', '{}')) })};\n` + fs.readFileSync(pageFile, 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;

await takeSlot();
let out = '';
try {
  const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, ...(CHECK === 'audio' || CHECK === 'achtervolging' ? ['--audio-graph'] : []), ...(CHECK === 'achtervolging' ? [`--bench-eval=${path.join(HERE, 'audiotap.js')}`] : [])], { cwd: path.join(ROOT, 'desktop'), env, windowsHide: false });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const limit = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* weg */ } }, (MAX + 240) * 1000);
  const code = await new Promise((res) => child.on('close', res));
  clearTimeout(limit);
  console.log('electron klaar, exit', code);
} finally {
  release();
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
}
fs.writeFileSync(path.join(OUT, 'run.log'), out);
const lines = out.split('\n');
const res = [...lines].reverse().find((l) => l.startsWith('[perf-script] '));
if (res) fs.writeFileSync(path.join(OUT, 'result.json'), res.slice(14));
try { const fr = JSON.parse(res.slice(14)).results.intro.frames; if (fr) fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(fr)); } catch { /* geen frames */ }
console.log(res ? res.replace(/"frames":\[\[[^]*?\]\]/, '"frames":[…]').slice(0, 1500) : 'geen [perf-script]-resultaat');
console.log('[renderer]-regels:', lines.filter((l) => l.startsWith('[renderer]')).length, 'NaN:', lines.filter((l) => /NaN/.test(l) && !/perf-script/.test(l)).length);
console.log('uitvoer:', OUT);
process.exit(res ? 0 : 1);
