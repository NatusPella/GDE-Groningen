// Neemt de teaser (40 s) en de hoofdtrailer (90 s) lokaal op via de opnamemodus
// van de desktop-app (desktop/trailervideo.js): vaste stap van 1/60 s, geen HUD
// en geen cursor, elk beeld rechtstreeks naar ffmpeg. Schrijft alleen bestanden
// in een scratchmap buiten de repo; uploadt niets (docs/youtube/trailers.md).
//
//   node scripts/record_trailer.mjs                        toont wat er zou draaien (droog)
//   node scripts/record_trailer.mjs --run                  teaser en hoofd, 1080p en 4K
//   node scripts/record_trailer.mjs --run --cut=teaser --res=1080p
//   node scripts/record_trailer.mjs --out=D:/opnames --run
//
// Eén Electron-instantie tegelijk (AGENTS.md): de opnames lopen na elkaar.
// Eerst `cd desktop && npm run stage` (het script doet dat niet zelf).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const run = args.includes('--run');

const CUTS = { teaser: 'teaser', hoofd: 'hoofd' };
const RES = { '1080p': '1920x1080', '4k': '3840x2160' };
const cuts = opt('cut', 'teaser,hoofd').split(',').map((c) => c.trim()).filter(Boolean);
const ress = opt('res', '1080p,4k').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
for (const c of cuts) if (!CUTS[c]) { console.error(`onbekende cut: ${c} (teaser of hoofd)`); process.exit(1); }
for (const r of ress) if (!RES[r]) { console.error(`onbekende resolutie: ${r} (1080p of 4k)`); process.exit(1); }

// scratchmap: nooit in de repo (trailervideo.js weigert dat ook)
const out = path.resolve(opt('out', path.join(os.tmpdir(), 'gde-trailer-opnames')));
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel)) { console.error(`kies een map buiten de repo (${ROOT})`); process.exit(1); }

const desktop = path.join(ROOT, 'desktop');
const electron = path.join(desktop, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
const jobs = [];
for (const cut of cuts) for (const res of ress) {
  const file = path.join(out, `GDE-Groningen-${cut}-${res}.mp4`);
  // --trailer-video past --stil en --frames al toe; wegwerpprofiel via GDE_TEST_PROFILE
  jobs.push({ file, argv: ['.', `--trailer=${RES[res]}`, `--trailer-cut=${CUTS[cut]}`, `--trailer-video=${file}`] });
}

console.log(`scratchmap: ${out}`);
for (const j of jobs) console.log(`  ${path.basename(j.file)}: electron ${j.argv.join(' ')}`);
if (!run) { console.log('\ndroog: niets gedraaid. Voeg --run toe om op te nemen.'); process.exit(0); }
if (!fs.existsSync(electron)) { console.error('electron ontbreekt: cd desktop && npm install && npm run stage'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
for (const j of jobs) {
  console.log(`\n== ${path.basename(j.file)} ==`);
  const r = spawnSync(electron, j.argv, { cwd: desktop, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, GDE_TEST_PROFILE: 'gde-trailer' } });
  if (r.status !== 0) { console.error(`mislukt (exit ${r.status}); gestopt`); process.exit(r.status || 1); }
}
console.log(`\nklaar: ${out}`);
