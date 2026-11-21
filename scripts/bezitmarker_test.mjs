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
console.log(`bezitmarker_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
