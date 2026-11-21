// Treinrooster (#1085): het filter van de bouwstap (lijnen, dagen, tijden), het gebouwde bestand, de tijdafbeelding op de spelklok,
// de vertraging per rit op het bord en de bron in woorden (Live/Rooster). Geen netwerk, geen THREE.
// Gebruik: node scripts/treinrooster_test.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import { spelLijn, dienstenOp, dagsoortVan as dagsoortLib, secVan, maakRij, sorteerRijen, valideerRooster, STATIONS, SPEL_LIJNEN, SPEL_NAAM as SPEL_LIB } from './treinrooster_lib.mjs';
import { geldigRooster, heeftStation, codesUit, rijenUitRooster, pasVertragingToe, bronNaam, dagsoortVan, laadRooster, SPEL_NAAM } from '../game/js/treinrooster.js';
import { meldSleutel } from '../game/js/livetreinen.js';
import { bronStand, bronLabel, vertrekRegel, leeftijdTekst, SOORT } from '../game/js/treinbron.js';
import { stationView, bordCellen, bordBron } from '../game/js/stationlife.js';
import { weekdayOf } from '../game/js/calendar.js';

// --- de lijnkeuze: de verzonnen lijnnamen van het spel ---
assert.strictEqual(spelLijn({ bestemming: 'Eemshaven', herkomst: 'Veendam', soort: 'RS7' }), 'Stoptrein Roodeschool');
assert.strictEqual(spelLijn({ bestemming: 'Delfzijl', herkomst: 'Groningen', soort: 'RS5' }), 'Stoptrein Delfzijl');
assert.strictEqual(spelLijn({ bestemming: 'Groningen', herkomst: 'Delfzijl', soort: 'RS6' }), 'Stoptrein Delfzijl', 'naar Groningen telt de herkomst');
assert.strictEqual(spelLijn({ bestemming: 'Groningen Europapark', herkomst: 'Leeuwarden', soort: 'RS1' }), 'Stoptrein Leeuwarden');
assert.strictEqual(spelLijn({ bestemming: 'Bad Nieuweschans', herkomst: 'Groningen', soort: 'RE6' }), 'Stoptrein Winschoten');
assert.strictEqual(spelLijn({ bestemming: 'Veendam', herkomst: 'Groningen', soort: 'RS7' }), 'Stoptrein Veendam');
assert.strictEqual(spelLijn({ bestemming: 'Den Haag Centraal', herkomst: 'Groningen', soort: 'Intercity' }), 'Intercity Zwolle');
assert.strictEqual(spelLijn({ bestemming: 'Zwolle', herkomst: 'Groningen', soort: 'Sprinter' }), 'Stoptrein Assen');
assert.strictEqual(spelLijn({ bestemming: 'Assen', herkomst: 'Groningen', soort: 'S61' }), 'Stoptrein Assen');
assert.ok(['Stoptrein Roodeschool', 'Stoptrein Delfzijl', 'Stoptrein Leeuwarden', 'Stoptrein Winschoten', 'Stoptrein Veendam', 'Stoptrein Assen', 'Intercity Zwolle'].every((l) => SPEL_LIJNEN.includes(l)));
assert.ok(STATIONS.includes('Groningen') && STATIONS.includes('Haren') && STATIONS.includes('Zuidhorn') && STATIONS.includes('Delfzijl') && STATIONS.includes('Winschoten'));
assert.deepStrictEqual(SPEL_LIB, SPEL_NAAM, 'bouwstap en spel noemen het centrale station gelijk');
assert.strictEqual(bronNaam('Groningen Hoofdstation'), 'Groningen');

