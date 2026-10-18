// Samen spelen (#95): partner-HUD, markers, pings, voertuig roepen (game/js/partnerhud.js).
import assert from 'node:assert/strict';
import * as P from '../game/js/partnerhud.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('naam en kleur: de host ziet Tessa, de gast ziet Tammo; vorm naast kleur', () => {
  const h = P.partnerInfo('host', { x: 1, y: 2, alive: true }), g = P.partnerInfo('gast', { x: 1, y: 2, alive: true });
  assert.equal(h.naam, 'Tessa'); assert.equal(g.naam, 'Tammo');
  assert.notEqual(h.kleur, g.kleur); assert.notEqual(h.vorm, g.vorm);
});
t('status: te voet, voertuig, aan het stuur, neergeslagen, haperend, weg', () => {
  const s = (x, v) => P.partnerInfo('host', x, v).tekst;
  assert.equal(s({ x: 0, y: 0, alive: true }), 'te voet');
  assert.equal(s({ x: 0, y: 0, alive: true, inVeh: true }), 'in een voertuig');
  assert.equal(s({ x: 0, y: 0, alive: true, inVeh: true, driver: true }), 'aan het stuur');
  assert.equal(s({ x: 0, y: 0, alive: false }), 'neergeslagen');
  assert.equal(s({ x: 0, y: 0, alive: true }, 'lag'), 'verbinding haperd');
  assert.equal(s({ x: 0, y: 0, alive: true }, 'lost'), 'verbinding weg');
});
t('zonder gegevens geen marker', () => {
  assert.equal(P.projectMarker(P.partnerInfo('host', null), { cx: 0, cy: 0, scale: 1, rx: 50, ry: 50 }), null);
});
t('marker: wereld-y omhoog is scherm omhoog; binnen beeld geen pijl', () => {
  const m = P.projectMarker(P.partnerInfo('host', { x: 10, y: 20 }), { cx: 0, cy: 0, scale: 1, rx: 100, ry: 100 });
  assert.deepEqual([m.x, m.y, m.buiten], [10, -20, false]); assert.equal(m.pijl, null);
});
t('marker: buiten beeld blijft op de rand met een pijl naar de partner', () => {
  const m = P.projectMarker(P.partnerInfo('host', { x: 1000, y: 0 }), { cx: 0, cy: 0, scale: 1, rx: 60, ry: 40 });
  assert.equal(m.buiten, true); assert.ok(Math.abs(m.x) <= 54 && Math.abs(m.y) <= 34);
  assert.ok(Math.abs(m.pijl) < 0.01, 'pijl wijst naar rechts');
  const d = P.projectMarker(P.partnerInfo('host', { x: 0, y: -1000 }), { cx: 0, cy: 0, scale: 1, rx: 60, ry: 40 });
  assert.ok(Math.abs(d.pijl - Math.PI / 2) < 0.01, 'pijl wijst omlaag');
});
t('marker: kaartdraaiing wordt meegenomen', () => {
  const m = P.projectMarker(P.partnerInfo('host', { x: 10, y: 0 }), { cx: 0, cy: 0, scale: 1, rx: 100, ry: 100, rot: Math.PI / 2 });
  assert.ok(Math.abs(m.x) < 1e-9 && Math.abs(m.y - 10) < 1e-9);
});
t('pings: cooldown, levensduur, maximum, per afzender', () => {
  const p = P.createPings();
  assert.ok(P.addPing(p, { x: 1, y: 1 }, 0));
  assert.equal(P.addPing(p, { x: 2, y: 2 }, 1), null, 'te snel');
  assert.ok(P.addPing(p, { x: 3, y: 3, van: 'ander' }, 1), 'andere afzender heeft een eigen cooldown');
  assert.ok(P.addPing(p, { x: 4, y: 4 }, 2));
  assert.equal(P.tickPings(p, P.PING_TTL + 1.5).length, 1);
  assert.equal(P.tickPings(p, 100).length, 0);
  for (let i = 0; i < 10; i++) P.addPing(p, { x: i, y: i }, 200 + i * 2);
  assert.equal(p.lijst.length, P.PING_MAX);
});
t('pings van de ander worden gecontroleerd: ongeldige of absurde coördinaten, onbekende soort', () => {
  const p = P.createPings();
  assert.equal(P.addPing(p, { x: NaN, y: 0 }, 0), null);
  assert.equal(P.addPing(p, { x: 1e9, y: 0 }, 0), null);
  assert.equal(P.addPing(p, { x: 1, y: 1, soort: '<b>' }, 0).soort, 'hier');
  assert.deepEqual(P.pingEvent(5, 6, 'gevaar'), { k: 'ping', x: 5, y: 6, soort: 'gevaar' });
});
t('voertuig: erbij springen binnen bereik, te ver, vol; eigen voertuig roepen; niets', () => {
  const me = { x: 0, y: 0 }, veh = { a: { driver: 1, passenger: null, x: 10, y: 0 }, b: { driver: 1, passenger: 0, x: 10, y: 0 }, c: { driver: 1, passenger: null, x: 500, y: 0 }, fiets: { driver: 1, passenger: null, x: 5, y: 0, stoelen: 1 } };
  assert.deepEqual(P.voertuigActie(me, { vehicle: 'a' }, veh), { actie: 'spring-erbij', id: 'a', stoel: 'passenger' });
  assert.equal(P.voertuigActie(me, { vehicle: 'b' }, veh).actie, 'vol');
  assert.equal(P.voertuigActie(me, { vehicle: 'fiets' }, veh).actie, 'vol', 'een eenzitter is vol');
  assert.equal(P.voertuigActie(me, { vehicle: 'c' }, veh).actie, 'te-ver');
  assert.deepEqual(P.voertuigActie(me, { vehicle: null }, veh, 'mijn-auto'), { actie: 'roep', id: 'mijn-auto', tekst: 'Je voertuig komt naar je medespeler.' });
  assert.equal(P.voertuigActie(me, { vehicle: null }, veh).actie, 'geen');
});
console.log(`partnerhud_test: ${n}/${n} ok`);
