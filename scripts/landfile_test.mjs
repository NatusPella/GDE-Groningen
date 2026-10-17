// What the country is made of now that the province's tiles are the one system
// outside the city (issue #3): the land file of the tile build (rails, the city's
// routes carried on, turbines, pylons) and the queries over the streamed tiles
// that replaced the old Ommeland layers (water gap, built-up share, the cover).
// Needs game/world (desktop stage, or pack_tiles + build_corridor + build_province).
//   node scripts/landfile_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const G = await import('../game/js/gdt.js');
const TP = await import('../game/js/tileplace.js');
const PW = await import('../game/js/provinceworld.js');
const WP = await import('../game/js/worldplaces.js');
const CR = await import('../game/js/corridorrail.js');
const FP = await import('../game/js/farprops.js');

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

// --- the land file
const land = T.land;
ok(!!land, 'the province layer names a land file');
if (land) {
  ok(land.routes.length >= 6 && land.routes.every((r) => r.pts.length > 100 && r.stops.length >= 1), `the city's routes are baked (${land.routes.length})`);
  const stops = new Set(land.routes.flatMap((r) => r.stops.filter((q) => !q.offmap).map((q) => q.name)));
  for (const s of ['Bedum', 'Stedum', 'Loppersum', 'Delfzijl', 'Sauwerd', 'Winsum', 'Kropswolde', 'Winschoten', 'Veendam']) ok(stops.has(s), `a train stops at ${s}`);
  ok(land.stations.length >= 20, `the stations are there (${land.stations.length})`);
  ok(land.rails.length > 100 && land.rails.every((P) => P.length >= 4 && P.length % 2 === 0), `the track is there (${land.rails.length} ways)`);
  ok(land.turbines.length > 200 && land.turbines.every((t) => t.length === 3 && t[2] > 10), `wind turbines (${land.turbines.length})`);
  ok(land.pylons.length > 500 && land.spans.length > 300 && land.spans.every(([i, j]) => land.pylons[i] && land.pylons[j]), `pylons and spans (${land.pylons.length}, ${land.spans.length})`);
  // the city draws its own track: no way of the country's lies on it
  const city = [];
  for (const r of map.rails) for (let i = 0; i < r.pts.length - 1; i++) city.push(r.pts[i], r.pts[i + 1]);
  const near = (x, y) => { for (let i = 0; i < city.length; i += 2) { const a = city[i], b = city[i + 1]; const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))); if (Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) < 2) return true; } return false; };
  const doubled = land.rails.filter((P) => near(P[0], P[1]) || near(P[P.length - 2], P[P.length - 1])).length;
  ok(doubled === 0, `no country track lies on the city's (${doubled})`);

  // the routes spliced onto the city's
  const before = (map.railRoutes || []).length;
  CR.applyCityRoutes(map, land);
  const names = map.railRoutes.map((r) => r.name);
  for (const nm of ['Stoptrein Delfzijl', 'Stoptrein Roodeschool', 'Stoptrein Winschoten', 'Intercity Zwolle']) ok(names.includes(nm), `route ${nm}`);
  ok(map.railRoutes.length >= before, 'no route lost');
  for (const r of map.railRoutes) for (let i = 1; i < r.stops.length; i++) if (!(r.stops[i].s > r.stops[i - 1].s)) ok(false, `${r.name}: stops out of order`);
  ok(map.countryStations.some((s) => s.name === 'Loppersum') && map.countryRails.length === land.rails.length, 'the stations and the track are on the map');

  // turbines and pylons: the solids at their feet
  FP.setFarProps(land);
  const t = land.turbines[Math.floor(land.turbines.length / 2)];
  ok(FP.farSolidsNear(t[0], t[1], 1).length >= 1, 'a turbine is solid at its foot');
  ok(FP.farSolidsNear(t[0] + 40, t[1] + 40, 1).filter((s) => Math.hypot(s.x - t[0], s.y - t[1]) < 1).length === 0, 'and not 55 m from it');
  const w = FP.farPropsIn(t[0] - 50, t[1] - 50, t[0] + 50, t[1] + 50);
  ok(w.turbines.length >= 1, 'a window finds it for the maps');
}

