// Writes docs/verhaal/DIALECT-CONCEPT.md: the Gronings drafts of scripts/gronings_spoken_draft.json,
// per story step, next to the line as the game shows it, plus the doubts the drafters flagged.
// Nothing is recorded and nothing is merged here; see scripts/gronings_merge_draft.mjs for that.
//   node scripts/gronings_concept_doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO, 'docs', 'verhaal', 'DIALECT-CONCEPT.md');
const draft = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken_draft.json'), 'utf8'));
const twijfel = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken_draft_twijfel.json'), 'utf8'));
const script = JSON.parse(fs.readFileSync(path.join(REPO, 'game', 'storydata', 'script.json'), 'utf8'));

const FIRST = ['M00', 'M01', 'M02', 'M03']; // het eerste uur: die regels hoort iedereen
const stepOf = (sc) => sc.step || (/^C00\./.test(sc.id) ? 'M00' : sc.id.split('.')[0]);
const cell = (t) => String(t).replace(/\|/g, '\\|').replace(/\s+/g, ' ');

const rows = new Map();
for (const sc of script.scenes) {
  for (const l of sc.lines) {
    if (!l.key || !(l.text in draft)) continue;
    const k = stepOf(sc);
    if (!rows.has(k)) rows.set(k, []);
    rows.get(k).push({ scene: sc.id, speaker: l.voice || l.speaker, nl: l.text, gr: draft[l.text] });
  }
}
const order = [...FIRST.filter((k) => rows.has(k)), ...[...rows.keys()].filter((k) => !FIRST.includes(k))];
const all = [...rows.values()].flat();
const changed = all.filter((r) => r.nl !== r.gr).length;

const out = [];
out.push('# Gronings-concept: de verhaalregels zonder spreektekst');
out.push('');
out.push('Gegenereerd door `node scripts/gronings_concept_doc.mjs` uit `scripts/gronings_spoken_draft.json`; niet met de hand aanpassen.');
out.push('');
out.push(`Voor ${all.length} verhaalregels die nog ingesproken moeten worden bestond geen Groningse spreektekst. Hieronder staat per stap het concept: links de ondertitel zoals het spel hem toont, rechts wat de stem zou inspreken. ${changed} regels zijn omgezet, ${all.length - changed} blijven gelijk aan de ondertitel (korte uitroepen, namen, citaten) — die conventie bestaat al in \`gronings_spoken.json\`.`);
out.push('');
out.push('**Er is nog niets opgenomen en niets samengevoegd.** Dit is een voorstel: lees het na, verbeter wat niet klopt, en pas daarna gaan deze regels mee in een opnameronde. De spelling volgt de bestaande paren in `scripts/gronings_spoken.json`, niet een eigen systeem.');
out.push('');
out.push('Bijwerken: verbeter de rechterkolom in `scripts/gronings_spoken_draft.json` (de sleutel links blijft precies gelijk). Daarna voegt `node scripts/gronings_merge_draft.mjs --write` het geheel samen met de bestaande tabel; zonder `--write` laat dat script alleen zien wat er zou veranderen.');
out.push('');
out.push(`## Eerst deze ${twijfel.length} nakijken`);
out.push('');
out.push('| # | Regel | Waarom |');
out.push('|---|---|---|');
twijfel.forEach((t, i) => out.push(`| ${i + 1} | ${cell(t.text)} | ${cell(t.why)} |`));
out.push('');
for (const k of order) {
  const list = rows.get(k);
  out.push(`## ${k} · ${list.length} regels`);
  out.push('');
  out.push('| Scène | Spreker | Ondertitel (blijft) | Spreektekst (concept) |');
  out.push('|---|---|---|---|');
  for (const r of list) out.push(`| ${r.scene} | ${cell(r.speaker)} | ${cell(r.nl)} | ${cell(r.gr)}${r.nl === r.gr ? ' *(gelijk)*' : ''} |`);
  out.push('');
}
fs.writeFileSync(OUT, out.join('\n'));
console.log(`DIALECT-CONCEPT.md: ${all.length} regels, ${twijfel.length} twijfelgevallen, ${(fs.statSync(OUT).size / 1024).toFixed(0)} kB`);
