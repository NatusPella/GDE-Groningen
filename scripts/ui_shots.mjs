// Headless screenshots of the HUD and the menus at 720p, 1080p and 4K (#92,
// #34, #33). One Electron at a time, a throwaway profile that is removed again,
// and the process is closed when the run ends or times out.
//   node scripts/ui_shots.mjs [--out=<map>] [--sizes=1280x720,1920x1080,3840x2160] [--only=voet,auto,garage] [--scenes=<eigen scenebestand>] [--emulate=0.45] [--flags=touch=1]
// Needs `cd desktop && npm install && npm run stage` once. GDE_ELECTRON=<pad>
// points at another electron binary (a worktree has no node_modules of its own).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const out = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-ui-shots')));
const sizes = arg('sizes', '1280x720,1920x1080,3840x2160').split(',');
const only = arg('only', '');
// --types=a,b: a scene file may read window.__shotsTypes (shots_scenes_r39.js: which shop types)
const types = arg('types', '');
// --timeout=<s>: how long one window size may run before it is killed (default 240; long scene files need more)
const timeoutS = Number(arg('timeout', 240)) || 240;
// --emulate=0.45: the page lays out at the full size (a real 3840x2160 viewport on a smaller
// screen, devtools.js --emulate-view) in a window of 0.45 of the size (it must fit the screen); the picture is that much smaller
const emulate = Number(arg('emulate', '0')) || 0;
// --flags=touch=1,...: extra ?-switches of devflags.js (touch controls on a desktop window, #96 #227)
const flags = arg('flags', '');
const scenes = path.resolve(arg('scenes', path.join(root, 'scripts', 'ui', 'shots_scenes.js')));
const bin = process.env.GDE_ELECTRON || path.join(root, 'desktop', 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
if (!fs.existsSync(bin)) { console.error('Geen electron gevonden op', bin, '(zie de kop van dit bestand)'); process.exit(2); }

// at most GDE_MAX_ELECTRON (default 2) other Electron apps at once, so a run
// stays inside the three that the machine allows: only the main processes
// count (Windows: no --type= on the command line; macOS: the exact name)
const MAX_OTHERS = Number(process.env.GDE_MAX_ELECTRON || 2);
const others = () => {
  if (process.platform === 'win32') {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', "(Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Where-Object { $_.CommandLine -notmatch '--type=' } | Measure-Object).Count"], { encoding: 'utf8' });
    return Number((r.stdout || '').trim()) || 0;
  }
  const r = spawnSync('pgrep', ['-x', 'Electron'], { encoding: 'utf8' });
  return (r.stdout || '').split(/\r?\n/).filter(Boolean).length;
};
const busy = () => others() >= MAX_OTHERS;
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; busy(); i++) {
  if (i === 0) console.log('Er draaien al genoeg Electron-apps; wacht.');
  if (i > 240) { console.error('Electron bleef bezet; gestopt.'); process.exit(3); }
  await sleep(5000);
}

let failed = 0;
for (const size of sizes) {
  const profile = 'gde-test-shots-' + process.pid;
  const profDir = path.join(os.tmpdir(), profile);
  fs.rmSync(profDir, { recursive: true, force: true });
  const script = path.join(out, `_scenes-${size}.js`);
  fs.writeFileSync(script, `window.__shotsOnly = ${JSON.stringify(only)};\nwindow.__shotsTypes = ${JSON.stringify(types)};\n` + fs.readFileSync(scenes, 'utf8'));
  // devtools adds -<scene> to the name for every capture
  const png = path.join(out, size + '.png');
  const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=' + (emulate ? size.split('x').map((n) => Math.round(Number(n) * emulate)).join('x') : size), ...(emulate ? ['--emulate-view=' + size + '@' + emulate] : []), ...(flags ? ['--url-flags=' + flags] : []), '--smoke-test=' + png, '--perf-script=' + script];
  console.log('==', size);
  const child = spawn(bin, args, { cwd: path.join(root, 'desktop'), env: { ...process.env, GDE_TEST_PROFILE: profile }, shell: process.platform === 'win32' });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const killer = setTimeout(() => {
    log += '\n[timeout]';
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); else child.kill('SIGKILL');
  }, timeoutS * 1000);
  const code = await new Promise((res) => child.on('close', res));
  clearTimeout(killer);
  fs.writeFileSync(path.join(out, `_log-${size}.txt`), log);
  const shots = fs.readdirSync(out).filter((f) => f.startsWith(size + '-') && f.endsWith('.png'));
  const errs = log.split(/\r?\n/).filter((l) => /\[renderer\].*(error|NaN)/i.test(l));
  console.log(`   exit ${code}, ${shots.length} beelden, ${errs.length} fouten in de console`);
  for (const e of errs.slice(0, 5)) console.log('   ' + e.slice(0, 160));
  if (!shots.length || /\[timeout\]/.test(log)) failed++;
  fs.rmSync(profDir, { recursive: true, force: true });
}
console.log('beelden in', out);
process.exit(failed ? 1 : 0);
