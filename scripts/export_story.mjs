#!/usr/bin/env node
// Builds the review material for other language models from docs/verhaal/nieuw/:
//   docs/verhaal/nieuw/export/10-REGELS-PER-PERSOON.md   all spoken lines per speaker (from the 09 scripts)
//   docs/verhaal/nieuw/export/EXPORT-deel<N>.md          paste-ready parts (prompt + overview + acts + script), each below MAX_CHARS
//   docs/verhaal/nieuw/export/PROMPT-REVIEW.md           the review prompt on its own
//   node scripts/export_story.mjs [--max=90000]
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../docs/verhaal/nieuw/', import.meta.url).pathname;
const out = path.join(root, 'export');
const MAX = Number((process.argv.find((a) => a.startsWith('--max=')) || '--max=90000').slice(6));
fs.mkdirSync(out, { recursive: true });

const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const files = fs.readdirSync(root).filter((f) => f.endsWith('.md')).sort();
const scripts = files.filter((f) => /^09-script-akte\d\.md$/.test(f));

// ---- per speaker -------------------------------------------------------
const LINE = /^([A-ZÄËÏÖÜ][A-ZÄËÏÖÜ0-9 .'’\/&→-]*?(?: \([^)]*\))?): (.+?)(?: \[(BEHOUDEN|NIEUW)\])?\s*$/;
const bySpeaker = new Map();
let scene = '';
let total = 0;
let apps = 0;
for (const f of scripts) {
  for (const raw of read(f).split('\n')) {
    const h = raw.match(/^## \[([^\]]+)\] (.*)$/);
    if (h) { scene = `[${h[1]}] ${h[2]}`; continue; }
    if (raw.startsWith('(regie') || raw.startsWith('>') || raw.startsWith('#')) continue;
    const m = raw.match(LINE);
    if (!m) continue;
    if (m[1].startsWith('APP ')) { apps++; continue; }
    const who = m[1].trim().replace(/\s*\((radio|telefoon)\)$/, '');
    const tag = m[3] || '?';
    if (!bySpeaker.has(who)) bySpeaker.set(who, []);
    bySpeaker.get(who).push({ scene, text: m[2], tag, radio: /\(radio\)/.test(m[1]) });
    total++;
  }
}
const order = [...bySpeaker.entries()].sort((a, b) => b[1].length - a[1].length);
let idx = `# Alle regels per persoon (gegenereerd uit de 09-script-bestanden)\n\nTotaal ${total} regels, ${order.length} sprekers. Gebruik dit om per persoon te toetsen: klinkt het als dezelfde persoon, is de stem consistent, is elke regel kort en speelbaar, mist er context?\n\n| Spreker | Regels | Behouden | Nieuw |\n|---|---|---|---|\n`;
for (const [who, ls] of order) idx += `| ${who} | ${ls.length} | ${ls.filter((l) => l.tag === 'BEHOUDEN').length} | ${ls.filter((l) => l.tag === 'NIEUW').length} |\n`;
for (const [who, ls] of order) {
  idx += `\n## ${who} (${ls.length})\n\n`;
  let last = '';
  for (const l of ls) {
    if (l.scene !== last) { idx += `\n**${l.scene}**\n\n`; last = l.scene; }
    idx += `- ${l.radio ? '(radio) ' : ''}${l.text} \`${l.tag}\`\n`;
  }
}
fs.writeFileSync(path.join(out, '10-REGELS-PER-PERSOON.md'), idx);

// ---- prompt ------------------------------------------------------------
const PROMPT = `# Opdracht: beoordeel en verbeter het script van een Nederlandstalige comedygame

Je bent een ervaren game-scenarist en narrative designer (open-wereld, comedy/misdaad, Nederlands). Hieronder staat het volledige nieuwe verhaal van de game "GDE Groningen – Zomer vol misdaad": een overzicht, de vijf akten met alle missies, en het volledige script met alle regels per persoon. Beoordeel het kritisch en geef concrete verbeteringen. Verzin geen feiten over de game; waar iets niet in de tekst staat, noem je het een AANNAME of stel je me een vraag.

## Harde randvoorwaarden (niet overtreden)
- Alleen Nederlands in alles wat een speler ziet of hoort. Gronings/Fries alleen met zorg en korte regels; "Grunn", nooit "de Grunn".
- Geen echte merken, bedrijven of personen in speltekst; echte plaatsen en gebouwen mogen; parodieën hebben verzonnen namen.
- Altijd zomer. Satire zonder leed; gevoelige onderwerpen alleen met zorg.
- Regels met de tag [BEHOUDEN] zijn al opgenomen als AI-stem: wijzig die alleen als het echt moet, en markeer elke wijziging als [GEWIJZIGD]. Regels met [NIEUW] mag je vrij herschrijven. Elke nieuwe of gewijzigde opname kost geld, dus wees zuinig.
- Context moet duidelijk worden uit wat er gezegd wordt (wie, waar, waarom nu, wat net gebeurde, wat nu), in karakter, niet door tekstkaartjes of voice-over-uitleg. Eén ding per zin; eerst noemen, dan verwijzen; personages noemen elkaar bij naam; het doel wordt hardop gezegd; elke scène knoopt aan bij de vorige; de grap komt na de uitleg.
- Strikte kanaalscheiding: de radio (Rikus) gaat alleen over de wereld en dimt zodra een missie of gesprek begint; autogesprekken gaan over de relatie en de directe situatie; appjes zijn stille tekst; pop-ups zijn alleen knop-instructies.
- Doelgroep en doel: lokaal-Gronings humoristisch en meme-baar (Sikkom-niveau), met een kleine knipoog naar het misdaadgenre; 4+ uur speeltijd in 5 akten door de hele provincie; een romance die in zichtbare stappen groeit (aanraking, oogcontact, flirt, kus, knuffel, openbaring); de dynamiek van Moffel en Piertje (hij eigenwijs en vaak fout, zij vaak gelijk, af en toe wat saai).

## Wat ik van je wil (in deze volgorde)
1. Een korte oordeel (max 15 regels): wat werkt, wat niet. Beoordeel: helderheid van doel en motief, oorzaak en gevolg, tempo en variatie, het dieptepunt en de finale, de romance-boog (te snel, te traag, te klef?), de reistijd door de provincie, en of het verhaal 4+ uur draagt.
2. De 10 grootste problemen, gerangschikt, elk met de scène-id (bijv. [M17]) en een concrete oplossing.
3. Per persoon (Tammo, Tessa, Jelle, Oma Trijntje, Mem, Rikus en de bondgenoten): is de stem consistent met de beschrijving, welke regels klinken uit karakter, te lang, te uitleggerig of flauw? Geef per probleemregel een herschrijving in hetzelfde formaat: \`SPREKER: tekst [GEWIJZIGD of NIEUW]\`, met het scène-id erbij.
4. Mist er context in gesproken regels (wie praat, waarover, waarom nu)? Noem de plekken en schrijf de regel zo dat de context in de tekst zit.
5. Drie alternatieve opties voor het belangrijkste twistmoment of de belangrijkste wending (met voor- en nadelen) als je denkt dat de huidige niet werkt.
6. Een lijst van je aannames en maximaal 8 vragen aan mij (A/B of ja/nee), pas na je antwoord.
Schrijf in het Nederlands, concreet en kort, met kopjes en tabellen waar dat helpt. Wees kritisch: als je denkt dat een keuze verkeerd is, zeg het en leg uit waarom.

---
`;
fs.writeFileSync(path.join(out, 'PROMPT-REVIEW.md'), PROMPT);

// ---- paste-ready parts --------------------------------------------------
const parts = [];
const add = (title, text) => parts.push({ title, text: `\n\n# ===== ${title} =====\n\n${text}` });
add('00-OVERZICHT', read('00-OVERZICHT.md'));
for (const f of files.filter((x) => /^0[1-5]-akte\d\.md$/.test(x))) add(f, read(f));
add('06-zijmissies-en-minigames', read('06-zijmissies-en-minigames.md'));
for (const f of scripts) add(f, read(f));

fs.readdirSync(out).filter((f) => /^EXPORT-deel\d+\.md$/.test(f)).forEach((f) => fs.unlinkSync(path.join(out, f)));
const chunks = [];
let cur = '';
for (const p of parts) {
  if (cur && cur.length + p.text.length > MAX - PROMPT.length) { chunks.push(cur); cur = ''; }
  cur += p.text;
}
if (cur) chunks.push(cur);
chunks.forEach((c, i) => {
  const head = i === 0
    ? PROMPT + `(Dit is deel 1 van ${chunks.length}. Wacht met je beoordeling tot je alle delen hebt; zeg alleen "ontvangen" na deel 1 t/m ${chunks.length - 1}, en geef na het laatste deel je volledige antwoord.)\n`
    : `(Deel ${i + 1} van ${chunks.length}. ${i + 1 < chunks.length ? 'Zeg alleen "ontvangen".' : 'Dit is het laatste deel: geef nu je volledige beoordeling volgens de opdracht uit deel 1.'})\n`;
  fs.writeFileSync(path.join(out, `EXPORT-deel${i + 1}.md`), head + c);
});

const chars = chunks.map((c) => c.length + PROMPT.length);
const nieuw = order.reduce((n, [, ls]) => n + ls.filter((l) => l.tag === 'NIEUW').length, 0);
const behouden = order.reduce((n, [, ls]) => n + ls.filter((l) => l.tag === 'BEHOUDEN').length, 0);
console.log(`regels: ${total} van ${order.length} sprekers (${behouden} behouden, ${nieuw} nieuw), plus ${apps} stille appjes`);
console.log(`export: ${chunks.length} delen, tekens per deel: ${chars.join(', ')} (ongeveer ${Math.round(chars.reduce((a, b) => a + b, 0) / 3.5 / 1000)}k tokens in totaal, schatting)`);
