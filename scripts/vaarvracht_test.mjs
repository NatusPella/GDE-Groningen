// Vracht voor het water (#1376, W4): de contracten van De Drie Zusters. Pure test: geen wereld, geen klok, geen willekeur.
//   node scripts/vaarvracht_test.mjs
import assert from 'node:assert/strict';
import * as V from '../game/js/vaarvracht.js';
import * as R from '../game/js/binnenvaartrules.js';
import { GOODS, isGood } from '../game/js/deliveries.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const KADES = R.KADES.map((k) => k.id);

t('elk paar kades heeft minstens één goed dat aan de ene kant ligt en aan de andere wordt aangenomen; alle goederen komen uit deliveries.js', () => {
  for (const a of KADES) for (const b of KADES) {
    if (a === b) { assert.deepEqual(V.goederenTussen(a, b), [], 'van een kade naar zichzelf is geen vracht'); continue; }
    const g = V.goederenTussen(a, b);
    assert.ok(g.length > 0, `${a} naar ${b}`);
    assert.ok(g.every((x) => isGood(x) && V.GOEDEREN[x]), `${a} naar ${b}: bekende goederen`);
  }
  for (const k of KADES) assert.ok(V.KADEKLANTEN[k] && V.KADEKLANTEN[k].klant.length > 5, `${k}: een verzonnen klant`);
  assert.deepEqual(V.goederenTussen('onbekend', 'west'), []);
  for (const id of Object.keys(V.GOEDEREN)) assert.ok(GOODS[id], `${id} staat in het register van goederen`);
});

t('hetzelfde aanbod voor dezelfde seed, kade en niveau; drie aanbiedingen die echt van de kade vertrekken', () => {
  for (const van of KADES) {
    const a = V.maakAanbod(1234, van, 2), b = V.maakAanbod(1234, van, 2);
    assert.deepEqual(a, b);
    assert.equal(a.length, V.AANBOD_AANTAL);
    for (const c of a) {
      assert.equal(c.van, van);
      assert.notEqual(c.naar, van);
      assert.equal(c.overtocht, `${c.van}-${c.naar}`);
      assert.ok(R.overtochtById(c.overtocht), 'de overtocht bestaat');
      assert.equal(c.klantVan, V.KADEKLANTEN[van].klant);
      assert.ok(V.KADEKLANTEN[c.van].levert.includes(c.good) && V.KADEKLANTEN[c.naar].neemt.includes(c.good), 'het goed ligt hier en wordt daar aangenomen');
      assert.ok(c.hoeveelheid > 0 && c.afstandKm > 0 && c.tariefPerKm > 0 && c.laadSeconden > 0 && c.losSeconden > 0);
    }
  }
  const seeds = new Set();
  for (let s = 0; s < 60; s++) for (const c of V.maakAanbod(s, 'rustpunt', 1)) seeds.add(`${c.naar}:${c.good}`);
  assert.ok(seeds.size >= 4, 'het aanbod wisselt met de seed');
  assert.deepEqual(V.maakAanbod(1, 'nergens', 1), [], 'een onbekende kade geeft geen aanbod');
  assert.ok(V.maakAanbod(NaN, 'oost', NaN).length > 0, 'rare invoer valt terug op bruikbare waarden');
});

t('het loon is afstand x tarief + toeslag, nooit negatief; een ervaren schipper krijgt een hogere toeslag; rare invoer breekt niets', () => {
  const c = { afstandKm: 4, tariefPerKm: 35, toeslag: 60 };
  assert.equal(V.contractLoon(c), 200);
  assert.equal(V.contractLoon(null), 0);
  assert.equal(V.contractLoon({ afstandKm: -5, tariefPerKm: -3, toeslag: -9 }), 0);
  assert.ok(V.contractLoon({ afstandKm: 1e9, tariefPerKm: 35, toeslag: 60 }) < 5000, 'een absurde afstand wordt begrensd');
  assert.equal(V.contractLoon({ afstandKm: NaN, tariefPerKm: NaN, toeslag: NaN }), 0);
  const laag = V.maakAanbod(9, 'rustpunt', 1)[0], hoog = V.maakAanbod(9, 'rustpunt', 5)[0];
  assert.equal(laag.good, hoog.good);
  assert.ok(hoog.toeslag > laag.toeslag, 'meer toeslag op een hoger niveau');
});

t('brandstof en kadegeld gaan van het loon af, in hele euros; het netto loon is nooit negatief', () => {
  const k = V.overtochtKosten(4);
  assert.ok(Number.isInteger(k.brandstof) && k.brandstof > 0 && k.kadegeld === V.KADEGELD && k.totaal === k.brandstof + k.kadegeld);
  assert.ok(V.overtochtKosten(8).brandstof > k.brandstof, 'verder varen kost meer brandstof');
  assert.equal(V.overtochtKosten(NaN).totaal, V.overtochtKosten(0).totaal);
  const c = { afstandKm: 4, tariefPerKm: 35, toeslag: 60 };
  assert.equal(V.nettoLoon(c), 200 - k.totaal);
  assert.equal(V.nettoLoon({ afstandKm: 0, tariefPerKm: 1, toeslag: 0 }), 0, 'een rit die niets oplevert kost je niet meer dan het loon');
  for (const o of R.overtochten()) for (const c2 of V.maakAanbod(3, o.van, 1)) assert.ok(V.nettoLoon(c2) > 0, `${c2.overtocht}: een echte overtocht loont`);
});

