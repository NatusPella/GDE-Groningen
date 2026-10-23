// Fietsers met een Bluetooth-speakertje (#401): de Doppler-berekening, het zachter worden en de keuze van wie speelt (game/js/bikespeaker.js).
//   node scripts/bikespeaker_test.mjs
import assert from 'node:assert/strict';
import * as B from '../game/js/bikespeaker.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok  ' + naam); };
const bike = (x, y, speed = 5, extra = {}) => ({ isBike: true, driver: 'ai', x, y, speed, angle: 0, ...extra });
const nooit = () => 1, altijd = () => 0;

t('de fiets komt aan: hoger, wijkt weg: lager, ernaast: gelijk', () => {
  const lis = { x: 0, y: 0 }, still = { x: 0, y: 0 };
  const komt = B.dopplerRate({ x: 40, y: 0 }, { x: -5, y: 0 }, lis, still);
  const gaat = B.dopplerRate({ x: 40, y: 0 }, { x: 5, y: 0 }, lis, still);
  const langs = B.dopplerRate({ x: 0, y: 10 }, { x: 5, y: 0 }, lis, still);
  assert.ok(komt > 1.04 && komt < 1.07, 'aankomen ' + komt);
  assert.ok(gaat < 0.96 && gaat > 0.93, 'weggaan ' + gaat);
  assert.equal(langs, 1, 'dwars op de rijrichting');
  const zak = B.rateSemitones(komt) - B.rateSemitones(gaat);
  assert.ok(zak > 1.4 && zak < 2.2, 'de toonhoogte zakt bij het voorbijrijden zo\'n anderhalve tot twee halve tonen: ' + zak.toFixed(2));
});

t('de luisteraar telt mee: wie naar de fiets toe rijdt hoort hem hoger, wie ervan weg rijdt lager', () => {
  const bron = { x: 40, y: 0 }, stil = { x: 0, y: 0 };
  assert.ok(B.dopplerRate(bron, stil, { x: 0, y: 0 }, { x: 8, y: 0 }) > 1);
  assert.ok(B.dopplerRate(bron, stil, { x: 0, y: 0 }, { x: -8, y: 0 }) < 1);
  // zelfde relatieve snelheid, zelfde verschuiving (bijna): bron weg met 5 of luisteraar weg met 5
  const a = B.dopplerRate(bron, { x: 5, y: 0 }, { x: 0, y: 0 }, stil), b = B.dopplerRate(bron, stil, { x: 0, y: 0 }, { x: -5, y: 0 });
  assert.ok(Math.abs(a - b) < 0.03, `${a} ${b}`);
});

t('een rit langs de speler: de snelheid loopt van hoog naar laag, het geluid van zacht via hard naar zacht', () => {
  const lis = { x: 0, y: 0 }, still = { x: 0, y: 0 };
  const rijden = [];
  for (let x = -50; x <= 50; x += 2) {
    const bron = { x, y: 6 }, d = Math.hypot(bron.x - lis.x, bron.y - lis.y);
    rijden.push({ x, rate: B.dopplerRate(bron, { x: 5, y: 0 }, lis, still), vol: B.pannerGain(d) * B.edgeFade(d) });
  }
  for (let i = 1; i < rijden.length; i++) assert.ok(rijden[i].rate <= rijden[i - 1].rate + 1e-9, 'de toonhoogte stijgt nooit tijdens de rit');
  assert.ok(rijden[0].rate > 1.03 && rijden.at(-1).rate < 0.97);
  const mid = rijden.find((r) => r.x === 0);
  assert.ok(mid.vol > rijden[0].vol * 3 && mid.vol > rijden.at(-1).vol * 3, 'het is het hardst als hij langs rijdt');
  assert.ok(Math.abs(mid.rate - 1) < 0.01, 'langs de speler is de toonhoogte weer gewoon');
  assert.ok(rijden.slice(0, 5).every((r, i, a) => !i || r.vol >= a[i - 1].vol - 1e-9), 'aankomend wordt het harder');
  assert.ok(rijden.slice(-5).every((r, i, a) => !i || r.vol <= a[i - 1].vol + 1e-9), 'wegrijdend wordt het zachter');
});

t('de snelheid blijft binnen de grenzen, ook bij absurde snelheden en op dezelfde plek', () => {
  const r = B.dopplerRate({ x: 10, y: 0 }, { x: -500, y: 0 }, { x: 0, y: 0 }, { x: 500, y: 0 });
  assert.ok(r <= B.RATE_MAX && r >= B.RATE_MIN);
  assert.equal(B.dopplerRate({ x: 3, y: 3 }, { x: 5, y: 0 }, { x: 3, y: 3 }, { x: 0, y: 0 }), 1);
  assert.ok(Number.isFinite(B.dopplerRate({ x: 1e-9, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 })));
});

t('het volume: demping met de afstand en een zacht einde aan de rand van het bereik', () => {
  assert.equal(B.pannerGain(1), 1); assert.equal(B.pannerGain(B.SPEAKER_REF), 1);
  assert.ok(B.pannerGain(20) < B.pannerGain(10) && B.pannerGain(10) < 1);
  assert.equal(B.edgeFade(B.SPEAKER_RANGE - 1) > 0.5, true); assert.equal(B.edgeFade(B.SPEAKER_STOP), 0); assert.equal(B.edgeFade(B.SPEAKER_STOP + 20), 0);
  assert.ok(B.SPEAKER_RANGE < B.SPEAKER_STOP, 'marge tegen aan en uit flippen');
});

