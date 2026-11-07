// Documentatie-ingang en naslagverwijzingen (#697): docs/README.md moet bestaan en alle
// losse docs noemen; elk doc dat de specs als naslag aanwijzen moet bovenaan naar zijn
// canonieke spec verwijzen. Zo blijft de documentatie vindbaar en weet een lezer welke
// van de twee waar is.
//   node scripts/docs_index_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); process.exitCode = 1; } };

// 1. de ingang bestaat en noemt de belangrijke plekken
const index = lees('docs/README.md');
for (const doel of ['ONTWIKKELEN.md', 'TESTEN.md', 'RELEASEN.md', '1.0-TRACK.md', '.specs-fire/standards/', 'verhaal/README.md', 'archief/']) {
  ok(index.includes(doel), `docs/README.md verwijst naar ${doel}`);
}
ok(/Begin hier/.test(index), 'docs/README.md heeft een "Begin hier"');
ok(/Naslag/.test(index) && /spec/.test(index), 'docs/README.md legt uit dat de specs de regels zijn');

// 2. elk los doc staat in de index (geen wezen)
const los = fs.readdirSync(DOCS).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
const missend = los.filter((f) => !index.includes(f));
ok(missend.length === 0, 'elk los document staat in docs/README.md', missend.join(', '));

// 3. docs die de specs als naslag aanwijzen, verwijzen naar hun spec
const naslag = {
  'docs/LOOPBAAN.md': 'mechanica', 'docs/BOERDERIJ.md': 'mechanica', 'docs/VLIEGSCHOOL.md': 'mechanica',
  'docs/GELUID.md': 'mechanica', 'docs/MUZIEK.md': 'mechanica',
  'docs/MULTIPLAYER-VISIE.md': 'multiplayer', 'docs/COOP-GAST.md': 'multiplayer',
  'docs/COOP-OPSLAAN.md': 'multiplayer', 'docs/COOP-OVERDRAGEN.md': 'multiplayer',
  'docs/RELEASEN.md': 'publicatie', 'docs/PUBLICEREN.md': 'publicatie',
  'docs/PUBLICATIECHECKLIST.md': 'publicatie', 'docs/STEAM-KLAAR.md': 'publicatie',
  'docs/STEAM-CHECKLIST.md': 'publicatie', 'docs/LEEFTIJD.md': 'publicatie',
  'docs/IARC-ANTWOORDEN.md': 'publicatie', 'docs/ONTWIKKELEN.md': 'publicatie',
  'docs/INCLUSIEVE-TAAL.md': 'ui-taal', 'docs/WOORDENLIJST.md': 'ui-taal',
  'docs/DIALECT-CONTROLE.md': 'ui-taal', 'docs/3d-model-prompts.md': 'ui-taal',
  'docs/verhaal/STIJLGIDS.md': 'verhaal', 'docs/PROVINCIE-PLAN.md': 'wereld',
  'docs/GEBIEDEN.md': 'wereld', 'docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md': 'wereld',
};
for (const [bestand, spec] of Object.entries(naslag)) {
  const t = lees(bestand);
  ok(t.includes(`specs-fire/standards/${spec}.md`), `${bestand} verwijst naar zijn spec (${spec})`);
}

// 4. de verhaalmap heeft een eigen ingang die de weg canon → script → spel laat zien
const verhaal = lees('docs/verhaal/README.md');
ok(/Canon/.test(verhaal) && /Script/.test(verhaal) && /Implementatie|In het spel/.test(verhaal), 'docs/verhaal/README.md heeft de weg canon → script → spel');
ok(/09-script-akte6/.test(verhaal), 'de verhaal-ingang noemt akte 6');
ok(/SPECS|specs-fire/.test(verhaal), 'de verhaal-ingang verwijst naar de spec');

// 5. een nieuwe doc hoort in de index: de index-tabel is compleet
ok(/Een document toevoegen/.test(index), 'docs/README.md legt uit hoe je een doc toevoegt');
ok(new RegExp(String(los.length)).test(index) || los.every((f) => index.includes(f)), 'de index dekt alle losse docs');

console.log(process.exitCode ? 'docs_index_test: FAIL' : `docs_index_test: ${n} controles ok`);
