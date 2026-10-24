// Test van de busbediening (#444): deuren, kneel, halteknop, tevredenheid en een rit met zelf bediende deuren.
//   node scripts/busbestuur_test.mjs
import assert from 'node:assert';
import { prepareLine, pointAt } from '../game/js/busroutes.js';
import { makeRide, startRide, updateRide, rideStop } from '../game/js/busride.js';
import {
  makeBediening, toggleDeuren, toggleKneel, stepBediening, deurenOpen, deurenDicht, kneeldiepte, voorligger, kleeft,
  makeTevredenheid, stepTevredenheid, stoot, waardering, tevredenWoord, haltePrognose, vertragingTekst, ritPunten,
  DEUR_TIJD, KNEEL_DIEPTE, START_TEVREDEN,
} from '../game/js/busbestuur.js';
import { tripScore } from '../game/js/busservice.js';

const mk = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// --- deuren en kneel
{
  const b = makeBediening();
  assert.ok(deurenDicht(b) && !deurenOpen(b));
  assert.deepStrictEqual(toggleDeuren(b, 5), { ok: false, why: 'rijdt' }, 'rijdend geen deuren open');
  assert.ok(!b.doorWant);
  assert.strictEqual(toggleDeuren(b, 0).open, true);
  for (let i = 0; i < 4; i++) stepBediening(b, DEUR_TIJD / 4, 0);
  assert.ok(deurenOpen(b) && b.doorOpen === 1);
  assert.strictEqual(toggleDeuren(b, 0).open, false, 'tweede keer sluit');
  for (let i = 0; i < 4; i++) stepBediening(b, DEUR_TIJD / 4, 0);
  assert.ok(deurenDicht(b));
  // open deuren slaan dicht onderweg
  toggleDeuren(b, 0);
  stepBediening(b, DEUR_TIJD, 0);
  const ev = stepBediening(b, 0.1, 6);
  assert.deepStrictEqual(ev, [{ type: 'deurslag' }]);
  assert.ok(!b.doorWant);
  // kneel
  assert.strictEqual(toggleKneel(b, 0).kneel, true);
  for (let i = 0; i < 20; i++) stepBediening(b, 0.1, 0);
  assert.ok(Math.abs(kneeldiepte(b) - KNEEL_DIEPTE) < 1e-9);
  stepBediening(b, 0.1, 3); // te hard: de bus komt vanzelf omhoog
  assert.ok(!b.kneelWant);
  for (let i = 0; i < 20; i++) stepBediening(b, 0.1, 3);
  assert.strictEqual(kneeldiepte(b), 0);
  assert.deepStrictEqual(toggleKneel(b, 5), { ok: false, why: 'rijdt' });
}

// --- voorligger en kleven
{
  const bus = { x: 0, y: 0, angle: 0, speed: 12, model: { len: 11 } };
  const auto = (x, y, speed = 10) => ({ x, y, speed, model: { len: 4 } });
  assert.strictEqual(voorligger(bus, [bus, auto(-20, 0)]), null, 'achter je telt niet');
  assert.strictEqual(voorligger(bus, [auto(20, 6)]), null, 'op een andere baan telt niet');
  const v = voorligger(bus, [auto(40, 0), auto(20, 0.5)]);
  assert.ok(Math.abs(v.gap - (20 - 5.5 - 2)) < 1e-9, 'de dichtstbijzijnde: ' + v.gap);
  assert.ok(kleeft(12, { gap: 5, speed: 10 }));
  assert.ok(!kleeft(12, { gap: 30, speed: 10 }));
  assert.ok(!kleeft(2, { gap: 1, speed: 0 }), 'in de file kleef je niet');
  assert.ok(!kleeft(12, null));
}

