// Spullen (#435): het inventarissscherm is niet meer één lange lijst. Je zoekt
// op wat je hebt ("fiets", "kast", "stempel") en kiest een deel: alles,
// uitrusting, thuis of verzamelingen. De rekenregels staan in zoekSpullen() en
// zijn puur; de bedrading (zoekveld, knoppen, lege melding) staat ernaast.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const S = await import('../game/js/spullen.js');
const { zoekSpullen, DELEN } = S;

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

const spullen = [
  { key: 'w:buks', cat: 'wapens', title: 'Buks', sub: '12 patronen', how: 'Pang & Zo, €450', perk: 'Jachtgeweer' },
  { key: 'w:fists', cat: 'wapens', title: 'Vuisten', sub: 'Altijd bij je', how: 'Van jezelf', perk: 'Slaan' },
  { key: 'o:stadjer', cat: 'kleding', title: 'Stadjer', sub: 'Gewone kleren', how: 'Van jezelf', perk: 'Omkleden kan thuis bij de kast' },
  { key: 'f:bank', cat: 'thuis', title: 'Bank', sub: 'Staat in de woonkamer', how: 'EIKEA, €300', perk: 'Zitten' },
  { key: 'k:stempels', cat: 'kaart', title: 'Spaarkaart Krant & Kauwgom', sub: '3 van 12 stempels', how: 'Een stempel per aankoop', perk: 'Volle kaart: inleveren' },
  { key: 'geld', cat: 'geld', title: '€ 1.250', sub: 'Contant, in je zak', how: 'Verdiend met klussen', perk: '' },
];
const titels = (lijst) => lijst.map((it) => it.title);

t('zonder zoekopdracht en met Alles zie je alles', () => {
  assert.deepEqual(titels(zoekSpullen(spullen)), titels(spullen));
  assert.deepEqual(titels(zoekSpullen(spullen, '   ')), titels(spullen));
});

t('zoeken kijkt in de titel, de uitleg, de herkomst en de categorie', () => {
  assert.deepEqual(titels(zoekSpullen(spullen, 'buks')), ['Buks']);
  assert.deepEqual(titels(zoekSpullen(spullen, 'patronen')), ['Buks'], 'de ondertitel telt mee');
  assert.deepEqual(titels(zoekSpullen(spullen, 'pang')), ['Buks'], 'waar je het kocht telt mee');
  assert.deepEqual(titels(zoekSpullen(spullen, 'kast')), ['Stadjer'], 'wat je ermee kunt telt mee');
  assert.deepEqual(titels(zoekSpullen(spullen, 'kleding')), ['Stadjer'], 'de naam van de categorie telt mee');
});

t('alle woorden moeten ergens passen, in willekeurige volgorde', () => {
  assert.deepEqual(titels(zoekSpullen(spullen, 'pang buks')), ['Buks']);
  assert.deepEqual(titels(zoekSpullen(spullen, 'buks pang')), ['Buks']);
  assert.deepEqual(titels(zoekSpullen(spullen, 'buks eikea')), [], 'twee dingen door elkaar geeft niets');
});

t('niks gevonden is leeg, niet alles', () => {
  assert.deepEqual(zoekSpullen(spullen, 'onderzeeër'), []);
});

t('de delen: uitrusting, thuis en verzamelingen', () => {
  assert.deepEqual(DELEN.map(([id]) => id), ['alles', 'uitrusting', 'thuis', 'verzameling']);
  assert.deepEqual(titels(zoekSpullen(spullen, '', 'uitrusting')), ['Buks', 'Vuisten', 'Stadjer']);
  assert.deepEqual(titels(zoekSpullen(spullen, '', 'thuis')), ['Bank']);
  assert.deepEqual(titels(zoekSpullen(spullen, '', 'verzameling')), ['Spaarkaart Krant & Kauwgom']);
});

t('een deel en een zoekopdracht werken samen', () => {
  assert.deepEqual(titels(zoekSpullen(spullen, 'stempel', 'verzameling')), ['Spaarkaart Krant & Kauwgom']);
  assert.deepEqual(titels(zoekSpullen(spullen, 'stempel', 'thuis')), [], 'de bank heeft geen stempel');
});

t('geld hoort bij geen enkel deel: alleen bij Alles', () => {
  assert.deepEqual(titels(zoekSpullen(spullen, 'contant', 'uitrusting')), []);
  assert.deepEqual(titels(zoekSpullen(spullen, 'contant', 'verzameling')), []);
  assert.deepEqual(titels(zoekSpullen(spullen, 'contant')), ['€ 1.250']);
});

t('het scherm heeft een zoekveld, de delen als knoppen en een lege melding', () => {
  const pm = lees('pausemenu.js');
  assert.match(pm, /data-spul-search/, 'het zoekveld staat in het paneel');
  assert.match(pm, /data-spul-deel="\$\{id\}"/, 'de delen staan als knoppen');
  assert.match(pm, /zetSpullenZoek\(spulZoek\.value\); spullenApi\.rerender\(\)/, 'typen zoekt meteen en werkt de voetregel bij');
  const sp = lees('spullen.js');
  assert.match(sp, /data-spul-leeg/, 'een lege uitkomst zegt het');
  assert.match(sp, /aria-pressed/, 'de gekozen knop is te zien');
  assert.match(sp, /const zichtbaar = zoekSpullen\(items, zoek, deel\)/, 'de lijst gebruikt dezelfde regels als de test');
});

console.log(`spullen_test: ${n}/${n} ok`);
