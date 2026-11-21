// Uitsluitlijst van Bezit (#1102): wat niet te koop is, met een Nederlandse reden; opdrachtpanden komen vrij na het slot van hun akte; elke
// missielocatie die in de data staat als vast punt is gedekt.   node scripts/businessexclusion_test.mjs
// De echte missiedefinities importeren three (missiedecor.js) en draaien niet onder gewone node: de test leest daarom de bronbestanden van
// de akten en haalt de vaste punten (at: [x, y], walk(x, y), drive(x, y)) er met een regex uit. Doelen die via een naam gaan (landmark,
// shop) staan niet in die steekproef: dat is het gat dat de wereld moet dichten via ctx.missionSpots (zie docs/BEZIT-VERIFICATIE-21-11.md).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as X from '../game/js/businessexclusion.js';
import * as Bz from '../game/js/business.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const row = (o = {}) => ({ osm: 1, x: 100, y: 100, m2: 100, type: 'yes', landmark: false, ...o });
const BANNED = /\b(albert|heijn|jumbo|mcdonald|kfc|shell|bp|ing|rabobank|nederland|politie nederland)\b/i;

t('standaard is een pand te koop', () => { assert.equal(X.excluded(row()), null); assert.equal(X.isBuyable(row({ type: 'house' })), true); assert.equal(X.excludedLabel(row()), ''); });
t('ziekenhuis, brandweer, politie en stations (pandsoort) zijn niet te koop, met reden', () => {
  for (const ty of ['hospital', 'fire_station', 'police', 'ambulance_station', 'train_station', 'bus_station']) {
    const e = X.excluded(row({ type: ty })); assert.ok(e, ty); assert.match(e.reason, /^Niet te koop: /);
  }
});
t('voorzieningen uit de wereld (ambulancepost, haltes) sluiten het pand erbij uit', () => {
  const facilityAt = (x, y) => (x === 500 ? 'ambulance' : x === 600 ? 'busstop' : x === 700 ? 'pharmacy' : null);
  assert.equal(X.excluded(row({ x: 500 }), { facilityAt }).code, 'hulpdienst');
  assert.equal(X.excluded(row({ x: 600 }), { facilityAt }).code, 'reizen');
  assert.equal(X.excluded(row({ x: 700 }), { facilityAt }), null);                   // een apotheek mag gekocht worden
});
t('het huidige missiedoel is nooit te koop; een opdracht die nog komt ook niet; na de akte komt het vrij', () => {
  const spots = [{ x: 1000, y: 1000, id: 'M05', act: 1 }, { x: 5000, y: 5000, id: 'M20', act: 3 }];
  const at = (x, y) => row({ x, y });
  assert.equal(X.excluded(at(1010, 1000), { missionSpots: spots, act: 1 }).code, 'missie');
  assert.equal(X.excluded(at(1010, 1000), { missionSpots: spots, act: 2 }), null);   // akte 1 is voorbij: het pand komt vrij
  const later = X.excluded(at(5000, 5010), { missionSpots: spots, act: 1 });
  assert.equal(later.code, 'missie'); assert.match(later.reason, /nog komt/);
  assert.equal(X.excluded(at(5000, 5010), { missionSpots: spots, act: 3 }).code, 'missie');   // in de akte zelf
  assert.equal(X.excluded(at(5000, 5010), { missionSpots: spots, act: 4 }), null);
  assert.equal(X.excluded(at(9000, 9000), { missionSpots: spots, act: 1 }), null);
  assert.ok(X.excluded(at(1010, 1000), { activeGoal: { x: 1000, y: 1000 }, act: 9 }), 'het actieve doel blijft dicht, ook in een latere akte');
  assert.equal(X.excluded(at(1100, 1000), { missionSpots: spots, act: 1 }), null);   // buiten de straal
});
t('safehuis, eigen huis en verhaalplekken zijn niet te koop', () => {
  assert.equal(X.excluded(row({ x: 10, y: 10 }), { home: [{ x: 12, y: 11 }] }).code, 'eigen');
  assert.equal(X.excluded(row({ x: 300, y: 300 }), { storySpots: [{ x: 305, y: 300, name: 'Fjord Frituur' }] }).code, 'verhaal');
  assert.equal(X.excluded(row({ osm: 77 }), { nameOf: (id) => (id === 77 ? 'De Zonnehoek' : '') }).code, 'verhaal');
  assert.equal(X.excluded(row({ osm: 78 }), { nameOf: () => 'Bakkerij Haverkamp' }), null);
});
t('monumenten en bijzondere gebouwen zijn nooit koopbaar (eigenaar 21-11)', () => {
  for (const x of [row({ type: 'church', landmark: true }), row({ type: 'museum' }), row({ type: 'civic' }), row({ type: 'yes', landmark: true })]) {
    const e = X.excluded(x);
    assert.equal(e.code, 'monument'); assert.match(e.reason, /Niet te koop/);
  }
  assert.equal(X.isMonument(row()), false);
});
t('ID-lijst en kapotte rijen: nooit een fout, nooit stil toegestaan', () => {
  assert.equal(X.excluded(null).code, 'id'); assert.equal(X.excluded({ osm: NaN }).code, 'id'); assert.equal(X.excluded({ osm: 5 }), null);
  X.BEZIT_UITSLUITING.ids.push({ osm: 424242, reason: 'Niet te koop: proef.' });
  assert.equal(X.excluded(row({ osm: 424242 })).reason, 'Niet te koop: proef.'); X.BEZIT_UITSLUITING.ids.pop();
});
t('alle redenen zijn Nederlands, beginnen met "Niet te koop" (of leggen uit) en bevatten geen echte merken', () => {
  for (const r of Object.values(X.REASONS)) { assert.ok(r.length > 10 && r.endsWith('.')); assert.ok(!BANNED.test(r), r); }
  for (const [k, v] of [...Object.entries(X.BEZIT_UITSLUITING.byType), ...Object.entries(X.BEZIT_UITSLUITING.byFacility)]) { assert.ok(X.REASONS[v[0]], k); assert.ok(v[1].length > 8 && !BANNED.test(v[1])); }
  for (const nm of X.BEZIT_UITSLUITING.storyNames) assert.ok(!BANNED.test(nm));
});

