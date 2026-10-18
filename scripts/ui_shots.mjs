// Headless screenshots of the HUD and the menus at 720p, 1080p and 4K (#92,
// #34, #33). One Electron at a time, a throwaway profile that is removed again,
// and the process is closed when the run ends or times out.
//   node scripts/ui_shots.mjs [--out=<map>] [--sizes=1280x720,1920x1080,3840x2160] [--only=voet,auto,garage]
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
const bin = process.env.GDE_ELECTRON || path.join(root, 'desktop', 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
if (!fs.existsSync(bin)) { console.error('Geen electron gevonden op', bin, '(zie de kop van dit bestand)'); process.exit(2); }

// one Electron at a time (AGENTS.md): wait while another one runs
const busy = () => {
  const r = process.platform === 'win32'
    ? spawnSync('tasklist', ['/FI', 'IMAGENAME eq electron.exe', '/NH'], { encoding: 'utf8' })
    : spawnSync('pgrep', ['-x', 'Electron'], { encoding: 'utf8' });
  return process.platform === 'win32' ? /electron\.exe/i.test(r.stdout || '') : !!(r.stdout || '').trim();
};
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; busy(); i++) {
  if (i === 0) console.log('Er draait al een Electron; wacht.');
  if (i > 240) { console.error('Electron bleef bezet; gestopt.'); process.exit(3); }
  await sleep(5000);
}

let failed = 0;
for (const size of sizes) {
  const profile = 'gde-test-shots-' + process.pid;
  const profDir = path.join(os.tmpdir(), profile);
  fs.rmSync(profDir, { recursive: true, force: true });
  const script = path.join(out, `_scenes-${size}.js`);
  fs.writeFileSync(script, `window.__shotsOnly = ${JSON.stringify(only)};\n` + fs.readFileSync(path.join(root, 'scripts', 'ui', 'shots_scenes.js'), 'utf8'));
  // devtools adds -<scene> to the name for every capture
  const png = path.join(out, size + '.png');
  const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=' + size, '--smoke-test=' + png, '--perf-script=' + script];
  console.log('==', size);
  const child = spawn(bin, args, { cwd: path.join(root, 'desktop'), env: { ...process.env, GDE_TEST_PROFILE: profile }, shell: process.platform === 'win32' });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const killer = setTimeout(() => {
    log += '\n[timeout]';
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); else child.kill('SIGKILL');
  }, 240000);
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
