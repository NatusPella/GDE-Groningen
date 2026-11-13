// Schrijft de open lijst voor #735: de verhaalregels die nog op een Groningse spreektekst wachten
// (docs/verhaal/GRONINGS-20-SPREEKTEKSTEN.md). Bron: de gegenereerde TTS-opnamelijst per clip
// (docs/verhaal/TTS-OPNAMELIJST-735.jsonl) + de goedgekeurde rijen in scripts/gronings_spoken.json.
// Er wordt hier GEEN dialect geschreven of vertaald: de citaten zijn bestaande, goedgekeurde rijen en
// per regel staat alleen het knooppunt dat een kenner moet beslissen.
//   node scripts/gronings_open_doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSONL = path.join(REPO, 'docs', 'verhaal', 'TTS-OPNAMELIJST-735.jsonl');
const OUT = path.join(REPO, 'docs', 'verhaal', 'GRONINGS-20-SPREEKTEKSTEN.md');
const rijen = fs.readFileSync(JSONL, 'utf8').trim().split('\n').map((r) => JSON.parse(r)).filter((r) => r.reason === 'spreektekst');
const spoken = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken.json'), 'utf8'));

// Per regel het knooppunt dat een kenner moet beslissen (geen dialect, alleen de keuze).
const hints = {
  jullie_zijn_van_trijntje: 'Aanspreekvorm (jullie/jim), kerkelijke woorden (kosteres, relikwieën): laat de kerkelijke toon van Geesje staan; eigen naam Trijntje blijft.',
  jelle_terpstra_heeft_alle_eieren: 'Eigen namen (Jelle Terpstra), streeknaam Hogeland en het woord contract: alleen de zin eromheen wordt Gronings.',
  zijn_moeder_gerda_belt_trijntje: 'Voor "zijn moeder" bestaat een goedgekeurd precedent (moeke); namen Gerda en Trijntje blijven staan; "belt" is moderne spreektaal.',
  jullie_brengen_ze_heel_naar_de_k: 'Plaatsnaam Usquert blijft staan; kerkkelder is een kerkelijk woord; "heel" (in één stuk) is betekenis, geen dialect.',
  de_trekker_staat_bij_de_schuur: 'Landbouwwoorden (trekker, schuur); korte droge zinnen van Geesje: geen extra toevoeging.',
  de_kratten_staan_heel_dat_is_een: 'Kerkelijke woordgrap (kerkelijk wonder); "kratten" en "heel" houden de betekenis.',
  dat_is_meer_dan_de_dominee_ooit: 'Dominee is kerkelijk; de vergelijking moet droog blijven.',
  ze_staan_in_de_kerkkelder_jullie: 'Kerkkelder; "jullie komen te laat" is een aanspreekvorm: kies dezelfde vorm als in de andere Geesje-regels.',
  dan_koopt_u_een_eierkoek: 'Beleefdheidsvorm "u" (kosteres tegen een klant): kies u of de Groningse vorm, consistent met de rest van M09.',
  weer_eieren_de_kippen_sturen_een: 'Droge grap over de kippen; geen dialect voor de grap zelf, alleen de zinsbouw.',
  moi_rotor_roelf_die_heli_is_van: 'Groet "Moi" en de bijnaam Rotor Roelf blijven; UMCG-dak is een echte plek (mag blijven); "heli" is spreektaal.',
  de_lunch_is_van_dijkstra_nait_te: "De regel bevat al Gronings (\"Nait\") en de eigennaam \"d'Olle Grieze\": de kenner kiest of die vorm blijft en hoe de rest eromheen klinkt.",
  mijn_kerkvoogdij_is_gebeld_de_ke: 'Kerkelijk bestuur (kerkvoogdij), kerkkelder; "jong" is een aanspreekvorm die Geesje vaker gebruikt.',
  ik_rij_op_mijn_scooter_een_bedev: 'Scooter en bedevaart zijn de grap; "op twee wielen" moet dezelfde droge toon houden.',
  ik_rij_naast_jullie_op_mijn_scoo: 'Herhaalt de bedevaart-grap; "elk steegje van hier tot de Grote Markt" houdt de echte toponiemen.',
  een_limo_past_niet_in_een_steegj: '"jong" als aanspreekvorm; limo en steegje zijn spreektaal, geen dialect.',
  de_steeg_bij_de_notaris_is_dicht: 'Notaris en scooter zijn modern; "Scooter dwars" en "breien" zijn de grap, geen dialect.',
  wie_blijft_staan_mag_breien: 'Korte spreuk: de kenner kiest de Groningse vorm van "blijven staan" en "mag".',
  ik_zie_alles_vanaf_mijn_toren_di: 'Toren/hooiberg: de grap zit in de betekenis; geen dialect toevoegen.',
  links_het_derde_bolwerk_ze_kijke: 'Bolwerk is een echte plekterm; "derde bolwerk" en de korte zinnen blijven.',
};

