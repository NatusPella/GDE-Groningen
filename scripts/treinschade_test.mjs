// Samen spelen (#434): een trein deelt zijn klap ook uit aan een gast. De gastheer heeft het lichaam van de gast
// (plek 1 de metgezel, plek 2 en hoger een figuur), maar niet zijn gezondheid: de schade gaat als bericht 'schade'
// naar die gast, met dezelfde regel als bij de eigen speler (railway.js hitPlayer).
//   node scripts/treinschade_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import { treinKlap, treinSchade, TREIN_RAAK_MIN, TREIN_RAAK_AFKOEL } from '../game/js/treincoop.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok  ' + naam); };

// --- de regel, puur
t('een langzame wagen duwt alleen opzij, een rijdende trein deelt een klap uit', () => {
  assert.equal(treinKlap(0, 10), null, 'stilstaand');
  assert.equal(treinKlap(TREIN_RAAK_MIN - 0.01, 10), null, 'kruipend');
  assert.ok(treinKlap(TREIN_RAAK_MIN, 10), 'vanaf 1,5 m/s telt hij');
  assert.ok(treinKlap(20, 10).schade > treinKlap(5, 10).schade, 'harder rijden is meer schade');
});

t('de schade is die van de eigen speler: 25 plus 3,5 per m/s', () => {
  assert.equal(treinSchade(0), 25);
  assert.equal(treinSchade(10), 60);
  assert.equal(treinSchade(NaN), 25, 'geen onzin bij een ontbrekende snelheid');
  assert.equal(treinSchade(-4), 25, 'een negatieve snelheid telt niet mee');
  assert.equal(treinKlap(10, 10).schade, 60);
});

t('niet elke beeld opnieuw: dezelfde afkoel als bij de eigen speler', () => {
  assert.equal(treinKlap(10, 10, 9.5), null, 'net geraakt: geen tweede klap');
  assert.equal(treinKlap(10, 10, -Infinity).schade, 60, 'nooit geraakt: wel');
  assert.equal(treinKlap(10, 10, 10 - TREIN_RAAK_AFKOEL - 0.1).schade, 60, 'de afkoel is voorbij');
});

// --- bij de gastheer: een figuur (plek 3) op het spoor krijgt duw en schade, de gastheer niets
const pts = [];
for (let i = 0; i <= 100; i++) pts.push([i * 10, 0]);
const route = { name: 'proef', train: 'gtw', pts, stops: [{ s: 100, name: 'A' }, { s: 500, name: 'B' }, { s: 900, name: 'C' }], crossings: [] };
const map = { railRoutes: [route], railLifts: [], levelCrossings: [], meta: { bounds: [[0, -200], [1000, 200]] }, roadsNear: () => [] };
const H = await import('../game/js/railway.js');
const schade = [];
const berichten = [];
const hw = {
  map, vehicles: [], pedestrians: [], coopFigures: {}, coop: { remote: false },
  player: { x: 0, y: 500, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, companion: null,
  time: 0, clock: 10, money: 200, wanted: 0, health: 100, armor: 0,
  input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} },
  onRespawn: [], audioEvents: [], particles: [], addMessage(m) { berichten.push(m); }, stats: {},
  coopSchade(slot, s) { schade.push([slot, s]); },
};
H.initRailway(hw);
const ht = H.getTrains()[0];
ht.state = 'run'; ht.v = 12; ht.dir = 1; ht.c = 300; ht.target = 2;
H.placeTrain(ht);
const car = ht.cars[1];

t('een figuur op het spoor wordt opzij gezet en de gast hoort het', () => {
  const f = { slot: 3, naam: 'Maurits', x: car.x, y: car.y, z: 0, gz: car.z || 0, vx: 0, vy: 0 };
  hw.coopFigures[3] = f;
  H.updateRailway(1 / 60, hw);
  assert.equal(schade.length, 1, 'één bericht');
  assert.deepEqual(schade[0], [3, Math.round(treinSchade(ht.v))], 'voor plek 3, met de schade van de eigen speler');
  assert.ok(Math.abs(f.y - car.y) > 1.45 || Math.abs(f.x - car.x) > car.len / 2, 'hij staat naast de wagen');
  assert.ok(berichten.some((m) => m.includes('Maurits')), 'de gastheer leest wie er geraakt is: ' + berichten.join(' | '));
});

t('dezelfde speler krijgt niet elke beeld opnieuw schade', () => {
  const voor = schade.length;
  for (let k = 0; k < 10; k++) { hw.time += 1 / 60; H.updateRailway(1 / 60, hw); }
  assert.equal(schade.length, voor, 'binnen de afkoel geen tweede klap');
});

t('op een perron, op een viaduct of in een voertuig: geen schade', () => {
  const f = { slot: 2, naam: 'Nikky', x: car.x, y: car.y, z: 0, gz: (car.z || 0) + 6, vx: 0, vy: 0 };
  hw.coopFigures[2] = f;
  const voor = schade.length;
  hw.time += 5; H.updateRailway(1 / 60, hw);
  assert.equal(schade.length, voor, 'op een viaduct');
  f.gz = car.z || 0; f.inVeh = {};
  hw.time += 5; H.updateRailway(1 / 60, hw);
  assert.equal(schade.length, voor, 'in een voertuig');
});

t('plek 1 als gast: de schade gaat naar zijn eigen spel, niet naar de AI-metgezel', () => {
  const c = { x: car.x, y: car.y, z: 0, gz: car.z || 0, character: 'anita', health: 100, vx: 0, vy: 0 };
  hw.companion = c; hw.coop.remote = true;
  const voor = schade.length;
  hw.time += 5; H.updateRailway(1 / 60, hw);
  assert.equal(schade.length, voor + 1, 'een bericht voor plek 1');
  assert.equal(schade[schade.length - 1][0], 1);
  assert.equal(c.health, 100, 'de gastheer houdt geen tweede gezondheid bij voor een gast');
  // en als plek 1 de AI-metgezel is, gaat het zoals altijd van zijn eigen gezondheid af
  hw.coop.remote = false; c.health = 100; c._trainHitAt = undefined; c.x = car.x; c.y = car.y; c.state = 'walk';
  hw.time += 5; H.updateRailway(1 / 60, hw);
  assert.ok(c.health < 100, 'de AI-metgezel verliest gezondheid: ' + c.health);
  assert.equal(schade.length, voor + 1, 'geen bericht voor een AI');
});

console.log(`${n} treinschade-tests ok`);
