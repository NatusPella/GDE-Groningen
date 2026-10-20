// A walker near the Hereweg viaduct crosses the tracks over it (two-way, with a
// z profile) instead of walking round via the Emmaviaduct (#119); and a route
// that ends where you stand is left empty.
//   node scripts/route_bridge_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const R = await import('../game/js/routing.js');
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const len = (p) => p.reduce((s, q, i) => s + (i ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
let bad = 0;
const check = (name, ok, info) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${info}`); };
for (const kind of ['walk']) {
  const r = R.planLandRoute(map, kind, [420, 985], [430, 940]);
  const l = r ? len(r.pts) : Infinity;
  check(`${kind} over the Hereweg viaduct`, l < 200, `${l.toFixed(0)} m for 46 m as the crow flies`);
}
// Hoofdstation to the Remonstrantse Kerk: the Museumeiland bridge (it runs
// under the museum building, which must not make it 8x as costly) is the way over
// the water, not the Herebrug 300 m further east.
const st = data.stations.find((x) => x.name === 'Groningen Hoofdstation');
const kerk = data.buildings.find((x) => x.name === 'Remonstrantse Kerk').pts[0];
const crow = Math.hypot(kerk[0] - st.x, kerk[1] - st.y);
for (const kind of ['walk', 'bike']) {
  const r = R.planLandRoute(map, kind, [st.x, st.y], kerk);
  const l = r ? len(r.pts) : Infinity;
  const via = r && r.roads.some((x) => x && x.name === 'Museumeiland');
  // (the bike starts in the pedestrian zone in front of the station, which the OSM city has joined to the cycle network: it rides
  // round the station building over the Stadsbalkon, about 70 m more than the old city's route, which began 31 m from the
  // station straight through the building. The Herebrug way round is 867 m on foot and 1005 m by bike, so 2.0 still tells them apart.)
  const limit = kind === 'bike' ? 2.0 : 1.7;
  check(`${kind} station to the Kerk over the Museumeiland bridge`, via && l < crow * limit, `${l.toFixed(0)} m (crow ${crow.toFixed(0)}), via bridge ${!!via}`);
}
process.exit(bad ? 1 : 0);