// --- tevredenheid
{
  const rustig = makeTevredenheid();
  let v = 0;
  for (let i = 0; i < 200; i++) { v = Math.min(8, v + 1.2 * 0.1); stepTevredenheid(rustig, { speed: v, dt: 0.1 }); }
  assert.ok(rustig.sat >= START_TEVREDEN, 'rustig rijden kost niets: ' + rustig.sat);
  const hard = makeTevredenheid();
  stepTevredenheid(hard, { speed: 12, dt: 0.1 });
  for (let i = 0; i < 6; i++) stepTevredenheid(hard, { speed: Math.max(0, 12 - (i + 1) * 2), dt: 0.1 }); // 20 m/s^2 remmen
  assert.ok(hard.sat < START_TEVREDEN - 3, 'hard remmen kost punten: ' + hard.sat);
  const klef = makeTevredenheid();
  let melding = 0;
  for (let i = 0; i < 100; i++) { for (const e of stepTevredenheid(klef, { speed: 10, dt: 0.1, tailgate: true })) if (e.type === 'klever') melding++; }
  assert.ok(klef.sat < START_TEVREDEN - 8 && melding === 1, `kleven kost punten en meldt één keer: ${klef.sat} ${melding}`);
  const leeg = makeTevredenheid(50);
  stepTevredenheid(leeg, { speed: 0, dt: 0.1, onBoard: 0 });
  stoot(leeg, 100); assert.strictEqual(leeg.sat, 100);
  stoot(leeg, -500); assert.strictEqual(leeg.sat, 0);
  assert.strictEqual(waardering(0), 1); assert.strictEqual(waardering(100), 5); assert.strictEqual(waardering(60), 3);
  assert.strictEqual(tevredenWoord(90), 'Zeer tevreden'); assert.strictEqual(tevredenWoord(10), 'Ontevreden');
}

// --- prognose voor het HUD
{
  const line = prepareLine({ id: 'p', ref: '9', pts: [[0, 0], [1500, 0]], stops: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 1000, y: 0 }, { x: 1500, y: 0 }] });
  const ride = makeRide(line, { rng: mk() });
  startRide(ride);
  ride.phase = 'drive'; ride.t = 10;
  const p = haltePrognose({ dist: 340, speed: 10, ride });
  assert.strictEqual(p.eta, 34);
  const gepland = ride.table[ride.next].arrive;
  assert.strictEqual(p.vertraging, Math.round(10 + 34 - gepland));
  assert.strictEqual(haltePrognose({ dist: 100, speed: 0, ride: null }).vertraging, null);
  assert.strictEqual(vertragingTekst(null), '');
  assert.strictEqual(vertragingTekst(4), 'op tijd');
  assert.strictEqual(vertragingTekst(25), '25 s te laat');
  assert.strictEqual(vertragingTekst(-25), '25 s te vroeg');
  assert.ok(ritPunten({ share: 1, sat: 100, haltes: 6 }) > ritPunten({ share: 0.3, sat: 40, haltes: 6 }));
}

// --- tripScore met tevredenheid
{
  const basis = tripScore({ passengers: 20, deltas: [0, 0, 0] });
  assert.strictEqual(basis.satisfaction, null);
  assert.ok(basis.perfect);
  const blij = tripScore({ passengers: 20, deltas: [0, 0, 0], satisfaction: 100 });
  const boos = tripScore({ passengers: 20, deltas: [0, 0, 0], satisfaction: 10 });
  assert.ok(blij.pay > boos.pay && blij.perfect && !boos.perfect);
}

// --- een rit met zelf bediende deuren
const line = prepareLine({ id: 'x', ref: '5', pts: [[0, 0], [1500, 0]], stops: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 1000, y: 0 }, { x: 1500, y: 0 }] });

// strategie: 'goed' opent en sluit de deuren; 'sluipen' opent nooit; 'rijdopen' laat de deuren open bij het wegrijden
function rij(strategie, { kneel = false } = {}) {
  const ride = makeRide(line, { rng: mk() });
  const evs = startRide(ride);
  const doors = makeBediening();
  const bus = { x: 0, y: 0, speed: 0, doors, tailgate: false };
  let s = 0, wacht = 0;
  const dt = 0.1;
  for (let i = 0; i < 40000 && !ride.done && !ride.failed; i++) {
    const row = ride.phase === 'dwell' ? null : rideStop(ride);
    if (ride.phase === 'dwell') {
      bus.speed = 0;
      if (strategie === 'sluipen' && !ride.doorsOpened) { wacht += dt; if (wacht > 4) bus.speed = 6; }
      else if (strategie === 'goed' || strategie === 'rijdopen') {
        if (!ride.doorsOpened && !doors.doorWant) { toggleDeuren(doors, 0); if (kneel) toggleKneel(doors, 0); }
        if (ride.doorsOpened && ride.boardLeft <= 0 && ride.dwellLeft <= 0 && doors.doorWant && strategie === 'goed') toggleDeuren(doors, 0);
        if (strategie === 'rijdopen' && ride.doorsOpened && ride.boardLeft <= 0 && ride.dwellLeft <= 0) { bus.speed = 6; }
      }
    } else if (row) {
      wacht = 0;
      const gap = row.s - s;
      bus.speed = gap < 6 ? 0 : Math.min(8.5, Math.max(0, gap - 4) * 0.8);
    } else bus.speed = 8.5;
    s += bus.speed * dt;
    bus.x = pointAt(line, s).x;
    for (const e of stepBediening(doors, dt, bus.speed)) if (e.type === 'deurslag') { doors.slag = true; evs.push(e); }
    if (doors.slag) { doors.slag = false; stoot(ride.tevreden, -10); }
    for (const e of updateRide(ride, bus, dt)) evs.push(e);
  }
  return { ride, evs, doors };
}

