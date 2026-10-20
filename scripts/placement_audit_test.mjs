// Placement of buildings, fences and hedges against water, roads and rails (issue #124):
//  - the audit (scripts/world/placement_audit.mjs) counts a footprint in a lake, a fence over a road,
//    a rail or water, and leaves a house on the shore, a houseboat and an island alone;
//  - build_corridor.mjs cutIslands: an island of a lake is dry in the lake's outline;
//  - streetfurniture.js: a mapped fence or hedge is not put down on a carriageway or in water;
//  - countryedge.js edgeSpanBlocked / provinceworld.js realBlockedAt: a wire over a ditch narrower than
//    the post spacing is blocked, and so is the bank of a water strip;
//  - the city map: no placed fence or hedge over a way or water, buildings in water within the baseline.
//   node scripts/placement_audit_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const A = await import('./world/placement_audit.mjs');
const { cutIslands } = await import('./world/build_corridor.mjs');
const SF = await import('../game/js/streetfurniture.js');
const CE = await import('../game/js/countryedge.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
const lake = { pts: rect(0, 0, 100, 100) };
const bld = (pts, o = {}) => ({ pts, type: 'house', ...o });

// --- the audit
{
  const holed = { pts: cutIslands(lake.pts, [rect(60, 60, 20, 20)]) };
  const rep = A.auditPlacement({
    water: [holed],
    roads: [{ pts: [[-50, 150], [150, 150]], cat: 'normal', width: 6 }, { pts: [[-50, 170], [150, 170]], cat: 'normal', width: 6, bridge: true }],
    rails: [{ pts: [[-50, 190], [150, 190]] }],
    buildings: [
      bld(rect(10, 10, 12, 12)), // in the lake
      bld(rect(150, 10, 10, 10)), // on dry land
      bld(rect(64, 64, 10, 10)), // on the island
      bld(rect(30, 30, 8, 4), { type: 'houseboat' }), // floats on purpose
    ],
    mapped: [
      { k: 'fence', pts: [[20, -20], [20, 120]] }, // over the lake
      { k: 'fence', pts: [[0, 140], [0, 160]] }, // over the road
      { k: 'hedge', pts: [[10, 180], [10, 200]] }, // over the rail
      { k: 'fence', pts: [[110, 120], [110, 146]] }, // short of the road
      { k: 'fence', pts: [[120, 160], [120, 180]] }, // under the bridge: no way at ground level
    ],
    placed: [{ k: 'fence', pts: [[130, 10], [130, 30]] }],
  });
  assert.equal(rep.buildingsInWater.length, 1, `one building in water (${JSON.stringify(rep.buildingsInWater)})`);
  assert.deepEqual(rep.buildingsInWater[0].at, [16, 16]);
  assert.equal(rep.mapped.over.length, 3, `three fences over a way or water (${JSON.stringify(rep.mapped.over)})`);
  assert.ok(rep.mapped.over.some((q) => q.water > 80) && rep.mapped.over.some((q) => q.road >= 5) && rep.mapped.over.some((q) => q.rail >= 2));
  assert.equal(rep.placed.over.length, 0);
  assert.ok(A.problems(rep) === 0, 'within the thresholds');
  // the island is dry, the water round it is not
  const wetAt = (x, y) => A.auditPlacement({ buildings: [bld(rect(x - 0.4, y - 0.4, 0.8, 0.8))], water: [holed], roads: [] }).buildingsInWater.length === 1;
  assert.ok(wetAt(20, 20) && !wetAt(70, 70) && wetAt(85, 70) && wetAt(70, 90), 'island dry, water round it wet');
  // a footprint on the lake's edge: a tenth in the water is under the limit, half is over it
  const edge = (w) => A.auditPlacement({ buildings: [bld(rect(100 - w, 10, 20, 10))], water: [lake], roads: [] }).buildingsInWater.length;
  assert.equal(edge(2), 0, '10 % in the water: no');
  assert.equal(edge(10), 1, '50 % in the water: yes');
  // more placed lines over water than the threshold allows fail the audit
  const bad = A.auditPlacement({ buildings: [], water: [lake], roads: [], placed: [{ k: 'fence', pts: [[10, 10], [10, 30]] }] });
  assert.equal(bad.placed.over.length, 1);
  assert.equal(A.problems(bad), 1, 'a placed fence in the water fails');
}

// --- islands cut out of the outline
{
  const ring = cutIslands(lake.pts, [rect(40, 40, 10, 10), rect(200, 200, 5, 5)]); // (the second lies outside: ignored)
  assert.equal(ring.length, lake.pts.length + 6, 'one slit: the island ring and the two ends of the slit');
  assert.deepEqual(ring[0], ring[ring.length - 1], 'still closed');
}

// --- mapped fences and hedges on a carriageway or in water are not put down
{
  const roads = [{ pts: [[0, 50], [200, 50]], type: 'residential', cat: 'minor', width: 6 }];
  const mapped = [
    { k: 'fence', pts: [[40, 20], [40, 80]] }, // over the road
    { k: 'fence', pts: [[60, 56], [100, 56]] }, // beside it
    { k: 'hedge', pts: [[150, 0], [150, 30]] }, // in water
    { k: 'hedge', pts: [[170, 0], [170, 30]] }, // dry
  ];
  const water = [{ pts: rect(140, -10, 20, 50) }];
  const res = SF.furnitureForTile({ x0: 0, y0: -50, size: 400, roads, mapped, water, opts: {} });
  const of = (k) => res.items.filter((it) => it.k === k && it.src === 'osm');
  assert.ok(of('fence').length > 0 && of('fence').every((it) => !(Math.abs(it.x - 40) < 1 && it.y > 46 && it.y < 54)), 'no fence piece on the carriageway');
  assert.ok(of('fence').some((it) => Math.abs(it.y - 56) < 0.1), 'the fence beside the road stays');
  assert.ok(of('fence').some((it) => Math.abs(it.x - 40) < 1 && it.y < 46), 'and the stretch of the crossing line on dry land');
  assert.ok(!of('hedge').some((it) => Math.abs(it.x - 150) < 1), 'no hedge in the lake');
  assert.ok(of('hedge').some((it) => Math.abs(it.x - 170) < 1), 'the dry hedge stays');
}

// --- spans and verges
{
  // a ditch 3 m wide at x 20..23: posts at 15 and 25 are both dry, the wire between them is not
  CE.setExtraBlocked((x, y, m) => x > 20 - Math.min(m, 1) && x < 23 + Math.min(m, 1) && y > -50 && y < 50);
  assert.ok(!CE.edgeBlocked(15, 0, 0.5) && !CE.edgeBlocked(25, 0, 0.5), 'both posts clear');
  assert.ok(CE.edgeSpanBlocked(15, 0, 25, 0, 0.5), 'the wire between them crosses the ditch');
  assert.ok(!CE.edgeSpanBlocked(15, 60, 25, 60, 0.5), 'the same wire beyond the ditch is free');
  CE.setExtraBlocked(null);
  // realBlockedAt: the bank of a water strip, in a resident tile that holds only that water row
  const [ti, tj] = G.tileIndexOf(500, 500);
  const strip = rect(500, 500, 3, 40);
  const map = { resident: new Set([`${ti},${tj}`]), buildingsNear: () => [], roadsNear: () => [], waterNear: () => [], flatWaterNear: () => [{ pts: strip, bounds: [500, 500, 503, 540] }] };
  const isTile = () => true;
  assert.ok(PW.realBlockedAt(map, isTile, 501, 510, 2), 'on the water');
  assert.ok(PW.realBlockedAt(map, isTile, 499.5, 510, 2), '0.5 m off the bank counts as the water');
  assert.ok(!PW.realBlockedAt(map, isTile, 497.5, 510, 2), '2.5 m off the bank is land');
  // an annotated row (kind, nav) lives in the water grid, not the flat one: it blocks as well (issue #185)
  const lakeRow = { pts: rect(600, 600, 200, 200), bounds: [600, 600, 800, 800], kind: 'meer', nav: 3 };
  const [li, lj] = G.tileIndexOf(700, 700);
  const map2 = { resident: new Set([`${li},${lj}`]), buildingsNear: () => [], roadsNear: () => [], waterNear: () => [lakeRow], flatWaterNear: () => [] };
  assert.ok(PW.realBlockedAt(map2, isTile, 700, 700, 1), 'in a lake of the water grid');
  assert.ok(!PW.realBlockedAt(map2, isTile, 900, 700, 1), 'beside it');
}

// --- landing stages
{
  // a stage mapped as a building (14 x 2 m) from the bank into the lake, one of them across a quay road
  const road = { pts: [[-20, 108], [60, 108]], cat: 'minor', width: 6 };
  const rep = A.auditPlacement({
    water: [lake], roads: [road],
    buildings: [bld(rect(40, 96, 2, 14), { type: 'yes' }) /* y 96..110: over the road at 105..111 */, bld(rect(10, 90, 2, 14), { type: 'yes' }), bld(rect(10, 120, 2, 14), { type: 'yes' })],
  });
  assert.equal(rep.stagesOnRoad.length, 1, `one stage over the road (${JSON.stringify(rep.stagesOnRoad)})`);
  assert.ok(A.problems(rep) >= 1);
  // the jetty prop of a village (dorpsuitjes.js): 8 m out from its spot, over water at the far end, nothing under it
  const DU = await import('../game/js/dorpsuitjes.js');
  const lakeW = { pts: rect(100, 0, 100, 100), bounds: [100, 0, 200, 100] };
  const mk = (roads = [], buildings = []) => ({ waterNear: () => [lakeW], flatWaterNear: () => [], roadsNear: () => roads, buildingsNear: () => buildings });
  assert.ok(DU.stageClear(mk(), 95, 50, 0), 'from the bank, 8 m out over the lake');
  assert.ok(!DU.stageClear(mk(), 60, 50, 0), 'standing on land too far from the water: the far end is dry');
  assert.ok(!DU.stageClear(mk([{ pts: [[98, 0], [98, 100]], type: 'residential', cat: 'minor', width: 6 }]), 95, 50, 0), 'a road under the stage');
  assert.ok(!DU.stageClear(mk([], [{ pts: rect(96, 45, 3, 10), bounds: [96, 45, 99, 55] }]), 95, 50, 0), 'a building under the stage');
}

// --- the city map
{
  {
    const { loadCityData } = await import('./lib/loadworld.mjs');
    const city = await loadCityData({ extras: false });
    const F = await import('./world/furniture.mjs');
    const placed = [];
    for (const t of F.generateAll(city)) {
      for (const it of t.items) {
        if (it.k !== 'fence' && it.k !== 'hedge') continue;
        const hx = Math.cos(it.a) * it.s / 2, hy = Math.sin(it.a) * it.s / 2;
        placed.push({ k: it.k, pts: [[it.x - hx, it.y - hy], [it.x + hx, it.y + hy]] });
      }
    }
    const rep = A.auditPlacement({ buildings: city.buildings, roads: city.roads, water: city.water, rails: city.rails, placed });
    assert.equal(rep.placed.over.length, 0, `no placed fence or hedge over a way or water (${JSON.stringify(rep.placed.over.slice(0, 3))})`);
    assert.ok(rep.buildingsInWater.length <= A.THRESHOLDS.city, `buildings in water within the baseline (${rep.buildingsInWater.length})`);
  }
}
// --- green outlines in open water and the countryside's props, on the built province tiles
{
  const g = { pts: rect(10, 10, 20, 20), kind: 'grass' };
  const bank = { pts: rect(0, 0, 100, 100) };
  const rep = A.auditPlacement({ water: [bank], green: [g, { pts: rect(150, 10, 20, 20), kind: 'grass' }, { pts: rect(90, 10, 30, 20), kind: 'park' }] });
  assert.equal(rep.greenInWater.length, 1, 'only the outline wholly in the lake counts');
  if (fs.existsSync(new URL('../game/world/index-provincie.json', import.meta.url))) {
    const PA = await import('./world/prop_water_audit.mjs');
    const out = fs.readFileSync(new URL('../game/world/index-provincie.json', import.meta.url), 'utf8');
    const r = PA.auditSpot(new URL('../game/world', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), JSON.parse(out), PA.SPOTS[0]);
    assert.ok(r.inWater <= PA.MAX_IN_WATER, `props in the Reitdiep water at Electra: ${JSON.stringify(r.counts)}`);
  } else console.log('SKIP no province tiles for the prop audit');
}
console.log('placement_audit_test ok');
