// Gedrag van het tijdstreepje in Te doen (#980): geen tijd geen streep, lopend telt terug, nog niet begonnen zegt vanaf wanneer.
import assert from 'node:assert/strict';
import { tijdStreep } from '../game/js/todotijd.js';

let n = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { process.exitCode = 1; console.log('FAIL', naam, '\n  ', e.message); } };

t('zonder tijd of zonder duur geen streep', () => {
  assert.equal(tijdStreep(null), null);
  assert.equal(tijdStreep({ loopt: true, over: 1, totaal: 0, van: '10:00' }), null);
  assert.equal(tijdStreep({ loopt: true, over: 1, totaal: NaN, van: '10:00' }), null);
});
t('een evenement dat nog niet loopt zegt vanaf wanneer, met een lege streep', () => {
  const s = tijdStreep({ loopt: false, over: 0, totaal: 6, van: '18:00' });
  assert.deepEqual(s, { pct: 0, label: 'Vanaf 18:00', chip: 'Vanaf 18:00' });
});
t('een lopend evenement telt terug in uren en daarna in minuten', () => {
  assert.equal(tijdStreep({ loopt: true, over: 3, totaal: 6, van: '12:00' }).label, 'Nog 3 uur');
  assert.equal(tijdStreep({ loopt: true, over: 3, totaal: 6, van: '12:00' }).pct, 50);
  assert.equal(tijdStreep({ loopt: true, over: 1.2, totaal: 6, van: '12:00' }).label, 'Nog 1 uur');
  assert.equal(tijdStreep({ loopt: true, over: 0.5, totaal: 6, van: '12:00' }).label, 'Nog 30 min');
  assert.equal(tijdStreep({ loopt: true, over: 0.001, totaal: 6, van: '12:00' }).label, 'Nog 1 min');
});
t('de streep blijft tussen 0 en 100 procent, ook bij een klok die buiten het venster valt', () => {
  assert.equal(tijdStreep({ loopt: true, over: 9, totaal: 6, van: '12:00' }).pct, 100);
  assert.equal(tijdStreep({ loopt: true, over: -2, totaal: 6, van: '12:00' }).pct, 0);
  assert.equal(tijdStreep({ loopt: true, over: undefined, totaal: 6, van: '12:00' }).pct, 0);
});

if (process.exitCode) console.log(`todo_tijd_test: ${n} tests, mislukt`);
else console.log(`todo_tijd_test: ${n}/${n} ok`);
