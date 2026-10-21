// Samen spelen (#364): het weer van de gastheer bij de gasten (game/js/coopweer.js) en de roepjes (game/js/coopping.js).
import assert from 'node:assert/strict';
import { createWeatherState, stepWeather, regionWeather, REGION_IDS, WEATHER_KINDS } from '../game/js/weatherstate.js';
import { weerEvent, leesWeerEvent, pasWeerToe, WEER_EVERY } from '../game/js/coopweer.js';
import { pingPlek, pingMarkers, pingRegel, afzender, PING_TOETSEN, KIJK_AFSTAND } from '../game/js/coopping.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const roster = [{ slot: 0, char: 'tammo', naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek' }, { slot: 2, char: 'rik', naam: 'Rik', kleur: '#f2b134', vorm: 'vierkant' }];

t('een weerbericht gaat heen en terug zonder verlies (op drie decimalen)', () => {
  const ws = createWeatherState(3); for (let i = 0; i < 900; i++) stepWeather(ws, 1, 15);
  const ev = weerEvent(ws); assert.equal(ev.k, 'weer'); assert.ok(JSON.stringify(ev).length < 400, 'klein genoeg om elke ' + WEER_EVERY + ' s te sturen');
  const gast = pasWeerToe(createWeatherState(99), leesWeerEvent(JSON.parse(JSON.stringify(ev))));
  for (const id of REGION_IDS) { const a = regionWeather(gast, id), b = regionWeather(ws, id); assert.equal(a.kind, b.kind); assert.ok(Math.abs(a.rain - b.rain) < 0.002 && Math.abs(a.windAngle - b.windAngle) < 0.002); }
});
t('een gast met andere eigen toestand wordt overschreven; zijn machine rolt niet meer door', () => {
  const gast = createWeatherState(1); const ws = createWeatherState(2); ws.regions.stad.kind = 'mist'; ws.regions.stad.mist = 0.6;
  pasWeerToe(gast, leesWeerEvent(weerEvent(ws)));
  assert.equal(gast.regions.stad.kind, 'mist'); assert.ok(gast.regions.stad.duration > 1e6);
});
t('onzin wordt geweigerd: onbekende soort, getal buiten 0..1, geen object', () => {
  const ok = weerEvent(createWeatherState(4));
  assert.ok(leesWeerEvent(ok));
  assert.equal(leesWeerEvent({ ...ok, r: { stad: [99, 0, 0, 0] } }), null);
  assert.equal(leesWeerEvent({ ...ok, r: { stad: [0, 7, 0, 0] } }), null);
  assert.equal(leesWeerEvent({ ...ok, r: { stad: [0, 0, 0] } }), null);
  assert.equal(leesWeerEvent({ ...ok, f: 5 }), null);
  assert.equal(leesWeerEvent(null), null); assert.equal(weerEvent(null), null);
  assert.equal(WEATHER_KINDS.includes(leesWeerEvent(ok).regions.stad.kind), true);
});
t('roepjes: drie toetsen, plek op jezelf of vooruit, afzender met naam en kleur', () => {
  assert.deepEqual(PING_TOETSEN.map((p) => p.soort), ['hier', 'gevaar', 'doel']);
  assert.deepEqual(pingPlek({ x: 10, y: 20, angle: 0 }, 'hier'), { x: 10, y: 20 });
  const d = pingPlek({ x: 0, y: 0, angle: Math.PI / 2 }, 'doel'); assert.ok(Math.abs(d.y - KIJK_AFSTAND) < 1e-9 && Math.abs(d.x) < 1e-9);
  assert.equal(pingPlek({ x: NaN, y: 0 }, 'hier'), null);
  assert.equal(afzender('2', roster, 0).naam, 'Rik'); assert.equal(afzender('eigen', roster, 0).naam, 'Tammo'); assert.equal(afzender('9', roster, 0).naam, '');
  assert.equal(pingRegel('2', 'gevaar', roster, 0), 'Rik: Help!'); assert.equal(pingRegel('9', 'doel', roster, 0), 'Kijk daar');
  const m = pingMarkers({ lijst: [{ x: 1, y: 2, van: '2', soort: 'gevaar', tot: 10 }, { x: 3, y: 4, van: 'eigen', soort: 'hier', tot: 1 }] }, roster, 0, 5);
  assert.equal(m.length, 1, 'verlopen pings tellen niet'); assert.equal(m[0].kleur, '#f2b134'); assert.equal(m[0].vorm, 'kruis', 'Help! is altijd een kruis (kleur is nooit het enige signaal)'); assert.ok(m[0].rest > 0);
});

console.log(`coopweer_test: ${n}/${n} ok`);
