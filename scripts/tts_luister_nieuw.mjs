// Luisterpagina voor de eigenaar: alle regels uit scripts/tts_lines.json waarvan nu een clip bestaat, per personage
// gegroepeerd, met de tekst en een speler. Eén webpagina, geen andere bestanden nodig.
//   node scripts/tts_luister_nieuw.mjs            schrijft docs/TTS-LUISTER-NIEUW.html (relatieve paden, in git)
//                                                 en een --abs-variant in de tijdelijke map (file://, buiten git)
//   --alleen-nieuw=<git-ref>                      alleen clips die sinds die ref zijn toegevoegd (bijv. origin/main)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VL = path.join(ROOT, 'game', 'audio', 'voicelines');
const jobsArg = process.argv.find((a) => a.startsWith('--jobs='));
const jobs = JSON.parse(fs.readFileSync(path.join(ROOT, jobsArg ? jobsArg.split('=')[1] : 'scripts/tts_lines.json'), 'utf8'));
const refArg = process.argv.find((a) => a.startsWith('--alleen-nieuw='));
let nieuw = null;
if (refArg) {
  const ref = refArg.split('=')[1];
  const uit = execFileSync('git', ['diff', '--name-only', '--diff-filter=A', ref, '--', 'game/audio/voicelines'], { cwd: ROOT, encoding: 'utf8' });
  nieuw = new Set(uit.split('\n').map((s) => s.trim()).filter(Boolean));
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const groepen = new Map();
for (const j of jobs) {
  const rel = `game/audio/voicelines/${j.out}/${j.file}`;
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  if (nieuw && !nieuw.has(rel)) continue;
  if (!groepen.has(j.speaker)) groepen.set(j.speaker, []);
  groepen.get(j.speaker).push({ ...j, rel });
}
function bouw(prefix) {
  const delen = [];
  let totaal = 0;
  for (const [spr, regels] of [...groepen].sort((a, b) => b[1].length - a[1].length)) {
    totaal += regels.length;
    delen.push(`<h2>${esc(spr)} <small>(${regels.length} regels, stem ${esc(regels[0].voice)})</small></h2>`);
    for (const r of regels) {
      delen.push(`<div class="r"><div class="t">${esc(r.text)}</div><audio controls preload="none" src="${esc(prefix + r.rel)}"></audio></div>`);
    }
  }
  return `<!doctype html><html lang="nl"><meta charset="utf-8"><title>Nieuwe stemregels: luisterlijst</title>
<style>body{font:15px system-ui;max-width:900px;margin:1rem auto;padding:0 1rem}h2{margin-top:2rem;border-bottom:1px solid #ccc}small{font-weight:normal;color:#666}
.r{display:flex;gap:1rem;align-items:center;padding:.3rem 0;border-bottom:1px solid #eee}.t{flex:1}audio{height:32px;width:300px}</style>
<h1>Nieuwe stemregels: luisterlijst (${totaal} clips)</h1>
<p>Per personage de regel zoals de speler hem leest en de opgenomen clip. Meld regels die fout klinken (ruis, pop, verkeerde uitspraak, Fries of Gronings).</p>
${delen.join('\n')}</html>`;
}
fs.writeFileSync(path.join(ROOT, 'docs', 'TTS-LUISTER-NIEUW.html'), bouw('../'));
const abs = path.join(os.tmpdir(), 'TTS-LUISTER-NIEUW-abs.html');
fs.writeFileSync(abs, bouw(pathToFileURL(ROOT + path.sep).href));
console.log(`${[...groepen.values()].reduce((a, b) => a + b.length, 0)} clips, ${groepen.size} personages; abs-variant: ${abs}`);
