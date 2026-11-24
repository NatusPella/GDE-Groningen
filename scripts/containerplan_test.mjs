// Het containerlabyrint (M13) ligt op de plek waar de containers staan (#928):
// de missie stuurde je naar container 4471, maar die stond 260 m van de kade in
// het weiland. containerplan.js is de ene bron voor de missiestappen en de
// rekwisieten (containerterminal.js); deze test houdt die twee bij elkaar.
//   node scripts/containerplan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wgsToWorld } from '../game/js/rdnew.js';
import { M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT, M13_ANCHOR_WGS, M13_MAX_ANCHOR_DIST, CONTAINER_STACKS, CABLE_REELS, m13Problems, m13Footprints, shiftM13Plan, applyM13Shift, m13DecisionReady, M13_DECIDE_RADIUS_M } from '../game/js/containerplan.js';
import { spotProblems, spotClear, nearestClearSpot } from '../game/js/missionplace.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

t('de plekken hangen aan één anker bij de oostkade, niet 260 m het land in', () => {
  const [bx, by] = wgsToWorld(...M13_ANCHOR_WGS);
  assert.deepEqual([...M13_ANCHOR_WGS], [53.4432, 6.8562]);
  assert.equal(M13_CONTAINER.x, bx + 95);
  assert.equal(M13_CONTAINER.y, by + 15);
  assert.equal(M13_CRANE.x, bx + 11);
  assert.equal(M13_CRANE.y, by + 18);
  assert.equal(M13_QUAY.x, bx + 60);
  assert.equal(M13_LAMMERT.x, bx + 66);
  for (const p of [M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT]) assert.ok(Math.hypot(p.x - bx, p.y - by) <= M13_MAX_ANCHOR_DIST, 'binnen bereik van het anker');
});

t('er staat een blauwe en een rode container om 4471 te herkennen', () => {
  assert.ok(CONTAINER_STACKS.length >= 4);
  const blauw = CONTAINER_STACKS.filter((c) => c.kleur === '#2d6a86');
  const rood = CONTAINER_STACKS.filter((c) => c.kleur === '#d55e00');
  assert.equal(blauw.length, 1);
  assert.ok(rood.length >= 1, 'de blauwe staat naast de rode');
  assert.ok(blauw[0].lengte >= 12, 'een echte zeecontainer is 12 m');
  for (const c of CONTAINER_STACKS) {
    assert.ok(Math.hypot(c.x - M13_CONTAINER.x, c.y - M13_CONTAINER.y) < 20, 'de stapel staat bij het doel');
    assert.ok(c.stapel >= 0 && c.stapel <= 1);
  }
  assert.ok(CABLE_REELS.length >= 2, 'de kabelrollen staan bij de kraan');
});

t('de missie gebruikt dezelfde plekken als de rekwisieten', () => {
  const missie = lees('missions_nieuw.js');
  assert.match(missie, /import \{ M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT, shiftM13Plan, applyM13Shift, m13DecisionReady \} from '\.\/containerplan\.js'/);
  assert.match(missie, /start: \{ \.\.\.M13_QUAY \}/);
  assert.match(missie, /target: \{ \.\.\.M13_CRANE, label: 'De kraan aan de kade' \}/);
  assert.match(missie, /target: \{ \.\.\.M13_CONTAINER, label: 'Container 4471' \}/);
  assert.match(missie, /target: \{ \.\.\.M13_LAMMERT, label: 'Lammert, aan de kade' \}/);
  assert.ok(!/spotAt\(53\.4440, 6\.8560, 260, 40\)/.test(missie), 'geen losse offset meer');
});

