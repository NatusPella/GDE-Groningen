// Samen spelen (#439): de overdracht van het spel (coophostwissel.js): formaat van de momentopname, alle paden van de toestandsmachine,
// time-outs, ongeldige berichten en: een mislukte overdracht laat de oude host host. Puur, zonder netwerk.
import assert from 'node:assert/strict';
import { maakMomentopname, codeerMomentopname, leesMomentopname, controlegetal, OudeHost, NieuweHost, leesVerbind, isHostwissel, HW, TIJD, STUK, MAX_LEN, bodTekst, pauzeTekst, mislukTekst } from '../game/js/coophostwissel.js';
import { encodeJson, decodeJson, T, MAX_JSON, CODEC_VERSION } from '../game/js/net/codec.js';
import { Reliable, PROTO } from '../game/js/net/protocol.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const gelijk = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

ok(PROTO === 2 && CODEC_VERSION === 2, 'PROTO en CODEC_VERSION blijven 2');
const VER = { game: 'gde', proto: 2, version: '0.45.0', tiles: 't1', story: 's1' };
const inv = (extra = {}) => ({
  ver: VER, zaad: 12345, tijd: { dag: 3, uur: 14.256, tempo: 1 }, weer: 'zon', wanted: { niveau: 2, hitte: 40.5 },
  opdracht: { id: 'M12', stap: 3, staat: 'bezig', t: 61.2 },
  spelers: [{ slot: 0, naam: 'Tammo', char: 'tammo', geld: 1200, health: 80, x: 10.123, y: -4, z: 0, voertuig: 'v7' }, { slot: 2, naam: 'Noor', char: 'noor', geld: 50, health: 100, x: 12, y: -3, z: 0.5 }],
  kapot: Array.from({ length: 300 }, (_, i) => 'obj' + i), voertuigen: [{ id: 'v7', soort: 'auto', x: 10, y: -4, z: 0, hoek: 1.5, schade: 0.3 }], ...extra,
});

// ---- het formaat
const m = maakMomentopname(inv());
ok(m.v === 1 && m.tijd.uur === 14.26 && m.spelers[0].x === 10.12, 'afronden');
gelijk(leesMomentopname(JSON.stringify(m)), m, 'heen en terug');
const pak = codeerMomentopname(m);
ok(pak.len === pak.json.length && pak.sum === controlegetal(pak.json) && pak.stukken.join('') === pak.json, 'stukken, lengte en controlegetal');
ok(controlegetal('a') !== controlegetal('b') && controlegetal('') === '811c9dc5', 'controlegetal');
ok(leesMomentopname('{kapot') === null && leesMomentopname('[]') === null && leesMomentopname('{"v":9}') === null && leesMomentopname('null') === null, 'onzin wordt geweigerd');
ok(leesMomentopname(JSON.stringify({ ...m, spelers: 'x' })) === null, 'verkeerd type');
const rommel = maakMomentopname({ ...inv(), tijd: { dag: -5, uur: NaN, tempo: 'x' }, wanted: { niveau: 99 }, spelers: Array.from({ length: 40 }, (_, i) => ({ slot: i, geld: -9 })), kapot: Array.from({ length: 900 }, (_, i) => i) });
ok(rommel.tijd.dag === 0 && rommel.tijd.uur === 0 && rommel.wanted.niveau === 5 && rommel.spelers.length === 16 && rommel.spelers[0].geld === 0 && rommel.kapot.length === 400, 'begrenzing');
ok(codeerMomentopname(maakMomentopname({ ...inv(), opdracht: { id: 'x'.repeat(10) } })) !== null, 'klein genoeg');
ok(MAX_LEN >= pak.len * 10, 'ruime marge');
// elk stuk past (ook met veel aanhalingstekens) door de echte codec
const gemeen = 'a"\\é'.repeat(STUK / 4);
ok(encodeJson(T.EVENT, 1, 0, 1, { k: HW.STUK, id: 16777215, i: 81, d: gemeen }).length <= MAX_JSON + 16, 'worst-case stuk binnen MAX_JSON');
for (const s of pak.stukken) { const b = decodeJson(encodeJson(T.EVENT, 1, 0, 1, { k: HW.STUK, id: 1, i: 0, d: s })); ok(b && b.body.d === s, 'codec'); }

