// Het Spullen-raster (spullenmodel.js, #1013): categorieën, sorteren, aantal-badges en weggooien met bevestiging.
//   node scripts/spullenmodel_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const M = await import('../game/js/spullenmodel.js');
const E = await import('../game/js/eten.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const frikandel = { id: E.TOONBANK[5][0] }; // kroket
const items = [
  { key: 'geld', cat: 'geld', title: '€120', sub: 'Contant' },
  { key: 'w:buks', cat: 'wapens', title: 'Buks', aantal: 12, eenheid: 'patronen' },
  { key: 'w:fists', cat: 'wapens', title: 'Vuisten', aantal: 0 },
  { key: 'w:gooi', cat: 'werp', title: 'Bierfles', aantal: 150 },
  { key: 'o:stad', cat: 'kleding', title: 'Stadjer' },
  { key: 'e:a', cat: 'eten', title: 'Kroket', aantal: 3, weg: { id: frikandel ? frikandel.id : 'x', aantal: 3 } },
  { key: 'u:1', cat: 'upgrade', title: 'Turbo' },
  { key: 'f:bank', cat: 'thuis', title: 'Bank' },
  { key: 'k:s', cat: 'kaart', title: 'Spaarkaart' },
];

t('elke categorie van het raster komt uit een bestaande groep; geen gewicht, sleutels of missie-items', () => {
  assert.deepEqual(M.CATS.map(([id]) => id), ['alles', 'wapens', 'kleding', 'voedsel', 'upgrades', 'thuis', 'verzameling']);
  for (const [, cat] of Object.entries(M.CAT_VAN)) assert.ok(cat === 'geld' || M.CATS.some(([id]) => id === cat), cat);
  assert.equal(M.catVan({ cat: 'werp' }), 'wapens', 'werpspul hoort bij wapens');
  assert.equal(M.catVan({ cat: 'eten' }), 'voedsel');
  for (const [id] of M.CATS) assert.ok(M.LEEG[id], `lege staat voor ${id}`);
});

t('sorteren: geld blijft vooraan; naam is A tot Z; aantal zet de grootste stapel voorop', () => {
  assert.deepEqual(M.sorteer(items).map((i) => i.key), items.map((i) => i.key), 'standaard houdt de volgorde');
  const naam = M.sorteer(items, 'naam').map((i) => i.title);
  assert.equal(naam[0], '€120');
  assert.deepEqual(naam.slice(1), ['Bank', 'Bierfles', 'Buks', 'Kroket', 'Spaarkaart', 'Stadjer', 'Turbo', 'Vuisten']);
  const aantal = M.sorteer(items, 'aantal').map((i) => i.title);
  assert.deepEqual(aantal.slice(0, 4), ['€120', 'Bierfles', 'Buks', 'Kroket']);
  assert.equal(M.cycleSort('soort'), 'naam');
  assert.equal(M.cycleSort('aantal'), 'soort', 'de cyclus sluit');
});

t('de badge: ×aantal, 99+ bij een grote stapel, niets zonder aantal', () => {
  assert.equal(M.badgeTekst({ aantal: 3 }), '×3');
  assert.equal(M.badgeTekst({ aantal: 150 }), '99+');
  assert.equal(M.badgeTekst({ aantal: 0 }), '');
  assert.equal(M.badgeTekst({}), '');
  assert.equal(M.badgeTekst(null), '');
  assert.equal(M.tegelNaam({ title: 'Kroket', aantal: 3, side: '' }), 'Kroket, 3 stuks');
  assert.equal(M.tegelNaam({ title: 'Buks', aantal: 12, eenheid: 'patronen', side: 'In de hand' }), 'Buks, 12 patronen, In de hand');
  assert.equal(M.tegelNaam({ title: 'Bank' }), 'Bank');
});

t('alleen eten is weg te gooien', () => {
  assert.equal(M.kanWeggooien(items[5]), !!frikandel);
  for (const i of items.filter((x) => x.cat !== 'eten')) assert.equal(M.kanWeggooien(i), false, i.key);
  assert.equal(M.kanWeggooien(null), false);
  assert.equal(M.kanWeggooien({ weg: { id: 'x', aantal: 0 } }), false);
});

t('weggooien vraagt eerst: vraag, dan bevestig doet het; annuleer of een ander ding kiezen vergeet de vraag', () => {
  assert.equal(M.WEGGOOI_VRAAG, 'Weggooien? Dit kan niet terug.');
  let r = M.weggooiStap(null, 'bevestig', 'e:a');
  assert.equal(r.doe, false, 'zonder vraag voert bevestigen niets uit');
  r = M.weggooiStap(null, 'vraag', 'e:a', true);
  assert.deepEqual(r.state, { key: 'e:a', alles: true, stap: 'bevestig' });
  assert.equal(r.doe, false, 'de vraag zelf gooit niets weg');
  const bevestig = M.weggooiStap(r.state, 'bevestig', 'e:a');
  assert.equal(bevestig.doe, true);
  assert.equal(bevestig.alles, true);
  assert.equal(bevestig.state, null, 'na het weggooien staat er geen vraag meer open');
  assert.equal(M.weggooiStap(r.state, 'bevestig', 'e:b').doe, false, 'bevestigen op een ander ding telt niet');
  assert.equal(M.weggooiStap(r.state, 'annuleer', 'e:a').state, null);
  assert.equal(M.weggooiStap(r.state, 'ander', 'e:b').state, null, 'een andere tegel kiezen vergeet de vraag');
  assert.equal(M.weggooiStap(r.state, 'ander', 'e:a').state, r.state, 'dezelfde tegel houdt hem');
});

t('weggooien: een stuk of de hele stapel, en de voorraad klopt erna', () => {
  if (!frikandel) return;
  const w = { eten: { [frikandel.id]: 3 } };
  const it = { title: 'Kroket', weg: { id: frikandel.id, aantal: 3 } };
  assert.match(M.weggooi(w, it), /één stuk weggegooid/);
  assert.equal(w.eten[frikandel.id], 2);
  assert.match(M.weggooi(w, it, true), /2 stuks weggegooid/);
  assert.equal(w.eten[frikandel.id], undefined, 'een lege stapel verdwijnt uit de voorraad');
  assert.match(M.weggooi(w, it), /niet bij je/);
  assert.match(M.weggooi(w, { title: 'Buks' }), /niet weggooien/);
});

t('na het weggooien van de laatste tegel gaat de focus naar de volgende, anders de vorige', () => {
  assert.equal(M.naWeggooien(['a', 'b', 'c'], 'b'), 'c');
  assert.equal(M.naWeggooien(['a', 'b', 'c'], 'c'), 'b');
  assert.equal(M.naWeggooien(['a'], 'a'), null);
  assert.equal(M.naWeggooien(['a', 'b'], 'z'), 'a');
});

console.log(`spullenmodel_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
