// Voor/na-beelden van hemel, wolken en water (AAA-wereld 23-11) met de echte code uit game/js, in een wegwerpprofiel,
// zonder netwerk, onder een Electron-slot uit gde-locks (wacht beleefd tot er een vrij is).
//   node scripts/weer/sky_shots.mjs --voor=<map met de oude game/js> --out=<map> [--only=helder-13,onweer-15]
// De "voor"-map: git archive origin/main game/js | tar -x -C <map>. Zonder --voor komt alleen "na" (deze werkboom).
// Omgeving: ELECTRON_EXE en GDE_VENDOR_DIR (de vendor-map met npm/three@0.160.0) als ze niet in deze werkboom staan.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from "node:os";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, 'sky-shots')));
const VOOR = arg('voor');
const ONLY = arg('only', '');
const LOCKS = process.env.GDE_LOCKS || `${process.env.USERPROFILE || process.env.HOME || '.'}/gde-locks`;
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const vendor = process.env.GDE_VENDOR_DIR || path.join(ROOT, 'desktop', 'vendor-cache');
if (!fs.existsSync(electron)) { console.error(`geen Electron op ${electron} (ELECTRON_EXE)`); process.exit(2); }
if (!fs.existsSync(path.join(vendor, 'npm', 'three@0.160.0'))) { console.error(`geen vendor-map op ${vendor} (GDE_VENDOR_DIR)`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
async function takeSlot() {
  for (let ronde = 0; ronde < 1500; ronde++) {
    for (const n of [1, 2, 3]) {
      const dir = path.join(LOCKS, 'electron-' + n);
      try { fs.mkdirSync(LOCKS, { recursive: true }); fs.mkdirSync(dir); slot = dir; return; } catch { /* bezet */ }
    }
    console.error('geen Electron-slot vrij, wacht 8 s');
    await sleep(8000);
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
    const args = [...(process.env.GDE_NO_SANDBOX ? ['--no-sandbox'] : []), path.join(ROOT, 'scripts', 'depth_shots.main.cjs'), `--page=${path.join(HERE, 'sky_shots.page.html')}`, `--game=${game}`, `--vendor=${vendor}`, `--out=${OUT}`, `--tag=${tag}`, `--only=${ONLY}`, `--tmp=${process.env.GDE_TMP || os.tmpdir()}`];
    const r = spawnSync(electron, args, { stdio: 'inherit', timeout: 300000 });
    if (r.status !== 0) { console.error(`${tag}: Electron eindigde met ${r.status}`); bad++; }
  }
} finally { release(); }
process.exit(bad ? 1 : 0);
