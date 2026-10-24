// Draait een clipscript (scripts/trailer/shots/<naam>.page.js) in het echte spel met een vaste tijdstap en
// schrijft de opgenomen clips als <out>/<clip>.mp4 (desktop/clipvideo.js). Er wordt niets geüpload.
//
//   node scripts/trailer/run.mjs --shots=gameplay-a --out=<home>/gde-trailer-work/clips
//        [--game-dir=<gestagede game>] [--electron=<electron.exe>] [--no-slot] [--seed=7]
//        [--preset=quality:hoog,...] [--size=1920x1080] [--only=<clip,clip>] [--repl]
//
// --repl houdt de app open en voert scripts uit die scripts/trailer/repl_send.mjs naar <out>/_repl schrijft.
// Het scriptbestand krijgt lib/clip.page.js ervoor en moet `async function main(clip)` definiëren (of de
// laatste regel `return ...` doen). Eén Electron per run; het slot uit ~/gde-locks wordt altijd vrijgegeven.
// De wereld komt uit een gestagede game (GDE_GAME_DIR, zie docs/TRAILER-CONTROLE.md "Opnieuw maken").
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { takeSlot, freeSlot } from './lib/slot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => args.includes(`--${k}`);

const repl = flag('repl');
const shots = opt('shots', repl ? 'repl' : '');
if (!shots) { console.error('geef --shots=<naam> (scripts/trailer/shots/<naam>.page.js)'); process.exit(1); }
const out = path.resolve(opt('out', path.join(os.tmpdir(), 'gde-trailer-clips')));
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel)) { console.error('kies een uitvoermap buiten de repo'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const PRESET = opt('preset', 'quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false');
const gameDir = path.resolve(opt('game-dir', process.env.GDE_GAME_DIR || ''));
if (!gameDir || !fs.existsSync(path.join(gameDir, 'index.html'))) { console.error('geef --game-dir=<gestagede game> (of GDE_GAME_DIR); stage met GDE_STAGE_OUT=<map>/game node desktop/build.mjs'); process.exit(1); }
const electron = opt('electron', process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe'));
if (!fs.existsSync(electron)) { console.error(`electron ontbreekt: ${electron} (--electron= of ELECTRON_EXE)`); process.exit(1); }

// het paginascript: bibliotheek + clipscript + aanroep van main
const lib = fs.readFileSync(path.join(HERE, 'lib', 'clip.page.js'), 'utf8');
const body = shots.split(',').map((s) => fs.readFileSync(path.join(HERE, 'shots', `${s}.page.js`), 'utf8')).join('\n');
const script = path.join(out, `_page-${shots.replace(/[^\w,-]/g, '_')}.js`);
fs.writeFileSync(script, `${lib}\n${body}\nreturn await runAll(${JSON.stringify(shots.split(','))}, ${JSON.stringify(opt('only', ''))});\n`);

const profile = `gde-trailer-${process.pid}`;
const argv = ['.', `--smoke-test=${path.join(out, '_smoke.png')}`, `--perf-script=${script}`, `--autoplay=${opt('seed', '7')}`, '--stil', `--clip=${out}`,
  `--clip-size=${opt('size', '1920x1080')}`, `--preset=${PRESET}`, ...(repl ? ['--clip-repl'] : [])];
const env = { ...process.env, GDE_GAME_DIR: gameDir, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '' };
delete env.GDE_MENU_TEST;
if (!process.env.GDE_FFMPEG) {
  const w = process.platform === 'win32' ? `${process.env.LOCALAPPDATA || ''}\\Microsoft\\WinGet\\Links\\ffmpeg.exe` : '';
  if (w && fs.existsSync(w)) env.GDE_FFMPEG = w;
}

let slot = null;
let child = null;
const cleanup = () => { freeSlot(slot); slot = null; };
process.on('SIGINT', () => { if (child) child.kill(); cleanup(); process.exit(130); });
process.on('exit', cleanup);
if (!flag('no-slot')) { slot = await takeSlot('trailer'); console.log(`slot: ${slot}`); }
try {
  const t0 = Date.now();
  const code = await new Promise((resolve) => {
    child = spawn(electron, argv, { cwd: path.join(ROOT, 'desktop'), stdio: 'inherit', env });
    try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
    child.on('close', resolve);
    child.on('error', () => resolve(1));
  });
  console.log(`electron klaar (exit ${code}) na ${((Date.now() - t0) / 60000).toFixed(1)} min; clips in ${out}`);
  process.exitCode = code || 0;
} finally {
  cleanup();
}
