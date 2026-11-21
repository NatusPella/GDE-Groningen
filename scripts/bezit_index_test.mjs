// Bezit-index (#1096): aaneenrijgen over tegelranden, stabiel ID (determinisme, geen botsing), samenvoegen onder 0,5 ha, toegangsklasse,
// en de lui geladen index (parcelindex.js).   node scripts/bezit_index_test.mjs
// Pure test met synthetische stukken; de wereld is niet nodig (de echte meting is scripts/world/percelen_audit.mjs).
import assert from 'node:assert/strict';
import * as X from './world/bezit_index.mjs';
import * as PI from '../game/js/parcelindex.js';

let n = 0, fails = 0;
const pending = [];
const t = (name, fn) => { n++; try { const r = fn(); if (r && r.then) pending.push(r.catch((e) => { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); })); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const E = 1330; // een tegelrand in x (GRID_X0 + 1000)
const A = { tile: 'a', use: 'akker', pts: rect(1130, 500, E, 700) };
const B = { tile: 'b', use: 'akker', pts: rect(E, 520, 1530, 680) };
const C = { tile: 'b', use: 'weide', pts: rect(E, 100, 1530, 300) };   // andere soort, deelt de rand niet
const D = { tile: 'c', use: 'akker', pts: rect(3000, 3000, 3300, 3300) };

t('stukken over een tegelrand worden een perceel', () => {
  const r = X.buildParcels([A, B, C, D]);
  assert.equal(r.parcels.length, 3);
  assert.equal(r.joins, 1);
  const ab = r.parcels.find((p) => p.pieces.length === 2);
  assert.ok(ab && ab.use === 'akker');
  assert.ok(Math.abs(ab.m2 - (200 * 200 + 200 * 160)) < 1);
});
t('een andere soort aan dezelfde rand wordt niet aaneengeregen', () => {
  const r = X.buildParcels([A, { ...B, use: 'weide' }]);
  assert.equal(r.parcels.length, 2);
});
t('ID: stabiel, deterministisch bij omgekeerde volgorde, uniek, vorm p + 12 hex', () => {
  const l = [A, B, C, D];
  const a = X.buildParcels(l).parcels.map((p) => p.id).sort();
  const b = X.buildParcels([...l].reverse()).parcels.map((p) => p.id).sort();
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
  for (const id of a) assert.match(id, /^p[0-9a-f]{12}$/);
});
t('ID hangt niet af van de tegelnaam (gid en bouwvolgorde tellen niet)', () => {
  const a = X.buildParcels([A, B]).parcels[0].id;
  const b = X.buildParcels([{ ...A, tile: 'x9' }, { ...B, tile: 'y7' }]).parcels[0].id;
  assert.equal(a, b);
});
t('ankerpunt ligt niet op een tegelrand en is het laagste hoekpunt', () => {
  const g = X.buildParcels([A, B]).parcels[0];
  assert.deepEqual(g.anchor, [1130, 500]);
});
t('samenvoegen onder 0,5 ha met de grootste buur van dezelfde soort', () => {
  const big = { tile: 't', use: 'weide', pts: rect(100, 100, 400, 400) };          // 9 ha
  const small = { tile: 't', use: 'weide', pts: rect(400, 100, 440, 140) };        // 0,16 ha, deelt hoekpunten met big
  const other = { tile: 't', use: 'akker', pts: rect(440, 100, 500, 160) };        // andere soort: niet
  const r = X.buildParcels([big, small, other]);
  assert.equal(r.parcels.length, 3);
  const m = X.mergeSmall(r.parcels);
  assert.equal(m.merged, 1);
  assert.equal(m.parcels.length, 2);
  const w = m.parcels.find((p) => p.use === 'weide');
  assert.ok(Math.abs(w.m2 - (300 * 300 + 40 * 40)) < 1);
});
t('een klein perceel zonder buur blijft bestaan', () => {
  const m = X.mergeSmall(X.buildParcels([{ tile: 't', use: 'weide', pts: rect(0, 0, 30, 30) }]).parcels);
  assert.equal(m.parcels.length, 1);
  assert.equal(m.merged, 0);
});
t('samenvoegen is deterministisch', () => {
  const l = [{ tile: 't', use: 'weide', pts: rect(100, 100, 400, 400) }, { tile: 't', use: 'weide', pts: rect(400, 100, 440, 140) }, { tile: 't', use: 'weide', pts: rect(60, 100, 100, 140) }];
  const a = X.mergeSmall(X.buildParcels(l).parcels).parcels.map((p) => p.id).sort();
  const b = X.mergeSmall(X.buildParcels([...l].reverse()).parcels).parcels.map((p) => p.id).sort();
  assert.deepEqual(a, b);
});
t('toegangsklasse uit afstanden', () => {
  assert.equal(X.accessClass(5, Infinity), 'weg');
  assert.equal(X.accessClass(30, 8), 'pad');
  assert.equal(X.accessClass(40, Infinity), 'wegNabij');
  assert.equal(X.accessClass(Infinity, 50), 'padNabij');
  assert.equal(X.accessClass(Infinity, Infinity), 'geen');
});
t('toegang: een weg langs de rand', () => {
  const car = X.mkIndex(), pad = X.mkIndex();
  X.sampleLine([[1125, 400], [1125, 800]], 10, (x, y) => X.addPt(car, x, y));
  const p = X.buildParcels([A]).parcels[0];
  assert.equal(X.accessOf(p, car, pad), 'weg');
  assert.equal(X.accessOf(X.buildParcels([D]).parcels[0], car, pad), 'geen');
});
t('bedrijfspand-types: woningen en schuren niet, winkels wel', () => {
  for (const x of ['house', 'yes', 'shed', 'garage', 'detached']) assert.equal(X.isBusinessType(x), false, x);
  for (const x of ['retail', 'commercial', 'school', 'church', 'industrial']) assert.equal(X.isBusinessType(x), true, x);
});

// ---- de lui geladen index ----
const rows = X.parcelRows(X.buildParcels([A, B, C, D]).parcels.map((p) => ({ ...p, access: 'weg' })));
const file = { v: 1, kinds: X.KINDS, access: X.ACCESS, rows };
t('parcelindex: opzoeken op ID, rechthoek en dichtstbijzijnde', () => {
  const ix = PI.createParcelIndex(file);
  assert.equal(ix.size, 3);
  const p = ix.all()[0];
  assert.equal(ix.byId(p.id).id, p.id);
  assert.equal(ix.byId('pnietbestaand'), null);
  assert.equal(ix.inRect(0, 0, 100000, 100000).length, 3);
  assert.equal(ix.inRect(2900, 2900, 3400, 3400).length, 1);
  assert.equal(ix.nearest(p.x + 5, p.y + 5, 50).id, p.id);
  assert.equal(ix.nearest(-9000, -9000, 50), null);
});
t('parcelindex: herkoppelen via het ankerpunt', () => {
  const ix = PI.createParcelIndex(file);
  const p = ix.all().find((q) => q.kind === 'a' && q.ha > 7);
  assert.equal(ix.rematch([p.ax + 3, p.ay - 4], 'a', p.ha * 1.1).id, p.id);
  assert.equal(ix.rematch([p.ax + 3, p.ay - 4], 'w', p.ha), null);
  assert.equal(ix.rematch([p.ax, p.ay], 'a', p.ha * 2), null);
});
t('parcelindex: kapotte of lege bestanden geven een lege index', () => {
  for (const f of [null, {}, { v: 2, rows: [[1]] }, { v: 1, rows: [[1, 2], null, ['p', NaN, 1]] }]) assert.equal(PI.createParcelIndex(f).size, 0);
});
t('pandindex: opzoeken en dichtbij', () => {
  const bi = PI.createBuildingIndex({ v: 1, types: ['retail', 'school'], rows: [[111, 1000, 1000, 400, 0, 6, 0], [222, 1100, 1000, 900, 1, 12, 1], [333, 9000, 9000, 50, 0, 3, 0]] });
  assert.equal(bi.size, 3);
  assert.equal(bi.byId(222).type, 'school');
  assert.equal(bi.near(1050, 1000, 100).length, 2);
});
// ---- de getekende grenslijn (#1100): bezit-vormen.json ----
const wiggle = (cx, cy, r, k) => Array.from({ length: k }, (_, i) => { const a = (i / k) * Math.PI * 2, rr = r * (1 + 0.04 * Math.sin(i * 5)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const closed = (pts) => pts.concat([pts[0]]);
const decode = (p, flat, step = X.SHAPE_STEP) => { const o = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; o.push([p.pt[0] + x * step, p.pt[1] + y * step]); } return o; };
const distToRing = (q, ring) => { let b = Infinity; for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length]; const dx = c[0] - a[0], dy = c[1] - a[1], l2 = dx * dx + dy * dy || 1; const tt = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)); b = Math.min(b, Math.hypot(q[0] - a[0] - tt * dx, q[1] - a[1] - tt * dy)); } return b; };
t('vormen: Douglas-Peucker houdt de hoekpunten en gooit rechte stukken weg', () => {
  const sq = [[0, 0], [50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50]];
  const s = X.simplifyRing(sq, 8);
  assert.equal(s.length, 4);
  assert.deepEqual(X.simplifyRing([[0, 0], [10, 0], [5, 8]], 8).length, 3);
});
t('vormen: delta-codering relatief aan het binnenpunt, terug te lezen binnen tolerantie plus afronding', () => {
  const ring = wiggle(5000, 6000, 120, 60);
  const p = { id: 'p0000000000aa', pt: [5003, 5998], m2: 45000, pieces: [{ pts: closed(ring) }] };
  const flat = X.shapeDeltas(p);
  assert.ok(flat && flat.length % 2 === 0 && flat.length / 2 >= 3 && flat.length / 2 <= X.SHAPE_MAX_POINTS);
  const back = decode(p, flat);
  for (const q of back) assert.ok(distToRing(q, ring) <= X.SHAPE_TOLERANCE + X.SHAPE_STEP, 'het punt ligt dicht bij de echte rand');
  for (const q of ring) assert.ok(distToRing(q, back) <= X.SHAPE_TOLERANCE + X.SHAPE_STEP, 'de echte rand ligt dicht bij de vorm');
  assert.ok(flat.every((v) => Number.isInteger(v)));
});
t('vormen: hoogstens 24 punten, ook bij een gekartelde rand (de tolerantie groeit mee)', () => {
  const ring = Array.from({ length: 400 }, (_, i) => { const a = (i / 400) * Math.PI * 2, r = 150 + (i % 2 ? 25 : -25); return [Math.cos(a) * r, Math.sin(a) * r]; });
  const flat = X.shapeDeltas({ pt: [0, 0], m2: 70000, pieces: [{ pts: closed(ring) }] });
  assert.ok(flat && flat.length / 2 <= X.SHAPE_MAX_POINTS);
});
t('vormen: het grootste stuk telt, geen gaten, onbruikbare vormen geven null', () => {
  const big = closed(wiggle(0, 0, 100, 40)), small = closed(wiggle(500, 0, 10, 8));
  const a = X.shapeDeltas({ pt: [0, 0], m2: 31400, pieces: [{ pts: small }, { pts: big }] });
  const b = X.shapeDeltas({ pt: [0, 0], m2: 31400, pieces: [{ pts: big }] });
  assert.deepEqual(a, b);
  assert.equal(X.shapeDeltas({ pt: [0, 0], m2: 1, pieces: [{ pts: [[0, 0], [1, 0], [0, 0]] }] }), null);
  assert.equal(X.shapeDeltas({ pt: [0, 0], m2: 1, pieces: [] }), null);
  assert.equal(X.shapeDeltas({ pt: [0, 0], m2: 1, pieces: [{ pts: closed([[0, 0], [20, 0], [40, 0], [60, 0]]) }] }), null, 'een rechte lijn is geen vorm');
});
t('vormen: shapeRows is gesorteerd en deterministisch', () => {
  const ps = [3, 1, 2].map((i) => ({ id: 'p' + String(i).padStart(12, '0'), pt: [i * 1000, 0], m2: 30000, pieces: [{ pts: closed(wiggle(i * 1000, 0, 90, 30)) }] }));
  const a = X.shapeRows(ps), b = X.shapeRows([...ps].reverse());
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((r) => r[0]), ['p000000000001', 'p000000000002', 'p000000000003']);
  assert.equal(X.shapeRows(ps, { minHa: 99 }).length, 0);
});
t('vormen: createShapeIndex pakt uit naar wereldmeters, cachet en weert kapotte rijen', () => {
  const parcels = PI.createParcelIndex(file);
  const first = file.rows[0];
  const p = parcels.byId(first[0]);
  const ring = wiggle(p.x, p.y, 80, 30);
  const flat = X.shapeDeltas({ pt: [p.x, p.y], m2: 20000, pieces: [{ pts: closed(ring) }] });
  const vf = { v: 1, step: 5, rows: [[first[0], flat], ['x', [1, 2]], [file.rows[1][0], [1, 2, 3]], 'kapot', [file.rows[2][0], [0, 0, 'a', 1, 2, 3]]] };
  const sx = PI.createShapeIndex(vf, parcels);
  assert.equal(sx.size, 2, 'alleen de rijen met minstens drie punten en een even aantal (de rij met een letter valt bij het uitpakken weg)');
  const pts = sx.shapeOf(first[0]);
  assert.ok(pts.length >= 3 && pts.every((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])));
  assert.equal(sx.shapeOf(first[0]), pts, 'uit de cache');
  assert.equal(sx.shapeOf('onbekend'), null);
  assert.equal(sx.shapeOf(file.rows[2][0]), null, 'NaN geeft geen vorm');
  assert.equal(parcels.shapeOf(first[0]), null, 'zonder vormen: geen omtrek (de schets blijft)');
  assert.equal(parcels.attachShapes(vf), 2);
  assert.ok(parcels.hasShapes() && parcels.shapeOf(first[0]).length === pts.length);
  assert.equal(parcels.attachShapes(null), 0);
  assert.equal(parcels.shapeOf(first[0]), null);
  assert.equal(PI.createShapeIndex(null, parcels).size, 0);
});
t('lui laden: één keer en een mislukte bron geeft een lege index', async () => {
  PI.resetBezitIndexCache();
  let calls = 0;
  const r = await PI.loadBezitIndex(async (u) => { calls++; if (u.endsWith('panden.json')) throw new Error('weg'); return file; }, 'w/');
  assert.equal(r.parcels.size, 3);
  assert.equal(r.buildings.size, 0);
  await PI.loadBezitIndex(async () => { calls++; return null; });
  assert.equal(calls, 3, 'percelen, panden en (op de achtergrond) de vormen');
  PI.resetBezitIndexCache();
});

await Promise.all(pending);
console.log(`bezit_index_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
