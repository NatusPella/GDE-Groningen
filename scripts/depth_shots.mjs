// Vergelijkingsbeelden voor de diepteproblemen (#382): bus-zijbord, bus-voorbord, straatnaambord en winkelbord op
// een gevel en twee platen op dezelfde hoogte, op 5, 20 en 60 m (en de platen op 140 en 300 m), met de echte
// bus- en bordcode uit game/js, met de camera van het spel (near 0,5, far 1650, 24-bit diepte). Eén Electron in een
// wegwerpprofiel, geen netwerk, een slot uit gde-locks.
//   node scripts/depth_shots.mjs --voor=<map met de oude game/js> --out=<map> [--only=bord-zij,bord-voor,gevel,platen]
// De "voor"-map: git archive <commit> game/js | tar -x -C <map>. Zonder --voor komt alleen "na" (deze werkboom).
// Eenmalig: de vendor-map van three.js (cd desktop && npm run stage) en desktop/node_modules/electron
// (of ELECTRON_EXE en GDE_VENDOR_DIR voor die van een andere werkboom).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, 'depth-shots')));
const VOOR = arg('voor');
const ONLY = arg('only', '');
const LOCKS = process.env.GDE_LOCKS || 'C:/Users/abuis/gde-locks';
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const vendor = process.env.GDE_VENDOR_DIR || path.join(ROOT, 'desktop', 'vendor-cache');
if (!fs.existsSync(electron)) { console.error(`geen Electron op ${electron} (ELECTRON_EXE)`); process.exit(2); }
if (!fs.existsSync(path.join(vendor, 'npm', 'three@0.160.0'))) { console.error(`geen vendor-map op ${vendor} (GDE_VENDOR_DIR)`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
async function takeSlot() {
  for (let ronde = 0; ronde < 120; ronde++) {
    for (const n of [1, 2, 3]) {
      const dir = path.join(LOCKS, 'electron-' + n);
      try { fs.mkdirSync(dir); slot = dir; return; } catch { /* bezet */ }
    }
    console.error('geen Electron-slot vrij, wacht 60 s');
    await sleep(60000);
  }
  console.error('geen slot gekregen'); process.exit(3);
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });

await takeSlot();
let bad = 0;
try {
  const runs = [];
  if (VOOR) runs.push(['voor', path.join(path.resolve(VOOR), 'game')]);
  runs.push(['na', path.join(ROOT, 'game')]);
  for (const [tag, game] of runs) {
    const args = [path.join(HERE, 'depth_shots.main.cjs'), `--game=${game}`, `--vendor=${vendor}`, `--out=${OUT}`, `--tag=${tag}`, `--only=${ONLY}`];
    const r = spawnSync(electron, args, { stdio: 'inherit', timeout: 300000 });
    if (r.status !== 0) { console.error(`${tag}: Electron eindigde met ${r.status}`); bad++; }
  }
} finally { release(); }
process.exit(bad ? 1 : 0);
