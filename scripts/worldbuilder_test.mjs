// The wereldbouwer (game/js/worldbuilder.js, docs/PROVINCIE-PLAN.md 2.5):
//  1. the OSM adapter, run over the city's own raw OSM cache, gives the
//     city's road rows (class, lanes, width, speed, access) and building
//     rows (type, levels) as process_osm.py built them: the audit that lets
//     the city go through the same entry point;
//  2. the height evidence order, the lane model and the hooks.
//   node scripts/worldbuilder_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const root = new URL('../game/', import.meta.url);
const WB = await import('../game/js/worldbuilder.js');
const { capBuilding } = await import('../game/js/buildingcap.js');
let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- 2. rules -----------------------------------------------------------------
{
  const h = WB.heightFields({ hmax: 12.4, hg: 0.6, h50: 9, roof: 'gabled' }, { h: 9, lv: 3 }, 2);
  if (h.hsrc !== '3dbag' || h.hm !== 11.8 || h.roof !== 'gabled') fail('3D BAG wins: ' + JSON.stringify(h));
  if (WB.heightFields({ hmax: 12.4, hg: 0.6 }, null, 2, true).roof) fail('a roof from the OSM tags stays');
  if (WB.heightFields(null, { h: 9, lv: 3 }, 2).hsrc !== 'osm_height') fail('OSM height before levels');
  const lv = WB.heightFields(null, { lv: 3, rl: 1 }, 2);
  if (lv.hsrc !== 'osm_levels' || lv.hm !== 12.4) fail('levels + roof levels: ' + JSON.stringify(lv));
  const d = WB.heightFields(null, null, 2);
  if (d.hsrc !== 'default' || d.hm !== 6.2) fail('default: ' + JSON.stringify(d));
  // lanes: a trunk carriageway is as wide as its lanes, not the whole road
  const t = WB.laneFields('trunk', { oneway: 'yes', lanes: '2' }, 12, true);
  if (t.width !== 7.5 || t.lanesFwd !== 2 || t.lanesBwd !== 0) fail('trunk half: ' + JSON.stringify(t));
  const two = WB.laneFields('secondary', { lanes: '4', 'turn:lanes:forward': 'left|through' }, 9);
  if (two.lanesFwd !== 2 || two.lanesBwd !== 2 || !eq(two.turnFwd, ['left', 'through']) || two.width !== 13) fail('two-way lanes: ' + JSON.stringify(two));
  const r = WB.buildRoad({ pts: [[0, 0], [10, 0]], highway: 'residential', tags: { motor_vehicle: 'no' } });
  if (r.acc !== (1 | 2)) fail('access from the tags: ' + r.acc);
  if (WB.buildRoad({ pts: [[0, 0], [10, 0]], highway: 'residential', tags: {} }, { village: true }).speed !== 8.5) fail('village street speed');
  // a tile without a countryside model keeps its barns and churches
  const sq = [[0, 0], [30, 0], [30, 20], [0, 20], [0, 0]];
  const barn = WB.buildBuilding({ pts: sq, code: 4, urban: 0.1 });
  if (!barn || barn.type !== 'farm_auxiliary') fail('a barn box in a tile: ' + JSON.stringify(barn));
  if (WB.buildBuilding({ pts: sq, tag: 'barn' }).type !== 'barn') fail('an OSM outline keeps its tag');
  const flat = WB.buildBuilding({ pts: sq, tag: 'apartments', levels: 5 });
  if (flat.type !== 'apartments' || flat.h !== 5 || flat.hsrc !== 'osm_levels') fail('a block of flats: ' + JSON.stringify(flat));
  const tall = WB.buildBuilding({ pts: sq, tag: 'yes', height: 21 });
  if (tall.hsrc !== 'osm_height' || tall.hm !== 21) fail('OSM height: ' + JSON.stringify(tall));
  WB.registerHook('furniture', (tile) => tile.roads.map((q) => ({ kind: 'bench', x: q.pts[0][0], y: q.pts[0][1] })));
  if (WB.runHooks('furniture', { roads: [r] }).length !== 1) fail('furniture hook');
}

