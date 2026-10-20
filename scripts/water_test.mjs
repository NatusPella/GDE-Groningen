// Water (docs/PROVINCIE-PLAN.md 2.11, "Water"):
//   node scripts/water_test.mjs
// - bodies, kinds and peil from made-up polygons (game/js/waterlevels.js);
// - the one water query: level, depth, wade or swim, the free height under a
//   bridge; the Ommeland's ditches through the country hook;
// - boat classes and air drafts against the bridges;
// - a movable bridge's cycle step by step (movablebridges.js): its timing,
//   the open span (no bridge), the barriers, the AI stopping in front of it,
//   the horn that opens it;
// - a boat never breaks a bridge railing (breakables.js);
// - the map: annotated water, the movable bridges, and every navigable
//   waterway sailed per class (scripts/world/water.mjs audit).
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const L = await import('../game/js/waterlevels.js');
const MB = await import('../game/js/movablebridges.js');
const WA = await import('./world/water.mjs');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const rect = (x0, y0, x1, y1, name = '') => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], name });

// 1. bodies and kinds
{
  const water = [
    rect(0, 0, 400, 40),          // a wide canal
    rect(400, 5, 800, 25),        // a canal on from it, touching: same body
    rect(800, 10, 1000, 13),      // a narrow vaart on from that
    rect(0, 200, 60, 260, 'Parkvijver'), // a pond on its own
    rect(0, 400, 300, 401.5),     // a ditch on its own
  ];
  const bodies = L.annotateWater(water);
  ok(bodies.length === 3, 'three bodies', bodies.length);
  ok(water[0].body === water[1].body && water[1].body === water[2].body, 'touching polygons are one body');
  ok(water[0].kind === 'kanaal' && water[1].kind === 'diep' && water[2].kind === 'sloot', 'kinds by channel width', water.slice(0, 3).map((w) => w.kind).join(', '));
  ok(water[3].kind === 'vijver' && water[4].kind === 'sloot', 'pond and ditch off the boezem', `${water[3].kind}, ${water[4].kind}`);
  ok(water[0].lv === L.BOEZEM_Y && water[4].lv === L.WATER_KINDS.sloot.level, 'peil: the boezem, a ditch its own', `${water[0].lv}, ${water[4].lv}`);
  ok(bodies.find((b) => b.boezem).nap === L.BOEZEM_NAP, 'the boezem has its NAP peil');
  // the one query
  const map = {
    waterNear: (x, y) => water.filter((w) => x >= -1 && x <= 1001),
    roadsNear: () => [{ bridge: true, width: 6, pts: [[100, -10], [100, 50]] }],
  };
  const q = L.waterAt(map, 100, 20);
  ok(q && q.kind === 'kanaal' && !q.wade && q.depth === L.WATER_KINDS.kanaal.depth, 'query: deep canal, swim');
  ok(q && Math.abs(q.clearanceAbove - (0 - L.BRIDGE_DECK_T - L.BOEZEM_Y)) < 1e-9, 'query: free height under a street-level bridge 1.8 m', q && q.clearanceAbove);
  ok(L.waterAt(map, 150, 300) === null, 'query: dry land');
  const d = L.waterAt(map, 150, 400.7);
  ok(d && d.wade, 'query: a ditch is waded');
}

// 2. boats and bridges
{
  const boat = (kind, extra = {}) => ({ isBoat: true, model: { kind }, ...extra });
  ok(L.boatClassOf(boat('rondvaart')) === 3 && L.boatClassOf(boat('kano')) === 1, 'boat classes');
  ok(L.airDraftOf(boat('sloep', { isPolice: true })) > L.airDraftOf(boat('sloep')), 'a police sloep with a wheelhouse is taller');
  const street = 0 - L.BRIDGE_DECK_T - L.BOEZEM_Y;
  for (const k of ['kano', 'sloep', 'rondvaart', 'waterfiets', 'acht']) ok(L.passesUnder(L.airDraftOf(boat(k)), street), `${k} fits under a city bridge`);
  ok(!L.passesUnder(L.airDraftOf(boat('skutsje')), street), 'a skutsje does not: the bridge has to open');
  ok(L.bridgeClearance({ _open: true }) === Infinity, 'an open movable bridge has nothing over the water');
}

