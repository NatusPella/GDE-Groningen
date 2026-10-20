// Touch layout on phone and tablet screens, without a device (#96): Electron
// with Chromium device emulation (--emulate-mobile: touch events, viewport
// meta) and the touch controls forced on (--touch). Per device and
// orientation it runs scripts/ui/mobile_scenes.js, which measures the buttons
// and the HUD and takes a screenshot per situation.
//   node scripts/mobile_shots.mjs [--out=<map>] [--devices=360x800,412x915,...] [--only=voet,auto,...] [--scale=0.6]
// Needs `cd desktop && npm install && npm run stage` once (GDE_ELECTRON=<pad>
// for another electron binary). One Electron at a time: it takes a slot from
// C:/Users/abuis/gde-locks (the night-run protocol) when that folder exists, a
// throwaway profile (GDE_TEST_PROFILE) and BelowNormal priority; the process is
// closed after every device.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const out = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-mobile-shots')));
// phone 360x800, large phone 412x915, iPhone 390x844, tablet 820x1180; each landscape and portrait
const DEFAULT = '800x360,360x800,915x412,412x915,844x390,390x844,1180x820,820x1180';
const devices = arg('devices', DEFAULT).split(',');
const only = arg('only', '');
const scenes = path.resolve(arg('scenes', path.join(root, 'scripts', 'ui', 'mobile_scenes.js')));
const LOCKS = process.env.GDE_LOCKS || 'C:/Users/abuis/gde-locks';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let bin = process.env.GDE_ELECTRON;
if (!bin) {
  const req = (await import('node:module')).createRequire(path.join(root, 'desktop', 'package.json'));
  try { bin = req('electron'); } catch (e) { /* fall through */ }
}
if (!bin || !fs.existsSync(bin)) { console.error('Geen electron gevonden (zie de kop van dit bestand)'); process.exit(2); }
if (!fs.existsSync(path.join(root, 'desktop', 'build', 'game', 'index.html'))) { console.error('Niet gestaged: cd desktop && npm run stage'); process.exit(2); }

async function takeSlot() {
  if (!fs.existsSync(LOCKS)) return null;
  for (let i = 0; i < 120; i++) {
    for (const n of [1, 2, 3]) {
      const d = path.join(LOCKS, 'electron-' + n);
      try { fs.mkdirSync(d); return d; } catch (e) { /* bezet */ }
    }
    if (i === 0) console.log('Alle Electron-slots bezet; wacht.');
    await sleep(60000);
  }
  throw new Error('geen Electron-slot gekregen');
}

fs.mkdirSync(out, { recursive: true });
const slot = await takeSlot();
let failed = 0;
try {
  for (const size of devices) {
    const [W, H] = size.split('x').map(Number);
    // the page lays out at WxH; the window is smaller when the screen is short
    const scale = Number(arg('scale', 0)) || Math.min(1, 900 / Math.max(W, H));
    const profile = 'gde-test-mobile-' + process.pid;
    const profDir = path.join(os.tmpdir(), profile);
    fs.rmSync(profDir, { recursive: true, force: true });
    const script = path.join(out, `_scenes-${size}.js`);
    fs.writeFileSync(script, `window.__shotsOnly = ${JSON.stringify(only)};\n` + fs.readFileSync(scenes, 'utf8'));
    const png = path.join(out, size + '.png');
    const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${Math.round(W * scale)}x${Math.round(H * scale)}`, `--emulate-view=${size}@${scale}`, '--emulate-mobile', '--touch', '--smoke-test=' + png, '--perf-script=' + script];
    console.log('==', size, '(schaal ' + scale.toFixed(2) + ')');
    const child = spawn(bin, args, { cwd: path.join(root, 'desktop'), env: { ...process.env, GDE_TEST_PROFILE: profile } });
    try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* niet erg */ }
    let log = '';
    child.stdout.on('data', (d) => { log += d; });
    child.stderr.on('data', (d) => { log += d; });
    const killer = setTimeout(() => {
      log += '\n[timeout]';
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); else child.kill('SIGKILL');
    }, 420000);
    const code = await new Promise((res) => child.on('close', res));
    clearTimeout(killer);
    fs.writeFileSync(path.join(out, `_log-${size}.txt`), log);
    const shots = fs.readdirSync(out).filter((f) => f.startsWith(size + '-') && f.endsWith('.png'));
    const m = /\[perf-script\] (.*)/.exec(log);
    if (m) { try { fs.writeFileSync(path.join(out, `metrics-${size}.json`), JSON.stringify(JSON.parse(JSON.parse(m[1])), null, 1)); } catch (e) { fs.writeFileSync(path.join(out, `metrics-${size}.json`), m[1]); } }
    const errs = log.split(/\r?\n/).filter((l) => /\[renderer\].*(error|NaN)/i.test(l));
    console.log(`   exit ${code}, ${shots.length} beelden, metrics ${m ? 'ja' : 'NEE'}, ${errs.length} fouten in de console`);
    for (const e of errs.slice(0, 5)) console.log('   ' + e.slice(0, 160));
    if (!shots.length || /\[timeout\]/.test(log)) failed++;
    fs.rmSync(profDir, { recursive: true, force: true });
  }
} finally {
  if (slot) { try { fs.rmdirSync(slot); } catch (e) { /* weg */ } }
}
console.log('beelden en metrics in', out);
process.exit(failed ? 1 : 0);
