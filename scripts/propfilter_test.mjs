// propfilter.js (wereldaudit 21-11): kit-props langs de tegelkaart. Puur, zonder tegels.
//   node scripts/propfilter_test.mjs
import assert from 'node:assert/strict';
import { onGroundRoad, inBuildingAt, waterDistance, dropStreekParts, dropWaterParts, stationFit, nearRailAt, opEchtPerron, plaatOverWeg, perronKitDubbel } from '../game/js/propfilter.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const bounds = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const lijn = (pts, extra = {}) => ({ pts, bounds: bounds(pts), ...extra });
const vlak = (pts, extra = {}) => ({ pts, bounds: bounds(pts), ...extra });
const zoek = (rows) => (x, y, r) => rows.filter((o) => x >= o.bounds[0] - r && x <= o.bounds[2] + r && y >= o.bounds[1] - r && y <= o.bounds[3] + r);
const kaart = ({ roads = [], buildings = [], water = [], rails = [] } = {}) => ({ roadsNear: zoek(roads), buildingsNear: zoek(buildings), waterNear: zoek(water), railNear: zoek(rails) });

const weg = lijn([[0, 0], [100, 0]], { width: 6, cat: 'normal' });
const huis = vlak([[40, 20], [60, 20], [60, 30], [40, 30], [40, 20]], { type: 'house' });
const meer = vlak([[200, -50], [300, -50], [300, 50], [200, 50], [200, -50]], { kind: 'meer' });
const spoor = lijn([[0, 100], [100, 100]]);

t('onGroundRoad: de rijbaan telt, een brug niet, een voetpad niet', () => {
  const m = kaart({ roads: [weg, lijn([[0, 40], [100, 40]], { width: 3, cat: 'foot' }), lijn([[0, 60], [100, 60]], { width: 6, cat: 'normal', bridge: true })] });
  assert.equal(onGroundRoad(m, 50, 2), true);
  assert.equal(onGroundRoad(m, 50, 5), false);
  assert.equal(onGroundRoad(m, 50, 40), false, 'voetpad');
  assert.equal(onGroundRoad(m, 50, 60), false, 'brug');
});

t('inBuildingAt en waterDistance', () => {
  const m = kaart({ buildings: [huis], water: [meer] });
  assert.equal(inBuildingAt(m, 50, 25), true);
  assert.equal(inBuildingAt(m, 50, 15), false);
  assert.equal(waterDistance(m, 250, 0, 60), 0);
  assert.ok(Math.abs(waterDistance(m, 170, 0, 60) - 30) < 1e-6);
  assert.equal(waterDistance(m, 0, 0, 60), Infinity);
});

t('dropStreekParts: een mast op het asfalt of in een huis valt weg, een vrije blijft', () => {
  const m = kaart({ roads: [weg], buildings: [huis] });
  const part = (x, z) => ({ s: 'box', x, y: 0, z, w: 1, h: 10, d: 1 });
  const kept = dropStreekParts([part(10, 1), part(50, 25), part(10, 50)], m, 'mast');
  assert.deepEqual(kept.map((q) => [q.x, q.z]), [[10, 50]]);
});

t('dropStreekParts: een perron blijft in een gebouw (overkapping), maar niet op het spoor', () => {
  const m = kaart({ buildings: [huis], rails: [spoor] });
  const part = (x, z) => ({ s: 'box', x, y: 0, z, w: 1, h: 3, d: 1 });
  const kept = dropStreekParts([part(50, 25), part(10, 100.5), part(10, 90)], m, 'perron');
  assert.deepEqual(kept.map((q) => [q.x, q.z]), [[50, 25], [10, 90]]);
});

