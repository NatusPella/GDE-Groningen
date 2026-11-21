// De zichtbare AI-werkers van Bezit (#1101): planning van opdrachten, budget (hoogstens 4, de dichtstbijzijnde), de streamstraal met hysterese, deterministisch,
// geen werker als de dagtik het perceel niet bewerkt, geen werker voor een gast, de celvolgorde, het uiterlijk, en de bronregels van de THREE-kant.   node scripts/farmworkers_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as PF from '../game/js/parcelfarm.js';
import * as S from '../game/js/farmstaff.js';
import * as F from '../game/js/farmworkers.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; PC.wisExtraPercelen(); F.clearStaffWork(); try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 6).join('\n   ')); } };
const pid = (i) => 'p' + (0xdef000000000 + i * 7919).toString(16).padStart(12, '0');
function setup(count, workers = 1, skill = 3, ha = 1.2) {
  const bz = Z.newBezit(), farm = B.nieuweBoerderij();
  for (let i = 0; i < count; i++) { assert.ok(Z.buyParcel(bz, { id: pid(i), kind: 'a', ha, ax: 0, ay: 0 }, 3000, 0, 1e9).ok); bz.parcels[pid(i)].m = 'staff'; }
  PF.registerOwnedParcels(bz);
  for (let i = 0; i < count; i++) { PC.registreerExtraPerceel({ ...PC.perceelDef(pid(i)), bodem: 0.75 }); PF.adoptParcel(farm, pid(i), 0); }
  for (let k = 0; k < workers; k++) assert.ok(S.hireWorker(bz, skill, 0, 1e9).ok);
  return { bz, farm };
}
// een veld per perceel, op een rij langs x: perceel i staat op (i * step, 0)
const posOf = (step) => (id) => { const i = Math.round((parseInt(id.slice(1), 16) - 0xdef000000000) / 7919); return { x: i * step, y: 0, a: 0 }; };

