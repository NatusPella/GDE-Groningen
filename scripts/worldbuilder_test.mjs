// The wereldbouwer (game/js/worldbuilder.js, docs/PROVINCIE-PLAN.md 2.5): the height evidence order, the lane model, the hooks,
// ditches and parcels. (The check of the OSM adapter against process_osm.py's city rows went with the old city path, #90.)
//   node scripts/worldbuilder_test.mjs
import './node3d.mjs';

const WB = await import('../game/js/worldbuilder.js');
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
