// Schaapontvoering, vee in de stad en bussen op de straten uit de meldingen in beeld en in cijfers (#333, #330, #322), in één
// Electron-instantie met wegwerpprofiel.
//   node scripts/qa/ontvoering_beeld.mjs [--out=<map>] [--game-dir=<gestagede game/>] [--settle=<ms>] [--stad-ms=60000] [--straten-ms=60000] [--slot]
// Beelden: ov-voor, ov-aankomst, ov-straal, ov-optillen-mid, ov-optillen-eind, ov-weg, ov-na (de schaapontvoering), stad-<plek>,
// straat-<straat>; de tellingen staan in result.json. ELECTRON_EXE=<pad> als desktop/node_modules/electron ontbreekt.
// --slot neemt een Electron-slot volgens <GDE_LOCKS>/README.txt. Het spel wordt vooraf gestaged (cd desktop && npm run stage) of komt
// uit --game-dir (GDE_GAME_DIR); wie dat doet met andere JS dan de worktree, zegt welke build er is gebruikt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-ontvoering-beeld')));
const GAME = arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game'));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const idxFile = ['index-provincie.json', 'index.json'].map((f) => path.join(GAME, 'world', f)).find((f) => fs.existsSync(f));
if (!idxFile) { console.error(`geen wereldindex in ${GAME}/world (stage het spel of geef --game-dir=)`); process.exit(2); }
const index = JSON.parse(fs.readFileSync(idxFile, 'utf8')).global;
const winsum = index.places.find((x) => x.name === 'Winsum');
const cfg = {
  plek: { x: Math.round((winsum.x + 1800) * 10) / 10, y: Math.round((winsum.y + 1200) * 10) / 10 },
  settle: Number(arg('settle', 9000)),
  stadMs: Number(arg('stad-ms', 60000)),
  stratenMs: Number(arg('straten-ms', 60000)),
  stad: [{ naam: 'noorderplantsoen', x: 127.9, y: -706.43 }, { naam: 'stadspark', x: -1229.12, y: 1530.22 }],
  straten: [{ naam: 'wilgenpad', x: -1121, y: -1103 }, { naam: 'oude-kijk-in-t-jatstraat', x: -270, y: -116 }, { naam: 'oude-boteringestraat', x: -38, y: 12 }],
};
if (process.argv.includes('--list')) { console.log(JSON.stringify(cfg)); process.exit(0); }

let slot = null;
async function takeSlot() {
  for (let tries = 0; tries < 120; tries++) {
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

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-ov-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__ovCfg = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'ontvoering_beeld.page.js'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'cfg.json'), JSON.stringify(cfg, null, 1));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: GAME };
delete env.ELECTRON_RUN_AS_NODE;
let stdout = '', stderr = '';
const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
child.stdout.on('data', (d) => { stdout += d; });
child.stderr.on('data', (d) => { stderr += d; });
const killer = setTimeout(() => child.kill('SIGKILL'), 45 * 60 * 1000);
const code = await new Promise((res) => child.on('close', res));
clearTimeout(killer);
fs.writeFileSync(path.join(OUT, 'run.log'), `${stdout}\n${stderr}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
release();
let res = {};
for (const l of `${stdout}\n${stderr}`.split(/\r?\n/)) { const m = l.match(/\[ov-result\] (.*)$/) || l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
const nan = stdout.split(/\r?\n/).filter((l) => /Computed radius is NaN/.test(l)).length;
const shots = fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f));
console.log(`exit ${code}, beelden ${shots.length}, NaN-regels ${nan}`);
console.log(JSON.stringify(res));
console.log(`uitvoer: ${OUT}`);
process.exit(code === 0 && shots.length ? 0 : 1);
