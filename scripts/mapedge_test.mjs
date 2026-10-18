// Names beyond the edge of the province and the neighbour villages on the maps (#237):
// game/js/mapedge.js, regions.js (border lines in the colours of mapstyle) and the
// data file game/borderplaces.json.   node scripts/mapedge_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { edgeLabels, neighbourPlaces, neighbourVisible, pickNeighbours } from '../game/js/mapedge.js';
import { regionEdgeLabels, regionAt, REGIONS } from '../game/js/regions.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0, fails = 0;
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra !== undefined ? JSON.stringify(extra) : ''); } };

// a toy province: x < 0 is Friesland, 0..1000 Groningen, x > 1000 Duitsland, y > 800 the Noordzee
const region = (x, y) => {
  const id = y > 800 ? 'noordzee' : x < 0 ? 'friesland' : x > 1000 ? 'duitsland' : 'groningen';
  return { id, name: REGIONS[id].name, land: REGIONS[id].land };
};
const edges = {
  border: [{ kind: 'friesland', pts: [[0, 0], [0, 300], [0, 600]] }, { kind: 'duitsland', pts: [[1000, 0], [1000, 400], [1000, 700]] }],
  coast: [[0, 800], [500, 800], [1000, 800]],
};

// a border in view gets its region's name outside it
{
  const L = edgeLabels(edges, [-200, 200, 400, 500], region, 100);
  ok(L.length === 1 && L[0].id === 'friesland' && L[0].x < 0 && L[0].name === 'Friesland' && L[0].land, 'west border: Friesland, outside the line', L);
  ok(L[0].y >= 200 && L[0].y <= 500, 'the label stays in the window');
  const e = edgeLabels(edges, [700, 100, 1300, 500], region, 100);
  ok(e.length === 1 && e[0].id === 'duitsland' && e[0].x > 1000, 'east border: Duitsland', e);
  ok(edgeLabels(edges, [200, 100, 700, 500], region, 100).length === 0, 'a window inside the province has no edge labels');
  ok(edgeLabels(edges, [-60, -50, 40, 50], region, 100).length === 0, 'no room outside the window: no label');
  const s = edgeLabels(edges, [300, 500, 700, 1000], region, 100);
  ok(s.some((l) => l.id === 'noordzee' && !l.land && l.y > 800), 'the coast in view names the sea', s);
  const both = edgeLabels(edges, [-300, -100, 1300, 700], region, 100);
  ok(new Set(both.map((l) => l.id)).size === both.length, 'one label per region', both);
}
// the real regions (regions.js without province data uses its fallback outline): every label lies on the right side
{
  const w = wgsToWorld(53.1, 6.35);
  const L = regionEdgeLabels(w[0] - 12000, w[1] - 12000, w[0] + 12000, w[1] + 12000, 1500);
  ok(L.every((l) => regionAt(l.x, l.y).id === l.id && l.id !== 'groningen'), 'real map: each label lies in its own region and outside Groningen', L.map((l) => l.id));
}

// neighbour villages: only outside the province, on land
{
  const toWorld = (la, lo) => [lo, la]; // the toy map takes lat/lon as y/x
  const rows = [['Binnen', 'village', 500, 500], ['Westerdorp', 'village', 300, -400], ['Oostdorp', 'town', 200, 1500], ['Zee', 'village', 900, 500], ['Kapot', 'village'], 'nope', ['NaN', 'village', NaN, 1]];
  const p = neighbourPlaces(rows, toWorld, region);
  ok(p.map((q) => q.name).join() === 'Westerdorp,Oostdorp', 'inside, at sea and broken rows are dropped', p);
  ok(p[0].region === 'friesland' && p[1].region === 'duitsland', 'the region is recorded');
  ok(neighbourPlaces(null, toWorld, region).length === 0, 'no rows, no places');
  ok(neighbourVisible({ kind: 'town' }, 0) && !neighbourVisible({ kind: 'village' }, 0.5) && neighbourVisible({ kind: 'village' }, 0.8), 'towns always, villages from zoom 0.8');
  const win = [-1000, 0, 2000, 1000];
  const many = [['A', 'village', 100, -400], ['B', 'village', 150, -450], ['C', 'town', 100, -380], ['D', 'village', 800, 1700]].map((r) => ({ name: r[0], kind: r[1], x: r[3], y: r[2], region: 'x' }));
  const pick = pickNeighbours(many, win, [], { gap: 100, zoom: 1 });
  ok(pick[0].name === 'C', 'towns first', pick.map((q) => q.name));
  ok(!pick.some((q) => q.name === 'A' || q.name === 'B') || pick.filter((q) => q.name === 'A' || q.name === 'B').length === 1, 'two labels closer than the gap: one stays');
  ok(pickNeighbours(many, win, [[1700, 800]], { gap: 100 }).every((q) => q.name !== 'D'), 'a taken spot keeps its label clear');
  ok(pickNeighbours(many, [0, 0, 10, 10], []).length === 0 && pickNeighbours(many, win, [], { max: 1 }).length === 1, 'window and maximum');
}

// the data file: names and positions only, from the strip round the province
{
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'borderplaces.json');
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(Array.isArray(rows) && rows.length > 300 && rows.length < 3000, 'borderplaces.json is a small list', rows.length);
  ok(rows.every((r) => Array.isArray(r) && r.length === 4 && typeof r[0] === 'string' && ['city', 'town', 'village'].includes(r[1]) && r[2] > 52.5 && r[2] < 53.8 && r[3] > 5.7 && r[3] < 7.9), 'every row is [name, kind, lat, lon] in the strip');
  ok(new Set(rows.map((r) => r[0])).size === rows.length, 'one row per name');
  const outside = neighbourPlaces(rows, wgsToWorld, regionAt);
  ok(outside.length > 50, 'most of them lie outside the province', outside.length);
  const kinds = new Set(outside.map((q) => q.region));
  ok(['friesland', 'drenthe', 'duitsland'].every((k) => kinds.has(k)), 'all three neighbours are covered', [...kinds]);
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
