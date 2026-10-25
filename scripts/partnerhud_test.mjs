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
  assert.equal(s({ x: 0, y: 0, alive: true, down: true }), 'neergeslagen', 'een ragdoll is neer, maar niet dood (#369)');
  assert.equal(s({ x: 0, y: 0, alive: false, down: false }), 'neergeslagen', 'dood of gepakt blijft neergeslagen');
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
  assert.equal(p.lijst.length, P.PING_PER_AFZENDER, 'één speler houdt de lijst niet vol');
  assert.deepEqual(p.lijst.map((q) => q.x), [8, 9], 'de oudste van die speler gaat eerst');
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
  assert.deepEqual(P.voertuigActie(me, { vehicle: null }, veh, 'mijn-auto'), { actie: 'roep', id: 'mijn-auto', tekst: 'Voertuig komt' });
  assert.equal(P.voertuigActie(me, { vehicle: null }, veh).actie, 'geen');
});
t('N spelers: alle anderen met eigen naam, kleur en vorm uit de lijst; jezelf niet', () => {
  const roster = [{ slot: 0, char: 'tammo' }, { slot: 1, char: 'anita' }, { slot: 2, char: 'bram' }, { slot: 3, char: 'lotte', verbinding: 'lag' }];
  const players = roster.map((r) => ({ slot: r.slot, x: r.slot * 10, y: 0, alive: true }));
  const p = P.partnersInfo(2, players, roster);
  assert.deepEqual(p.map((x) => x.naam), ['Tammo', 'Tessa', 'Lotte']);
  assert.equal(new Set(p.map((x) => x.kleur)).size, 3); assert.equal(new Set(p.map((x) => x.vorm)).size, 3);
  assert.equal(p[2].tekst, 'verbinding haperd'); assert.equal(p[0].tekst, 'te voet');
});
t('N spelers: een neergeslagen speler (down) telt ook in de lijst van 3 gasten (#369)', () => {
  const roster = [{ slot: 0, char: 'tammo' }, { slot: 1, char: 'anita' }, { slot: 2, char: 'bram' }, { slot: 3, char: 'lotte' }];
  const players = [{ slot: 0, x: 0, y: 0, alive: true, down: true }, { slot: 1, x: 10, y: 0, alive: true, down: false }, { slot: 2, x: 20, y: 0, alive: true, down: true }, { slot: 3, x: 30, y: 0, alive: false }];
  const p = P.partnersInfo(9, players, roster);
  assert.deepEqual(p.map((x) => x.tekst), ['neergeslagen', 'te voet', 'neergeslagen', 'neergeslagen']);
  assert.deepEqual(p.map((x) => x.status), ['neer', 'voet', 'neer', 'neer']);
});
t('N spelers: markers voor iedereen op kaart en minimap, buiten beeld op de rand met pijl', () => {
  const roster = [{ slot: 0, char: 'tammo' }, { slot: 1, char: 'anita' }, { slot: 2, char: 'rik' }];
  const players = [{ slot: 0, x: 10, y: 0 }, { slot: 1, x: 5000, y: 0 }, { slot: 2, x: 0, y: 20 }];
  const m = P.projectMarkers(P.partnersInfo(9, players, roster), { cx: 0, cy: 0, scale: 1, rx: 100, ry: 100 });
  assert.equal(m.length, 3);
  assert.equal(m.find((x) => x.slot === 1).buiten, true); assert.equal(m.find((x) => x.slot === 0).buiten, false);
  assert.deepEqual(m.map((x) => x.naam), ['Tammo', 'Tessa', 'Rik']);
});
t('N spelers: een speler zonder gegevens heeft geen marker', () => {
  const m = P.projectMarkers(P.partnersInfo(0, [], [{ slot: 0, char: 'tammo' }, { slot: 1, char: 'anita' }]), { cx: 0, cy: 0, scale: 1, rx: 50, ry: 50 });
  assert.deepEqual(m, []);
});
t('pings per afzender: elke speler heeft zijn eigen cooldown', () => {
  const p = P.createPings();
  for (let van = 1; van <= 16; van++) assert.ok(P.addPing(p, { x: van, y: 0, van }, 0), `speler ${van}`);
  assert.equal(P.addPing(p, { x: 9, y: 0, van: 2 }, 0.5), null);
  assert.equal(p.lijst.length, 16, 'een ping van elke speler van een volle sessie staat er tegelijk');
  assert.equal(P.PING_MAX, 16);
});
console.log(`partnerhud_test: ${n}/${n} ok`);