// --- de dagen en de tijden ---
{
  const kal = [['1', '20270818', '1'], ['2', '20270818', '2'], ['3', '20270821', '1'], ['1', '20270821', '1']];
  assert.deepStrictEqual([...dienstenOp(kal, '20270818')], ['1'], 'alleen exception_type 1 telt');
  assert.deepStrictEqual([...dienstenOp(kal, '20270821')].sort(), ['1', '3']);
  assert.deepStrictEqual([0, 1, 5, 6].map(dagsoortLib), ['zo', 'werk', 'werk', 'za']);
  assert.deepStrictEqual([0, 1, 5, 6].map(dagsoortVan), ['zo', 'werk', 'werk', 'za']);
  // de spelkalender: dag 1 is vrijdag 14 augustus, dag 2 zaterdag, dag 3 zondag
  assert.deepStrictEqual([1, 2, 3, 4].map((n) => dagsoortVan(weekdayOf(n))), ['werk', 'za', 'zo', 'werk']);
  assert.strictEqual(secVan('08:17:00'), 8 * 3600 + 17 * 60);
  assert.strictEqual(secVan('25:10:00'), 25 * 3600 + 600, 'GTFS kent tijden boven 24:00');
  assert.strictEqual(secVan('x'), null);
  assert.deepStrictEqual(maakRij({ dep: '25:10:00', arr: '25:08:00', nummer: 7, spoor: '2', bestIdx: 3, lijnIdx: 1 }), [3600 + 600, '7', '2', 3, 1, 3600 + 480], 'na middernacht valt terug op de vroege uren');
  assert.strictEqual(maakRij({ dep: '', arr: '', nummer: 1, bestIdx: 0, lijnIdx: 0 }), null);
  assert.deepStrictEqual(sorteerRijen([[9, 'b'], [3, 'z'], [3, 'a']]).map((r) => r[1]), ['a', 'z', 'b']);
}

// --- het gebouwde bestand ---
const bestandUrl = new URL('../game/treinrooster.json', import.meta.url);
const echt = JSON.parse(fs.readFileSync(bestandUrl, 'utf8'));
{
  assert.ok(geldigRooster(echt), 'het bestand is geldig');
  assert.deepStrictEqual(valideerRooster(echt), []);
  assert.ok(fs.statSync(bestandUrl).size < 400 * 1024, 'compact: onder 400 KB');
  assert.ok(heeftStation(echt, 'Groningen Hoofdstation') && heeftStation(echt, 'Haren') && heeftStation(echt, 'Sauwerd') && heeftStation(echt, 'Zuidhorn') && heeftStation(echt, 'Winsum'), 'de stations van de wereld hebben een rooster');
  assert.ok(codesUit(echt).has('gn') && codesUit(echt).size >= 20);
  // alleen de verzonnen lijnnamen en geen echte merken of vervoerders in het bestand (constitutie 2)
  assert.ok(echt.lijnen.every((l) => SPEL_LIJNEN.includes(l)), 'alleen lijnnamen van het spel');
  const tekst = fs.readFileSync(bestandUrl, 'utf8');
  assert.ok(!/arriva|keolis|qbuzz|blauwnet|connexxion|transdev|r-net|\bNS\b|nederlandse spoorwegen/i.test(tekst), 'geen echte merken of vervoerders in het bestand');
  assert.ok(!/@|http|\.nl|\.com/i.test(tekst.replace(/Open OV-gegevens \(OVapi, gtfs-nl, CC0-1\.0\)/, '')), 'geen url of adres in het bestand');
  assert.ok(/CC0/.test(echt.bron), 'de bron en licentie staan in het bestand');
  const gn = echt.stations.findIndex((s) => s.naam === 'Groningen');
  for (const d of ['werk', 'za', 'zo']) {
    const rijen = echt.rit[d][gn];
    assert.ok(rijen.length > 150, `Groningen heeft op ${d} een echt druk rooster`);
    assert.ok(rijen.every((r, i) => i === 0 || rijen[i - 1][0] <= r[0]), 'gesorteerd op tijd');
  }
  assert.ok(echt.rit.zo[gn].length < echt.rit.werk[gn].length, 'op zondag rijdt er minder dan op een werkdag');
  // de eerste en laatste trein van een werkdag liggen op echte tijden, niet op de verzonnen 05:30 en 23:45 van het oude rooster
  const w = echt.rit.werk[gn];
  assert.ok(w[0][0] >= 0 && w[w.length - 1][0] < 86400);
}

