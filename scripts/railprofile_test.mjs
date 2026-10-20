// Track profiles (docs/PROVINCIE-PLAN.md 2.11, "Spoor"):
//   node scripts/railprofile_test.mjs
// - the solver on small made-up networks: a level crossing at exactly the
//   road's height, a level platform, the grade and curve limits, the track
//   over an untagged road and under a road OSM grades above it;
// - the map: every line end to end (scripts/world/railprofile.mjs audit)
//   without a jump, a grade over 2.5 %, a level crossing off the road, a
//   platform that is not level or a road crossing under its clearance; the
//   game's height query (railway.js railZ) is the profile;
// - the rail lifts walked, driven and cycled (ringcheck.js probeRailLifts,
//   as the storytest does).
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const RP = await import('./world/railprofile.mjs');
const R = await import('../game/js/railprofile.js');
const { clearanceUnder } = await import('../game/js/roadprofile.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const line = (x0, x1, y = 0, step = 50) => { const P = []; for (let x = x0; x <= x1; x += step) P.push([x, y]); return P; };
const zOf = (data, x, y) => R.railHeightAt(R.railHeightIndex(data.rails), x, y);

// 1. a track over a road (an old rail lift), a level crossing 1.2 km on
{
  const data = {
    rails: [{ pts: line(-3010, 2990) }],
    roads: [
      { pts: [[0, -50], [0, 50]], cat: 'normal', type: 'residential', width: 6 },
      { pts: [[1200, -50], [1200, 50]], cat: 'normal', type: 'residential', width: 6 },
    ],
    levelCrossings: [{ x: 1200, y: 0 }],
    railLifts: [{ x: 0, y: 0, h: 6, plateau: 8, ramp: 120 }],
    railRoutes: [{ name: 'test', pts: line(-3000, 3000, 0, 10), stops: [] }],
  };
  const sol = RP.solve(data);
  RP.apply(data, sol);
  ok(zOf(data, 0, 0) >= clearanceUnder(data.roads[0]) - 0.05, 'track clears the road it crosses', zOf(data, 0, 0).toFixed(2));
  ok(Math.abs(zOf(data, 1200, 0)) < 0.005, 'level crossing at the road height', zOf(data, 1200, 0).toFixed(3));
  const rep = RP.audit(data);
  ok(!rep.steep.length && !rep.jumps.length, 'grade within 2.5 %, no jumps', `${rep.steep.length} steep, ${rep.jumps.length} jumps`);
  ok(rep.lines[0].maxG <= R.RAIL_GRADE + R.RAIL_GRADE_TOL, 'room enough: the grade stays at 1.25 %', (rep.lines[0].maxG * 100).toFixed(2));
  ok(!rep.curves.length, 'vertical curves', rep.curves.map((q) => q.R.toFixed(0)).join(', '));
  ok(!rep.lc.length && !rep.clearance.length, 'level crossing and clearance in the audit');
  // the track comes down to the terrain away from the crossing
  ok(Math.abs(zOf(data, -2500, 0)) < 0.01 && Math.abs(zOf(data, 2500, 0)) < 0.01, 'back on the terrain away from the lift');
}

// 2. a road OSM grades over the track: the track stays down, under the deck
{
  const data = {
    rails: [{ pts: line(-1010, 990) }],
    roads: [{ pts: [[0, -50], [0, 50]], cat: 'major', type: 'secondary', width: 8, bridge: true, layer: 1 }],
    levelCrossings: [],
    railRoutes: [],
  };
  RP.apply(data, RP.solve(data));
  ok(Math.abs(zOf(data, 0, 0)) < 0.01, 'track under a road bridge stays on the terrain');
  ok(R.overAtRailCrossing({ ly: [0] }, 0, data.roads[0]) === 'road', 'road bridge over untagged track');
  ok(R.overAtRailCrossing({ ly: [1] }, 0, { cat: 'normal', bridge: true, layer: 1 }) === 'rail', 'equal layers: the track goes over (old rule)');
  ok(R.overAtRailCrossing({}, 0, { cat: 'normal' }) === 'rail', 'untagged: the track goes over');
}

// 3. a platform next to a crossing: level on the terrain, or an elevated
// station (layer 1) level at the height the road under it needs
{
  const mk = (layer) => ({
    rails: [{ pts: line(-2010, 1990, 0, 25) }],
    roads: [{ pts: [[42, -50], [42, 50]], cat: 'normal', type: 'tertiary', width: 7 }],
    levelCrossings: [],
    railLifts: [{ x: 42, y: 0, h: 6, plateau: 8, ramp: 120 }],
    railPlatforms: [{ pts: [[-80, 4], [80, 4], [80, 8], [-80, 8]], layer }],
    railRoutes: [{ name: 't', pts: line(-2000, 2000, 0, 10), stops: [{ name: 'Halte', s: 2000 }] }],
  });
  const ground = mk(0);
  const sol = RP.solve(ground);
  RP.apply(ground, sol);
  ok(Math.abs(zOf(ground, -60, 0)) < 0.01 && Math.abs(zOf(ground, 60, 0)) < 0.01, 'ground-level platform stays level on the terrain');
  ok(sol.shortfall.length > 0, 'a crossing inside a ground-level platform is a shortfall (the road dips)');
  const raised = mk(1);
  RP.apply(raised, RP.solve(raised));
  const z0 = zOf(raised, -60, 0), z1 = zOf(raised, 60, 0);
  ok(Math.abs(z0 - z1) < 0.01 && z0 >= clearanceUnder(raised.roads[0]) - 0.05, 'elevated platform: level and clear of the road under it', `${z0.toFixed(2)} / ${z1.toFixed(2)}`);
  const rep = RP.audit(raised);
  ok(!rep.platforms.length && !rep.steep.length, 'elevated station audit');
  ok(R.PLATFORM_ABOVE_RAIL >= R.PLATFORM_RANGE[0] && R.PLATFORM_ABOVE_RAIL <= R.PLATFORM_RANGE[1], 'platform top 0.76-0.84 m above the rail');
}

// 4. the map
const root = new URL('../game/', import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData();
const rep = RP.audit(data);
ok(rep.profiled, 'stad.json rails carry a solved profile');
ok(rep.lines.length >= 4, 'every line audited', rep.lines.map((l) => l.name).join(', '));
ok(!rep.jumps.length, 'no jumps along any line', rep.jumps.slice(0, 3).map((q) => `${q.line} ${q.at}`).join('; '));
ok(!rep.steep.length, 'no grade over 2.5 % on any line', rep.steep.slice(0, 3).map((q) => `${q.line} ${(q.g * 100).toFixed(1)} % ${q.at}`).join('; '));
ok(!rep.lc.length, 'level crossings at the road height', rep.lc.map((q) => q.at).join('; '));
ok(!rep.platforms.length, 'platforms level', rep.platforms.map((q) => q.stop).join('; '));
ok(!rep.clearance.length, 'every road crossing clears', rep.clearance.slice(0, 3).map((q) => `${q.road} ${q.dz.toFixed(2)}/${q.need} ${q.at}`).join('; '));
ok(!rep.catenary.length, 'contact wire under decks');
ok(data.rails.some((r) => r.el), 'electrified track known from OSM');
// the game's query is the same profile
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
await import('../game/js/player.js');
const railway = await import('../game/js/railway.js');
railway.initRailway({ map, vehicles: [], pedestrians: [], player: { x: 0, y: 0 } });
const idx = R.railHeightIndex(map.rails);
let worst = 0;
for (const r of map.rails) if (r.z) r.pts.forEach((p, i) => { worst = Math.max(worst, Math.abs(railway.railZ(p[0], p[1]) - r.z[i])); });
ok(worst < 0.6, 'railway.js railZ reads the profile', worst.toFixed(2));
ok(R.railHeightAt(idx, 1e6, 1e6) === 0, 'off the track the height query is 0');
// walk, drive and cycle up the raised stretches
const RC = await import('../game/js/ringcheck.js');
const world = { map, flitspaalen: [], player: { x: 0, y: 0 }, vehicles: [], props: [], particles: [], stats: {}, time: 0, addMessage() {}, audioEvents: [] };
const lifts = RC.probeRailLifts(world);
ok(!lifts.length, 'rail lifts can be walked, driven and cycled up', lifts.slice(0, 4).map((h) => `${h.how}: ${h.what} (${h.x}, ${h.y}, z ${h.z})`).join('; '));

console.log(`${n - fails}/${n} rail profile checks passed`);
process.exit(fails ? 1 : 0);