// De bestandsnaam bevat meer woorden dan de korte hint-sleutel: kies de langste sleutel die een prefix is.
const hintVoor = (sk) => {
  let best = '';
  for (const k of Object.keys(hints)) if (sk.startsWith(k) && k.length > best.length) best = k;
  return hints[best] || '—';
};

const beste = (tekst) => {
  const woorden = String(tekst).toLowerCase().replace(/[^a-zà-ÿ\s]/gi, ' ').split(/\s+/).filter((w) => w.length >= 4);
  const scores = [];
  for (const [k, v] of Object.entries(spoken)) {
    const kl = k.toLowerCase();
    let score = 0;
    for (const w of woorden.slice(0, 6)) if (kl.includes(w)) score++;
    if (score >= 3) scores.push([score, k, v]);
  }
  return scores.sort((a, b) => b[0] - a[0]).slice(0, 2);
};

const perStap = {};
for (const r of rijen) perStap[r.step] = (perStap[r.step] || 0) + 1;
const stapTekst = Object.entries(perStap).map(([k, n]) => `${k} ${n}`).join(', ');
const sprekers = {};
for (const r of rijen) sprekers[r.speaker] = (sprekers[r.speaker] || 0) + 1;
const sprekerTekst = Object.entries(sprekers).map(([k, n]) => `**${k}** (${n})`).join(' en ');