// 3. a movable bridge's cycle
{
  const road = { movable: 'bascule', bridge: true, pts: [[0, 0], [20, 0]], width: 6, cat: 'normal' };
  const [b] = MB.buildMovableBridges({ roads: [road] });
  ok(b && b.len === 20 && b.half === 4.8, 'bridge from its road');
  const T = MB.BRIDGE_TIMING;
  const world = { vehicles: [], pedestrians: [], player: { x: 500, y: 500 } };
  const run = (secs) => { for (let t = 0; t < secs - 1e-9; t += 0.1) MB.stepBridge(b, 0.1, world); };
  MB.requestOpening(b);
  run(T.WARN_S - 0.2);
  ok(b.state === 'warn' && !road._open && b.boom === 0, 'warn: lights, the road still open to traffic');
  // somebody on the span: it waits with the barriers down
  world.player = { x: 10, y: 0 };
  run(0.3 + T.BOOMS_S);
  ok(b.boom === 1 && !road._open, 'barriers down after warn + booms', `${b.state} ${b.boom}`);
  run(2);
  ok(b.state === 'clear', 'waits while the span is not clear');
  world.player = { x: 500, y: 500 };
  run(0.2);
  ok(b.state === 'opening' && road._open, 'opens once clear; the span is no bridge any more');
  run(T.MOVE_S);
  ok(b.state === 'open' && b.open === 1, 'fully open after MOVE_S');
  // the barriers stop a car in front of it (vehicle.js projectOnPath shape)
  const v = { x: -40, y: 0, model: { brake: 20 }, halfLen: 2, speed: 10 };
  const path = [[-60, 0], [60, 0]];
  const project = (P, x, y) => ({ s: x - v.x, lat: Math.abs(y) });
  const lim = MB.bridgeSpeedLimit(v, path, project);
  ok(Number.isFinite(lim) && lim < 25, 'the AI stops before the barrier', lim);
  ok(MB.loweredBridgeBoomsNear(-5, 0).length === 2, 'two lowered barriers for vehicles to meet');
  run(T.HOLD_S + T.MOVE_S + T.BOOMS_S + 0.5);
  ok(b.state === 'closed' && !road._open && b.boom === 0, 'closes and lifts the barriers', b.state);
  const rw = MB.raceWindow();
  ok(rw.boomsDown === T.WARN_S + T.BOOMS_S && rw.cycle > 40, 'race window from the fixed timing', JSON.stringify(rw));
  // a horn in front of it
  const hit = MB.hornAt(10, 15);
  ok(hit === b && b.state === 'warn', 'the horn of a boat in front of it opens it');
  ok(MB.hornAt(10, 200) === null, 'too far: nothing');
}

// 3b. a lock between two peilen
{
  const LK = await import('../game/js/locks.js');
  const lock = LK.makeLock({ x: 0, y: 0, a: 0, len: 40, width: 8, levels: [-2.3, -0.9] });
  ok(LK.gateOpen(lock, 0) && !LK.gateOpen(lock, 1) && lock.level === -2.3, 'a lock waits open at its low side');
  LK.request(lock, 1, 'boot');
  const T = LK.LOCK_TIMING, run = (s) => { for (let t = 0; t < s; t += 0.1) LK.stepLock(lock, 0.1); };
  run(4 + T.GATE_S + 0.2);
  ok(!LK.gateOpen(lock, 0) && lock.state === 'levelling', 'gate shut behind, levelling');
  run(LK.levelTime(lock) / 2);
  ok(lock.level > -2.3 && lock.level < -0.9, 'the level rises in between', lock.level);
  run(LK.levelTime(lock) / 2 + T.GATE_S + 0.3);
  ok(lock.at === 1 && LK.gateOpen(lock, 1) && Math.abs(lock.level + 0.9) < 1e-9 && lock.queue.length === 1, 'open at the high side for the boat that asked');
  LK.enter(lock, 'boot');
  run(4 + T.GATE_S + LK.levelTime(lock) + T.GATE_S + 0.5);
  ok(lock.at === 0 && LK.gateOpen(lock, 0) && Math.abs(lock.level + 2.3) < 1e-9 && !lock.queue.length, 'in, levelled down and out at the low side');
  ok(LK.chamberLevelAt(lock, 5, 2) === lock.level && LK.chamberLevelAt(lock, 50, 0) === null, 'the chamber has its own level');
  ok(Math.abs(LK.levelTime(lock) - 1.4 / T.FILL_MS) < 1e-9, 'levelling time from the difference in peil');
}

// 4. a boat does not break a bridge railing
{
  const BR = await import('../game/js/breakables.js');
  const p = BR.makeProp('bridgerail', 0, 0, { half: 1, breakSpeed: 2 });
  BR.addProp(p);
  const boat = { isBoat: true, x: -3, y: 0, angle: 0, speed: 8, halfLen: 3, halfWid: 1, model: { len: 6, wid: 2 }, z: 0 };
  const w = { vehicles: [boat], player: { x: 100, y: 100 }, props: [], particles: [], stats: {}, time: 0, addMessage() {}, audioEvents: [] };
  BR.resolvePropCollisions([boat], w);
  boat.x = 1;
  BR.resolvePropCollisions([boat], w);
  ok(!BR.isPropBroken(p.key), 'a boat passing under a bridge breaks no railing');
}

