// Het vee in de wereld en de Tessa-haken van Bezit (#1101): hoogstens 12 dieren per weide, vast per perceel-ID, alleen op een weide binnen de streamstraal, de
// kudde-regel voor de perceelinfo, en de boerenregels van Tessa bij perceel, oogst, vee, personeel en pacht (tekst, kans, cooldown, eenmalig).   node scripts/herdview_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Z from '../game/js/bezit.js';
import * as L from '../game/js/livestock.js';
import * as H from '../game/js/herdview.js';
import * as K from '../game/js/bezitworldhooks.js';
import * as T from '../game/js/tessarules.js';
import * as S from '../game/js/farmstaff.js';
import * as F from '../game/js/farmworkers.js';
import { REGION_FACTOR } from '../game/js/bezitprijs.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; F.clearStaffWork(); try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 6).join('\n   ')); } };
const id = (i) => 'p' + (0x123000000000 + i * 104729).toString(16).padStart(12, '0');
function mk(parcels) {
  const b = Z.newBezit();
  parcels.forEach(([kind, ha, x, y], i) => assert.ok(Z.buyParcel(b, { id: id(i), kind, ha, x, y, ax: x, ay: y }, 2000, 0, 1e9).ok));
  return b;
}

t('de kudde-regel: soort, aantal, wat in beeld is en ziekte; null zonder kudde', () => {
  const b = mk([['w', 6, 0, 0]]);
  assert.equal(H.herdSummary(b, id(0)), null);
  assert.ok(L.stockHerd(b, id(0), 'melkvee', 14).ok);
  const s = H.herdSummary(b, id(0));
  assert.equal(s.n, 14); assert.equal(s.visible, 12); assert.equal(s.sp, 'melkvee');
  assert.equal(s.text, 'Melkvee: 14 dieren (12 in beeld)');
  L.herdsOf(b)[id(0)].n = 1;
  assert.equal(H.herdSummary(b, id(0)).text, 'Melkvee: 1 dier');
  L.infect(L.herdsOf(b)[id(0)]);
  assert.ok(/ziek/.test(H.herdSummary(b, id(0)).text));
  assert.equal(H.herdSummary(b, 'onbekend'), null);
  assert.equal(H.herdSummary(null, id(0)), null);
});
t('hoogstens twaalf dieren per weide, ook bij 200 kippen of 60 schapen', () => {
  const b = mk([['w', 6, 0, 0], ['w', 6, 50, 0], ['w', 1, 100, 0]]);
  L.stockHerd(b, id(0), 'schapen'); L.stockHerd(b, id(1), 'kippen'); L.stockHerd(b, id(2), 'melkvee', 2);
  const p = H.planHerds(b, { x: 0, y: 0 });
  assert.equal(p.length, 3);
  assert.deepEqual(p.map((h) => h.n), [12, 12, 2]);
  assert.deepEqual(p.map((h) => h.model), ['sheep', 'hen', 'cow']);
  assert.ok(p.every((h) => h.n <= L.VISIBLE_MAX));
});
t('alleen op een weide en alleen binnen de streamstraal; bestaande kuddes blijven tot 330 m', () => {
  const b = mk([['w', 3, 0, 0], ['a', 3, 10, 0]]);
  L.stockHerd(b, id(0), 'melkvee');
  L.herdsOf(b)[id(1)] = { sp: 'melkvee', n: 5, sick: 0 };             // een akker met vee (kan niet via stockHerd): niet getoond
  assert.deepEqual(H.planHerds(b, { x: 0, y: 0 }).map((h) => h.id), [id(0)]);
  assert.equal(H.planHerds(b, { x: 280, y: 0 }).length, 0, 'nieuw buiten 230 m');
  assert.equal(H.planHerds(b, { x: 280, y: 0 }, { current: new Set([id(0)]) }).length, 1);
  assert.equal(H.planHerds(b, { x: 340, y: 0 }, { current: new Set([id(0)]) }).length, 0);
});
t('het budget: hoogstens vier weiden tegelijk, de dichtstbijzijnde', () => {
  const b = mk(Array.from({ length: 10 }, (_, i) => ['w', 3, i * 10, 0]));
  for (let i = 0; i < 10; i++) L.stockHerd(b, id(i), 'schapen');
  const p = H.planHerds(b, { x: 0, y: 0 });
  assert.equal(p.length, H.MAX_HERDS_IN_VIEW);
  assert.deepEqual(p.map((h) => h.id), [id(0), id(1), id(2), id(3)]);
  assert.ok(p.length * L.VISIBLE_MAX <= 48);
});
t('de lay-out: vast per perceel-ID, binnen de straal, genoeg kandidaten, geen toeval', () => {
  const a = H.animalLayout(id(0), [100, 200], 3, 12), b2 = H.animalLayout(id(0), [100, 200], 3, 12), o = H.animalLayout(id(1), [100, 200], 3, 12);
  assert.deepEqual(a, b2);
  assert.notDeepEqual(a, o);
  assert.equal(a.length, 24, 'twee keer zoveel kandidaten, om water of een gebouw over te slaan');
  const r = Math.max(4, Math.min(40, 0.35 * Math.sqrt(3 * 10000)));
  for (const p of a) { assert.ok(Math.hypot(p.x - 100, p.y - 200) <= r + 0.1); assert.ok(Number.isFinite(p.angle) && p.seed >= 0 && p.seed < 1); }
  assert.ok(H.animalLayout(id(0), [0, 0], 0.01, 3).every((p) => Math.hypot(p.x, p.y) <= 11.2), 'een klein perceel: een kleine kudde');
  assert.ok(H.animalLayout(id(0), [0, 0], 500, 3).every((p) => Math.hypot(p.x, p.y) <= 40.1), 'een groot perceel: nooit verder dan 40 m');
  assert.ok(!/Math\.random/.test(fs.readFileSync('game/js/herdview.js', 'utf8').replace(/\/\/.*$/gm, '')));
});
t('diffHerds: nieuw, veranderd (ander aantal of soort) en weg', () => {
  const sig = new Map([['a', 'cow|12'], ['b', 'sheep|4'], ['c', 'hen|12']]);
  const d = H.diffHerds(sig, [{ id: 'a', model: 'cow', n: 12 }, { id: 'b', model: 'sheep', n: 5 }, { id: 'd', model: 'cow', n: 3 }]);
  assert.deepEqual(d.add.map((h) => h.id), ['d']);
  assert.deepEqual(d.change.map((h) => h.id), ['b']);
  assert.deepEqual(d.remove, ['c']);
});
t('een gast ziet geen vee; de THREE-kant volgt de afspraken (broncontrole)', () => {
  assert.equal(H.herdsVisible({ coopRole: 'client' }), false);
  assert.equal(H.herdsVisible({}), true);
  const src = fs.readFileSync('game/js/herdview3d.js', 'utf8');
  assert.ok(/herdsVisible\(w\)/.test(src) && /disposeObject/.test(src) && /planHerds/.test(src) && /buildCowMesh3D/.test(src) && /buildSheepMesh3D/.test(src), 'bestaande modellen, opruimen');
  assert.ok(!/Math\.random|fetch\(/.test(src.replace(/\/\/.*$/gm, '')));
  assert.ok(/TICK_S = 1/.test(src), 'niet elk beeld');
});

// ---- Tessa ----
t('het eerste perceel per streek: een regel van Tessa, met haar naam, eenmalig per streek', () => {
  const b = mk([['w', 3, 0, 0]]);
  let line = null, d = 0;
  for (; d < 30 && !line; d += 3) line = K.tessaLineForPurchase(b, 'hogeland', d);   // de kans is 0,8: binnen een paar dagen komt hij
  assert.ok(line && line.startsWith('Tessa: '), String(line));
  assert.ok(T.TESSA_REGELS['perceel-klei'].regels.some((r) => line === `Tessa: ${r}`));
  assert.equal(K.tessaLineForPurchase(b, 'hogeland', d + 10), null, 'dezelfde streek niet nog een keer');
  let zand = null;
  for (let e = d + 10; e < d + 60 && !zand; e += 3) zand = K.tessaLineForPurchase(b, 'westerkwartier', e);
  assert.ok(zand && T.TESSA_REGELS['perceel-zand'].regels.some((r) => zand === `Tessa: ${r}`), 'een andere streek, een andere grond');
});
t('de cooldown: twee gebeurtenissen vlak na elkaar geven één regel', () => {
  const b = mk([['w', 3, 0, 0]]);
  let first = null, d = 0;
  for (; d < 20 && !first; d++) first = K.onWorkerHired(b, d);
  assert.ok(first);
  assert.equal(K.onHerdStocked(b, d - 1), null, 'binnen de cooldown');
  assert.equal(T.COOLDOWN_DAYS, 2);
});
t('vaste uitkomst: dezelfde staat en dag geven dezelfde regel', () => {
  const run = () => { const b = mk([['w', 3, 0, 0]]); const out = []; for (let d = 0; d < 20; d++) out.push(K.tessaLineForPurchase(b, 'oldambt', d)); return JSON.stringify(out); };
  assert.equal(run(), run());
});
t('alleen Tessa: Tammo krijgt de regels niet; zonder bezit geen regel', () => {
  const b = mk([['w', 3, 0, 0]]);
  for (let d = 0; d < 40; d++) assert.equal(K.tessaLineForPurchase(b, 'hogeland', d, 'tammo'), null);
  assert.equal(K.tessaLineFor(null, 'eerste-vee', '', 3), null);
  assert.equal(K.tessaLineFor(b, 'onbekend', '', 3), null);
});
t('elke streek van het prijsmodel geeft een regel binnen een maand (kans 0,8 per dag)', () => {
  for (const r of Object.keys(REGION_FACTOR)) {
    const b = mk([['w', 3, 0, 0]]);
    let line = null;
    for (let d = 0; d < 40 && !line; d += 3) line = K.tessaLineForPurchase(b, r, d);
    assert.ok(line, r);
  }
});
t('het dagrapport: zet de bewerkte percelen klaar en geeft de eerste oogst-, vee-, personeels- of pachtregel', () => {
  const b = mk([['w', 3, 0, 0], ['a', 3, 50, 0]]);
  b.parcels[id(1)].m = 'leased';
  assert.equal(K.onDayReport(b, null), null);
  const worked = [{ id: id(1), worker: 'w0', gewas: 'graan', kg: 900, ha: 3, tasks: [{ taak: 'oogsten', t0: 0, t1: 1 }] }];
  let line = null, d = 0;
  for (; d < 30 && !line; d += 3) line = K.onDayReport(b, { to: d, worked });
  assert.ok(line && /^Tessa: /.test(line));
  assert.ok(T.TESSA_REGELS['eerste-oogst'].regels.some((r) => line === `Tessa: ${r}`));
  assert.equal(F.staffWorkOf(d - 3).length, 1, 'de zichtbare werkers krijgen de opdrachten van die dag');
  let pacht = null;
  for (let e = d + 3; e < d + 60 && !pacht; e += 3) pacht = K.onDayReport(b, { to: e, worked: [] });
  assert.ok(pacht && T.TESSA_REGELS['eerste-pacht'].regels.some((r) => pacht === `Tessa: ${r}`), String(pacht));
});
t('tonen is alleen tekst: addMessage, geen audio; de staat blijft klein en wordt bewaard in het bezit', () => {
  const got = [];
  assert.equal(K.deliverLine({ addMessage: (x, s) => got.push([x, s]) }, 'Tessa: Hoi.'), true);
  assert.deepEqual(got, [['Tessa: Hoi.', 6]]);
  assert.equal(K.deliverLine({}, 'x'), false);
  assert.equal(K.deliverLine({ addMessage() {} }, null), false);
  const src = fs.readFileSync('game/js/bezitworldhooks.js', 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/speak|tts|audio|Math\.random|fetch\(/i.test(src));
  const b = mk([['w', 3, 0, 0]]);
  for (let d = 0; d < 20; d++) K.tessaLineForPurchase(b, 'hogeland', d);
  const back = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit ? Z.serializeBezit(b) : b)));
  assert.ok(back);
});
t('alle regels staan los van de gesproken lijst (alleen tekst)', () => {
  const lijst = fs.existsSync('scripts/tts_lines.json') ? fs.readFileSync('scripts/tts_lines.json', 'utf8') : '';
  for (const r of Object.values(T.TESSA_REGELS)) for (const z of r.regels) assert.ok(!lijst.includes(z.replace(/"/g, '\\"')), z);
});

console.log(`herdview_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