// ---- de berichten door de echte Reliable-laag, in omgekeerde volgorde
function reken(msg) { return decodeJson(encodeJson(T.EVENT, 1, 0, 1, msg)).body; } // wat er na de codec overblijft
const verkeer = (uit) => uit.map(reken);

// ---- een compleet geslaagde overdracht
function nieuw() { return { oud: new OudeHost({ ver: VER, naam: 'Tammo' }), nw: new NieuweHost({ ver: VER }) }; }
function bod(oud, nu = 0, groot = null) {
  const r = oud.bied(2, groot || m, 77, nu);
  return r;
}
{
  const { oud, nw } = nieuw();
  const r = bod(oud);
  ok(oud.fase === 'aangeboden' && oud.isHost && oud.bezig, 'aangeboden, oude host blijft host');
  ok(r.uit.length === 1 && r.uit[0].k === HW.BOD && r.uit[0].n === pak.stukken.length && r.uit[0].sum === pak.sum, 'bod');
  ok(nw.ontvang(reken(r.uit[0]), 0, 0).uit.length === 0 && nw.fase === 'gevraagd', 'melding bij de ander');
  ok(oud.ontvang(reken({ k: HW.JA, id: 77 }), 3, 1).uit.length === 0 && oud.fase === 'aangeboden', 'ja van een andere plek telt niet');
  const ja = nw.antwoord(true, 2).uit;
  ok(ja[0].k === HW.JA && nw.fase === 'ontvangt', 'ja');
  oud.ontvang(reken(ja[0]), 2, 2);
  ok(oud.fase === 'sturen', 'sturen');
  let stukken = [], tikken = 0;
  while (oud.fase === 'sturen') { stukken.push(...oud.tik(3 + tikken * 0.1, 4).uit); tikken++; }
  ok(stukken.length === pak.stukken.length && oud.fase === 'laden', 'alle stukken uitgegeven');
  const tel = new OudeHost({ ver: VER }); tel.bied(2, m, 5, 0); tel.ontvang({ k: HW.JA, id: 5 }, 2, 0);
  ok(pak.stukken.length >= 3 && tel.tik(0, 2).uit.length === 2 && tel.volgend === 2, 'ruimte begrenst het aantal stukken');
  let terug = [];
  for (const s of [...verkeer(stukken)].reverse()) terug.push(...nw.ontvang(s, 0, 4).uit);
  ok(nw.fase === 'geladen' && terug.length === 1 && terug[0].ok === true, 'compleet en gecontroleerd');
  gelijk(nw.momentopname, m, 'dezelfde wereld bij de nieuwe host');
  oud.ontvang(reken(terug[0]), 2, 5);
  ok(oud.fase === 'wacht-draait' && oud.isHost, 'wacht tot de hub draait; nog steeds host');
  ok(nw.draait('', 6).uit.length === 0 && nw.fase === 'geladen', 'zonder kamer geen host');
  const d = nw.draait('ABCD-1234', 6).uit;
  ok(nw.fase === 'host' && d[0].k === HW.DRAAIT, 'nieuwe host');
  const v = oud.ontvang(reken(d[0]), 2, 7).uit;
  ok(oud.fase === 'klaar' && !oud.isHost && v.length === 1 && v[0].k === HW.VERBIND && v[0].naar === 'rest' && v[0].kamer === 'ABCD-1234', 'oude host wordt gast, anderen verbinden');
  gelijk(leesVerbind(reken(v[0]), 0, 77), { id: 77, kamer: 'ABCD-1234', naam: 'Tammo' }, 'verbind lezen');
  ok(leesVerbind(reken(v[0]), 2) === null && leesVerbind(reken(v[0]), 0, 78) === null && leesVerbind({ k: HW.VERBIND, id: 1, kamer: '' }, 0) === null && leesVerbind(null, 0) === null, 'verbind van de verkeerde of zonder kamer');
  ok(oud.annuleer(8).uit.length === 0 && oud.fase === 'klaar', 'na klaar geen annuleren meer');
  ok(oud.bied(2, m, 80, 9).fout === 'bezig', 'na klaar geen nieuw bod');
}