t('niet elke fietser heeft er een, de keuze is vast per fiets en alleen NPC-fietsen komen in aanmerking', () => {
  const rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const fietsen = Array.from({ length: 2000 }, () => bike(0, 0));
  const met = fietsen.filter((v) => B.assignSpeaker(v, rng)).length;
  assert.ok(met > 2000 * 0.08 && met < 2000 * 0.16, 'ongeveer ' + (B.SPEAKER_CHANCE * 100) + '%: ' + met / 20 + '%');
  const v = bike(0, 0); B.assignSpeaker(v, altijd); assert.equal(B.assignSpeaker(v, nooit), true, 'vast na de eerste keer');
  assert.equal(B.assignSpeaker(bike(0, 0, 5, { driver: 'player' }), altijd), false, 'niet van de speler');
  assert.equal(B.assignSpeaker({ isBike: false, isScooter: true, x: 0, y: 0 }, altijd), false, 'geen scooter of auto');
  for (const extra of [{ wrecked: true }, { sinking: true }, { parked: true }, { speed: 0.2 }]) {
    const w = bike(0, 0, 5, extra); w.btSpeaker = true; assert.equal(B.speakerEligible(w), false, JSON.stringify(extra));
  }
});

t('hooguit twee tegelijk, alleen in de buurt, de dichtstbijzijnde eerst', () => {
  const fietsen = [10, 20, 30, 40, 50].map((x) => bike(x, 0));
  const ver = bike(300, 0);
  const lijst = B.pickSpeakers([...fietsen, ver], { x: 0, y: 0 }, [], { rng: altijd });
  assert.deepEqual(lijst.map((v) => v.x), [10, 20]);
  assert.equal(B.SPEAKER_MAX, 2);
  assert.deepEqual(B.pickSpeakers([ver], { x: 0, y: 0 }, [], { rng: altijd }), [], 'te ver weg');
  assert.deepEqual(B.pickSpeakers([10, 20, 30].map((x) => bike(x, 0)), { x: 0, y: 0 }, [], { rng: nooit }), [], 'niemand met een speakertje');
  assert.equal(B.pickSpeakers(fietsen, { x: 0, y: 0 }, [], { rng: altijd, max: 1 }).length, 1);
});

t('wie speelt blijft spelen tot de stopafstand en wordt dan vervangen; niets flipt op de rand', () => {
  const a = bike(50, 0), b = bike(60, 0), c = bike(20, 0);
  for (const v of [a, b, c]) B.assignSpeaker(v, altijd);
  let act = B.pickSpeakers([a, b], { x: 0, y: 0 }, [], { rng: altijd });
  assert.deepEqual(act, [a], 'b is buiten SPEAKER_RANGE (55)');
  b.x = B.SPEAKER_RANGE - 1; act = B.pickSpeakers([a, b], { x: 0, y: 0 }, act, { rng: altijd });
  assert.deepEqual(act, [a, b]);
  a.x = B.SPEAKER_RANGE + 5; // buiten het aanzetbereik maar binnen de stopafstand: blijft spelen
  act = B.pickSpeakers([a, b, c], { x: 0, y: 0 }, act, { rng: altijd });
  assert.deepEqual(act, [a, b], 'a speelt door; c wacht tot er plek is');
  a.x = B.SPEAKER_STOP + 1; act = B.pickSpeakers([a, b, c], { x: 0, y: 0 }, act, { rng: altijd });
  assert.ok(act.includes(b) && act.includes(c) && !act.includes(a));
  b.wrecked = true; act = B.pickSpeakers([a, b, c], { x: 0, y: 0 }, act, { rng: altijd });
  assert.deepEqual(act, [c], 'een omgereden fiets zwijgt');
});

t('een fiets die uit de wereld is verdwenen speelt niet door', () => {
  const a = bike(10, 0); B.assignSpeaker(a, altijd);
  let act = B.pickSpeakers([a], { x: 0, y: 0 }, [], { rng: altijd });
  assert.deepEqual(act, [a]);
  act = B.pickSpeakers([], { x: 0, y: 0 }, act, { rng: altijd });
  assert.deepEqual(act, []);
});

t('het nummer komt uit de bibliotheek: geen stub, niet het nummer van de radio, en een eigen beginpunt', () => {
  const tracks = [{ id: 'a', duration: 180 }, { id: 'stub', duration: 5 }, { id: 'b', duration: 200 }, { id: 'c', duration: 240 }];
  for (let i = 0; i < 200; i++) {
    const p = B.pickSpeakerTrack(tracks, Math.random, 'a');
    assert.ok(p && p.index !== 1 && tracks[p.index].id !== 'a', 'geen stub en niet het radionummer: ' + JSON.stringify(p));
    assert.ok(p.start >= 0 && p.start <= tracks[p.index].duration - 30, 'beginpunt binnen het nummer: ' + p.start);
  }
  assert.equal(B.pickSpeakerTrack([], Math.random), null, 'geen bibliotheek, geen muziek');
  assert.equal(B.pickSpeakerTrack([{ id: 'a', duration: 180 }], Math.random, 'a').index, 0, 'één nummer: dat dan maar');
  assert.equal(B.pickSpeakerTrack([{ id: 'x', duration: NaN }], Math.random).start, 0, 'lengte nog onbekend: vanaf het begin');
});

console.log(`bikespeaker_test: ${n}/${n} ok`);
