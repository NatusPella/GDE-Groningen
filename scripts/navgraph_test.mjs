// The route graph in tiles (game/js/navgraph.js, the `nav` section, the global layer):
//   node scripts/navgraph_test.mjs
// - the graph rebuilt from the tiles' edges is the graph of the whole map
// - random pairs: the same route cost over the tile graph and the whole graph, per mode
// - access per mode: no walking or cycling over a motorway, no car on a cycle path or footway
// - the global layer: the main roads as chains, connected, fewer than the edges
import './node3d.mjs';

const P = await import('./world/pack_tiles.mjs');
const G = await import('../game/js/gdt.js');
const N = await import('../game/js/navgraph.js');
const { NavGraph } = await import('./lib/navgraph_check.mjs');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const src = await P.loadSourcesLaag();
const built = P.build(src);
const whole = NavGraph.from(N.edgeRows(src.map.roads));

// tile graph: every tile's nav rows
const rows = [];
let tilesWithNav = 0;
for (const [, b] of built.blobs) {
  const d = G.decodeBlob(b.bytes);
  const s = d.sections.find((q) => q.type === G.SECTION.NAV);
  if (!s) continue;
  tilesWithNav++;
  for (const r of s.rows) { const { p, ...rest } = r; rows.push({ ...rest, a: p[0], b: p[1] }); }
}
const tileGraph = NavGraph.from(rows);
ok(rows.length === whole.edges && tileGraph.edges === whole.edges, `${rows.length} edges in ${tilesWithNav} tiles = the ${whole.edges} of the whole map`, `${rows.length}/${whole.edges}`);
ok(tileGraph.xy.length === whole.xy.length, 'same number of nodes', `${tileGraph.xy.length}/${whole.xy.length}`);

let seed = 777;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (const mode of ['car', 'bike', 'foot']) {
  let found = 0, tried = 0, bad = 0;
  const cand = [];
  whole.adj.forEach((a, i) => { if (a.some((q) => q.e.acc & N.MODES[mode])) cand.push(i); });
  for (let k = 0; k < 60; k++) {
    const a = cand[Math.floor(rnd() * cand.length)], b = cand[Math.floor(rnd() * cand.length)];
    if (a === b) continue;
    const ra = whole.route(a, b, mode);
    tried++;
    if (!ra) continue;
    found++;
    const ta = tileGraph.nearest(whole.xy[a][0], whole.xy[a][1], mode, 0.2), tb = tileGraph.nearest(whole.xy[b][0], whole.xy[b][1], mode, 0.2);
    const rb = tileGraph.route(ta, tb, mode);
    if (!rb || Math.abs(rb.cost - ra.cost) > 1e-6) bad++;
  }
  ok(found >= tried * 0.3 && bad === 0, `${mode}: ${found}/${tried} random pairs routed, same cost over the tile graph (${bad} differ)`, `${found}/${tried}`);
}

// access per mode
{
  const seen = { motorBike: 0, motorFoot: 0, cycleCar: 0, footCar: 0, busCar: 0 };
  for (const r of src.map.roads) {
    const a = N.accessOf(r);
    if (/^(motorway|trunk)/.test(r.type)) { if (a & N.ACC.BIKE) seen.motorBike++; if (a & N.ACC.FOOT) seen.motorFoot++; }
    if (r.cat === 'cycle' && a & N.ACC.CAR) seen.cycleCar++;
    if (r.cat === 'foot' && a & N.ACC.CAR) seen.footCar++;
    if (r.busOnly && a & N.ACC.CAR) seen.busCar++;
  }
  ok(Object.values(seen).every((v) => v === 0), 'access: motorways have no foot or bike, cycle paths and footways no car, busways bus only', JSON.stringify(seen));
  const nMotor = src.map.roads.filter((r) => /^(motorway|trunk)/.test(r.type)).length;
  ok(nMotor > 50, `there are ${nMotor} motorway and trunk roads to check`);
}

// the global layer
{
  const chains = G.decodeBlob(built.global).sections.filter((s) => s.type === G.SECTION.META).map((s) => s.json).find((j) => j.nav).nav;
  const g = NavGraph.from(chains.map((c) => ({ a: c.a, b: c.b, len: c.len, spd: c.spd, ow: c.ow, acc: c.acc })));
  const majors = src.map.roads.filter((r) => r.cat === 'major').reduce((a, r) => a + r.pts.length - 1, 0);
  ok(chains.length > 100 && chains.length < majors / 2, `global layer: ${chains.length} chains for ${majors} main-road segments`);
  const km = chains.reduce((a, c) => a + c.len, 0) / 1000;
  ok(km > 50, `global layer holds ${km.toFixed(0)} km of main roads`);
  let linked = 0, tried = 0;
  const cand = [];
  g.adj.forEach((a, i) => { if (a.length) cand.push(i); });
  for (let k = 0; k < 40; k++) {
    const a = cand[Math.floor(rnd() * cand.length)], b = cand[Math.floor(rnd() * cand.length)];
    if (a === b) continue;
    tried++;
    if (g.route(a, b, 'car')) linked++;
  }
  ok(linked >= tried * 0.3, `global layer routes between its nodes (${linked}/${tried})`);
}

console.log(`${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
