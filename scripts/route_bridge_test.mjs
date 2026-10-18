// A walker near the Hereweg viaduct crosses the tracks over it (two-way, with a
// z profile) instead of walking round via the Emmaviaduct (#119); and a route
// that ends where you stand is left empty.
//   node scripts/route_bridge_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const R = await import('../game/js/routing.js');
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const len = (p) => p.reduce((s, q, i) => s + (i ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
let bad = 0;
const check = (name, ok, info) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${info}`); };
for (const kind of ['walk']) {
  const r = R.planLandRoute(map, kind, [420, 985], [430, 940]);
  const l = r ? len(r.pts) : Infinity;
  check(`${kind} over the Hereweg viaduct`, l < 200, `${l.toFixed(0)} m for 46 m as the crow flies`);
}
process.exit(bad ? 1 : 0);
