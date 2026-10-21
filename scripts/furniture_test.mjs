// Street furniture (docs/PROVINCIE-PLAN.md 2.14):
//   node scripts/furniture_test.mjs
// - the rules on a made-up dual carriageway with an exit: guardrails on both
//   sides at street level, open where the slip road leaves, none on a
//   carriageway, hectometre posts on the right every 100 m, a gantry before
//   the exit that signs real places; lamps by road class;
// - two neighbouring tiles: no item twice, the guardrail carries on over
//   the tile edge; the same input gives the same items;
// - OSM rows (mappedFromOsm) and colliders;
// - the map: every tile's furniture (scripts/world/furniture.mjs audit) and
//   the drawn layer in Node (streetfurniture3d.js).
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const SF = await import('../game/js/streetfurniture.js');
const FA = await import('./world/furniture.mjs');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const line = (x0, x1, y, step = 25) => { const P = [], n = Math.round((x1 - x0) / step); for (let k = 0; k <= n; k++) P.push([x0 + k * step, y]); return P; };

// a dual carriageway along x (eastbound at y = 6, westbound at y = -6; y
// points south, so the right of eastbound is +y), an exit off the eastbound
const east = { pts: line(-1000, 2000, 6), type: 'motorway', cat: 'major', width: 7.5, oneway: true, ref: 'A7' };
const west = { pts: line(2000, -1000, -6, -25), type: 'motorway', cat: 'major', width: 7.5, oneway: true, ref: 'A7' };
const exit = { pts: [[600, 6], [650, 12], [700, 22], [760, 40]], type: 'motorway_link', cat: 'major', width: 4.5, oneway: true };
const roads = [east, west, exit];
const tileA = SF.furnitureForTile({ x0: 0, y0: -500, size: 1000, roads, opts: {} });
const tileB = SF.furnitureForTile({ x0: 1000, y0: -500, size: 1000, roads, opts: {} });
const rails = tileA.items.filter((it) => it.k === 'guardrail');
ok(rails.length > 300, 'guardrails along the carriageways', rails.length);
ok(rails.some((it) => it.y > 6 + 3.75) && rails.some((it) => it.y < 6 - 3.75 && it.y > -6 + 3.75), 'verge and central reserve of the eastbound', '');
ok(!rails.some((it) => Math.abs(it.x - 600) < 12 && it.y > 6 && it.y < 15), 'open where the slip road leaves');
ok(rails.every((it) => Math.abs(it.y - 6) > 3.75 + 0.3 && Math.abs(it.y + 6) > 3.75 + 0.3 || it.x > 600), 'no guardrail on a carriageway');
const hm = tileA.items.filter((it) => it.k === 'hectometer');
ok(hm.length >= 15 && hm.length <= 25, 'hectometre posts every 100 m each way', hm.length);
ok(hm.filter((it) => it.y > 6).every((it) => it.y > 6 + 3.75), 'eastbound posts on the right verge');
ok(hm.every((it) => /^\d+,\d$/.test(it.text)), 'hectometre numbers like 12,4', hm[0] && hm[0].text);
const g = tileA.items.filter((it) => it.k === 'gantry');
ok(g.length === 1 && Math.abs(g[0].x - (600 - SF.RULES.gantryBefore)) < 1, 'one gantry before the exit', g.map((q) => q.x.toFixed(0)).join(', '));
const places = new Set(SF.DESTINATIONS.map((p) => p.n).concat('Centrum'));
ok(g.length && g[0].text.length === 2 && g[0].text.every((t) => [...places].some((p) => t.endsWith(p))), 'gantry signs real places', g[0] && g[0].text.join(' / '));
// province places (worldplaces.js): a gantry signs towns of the data, far ones are left out
const WP = await import('../game/js/worldplaces.js');
ok(WP.worldSignPlaces() === null, 'no province places before they are set');
WP.setWorldPlaces([
  { name: 'Oostdorp', kind: 'town', x: 12000, y: 0 }, { name: 'Westdorp', kind: 'town', x: -12000, y: 0 },
  { name: 'Verweg', kind: 'city', x: 90000, y: 0 }, { name: 'Gehucht', kind: 'hamlet', x: 20000, y: 100 },
]);
const sp = WP.worldSignPlaces();
ok(sp && sp.length === 3, 'cities and towns are sign places', sp && sp.length);
const gp = SF.furnitureForTile({ x0: 0, y0: -500, size: 1000, roads, places: sp, opts: {} }).items.filter((it) => it.k === 'gantry');
ok(gp.length === 1 && gp[0].text[0].endsWith('Oostdorp') && !gp[0].text.join().includes('Verweg') && !gp[0].text.join().includes('Gehucht'), 'gantry signs a town of the province', gp[0] && gp[0].text.join(' / '));
WP.setWorldPlaces([]);
ok(g.length && g[0].text[0].startsWith('A7 '), 'the way on carries the road number', g[0] && g[0].text[0]);
// tiles
const keysA = new Set(tileA.items.map((it) => it.key));
ok(tileB.items.every((it) => !keysA.has(it.key)), 'no item in two tiles');
const edgeA = rails.filter((it) => it.x > 990 && it.y > 6).sort((a, b) => b.x - a.x)[0];
const edgeB = tileB.items.filter((it) => it.k === 'guardrail' && it.x < 1010 && it.y > 6).sort((a, b) => a.x - b.x)[0];
ok(edgeA && edgeB && edgeB.x - edgeB.s / 2 - (edgeA.x + edgeA.s / 2) < 0.6, 'the guardrail carries on over the tile edge', edgeA && edgeB ? (edgeB.x - edgeB.s / 2 - (edgeA.x + edgeA.s / 2)).toFixed(2) : '');
const again = SF.furnitureForTile({ x0: 0, y0: -500, size: 1000, roads: roads.slice().reverse(), opts: {} });
ok(again.items.length === tileA.items.length && again.items.every((it, i) => it.key === tileA.items[i].key), 'the same items whatever the road order');
// colliders
const cs = tileA.colliders;
ok(cs.filter((c) => c.kind === 'vangrail').length === rails.length, 'every guardrail section is a breakable barrier');
ok(cs.filter((c) => c.kind === 'mast').length === 2 * g.length, 'gantry posts are solid');
// lamps by class
const lamps = SF.furnitureForTile({ x0: 0, y0: -500, size: 1000, roads: [{ pts: line(0, 990, 100), type: 'residential', cat: 'minor', width: 5 }], opts: { lamps: true } }).items.filter((it) => it.k === 'lamp');
ok(lamps.length >= 30 && lamps.every((l) => l.v === 'lantern'), 'lanterns along a residential street', lamps.length);
ok(SF.lampRule({ type: 'motorway' }).v === 'mast' && SF.lampRule({ type: 'cycleway', cat: 'cycle' }).v === 'path', 'lamp types by class');
// OSM rows
const rows = SF.mappedFromOsm([
  { type: 'way', id: 1, tags: { barrier: 'guard_rail' }, geometry: [{ lat: 53.22, lon: 6.56 }, { lat: 53.2201, lon: 6.5605 }] },
  { type: 'node', id: 2, lat: 53.22, lon: 6.57, tags: { traffic_calming: 'table' } },
  { type: 'node', id: 3, lat: 53.22, lon: 6.57, tags: { amenity: 'bench' } },
  { type: 'way', id: 4, tags: { barrier: 'wall', wall: 'noise_barrier', height: '5' }, geometry: [{ lat: 53.22, lon: 6.56 }, { lat: 53.221, lon: 6.56 }] },
  { type: 'node', id: 5, lat: 53.22, lon: 6.57, tags: { shop: 'bakery' } },
]);
ok(rows.length === 4 && rows.find((r) => r.k === 'noise_barrier').h === 5, 'OSM rows', JSON.stringify(rows.map((r) => r.k)));