// ---- Reliable: stukken verloren en omgewisseld komen toch heel aan
{
  const oud = new OudeHost({ ver: VER }), nw = new NieuweHost({ ver: VER });
  nw.ontvang(reken(oud.bied(1, m, 9, 0).uit[0]), 0, 0); nw.antwoord(true, 0); oud.ontvang({ k: HW.JA, id: 9 }, 1, 0);
  const zend = new Reliable({ maxPending: 200 }), ontv = new Reliable({ maxAhead: 200 });
  const wire = [];
  while (oud.fase === 'sturen') for (const s of oud.tik(1).uit) zend.send(s, 0, (b) => wire.push(b));
  const afleveren = [];
  const geleverd = wire.filter((_, i) => i % 3 !== 1).reverse(); // een derde verloren, rest omgekeerd
  for (const b of geleverd) { const h = decodeJson(b); for (const body of ontv.receive(h, () => {})) afleveren.push(body); }
  zend.tick(5, (b) => { const h = decodeJson(b); for (const body of ontv.receive(h, () => {})) afleveren.push(body); });
  for (const body of afleveren) nw.ontvang(body, 0, 2);
  ok(nw.fase === 'geladen', 'na verlies en omwisseling toch compleet');
}

// ---- weigeren, versie, bezig
{
  const { oud, nw } = nieuw();
  nw.ontvang(reken(bod(oud).uit[0]), 0, 0);
  const nee = nw.antwoord(false, 1).uit;
  ok(nee[0].k === HW.NEE && nee[0].reden === 'geweigerd' && nw.fase === 'geweigerd', 'weigeren');
  oud.ontvang(reken(nee[0]), 2, 2);
  ok(oud.fase === 'mislukt' && oud.reden === 'geweigerd' && oud.isHost && !oud.bezig, 'geweigerd: oude host blijft host');
  ok(mislukTekst(oud.reden).includes('Jij houdt het spel'), 'tekst');
  ok(oud.bied(2, m, 78, 3).uit.length === 1, 'daarna opnieuw proberen mag');
}
{
  const oud = new OudeHost({ ver: { ...VER, version: '0.44.0' } }), nw = new NieuweHost({ ver: VER });
  const u = nw.ontvang(reken(oud.bied(2, m, 3, 0).uit[0]), 0, 0).uit;
  ok(u[0].k === HW.NEE && u[0].reden === 'versie' && nw.fase === 'mislukt', 'versieverschil wordt geweigerd zonder melding');
  oud.ontvang(reken(u[0]), 2, 1);
  ok(oud.fase === 'mislukt' && oud.isHost, 'versie: oude host blijft host');
  const nw2 = new NieuweHost({ ver: VER }); nw2.ontvang({ k: HW.BOD, id: 4, n: 1, len: 5, sum: '00000000', ver: VER }, 0, 0);
  const bz = nw2.ontvang({ k: HW.BOD, id: 5, n: 1, len: 5, sum: '00000000', ver: VER }, 0, 1).uit;
  ok(bz[0].reden === 'bezig' && nw2.id === 4 && nw2.fase === 'gevraagd', 'tweede bod terwijl bezig');
}

// ---- annuleren in elke fase
for (const tot of ['aangeboden', 'sturen', 'laden', 'wacht-draait']) {
  const { oud, nw } = nieuw();
  nw.ontvang(reken(bod(oud).uit[0]), 0, 0);
  if (tot !== 'aangeboden') { oud.ontvang(reken(nw.antwoord(true, 0).uit[0]), 2, 0); }
  if (tot === 'laden' || tot === 'wacht-draait') { for (const s of oud.tik(0).uit) nw.ontvang(reken(s), 0, 0); while (oud.fase === 'sturen') for (const s of oud.tik(0).uit) nw.ontvang(reken(s), 0, 0); }
  if (tot === 'wacht-draait') oud.ontvang(reken({ k: HW.GELADEN, id: 77, ok: true, sum: pak.sum }), 2, 0);
  ok(oud.fase === tot, 'in fase ' + tot);
  const a = oud.annuleer(1).uit;
  ok(oud.fase === 'geannuleerd' && oud.isHost && a[0].k === HW.ANNULEER, 'geannuleerd in ' + tot + ': oude host blijft host');
  nw.ontvang(reken(a[0]), 0, 1);
  ok(!nw.bezig && nw.fase === 'geannuleerd', 'de ander stopt ook');
  ok(oud.tik(500).uit.length === 0 && oud.fase === 'geannuleerd', 'daarna blijft het stil');
}