const out = [];
out.push('# Gronings: de verhaalregels zonder spreektekst (open lijst voor #735)');
out.push('');
out.push('Dit bestand is de **open lijst** van #735: de verhaalregels die nog geen Groningse spreektekst hebben.');
out.push('Er staat **geen gegenereerd dialect** in: de citaten hieronder zijn bestaande, goedgekeurde rijen uit');
out.push('`scripts/gronings_spoken.json` en dienen alleen als voorbeeld van woordkeuze. De Groningse tekst zelf');
out.push('schrijft of keurt een **kenner**; een agent vult die niet in.');
out.push('');
out.push(`**Stand:** ${rijen.length} regels, 0 op een stemkeuze, ${rijen.length} op een spreektekst. Alle regels zijn van ${sprekerTekst};`);
out.push('hun stem staat vast in `CAST` (`Pulcherrima` en `Achird`), dus dit is een tekstknoop, geen stemknoop.');
out.push(`Verdeling per stap: ${stapTekst}.`);
out.push('');
out.push('Gegenereerd door `node scripts/gronings_open_doc.mjs` uit `docs/verhaal/TTS-OPNAMELIJST-735.jsonl`,');
out.push('`scripts/gronings_spoken.json` en de knooppunten hieronder. Niet met de hand aanpassen.');
out.push('');
out.push('## De lijst');
out.push('');
out.push('| # | Stap | Spreker | Stem | Regel (Nederlands) | Knooppunt voor de kenner | Verwante goedgekeurde regel |');
out.push('|---|---|---|---|---|---|---|');
rijen.forEach((r, idx) => {
  const sk = String(r.file).replace(/^lines\/[^/]+\//, '').replace(/_[0-9a-f]{8}\.mp3$/, '');
  const hint = hintVoor(sk);
  const n = beste(r.text);
  const pre = n.length
    ? n.map(([, k, v]) => `“${String(k).slice(0, 90)}${String(k).length > 90 ? '…' : ''}” → “${String(v).slice(0, 120)}${String(v).length > 120 ? '…' : ''}”`).join('<br>')
    : '— (geen precedent in `gronings_spoken.json`)';
  out.push(`| ${idx + 1} | ${r.source} | ${r.speaker} | ${r.voice} | “${r.text}” | ${hint} | ${pre} |`);
});
out.push('');
out.push('## Wat de kenner per regel kiest');
out.push('');
out.push('De knoppen zijn per regel verschillend, maar steeds dezelfde soorten: (1) de Groningse vorm van de');
out.push('werkwoorden en lidwoorden, (2) of een **eigennaam, plaatsnaam of bestaande Groningse vorm** blijft staan,');
out.push('(3) of een kerkelijk woord (kosteres, kerkkelder, dominee, kerkvoogdij) in het Gronings of in het Nederlands');
out.push('blijft, (4) de aanspreekvorm (jij/jullie/u/jong), en (5) of een grap in de betekenis zit (dan verandert de');
out.push('spreektekst die grap niet). De kolom hierboven noemt per regel het belangrijkste knooppunt.');
out.push('');
out.push('Toets de keuzes aan `docs/verhaal/STIJLGIDS.md` (§2 stemmen, §4 taal) en aan de bestaande rijen: een');
out.push('nieuwe vorm die in `gronings_spoken.json` al bestaat, houdt dezelfde spelling. Twijfelgevallen gaan naar');
out.push('`docs/verhaal/DIALECT-NALEZING.md`.');
out.push('');
out.push('## Route naar de wachtrij (menselijke controle verplicht)');
out.push('');
out.push('1. De kenner vult per regel **dezelfde Nederlandse regel als sleutel** in `scripts/gronings_spoken_draft.json`');
out.push('   met de Groningse spreektekst als waarde (of laat de regel bewust open).');
out.push('2. `node scripts/gronings_merge_draft.mjs` toont wat er nieuw is en welke rijen botsen; `--write` voegt ze toe.');
out.push('3. `node scripts/tts_lines_list.mjs` zet de regels daarna in de wachtrij; `python scripts/tts_lines.py` neemt op.');
out.push('4. Deze lijst en `docs/verhaal/TTS-OPNAMELIJST-735.md` opnieuw draaien met `node scripts/tts_opnamelijst.mjs`.');
out.push('');
out.push('## Beslisformulier per regel');
out.push('');
out.push('Vul per regel in (of laat de regel bewust open). Hier staat **nog geen Groningse tekst**: de kenner');
out.push('schrijft of keurt de spreektekst en zet daaronder het akkoord. Dezelfde Nederlandse regel is de sleutel');
out.push('in `scripts/gronings_spoken_draft.json`.');
out.push('');
rijen.forEach((r, idx) => {
  const sk = String(r.file).replace(/^lines\/[^/]+\//, '').replace(/_[0-9a-f]{8}\.mp3$/, '');
  const hint = hintVoor(sk);
  const kort = String(r.text).length > 90 ? String(r.text).slice(0, 90) + '…' : String(r.text);
  out.push(`### ${idx + 1}. ${r.source} · ${r.speaker} — “${kort}”`);
  out.push('');
  out.push('- **Gewenste Groningse spreektekst:**');
  out.push('- **Let op (knooppunt):** ' + hint);
  out.push('- **Aanspreekvorm:** [ ] jij/jullie zoals de ondertitel · [ ] "jong" · [ ] "u" · [ ] anders:');
  out.push('- **Kerkelijke term (kosteres, kerkkelder, dominee, kerkvoogdij):** [ ] Gronings · [ ] Nederlands · [ ] laten staan · [ ] anders:');
  out.push('- **Naam, plaats of bestaande Groningse vorm (bijv. "Nait"):** [ ] laten staan zoals de ondertitel · [ ] spelling aanpassen naar:');
  out.push('- **Overig (grap, woordkeuze, tempo):**');
  out.push('- **Akkoord kenner:** naam of initialen + datum:');
  out.push('');
});
out.push('## Luisterchecklist na de opname');
out.push('');
out.push('Kort, per clip; de opname zelf blijft werk van de eigenaar.');
out.push('');
out.push('- [ ] De zin is letterlijk de goedgekeurde spreektekst, zonder Nederlandse terugval of improvisatie.');
out.push('- [ ] Aanspreekvorm, kerkelijke term en namen klinken zoals de kenner ze heeft aangevinkt.');
out.push('- [ ] Tempo en toon passen bij de vorige regel van dezelfde spreker (Geesje warm en droog, Rotor Roelf joviaal).');
out.push('- [ ] Namen en plaatsen hebben de juiste klemtoon (o.a. Trijntje, Usquert, Jelle Terpstra, d\'Olle Grieze).');
out.push('- [ ] Geen valse start, geen kuchje en geen tweede stem in de clip; de duur past bij de ondertitel.');
out.push('- [ ] `ffprobe`: 24 kHz mono, duur klopt; de eigenaar luistert de eerste clip van elke spreker zelf.');
out.push('- [ ] Daarna: `gronings_spoken_draft.json` bijwerken → `gronings_merge_draft.mjs --write` → `tts_lines_list.mjs` → opnemen.');
out.push('');
out.push('## Wat hier bewust niet staat');
out.push('');
out.push('Geen door een agent verzonnen of gegenereerd Gronings, geen automatische vertaling en geen "concept" dat');
out.push('alleen nog goedgekeurd hoeft te worden. De citaten zijn bestaand, goedgekeurd materiaal; de rest is werk');
out.push('voor een kenner. Wie de lijst in de code wil bijwerken zonder dialect te schrijven, gebruikt dit bestand als');
out.push('bron voor de open regels.');
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log(`${rijen.length} open regels in ${path.relative(REPO, OUT)} (${stapTekst})`);
