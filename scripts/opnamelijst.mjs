// Schrijft docs/verhaal/OPNAMELIJST.md: elke verhaalregel (game/storydata/script.json) zonder opname, per stap en scène,
// met de stem waaronder hij opgenomen moet worden. Een regel zonder opname is `textOnly`: het spel toont hem als
// ondertitel (leestijd, spreker en kleur) en speelt niets. Er worden hier geen opnames gemaakt (geen TTS-aanroepen).
//   node scripts/opnamelijst.mjs            schrijft het bestand
//   node scripts/opnamelijst.mjs --check    faalt als het bestand achterloopt op script.json (#326)
// De stille appjes (kanaal app-stil) staan er niet op: die zijn bewust stil.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO, 'docs', 'verhaal', 'OPNAMELIJST.md');
const script = JSON.parse(fs.readFileSync(path.join(REPO, 'game', 'storydata', 'script.json'), 'utf8'));

const FIRST = ['M00', 'M01', 'M02', 'M03']; // de eerste speeluren: opening en missie 1 t/m 3 (#326)
const stepOf = (sc) => sc.step || (/^C00\./.test(sc.id) ? 'M00' : sc.id.split('.')[0]);
const cell = (t) => String(t).replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const missing = (sc) => sc.lines.filter((l) => l.textOnly && l.channel !== 'app-stil');

const steps = new Map();
for (const sc of script.scenes) {
  const m = missing(sc);
  if (!m.length) continue;
  const k = stepOf(sc);
  if (!steps.has(k)) steps.set(k, []);
  steps.get(k).push({ sc, m });
}
const order = [...FIRST.filter((k) => steps.has(k)), ...[...steps.keys()].filter((k) => !FIRST.includes(k))];

const total = [...steps.values()].flat().reduce((a, x) => a + x.m.length, 0);
const first = FIRST.flatMap((k) => steps.get(k) || []).reduce((a, x) => a + x.m.length, 0);
const all = script.scenes.flatMap((s) => s.lines).filter((l) => l.channel !== 'app-stil');

const out = [];
out.push('# Opnamelijst: verhaalregels zonder stem');
out.push('');
out.push('Gegenereerd door `node scripts/opnamelijst.mjs` uit `game/storydata/script.json`; niet met de hand aanpassen.');
out.push('');
out.push(`Van de ${all.length} gesproken verhaalregels (zonder de bewust stille appjes) hebben er ${all.length - total} een opname en ${total} nog niet. Een regel zonder opname wordt als ondertitel getoond (spreker, kleur, leestijd) en er klinkt niets: het gesprek wacht niet op geluid. Een speler hoort dat als "stukken zonder voiceover" (#326).`);
out.push('');
out.push('Een regel krijgt een opname door hem op te nemen onder de stem uit de kolom **Stem**, met de tekst letterlijk zoals hij hier staat (het spel zoekt de opname op "<stem>|<tekst>"), en hem in het manifest van `audio/voicelines/story` of `lines` te zetten. Daarna zet `node scripts/build_story_data.mjs` de vlag `textOnly` uit. Een andere hoofdletter, punt of een "…" vooraan telt als een andere tekst, behalve die laatste: een opname met "…" vooraan wordt ook onder de tekst zonder gevonden.');
out.push('');
out.push(`Eerst de opening en missie 1 t/m 3 (${first} regels): die ziet iedere speler in het eerste uur.`);
out.push('');
for (const k of order) {
  const list = steps.get(k);
  const n = list.reduce((a, x) => a + x.m.length, 0);
  out.push(`## ${k}${k === 'M00' ? ' (opening)' : ''} · ${n} regels`);
  out.push('');
  for (const { sc, m } of list) {
    const voiced = sc.lines.filter((l) => !l.textOnly && l.channel !== 'app-stil').length;
    out.push(`### ${sc.id} ${sc.title} (${sc.kind}; ${m.length} zonder stem, ${voiced} met)`);
    out.push('');
    out.push('| Stem | Regel | Kanaal | Toon |');
    out.push('|---|---|---|---|');
    for (const l of m) out.push(`| ${cell(l.voice || l.speaker)} | ${cell(l.text)} | ${l.channel || ''} | ${cell([l.tag, l.manner].filter(Boolean).join(', '))} |`);
    out.push('');
  }
}
const text = out.join('\n').replace(/\n+$/, '\n');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== text) { console.log('docs/verhaal/OPNAMELIJST.md loopt achter: draai node scripts/opnamelijst.mjs'); process.exit(1); }
  console.log('OPNAMELIJST.md is bij');
} else {
  fs.writeFileSync(OUT, text);
  console.log(`OPNAMELIJST.md: ${total} regels zonder stem, waarvan ${first} in de opening en M01-M03`);
}