// ---- time-outs
{
  let { oud } = nieuw(); bod(oud, 0);
  ok(oud.tik(TIJD.bod - 1).uit.length === 0 && oud.fase === 'aangeboden', 'nog geen time-out');
  const u = oud.tik(TIJD.bod + 1).uit;
  ok(oud.fase === 'mislukt' && oud.reden === 'time-out' && oud.isHost && u[0].k === HW.ANNULEER, 'bod: time-out, oude host blijft host');
}
{
  const { oud } = nieuw(); bod(oud, 0); oud.ontvang({ k: HW.JA, id: 77 }, 2, 0);
  oud.tik(1, 0); // geen ruimte: niets uitgegeven
  ok(oud.volgend === 0, 'zonder ruimte niets');
  oud.tik(TIJD.stukken + 2, 0);
  ok(oud.fase === 'mislukt' && oud.reden === 'time-out' && oud.isHost, 'stukken: time-out');
}
{
  const { oud } = nieuw(); bod(oud, 0); oud.ontvang({ k: HW.JA, id: 77 }, 2, 0); while (oud.fase === 'sturen') oud.tik(0);
  oud.tik(TIJD.laden + 1);
  ok(oud.fase === 'mislukt' && oud.isHost, 'laden: time-out');
}
{
  const { oud } = nieuw(); bod(oud, 0); oud.ontvang({ k: HW.JA, id: 77 }, 2, 0); while (oud.fase === 'sturen') oud.tik(0);
  oud.ontvang({ k: HW.GELADEN, id: 77, ok: true, sum: pak.sum }, 2, 5);
  oud.tik(5 + TIJD.draait + 1);
  ok(oud.fase === 'mislukt' && oud.reden === 'time-out' && oud.isHost && !oud.kamer, 'hub start niet: oude host blijft host');
}
{
  const nw = new NieuweHost({ ver: VER }); nw.ontvang({ k: HW.BOD, id: 4, n: 1, len: 5, sum: '00000000', ver: VER }, 0, 0);
  nw.tik(TIJD.bod + 1);
  ok(nw.fase === 'mislukt' && nw.reden === 'time-out', 'geen antwoord op de melding is nee');
  ok(nw.antwoord(true, 99).uit.length === 0, 'te laat antwoorden doet niets');
}

// ---- mislukken: de nieuwe host kan de wereld niet laden of de hub niet starten
{
  const { oud, nw } = nieuw();
  nw.ontvang(reken(bod(oud).uit[0]), 0, 0); oud.ontvang(reken(nw.antwoord(true, 0).uit[0]), 2, 0);
  while (oud.fase === 'sturen') for (const s of oud.tik(0).uit) nw.ontvang(reken(s), 0, 0);
  oud.ontvang(reken({ k: HW.GELADEN, id: 77, ok: true, sum: pak.sum }), 2, 1);
  const u = nw.mislukt('niet-bereikbaar', 2).uit;
  ok(u[0].k === HW.NEE && u[0].reden === 'niet-bereikbaar' && nw.fase === 'mislukt', 'nieuwe host meldt mislukt (NAT)');
  oud.ontvang(reken(u[0]), 2, 3);
  ok(oud.fase === 'mislukt' && oud.isHost && oud.reden === 'niet-bereikbaar', 'oude host blijft host');
  ok(mislukTekst('niet-bereikbaar').includes('mislukt'), 'algemene tekst');
}
{ // kapot controlegetal
  const { oud, nw } = nieuw();
  nw.ontvang(reken(bod(oud).uit[0]), 0, 0); nw.antwoord(true, 0); oud.ontvang({ k: HW.JA, id: 77 }, 2, 0);
  let g = [];
  while (oud.fase === 'sturen') for (const s of oud.tik(0).uit) { const k = reken(s); if (k.i === 0) k.d = k.d.replace('"v":1', '"v":2'); const r = nw.ontvang(k, 0, 1); g.push(...r.uit); }
  ok(nw.fase === 'mislukt' && nw.reden === 'controle' && g[0].ok === false, 'beschadigd stuk wordt gezien');
  oud.ontvang(reken(g[0]), 2, 2);
  ok(oud.fase === 'mislukt' && oud.isHost, 'oude host blijft host');
}
{ // geladen met een verkeerd controlegetal terug
  const { oud } = nieuw(); bod(oud); oud.ontvang({ k: HW.JA, id: 77 }, 2, 0); while (oud.fase === 'sturen') oud.tik(0);
  oud.ontvang({ k: HW.GELADEN, id: 77, ok: true, sum: 'deadbeef' }, 2, 1);
  ok(oud.fase === 'mislukt' && oud.isHost, 'verkeerd controlegetal terug');
}

