// Samen spelen (#439): de overdracht van het spel (coophostwissel.js): formaat van de momentopname, alle paden van de toestandsmachine,
// time-outs, ongeldige berichten en: een mislukte overdracht laat de oude host host. Puur, zonder netwerk.
import assert from 'node:assert/strict';
import { maakMomentopname, codeerMomentopname, leesMomentopname, controlegetal, OudeHost, NieuweHost, leesVerbind, isHostwissel, HW, TIJD, STUK, MAX_LEN, bodTekst, pauzeTekst, mislukTekst,
  HERSTEL, beurtOp, terugHostTekst, HerstelOntvanger, maakHerstel, rangschik, herstelInterval, beurtIndex, HERSTEL_S, STILTE_S, BEURT_S, MAX_RANG, MAX_HERSTEL_STUKKEN, weggevallenTekst, jijOvernameTekst, sluitAanTekst, overnameMisluktTekst } from '../game/js/coophostwissel.js';
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

// ---- variant 2: de kandidaatkeuze en de herstelmomentopname
const k = (slot, ping, kamer = 'K' + slot) => ({ slot, ping, kamer });
gelijk(rangschik([k(3, 80), k(1, 45), k(2, 12)]).map((x) => x.slot), [2, 1, 3], 'laagste ping eerst');
gelijk(rangschik([k(3, 40), k(1, 41), k(2, 39)]).map((x) => x.slot), [1, 2, 3], 'binnen dezelfde bak beslist de plek');
gelijk(rangschik([k(2, 0), k(3, 90), k(1, null)]).map((x) => x.slot), [3, 1, 2], 'een onbekende ping is de slechtste (daarna de plek)');
gelijk(rangschik([k(2, 30), k(1, 30)]).map((x) => x.slot), rangschik([k(1, 30), k(2, 30)]).map((x) => x.slot), 'dezelfde lijst, welke volgorde ze ook binnenkomen');
gelijk(rangschik([k(2, 50), k(3, 62), k(1, 120)], [k(3, 70)]).map((x) => x.slot), [3, 2, 1], 'hysterese: de vorige nummer één blijft eerste binnen één bak');
gelijk(rangschik([k(2, 10), k(3, 62)], [k(3, 70)]).map((x) => x.slot), [2, 3], 'een duidelijk betere verbinding wint wel');
gelijk(rangschik([k(2, 10)], [k(3, 70)]).map((x) => x.slot), [2], 'de vorige nummer één is weg: hij verdwijnt uit de lijst');
ok(rangschik([k(0, 1), k(-1, 2), null, { slot: 'x' }, k(4, 5)]).length === 1, 'plek 0 (wie het spel opende) en rommel zijn nooit opvolger');
ok(rangschik(Array.from({ length: 20 }, (_, i) => k(i + 1, 10 + i))).length === MAX_RANG, 'hoogstens MAX_RANG opvolgers');
ok(herstelInterval(0) === HERSTEL_S && herstelInterval(3) === HERSTEL_S && herstelInterval(7) === HERSTEL_S + 10, 'meer gasten: minder vaak (het bandbreedtebudget)');
ok(beurtIndex(0) === 0 && beurtIndex(BEURT_S - 0.1) === 0 && beurtIndex(BEURT_S) === 1 && beurtIndex(-5) === 0 && STILTE_S === 12, 'beurten van 30 s, stilte van 12 s');

