// De pack-bouw zet bomen die op of tegen de rijbaan staan naast de weg (#324, scripts/world/tegel_schoon.mjs). Eerst op
// een kleine kaart met bekende uitkomsten, dan op de rijen van alle tegels van een gebouwde wereld (game/world of
// GAME_WORLD; zonder die: alleen het eerste deel): de bomen van de tegels, door clearPackTrees gehaald, staan op geen
// enkele rijbaan meer.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearPackTrees } from './world/tegel_schoon.mjs';
import { heeftTegels, leesTegelRijen, wegRaster } from './lib/tegelrijen.mjs';

const road = { kind: 'roads', row: { cat: 'normal', width: 6.5, pts: [[-50, 0], [50, 0]] } };
const viaduct = { kind: 'roads', row: { cat: 'major', width: 8, pts: [[-50, 20], [50, 20]], bridge: true, z: [5, 5] } };
const house = { kind: 'buildings', row: { pts: [[-4, -6], [4, -6], [4, -3.9], [-4, -3.9], [-4, -6]] } };
const tree = (x, y) => ({ kind: 'trees', row: [x, y] });
const feats = [road, viaduct, house, tree(20, 6), tree(20, 3.35), tree(30, 1.2), tree(30, 0.1), tree(0, -3.3), tree(10, 20.5)];
const st = { moved: 0, removed: 0 };
const out = clearPackTrees(feats, st);
const trees = out.filter((f) => f.kind === 'trees').map((f) => f.row);
assert.equal(st.removed, 2, 'midden op de weg en tegen het huis gaan weg');
assert.equal(st.moved, 2, 'twee bomen gaan naar de berm');
assert.deepEqual(trees[0], [20, 6], 'een vrije boom blijft staan');
assert.ok(trees[1][1] > 3.9 && trees[1][1] < 4.1, 'de boom op de band gaat 0,7 m buiten de rand: ' + trees[1]);
assert.ok(trees[2][1] > 3.9 && trees[2][1] < 4.1, 'de boom in de rijbaan gaat naar de dichtstbijzijnde kant: ' + trees[2]);
assert.deepEqual(trees[3], [10, 20.5], 'een boom onder een viaduct blijft staan');
assert.equal(out.filter((f) => f.kind !== 'trees').length, 3, 'de andere features blijven');
assert.equal(clearPackTrees([road], st).length, 1, 'zonder bomen verandert er niets');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.env.GAME_WORLD || path.join(ROOT, 'game', 'world'));
if (!heeftTegels(dir)) { console.log('tegel_schoon_test: ok (alleen de kleine kaart; geen wereld in ' + dir + ')'); process.exit(0); }
const rows = await leesTegelRijen(dir);
const before = wegRaster(rows.roads);
const nOn = (list) => list.filter((t) => { const e = before(t.x, t.y); return e && e.m < 0.05; }).length;
const feat2 = [
  ...rows.roads.map((r) => ({ kind: 'roads', row: r })),
  ...rows.buildings.map((r) => ({ kind: 'buildings', row: r })),
  ...rows.water.map((r) => ({ kind: 'water', row: r })),
  ...rows.trees.map((t) => ({ kind: 'trees', row: [t.x, t.y] })),
];
const sw = { moved: 0, removed: 0 };
const cleared = clearPackTrees(feat2, sw).filter((f) => f.kind === 'trees').map((f) => ({ x: f.row[0], y: f.row[1] }));
const onBefore = nOn(rows.trees), onAfter = nOn(cleared);
assert.ok(cleared.length + sw.removed === rows.trees.length, 'elke boom blijft of is geteld');
assert.ok(onAfter <= Math.max(3, onBefore * 0.01), `na het schonen staan ${onAfter} van ${cleared.length} bomen op een rijbaan (ervoor ${onBefore})`);
assert.ok(sw.removed < rows.trees.length * 0.002, `${sw.removed} bomen verdwenen`);
console.log(`tegel_schoon_test: ok (${rows.trees.length} bomen: ${onBefore} op een rijbaan, na het schonen ${onAfter}; ${sw.moved} verplaatst, ${sw.removed} verdwenen)`);
