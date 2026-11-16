// Movable bridges (#153): the road paint is cut to the leaf and put in the
// leaf's frame, so a point of paint ends at its world place when the leaf lies
// closed and moves with the deck when it turns.
//   node scripts/movable_paint_test.mjs
import './node3d.mjs';
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { leafMarkings } = await import('../game/js/movablebridges3d.js');

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

// a span from (100, 50) to (100 + 30 cos, 50 + 30 sin), a lane line down its middle (width 0.1)
const ang = 0.6, len = 40;
const ux = Math.cos(ang), uy = Math.sin(ang);
const b = { ax: 100, ay: 50, ux, uy, len };
const strip = (s0, s1, off) => {
  const P = [], U = [];
  const at = (s, o) => [b.ax + ux * s - uy * o, 0.02, b.ay + uy * s + ux * o];
  for (let s = s0; s < s1 - 1e-9; s += 1) {
    const q = [at(s, off - 0.05), at(s, off + 0.05), at(s + 1, off - 0.05), at(s + 1, off + 0.05)];
    for (const k of [0, 2, 1, 1, 2, 3]) { P.push(...q[k]); U.push(0.5, 0.5); }
  }
  return { P, U };
};
const { P, U } = strip(3, 37, 0.7);

// as movablebridges3d.js sets its pivots
const yaw = -Math.atan2(b.uy, b.ux);
const pivotFor = (s0, dir) => {
  const piv = new THREE.Group();
  piv.position.set(b.ax + b.ux * s0, 0, b.ay + b.uy * s0);
  piv.rotation.y = dir > 0 ? yaw : yaw + Math.PI;
  piv.updateMatrixWorld(true);
  return piv;
};
const worldOf = (piv, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(piv.matrixWorld);

// one leaf over the whole span
{
  const m = leafMarkings(P, U, b, 0, len, 1);
  ok(m.pos.length === P.length, 'a single leaf keeps all the paint');
  const piv = pivotFor(0, 1);
  const w = worldOf(piv, m.pos[0], m.pos[1], m.pos[2]);
  ok(Math.hypot(w.x - P[0], w.z - P[2]) < 1e-6, 'closed, a point of paint is where the road had it');
  // when the leaf turns, the paint turns with it: its world position follows the leaf group
  const leaf = new THREE.Group(); piv.add(leaf);
  const dot = new THREE.Object3D(); dot.position.set(m.pos[0], m.pos[1], m.pos[2]); leaf.add(dot);
  const ref = new THREE.Object3D(); ref.position.set(5, 0, 0.7); leaf.add(ref);
  leaf.rotation.z = 1.0; piv.updateMatrixWorld(true);
  const d0 = new THREE.Vector3().setFromMatrixPosition(dot.matrixWorld);
  const d1 = new THREE.Vector3().setFromMatrixPosition(ref.matrixWorld);
  ok(d0.y > 1 && d1.y > 1, 'opened, the paint rises with the leaf');
}

// a double bascule: each half takes its own paint, in its own frame
{
  const half = len / 2;
  const m1 = leafMarkings(P, U, b, 0, half, 1), m2 = leafMarkings(P, U, b, len, half, -1);
  ok(m1.pos.length > 0 && m2.pos.length > 0, 'both halves get paint');
  const p2 = pivotFor(len, -1);
  const w = worldOf(p2, m2.pos[0], m2.pos[1], m2.pos[2]);
  // the second half's paint lies on the road's line
  const along = (w.x - b.ax) * ux + (w.z - b.ay) * uy, across = -(w.x - b.ax) * uy + (w.z - b.ay) * ux;
  ok(along >= half - 1 && along <= len && Math.abs(across - 0.7) < 0.06, 'the far half\'s paint keeps its place on the road');
}

// #967: a second way on the same deck. OSM tags only the movable way, so its paint hung in the air
// when the leaf rose. Such a way rides on the span: it is worn by the leaf and hidden with it.
{
  const { ridesOnSpan } = await import('../game/js/movablebridges.js');
  const span = { ax: 0, ay: 0, ux: 1, uy: 0, len: 30, half: 6, r: { pts: [[0, 0], [30, 0]], cat: 'major' } };
  const road = (pts, o = {}) => ({ pts, cat: 'cycle', width: 2, ...o });
  ok(ridesOnSpan(span, road([[0, 2], [30, 2]])), 'a way over the whole deck, along the span, rides along');
  ok(ridesOnSpan(span, road([[2, -4], [10, -4], [28, -4]], { cat: 'normal', width: 6 })), 'a second carriageway with a bend rides along');
  ok(!ridesOnSpan(span, span.r), 'the movable way itself is not a rider');
  ok(!ridesOnSpan(span, road([[-20, 2], [50, 2]])), 'a way that continues past the bridge does not ride along');
  ok(!ridesOnSpan(span, road([[10, -40], [10, 40]])), 'a road under the bridge (across the span) does not ride along');
  ok(!ridesOnSpan(span, road([[0, 2], [30, 2]], { z: [0, 4] })), 'a way with its own height profile does not ride along');
  ok(!ridesOnSpan(span, road([[0, 2], [30, 2]], { tunnel: true })), 'a tunnel does not ride along');
  ok(!ridesOnSpan(span, road([[0, 20], [30, 20]])), 'a way beside the deck does not ride along');
}

// the real bridges of the city: the leaf wears the road's own materials, open and closed
{
  const fs = await import('node:fs');
  const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
  const RS = await import('../game/js/roadsurface.js');
  const MB = await import('../game/js/movablebridges.js');
  const M3 = await import('../game/js/movablebridges3d.js');
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const data = await loadCityData();
  const map = new GameMap(data);
  RS.setRoadNetwork(map);
  const bridges = MB.buildMovableBridges(map, map.roads);
  M3.initMovableBridges3D({ add() {}, remove() {} });
  const views = M3._bridgeViewsForTest();
  ok(views.length === bridges.length && views.length > 5, `a view per movable bridge (${views.length})`);
  const mats = (v) => v.leaves.flatMap((l) => l.leaf.children.map((c) => c.material));
  let wearing = 0, same = true, marked = 0;
  for (const v of views) {
    const want = RS.roadSurfaceMaterials(v.b.r);
    const before = mats(v);
    v.b.open = 0; M3.updateMovableBridges3D(v.b.x, v.b.y);
    const closed = mats(v);
    v.b.open = 1; M3.updateMovableBridges3D(v.b.x, v.b.y);
    const open = mats(v);
    if (closed.length !== open.length || closed.some((m, i) => m !== open[i]) || before.some((m, i) => m !== open[i])) same = false;
    if (open.includes(want.road)) wearing++;
    if (open.includes(RS.getMarkingMaterial())) marked++;
    v.b.open = 0;
  }
  ok(same, 'the leaf keeps the same materials open and closed');
  ok(wearing === views.length, `every leaf wears its road's material (${wearing} of ${views.length})`);
  ok(marked > 0, `paint rides on the leaves (${marked})`);

  // #967: the city has bridges where a second way lies on the very same deck (the Europaweg, the
  // Eltjo Ruggeweg). Its paint has to ride on the leaf and its asphalt has to go when the leaf rises.
  const mark = RS.getMarkingMaterial();
  const withRiders = views.filter((v) => (v.b.riders || []).length > 0);
  ok(withRiders.length > 0, `a second way on the deck exists in the city (${withRiders.length} bridges)`);
  const twoLayers = views.filter((v) => v.leaves.some((l) => l.leaf.children.filter((c) => c.material === mark).length > 1));
  ok(twoLayers.length > 0, `the paint of a second way rides on the deck (${twoLayers.length} bridges)`);
  const probe = withRiders[0].b;
  probe.open = 1;
  // #919: ver weg is er geen leaf-view; dan moet de stille weg blijven staan,
  // anders kijk je door de open brug heen naar het water
  M3.syncMovableBridges3D(1e6, 1e6, map);
  ok(!M3.openBridgeRoads(new Set()).has(probe.r), 'een open brug ver weg houdt zijn stille dek');
  M3.syncMovableBridges3D(probe.x, probe.y, map);
  const hidden = M3.openBridgeRoads(new Set());
  ok(hidden.has(probe.r) && probe.riders.every((r) => hidden.has(r)), 'an open bridge hides the second way too', JSON.stringify([...hidden].length));
  probe.open = 0;
  ok(M3.openBridgeRoads(new Set()).size === 0, 'a closed bridge hides nothing');
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} movable-bridge paint checks passed`);
process.exit(fails ? 1 : 0);
