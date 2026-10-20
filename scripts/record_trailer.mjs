// Neemt de trailers lokaal op via de opnamemodus van de desktop-app
// (desktop/trailervideo.js): vaste stap van 1/60 s, geen cursor, elk beeld
// rechtstreeks naar ffmpeg, met muziek en stemmen meegemixt. Schrijft alleen
// bestanden in een map buiten de repo; uploadt niets (docs/youtube/pakket.md).
//
//   node scripts/record_trailer.mjs                        toont wat er zou draaien (droog)
//   node scripts/record_trailer.mjs --run                  teaser en hoofd, 1080p en 4K
//   node scripts/record_trailer.mjs --run --cut=gameplay,verhaal --res=1080p
//   node scripts/record_trailer.mjs --out=D:/opnames --run
//   node scripts/record_trailer.mjs --run --slot           wacht op een Electron-slot (gde-locks)
//
// Cuts: teaser, hoofd (trailerplan.js), gameplay, verhaal (Steam-cuts, CUT_ORDER
// in trailer.js), kort, vol. Eén Electron-instantie tegelijk (AGENTS.md): de
// opnames lopen na elkaar. Eerst `cd desktop && npm run stage`, of wijs naar een
// recente staged build met --game-dir=<map> (of GDE_GAME_DIR) en een Electron met
// ELECTRON_EXE=<pad> als desktop/node_modules ontbreekt.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const run = args.includes('--run');
const useSlot = args.includes('--slot');

const CUTS = ['teaser', 'hoofd', 'gameplay', 'verhaal', 'kort', 'vol'];
const RES = { '1080p': '1920x1080', '4k': '3840x2160' };
const cuts = opt('cut', 'teaser,hoofd').split(',').map((c) => c.trim()).filter(Boolean);
const ress = opt('res', '1080p,4k').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
for (const c of cuts) if (!CUTS.includes(c)) { console.error(`onbekende cut: ${c} (${CUTS.join(', ')})`); process.exit(1); }
for (const r of ress) if (!RES[r]) { console.error(`onbekende resolutie: ${r} (1080p of 4k)`); process.exit(1); }

// scratchmap: nooit in de repo (trailervideo.js weigert dat ook)
const out = path.resolve(opt('out', path.join(os.tmpdir(), 'gde-trailer-opnames')));
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel)) { console.error(`kies een map buiten de repo (${ROOT})`); process.exit(1); }

const desktop = path.join(ROOT, 'desktop');
const electron = process.env.ELECTRON_EXE || path.join(desktop, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const gameDir = opt('game-dir', process.env.GDE_GAME_DIR || '');
const jobs = [];
for (const cut of cuts) for (const res of ress) {
  const file = path.join(out, `GDE-Groningen-${cut}-${res}.mp4`);
  // --trailer-video past --stil en --frames al toe; wegwerpprofiel via GDE_TEST_PROFILE
  jobs.push({ file, argv: ['.', `--trailer=${RES[res]}`, `--trailer-cut=${cut}`, `--trailer-video=${file}`] });
}

console.log(`scratchmap: ${out}`);
if (gameDir) console.log(`game-dir: ${gameDir}`);
for (const j of jobs) console.log(`  ${path.basename(j.file)}: electron ${j.argv.join(' ')}`);
if (!run) { console.log('\ndroog: niets gedraaid. Voeg --run toe om op te nemen.'); process.exit(0); }
if (!fs.existsSync(electron)) { console.error('electron ontbreekt: cd desktop && npm install && npm run stage (of ELECTRON_EXE=<pad>)'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

// Slotprotocol van de testrondes (~/gde-locks/README.txt): max. drie Electrons tegelijk.
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
let slot = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function takeSlot() {
  if (!useSlot || !fs.existsSync(LOCKS)) return;
  for (let poging = 0; !slot; poging++) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (!slot) { if (poging % 30 === 0) console.log('wacht op een Electron-slot...'); await sleep(8000 + Math.floor(Math.random() * 4000)); }
  }
  console.log(`slot ${slot}`);
}
const freeSlot = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('SIGINT', () => { freeSlot(); process.exit(130); });

const env = { ...process.env, GDE_TEST_PROFILE: process.env.GDE_TEST_PROFILE || 'gde-trailer' };
if (gameDir) env.GDE_GAME_DIR = path.resolve(gameDir);
for (const j of jobs) {
  console.log(`\n== ${path.basename(j.file)} ==`);
  await takeSlot();
  const code = await new Promise((resolve) => {
    const p = spawn(electron, j.argv, { cwd: desktop, stdio: 'inherit', env });
    try { os.setPriority(p.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten: normale prioriteit */ }
    p.on('close', resolve);
    p.on('error', () => resolve(1));
  });
  freeSlot();
  if (code !== 0) { console.error(`mislukt (exit ${code}); gestopt`); process.exit(code || 1); }
}
console.log(`\nklaar: ${out}`);