// --- rijen uit het rooster op de spelklok ---
{
  const nu = 8 * 3600 + 10 * 60;   // 08:10 op de spelklok
  const rijen = rijenUitRooster(echt, 'Groningen Hoofdstation', 'werk', nu, { aantal: 6 });
  assert.strictEqual(rijen.length, 6);
  assert.ok(rijen.every((r, i) => r.tijd >= nu - 30 && (i === 0 || rijen[i - 1].tijd <= r.tijd)), 'vanaf nu, op volgorde');
  assert.ok(rijen[0].tijd - nu < 900, 'de eerstvolgende trein vertrekt snel: het rooster is echt');
  assert.ok(rijen.every((r) => SPEL_LIJNEN.includes(r.lijn) && r.richting && r.nummer && r.code === 'gn' && r.vertraging === 0 && !r.vervallen && !r.live));
  assert.deepStrictEqual(rijenUitRooster(echt, 'Onbekend', 'werk', nu), [], 'een station zonder rooster: geen rijen (eigen dienst)');
  assert.deepStrictEqual(rijenUitRooster(null, 'Groningen Hoofdstation', 'werk', nu), []);
  // over middernacht: de vroege ochtend van de volgende dag
  const laat = rijenUitRooster(echt, 'Groningen Hoofdstation', 'werk', 23 * 3600 + 55 * 60, { aantal: 6 });
  assert.ok(laat.some((r) => r.tijd >= 86400), 'na het laatste vertrek volgen de eerste treinen van de volgende dag');
  assert.ok(laat.every((r, i) => i === 0 || laat[i - 1].tijd <= r.tijd));
  // een net vertrokken trein blijft even staan (terug)
  const net = rijenUitRooster(echt, 'Groningen Hoofdstation', 'werk', rijen[1].plan + 20, { aantal: 3, terug: 30 });
  assert.strictEqual(net[0].plan, rijen[1].plan);
  // elke dagsoort heeft rijen
  for (const d of ['werk', 'za', 'zo']) assert.ok(rijenUitRooster(echt, 'Haren', d, 12 * 3600, { aantal: 3 }).length === 3, `Haren ${d}`);
}

// --- de vertraging per rit ---
{
  const nu = 8 * 3600;
  const basis = rijenUitRooster(echt, 'Groningen Hoofdstation', 'werk', nu, { aantal: 4 });
  const [a, b, c] = basis;
  const stand = new Map([
    [meldSleutel(a.nummer, 'gn', a.plan % 86400 / 1), { vertraging: 180, vervallen: false }],
    [meldSleutel(b.nummer, 'gn', b.plan % 86400), { vertraging: 30, vervallen: false }],
    [meldSleutel(c.nummer, 'gn', c.plan % 86400), { vertraging: 0, vervallen: true }],
  ]);
  const uit = pasVertragingToe(basis, stand);
  const ua = uit.find((r) => r.nummer === a.nummer), ub = uit.find((r) => r.nummer === b.nummer), uc = uit.find((r) => r.nummer === c.nummer);
  assert.strictEqual(ua.vertraging, 180); assert.strictEqual(ua.tijd, a.plan + 180); assert.strictEqual(ua.plan, a.plan); assert.ok(ua.live && ua.reden);
  assert.strictEqual(ub.vertraging, 0, 'onder een minuut telt als op tijd'); assert.strictEqual(ub.tijd, b.plan);
  assert.ok(uc.vervallen && uc.live);
  assert.ok(uit.every((r, i) => i === 0 || uit[i - 1].tijd <= r.tijd), 'op verwachte tijd gesorteerd');
  assert.strictEqual(pasVertragingToe(basis, null), basis, 'zonder live stand: het rooster, ongewijzigd');
  assert.strictEqual(pasVertragingToe(basis, new Map()), basis);
  const geen = pasVertragingToe(basis, new Map([['9999|gn|1', { vertraging: 600, vervallen: false }]]));
  assert.ok(geen.every((r, i) => r.vertraging === 0 && r.nummer === basis[i].nummer), 'een melding zonder rit verandert niets');
  // een vertrek na middernacht: de sleutel gebruikt de minuut van de dag
  const nacht = rijenUitRooster(echt, 'Groningen Hoofdstation', 'werk', 23 * 3600 + 58 * 60, { aantal: 8 }).find((r) => r.plan >= 86400);
  if (nacht) {
    const m = pasVertragingToe([nacht], new Map([[meldSleutel(nacht.nummer, 'gn', nacht.plan - 86400), { vertraging: 120, vervallen: false }]]));
    assert.strictEqual(m[0].vertraging, 120, 'ook na middernacht');
  }
}

