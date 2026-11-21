// De palen van Bezit in de wereld (#1100): planning (straal, budget, volgorde), verschillen tussen twee plannen, opnieuw plannen alleen bij verplaatsing of een
// nieuw bezit, en de bronregels van de THREE-kant (geen THREE hier: bezitmarker3d.js wordt als tekst gecontroleerd).   node scripts/bezitmarker_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../game/js/bezitmarker.js';
import * as Z from '../game/js/bezit.js';
import { createParcelIndex, createBuildingIndex } from '../game/js/parcelindex.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const mk = (count, spread = 20) => {
  const b = Z.newBezit();
  for (let i = 0; i < count; i++) Z.buyParcel(b, { id: 'p' + (i + 1).toString(16).padStart(12, '0'), kind: 'a', ha: 3, x: i * spread, y: 0, ax: i * spread, ay: 0 }, 2400, 1, 1e12);
  return b;
};

t('alleen eigen percelen binnen de straal, de dichtstbijzijnde eerst', () => {
  const b = mk(100, 20);                                   // 0 tot 1980 m
  const p = M.planMarkers({ player: { x: 0, y: 0 }, bezit: b });
  assert.ok(p.length > 0 && p.every((m) => m.d <= M.MARKER_RADIUS));
  for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].d <= p[i].d);
  assert.equal(p.length, 31);                              // 0..600 m met 20 m tussenruimte
});
t('het budget: nooit meer dan 200, ook bij duizend percelen', () => {
  const b = mk(1000, 1);
  assert.equal(M.planMarkers({ player: { x: 0, y: 0 }, bezit: b }).length, M.MAX_MARKERS);
});
t('de hand-gezette percelen krijgen geen paal (de boerderij heeft zijn eigen markering)', () => {
  const b = mk(2);
  b.parcels.zonnehoek = { k: 'a', ha: 1, t: 0, p: 0, w: 0, m: 'self', lg: 1, c: [5, 5] };
  assert.equal(M.planMarkers({ player: { x: 0, y: 0 }, bezit: b }).filter((m) => m.key === 'p:zonnehoek').length, 0);
});
t('panden met een bord, een medespeler met zijn kleur en naam; zonder index geen panden of claims', () => {
  const b = mk(1);
  Z.buyBuilding(b, 111, 5000, 1, 1e9, 'winkel');
  const ix = { parcels: createParcelIndex({ v: 1, rows: [['pcccccccccc3', 100, 100, 200, 1, 0, 100, 100]] }), buildings: createBuildingIndex({ v: 1, types: ['retail'], rows: [[111, 50, 50, 300, 0, 6, 0]] }) };
  const p = M.planMarkers({ player: { x: 0, y: 0 }, bezit: b, index: ix, claims: [{ id: 'pcccccccccc3', name: 'Lotte', color: '#c0c' }] });
  assert.ok(p.some((m) => m.kind === 'building' && m.label === 'Van jou'));
  const c = p.find((m) => m.state === 'claimed');
  assert.equal(c.label, 'Van Lotte'); assert.equal(c.color, '#c0c');
  assert.equal(M.planMarkers({ player: { x: 0, y: 0 }, bezit: b, claims: [{ id: 'pcccccccccc3', name: 'Lotte' }] }).some((m) => m.state === 'claimed'), false);
});
t('kapotte invoer geeft een lege lijst', () => {
  assert.deepEqual(M.planMarkers({}), []);
  assert.deepEqual(M.planMarkers({ player: { x: NaN, y: 0 }, bezit: mk(1) }), []);
});
t('verschillen: nieuw, veranderd en weg', () => {
  const b = mk(3);
  const prev = new Map();
  const a = M.planMarkers({ player: { x: 0, y: 0 }, bezit: b });
  let d = M.diffMarkers(prev, a);
  assert.equal(d.add.length, 3); assert.equal(d.remove.length, 0);
  M.applyDiff(prev, d);
  assert.deepEqual(M.diffMarkers(prev, a), { add: [], update: [], remove: [] });
  const a2 = a.slice(1).map((m, i) => (i === 0 ? { ...m, sub: 'Oogstklaar' } : m));
  d = M.diffMarkers(prev, a2);
  assert.equal(d.remove.length, 1); assert.equal(d.update.length, 1); assert.equal(d.add.length, 0);
});
t('opnieuw plannen: pas bij 25 m verplaatsing of een nieuw bezit', () => {
  const b = mk(2);
  const v = M.bezitVersion(b);
  assert.equal(M.needsReplan(null, { x: 0, y: 0 }, v), true);
  assert.equal(M.needsReplan({ x: 0, y: 0, version: v }, { x: 10, y: 0 }, v), false);
  assert.equal(M.needsReplan({ x: 0, y: 0, version: v }, { x: 30, y: 0 }, v), true);
  Z.buyParcel(b, { id: 'p000000000fff', kind: 'a', ha: 1, x: 1, y: 1, ax: 1, ay: 1 }, 1200, 1, 1e9);
  assert.equal(M.needsReplan({ x: 0, y: 0, version: v }, { x: 0, y: 0 }, M.bezitVersion(b)), true);
});
t('de planning van 200 palen met 1000 percelen kost minder dan 2 ms', () => {
  const b = mk(1000, 1);
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) M.planMarkers({ player: { x: 0, y: 0 }, bezit: b });
  assert.ok((performance.now() - t0) / 20 < 2);
});
const src = fs.readFileSync(new URL('../game/js/bezitmarker3d.js', import.meta.url), 'utf8');
t('THREE-kant: gedeelde geometrie en materialen, geen licht, geen Math.random, opruimen, throttle van 0,5 s en nooit voor een gast', () => {
  assert.ok(src.includes('MeshBasicMaterial') && !/new THREE\.(PointLight|SpotLight|DirectionalLight)/.test(src));
  assert.ok(!src.includes('Math.random'));
  assert.ok(src.includes('S.t < 0.5') && src.includes("w.coopRole === 'client'"));
  assert.ok(src.includes('TEX_MAX') && src.includes('dispose()'), 'het cachegeheugen van de borden is begrensd en geeft vrij');
  assert.ok(src.includes('function drop') && src.includes('clearBezitMarkers'));
});
// ---- de grenslijn (#1100) ----
const square = (x, y, r) => [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]];
const outlineIndex = (shapes, extra = {}) => ({ parcels: { shapeOf: (id) => shapes[id] || null, byId: (id) => extra[id] || null, hasShapes: () => true }, buildings: { byId: () => null } });
t('grenslijn: alleen eigen percelen met een vorm, binnen de straal, de dichtstbijzijnde eerst, hoogstens 40', () => {
  const b = mk(100, 5);                                    // 0 tot 495 m
  const shapes = {};
  for (const id of Object.keys(b.parcels)) { const c = b.parcels[id].c; shapes[id] = square(c[0], c[1], 20); }
  const o = M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: outlineIndex(shapes) });
  assert.equal(o.length, M.MAX_OUTLINES);
  for (let i = 1; i < o.length; i++) assert.ok(o[i - 1].d <= o[i].d);
  assert.ok(o.every((x) => x.key.startsWith('o:') && x.pts.length === 4));
  const ids = Object.keys(b.parcels);
  assert.equal(M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: outlineIndex({ [ids[3]]: square(15, 0, 5) }) }).length, 1, 'zonder vorm geen lijn (de paal blijft)');
  assert.equal(M.planOutlines({ player: { x: 5000, y: 0 }, bezit: b, index: outlineIndex(shapes) }).length, 0, 'buiten de straal');
  assert.equal(M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: null }).length, 0, 'zonder index');
  assert.equal(M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: { parcels: {} } }).length, 0, 'index zonder vormen');
});
t('grenslijn: de hand-gezette percelen en kapotte vormen krijgen geen lijn; een medespeler wel, in zijn eigen sleutel', () => {
  const b = mk(2);
  b.parcels.zonnehoek = { k: 'a', ha: 1, t: 0, p: 0, w: 0, m: 'self', lg: 1, c: [5, 5] };
  const ids = Object.keys(b.parcels);
  const shapes = { zonnehoek: square(5, 5, 10), [ids[0]]: [[0, 0], [NaN, 1], [2, 2]], [ids[1]]: square(20, 0, 10), c1: square(50, 50, 10) };
  const o = M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: outlineIndex(shapes, { c1: { id: 'c1', x: 50, y: 50 } }), claims: [{ id: 'c1', name: 'Lotte', color: '#c0c' }] });
  assert.deepEqual(o.map((x) => x.key).sort(), ['o:' + ids[1], 'oc:c1'].sort());
  assert.equal(o.find((x) => x.key === 'oc:c1').state, 'claimed');
  assert.equal(o.find((x) => x.key === 'oc:c1').color, '#c0c');
});
t('grenslijn: lijnstukken van hoogstens 8 m op grondhoogte, alleen eindige getallen, ook als de hoogte NaN geeft', () => {
  const seg = M.outlineSegments(square(0, 0, 20), (x, y) => 3 + 0.01 * x, 0.2);
  assert.equal(seg.length % 6, 0);
  assert.equal(seg.length / 6, 4 * 5, 'vier zijden van 40 m in vijf stukken van 8 m');
  assert.ok(seg.every(Number.isFinite));
  for (let i = 0; i < seg.length; i += 6) assert.ok(Math.hypot(seg[i + 3] - seg[i], seg[i + 5] - seg[i + 2]) <= M.OUTLINE_STEP_M + 1e-9);
  assert.ok(Math.abs(seg[1] - (3 + 0.01 * -20 + 0.2)) < 1e-9, 'de hoogte volgt de grond met een kleine tilling');
  assert.ok(M.outlineSegments(square(0, 0, 20), () => NaN).every(Number.isFinite), 'NaN uit de hoogtelaag wordt 0');
  assert.ok(M.outlineSegments(square(0, 0, 20), null).every(Number.isFinite));
});
t('grenslijn: diff als bij de palen (nieuw, ongewijzigd, weg) zodat een late vorm een lijn toevoegt', () => {
  const b = mk(2), ids = Object.keys(b.parcels);
  const sig = new Map();
  const none = M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: outlineIndex({}) });
  assert.equal(none.length, 0);
  const later = M.planOutlines({ player: { x: 0, y: 0 }, bezit: b, index: outlineIndex({ [ids[0]]: square(0, 0, 10) }) });
  const d = M.diffMarkers(sig, later);
  assert.equal(d.add.length, 1);
  M.applyDiff(sig, d);
  assert.equal(M.diffMarkers(sig, later).add.length + M.diffMarkers(sig, later).update.length, 0);
  assert.deepEqual(M.diffMarkers(sig, none).remove, ['o:' + ids[0]]);
});
const srcLines = src.replace(/\/\/.*$/gm, '');
t('grenslijn THREE-kant: dunne LineSegments met een gedeeld materiaal, geometrie vrijgegeven, geen NaN, begrensd, opnieuw plannen als de vormen laden', () => {
  assert.ok(srcLines.includes('LineSegments') && srcLines.includes('LineBasicMaterial') && srcLines.includes('LINE_MATS'));
  assert.ok(srcLines.includes('geometry.dispose()') && srcLines.includes('dropLine'));
  assert.ok(srcLines.includes('planOutlines') && srcLines.includes('outlineSegments') && srcLines.includes('hasShapes'));
  assert.ok(!/Math\.random|fetch\(/.test(srcLines));
  assert.ok(M.MAX_OUTLINES <= 40);
});
console.log(`bezitmarker_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