// ---- ongeldige berichten veranderen niets
{
  const { oud, nw } = nieuw();
  const u0 = oud.ontvang({ k: HW.JA, id: 77 }, 2, 0); ok(oud.fase === 'rust' && oud.genegeerd === 1 && u0.uit.length === 0, 'ja zonder bod');
  nw.ontvang(reken(bod(oud).uit[0]), 0, 0);
  const slecht = [null, 5, 'x', {}, { k: 'ja' }, { k: HW.JA }, { k: HW.JA, id: 'a' }, { k: HW.DRAAIT, id: 77, kamer: 'X' }, { k: HW.GELADEN, id: 77, ok: true, sum: pak.sum }, { k: HW.STUK, id: 77, i: 0, d: 'x' }, { k: HW.JA, id: 78 }];
  for (const b of slecht) oud.ontvang(b, 2, 1);
  ok(oud.fase === 'aangeboden' && oud.genegeerd === slecht.length, 'oude host negeert onzin');
  for (const b of [null, 7, {}, { k: HW.STUK, id: 77, i: 0, d: 'x' }, { k: HW.ANNULEER, id: 99 }, { k: HW.VERBIND, id: 77 }]) nw.ontvang(b, 0, 1);
  ok(nw.fase === 'gevraagd', 'nieuwe host negeert onzin');
  nw.antwoord(true, 1);
  const s = reken({ k: HW.STUK, id: 77, i: 0, d: pak.stukken[0] });
  for (const b of [{ ...s, i: -1 }, { ...s, i: 1e6 }, { ...s, i: 1.5 }, { ...s, d: 5 }, { ...s, d: 'x'.repeat(STUK + 1) }, { ...s, d: 'kort' }]) nw.ontvang(b, 0, 1);
  nw.ontvang(s, 3, 1); // verkeerde plek
  ok(nw.stukken.size === 0 && nw.fase === 'ontvangt', 'ongeldige stukken worden niet bewaard');
  nw.ontvang(s, 0, 1); nw.ontvang(s, 0, 1);
  ok(nw.stukken.size === 1, 'dubbel stuk telt een keer');
  const bd = new NieuweHost({ ver: VER });
  for (const b of [{ k: HW.BOD, id: 0, n: 1, len: 5, sum: '00000000' }, { k: HW.BOD, id: 1, n: 0, len: 5, sum: '00000000' }, { k: HW.BOD, id: 1, n: 1000, len: 5, sum: '00000000' }, { k: HW.BOD, id: 1, n: 1, len: MAX_LEN + 1, sum: '00000000' }, { k: HW.BOD, id: 1, n: 1, len: 5, sum: 'kort' }, { k: HW.BOD, id: 1, n: 3, len: 5, sum: '00000000' }]) bd.ontvang({ ...b, ver: VER }, 0, 0);
  ok(bd.fase === 'rust', 'onzinnige aanbiedingen');
  const ba = new OudeHost({ ver: VER });
  ok(ba.bied(0, m, 1, 0).fout === 'ongeldig' && ba.bied(2, m, 0, 0).fout === 'ongeldig' && ba.fase === 'rust', 'bod aan jezelf of zonder id');
  const groot = maakMomentopname(inv()); groot.opdracht = { id: 'x' }; groot.extra = 'y'.repeat(MAX_LEN);
  ok(ba.bied(2, groot, 1, 0).fout === 'te-groot' && ba.isHost, 'te groot: oude host blijft host');
}
ok(isHostwissel({ k: 'hw-bod' }) && !isHostwissel({ k: 'cut' }) && !isHostwissel(null), 'herkennen');
ok(bodTekst('Noor').includes('Noor') && pauzeTekst('Noor').includes('Noor neemt het spel over') && !/gastheer|gastgever/i.test(bodTekst('x') + pauzeTekst('x') + mislukTekst('x')), 'teksten zonder rolnaam');

console.log(`coophostwissel_test: ${n} controles gelukt`);
