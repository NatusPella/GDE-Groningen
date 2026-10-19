// Place name boards and junction signposts (issue #73, game/js/placesigns.js):
//   node scripts/placesigns_test.mjs
// on made-up roads and places (no province data): a board where a road enters
// a place on the right of the incoming traffic, none inside a bigger place,
// one-ways only the way they run, a signpost at a three-way junction pointing
// to places by bearing, the same items in whichever tile, nothing on a motorway.
import { placeSignItems, armDestination, ENTRY, entryOf } from '../game/js/placesigns.js';
import { builtUp } from '../game/js/worldplaces.js';
import { furnitureForTile } from '../game/js/streetfurniture.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const line = (x0, y0, x1, y1, step = 25) => { const P = [], k = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step)); for (let i = 0; i <= k; i++) P.push([x0 + (x1 - x0) * i / k, y0 + (y1 - y0) * i / k]); return P; };

const towns = [
  { n: 'Oostdorp', x: 5000, y: 0, kind: 'village' }, { n: 'Westerhoek', x: -6000, y: 0, kind: 'town' },
  { n: 'Zuidstad', x: 0, y: 9000, kind: 'town' }, { n: 'Noordveen', x: 0, y: -3000, kind: 'hamlet' },
];
// an east-west road through Oostdorp, two-way
const rd = { pts: line(3000, 0, 7000, 0), type: 'secondary', cat: 'normal', width: 7 };
const items = placeSignItems({ roads: [rd], towns });
const boards = items.filter((i) => i.k === 'placesign' && !i.end);
const ends = items.filter((i) => i.k === 'placesign' && i.end);
ok(ends.length === 2 && ends.every((b) => b.text[0] === 'Oostdorp'), 'an end-of-built-up-area board for each way out', ends.length);
const wEnd = ends.find((b) => b.x < 5000);
ok(wEnd.y < 0 && Math.abs(Math.abs(wEnd.a) - Math.PI) < 1e-6, 'it stands on the right of the traffic leaving', `${wEnd.y} ${wEnd.a}`);
ok(boards.length === 2, 'a board for each way into the village', boards.length);
const R = ENTRY.village;
ok(boards.every((b) => b.text[0] === 'Oostdorp'), 'the board names the place');
const west = boards.find((b) => b.x < 5000), east = boards.find((b) => b.x > 5000);
ok(Math.abs(west.x - (5000 - R)) < 1 && Math.abs(east.x - (5000 + R)) < 1, 'at the edge of the built-up area', `${west.x} ${east.x}`);
ok(west.y > 0 && east.y < 0, 'on the right of the traffic coming in (y south)', `${west.y} ${east.y}`);
ok(Math.abs(west.a) < 1e-6 && Math.abs(Math.abs(east.a) - Math.PI) < 1e-6, 'facing the oncoming traffic');
// one-way: only the way it runs
const one = placeSignItems({ roads: [{ ...rd, oneway: true }], towns }).filter((i) => i.k === 'placesign');
ok(one.length === 2 && one.filter((b) => !b.end).length === 1 && one.find((b) => !b.end).x < 5000 && one.find((b) => b.end).x > 5000, 'a one-way gets a board only for its own direction', one.length);
// no board on a motorway, a bridge or inside a bigger place
ok(!placeSignItems({ roads: [{ ...rd, type: 'motorway', cat: 'major' }], towns }).some((i) => i.k === 'placesign'), 'none on a motorway');
ok(!placeSignItems({ roads: [{ ...rd, bridge: true }], towns }).some((i) => i.k === 'placesign'), 'none on a bridge');
const inside = placeSignItems({ roads: [{ pts: line(-6000, 0, -3000, 0), type: 'residential', cat: 'minor', width: 5 }], towns: [...towns, { n: 'Binnendorp', x: -5900, y: 0, kind: 'hamlet' }] }).filter((i) => i.k === 'placesign');
ok(!inside.some((i) => i.text[0] === 'Binnendorp') && inside.some((i) => i.text[0] === 'Westerhoek'), 'a hamlet inside a town gets no board of its own', inside.map((i) => i.text[0]).join());
// tiles: each board in exactly one tile, the same whatever the tile order
const tileOf = (x0) => placeSignItems({ roads: [rd], towns, inTile: (x) => x >= x0 && x < x0 + 1000 });
const all = [0, 1, 2, 3, 4, 5, 6].flatMap((i) => tileOf(i * 1000 + 2000).filter((q) => q.k === 'placesign'));
ok(all.length === boards.length + ends.length, 'no board lost or doubled across tiles', all.length);
// a signpost at a T junction at (0, 0): roads west, east and south
const T = [
  { pts: line(-3000, 0, 0, 0), type: 'secondary', cat: 'normal', width: 7 },
  { pts: line(0, 0, 3000, 0), type: 'secondary', cat: 'normal', width: 7 },
  { pts: line(0, 0, 0, 3000), type: 'tertiary', cat: 'normal', width: 6 },
];
const ts = placeSignItems({ roads: T, towns }).filter((i) => i.k === 'wegwijzer');
ok(ts.length === 3, 'a signpost on each arm of a three-way junction', ts.length);
const fromWest = ts.find((s) => s.x < 0 && Math.abs(s.y) < 10);
ok(fromWest && fromWest.text.some((t) => t === '↑ Oostdorp') && fromWest.text.some((t) => t.startsWith('→') && t.includes('Zuidstad')), 'from the west: Oostdorp ahead, Zuidstad right', fromWest && fromWest.text.join(' / '));
ok(fromWest && !fromWest.text.join().includes('Westerhoek'), 'not back the way you came');
const fromSouth = ts.find((s) => s.y > 8);
ok(fromSouth && fromSouth.text.some((t) => t.startsWith('←') && t.includes('Oostdorp')) === false && fromSouth.text.some((t) => t.includes('Westerhoek')), 'from the south both ways are signed', fromSouth && fromSouth.text.join(' / '));
ok(placeSignItems({ roads: T.map((r) => ({ ...r, type: 'motorway', cat: 'major' })), towns }).length === 0, 'no signposts at motorway junctions');
ok(placeSignItems({ roads: T.slice(0, 2), towns }).every((i) => i.k !== 'wegwijzer'), 'no signpost where only two roads meet');
ok(armDestination(0, 0, 1, 0, towns) === 'Oostdorp' && armDestination(0, 0, 0, -1, towns) === 'Noordveen', 'arm destination by bearing');
ok(armDestination(0, 0, 0, 1, [{ n: 'Verweg', x: 0, y: 90000, kind: 'city' }]) === null, 'nothing beyond its reach');
// through furnitureForTile
const fur = furnitureForTile({ x0: 4000, y0: -500, size: 1000, roads: [rd], opts: { towns } });
const fb = fur.items.filter((i) => i.k === 'placesign' && !i.end);
ok(fb.length === 1 && fb[0].x < 5000, 'furnitureForTile only adds them with the places', fb.length);
ok(fur.colliders.some((c) => c.kind === 'paal'), 'the post is solid');
ok(furnitureForTile({ x0: 4000, y0: -500, size: 1000, roads: [rd] }).items.every((i) => i.k !== 'placesign'), 'without places no boards');
const again = furnitureForTile({ x0: 4000, y0: -500, size: 1000, roads: [rd], opts: { towns } });
ok(again.items.map((i) => i.key).join() === fur.items.map((i) => i.key).join(), 'deterministic');
// a place with a measured built-up radius moves its boards to that circle
{
  const big = placeSignItems({ roads: [rd], towns: [{ n: 'Oostdorp', x: 5000, y: 0, kind: 'village', r: 1200 }] }).filter((i) => i.k === 'placesign' && !i.end);
  ok(big.length === 2 && big.every((b) => Math.abs(Math.abs(b.x - 5000) - 1200) < 60), 'a measured radius sets the board distance', big.map((b) => b.x).join());
  ok(entryOf({ kind: 'village', r: 99999 }) === ENTRY.village && entryOf({ kind: 'town' }) === ENTRY.town, 'a silly radius falls back to the kind');
}
ok(builtUp({ kind: 'village', pop: 500 }).r > 250 && builtUp({ kind: 'village', pop: 500 }).r < 400 && builtUp({ kind: 'town', pop: 1e6 }).r === 3200 && builtUp({ kind: 'village' }).r === undefined, 'built-up radius from the population');
console.log(`${n - fails}/${n} place sign checks passed`);
process.exit(fails ? 1 : 0);