const bl = [{ slot: 1, duur: 40 }, { slot: 2 }, { slot: 3, duur: 10 }];
ok(beurtOp(bl, 0) === 0 && beurtOp(bl, 39.9) === 0 && beurtOp(bl, 40) === 1 && beurtOp(bl, 69.9) === 1 && beurtOp(bl, 70) === 2 && beurtOp(bl, 79.9) === 2 && beurtOp(bl, 80) === 3 && beurtOp(bl, -5) === 0 && beurtOp([], 1) === 0, 'beurten met eigen duur (standaard BEURT_S)');
{ // het bod draagt de terugvalkamer; het verbinden voor de rest ook; zonder terugvalkamer blijft het bericht zoals het was
  const oh = new OudeHost({ ver: VER, naam: 'Tammo' }), nh = new NieuweHost({ ver: VER });
  const bod = oh.bied(2, m, 5, 0, 'TERUGKAMER').uit[0];
  ok(bod.terug === 'TERUGKAMER' && !('terug' in new OudeHost({ ver: VER }).bied(2, m, 6, 0).uit[0]), 'terug in het bod, alleen als die er is');
  nh.ontvang(bod, 0, 0); ok(nh.terug === 'TERUGKAMER', 'de nieuwe host kent de terugvalkamer');
}
ok(!/gastheer|host\b/i.test(terugHostTekst) && terugHostTekst.includes('Jij houdt het spel weer'), 'tekst van de terugval');
const rang = [k(2, 12, 'KAMERTWEE'), k(1, 45, 'KAMEREEN')];
const mh = maakMomentopname(inv({ kapot: Array.from({ length: 40 }, (_, i) => 'kliko@' + i + ',' + i) }));
const hp = maakHerstel(7, mh, rang);
ok(hp && hp.kop.k === HERSTEL.KOP && hp.stukken.every((b) => b.k === HERSTEL.STUK && b.id === 7 && b.d.length <= STUK) && hp.kop.n === hp.stukken.length, 'kop en stukken');
for (const b of [hp.kop, ...hp.stukken]) ok(decodeJson(encodeJson(T.EVENT, 1, 0, 0, { seq: 1, body: b })) !== null, 'elk bericht past in MAX_JSON');
{
  const r = new HerstelOntvanger(); let klaar = null;
  for (const b of [hp.kop, ...hp.stukken.slice().reverse()]) klaar = r.neem(JSON.parse(JSON.stringify(b))) || klaar; // stukken in omgekeerde volgorde
  ok(klaar && klaar.id === 7 && klaar.m.tijd.uur === mh.tijd.uur && klaar.m.kapot.length === 40, 'heel terug, ook als de stukken omgekeerd aankomen');
  gelijk(klaar.rang, [{ slot: 2, ping: 12, kamer: 'KAMERTWEE' }, { slot: 1, ping: 45, kamer: 'KAMEREEN' }], 'de lijst met kamers komt mee');
  ok(r.neem(hp.kop) === null && r.neem(hp.stukken[0]) === null, 'een oudere of dubbele ronde telt niet');
  const hp2 = maakHerstel(8, mh, [k(1, 5, 'NIEUW')]);
  let k2 = null; for (const b of [hp2.kop, ...hp2.stukken]) k2 = r.neem(b) || k2;
  ok(k2 && k2.id === 8 && k2.rang[0].kamer === 'NIEUW', 'een nieuwere ronde vervangt de vorige');
}
{
  const r = new HerstelOntvanger(); r.neem(hp.kop);
  const stuk = { ...hp.stukken[0], d: hp.stukken[0].d.slice(0, -1) + (hp.stukken[0].d.slice(-1) === 'x' ? 'y' : 'x') };
  let uit = null; for (const b of [stuk, ...hp.stukken.slice(1)]) uit = r.neem(b) || uit;
  ok(uit === null, 'een beschadigd stuk (controlegetal) wordt niet gebruikt');
  const r2 = new HerstelOntvanger(); r2.neem(hp.kop); let u2 = null; for (const b of hp.stukken.slice(1)) u2 = r2.neem(b) || u2;
  ok(u2 === null, 'een ontbrekend stuk: nooit klaar');
  for (const slecht of [{ k: HERSTEL.KOP, id: 0 }, { k: HERSTEL.KOP, id: 9, n: 99, len: 5, sum: '00000000', rang: [] }, { k: HERSTEL.KOP, id: 9, n: 1, len: 5, sum: '00000000', rang: [[0, 1, 'x']] }, { k: HERSTEL.KOP, id: 9, n: 1, len: 5, sum: '00000000', rang: [[1, 1, '']] }, { k: HERSTEL.KOP, id: 9, n: 1, len: 5, sum: '00000000', rang: 'nee' }, { k: HERSTEL.STUK, id: 4, i: 0, d: 'x' }, null, 5, { k: 'iets' }]) ok(new HerstelOntvanger().neem(slecht) === null, 'onzin wordt genegeerd');
}
ok(maakHerstel(1, maakMomentopname(inv({ kapot: [], extra: 'x' })), []) !== null, 'zonder opvolgers kan ook');
const flink = maakMomentopname(inv()); flink.opdracht = { id: 'x', stap: 1, staat: 'a', t: 0 }; flink.voertuigen = Array.from({ length: 16 }, (_, i) => ({ id: 'v' + i, soort: 'auto', x: 1, y: 1, z: 0, hoek: 0, schade: 0 }));
ok(maakHerstel(1, flink, rang) !== null && MAX_HERSTEL_STUKKEN * STUK >= 9000, 'een volle momentopname (400 kapot, 16 voertuigen) blijft binnen het budget');
ok(maakHerstel(0, mh, rang) === null, 'zonder geldig id geen herstel');
{
  const grote = maakMomentopname(inv()); grote.spelers = Array.from({ length: 16 }, (_, i) => ({ slot: i, naam: 'N'.repeat(40), char: 'c'.repeat(30), geld: 1e9, health: 100, x: 123456.78, y: -123456.78, z: 1.25, voertuig: 'v'.repeat(40) }));
  grote.kapot = Array.from({ length: 400 }, (_, i) => 'kliko@' + (i * 1000) + ',' + (i * 1000)); grote.voertuigen = flink.voertuigen;
  ok(maakHerstel(1, grote, rang) === null, 'een veel te grote herstelmomentopname gaat niet mee (de gasten houden de vorige)');
}
ok(!/gastheer|gastgever|\bhost\b/i.test(weggevallenTekst('Noor') + jijOvernameTekst + sluitAanTekst('Noor') + overnameMisluktTekst) && weggevallenTekst('Noor').includes('Noor neemt het over'), 'teksten zonder rolnaam, met namen');

console.log(`coophostwissel_test: ${n} controles gelukt`);
