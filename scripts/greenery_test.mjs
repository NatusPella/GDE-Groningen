// Trees and green (docs/PROVINCIE-PLAN.md 2.15):
//   node scripts/greenery_test.mjs
// - species: OSM tags first, else the rules (water, church, wood, street,
//   a row one species), the Japanese cherry among them in pink;
// - heights: mature street trees 12-20 m, poplars over 20, cherries low;
//   crown shapes that differ (columnar poplar, conical pine, wide plane);
// - filling a wood: deterministic, spaced, nothing on a way;
// - the map: every tree with a species and height, woods filled, none on a
//   way, in a building or in water (scripts/world/greenery.mjs audit), and
//   the tiles carry them; the trunks are props of the right size.
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const GR = await import('../game/js/greenery.js');
const GM = await import('./world/greenery.mjs');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const S = GR.SPECIES_INDEX;

// species
ok(GR.speciesFromTags({ species: 'Tilia cordata' }) === S.linde && GR.speciesFromTags({ genus: 'Platanus' }) === S.plataan, 'species from OSM species and genus');
ok(GR.speciesFromTags({ leaf_type: 'needleleaved' }) === S.den, 'needleleaved: a pine');
ok(GR.speciesFromTags({ 'species:nl': 'Japanse sierkers' }) === -1 && GR.speciesFromTags({ genus: 'Prunus' }) === S.kers, 'Prunus: the ornamental cherry');
ok(GR.speciesFor({ water: 2 }, 0.1) === S.wilg, 'a willow at the water');
ok(GR.speciesFor({ church: true, water: 99 }, 0.2) === S.linde, 'a lime by the church');
const forest = new Set(); for (let i = 0; i < 200; i++) forest.add(GR.speciesFor({ place: 'forest', water: 99 }, i / 200));
ok(forest.has(S.beuk) && forest.has(S.eik) && forest.has(S.den) && !forest.has(S.kers), 'a wood: beech, oak, pine, no cherry', [...forest].map((i) => GR.SPECIES[i].id).join(','));
const street = new Set(); for (let i = 0; i < 400; i++) street.add(GR.speciesFor({ place: 'street', water: 99 }, i / 400));
ok(street.size >= 6 && street.has(S.kers), 'street trees vary, a cherry among them', [...street].map((i) => GR.SPECIES[i].id).join(','));
ok(GR.speciesFor({ water: 99, rowSeed: 0.42 }, 0.1) === GR.speciesFor({ water: 99, rowSeed: 0.42 }, 0.9), 'a row is one species');
ok(GR.SPECIES[S.kers].color === 0xe58fb4, 'the cherry blooms pink');

// heights and shapes
for (const sp of [S.linde, S.plataan, S.esdoorn, S.eik]) {
  const lo = GR.heightFor(sp, 0) / 10, hi = GR.heightFor(sp, 1) / 10;
  ok(lo >= 12 && hi <= 22, `${GR.SPECIES[sp].id}: mature street tree height`, `${lo}-${hi} m`);
}
ok(GR.heightFor(S.populier, 0.5) / 10 > 20 && GR.heightFor(S.kers, 0.5) / 10 < 10, 'poplars tall, cherries low');
const dims = (sp) => ({ ...GR.treeDims([10.3, 20.7, sp, GR.heightFor(sp, 0.5), 0]) });
const pop = dims(S.populier), pine = dims(S.den), plane = dims(S.plataan), lime = dims(S.linde);
ok(pop.ry > pop.r * 2.5, 'a poplar is columnar', `${pop.r.toFixed(1)} x ${pop.ry.toFixed(1)}`);
ok(pine.cone && !lime.cone, 'a pine is a cone');
ok(plane.r > lime.r * 1.15 && plane.ry < plane.r, 'a plane is wide', `${plane.r.toFixed(1)} vs ${lime.r.toFixed(1)}`);
ok(Math.abs(lime.trunkH + lime.ry * 2 - lime.h) < lime.h * 0.25, 'crown top near the tree height', `${(lime.trunkH + lime.ry * 2).toFixed(1)} of ${lime.h}`);
const bare = GR.treeDims([5, 5]);
ok(bare.sp === S.linde && bare.h >= 14 && bare.h <= 20, 'a bare [x, y] is a lime (older maps)');

// filling
const square = [[0, 0], [200, 0], [200, 200], [0, 200]];
const a = GR.fillPolygon(square, { spacing: 9, keep: (x) => x > 20 });
const b = GR.fillPolygon(square, { spacing: 9, keep: (x) => x > 20 });
ok(a.length > 300 && a.length < 600 && JSON.stringify(a) === JSON.stringify(b), 'a wood filled, the same twice', a.length);
ok(a.every(([x]) => x > 20), 'keep() is honoured');
let close = 0;
for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (Math.hypot(a[i][0] - a[j][0], a[i][1] - a[j][1]) < 1.7) close++;
ok(close === 0, 'filled trees not on top of each other', close);
const rows = GR.findRows([[0, 0], [8, 0], [16, 0.2], [24, 0], [32, -0.1], [40, 0], [100, 100], [103, 109]]);
ok(rows[0] >= 0 && rows.slice(0, 6).every((r) => r === rows[0]) && rows[6] === -1, 'a row of six found, a pair is no row');

// the map
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
ok(data.trees.every((t) => t.length === 5 && GR.SPECIES[t[2]] && t[3] > 30), 'every tree has a species and a height');
const filled = data.trees.filter((t) => t[4] & GR.TREE_FLAG.fill).length;
ok(filled > 5000, 'woods filled', filled);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const rep = GM.audit(map, map.trees);
ok(!rep.onRoad && !rep.inBuilding && !rep.inWater, 'no filled tree on a way, in a building or in water', JSON.stringify(rep));
ok(Object.keys(rep.species).length === GR.SPECIES.length, 'every species in the city', Object.keys(rep.species).join(','));
const cl = await GM.gameplayClearings(data);
ok(cl.lines.length >= 15 && !map.trees.some((t) => (t[4] & GR.TREE_FLAG.fill) && GM.inClearing(cl, t[0], t[1])), 'the minigame courses and spots stay clear');
// trunk props
const cherry = map.trees.find((t) => t[2] === S.kers), plane2 = map.trees.find((t) => t[2] === S.plataan && t[3] > 180);
ok(cherry && plane2 && GR.treeDims(cherry).tr < GR.treeDims(plane2).tr, 'a cherry has a thinner trunk than a big plane');
console.log(`city: ${rep.trees} trees, ${rep.fill} filled; ${Object.entries(rep.species).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);

console.log(`${n - fails}/${n} greenery checks passed`);
process.exit(fails ? 1 : 0);