t('laad- en lostijd komen uit het contract en zijn begrensd', () => {
  const c = V.maakAanbod(5, 'west', 1)[0];
  assert.equal(V.laadTijd(c), c.laadSeconden);
  assert.equal(V.losTijd(c), c.losSeconden);
  assert.equal(V.laadTijd({ laadSeconden: 1e6 }), V.TIJD_MAX);
  assert.equal(V.laadTijd(null), 0);
  assert.equal(V.losTijd({ losSeconden: -4 }), 0);
});

t('een overtocht met contract: de uitslag is het netto loon plus een tijdpremie; mislukt blijft mislukt', () => {
  const c = V.maakAanbod(11, 'rustpunt', 1)[0];
  const s = R.maakOvertocht(c.overtocht, 1, { ladenS: V.laadTijd(c), lossenS: V.losTijd(c) });
  assert.equal(s.ladenS, c.laadSeconden);
  assert.equal(s.lossenS, c.losSeconden);
  s.klaar = true; s.t = s.budget * 0.5;
  const u = V.leveringUitslag(c, s);
  assert.equal(u.failed, false);
  assert.ok(u.base >= V.nettoLoon(c) && u.base <= V.nettoLoon(c) + V.TIJDPREMIE_MAX, 'netto loon plus hoogstens de premie');
  assert.equal(u.bruto, V.contractLoon(c));
  assert.ok(u.text.includes(V.contractTekst(c)), 'de tekst noemt de lading en het tarief');
  s.tehard = 3;
  assert.ok(V.leveringUitslag(c, s).base < u.base, 'te hard bij de kade kost loon');
  const mis = R.maakOvertocht(c.overtocht, 1);
  assert.equal(V.leveringUitslag(c, mis).failed, true, 'een onafgemaakte overtocht geeft niets');
  assert.equal(V.leveringUitslag(null, s).base, R.uitslagVan(s).base, 'zonder contract is het de gewone uitslag');
});

t('een levering heeft een vaste id: dezelfde seed geeft dezelfde id, een ander goed of een andere kade een andere', () => {
  assert.equal(V.leveringId(5, 'west', 'oost', 'kisten'), V.leveringId(5, 'west', 'oost', 'kisten'));
  assert.notEqual(V.leveringId(5, 'west', 'oost', 'kisten'), V.leveringId(5, 'west', 'oost', 'zand'));
  assert.notEqual(V.leveringId(5, 'west', 'oost', 'kisten'), V.leveringId(6, 'west', 'oost', 'kisten'));
  assert.match(V.leveringId(5, 'west', 'oost', 'kisten'), /^vaar:[a-z0-9]+:west:oost:kisten$/);
  for (const c of V.maakAanbod(7, 'oost', 1)) assert.equal(c.id, V.leveringId(7, c.van, c.naar, c.good));
});

t('een contract uit een onbekende bron wordt gecontroleerd: kades, goed en getallen', () => {
  const c = V.maakAanbod(2, 'west', 1)[0];
  assert.deepEqual(V.leesContract(JSON.parse(JSON.stringify(c))), c, 'een eigen contract blijft gelijk');
  assert.equal(V.leesContract(null), null);
  assert.equal(V.leesContract({ ...c, good: 'goud' }), null, 'een onbekend goed');
  assert.equal(V.leesContract({ ...c, van: 'west', naar: 'west' }), null, 'van en naar gelijk');
  assert.equal(V.leesContract({ ...c, naar: 'mars' }), null, 'een onbekende kade');
  const raar = V.leesContract({ ...c, hoeveelheid: 'veel', afstandKm: 1e9, tariefPerKm: -1, laadSeconden: 1e9 });
  assert.ok(raar.hoeveelheid >= 1 && raar.afstandKm <= 60 && raar.tariefPerKm === 0 && raar.laadSeconden === V.TIJD_MAX);
});

t('de tekst voor het scherm noemt de hoeveelheid, het goed, de klant en het tarief; in ton voor kg-goederen; altijd zomer', () => {
  const kg = { good: 'bieten', eenheid: 'kg', hoeveelheid: 42000, klantNaar: 'Suikerhal Oostkade', tariefPerKm: 34 };
  assert.equal(V.contractTekst(kg), '42 ton suikerbieten voor Suikerhal Oostkade, €34 per km');
  const st = { good: 'kisten', eenheid: 'pcs', hoeveelheid: 300, klantNaar: 'Pakhuis De Westhoek', tariefPerKm: 41 };
  assert.match(V.contractTekst(st), /^300 kisten voor Pakhuis De Westhoek/);
  assert.equal(V.contractTekst(null), '');
  const alles = JSON.stringify(V.KADEKLANTEN) + JSON.stringify(V.GOEDEREN);
  assert.ok(!/winter|sneeuw|ijs\b/i.test(alles), 'altijd zomer');
  assert.ok(Object.values(GOODS).length >= Object.keys(V.GOEDEREN).length);
});

console.log(`vaarvracht_test: ${n} groepen ok`);