// a mapped hedge is a row only where asked (the province); the city keeps its own
const hedgeEl = { type: 'way', id: 9, tags: { barrier: 'hedge' }, geometry: [{ lat: 53.22, lon: 6.56 }, { lat: 53.2201, lon: 6.5605 }] };
ok(SF.mappedFromOsm([hedgeEl]).length === 0 && SF.mappedFromOsm([hedgeEl], { hedges: true }).map((r) => r.k).join() === 'hedge', 'barrier=hedge is a row for the province only');

// the map
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData({ extras: false });
ok(Array.isArray(data.furniture) && data.furniture.length > 0, 'mapped furniture in the map', data.furniture && data.furniture.length);
const rep = FA.audit(data);
ok(rep.counts.guardrail > 5000 && rep.counts.gantry > 10 && rep.counts.hectometer > 50, 'guardrails, gantries and hectometre posts on the city map', JSON.stringify(rep.counts));
ok(!rep.onRoad.length, 'nothing on a carriageway', rep.onRoad.slice(0, 3).map((q) => `${q.k} ${q.at}`).join('; '));
ok(!rep.dup && rep.determinism, 'one item per key; deterministic');
console.log(`city: ${Object.entries(rep.counts).map(([k, v]) => `${k} ${v}`).join(', ')}; guardrail holes under 5 m: ${rep.gaps.length}`);
// the drawn layer in Node
const THREE = await import('three');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const F3 = await import('../game/js/streetfurniture3d.js');
const scene = new THREE.Scene();
F3.initStreetFurniture3D(scene, map);
const gantry = rep.counts.gantry ? FA.generateAll(data).flatMap((t) => t.items).find((it) => it.k === 'gantry') : null;
F3.updateStreetFurniture3D(gantry.x, gantry.y, true);
const st = F3.furnitureStats();
ok(st.drawn > 50 && st.kinds >= 3 && st.kinds <= 10, 'drawn: a handful of instanced meshes', JSON.stringify(st));

// a mapped fence is not drawn over the track, a footway or a house (#124)
{
  const SF = await import('../game/js/streetfurniture.js');
  const fence = { k: 'fence', pts: [[10, 500], [990, 500]] };
  const base = { x0: 0, y0: 0, size: 1000, roads: [], mapped: [fence], water: [], opts: { towns: [] } };
  const count = (extra) => SF.furnitureForTile({ ...base, ...extra }).items.filter((i) => i.k === 'fence').length;
  const free = count({});
  ok(free > 300, 'a free fence is 3 m pieces all along', String(free));
  const rail = count({ rails: [{ pts: [[500, 400], [500, 600]] }] });
  ok(rail < free && free - rail >= 1 && free - rail <= 4, 'the pieces on a track are left out', free + ' vs ' + rail);
  const foot = count({ roads: [{ cat: 'foot', width: 2, pts: [[300, 400], [300, 600]], name: '', type: 'footway' }] });
  ok(foot < free && free - foot <= 3, 'and on a footway', free + ' vs ' + foot);
  const house = count({ buildings: [{ pts: [[600, 490], [640, 490], [640, 510], [600, 510]] }] });
  ok(house < free && free - house >= 10, 'and in a house', free + ' vs ' + house);
  const past = count({ rails: [{ pts: [[500, 560], [500, 700]] }] });
  ok(past === free, 'a track that does not touch the fence leaves it whole', free + ' vs ' + past);
}

console.log(`${n - fails}/${n} furniture checks passed`);
process.exit(fails ? 1 : 0);
