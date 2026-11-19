// #844, #990: het uitkijkpunt als echte Te-doen-rij. Wat de rij kiest en zegt staat puur in
// kaartonthulling.js (nextViewpoint, ontdekRij); todo.js bouwt er de rij van. Deze test draait die
// echte functies met een paar nepepunten:
//   - zonder punten, of zonder bruikbare plek, is er geen rij en dus geen leugen;
//   - een gebruikt punt telt niet mee, ook als het dichterbij ligt;
//   - een punt van een streek die je nog niet kent gaat voor (een nieuwe streek ontdekken), anders
//     het dichtstbijzijnde ongebruikte punt (voor de stempel);
//   - de titel en de teller volgen de stand ("3 van 8 verkend").
//   node scripts/uitkijk_todo_test.mjs
import assert from 'node:assert/strict';
import { nextViewpoint, ontdekRij } from '../game/js/kaartonthulling.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };
const van = { x: 0, y: 0 };

t('zonder punten of zonder bruikbare plek geen rij', () => {
  assert.equal(nextViewpoint([], van), null);
  assert.equal(nextViewpoint(null, van), null);
  assert.equal(nextViewpoint([{ id: 'a', streek: 's1', x: NaN, y: 0 }, { id: 'b', streek: 's2', x: 0, y: undefined }], van), null);
  assert.equal(nextViewpoint([{ id: 'a', streek: 's1', x: 5, y: 5 }], null), null, 'zonder speler geen afstand');
});

t('alles gebruikt: geen rij', () => {
  assert.equal(nextViewpoint([{ id: 'a', streek: 's1', x: 5, y: 5 }], van, { isUsed: () => true }), null);
});

t('een gebruikt punt telt niet mee, ook als het dichterbij ligt', () => {
  const punten = [{ id: 'a', streek: 's1', x: 10, y: 10 }, { id: 'b', streek: 's2', x: 200, y: 10 }];
  const r = nextViewpoint(punten, van, { isUsed: (q) => q.id === 'a', isKnown: () => true });
  assert.equal(r.point.id, 'b');
});

t('de streek die je nog niet kent gaat voor, ook als hij verder weg ligt', () => {
  const punten = [{ id: 'a', streek: 's1', x: 100, y: 0 }, { id: 'b', streek: 's2', x: 900, y: 0 }, { id: 'c', streek: 's3', x: 400, y: 0 }];
  const r = nextViewpoint(punten, van, { isKnown: (s) => s === 's1' });
  assert.equal(r.point.id, 'c', 'het dichtstbijzijnde punt van een onbekende streek');
  assert.equal(r.nieuw, true);
});

t('kent hij alles al, dan wint het dichtstbijzijnde ongebruikte punt (de stempel)', () => {
  const punten = [{ id: 'a', streek: 's1', x: 500, y: 0 }, { id: 'b', streek: 's2', x: 100, y: 0 }, { id: 'c', streek: 's3', x: 300, y: 0 }];
  const r = nextViewpoint(punten, van, { isKnown: () => true });
  assert.equal(r.point.id, 'b');
  assert.equal(r.nieuw, false);
});

t('de rij zegt wat er gebeurt en hoe ver je bent', () => {
  const stand = { totaal: 8, verkend: 3 };
  const nieuw = ontdekRij(stand, { point: { streekNaam: 'Hogeland' }, nieuw: true, d: 1234.4 });
  assert.equal(nieuw.title, 'Ontdek een nieuwe streek');
  assert.equal(nieuw.meta, 'Hogeland · 1234 m');
  assert.equal(nieuw.record, '3 van 8 verkend');
  const stempel = ontdekRij(stand, { point: { streekNaam: 'Hogeland' }, nieuw: false, d: 50 });
  assert.equal(stempel.title, 'Uitkijken over de streek');
  assert.equal(ontdekRij(stand, null), null);
});

console.log(`uitkijk_todo_test: ${n} controles ok`);