// --- de bron in woorden: Live of Rooster, nooit alleen kleur ---
{
  const nu = 10_000_000;
  const goed = { aan: true, laatsteOk: nu - 20000, reden: null, aantal: 120 };
  assert.strictEqual(bronStand({ instelling: false, nu }).soort, SOORT.uit);
  assert.strictEqual(bronStand({ instelling: false, nu }).kort, 'Rooster');
  assert.strictEqual(bronStand({ stand: null, nu }).soort, SOORT.rooster);
  assert.strictEqual(bronStand({ stand: { aan: true, laatsteOk: 0, reden: 'netwerk' }, nu }).reden, 'netwerk');
  assert.ok(/niet bereikbaar/.test(bronStand({ stand: { aan: true, laatsteOk: 0, reden: 'netwerk' }, nu }).tekst));
  assert.strictEqual(bronStand({ stand: { aan: true, laatsteOk: 0, reden: null }, nu }).reden, 'laden');
  const live = bronStand({ stand: goed, nu });
  assert.strictEqual(live.soort, SOORT.live); assert.strictEqual(live.kort, 'Live'); assert.ok(/20 s geleden/.test(live.tekst));
  assert.strictEqual(bronStand({ stand: { ...goed, laatsteOk: nu - 200000 }, nu }).soort, SOORT.rooster, 'te oud: Rooster');
  assert.strictEqual(bronStand({ stand: { ...goed, aantal: 0 }, nu }).reden, 'geen');
  assert.ok(Object.values(['netwerk', 'time-out', 'status', 'te-groot', 'ongeldig', 'leeg']).every((r) => !/\b(error|exception|\d{3})\b/i.test(bronStand({ stand: { aan: true, laatsteOk: 0, reden: r }, nu }).tekst)), 'geen foutcodes in beeld');
  assert.strictEqual(leeftijdTekst(2), 'zojuist'); assert.strictEqual(leeftijdTekst(200), '3 min geleden');
  assert.ok(/Bron: open OV-gegevens/.test(bronLabel(live).regel) && bronLabel(live).kort === 'Live');
  assert.ok(/Bron: open OV-gegevens/.test(bronLabel(bronStand({ instelling: false })).regel) && bronLabel(bronStand({ instelling: false })).kort === 'Rooster');
  assert.strictEqual(bronLabel(live, { eigenDienst: true }).kort, 'Rooster (eigen dienst)');
  // de regel van het eerste vertrek
  assert.strictEqual(vertrekRegel({ tijd: 240, vertraging: 0, vervallen: false }, 0), 'Vertrekt over 4 min');
  assert.strictEqual(vertrekRegel({ tijd: 240, vertraging: 180, vervallen: false }, 0), 'Vertrekt over 4 min · 3 min vertraagd');
  assert.strictEqual(vertrekRegel({ tijd: 10, vertraging: 0, vervallen: false }, 0), 'Vertrekt nu');
  assert.strictEqual(vertrekRegel({ tijd: 60, vertraging: 0, vervallen: false }, 0), 'Vertrekt over 1 min');
  assert.strictEqual(vertrekRegel({ tijd: 600, vertraging: 59, vervallen: false }, 0), 'Vertrekt over 10 min', 'onder een minuut: niet vertraagd');
  assert.strictEqual(vertrekRegel({ tijd: 600, vertraging: 0, vervallen: true }, 0), 'Deze trein rijdt niet');
  assert.strictEqual(vertrekRegel(null, 0), '');
}