t('perronkit (#1346): een kit op een echt perron is een dubbel; een lange plaat over een weg valt weg; een kit ver van een perron blijft', () => {
  const rij = { id: 'echt', p: [[0, 200, 2, 6.62], [40, 200, 2, 6.62], [80, 200, 2, 6.62]], r: [] };
  const kaartMet = (extra) => ({ ...kaart(extra), perrons: [rij] });
  // het kit: een plaat van 160 m, 0,9 m hoog, een lantaarn en een eindstuk, met zijn midden naast het echte perron
  const plaat = (x, z) => ({ s: 'box', x, y: 0, z, w: 160, h: 0.9, d: 8, ry: 0 });
  const eind = (x, z) => ({ s: 'box', x, y: 0.9, z, w: 0.8, h: 0.5, d: 8, ry: 0 });
  assert.equal(opEchtPerron(kaartMet(), plaat(40, 203)), true, 'de plaat ligt op het echte perron');
  assert.equal(opEchtPerron(kaartMet(), plaat(40, 400)), false, 'een plaat ver weg is geen dubbel');
  assert.equal(perronKitDubbel(kaartMet(), [eind(120, 203), plaat(40, 203)]), true, 'het hele kit valt weg, ook het eindstuk');
  assert.equal(perronKitDubbel(kaartMet(), [eind(120, 203), plaat(40, 400)]), false);
  // een weg die dwars door de plaat loopt (Kastanjelaan onder Groningen Noord): de plaat valt weg, ook als het midden vrij ligt
  const dwars = lijn([[60, 380], [60, 420]], { width: 6, cat: 'normal' });
  const m = kaart({ roads: [dwars] });
  assert.equal(plaatOverWeg(m, plaat(0, 400)), true, 'de plaat kruist de weg');
  assert.equal(dropStreekParts([plaat(0, 400)], m, 'perron').length, 0);
  assert.equal(plaatOverWeg(m, plaat(0, 450)), false, 'een plaat naast de weg blijft');
  assert.equal(dropStreekParts([plaat(0, 450)], m, 'perron').length, 1);
});

t('dropWaterParts: een kade of pier ver van water valt weg, een sluis niet; niets op een weg', () => {
  const m = kaart({ roads: [weg], water: [meer] });
  const part = (x, z) => ({ s: 'box', x, y: 0, z, w: 1, h: 3, d: 1 });
  const haven = { t: 'haven' }, pier = { t: 'pier' }, sluis = { t: 'sluis' };
  assert.equal(dropWaterParts([part(250, 0), part(190, 0), part(0, 300)], m, haven).length, 2, 'haven: binnen 60 m van het water blijft');
  assert.equal(dropWaterParts([part(250, 0), part(0, 300)], m, pier).length, 1, 'pier: 300 m weg valt');
  assert.equal(dropWaterParts([part(0, 300)], m, sluis).length, 1, 'sluis: geen waterregel');
  assert.equal(dropWaterParts([part(10, 1)], m, { t: 'pier' }).length, 0, 'op de weg');
});

t('stationFit: evenwijdig aan het spoor, ernaast, perronzijde naar de sporen', () => {
  const m = kaart({ rails: [lijn([[0, 0], [200, 0]])] });
  const fit = stationFit(m, { x: 100, y: 0.5 });
  assert.ok(fit && fit !== 'tile');
  assert.ok(Math.abs(Math.abs(Math.sin(fit.angle))) < 1e-6, 'evenwijdig aan het spoor (as langs x)');
  assert.ok(Math.abs(fit.y) >= fit.wid / 2 + 2, 'naast het spoor, niet erop');
  // lokaal +z = (-sin a, cos a) wijst naar het spoor
  const zx = -Math.sin(fit.angle), zy = Math.cos(fit.angle);
  assert.ok(zx * (0 - fit.x) + zy * (0 - fit.y) > 0 || Math.abs(zy * fit.y) > 0, 'perronzijde');
  assert.ok(zy * (-fit.y) > 0, 'de perronzijde kijkt naar het spoor');
  // op het spoor zelf een voetafdruk: nooit
  for (let u = -16; u <= 16; u += 4) for (let v = -6; v <= 6; v += 3) assert.equal(nearRailAt(m, fit.x + u * Math.cos(fit.angle) - v * Math.sin(fit.angle), fit.y + u * Math.sin(fit.angle) + v * Math.cos(fit.angle), 2.1), false);
});

t('stationFit: een stationsgebouw van de tegels binnen 60 m tekent zelf, geen spoor geeft null', () => {
  const station = vlak([[90, 5], [110, 5], [110, 15], [90, 15], [90, 5]], { type: 'train_station' });
  assert.equal(stationFit(kaart({ rails: [lijn([[0, 0], [200, 0]])], buildings: [station] }), { x: 100, y: 0 }), 'tile');
  assert.equal(stationFit(kaart(), { x: 100, y: 0 }), null);
});

console.log(`propfilter_test: ${n}/${n} ok`);
