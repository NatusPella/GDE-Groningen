// Prestatiegrenzen van Bezit in node (#1105): planners, opslag en de dagtik bij een groot bezit (1.000 percelen, 5.000 panden, een index van 14.000 percelen).
// Alleen de rekenkant; draw calls en geheugen in de wereld meet een perf-run in Electron (niet gedaan).   node scripts/bezit_perf_test.mjs
// Grenzen zijn ruim (een trage machine of CI mag ze niet laten falen) maar vangen een kwadratische val of een lus per frame.
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as M from '../game/js/bezitmarker.js';
import * as PI from '../game/js/parcelindex.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const ms = (fn, reps = 1) => { fn(); const t0 = performance.now(); for (let i = 0; i < reps; i++) fn(); return (performance.now() - t0) / reps; };
const hex = (i) => 'p' + i.toString(16).padStart(12, '0');

// een synthetische provincie: 14.000 percelen op een raster van 250 m, 6.000 panden
const ROWS = []; for (let i = 0; i < 14000; i++) { const x = 200000 + (i % 140) * 250, y = 560000 + Math.floor(i / 140) * 250; ROWS.push([hex(i), x, y, 100 + (i % 17) * 40, i % 3, i % 5 === 4 ? 4 : 0, x - 5, y - 5]); }
const BROWS = []; for (let i = 0; i < 6000; i++) BROWS.push([100000 + i, 200000 + (i % 100) * 350, 560000 + Math.floor(i / 100) * 350, 50 + (i % 9) * 30, i % 3, 6, 0]);
const index = { parcels: PI.createParcelIndex({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000, 2400]], rows: ROWS }),
  buildings: PI.createBuildingIndex({ v: 1, types: ['industrial', 'retail', 'office'], rows: BROWS }) };
const big = () => { const b = Z.newBezit(); for (let i = 0; i < 1000; i++) { const p = index.parcels.byId(hex(i)); b.parcels[p.id] = { k: p.kind, ha: p.ha, t: 1, p: 3000, w: 1, m: 'self', c: [p.x, p.y] }; } for (let i = 0; i < 5000; i++) b.buildings.add(100000 + i); return b; };

t('de index van 14.000 percelen bouwt snel en zoekt in een rastercel', () => {
  assert.equal(index.parcels.size, 14000);
  assert.ok(ms(() => index.parcels.inRect(210000, 570000, 211000, 571000)) < 5);
  assert.ok(ms(() => index.parcels.nearest(215000, 565000, 300), 50) < 2);
});

t('markerplanning met 1.000 percelen en 5.000 panden: onder 40 ms, hoogstens 200 palen', () => {
  const b = big(), player = { x: 215000, y: 570000 };
  let plan;
  const m1 = ms(() => { plan = M.planMarkers({ player, bezit: b, index }); }, 5);
  assert.ok(plan.length <= M.MAX_MARKERS); assert.ok(plan.length > 0, 'er is bezit in de buurt');
  assert.ok(m1 < 40, `${m1.toFixed(1)} ms`); console.log(`  markers ${m1.toFixed(1)} ms, ${plan.length} palen`);
  assert.ok(ms(() => M.planOutlines({ player, bezit: b, index }), 5) < 40);
  assert.ok(ms(() => M.bezitVersion(b), 20) < 5);
});

t('opslag: 1.000 percelen en 5.000 panden normaliseren en serialiseren onder 150 ms, JSON onder 300 KB', () => {
  const b = big();
  let raw;
  const m1 = ms(() => { raw = JSON.stringify(Z.serializeBezit(b)); }, 3);
  const m2 = ms(() => { Z.normalizeBezit(JSON.parse(raw)); }, 3);
  assert.ok(m1 < 150 && m2 < 150, `${m1.toFixed(1)} / ${m2.toFixed(1)} ms`); console.log(`  opslag ${m1.toFixed(1)}/${m2.toFixed(1)} ms, ${raw.length} bytes`);
  assert.ok(raw.length < 300000, `${raw.length} bytes`);
  const c = Z.normalizeBezit(JSON.parse(raw));
  assert.equal(Object.keys(c.parcels).length, 1000); assert.equal(c.buildings.size, 5000);
});

t('de dagtik met 300 gekochte percelen over 30 speldagen: onder 2 s', () => {
  const m = new Map(); const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setIndexForTest({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000, 2400]], rows: ROWS.slice(0, 600).map((r) => [r[0], 220000 + (r[1] - 200000) % 5000, 590000 + (r[2] - 560000) % 5000, r[3], r[4], 0, r[6], r[7]]) });
  L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate();
  const w = { money: 1e9, calendar: { day: 20 }, addMessage() {} };
  let bought = 0; for (let i = 0; i < 300; i++) if (L.koopPerceel(w, hex(i)).ok) bought++;
  assert.ok(bought >= 250, `gekocht ${bought}`);
  L.dayTick(w);
  const t0 = performance.now();
  BL.getBoerderij().uren += 24 * 30; w.calendar = { day: 50 };
  const rep = L.dayTick(w);
  const dt = performance.now() - t0;
  assert.ok(rep, "rapport"); assert.ok(dt < 2000, `${dt.toFixed(0)} ms`); console.log(`  dagtik 30 dagen, ${bought} percelen: ${dt.toFixed(0)} ms`);
});

console.log(`${n - fails}/${n} controles ok`);
process.exit(fails ? 1 : 0);
