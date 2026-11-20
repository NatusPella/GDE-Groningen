// Gedrag van de garagechips (designsysteem, #980): schade en banden als chips met pictogram en woord,
// de toon van de status en het herkennen van de tweede-druk-vraag. Pure functies uit garagetoestand.js.
import assert from 'node:assert/strict';
import { garageToestand, statusToon, vraagSoort, chipHtml, TOESTAND_ICOON } from '../game/js/garagetoestand.js';

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; console.log('FAIL', naam, '\n    ', e.message); } };
const auto = (extra = {}) => ({ owned: true, kind: 'car', status: 'garage', v: { health: 100, flat: false }, ...extra });

t('een heel voertuig: geen schade en banden heel, beide positief', () => {
  const c = garageToestand(auto());
  assert.deepEqual(c.map((x) => [x.id, x.tone]), [['schade', 'ok'], ['banden', 'ok']]);
  assert.equal(c[0].label, 'Geen schade');
});

t('schade loopt van geen via licht naar zwaar, met het percentage erbij', () => {
  assert.equal(garageToestand(auto({ v: { health: 89 } }))[0].tone, 'warn');
  assert.match(garageToestand(auto({ v: { health: 75 } }))[0].label, /Lichte schade · 75% heel/);
  const zwaar = garageToestand(auto({ v: { health: 20 } }))[0];
  assert.equal(zwaar.tone, 'no');
  assert.match(zwaar.label, /Zware schade · 20% heel/);
});

t('een lekke band is een probleem, ook bij een fiets', () => {
  const c = garageToestand(auto({ kind: 'bike', v: { health: 100, flat: true } }));
  assert.deepEqual(c.map((x) => x.label), ['Geen schade', 'Lekke band']);
  assert.equal(c[1].tone, 'no');
});

t('een boot en een helikopter hebben geen banden', () => {
  assert.equal(garageToestand(auto({ kind: 'boat' })).some((x) => x.id === 'banden'), false);
  assert.equal(garageToestand(auto({ kind: 'heli' })).some((x) => x.id === 'banden'), false);
});

t('een afgeschreven wrak is één chip en geen bandenstatus', () => {
  assert.deepEqual(garageToestand(auto({ status: 'lost' })), [{ id: 'schade', tone: 'no', label: 'Afgeschreven' }]);
});

t('zonder voertuig in de wereld telt de bewaarde regel; zonder beide staat hij heel', () => {
  const opgeslagen = garageToestand(auto({ v: null }), { entry: { health: 40, flat: true } });
  assert.deepEqual(opgeslagen.map((x) => x.tone), ['no', 'no']);
  assert.equal(garageToestand(auto({ v: null }))[0].tone, 'ok');
  assert.equal(garageToestand({ owned: false, kind: 'car' }).length, 0, 'wat je niet hebt, heeft geen toestand');
  assert.equal(garageToestand(null).length, 0);
});

t('de status naast de titel heeft een toon: thuis is goed, afgeschreven niet, te koop kan nu', () => {
  assert.equal(statusToon(auto()), 'ok');
  assert.equal(statusToon(auto({ status: 'driving' })), 'ok');
  assert.equal(statusToon(auto({ status: 'far' })), 'mut');
  assert.equal(statusToon(auto({ status: 'lost' })), 'no');
  assert.equal(statusToon({ owned: false, locked: false }), 'kan');
  assert.equal(statusToon({ owned: false, locked: true }), 'mut');
});

t('de vraag van verkopen of bezorgen wordt aan de tekst herkend, een uitslag niet', () => {
  const vragen = { verkoop: 'Verkopen: Hero voor €900. Druk nog een keer om te bevestigen', aflever: 'Afleveren kost €150. Druk nog een keer om te bevestigen' };
  assert.equal(vraagSoort(vragen.verkoop, vragen), 'verkoop');
  assert.equal(vraagSoort(vragen.aflever, vragen), 'aflever');
  assert.equal(vraagSoort('Hero verkocht voor €900', vragen), '');
  assert.equal(vraagSoort('', vragen), '');
  assert.equal(vraagSoort('iets', {}), '');
});

t('een chip heeft altijd een pictogram en een woord, en de tekst wordt veilig gemaakt', () => {
  for (const toon of ['ok', 'warn', 'no', 'mut', 'kan']) {
    const h = chipHtml(toon, 'Woord');
    assert.ok(h.includes('<svg') && h.includes('Woord'), toon);
    assert.ok(TOESTAND_ICOON[toon], toon);
  }
  assert.ok(chipHtml('no', '<b>x</b>').includes('&lt;b&gt;'));
  assert.ok(chipHtml('ok', 'Goed').includes('ds-z-chip--succes'));
  assert.ok(chipHtml('no', 'Stuk').includes('ds-z-chip--probleem'));
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