const goed = rij('goed');
assert.ok(goed.ride.done, 'rit met bediende deuren is uitgereden');
const opens = goed.evs.filter((e) => e.type === 'doorsopen');
assert.strictEqual(opens.length, 3, 'drie haltes: drie keer deuren open');
assert.ok(opens.at(-1).last && opens.at(-1).alight > 0, 'op de eindhalte stappen mensen uit');
assert.strictEqual(goed.evs.filter((e) => e.type === 'skipped').length, 0);
assert.ok(goed.ride.passengers > 0 && goed.ride.onBoard === 0);
assert.ok(goed.ride.score.satisfaction >= START_TEVREDEN - 1, 'netjes rijden: tevreden ' + goed.ride.score.satisfaction);
assert.ok(goed.evs.some((e) => e.type === 'request'), 'een reiziger drukt op de halteknop');
// in en uitstappen telt pas na het openen: bij de aankomst is er nog niets veranderd
{
  const ride = makeRide(line, { rng: mk() });
  startRide(ride);
  const doors = makeBediening();
  const bus = { x: 0, y: 0, speed: 0, doors };
  const na0 = ride.onBoard;
  ride.phase = 'drive'; ride.next = 1; ride.t = 40;
  bus.x = 500; bus.speed = 0;
  const ev = updateRide(ride, bus, 0.1);
  assert.ok(ev.some((e) => e.type === 'arrive' && e.manual));
  assert.strictEqual(ride.onBoard, na0, 'deuren dicht: niemand stapt in of uit');
  assert.strictEqual(ride.phase, 'dwell');
  toggleDeuren(doors, 0); stepBediening(doors, 1, 0);
  const ev2 = updateRide(ride, bus, 0.1);
  assert.ok(ev2.some((e) => e.type === 'doorsopen'));
  // met open deuren geen vertrek: de bus blijft staan
  ride.dwellLeft = 0; ride.boardLeft = 0;
  updateRide(ride, bus, 0.1);
  assert.strictEqual(ride.phase, 'dwell', 'open deuren houden de bus vast');
  toggleDeuren(doors, 0); stepBediening(doors, 1, 0);
  updateRide(ride, bus, 0.1);
  assert.strictEqual(ride.phase, 'drive', 'deuren dicht: vertrekken mag');
}

const sluip = rij('sluipen');
assert.ok(sluip.evs.some((e) => e.type === 'skipped'), 'wegrijden zonder deuren te openen wordt gemeld');
assert.ok(sluip.ride.skipped >= 1 && sluip.ride.tevreden.sat < goed.ride.tevreden.sat, 'reizigers die blijven staan zijn ontevreden');

const kneel = rij('goed', { kneel: true });
assert.ok(kneel.evs.filter((e) => e.type === 'doorsopen').some((e) => e.kneel), 'een lage instap wordt herkend');

// de oude, automatische deuren (geen doors) werken nog
{
  const ride = makeRide(line, { rng: mk() });
  startRide(ride);
  ride.phase = 'drive'; ride.next = 1; ride.t = 40;
  const ev = updateRide(ride, { x: 500, y: 0, speed: 0 }, 0.1);
  assert.ok(ev.some((e) => e.type === 'arrive' && !e.manual));
  assert.strictEqual(ride.phase, 'dwell');
}

console.log('busbestuur_test ok');
