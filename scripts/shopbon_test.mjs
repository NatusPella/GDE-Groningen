// Gedrag van de winkelbon (designsysteem v2, #980): wat een keuze kost vóór je kiest, het probleem met zijn
// oplossing en de risicovolle keuze. Pure functies uit shopbon.js, gebouwd op shoplist.js.
import assert from 'node:assert/strict';
import { bonRegels, alternatief, probleemVan, risicoVan } from '../game/js/shopbon.js';
import { itemStatus, needsConfirm } from '../game/js/shoplist.js';

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; console.log('FAIL', naam, '\n    ', e.message); } };

const winkel = [
  { id: 'a', label: 'Hamer', price: 40 },
  { id: 'b', label: 'Vest', price: 300 },
  { id: 'c', label: 'Geweer', price: 1500 },
  { id: 'd', label: 'Kijk', plain: true },
  { id: 'e', label: 'Oud ding', price: 10, disabled: 'Heb je al' },
  { id: 'f', label: 'Sleutel', price: 0, disabled: 'Op slot: nog niet vrij' },
];
const byId = (id) => winkel.find((x) => x.id === id);

t('bon bij kopen: prijs, saldo en saldo erna kloppen met de knop', () => {
  const b = bonRegels(byId('a'), 100);
  assert.deepEqual(b, { soort: 'koop', bedrag: 40, saldo: 100, na: 60, mist: 0 });
});

t('bon bij te weinig geld: het saldo erna is nooit negatief en het tekort staat erbij', () => {
  const b = bonRegels(byId('b'), 120);
  assert.equal(b.mist, 180);
  assert.equal(b.na, 0);
  assert.equal(b.saldo, 120);
});

t('bon bij verkopen telt de opbrengst bij het saldo', () => {
  const b = bonRegels({ id: 'v', income: 75, price: 0 }, 20);
  assert.deepEqual(b, { soort: 'verkoop', bedrag: 75, saldo: 20, na: 95, mist: 0 });
});

t('bon: kiezen, gratis en een kapot saldo geven geen bon of een heel bedrag', () => {
  assert.equal(bonRegels(byId('d'), 100), null);
  assert.equal(bonRegels({ id: 'g', price: 0 }, 100), null);
  assert.equal(bonRegels(null, 100), null);
  assert.equal(bonRegels(byId('a'), NaN).saldo, 0);
  assert.equal(bonRegels(byId('a'), 99.9).saldo, 99, 'hele euro\'s, zoals het saldo in het spel getoond wordt');
});

t('probleem bij te weinig geld: kop, tekst met het tekort en een oplossing die je wel kunt betalen', () => {
  const p = probleemVan(byId('c'), winkel, 350);
  assert.equal(p.id, 'duur');
  assert.equal(p.kop, 'Te weinig geld');
  assert.equal(p.mist, 1150);
  assert.match(p.tekst, /1\.150/);
  assert.equal(p.oplossing.id, 'b', 'het duurste dat je wel kunt betalen, dicht bij wat je wilde');
  assert.match(p.oplossing.label, /Vest/);
  assert.equal(itemStatus(byId(p.oplossing.id), 350).buyable, true);
});

t('probleem zonder iets betaalbaars: wel uitleg, geen oplossingsknop', () => {
  const p = probleemVan(byId('b'), winkel.filter((x) => x.id === 'b'), 5);
  assert.equal(p.id, 'duur');
  assert.equal(p.oplossing, null);
  assert.ok(p.tekst.length > 10);
});

t('een gesloten item heeft een eigen probleem; "heb ik al" en kopen kan zijn geen probleem', () => {
  assert.equal(probleemVan(byId('f'), winkel, 500).id, 'slot');
  assert.equal(probleemVan(byId('e'), winkel, 500), null, 'heb ik al is een stand, geen probleem');
  assert.equal(probleemVan(byId('a'), winkel, 500), null);
  assert.equal(probleemVan(null, winkel, 500), null);
});

t('de oplossing wijst nooit naar het item zelf, kiezen-regels of een verkoop', () => {
  const lijst = [{ id: 'x', label: 'Duur', price: 900 }, { id: 'y', label: 'Kiezen', plain: true }, { id: 'z', label: 'Verkoop', income: 50 }];
  assert.equal(alternatief(lijst, lijst[0], 10), null);
});

t('risico: een dure aankoop en een eigen waarschuwing vragen om de tweede druk, een gewone niet', () => {
  assert.equal(risicoVan(byId('a'), 500), null);
  assert.equal(needsConfirm(byId('c'), 5000), true);
  assert.ok(risicoVan(byId('c'), 5000).tekst.includes('bevestig'));
  assert.equal(risicoVan({ id: 'w', price: 20, confirmText: 'Dit is niet terug te draaien.' }, 500).tekst, 'Dit is niet terug te draaien.');
  assert.ok(/verkoop/i.test(risicoVan({ id: 's', income: 400 }, 0).tekst), 'een dure verkoop krijgt een eigen zin');
  assert.equal(risicoVan({ id: 'u', price: 5000, disabled: 'Te weinig geld' }, 10), null, 'een item dat niet kan toont geen risico');
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
