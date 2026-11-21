// AAA bijbanen, tweede ronde: het ritueel, de klantpraatjes en de reeks (game/js/sidejobbeats.js), en de koppeling in sidejobs.js.
//   node scripts/sidejobbeats_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BIJBAAN_BEATS, BEAT_LIJNEN, openingVan, klantPraatje, reeksMelding, reeksTekst, reeksBonusPct, eindregel, alleBeatRegels } from '../game/js/sidejobbeats.js';

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); } };

t('de zes bijbaanlijnen hebben een ritueel (taxi, bus, trein/lijn, bezorger, krantenwijk, rondvaart)', () => {
  for (const id of ['taxi', 'bus', 'lijn', 'bezorger', 'krantenwijk', 'rondvaart', 'rondvaarttour']) assert.ok(BEAT_LIJNEN.includes(id), id);
});
t('elke lijn heeft een opening, minstens drie klantpraatjes en drie slotregels', () => {
  for (const [id, b] of Object.entries(BIJBAAN_BEATS)) {
    assert.ok(b.open && b.eerst, id + ' open');
    assert.ok(b.klant.length >= 3, id + ' klanten');
    assert.ok(b.eind.goed && b.eind.mager && b.eind.mis, id + ' eind');
  }
});
t('de eerste twee diensten krijgen de uitleg met toetsplaatje, daarna de korte opening', () => {
  assert.match(openingVan('krantenwijk', 1), /\{E\}/);
  assert.match(openingVan('taxi', 2), /\{E\}/);
  assert.equal(openingVan('taxi', 3), BIJBAAN_BEATS.taxi.open);
  assert.equal(openingVan('onbekend', 1), null);
});
t('klantpraatjes draaien met de ronde mee en zijn deterministisch', () => {
  const a = klantPraatje('taxi', 0, 0), b = klantPraatje('taxi', 1, 0);
  assert.notEqual(a, b);
  assert.equal(klantPraatje('taxi', 0, 0), a);
  const lijst = BIJBAAN_BEATS.taxi.klant;
  assert.equal(klantPraatje('taxi', lijst.length, 0), a); // na een hele ronde weer van voren
  assert.equal(klantPraatje('onbekend', 0), null);
  for (let r = -3; r < 40; r++) assert.ok(typeof klantPraatje('bus', r, 0.99) === 'string');
});
t('de reeksbonus is dezelfde 6% per klus als in sidejobs.js, maximaal 10 klussen', () => {
  assert.equal(reeksBonusPct(0), 0);
  assert.equal(reeksBonusPct(4), 24);
  assert.equal(reeksBonusPct(10), 60);
  assert.equal(reeksBonusPct(25), 60);
  const bron = fs.readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  assert.match(bron, /1 \+ 0\.06 \* Math\.min\(c\.streak, 10\)/, 'het loon gebruikt nog dezelfde reeksformule');
});
t('mijlpalen komen op 3, 5, 8 en 10 en zeggen wat de volgende klus betaalt', () => {
  assert.equal(reeksMelding(2), null);
  assert.match(reeksMelding(3), /18%/);
  assert.match(reeksMelding(5), /30%/);
  assert.ok(reeksMelding(8) && reeksMelding(10));
  assert.match(reeksMelding(10), /maximum/);
  assert.equal(reeksTekst(0), 'reeks 0');
  assert.equal(reeksTekst(4), 'reeks 4 (+24%)');
});
t('de slotregel volgt de dienst: goed, mager of mis', () => {
  assert.equal(eindregel('bus', { kind: 'quit', streak: 5 }), BIJBAAN_BEATS.bus.eind.goed);
  assert.equal(eindregel('bus', { kind: 'quit', streak: 1 }), BIJBAAN_BEATS.bus.eind.mager);
  assert.equal(eindregel('bus', { kind: 'quit', streak: 0 }), BIJBAAN_BEATS.bus.eind.mis);
  assert.equal(eindregel('bus', { kind: 'fail', streak: 9 }), BIJBAAN_BEATS.bus.eind.mis);
  assert.equal(eindregel('onbekend', {}), null);
});
t('tekstregels: geen echte merken, geen winter, geen losse toetsletter, alles heeft eindleesteken', () => {
  const VERBODEN = /\b(winter|sneeuw|ijs|uber|bolt|ns|arriva|qbuzz|thuisbezorgd|marktplaats|google|facebook)\b/i;
  for (const r of alleBeatRegels()) {
    assert.ok(!VERBODEN.test(r.tekst), `${r.id} ${r.soort}: ${r.tekst}`);
    assert.ok(!/\b(druk op|toets) [A-Z]\b/.test(r.tekst), `losse toetsletter: ${r.tekst}`);
    assert.ok(/[.!?"]$/.test(r.tekst), `eindleesteken: ${r.tekst}`);
    assert.ok(r.tekst.length <= 160, `te lang (${r.tekst.length}): ${r.tekst}`);
  }
});
t('sidejobs.js roept het ritueel aan bij start, na een klus en bij het einde', () => {
  const bron = fs.readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  for (const naam of ['openingVan(', 'klantPraatje(', 'reeksMelding(', 'reeksTekst(', 'eindregel(']) assert.ok(bron.includes(naam), naam);
});
t('het klantpraatje en de reeksmelding komen alleen op het scherm van de eigen dienst (niet bij de baan van een gast)', () => {
  const bron = fs.readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  const regel = bron.split('\n').find((l) => l.includes('const pr = klantPraatje('));
  assert.ok(regel && /^\s*if \(host\) try \{/.test(regel), 'bewaakt met host (owner === 0), zoals de opening');
});

console.log(`\n${n - fails}/${n} geslaagd`);