// --- het bord (stationlife.js): echte rijen, vertraging, bron ---
{
  const lijnenStub = [{ name: 'Stoptrein Delfzijl', stops: [{ name: 'Groningen Hoofdstation', s: 0 }, { name: 'Delfzijl', s: 30000 }] }];
  const station = { name: 'Groningen Hoofdstation', x: 0, y: 0, tx: 1, ty: 0, lijnen: lijnenStub };
  const klok = 8 + 10 / 60;
  const viewRooster = stationView(station, klok, 3, null, 60, { rooster: echt, dagsoort: 'werk', live: null });
  assert.ok(viewRooster.echtRooster && viewRooster.bord.length === 5 && viewRooster.eerst);
  assert.ok(viewRooster.bord.every((r) => r.spoor !== undefined && !r.live));
  const eersteRij = viewRooster.bord[0];
  const live = new Map([[meldSleutel(eersteRij.nummer, 'gn', eersteRij.plan), { vertraging: 240, vervallen: false }]]);
  const viewLive = stationView(station, klok, 3, null, 60, { rooster: echt, dagsoort: 'werk', live });
  const vertraagd = viewLive.bord.find((r) => r.nummer === eersteRij.nummer);
  assert.strictEqual(vertraagd.vertraging, 240);
  const cellen = bordCellen(viewLive);
  const cel = cellen.find((c) => c.cls === 'bad');
  assert.ok(cel && /\+4$/.test(cel.t), 'het bord toont +4 bij de vertraagde trein', cel && cel.t);
  const bron = bordBron(viewLive, { instelling: true, liveStand: { aan: true, laatsteOk: Date.now() - 5000, aantal: 50 } });
  assert.strictEqual(bron.kort, 'Live'); assert.ok(/Bron: open OV-gegevens/.test(bron.regel));
  assert.ok(/^Vertrekt (nu|over \d+ min)( · \d+ min vertraagd)?$/.test(bron.eerste), bron.eerste);
  const zonder = bordBron(viewRooster, { instelling: true, liveStand: null });
  assert.strictEqual(zonder.kort, 'Rooster'); assert.ok(/Bron: open OV-gegevens/.test(zonder.regel));
  const uit = bordBron(viewRooster, { instelling: false, liveStand: { aan: true, laatsteOk: Date.now(), aantal: 5 } });
  assert.strictEqual(uit.kort, 'Rooster');
  // een vervallen rit staat als "vervalt" en telt niet als eerstvolgende
  const vervalt = new Map([[meldSleutel(eersteRij.nummer, 'gn', eersteRij.plan), { vertraging: 0, vervallen: true }]]);
  const viewV = stationView(station, klok, 3, null, 60, { rooster: echt, dagsoort: 'werk', live: vervalt });
  assert.notStrictEqual(viewV.eerst.nummer, eersteRij.nummer);
  assert.ok(bordCellen(viewV).some((c) => /vervalt/.test(c.t) && c.cls === 'bad'));
  // een station zonder echt rooster houdt zijn eigen dienst en zegt dat
  const eigen = { name: 'Onbekend Station', x: 0, y: 0, tx: 1, ty: 0, lijnen: lijnenStub };
  const ve = stationView(eigen, klok, 3, null, 60, { rooster: echt, dagsoort: 'werk', live: null });
  assert.ok(!ve.echtRooster);
  const be = bordBron(ve, { instelling: true });
  assert.strictEqual(be.kort, 'Rooster (eigen dienst)'); assert.strictEqual(be.eerste, '');
  // zonder rooster-argument: precies het oude gedrag
  const oud = stationView(station, klok, 3, null, 60);
  assert.ok(!oud.echtRooster);
  // de omroep gebruikt de vertraging en geen lege reden
  assert.ok(!/\s\.$/.test(viewLive.tekst));
}

// --- het laden ---
{
  assert.strictEqual(await laadRooster(async () => { throw new Error('x'); }, 'http://localhost/'), null, 'faalt zacht');
  assert.strictEqual(await laadRooster(async () => ({ ok: false }), 'http://localhost/'), null);
  assert.strictEqual(await laadRooster(async () => ({ ok: true, json: async () => ({ v: 2 }) }), 'http://localhost/'), null, 'een ongeldig bestand telt niet');
  let url = '';
  assert.ok(geldigRooster(await laadRooster(async (u) => { url = u; return { ok: true, json: async () => echt }; }, 'http://localhost/game/index.html')));
  assert.strictEqual(url, 'http://localhost/game/treinrooster.json', 'een lokaal bestand naast index.html');
  assert.strictEqual(await laadRooster(null, 'http://localhost/'), null);
}

console.log('treinrooster_test: ok');
