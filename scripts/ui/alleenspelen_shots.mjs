// Beelden en controles van het hoofdmenu en 'Alleen spelen' (Opgeslagen spellen met Doorgaan en Nieuw spel), #34 #92 #208:
//   node scripts/ui/alleenspelen_shots.mjs --out=<map> [--sizes=1280x720,1920x1080] [--counts=0,1,8] [--play] [--slot [--wacht=<minuten>]]
// Per grootte en aantal opgeslagen spellen: een Electron-run die het wegwerpprofiel vult, en een run die de beelden maakt
// (scripts/ui/alleenspelen_scenes.js, GDE_MENU_TEST=1). Nooit echte opslag: elk profiel is een eigen map in de temp-map.
// Er mag maar één Electron tegelijk van deze run draaien; met --slot neemt het script zelf een slot (<home>/gde-locks/electron-N).
// GDE_ELECTRON=<pad naar electron.exe>, GDE_GAME_DIR=<gestagede game-map> zoals bij de andere beeldscripts.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const out = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-alleenspelen')));
const sizes = arg('sizes', '1280x720,1920x1080').split(',');
const counts = arg('counts', '0,1,8').split(',').map(Number);
const bin = process.env.GDE_ELECTRON || path.join(root, 'desktop', 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
const waitMin = Number(arg('wacht', 8)) || 8;
const LOCKS = process.env.GDE_LOCKS || `${process.env.USERPROFILE || process.env.HOME || '.'}/gde-locks`;
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lock = null;
if (process.argv.includes('--slot')) {
  for (let i = 0; !lock; i++) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(`${LOCKS}/electron-${n}`); lock = `${LOCKS}/electron-${n}`; break; } catch (e) { /* bezet */ }
    }
    if (!lock) { if (i > waitMin * 15) { console.error('Geen Electron-slot gekregen.'); process.exit(3); } await sleep(4000); }
  }
  console.log('slot', lock);
}
const release = () => { if (lock) { try { fs.rmdirSync(lock); } catch (e) { /* weg */ } lock = null; } };
process.on('exit', release);

const run = async (size, profile, scene, name) => {
  const script = path.join(out, `_scene-${name}.js`);
  fs.writeFileSync(script, `window.__shotsOnly = ${JSON.stringify(scene)};\n` + fs.readFileSync(path.join(root, 'scripts', 'ui', 'alleenspelen_scenes.js'), 'utf8'));
  const png = path.join(out, name + '.png');
  const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=' + size, '--smoke-test=' + png, '--perf-script=' + script];
  const child = spawn(bin, args, { cwd: path.join(root, 'desktop'), env: { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1' }, shell: process.platform === 'win32' });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* kan niet */ }
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const killer = setTimeout(() => {
    log += '\n[timeout]';
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); else child.kill('SIGKILL');
  }, 240000);
  await new Promise((res) => child.on('close', res));
  clearTimeout(killer);
  fs.writeFileSync(path.join(out, `_log-${name}.txt`), log);
  const line = log.split(/\r?\n/).find((l) => l.startsWith('[perf-script]'));
  return { line: line || '(geen uitvoer)', timeout: /\[timeout\]/.test(log) };
};

let failed = 0;
try {
  if (process.argv.includes('--play')) {
    // a real start through Alleen spelen: Doorgaan, Nieuw spel, and Nieuw spel with every place in use; the menu must be gone
    for (const [count, how] of [[0, 'nieuw'], [1, 'doorgaan'], [1, 'nieuw'], [8, 'nieuw']]) {
      const size = sizes[0];
      const profile = `gde-test-alleenspelen-${process.pid}-play${count}${how}`;
      fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
      if (count > 0) await run(size, profile, `seed:${count}`, `play-seed${count}${how}`);
      const r = await run(size, profile, `play:${count}:${how}`, `play-${count}-${how}`);
      console.log(`== play ${count} ${how}: ${r.line}`);
      if (r.timeout || !/menu weg true; start-screen zichtbaar false, saveslots false/.test(r.line)) failed++;
      fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
    }
    sizes.length = 0;
  }
  for (const size of sizes) {
    for (const count of counts) {
      const profile = `gde-test-alleenspelen-${process.pid}-${size}-${count}`;
      const dir = path.join(os.tmpdir(), profile);
      fs.rmSync(dir, { recursive: true, force: true });
      if (count > 0) {
        const r = await run(size, profile, `seed:${count}`, `${size}-seed${count}`);
        console.log(`== ${size} met ${count}: ${r.line.slice(0, 200)}`);
      }
      const r = await run(size, profile, `shots:${count}`, `${size}`.replace(/$/, `-run${count}`));
      // the capture names of the scene are prefixed with the png name by devtools; move them to size-name.png
      for (const f of fs.readdirSync(out)) {
        const m = f.match(new RegExp(`^${size}-run${count}-(.+)\\.png$`));
        if (m) fs.renameSync(path.join(out, f), path.join(out, `${size}-${m[1]}.png`));
      }
      console.log(`== ${size} met ${count}: ${r.line}`);
      if (r.timeout || /PROBLEMEN|geen uitvoer/.test(r.line)) failed++;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
} finally {
  release();
}
console.log('beelden in', out);
process.exit(failed ? 1 : 0);
