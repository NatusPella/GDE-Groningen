// Samen spelen (#95): coöp-activiteiten in de open wereld (game/js/coopactivities.js).
import assert from 'node:assert/strict';
import * as A from '../game/js/coopactivities.js';
import { registerCoop, coopRegel, isGeregistreerd } from '../game/js/cooproles.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('alle gewenste soorten staan in het cooproles-model: achtervolging, overval, minigames, reuzenrad, padel dubbel', () => {
  for (const id of ['achtervolging', 'overval', 'reuzenrad', 'padel-dubbel', 'kartrace-duo']) {
    assert.equal(isGeregistreerd('activiteit', id), true, id);
    assert.equal(coopRegel('activiteit', id).spelers, 'twee');
  }
});
t('namen en teksten zijn Nederlands, verzonnen, en tonen geen geweld', () => {
  for (const a of A.CATALOGUS) {
    assert.ok(a.naam.length > 3 && a.tekst.length > 10);
    assert.doesNotMatch(a.naam + a.tekst, /doden|vermoord|bloed|schiet|slachtoffer/i, a.id);
  }
});
t('starten: medespeler nodig, dichtbij, niet tijdens een andere opdracht', () => {
  assert.match(A.mayStart('padel-dubbel', { samen: false, afstand: 0 }).reden, /medespeler/);
  assert.match(A.mayStart('padel-dubbel', { samen: true, afstand: 200 }).reden, /te ver/);
  assert.match(A.mayStart('padel-dubbel', { samen: true, afstand: 5, actief: true }).reden, /lopende opdracht/);
  assert.deepEqual(A.mayStart('padel-dubbel', { samen: true, afstand: 5 }), { ok: true });
  assert.match(A.mayStart('bestaat-niet', { samen: true, afstand: 0 }).reden, /kennen we niet/);
});
t('slagen: samen precies de beloning, ieder naar zijn bijdrage, medaille op het totaal', () => {
  const a = A.createActivity('overval');
  A.addPoints(a, 0, 8); A.addPoints(a, 1, 12);
  const u = A.complete(a);
  assert.equal(u.geslaagd, true); assert.equal(a.state, 'geslaagd');
  assert.equal(u.geld[0] + u.geld[1], 600); assert.ok(u.geld[1] > u.geld[0]); assert.equal(u.medaille, 'goud');
  assert.equal(A.complete(a), u, 'tweede keer geeft hetzelfde');
});
t('zonder punten delen ze gelijk; negatieve punten tellen niet', () => {
  const a = A.createActivity('reuzenrad'); A.addPoints(a, 0, -5);
  const u = A.complete(a); assert.deepEqual(u.geld, [75, 75]); assert.equal(a.punten[0], 0);
});
t('tijd om: mislukt met een klein bedrag, geen medaille', () => {
  const a = A.createActivity('reuzenrad');
  assert.equal(A.tick(a, 100), 'bezig'); assert.equal(A.tick(a, 100), 'mislukt');
  assert.equal(a.uitkomst.geslaagd, false); assert.equal(a.uitkomst.geld[0] + a.uitkomst.geld[1] <= 15, true); assert.equal(a.uitkomst.medaille, null);
});
t('wegvallen van een speler: afgebroken, geen beloning, geen straf', () => {
  const a = A.createActivity('achtervolging'); A.addPoints(a, 0, 5);
  assert.equal(A.cancel(a, 'verbinding weg'), 'afgebroken');
  assert.equal(A.complete(a), null); assert.equal(A.tick(a, 1000), 'afgebroken');
});
t('uitbetalen: ieder in zijn eigen portemonnee, precies een keer', () => {
  const a = A.createActivity('padel-dubbel'); A.addPoints(a, 0, 5); A.addPoints(a, 1, 5); A.complete(a);
  const wallet = [0, 0];
  assert.equal(A.payOut(a, (slot, g) => { wallet[slot] += g; }), true);
  assert.equal(wallet[0] + wallet[1], 200); assert.equal(wallet[0], wallet[1]);
  assert.equal(A.payOut(a, () => { throw new Error('dubbel'); }), false);
});
t('uitbreidbaar: een nieuwe activiteit registreren is genoeg', () => {
  registerCoop('activiteit', 'reuzenrad-nacht', { spelers: 'twee', beloning: 99, tijd: 60 });
  assert.equal(A.mayStart('reuzenrad-nacht', { samen: true, afstand: 1 }).ok, true);
  assert.equal(A.complete(A.createActivity('reuzenrad-nacht')).geld[0], 49);
  assert.throws(() => registerCoop('activiteit', 'x', { spelers: 'twee', beloning: -1 }));
});
console.log(`coopactivities_test: ${n}/${n} ok`);
