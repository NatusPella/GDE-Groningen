// #670: de machinist heeft één actieve vaardigheid (vloeiend remmen), de conducteur één keuze per dienst en de
// dienst heeft een uitslag/medaille. Puur: dezelfde regels die het bord en de dienst gebruiken.
//   node scripts/machinistdienst_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../game/js/machinistrules.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#670: vloeiend remmen voor het perron geeft directe feedback', () => {
  assert.equal(R.remVloeiend({ speed: 0, toStop: 0 }).punten, 100, 'stil op de halte');
  assert.match(R.remVloeiend({ speed: 0, toStop: 0 }).tekst, /netjes/);
  const ruim = R.remVloeiend({ speed: 10, toStop: 200 });
  assert.equal(ruim.punten, 80); assert.match(ruim.tekst, /Ruim op tijd/);
  const vlakbij = R.remVloeiend({ speed: 10, toStop: 40, remweg: 30 });
  assert.equal(vlakbij.punten, 100, 'vloeiend geremd'); assert.match(vlakbij.tekst, /Vloeiend/);
  assert.equal(R.remVloeiend({ speed: 10, toStop: 25, remweg: 30 }).punten, 60, 'iets laat');
  assert.equal(R.remVloeiend({ speed: 10, toStop: 10, remweg: 30 }).punten, 15, 'te laat');
  assert.equal(R.remVloeiend({ speed: 10, toStop: -1, remweg: 30 }).punten, 20, 'voorbij de halte');
  assert.equal(R.remVloeiend({ speed: 10, toStop: Infinity }).punten, 0, 'geen halte');
});

t('#670: de conducteur heeft per dienst één echte keuze met een klein effect', () => {
  const a = R.conducteurKeuze(0), b = R.conducteurKeuze(0), c = R.conducteurKeuze(1);
  assert.equal(a.id, b.id, 'dezelfde dienst geeft dezelfde keuze');
  assert.notEqual(a.id, c.id, 'een andere dienst geeft een andere keuze');
  assert.ok(R.CONDUCTEUR_KEUZES.length >= 3, 'minstens drie situaties');
  assert.ok(a.vraag.length > 10 && a.opties.length === 2, 'een vraag met twee opties');
  for (const o of a.opties) { assert.ok(o.tekst && Number.isFinite(o.effect.tip) && Number.isFinite(o.effect.punct)); }
  const bon = R.pasConducteur(a, a.opties[0].id);
  assert.equal(bon.ok, true); assert.ok(bon.tip > 0); assert.ok(bon.tekst.length > 10);
  assert.equal(R.pasConducteur(a, 'bestaatniet').ok, false);
  assert.equal(R.pasConducteur(null, 'bon').ok, false);
});

t('#670: de dienst heeft één uitslag: op tijd, veilig en alle halten', () => {
  const goud = R.dienstMedaille({ gemiddelde: 95, halten: 6, opTijd: 95, veilig: 100, fouten: 0 });
  assert.equal(goud.index, 3); assert.equal(goud.naam, 'Goud');
  const zilver = R.dienstMedaille({ gemiddelde: 75, halten: 6, opTijd: 80, veilig: 100, fouten: 0 });
  assert.equal(zilver.index, 2); assert.equal(zilver.naam, 'Zilver');
  const brons = R.dienstMedaille({ gemiddelde: 55, halten: 4, opTijd: 60, veilig: 100, fouten: 0 });
  assert.ok(brons.index >= 1);
  const geen = R.dienstMedaille({ gemiddelde: 10, opTijd: 10, veilig: 40, fouten: 4 });
  assert.equal(geen.index, 0); assert.equal(geen.naam, 'Geen medaille');
  assert.deepEqual(R.DIENST_MEDAILLES, ['Geen medaille', 'Brons', 'Zilver', 'Goud']);
  assert.ok(goud.punten > zilver.punten && zilver.punten > geen.punten);
});

t('#670: de dienst gebruikt dezelfde regel en de vaardigheid staat op het bord', () => {
  const m = bron('machinist.js');
  assert.match(m, /dienstMedaille\(\{ gemiddelde: r\.score, halten: r\.stops, opTijd: r\.punct, veilig: r\.veilig, fouten: r\.faults \}\)/, 'de uitslag komt uit dezelfde regel');
  assert.match(m, /r\.dienstMedaille = dm\.naam/, 'de medaille gaat mee in de uitslag');
  assert.match(bron('machinistrules.js'), /export function remVloeiend/, 'de vaardigheid staat in de pure regels');
  assert.match(bron('treincabine.js'), /brakeFrac|brakeM/, 'het bord toont de remweg al (de feedback van de vaardigheid)');
});

t('#670: de conducteurskeuze hangt aan toets 1/2 in de cabine en de fooi telt mee', () => {
  const m = bron('machinist.js');
  assert.match(m, /conducteurKeuze\(svc\.plan\.length \* 5 \+ Math\.floor\(world\.time\)\)/, 'de keuze hoort bij de dienst');
  assert.match(m, /world\.addMessage\(`\$\{kz\.vraag\}/, 'de vraag staat met de twee opties in beeld');
  assert.match(m, /for \(const toets of \['1', '2'\]\)/, 'toets 1 en 2 kiezen');
  assert.match(m, /pasConducteur\(svc\.conducteur\.keuze, optie && optie\.id\)/, 'de keuze gebruikt de pure regel');
  assert.match(m, /svc\.conducteur\.gekozen = optie\.id/, 'de keuze wordt één keer bewaard');
  assert.match(m, /\+ \(svc\.conducteur && svc\.conducteur\.gekozen \? svc\.conducteur\.tip \| 0 : 0\)/, 'de fooi telt mee in de beloning');
});

console.log(`machinistdienst_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
