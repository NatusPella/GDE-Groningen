// De snackwagens in de wereld: de planning (snackvanplan.js: hoogstens vijf, straal met hysterese, deterministisch, kleuren en borden) en de bronregels van de THREE-kant
// (snackvans3d.js wordt als tekst gecontroleerd: pool en dispose, geen Math.random, hergebruik van de foodtruck en de persoonsfiguur).   node scripts/snackvans3d_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as P from '../game/js/snackvanplan.js';
import * as SP from '../game/js/pitch.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const sites = SP.SPOT_IDS.map((id, i) => ({ ...SP.spotXY(id), spot: id, kind: i % 3 === 0 ? 'rival' : i % 3 === 1 ? 'own' : 'fleet' }));
const at = (id) => SP.spotXY(id);

t('hoogstens vijf wagens, de dichtstbijzijnde eerst, alleen binnen de straal', () => {
  const crowd = Array.from({ length: 12 }, (_, i) => ({ spot: SP.SPOT_IDS[i], kind: 'fleet', x: i * 10, y: 0 }));
  const p = P.planWagons(crowd, { x: 0, y: 0 });
  assert.equal(p.length, P.MAX_WAGONS); assert.deepEqual(p.map((q) => q.spot), SP.SPOT_IDS.slice(0, 5));
  for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].d <= p[i].d);
  assert.equal(P.planWagons(sites, { x: 1e6, y: 1e6 }).length, 0);
  assert.ok(P.MAX_WAGONS <= 6);
});
t('hysterese: een wagen die al in beeld is blijft tot 340 m, een nieuwe verschijnt pas binnen 260 m', () => {
  const s = [{ spot: 'markt', kind: 'own', x: 300, y: 0 }];
  assert.equal(P.planWagons(s, { x: 0, y: 0 }, new Set()).length, 0);
  assert.equal(P.planWagons(s, { x: 0, y: 0 }, new Set(['own:markt'])).length, 1);
  assert.equal(P.planWagons([{ ...s[0], x: 350 }], { x: 0, y: 0 }, new Set(['own:markt'])).length, 0);
});
t('de kleur en het bord volgen de soort; Us Mem heeft zijn eigen bord, een wagen draagt geen oude verhaalnaam', () => {
  const p = P.planWagons([{ spot: 'markt', kind: 'rival', x: 0, y: 0 }, { spot: 'park', kind: 'own', x: 5, y: 0 }, { spot: 'dorp', kind: 'fleet', x: 9, y: 0, staff: 'Marit' }], { x: 0, y: 0 });
  const by = Object.fromEntries(p.map((q) => [q.kind, q]));
  assert.equal(by.rival.sign, 'US MEM SNACKS'); assert.equal(by.own.sign, 'TAM & TES'); assert.equal(by.fleet.seller.name, 'Marit'); assert.equal(by.own.seller.name, 'Jij');
  assert.notEqual(by.rival.color, by.own.color);
  assert.ok(!/FJORD/i.test(Object.values(P.SIGNS).join(' ')));
});
t('deterministisch: dezelfde invoer, dezelfde richting en verkoper; de richting is een kwartslag', () => {
  const a = P.planWagons(sites, at('markt')), b = P.planWagons(sites, at('markt'));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  for (const q of a) assert.ok(Math.abs(q.heading / (Math.PI / 2) - Math.round(q.heading / (Math.PI / 2))) < 1e-9);
});
t('het verschil tussen twee plannen: toevoegen, houden, weghalen', () => {
  const cur = new Set(['own:markt', 'fleet:oud']);
  const plan = [{ key: 'own:markt' }, { key: 'rival:station' }];
  const d = P.diffWagons(cur, plan);
  assert.deepEqual(d.add.map((x) => x.key), ['rival:station']); assert.deepEqual(d.keep.map((x) => x.key), ['own:markt']); assert.deepEqual(d.remove, ['fleet:oud']);
});
t('rommel in de invoer: geen speler, ongeldige plekken, null', () => {
  assert.deepEqual(P.planWagons(sites, null), []); assert.deepEqual(P.planWagons(null, { x: 0, y: 0 }), []);
  assert.equal(P.planWagons([null, { spot: 'x', kind: 'own', x: NaN, y: 0 }], { x: 0, y: 0 }).length, 0);
});
const src = fs.readFileSync(new URL('../game/js/snackvans3d.js', import.meta.url), 'utf8');
const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t('THREE-kant: geen Math.random, geen fetch; wat wegvalt gaat via disposeObject', () => {
  assert.ok(!/Math\.random|fetch\(/.test(code));
  assert.match(code, /disposeObject\(a\.group\)/);
  assert.match(code, /scene\.remove|parent\.remove/);
});
t('THREE-kant: hergebruikt de foodtruck en de persoonsfiguur, hoogstens MAX_WAGONS, planning tweemaal per seconde', () => {
  assert.match(code, /name: 'foodtruck'/); assert.match(code, /buildVehicleMesh/); assert.match(code, /buildPersonMesh/);
  assert.match(code, /planWagons\(wagonSites\(\)/); assert.match(code, /MAX_WAGONS/); assert.match(code, /PLAN_EVERY_S/);
  assert.equal(P.PLAN_EVERY_S, 0.5);
});
t('THREE-kant: het bord is een gedeeld materiaal per tekst (niet per wagen), en scene3d.js blijft ongemoeid', () => {
  assert.match(code, /SIGN_MATS/); assert.match(code, /userData\.shared = true/);
  assert.ok(!/scene3d\.js'.*export/.test(code));
});
t('main.js roept updateSnackVans aan naast de werkers', () => {
  const m = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  assert.match(m, /updateFarmWorkers\(world, dt\); updateSnackVans\(world, dt\)/);
});
console.log(`snackvans3d_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
