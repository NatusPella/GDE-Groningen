// Meet de gesproken en gelezen tijd per akte uit game/storydata/script.json (ontwerpraming, geen speelmeting): voor een ingesproken
// regel de duur uit de stem-manifesten, voor een regel zonder opname de leestijd (storytext.js readingTime). Geeft ook het aantal
// overgangsscènes en nieuwe scènes. Gameplay-minuten komen uit de ontwerpraming van docs/VERHAAL-SYNOPSIS-21-11.md (per akte).
//   node scripts/verhaal_tempo.mjs           tabel
//   node scripts/verhaal_tempo.mjs --json    ruwe cijfers
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const manifests = {};
for (const m of ['story', 'lines', 'banter']) {
  const p = new URL(`game/audio/voicelines/${m}/manifest.json`, root);
  manifests[m] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}
const readingTime = (t) => Math.max(2.2, Math.min(8, 1.3 + String(t || '').length * 0.058));
const dur = (l) => {
  if (l.channel === 'app-stil') return 0;
  const key = (l.voice || l.speaker) + '|' + l.text;
  const v = l.rec && manifests[l.rec] && manifests[l.rec][key];
  return (v && v.dur ? v.dur : readingTime(l.text)) + 0.3;
};
// ontwerpraming gameplay per akte (minuten), docs/VERHAAL-SYNOPSIS-21-11.md: "ca. 62 min" enzovoort
const GAMEPLAY = { 1: 62, 2: 55, 3: 55, 4: 58, 5: 47, 6: 25 };
const NAMES = { 1: 'Akte 1 Moi, Grunn', 2: 'Akte 2 Het Noorden is groot', 3: 'Akte 3 Aan de Eems', 4: 'Akte 4 Zuidwaarts', 5: 'Akte 5 Ontzet', 6: 'Deel 4 Nazomer' };

const out = {};
for (const sc of data.scenes) {
  const a = out[sc.act] || (out[sc.act] = { scenes: 0, lines: 0, sec: 0, bridges: 0, bridgeSec: 0, textOnly: 0, banter: 0 });
  const s = sc.lines.reduce((t, l) => t + dur(l), 0);
  a.scenes++;
  a.lines += sc.lines.filter((l) => l.channel !== 'app-stil').length;
  a.textOnly += sc.lines.filter((l) => l.textOnly && l.channel !== 'app-stil').length;
  if (sc.kind === 'banter') { a.banter += s; continue; }
  a.sec += s;
  if (sc.kind === 'bridge') { a.bridges++; a.bridgeSec += s; }
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
const min = (s) => (s / 60).toFixed(1);
let tg = 0, tt = 0;
console.log('| Deel | Scènes | Regels | Verhaaltekst (min) | Overgangsscènes | Gameplay (min, raming) | Totaal (min) |');
console.log('|---|---|---|---|---|---|---|');
for (const k of Object.keys(out).sort()) {
  const a = out[k];
  const g = GAMEPLAY[k] || 0;
  tg += g; tt += a.sec / 60;
  console.log(`| ${NAMES[k] || k} | ${a.scenes} | ${a.lines} | ${min(a.sec)} | ${a.bridges} (${min(a.bridgeSec)} min) | ${g} | ${(g + a.sec / 60 * 0.4).toFixed(0)} |`);
}
console.log(`| Totaal | | | ${tt.toFixed(1)} | | ${tg} | ${(tg + tt * 0.4).toFixed(0)} |`);
console.log('\nHet totaal telt gameplay (ontwerpraming) plus 40% van de verhaaltekst (de rest valt samen met gameplay: autopraat en briefings tijdens het rijden).');
