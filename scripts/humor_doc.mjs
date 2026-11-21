// Schrijft docs/verhaal/HUMOR-KEUZELIJST.md (de veto-lijst voor de eigenaar) uit de humorbestanden in game/storydata.
// Bovenaan: gevoelige beats en beats met een paneelsplit (1-1-1) of lage zekerheid; daarna alle beats met de gekozen variant, de
// reden en de alternatieven. node scripts/humor_doc.mjs [--check]
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const dataDir = new URL('game/storydata/', root);
const beats = [];
for (const f of fs.readdirSync(dataDir).filter((x) => /^humor(\.[a-z0-9]+)?\.json$/.test(x)).sort()) beats.push(...JSON.parse(fs.readFileSync(new URL(f, dataDir), 'utf8')).beats);
const text = (b, k) => (k === 'neutral' ? b.neutral : b.variants[k]);
const naam = (k) => (k === 'neutral' ? 'neutraal' : `variant ${k + 1}`);
const esc = (s) => String(s).replace(/\|/g, '\\|');

const split = (b) => b.panel && new Set(b.panel.votes).size === 3;
const risk = beats.filter((b) => b.sensitive || (split(b) && b.panel.certainty === 'laag'));
const low = beats.filter((b) => !risk.includes(b) && b.panel && b.panel.certainty === 'laag');
const L = [];
L.push('# Humorkeuze: de veto-lijst (21-11)');
L.push('');
L.push('Je hoeft niets te doen. Voor elke nieuwe of herschreven komische beat heeft de schrijver drie varianten en een veilige neutrale terugval gemaakt; drie onafhankelijke beoordelaars (zonder elkaars oordeel, met de varianten in een andere volgorde) kozen de beste. De winnaar staat in het spel; de andere twee en de terugval staan hieronder als alternatief. Wil je iets anders: zet `chosen` van die beat in het bijbehorende bestand `game/storydata/humor*.json` op 0, 1, 2 of `"neutral"` en draai `node scripts/build_story_data.mjs`. Werkwijze: [SCHRIJFREGELS-21-11.md](SCHRIJFREGELS-21-11.md). Na een wijziging: draai ook de cutscene-tests (`cutscenes_akte*_test`), want de cues van een scène (`on:`) volgen de gekozen tekst. Samen spelen: een beat is gewone scènetekst; een gast ziet de gekozen variant mee in de scène van de host. Gegenereerd door `node scripts/humor_doc.mjs`; kies hier niet met de hand.');
L.push('');
L.push(`Eerlijk over de proef: ${beats.length} beats. De beoordelaars lazen de stijlgids en de beats; minstens twee van de drie lazen de ijkregels uit akte 1 ([BEHOUDEN]-grappen) niet. Wees dus kritisch bij beats met lage zekerheid.`);
L.push('');
L.push('## Bovenaan: gevoelig of gespleten met lage zekerheid');
L.push('');
if (!risk.length) L.push('Geen. (Geen enkele beat raakt een gevoelig onderwerp en geen enkele beat had een 1-1-1-split met lage zekerheid.)');
for (const b of risk) L.push(`- **${b.id}** (${b.scene}, ${b.speaker}): gekozen "${text(b, b.chosen)}"; ${b.sensitive ? 'gevoelig onderwerp' : 'paneelsplit 1-1-1, zekerheid laag'}. ${b.panel ? b.panel.reason : ''}`);
L.push('');
L.push('## Lage zekerheid (twee van de drie, of onderling onzeker)');
L.push('');
if (!low.length) L.push('Geen.');
for (const b of low) L.push(`- **${b.id}** (${b.scene}): "${text(b, b.chosen)}"`);
L.push('');
L.push('## Alle beats');
L.push('');
L.push('| Beat | Scène | Spreker | Gekozen | Stemmen | Zekerheid | Reden |');
L.push('|---|---|---|---|---|---|---|');
for (const b of beats) L.push(`| ${b.id} | ${b.scene} | ${esc(b.speaker)} | ${esc(text(b, b.chosen))} | ${b.panel ? b.panel.votes.map(naam).join(', ') : 'voorstel (niet beoordeeld)'} | ${b.panel ? b.panel.certainty : ''} | ${esc(b.panel ? b.panel.reason : '')} |`);
L.push('');
L.push('## De alternatieven per beat');
L.push('');
for (const b of beats) {
  L.push(`**${b.id}** (${b.scene}): ${b.context}`);
  [0, 1, 2, 'neutral'].forEach((k) => L.push(`- ${naam(k)}${k === b.chosen ? ' (gekozen)' : ''}: ${text(b, k)}`));
  L.push('');
}
const out = L.join('\n');
const target = new URL('docs/verhaal/HUMOR-KEUZELIJST.md', root);
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== out) { console.log('HUMOR-KEUZELIJST.md is verouderd: node scripts/humor_doc.mjs'); process.exit(1); }
  console.log('HUMOR-KEUZELIJST.md ok');
} else {
  fs.writeFileSync(target, out);
  console.log(`${beats.length} beats naar docs/verhaal/HUMOR-KEUZELIJST.md`);
}
