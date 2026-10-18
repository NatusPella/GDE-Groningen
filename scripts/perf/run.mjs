// Perf-routes in the desktop build, cross-platform (the Windows twin of run.sh). Needs `npm run stage`
// in desktop/ first. Takes one of the Electron slots of C:/Users/abuis/gde-locks (README.txt) while it runs.
//   node scripts/perf/run.mjs <name> [--flags=simauto,zonderworker] [--only=foot,ring,village] [--dur=20000] [--out=<dir>] [-- extra electron args]
// Output: <out>/<name>.json (the [perf-script] line) and <name>.log. 1920x1080, silent, throwaway profile.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const name = args.shift();
const opt = (k, d = '') => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const rest = args.includes('--') ? args.slice(args.indexOf('--') + 1) : [];
const out = opt('out', path.join(os.tmpdir(), 'gde-perf'));
const LOCKS = process.env.GDE_LOCKS || 'C:/Users/abuis/gde-locks';
fs.mkdirSync(out, { recursive: true });

async function takeSlot() {
  for (;;) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); return path.join(LOCKS, `electron-${n}`); } catch (e) { /* bezet */ }
    }
    await new Promise((r) => setTimeout(r, 60000));
  }
}

const script = `window.__perfDur = ${Number(opt('dur', 20000))}; window.__perfOnly = '${opt('only')}'; window.__perfDiag = 0; window.__perfProfile = ''; window.__perfSim = '${opt('sim')}'; window.__perfJump = 0;\n` + fs.readFileSync(path.join(HERE, 'routes.js'), 'utf8');
const scriptFile = path.join(out, `_${name}.js`);
fs.writeFileSync(scriptFile, script);
const profile = `gde-perf-${process.pid}`; // main.js zet dit onder de tmp-map
const slot = await takeSlot();
let code = 1;
try {
  const desktop = path.join(HERE, '..', '..', 'desktop');
  const electron = path.join(desktop, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  const argv = ['.', '--windowed', '--stil', '--hitch', '--force-device-scale-factor=1', '--window-size=1920x1080', `--smoke-test=${path.join(out, name + '.png')}`,
    `--bench-eval=${path.join(HERE, 'hook.js')}`, `--perf-script=${scriptFile}`, ...(opt('flags') ? [`--url-flags=${opt('flags')}`] : []), ...rest];
  const log = fs.createWriteStream(path.join(out, `${name}.log`));
  const child = spawn(electron, argv, { cwd: desktop, env: { ...process.env, GDE_TEST_PROFILE: profile }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  code = await new Promise((r) => child.on('exit', r));
} finally {
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  fs.rmSync(scriptFile, { force: true });
  fs.rmSync(slot, { recursive: true, force: true });
}
const lines = fs.readFileSync(path.join(out, `${name}.log`), 'utf8').split(/\r?\n/).filter((l) => l.startsWith('[perf-script]'));
if (lines.length) fs.writeFileSync(path.join(out, `${name}.json`), lines[lines.length - 1].replace('[perf-script] ', ''));
console.log(`exit ${code}, ${lines.length ? 'resultaat in ' + path.join(out, name + '.json') : 'geen [perf-script]-regel, zie ' + path.join(out, name + '.log')}`);
process.exit(code || 0);
