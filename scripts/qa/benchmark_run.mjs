// De échte benchmark in Electron (#159): een page-script start hem vanaf het titelscherm met hetzelfde event als de knop (gde-benchmark,
// de route van de speler: BENCH_ROUTE), alleen in een testrun met GDE_MENU_TEST; een speler start hem zelf. Het page-script leest de kaart.
//   node scripts/qa/benchmark_run.mjs [--modus=kaart|annuleer|annuleer-pad|vergelijk] [--out=<map>] [--max=900]
//   kaart:    een volledige run, de kaart met echte cijfers wordt vastgelegd (screenshot + tekst + knoppen)
//   annuleer: na 20 s een Escape; de overlay hoort weg te zijn en er hoort geen kaart te komen
//   annuleer-pad: hetzelfde met knop B van een nagebootste controller (--knop=9: Start; #379)
//   --heapprof=<ms>: de levende objecten aan het eind van die tijd per aanroepplek (HeapProfiler, desktop/devtools.js), naar de log
//   --heap [--gc]: legt de JS-heap vast (elke 10 s; met --gc ook na een gedwongen GC, #379)
//   vergelijk: een run, daarna "Nog een keer": de tweede kaart hoort de vorige run te noemen
// Eén Electron (slot uit gde-locks, wegwerpprofiel, BelowNormal). GDE_GAME_DIR=<map>\game en ELECTRON_EXE als de worktree geen build heeft.
// Uitvoer: <out>/result.json, run.log (met de [trailer]-regels per shot), shots-*.png.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MODUS = arg('modus', 'kaart');
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), `gde-benchmark-${MODUS}`)));
const MAX = Number(arg('max', 900));
const LOCKS = process.env.GDE_LOCKS || `${process.env.USERPROFILE || process.env.HOME || '.'}/gde-locks`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
if (fs.existsSync(LOCKS) && !process.argv.includes('--geen-slot')) {
  for (;;) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (slot) break;
    await sleep(4000);
  }
}

const profile = `gde-test-bm-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__bm = ${JSON.stringify({ modus: MODUS, maxS: MAX, knop: Number(arg('knop', 1)), heap: process.argv.includes('--heap'), heapprof: Number(arg('heapprof', 0)), gc: process.argv.includes('--gc') })};\n` + fs.readFileSync(path.join(HERE, 'benchmark_run.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
// GDE_MENU_TEST: het spel blijft op het titelscherm; de pagina start de benchmark daar zoals de knop dat doet (event gde-benchmark, de route 'bench').
// --dev-vlag: `--benchmark` zou de lange trailerroute ('vol') draaien, niet de route van de speler.
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
let out = '';
try {
  const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, ...(process.argv.includes('--gc') ? ['--js-flags=--expose-gc'] : [])], { cwd: path.join(ROOT, 'desktop'), env });
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
const shots = lines.filter((l) => l.startsWith('[trailer] shot '));
console.log(res ? res.slice(0, 1500) : 'geen [perf-script]-resultaat');
console.log(`[trailer]-regels met fps per shot: ${shots.length}`);
console.log('uitvoer:', OUT);
process.exit(res ? 0 : 1);