t('de rekwisieten bouwen de stapel, de kraan en de rollen op die plekken', () => {
  const bron = lees('containerterminal.js');
  assert.match(bron, /import \{ M13_CRANE, M13_CONTAINER, CONTAINER_STACKS, CABLE_REELS \} from '\.\/containerplan\.js'/);
  assert.match(bron, /for \(const c of CONTAINER_STACKS\) stapel\(root, c\)/);
  assert.match(bron, /kraan\(root\)/);
  assert.match(bron, /addStaticCollider\('container', c\.x, c\.y/);
  assert.match(lees('heist.js'), /placeContainerTerminal\(world, THREE\)/, 'de bare-missie zet de rekwisieten neer');
});

t('de kabelhaspel krijgt zijn straal uit het plan, niet het hele rolobject (NaN-geometrie bij de start van M13, #955)', () => {
  const bron = lees('containerterminal.js');
  assert.ok(bron.includes("prop(g, 'kabelhaspel', r.x, r.y, 0, { schaal: r.r / 1.2 })"));
});

t('#1328: de loskade komt uit het prop-register, zonder losse dozen of cilinders, en staat op de grond', () => {
  const bron = lees('containerterminal.js').replace(/\/\/.*$/gm, '');
  assert.ok(!/new T\.(BoxGeometry|CylinderGeometry|SphereGeometry)/.test(bron), 'geen losse primitieven in de scenecode');
  for (const id of ['container20', 'container40', 'havenkraan', 'havenhek', 'lichtmast', 'heftruck', 'kabelhaspel', 'bolder']) {
    assert.ok(bron.includes(`'${id}'`), id + ' staat op de kade');
    assert.ok(lees('propregister.js').includes(`  ${id}: {`), id + ' staat in het register');
  }
  assert.match(bron, /VOERTUIG_REGISTER\.truck\.model/, 'de vrachtwagen komt uit het voertuigregister');
  assert.match(bron, /map\.surfaceAt\(x, y, st\)/, 'de hoogte komt uit de ene hoogtevraag van de kaart');
  assert.match(bron, /verharding\(root, M13_CONTAINER\.x, M13_CONTAINER\.y, 46, 26\)/, 'de verharding ligt over het containerveld uit m13Footprints');
});

// Een nagebootste map met dezelfde vragen als TileWorld: een weg, een gebouw en een waterstrook (NIET de echte wereld).
const rechthoek = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const nepMap = (o = {}) => ({
  roadsNear: () => o.roads || [], buildingsNear: () => o.buildings || [], waterNear: () => o.water || [], flatWaterNear: () => [], railNear: () => o.rails || [],
});

t('spotProblems herkent weg, gebouw, water en spoor, en spotClear houdt ruimte', () => {
  const m = nepMap({
    roads: [{ pts: [[0, 0], [100, 0]], width: 6 }], buildings: [{ pts: rechthoek(40, 20, 60, 30) }],
    water: [{ pts: rechthoek(-50, -50, -10, 50) }], rails: [{ pts: [[0, 80], [100, 80]] }],
  });
  assert.deepEqual(spotProblems(m, 50, 1), ['weg']);
  assert.deepEqual(spotProblems(m, 50, 25), ['gebouw']);
  assert.deepEqual(spotProblems(m, -30, 10), ['water']);
  assert.deepEqual(spotProblems(m, 50, 80.5), ['spoor']);
  assert.deepEqual(spotProblems(m, 50, 50), []);
  assert.ok(!spotClear(m, 50, 5, 3), 'te dicht bij de weg met ruimte');
  assert.ok(spotClear(m, 50, 50, 5));
});

t('nearestClearSpot kiest de dichtstbijzijnde vrije plek, steeds dezelfde', () => {
  const m = nepMap({ roads: [{ pts: [[-200, 0], [200, 0]], width: 6 }] });
  const a = nearestClearSpot(m, 10, 0, { r: 4 }), b = nearestClearSpot(m, 10, 0, { r: 4 });
  assert.deepEqual(a, b, 'deterministisch');
  assert.ok(Math.abs(a.y) >= 3 + 4 - 1e-6 && a.moved <= 10, 'net naast de weg');
  assert.equal(nearestClearSpot(m, 0, 40, { r: 4 }).moved, 0, 'een vrije plek blijft staan');
  assert.equal(nearestClearSpot(nepMap({ water: [{ pts: rechthoek(-1e4, -1e4, 1e4, 1e4) }] }), 0, 0, { maxD: 30 }), null, 'niets vrij: null');
});

t('een plan op een weg wordt als groep verschoven en past daarna, met dezelfde uitkomst voor iedereen', () => {
  // de container van het oude plan lag op een weg: dezelfde situatie nagebootst
  const weg = { pts: [[M13_CONTAINER.x - 200, M13_CONTAINER.y], [M13_CONTAINER.x + 200, M13_CONTAINER.y]], width: 6 };
  const m = nepMap({ roads: [weg] });
  const voor = m13Problems(m);
  assert.ok(voor.some(([naam]) => naam === 'container'), 'de container staat op de weg');
  const s1 = shiftM13Plan(m), s2 = shiftM13Plan(m);
  assert.ok(s1 && s2 && s1.dx === s2.dx && s1.dy === s2.dy, 'dezelfde verschuiving bij elke aanroep');
  assert.ok(Math.hypot(s1.dx, s1.dy) <= 120);
  const kopie = [M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT, ...CONTAINER_STACKS, ...CABLE_REELS].map((p) => [p.x, p.y]);
  try {
    applyM13Shift(s1);
    assert.deepEqual(m13Problems(m), [], 'na de verschuiving staat alles vrij');
    assert.equal(shiftM13Plan(m), null, 'een geldig plan blijft staan');
  } finally {
    [M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT, ...CONTAINER_STACKS, ...CABLE_REELS].forEach((p, i) => { p.x = kopie[i][0]; p.y = kopie[i][1]; });
  }
  assert.equal(shiftM13Plan(nepMap()), null, 'een lege map vraagt niets');
});

t('de voetafdrukken dekken kraan, rollen, stapel, pad en kadevloer', () => {
  const namen = new Set(m13Footprints().map(([n]) => n));
  for (const n of ['kade', 'Lammert', 'kraan', 'kabelrol', 'container', 'pad', 'kadevloer']) assert.ok(namen.has(n), n);
});

t('de beslissing over de verschuiving wacht op voltooide rijen over de hele zoekstraal (host en gast gelijk)', () => {
  const tileIndexOf = (x, y) => [Math.floor(x / 1000), Math.floor(y / 1000)];
  const c = { x: 5500, y: 5500 };
  const R = M13_DECIDE_RADIUS_M;
  assert.ok(R >= 120, 'minstens de zoekstraal van shiftM13Plan (maxD 120)');
  // alle negen tegels rond het plan klaar
  const alle = new Set();
  for (const dx of [-R, 0, R]) for (const dy of [-R, 0, R]) alle.add(tileIndexOf(c.x + dx, c.y + dy).join(','));
  const klaar = { tileRowsDone: (i, j) => alle.has(`${i},${j}`) };
  assert.equal(m13DecisionReady(klaar, c, tileIndexOf), true);
  // een tegel die al resident is maar waarvan de rijen nog in de wachtrij staan, telt niet (de oude test keek naar resident)
  const half = { resident: alle, tileRowsDone: (i, j) => alle.has(`${i},${j}`) && !(i === 5 && j === 5) };
  assert.equal(m13DecisionReady(half, c, tileIndexOf), false, 'een half gevulde tegel: nog niet beslissen');
  // zonder tileRowsDone (een kaart zonder wachtrij): resident
  assert.equal(m13DecisionReady({ resident: alle }, c, tileIndexOf), true);
  assert.equal(m13DecisionReady({ resident: new Set() }, c, tileIndexOf), false);
  // dezelfde (volledige) gegevens geven host en gast dezelfde verschuiving
  const a = shiftM13Plan(nepMap()), b = shiftM13Plan(nepMap());
  assert.deepEqual(a, b);
  assert.equal(m13DecisionReady(null, c, tileIndexOf), false);
});

console.log(`containerplan_test: ${n}/${n} ok`);
