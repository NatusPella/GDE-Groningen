// Kaartstijl in beeld (#112): minimap en grote kaart, dag en nacht, op vaste plekken en zoomniveaus, in één
// Electron-instantie per run met wegwerpprofiel. Voor een voor/na-vergelijk geef je twee gestagede games op;
// ze draaien na elkaar in hetzelfde slot, op dezelfde plek en tijd.
//   node scripts/qa/kaartstijl_shots.mjs --game-dir=voor=<map>,na=<map> --out=<map> [--slot] [--spots=stad:Groningen:city,dorp:Winsum] [--zooms=1,3,6] [--settle=<ms>]
// --game-dir: [<label>=]<gestagede game>, kommagescheiden; een map die `GDE_STAGE_OUT=<map> node desktop/build.mjs` maakte
//   (standaard desktop/build/game). Elke run schrijft naar <out>/<label>/.
// ELECTRON_EXE=<pad naar electron.exe> als desktop/node_modules/electron/dist ontbreekt.
// --slot: neemt een Electron-slot volgens $GDE_LOCKS/README.txt (standaard ~/gde-locks) (mkdir electron-1..3) en geeft het vrij.
// Uitvoer per run: shots-ks-<plek>-<dag|nacht>-<mini|kaart-zN>.png, result.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-kaartstijl')));
const RUNS = arg('game-dir', '').split(',').filter(Boolean).map((s, i) => {
  const m = /^([A-Za-z][\w-]*)=(.+)$/.exec(s);
  return m ? { label: m[1], game: path.resolve(m[2]) } : { label: i ? `run${i + 1}` : 'run', game: path.resolve(s) };
});
if (!RUNS.length) RUNS.push({ label: 'run', game: '' });
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const spots = arg('spots', 'stad:Groningen:city,dorp:Winsum').split(',').map((s) => { const [naam, plaats, kind] = s.split(':'); return { naam, plaats, kind }; });
const cfg = { spots, zooms: arg('zooms', '1,3,6').split(',').map(Number), uren: { dag: 13, nacht: 23 }, settle: Number(arg('settle', 6000)), mapSettle: Number(arg('map-settle', 4500)) };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
async function takeSlot() {
  for (let tries = 0; tries < 20; tries++) { // ~20 minuten
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); return; } catch { /* bezet */ }
    }
    await sleep(60000);
  }
  throw new Error('geen Electron-slot gekregen');
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) await takeSlot();

const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
let failed = 0;
for (const run of RUNS) {
  const out = RUNS.length > 1 || run.label !== 'run' ? path.join(OUT, run.label) : OUT;
  fs.mkdirSync(out, { recursive: true });
  const profile = `gde-test-ks-${process.pid}-${run.label}`;
  const script = path.join(out, '_page.js');
  fs.writeFileSync(script, `window.__ksCfg = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'kaartstijl_shots.page.js'), 'utf8'));
  const env = { ...process.env, GDE_TEST_PROFILE: profile };
  if (run.game) env.GDE_GAME_DIR = run.game;
  delete env.ELECTRON_RUN_AS_NODE;
  let stdout = '', stderr = '';
  const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  const killer = setTimeout(() => child.kill('SIGKILL'), 30 * 60 * 1000);
  const code = await new Promise((res) => child.on('close', res));
  clearTimeout(killer);
  fs.writeFileSync(path.join(out, 'run.log'), `${stdout}\n${stderr}`);
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  let res = {};
  for (const l of stdout.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(res, null, 1));
  const nan = stdout.split(/\r?\n/).filter((l) => /Computed radius is NaN/.test(l)).length;
  const fouten = `${stdout}\n${stderr}`.split(/\r?\n/).filter((l) => /\[ks-error\]|Uncaught|TypeError|ReferenceError/.test(l));
  const shots = fs.readdirSync(out).filter((f) => /^shots-ks-.*\.png$/.test(f)).length;
  console.log(`${run.label}: exit ${code}, screenshots ${shots}/${spots.length * 2 * (cfg.zooms.length + 1)}, NaN-regels ${nan}, paginafouten ${fouten.length}`);
  for (const f of fouten.slice(0, 10)) console.log('  ' + f.slice(0, 200));
  if (code !== 0 || !shots) failed++;
}
release();
console.log(`uitvoer: ${OUT}`);
process.exit(failed ? 1 : 0);