// 5. the map
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData({ extras: false });
ok(data.water.every((w) => w.kind && Number.isFinite(w.lv) && Number.isFinite(w.dp)), 'every water polygon annotated');
const movable = data.roads.filter((r) => r.movable);
ok(movable.length >= 19, 'movable bridges from OSM', movable.length);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
// (een brug waar geen ander brugdek bij ligt: de kanaaloevers uit OSM geven een weg die er schuin langs loopt soms een eigen dek, dat telt niet voor deze brug)
const alone = (r) => { const m = r.pts[Math.floor(r.pts.length / 2)]; return !map.roadsNear(m[0], m[1], 8).some((q) => q !== r && q.bridge && !q._open && !q.movable); };
const mb = map.roads.find((r) => r.movable && r.cat === 'normal' && alone(r));
const mid = mb.pts[Math.floor(mb.pts.length / 2)];
ok(map.isOnBridge(mid[0], mid[1]), 'a closed movable bridge is a bridge');
mb._open = true;
ok(!map.isOnBridge(mid[0], mid[1]), 'an open one is not');
mb._open = false;
const rep = WA.audit(await loadCityData({ extras: false }));
ok(rep.classes[1].reached / rep.classes[1].wide > 0.95, 'a canoe reaches nearly all water wide enough', `${rep.classes[1].reached}/${rep.classes[1].wide}`);
ok([1, 2, 3].every((c) => rep.classes[c].stops.length === 0), 'no fixed bridge too low for a canoe, sloep or tour boat');
ok(rep.classes[3].mainKm2 > 1, 'the tour boats sail more than a square kilometre of canals', rep.classes[3].mainKm2);
console.log(`waterways: canoe ${rep.classes[1].reached}/${rep.classes[1].wide}, sloep ${rep.classes[2].reached}/${rep.classes[2].wide}, tour boat ${rep.classes[3].reached}/${rep.classes[3].wide}, barge ${rep.classes[4].reached}/${rep.classes[4].wide} polygons (${rep.classes[4].stops.length} fixed bridges too low for a barge)`);

// 8. province water: rows get kind, lv, dp, nav; waterAt reads them
{
  const { rows } = L.annotateProvinceWater([rect(0, 0, 400, 40), rect(0, 100, 300, 101.5, 'Hoofdsloot'), rect(0, 200, 30, 230), rect(1000, 0, 1900, 600)], { village: (x, y) => x < 500 });
  ok(rows[0].kind === 'kanaal' && rows[0].nav === 4, 'a wide province canal is a kanaal', rows[0].kind);
  ok(rows[1].kind === 'sloot' && rows[1].lv === -0.8, 'a narrow ditch is a sloot');
  ok(rows[2].nav >= 1 && rows[2].dp > 0, 'a pond carries nav and depth');
  ok(rows[3].kind === 'meer' && rows[3].nav === 3 && rows[3].lv === L.WATER_KINDS.meer.level, 'a large open lake is a meer with its own peil', rows[3].kind);
  ok(rows[0].bank === 'kade' && rows[3].bank === 'oever' && rows[1].bank === 'oever', 'quay in a built-up stretch, bank in the open');
  ok(new Set(rows.map((r) => r.body)).size === 4, 'apart rows are their own bodies');
  // the great shipping waters by name (#7): a barge sails them, also a lake; a narrow one or an unnamed lake not
  const sh = L.annotateProvinceWater([rect(0, 0, 900, 700, 'Dollard'), rect(0, 800, 900, 1500), rect(0, 2000, 500, 2012, 'Reitdiep'), rect(0, 3000, 400, 3040, 'Eemskanaal')]).rows;
  ok(sh[0].kind === 'meer' && sh[0].nav === 4 && sh[0].lv === L.WATER_KINDS.meer.level, 'a named open water takes barges and keeps its peil', `${sh[0].kind} ${sh[0].nav}`);
  ok(sh[1].nav === 3, 'an unnamed lake stays for tour boats');
  ok(sh[2].nav < 4, 'a narrow stretch of the name is no barge water');
  ok(sh[3].nav === 4, 'the Eemskanaal is');
  const m = { waterNear: () => rows, roadsNear: () => [] };
  const a = L.waterAt(m, 200, 20), d = L.waterAt(m, 100, 100.7);
  ok(a && !a.wade && a.navigable === 4, 'deep province water: swim, barge');
  ok(d && d.wade, 'a province ditch is waded');
  ok(L.waterAt(m, 200, 70) === null, 'dry land between');
}

console.log(`${n - fails}/${n} water checks passed`);
process.exit(fails ? 1 : 0);