// ---- missielocaties uit de data ----
t('missionSpotsFrom haalt de punten uit definities (at, x/y, lijsten) met akte en id; teruggetrokken opdrachten tellen niet', () => {
  const defs = [
    { label: 'A', stages: [{ target: { at: [10, 20] } }, { target: { x: 30, y: 40 } }], waypoints: [{ x: 50, y: 60 }, [70, 80]] },
    { label: 'B', retired: true, stages: [{ target: { at: [1, 2] } }] },
    { label: 'C', start: { x: 0, y: 0, road: null }, stages: [] },
  ];
  const spots = X.missionSpotsFrom(defs, (d) => (d.label === 'A' ? 2 : 9));
  assert.deepEqual(spots.map((s) => [s.x, s.y, s.id, s.act]), [[10, 20, 'A', 2], [30, 40, 'A', 2], [50, 60, 'A', 2], [70, 80, 'A', 2]]);
  assert.deepEqual(X.missionSpotsFrom(null), []);
});
const FILES = { 'missions_defs.js': 1, 'missions_akte12.js': 2, 'missions_akte2.js': 2, 'missions_akte3.js': 3, 'missions_akte4.js': 4, 'missions_akte45.js': 5, 'missions_akte5.js': 5, 'missions_akte6.js': 6, 'missions_nieuw.js': 5 };
const RX = /(?:at:\s*\[|walk\(|drive\()\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
const found = [];
for (const [f, act] of Object.entries(FILES)) {
  const p = path.join(ROOT, 'game/js', f);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  for (const m of src.matchAll(RX)) found.push({ f, act, x: Number(m[1]), y: Number(m[2]) });
}
t(`elke vaste missielocatie uit de bronbestanden (${found.length} punten) is gedekt: niet te koop in zijn akte, vrij erna`, () => {
  assert.ok(found.length >= 20, `steekproef te klein: ${found.length}`);
  const defs = found.map((s, i) => ({ label: `${s.f}#${i}`, act: s.act, stages: [{ target: { at: [s.x, s.y] } }] }));
  const spots = X.missionSpotsFrom(defs, (d) => d.act);
  assert.ok(spots.length >= found.length * 0.9);
  for (const s of found) {
    const b = row({ osm: 9, x: s.x + 5, y: s.y - 4 });
    const inAct = X.excluded(b, { missionSpots: spots, act: s.act });
    assert.ok(inAct && inAct.code === 'missie', `${s.f} (${s.x}, ${s.y}) niet gedekt`);
    assert.match(inAct.reason, /^Niet te koop: /);
  }
});
t('een pand dat het doel is van een latere akte is nu al dicht; een akte later is het open', () => {
  const late = found.filter((s) => s.act >= 3).slice(0, 5); assert.ok(late.length);
  const defs = late.map((s, i) => ({ label: 'L' + i, act: s.act, stages: [{ target: { at: [s.x, s.y] } }] }));
  const spots = X.missionSpotsFrom(defs, (d) => d.act);
  for (const s of late) {
    assert.ok(X.excluded(row({ x: s.x, y: s.y }), { missionSpots: spots, act: 1 }));
    assert.equal(X.excluded(row({ x: s.x, y: s.y }), { missionSpots: spots.filter((q) => Math.hypot(q.x - s.x, q.y - s.y) <= 30 && q.act === s.act), act: s.act + 1 }), null);
  }
});

console.log(`businessexclusion_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