// --- 1. the city: the OSM adapter against process_osm.py's rows -------------------
if (!fs.existsSync(new URL('../data/groningen_raw.json', import.meta.url))) console.log('SKIP 1. the city adapter against process_osm.py: no data/groningen_raw.json (the old city path is cleaned up)');
else {
  // process_osm.py's sources, first copy of each element wins
  const els = [], seen = new Set();
  for (const f of ['groningen_raw.json', 'groningen_extra.json', 'ring_raw.json.gz', 'ring_extra.json.gz']) {
    let b = fs.readFileSync(new URL('../data/' + f, import.meta.url));
    if (f.endsWith('.gz')) b = zlib.gunzipSync(b);
    for (const el of JSON.parse(b).elements) { const k = el.type + el.id; if (!seen.has(k)) { seen.add(k); els.push(el); } }
  }
  const raw = { elements: els };
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const city = await loadCityData({ extras: false });
  const t0 = performance.now();
  const rows = { roads: [], buildings: [] };
  for (const el of raw.elements) for (const f of WB.fromOsm(el)) if (rows[f.kind]) rows[f.kind].push(f.row);
  const duals = WB.applyDuals(rows.roads);
  const ms = performance.now() - t0;
  // roads: by OSM id (the car roads carry it)
  const byOsm = new Map();
  for (const r of rows.roads) if (r.osm !== undefined) byOsm.set(r.osm, r);
  const FIELDS = ['type', 'cat', 'speed', 'oneway', 'roundabout', 'lanesFwd', 'lanesBwd', 'lanes', 'laneW', 'width', 'widthSrc'];
  const miss = Object.fromEntries(FIELDS.map((k) => [k, 0]));
  let n = 0, found = 0;
  const ex = {};
  for (const c of city.roads) {
    if (c.osm === undefined) continue;
    n++;
    const r = byOsm.get(c.osm);
    if (!r) continue;
    found++;
    for (const k of FIELDS) if (c[k] !== r[k] && !(k === 'width' && Math.abs(c[k] - r[k]) < 0.011)) { miss[k]++; if (!ex[k]) ex[k] = `${c.osm} ${c.type}: ${c[k]} vs ${r[k]}`; }
  }
  const worst = Math.max(...Object.values(miss));
  console.log(`city roads: ${found}/${n} car ways found in the raw cache, ${duals} dual carriageways; differing per field ${JSON.stringify(miss)} (${(ms / 1000).toFixed(1)} s for ${raw.elements.length} elements)`);
  for (const [k, v] of Object.entries(ex)) console.log(`  e.g. ${k}: ${v}`);
  if (found < n * 0.97) fail(`only ${found}/${n} city car roads found by OSM id`);
  if (worst > found * 0.01) fail(`more than 1% of the city's car roads differ in a field (${worst})`);
  // buildings: the city row whose first vertex the adapter's row shares
  // the same outline: vertex mean within 0.3 m and the same vertex count, or (a footprint
  // building_clearance.mjs pushed off a road, with the extra vertices that adds) within 2.5 m
  const cen = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
  const byCell = new Map();
  for (const b of rows.buildings) { const c = cen(b.pts); const k = `${Math.round(c[0])},${Math.round(c[1])}`; (byCell.get(k) || byCell.set(k, []).get(k)).push([c, b]); }
  const lookup = (P) => {
    const c = cen(P);
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (const [q, b] of byCell.get(`${Math.round(c[0]) + dx},${Math.round(c[1]) + dy}`) || []) { const d = Math.hypot(q[0] - c[0], q[1] - c[1]); if ((b.pts.length === P.length && d < 0.3) || (b.pts.length !== P.length && d < 2.5)) return b; }
    return null;
  };
  let nb = 0, fb = 0, dt = 0, dh = 0;
  const tdiff = {}, hdiff = {};
  for (const b of city.buildings) {
    if (b.landmark || b.landmarkPart) continue;
    nb++;
    const o = lookup(b.pts);
    if (!o) continue;
    fb++;
    if (o.type !== b.type) { dt++; const k = b.type + '>' + o.type; tdiff[k] = (tdiff[k] || 0) + 1; }
    // (the city's measured heights come from the 3D BAG, which this run of the adapter does not read)
    // (buildingcap.js trims what a footprint cannot carry on purpose, #179: expect the old row through the same cap)
    if (o.h !== b.h && b.hsrc !== '3dbag' && o.h !== capBuilding({ ...b }).h) { dh++; const k = b.h + '>' + o.h; hdiff[k] = (hdiff[k] || 0) + 1; }
  }
  console.log(`city buildings: ${fb}/${nb} matched by outline, type differs ${dt}, levels differ ${dh}`);
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`  type (city>builder): ${top(tdiff)}\n  levels: ${top(hdiff)}`);
  if (fb < nb * 0.99) fail(`only ${fb}/${nb} city buildings matched`);
  if (dt > fb * 0.005) fail(`${dt} city building types differ`);
  if (dh > fb * 0.005) fail(`${dh} city building levels differ (only height-tagged ones should)`);
}

