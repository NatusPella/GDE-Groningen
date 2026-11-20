// AAA M08 (Fatbikes ontwijken): golven, ontweek-teller, raakgrens, herstart, tempo, determinisme.
//   node scripts/fatbikedodge_test.mjs
import assert from 'node:assert/strict';
import { DODGE, planWaves, createDodge, wavesDue, waveBikes, passTick, noteDodge, noteHit, segmentStart, tempoTick, extraWave, halfwayDue, hudLine, slotLines, DODGE_HINT, simulate } from '../game/js/fatbikedodge.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const LEN = 600; // de echte baan van de Oude Ebbingestraat naar de Noorderhaven is ongeveer zo lang

t('de golven zijn deterministisch en lopen mee met de baan', () => {
  assert.deepEqual(planWaves(808, LEN), planWaves(808, LEN));
  assert.notDeepEqual(planWaves(808, LEN), planWaves(809, LEN));
  const w = planWaves(808, LEN);
  assert.ok(w.length >= 4 && w.length <= DODGE.maxWaves);
  for (let i = 1; i < w.length; i++) assert.ok(w[i].at > w[i - 1].at, 'golven in volgorde langs de baan');
  assert.ok(w.every((x) => x.at >= 0 && x.at <= LEN), 'alle golven op de baan');
  assert.ok(w.some((x) => x.kind === 'kruis') && w.some((x) => x.kind === 'tegen') && w.some((x) => x.kind === 'achter'), 'kruisend, tegemoet en van achteren');
  assert.ok(w[w.length - 1].speed > w[0].speed, 'de colonne loopt door: later is sneller');
});

t('elke golf breekt precies een keer los, op wisselende afstanden', () => {
  const d = createDodge(LEN, 808);
  let totaal = 0;
  for (let s = 0; s <= LEN; s += 5) totaal += wavesDue(d, s).length;
  assert.equal(totaal, d.waves.length);
  assert.equal(wavesDue(d, LEN).length, 0);
  const kruis = d.waves.find((x) => x.kind === 'kruis');
  const bikes = waveBikes(d, kruis);
  assert.ok(bikes.length >= 2 && bikes.every((b) => b.cross && Math.abs(b.latT) > 0 && Math.sign(b.latT) === -Math.sign(b.lat)), 'kruisers steken over');
  assert.ok(new Set(bikes.map((b) => Math.round(b.sOffset))).size === bikes.length, 'wisselende afstanden');
  assert.deepEqual(waveBikes(d, kruis), bikes, 'dezelfde golf geeft dezelfde fietsen');
  const achter = waveBikes(d, d.waves.find((x) => x.kind === 'achter'));
  assert.ok(achter.every((b) => b.sOffset < 0 && b.dir === 1), 'de colonne komt van achteren');
});

t('ontweken telt een keer per fiets, geraakt telt niet als ontweken', () => {
  const rec = {};
  assert.equal(passTick(rec, 12), null, 'ver weg');
  assert.equal(passTick(rec, 3), null, 'dichtbij');
  assert.equal(passTick(rec, 5.5), null, 'nog niet ver genoeg');
  assert.equal(passTick(rec, 8), 'ontweken');
  assert.equal(passTick(rec, 12), null, 'maar een keer');
  const raak = {};
  passTick(raak, 3); passTick(raak, 0.8);
  assert.equal(passTick(raak, 9), null, 'geraakt: geen ontweken');
});

t('twee keer geraakt is herstart van het stuk; tellers per speler', () => {
  const d = createDodge(LEN, 808);
  noteDodge(d, 'host'); noteDodge(d, 'host'); noteDodge(d, 'g2');
  assert.equal(noteHit(d, 'host').restart, false);
  assert.equal(hudLine(d, 'host'), 'Ontweken: 2 · Geraakt 1/2');
  assert.equal(hudLine(d, 'g2'), 'Ontweken: 1 · Geraakt 0/2', 'de ander blijft schoon');
  const r = noteHit(d, 'host');
  assert.equal(r.restart, true);
  assert.equal(hudLine(d, 'host'), 'Ontweken: 2 · Geraakt 0/2', 'treffers op nul, ontweken blijft');
  assert.equal(d.players.host.restarts, 1);
  assert.equal(segmentStart(d, 5), 0);
  assert.equal(segmentStart(d, 250), 200);
  assert.equal(segmentStart(d, LEN + 10), 400, 'voorbij het einde blijft het laatste stuk');
});

t('de colonne loopt door: stilstaan roept een extra golf van achteren', () => {
  const d = createDodge(LEN, 808);
  let s = 50, prikkels = 0;
  for (let i = 0; i < 60; i++) if (tempoTick(d, 'host', 0.1, s) === 'prikkel') prikkels++;
  assert.equal(prikkels, 1, 'na vier seconden stilstaan, daarna uitstel');
  const lopend = createDodge(LEN, 808);
  let pr2 = 0;
  for (let i = 0; i < 300; i++) { s += 0.18; if (tempoTick(lopend, 'host', 0.1, s) === 'prikkel') pr2++; }
  assert.equal(pr2, 0, 'wie doorloopt krijgt geen prikkel');
  const x = extraWave(d);
  assert.ok(waveBikes(d, x).every((b) => b.dir === 1 && b.sOffset < 0));
});

t('de mini-beat halverwege komt een keer', () => {
  const d = createDodge(LEN, 808);
  assert.equal(halfwayDue(d, LEN * 0.3), null);
  const b = halfwayDue(d, LEN * 0.5);
  assert.ok(b && b.wie === 'Fatbike-koerier' && b.tekst.split(' ').length <= 12);
  assert.equal(halfwayDue(d, LEN * 0.9), null);
});

t('een speler die ontwijkt slaagt; een zwakke speler herstart maar haalt het ook', () => {
  const goed = simulate(LEN, 808, { dodgeSkill: 1, speed: 3.8 });
  assert.equal(goed.finished, true);
  assert.equal(goed.restarts, 0);
  assert.ok(goed.dodged >= 15, `ontweken ${goed.dodged}`);
  assert.ok(goed.beats.includes('m08-koerier'));
  const slecht = simulate(LEN, 808, { dodgeSkill: 0.6, speed: 3.8 });
  assert.equal(slecht.finished, true, 'herstart is een stuk terug, geen game over');
  assert.ok(slecht.restarts >= 1, 'veel geraakt geeft een herstart');
  assert.deepEqual(simulate(LEN, 808, { dodgeSkill: 0.6, speed: 3.8 }), slecht, 'deterministisch');
});

t('hint en nasleep: tokens, geen ruwe toetsen, een knipoog bij een herstart', () => {
  assert.match(DODGE_HINT, /\{A\}/);
  assert.doesNotMatch(DODGE_HINT, /\b(WASD|Spatie|Shift)\b/);
  const d = createDodge(LEN, 808);
  for (let i = 0; i < 8; i++) noteDodge(d, 'host');
  assert.equal(slotLines(d, 'host').length, 1);
  noteHit(d, 'host'); noteHit(d, 'host');
  const rij = slotLines(d, 'host');
  assert.equal(rij.length, 2);
  assert.match(rij[1][1], /omgevallen/);
});

console.log(`fatbikedodge_test: ${n}/${n} ok`);