t('de dagtik bewerkt percelen: de opdrachten dragen skill, ha en gewas mee', () => {
  const { bz, farm } = setup(2);
  const rep = S.staffDayTick(bz, farm, 1, {});
  assert.ok(rep.worked.length >= 1);
  for (const j of rep.worked) assert.ok(j.skill === 3 && j.ha > 0 && j.tasks.length >= 1 && j.worker);
  const a = F.planWorkerActors(rep.worked, { x: 0, y: 0 }, { posOf: posOf(40), dayFrac: 0.01 });
  assert.ok(a.length >= 1);
  assert.equal(a[0].skill, 3); assert.ok(a[0].ha > 0 && a[0].vehicle === 'trekker');
});
t('geen werker als de dagtik het perceel niet bewerkt', () => {
  const { bz, farm } = setup(1, 0);                        // geen personeel: niets gedaan
  const rep = S.staffDayTick(bz, farm, 1, {});
  assert.equal(rep.worked.length, 0);
  assert.deepEqual(F.planWorkerActors(rep.worked, { x: 0, y: 0 }, { posOf: posOf(40), dayFrac: 0.1 }), []);
  assert.deepEqual(F.planWorkerActors([], { x: 0, y: 0 }, { posOf: posOf(40), dayFrac: 0.1 }), []);
  assert.deepEqual(F.staffWorkOf(1), [], 'zonder noteStaffWork niets');
});
t('de dag: alleen op de speldag van het rapport en alleen binnen het tijdvak van de taak', () => {
  const { bz, farm } = setup(1);
  const rep = S.staffDayTick(bz, farm, 3, {});
  F.noteStaffWork(3, rep.worked);
  assert.equal(F.staffWorkOf(3).length, rep.worked.length);
  assert.equal(F.staffWorkOf(4).length, 0, 'de volgende dag speelt hij niet na');
  const w = rep.worked[0];
  const inside = (w.t0 + w.t1) / 2;
  assert.equal(F.planWorkerActors(rep.worked, { x: 0, y: 0 }, { posOf: posOf(40), dayFrac: inside }).length, 1);
  assert.equal(F.planWorkerActors(rep.worked, { x: 0, y: 0 }, { posOf: posOf(40), dayFrac: Math.min(0.999, w.t1 + 0.01) }).length, w.t1 >= 0.99 ? 1 : 0, 'na zijn tijdvak werkt hij hier niet meer');
});
t('budget: hoogstens vier, de dichtstbijzijnde, ook bij twintig percelen', () => {
  const { bz, farm } = setup(20, 20, 3);
  const rep = S.staffDayTick(bz, farm, 1, {});
  const first = rep.worked.map((j) => ({ ...j, tasks: [{ taak: 'ploegen', t0: 0, t1: 1 }] }));
  const a = F.planWorkerActors(first, { x: 0, y: 0 }, { posOf: posOf(10), dayFrac: 0.5 });
  assert.equal(a.length, F.MAX_ACTORS);
  assert.ok(F.MAX_ACTORS <= 4);
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].distance <= a[i].distance);
  const all = rep.worked.length;
  assert.ok(all >= 5, 'er zijn er meer dan vier aan het werk: de rest werkt achter de heuvel');
});
t('de streamstraal met hysterese: nieuwe werkers binnen 230 m, bestaande tot 330 m', () => {
  const worked = [{ id: pid(0), worker: 'w0', workerName: 'x', ha: 1.2, skill: 1, tasks: [{ taak: 'oogsten', t0: 0, t1: 1 }] }];
  const far = (d) => ({ x: d, y: 0 });
  const at = (d, cur) => F.planWorkerActors(worked, far(d), { posOf: () => ({ x: 0, y: 0, a: 0 }), dayFrac: 0.5, current: cur });
  assert.equal(F.SPAWN_R, 230); assert.equal(F.DESPAWN_R, 330);
  assert.equal(at(200).length, 1);
  assert.equal(at(280).length, 0, 'nieuw: buiten 230 m komt hij niet');
  assert.equal(at(280, new Set([`${pid(0)}:w0`])).length, 1, 'er al: blijft tot 330 m');
  assert.equal(at(340, new Set([`${pid(0)}:w0`])).length, 0);
});
t('deterministisch: dezelfde invoer geeft dezelfde uitvoer, geen Math.random', () => {
  const { bz, farm } = setup(6, 4, 2);
  const rep = S.staffDayTick(bz, farm, 2, {});
  const run = () => JSON.stringify(F.planWorkerActors(rep.worked, { x: 15, y: 3 }, { posOf: posOf(25), dayFrac: 0.2 }));
  assert.equal(run(), run());
  assert.ok(!/Math\.random/.test(fs.readFileSync('game/js/farmworkers.js', 'utf8').replace(/\/\/.*$/gm, '')));
  assert.equal(JSON.stringify(F.workerLook('w4', 2)), JSON.stringify(F.workerLook('w4', 2)));
});
t('diffActors: wat erbij komt, blijft en weggaat', () => {
  const mk = (id) => ({ actorId: id });
  const d = F.diffActors(new Set(['a', 'b']), [mk('b'), mk('c')]);
  assert.deepEqual(d.add.map((x) => x.actorId), ['c']);
  assert.deepEqual(d.keep.map((x) => x.actorId), ['b']);
  assert.deepEqual(d.remove, ['a']);
});
t('cellen: de rijen worden heen en terug gereden, elke cel een keer, binnen het veld', () => {
  const lay = { rows: 4, rowLength: 100, spacing: 3.5 };
  assert.deepEqual(F.cellAt(lay, 0, 20), { row: 0, cell: 0 });
  assert.deepEqual(F.cellAt(lay, 0.2499, 20), { row: 0, cell: 19 });
  assert.deepEqual(F.cellAt(lay, 0.25, 20), { row: 1, cell: 19 }, 'rij 1 begint aan de overkant en rijdt terug');
  assert.deepEqual(F.cellAt(lay, 1, 20), { row: 3, cell: 0 }, 'de laatste rij is een teruggereden rij: hij eindigt links');
  const seen = new Set();
  for (const c of F.cellsBetween(lay, 0, 1, 20)) { assert.ok(c.row >= 0 && c.row < 4 && c.cell >= 0 && c.cell < 20); seen.add(c.row * 20 + c.cell); }
  assert.equal(seen.size, 80, 'alle 80 cellen worden aangeraakt');
  const big = { rows: 4, rowLength: 300, spacing: 3.5 };
  for (const c of F.cellsBetween(big, 0.1, 0.4, 20)) assert.ok(c.cell >= 0 && c.cell < 20);
  assert.ok(F.cellsBetween(lay, 0.3, 0.3, 20).length === 1);
});
t('glijden: zacht naar het doel, ver weg springt, reducedMotion direct', () => {
  const cur = { x: 0, y: 0, heading: 0 }, tg = { x: 10, y: 0, heading: Math.PI };
  const a = F.slide(cur, tg, 0.1);
  assert.ok(a.x > 0 && a.x < 10);
  assert.deepEqual(F.slide(cur, { x: 100, y: 0, heading: 0 }, 0.1), { x: 100, y: 0, heading: 0 });
  assert.deepEqual(F.slide(cur, tg, 0.1, true), tg);
  assert.deepEqual(F.slide(null, tg, 0.1), tg);
  const w = F.slide({ x: 0, y: 0, heading: 3.1 }, { x: 0, y: 0, heading: -3.1 }, 0.1);
  assert.ok(Math.abs(w.heading - 3.1) < 0.4 || Math.abs(w.heading + 3.1) < 3.2, 'draait de korte kant om');
  for (const v of Object.values(F.slide(cur, tg, 0))) assert.ok(Number.isFinite(v));
});
t('een gast ziet geen werkers en de speldagbreuk klopt', () => {
  assert.equal(F.workersVisible({ coopRole: 'client' }), false);
  assert.equal(F.workersVisible({ coopRole: 'host' }), true);
  assert.equal(F.workersVisible({}), true);
  assert.equal(F.workersVisible(null), false);
  assert.equal(F.dayFraction(12), 0.5);
  assert.equal(F.dayFraction(48), 0);
  assert.ok(F.dayFraction(23.9999) < 1);
  assert.equal(F.dayFraction(NaN), 0);
});
t('het uiterlijk: een boer, vast per werker, de voorman een eigen pet, geen echte merken', () => {
  const a = F.workerLook('w1', 1), b = F.workerLook('w1', 3);
  assert.equal(a.shirt, F.FARMER_OUTFIT.shirt);
  assert.equal(a.opts.look.hat, 'cap');
  assert.notEqual(a.opts.look.hatColor, b.opts.look.hatColor);
  assert.ok(a.opts.seed > 0 && ['male', 'female'].includes(a.opts.variant));
  const skins = new Set(Array.from({ length: 12 }, (_, i) => F.workerLook('w' + i, 1).skin));
  assert.ok(skins.size >= 2, 'niet iedereen even bruin');
});
t('de THREE-kant volgt de afspraken (broncontrole)', () => {
  const src = fs.readFileSync('game/js/farmworkers3d.js', 'utf8');
  assert.ok(/export function updateFarmWorkers/.test(src) && /export function clearFarmWorkers/.test(src));
  assert.ok(/workersVisible\(w\)/.test(src), 'geen werkers voor een gast');
  assert.ok(/planWorkerActors/.test(src) && /paintWorkerCell/.test(src), 'dezelfde celstanden als het handwerk');
  assert.ok(/disposeObject/.test(src) && /ruimWerktuig/.test(src), 'opruimen');
  assert.ok(/reducedMotion\(\)/.test(src));
  assert.ok(!/Math\.random|fetch\(/.test(src.replace(/\/\/.*$/gm, '')));
  assert.ok(/PLAN_EVERY_S/.test(src), 'de planning loopt niet elk beeld');
  const wereld = fs.readFileSync('game/js/boerderijwereld.js', 'utf8');
  assert.ok(/export function paintWorkerCell/.test(wereld));
  const main = fs.readFileSync('game/js/main.js', 'utf8');
  assert.ok(/updateFarmWorkers\(world, dt\)/.test(main) && /updateHerds\(world, dt\)/.test(main));
  assert.ok(fs.readFileSync('game/js/scene3d.js', 'utf8').split('\n').length < 4500, 'scene3d.js blijft klein');
});
t('boomgaardfruit in de wereld: afnemer, werktuigkleur, plantvorm en indexvolgorde', () => {
  const w = fs.readFileSync('game/js/boerderijwereld.js', 'utf8'), k = fs.readFileSync('game/js/werktuigen3d.js', 'utf8'), c = fs.readFileSync('game/js/farmcrops3d.js', 'utf8');
  assert.ok(/AFNEMER_PLEK = \{[^}]*fruit: \[53\.\d+, 6\.\d+\]/.test(w), 'afnemerplek voor fruit');
  assert.ok(/GEWAS_KLEUR = \{[^}]*fruit:/.test(k));
  assert.ok(/case 'boom'/.test(c) && /fruit: \{ lijnen/.test(c));
  assert.equal(B.GEWASSEN.fruit.afnemer, 'Fruitveiling De Bongerd');
  assert.equal(B.GEWASSEN.fruit.vorm, 'boom');
  assert.deepEqual(B.ALLE_GEWAS_IDS.slice(0, 5), ['aardappelen', 'bieten', 'graan', 'gras', 'uien'], 'de bestaande gewasindex verandert niet');
  assert.equal(B.ALLE_GEWAS_IDS.indexOf('fruit'), 5);
  assert.ok(B.ALLE_GEWAS_IDS.length <= 255, 'past in het byte van de coöp-codering (coopextra)');
});

console.log(`farmworkers_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