// the real ditches, drains and brooks become waterway lines (#124); a culvert does not
{
  const g = [[53.2, 6.5], [53.2, 6.502]];
  const line = (tags) => WB.fromOsm({ type: 'way', id: 1, tags, g });
  const d = line({ waterway: 'ditch' }), dr = line({ waterway: 'drain' }), st = line({ waterway: 'stream', width: '4' });
  if (d.length !== 1 || d[0].kind !== 'waterways' || d[0].row.hw !== WB.DITCH_WIDTH.ditch / 2) fail('a ditch is a waterway line of its guessed width');
  if (dr[0].row.hw !== WB.DITCH_WIDTH.drain / 2 || st[0].row.hw !== 2) fail('a drain and a brook with a mapped width');
  if (line({ waterway: 'ditch', tunnel: 'culvert' }).length !== 0 || line({ waterway: 'drain', covered: 'yes' }).length !== 0) fail('a culvert or a covered drain is no open water');
  if (WB.fromOsm({ type: 'way', id: 2, tags: { waterway: 'ditch' }, g }, { ditches: false }).length !== 0) fail('ditches can be left out');
  if (line({ waterway: 'canal' })[0].row.hw !== 7) fail('a canal keeps its guessed 14 m');
}

// OSM landuse becomes parcels for the countryside (#124): arable, meadow, orchard; small ones and other uses not
{
  const sq = (n) => [[53.2, 6.5], [53.2, 6.5 + n], [53.2 + n, 6.5 + n], [53.2 + n, 6.5], [53.2, 6.5]];
  const poly = (landuse, n) => WB.fromOsm({ type: 'way', id: 3, tags: { landuse }, g: sq(n) }).filter((f) => f.kind === 'parcels');
  const f = poly('farmland', 0.004);
  if (f.length !== 1 || f[0].row.use !== 'akker') fail('farmland is arable');
  if (poly('meadow', 0.004)[0].row.use !== 'weide' || poly('orchard', 0.004)[0].row.use !== 'boomgaard') fail('meadow and orchard');
  if (poly('farmland', 0.00005).length !== 0) fail('a plot under 2000 m2 is no parcel');
  if (poly('residential', 0.004).length !== 0) fail('other land use is no parcel');
  if (WB.fromOsm({ type: 'way', id: 4, tags: { landuse: 'farmland' }, g: sq(0.004) }, { parcels: false }).some((q) => q.kind === 'parcels')) fail('parcels can be left out');
}

console.log(fails ? `${fails} failure(s)` : 'worldbuilder: ok');
process.exit(fails ? 1 : 0);