// --- the cover: where a built province tile is the one source
{
  const cover = PW.tileCoverOf(T.index);
  const own = Object.values(T.index.tiles).find((q) => q.flags & PW.PFLAG.PROVINCE && q.flags & PW.PFLAG.BUILT);
  const [ox, oy] = G.tileOrigin(own.i, own.j);
  ok(cover(ox + 500, oy + 500), 'the middle of a built province tile is covered');
  ok(PW.coveredByTiles(ox + 500, oy + 500), 'coveredByTiles agrees');
  ok(!cover(-90000, 0) && PW.inProvinceData(-90000, 0) === false, 'far outside is not covered');
}

// --- the queries on the streamed tiles
{
  const bedum = WP.worldPlaceNamed('Bedum');
  ok(!!bedum && Math.hypot(bedum.x, bedum.y) > 5000, 'Bedum is a place of the province');
  await loadArea(T, [bedum.x - 600, bedum.y - 600, bedum.x + 600, bedum.y + 600]);
  const wV = PW.urbanWeight(bedum.x, bedum.y);
  ok(wV > 0.5, `the village is built-up (${wV.toFixed(2)})`);
  // open land: a point 1.5 km out in the fields with the tiles in
  let field = null;
  for (let r = 1200; r < 2600 && !field; r += 200) {
    for (let a = 0; a < 6.28 && !field; a += 0.4) {
      const x = bedum.x + Math.cos(a) * r, y = bedum.y + Math.sin(a) * r;
      if (TP.tilesIn(map, [[x, y]], 120)) continue;
      field = [x, y];
    }
  }
  if (field) {
    await loadArea(T, [field[0] - 150, field[1] - 150, field[0] + 150, field[1] + 150]);
    ok(PW.urbanWeight(field[0], field[1]) < 0.5, `open country is not built-up (${PW.urbanWeight(field[0], field[1]).toFixed(2)})`);
  }
  // the water: a point inside a polygon of the tiles in is positive, its shore is where the sign flips
  let poly = null;
  for (const q of map.waterNear(bedum.x, bedum.y, 900)) if (q.pts.length > 8 && (q.nav !== undefined || q.flat)) { poly = q; break; }
  if (poly) {
    const b = poly.bounds;
    let inside = null;
    for (let i = 0; i < 40 && !inside; i++) {
      const x = b[0] + (b[2] - b[0]) * ((i * 0.618) % 1), y = b[1] + (b[3] - b[1]) * ((i * 0.381) % 1);
      if (TP.waterGap(map, x, y, 3) > 1) inside = [x, y];
    }
    ok(!!inside, 'a point inside water has a positive gap');
    ok(TP.waterGap(map, b[0] - 40, b[1] - 40, 5) < 0, 'beyond the bounds the gap is negative or none');
  }
  ok(TP.waterGap(map, bedum.x, bedum.y, 3) < 0, 'the middle of the village is dry');
}

// --- a village's water uitje (dorpsuitjes.js): its shore is found on the tiles round the station
if (land) {
  const OP = await import('../game/js/ommelandplace.js');
  for (const [name, depth, rMax] of [['Zuidhorn', 18, 1600], ['Kropswolde', 28, 2600]]) {
    const st = land.stations.find((q) => q.name === name);
    ok(!!st, `station ${name}`);
    if (!st) continue;
    const pts = [[st.x, st.y]];
    for (let r = 800; r < rMax + 700; r += 800) {
      for (let k = 0, m = Math.round((r / 800) * 6); k < m; k++) pts.push([st.x + Math.cos((k / m) * Math.PI * 2) * r, st.y + Math.sin((k / m) * Math.PI * 2) * r]);
    }
    const found = await TP.withTiles(map, pts, () => {
      const w = OP.waterNear(map, st.x, st.y, { depth, rMax });
      return w && { w, sh: OP.shoreFrom(map, w.x, w.y, st.x, st.y, 3) };
    }, { radius: 460 });
    ok(!!found && !!found.sh, `${name}: water of ${depth} m found within ${rMax} m and the shore on the way to the station`);
  }
}

console.log(`landfile: ${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
