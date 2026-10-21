// Bomen op of tegen de rijbaan (#324, #334): een boom op de band of in de rijbaan wordt naast de weg gezet, of verdwijnt
// als daar geen plek voor is (treeclear.js). Eerst op een kleine kaart met bekende uitkomsten, dan op de stadstegels van een
// gebouwde wereld (game/world of GAME_WORLD; zonder die: alleen het eerste deel).
import './node3d.mjs';
import assert from 'node:assert/strict';

const { treeBesideRoad, clearTreesFromRoads, TREE_KERB } = await import('../game/js/treeclear.js');

// een weg van 6,5 m breed langs y = 0 (x van -50 tot 50), een huis aan de noordkant, 0,65 m van de band
const road = { cat: 'normal', width: 6.5, pts: [[-50, 0], [50, 0]], bounds: [-50, -3.25, 50, 3.25] };
const house = { pts: [[-4, -6], [4, -6], [4, -3.9], [-4, -3.9]], bounds: [-4, -6, 4, -3.9] };
const map = { roadsNear: () => [road], buildingsNear: () => [house], waterNear: () => [], waterGrid: null, meta: {} };
const near = (a, b) => Math.abs(a - b) < 1e-6;

// vrij: blijft staan
assert.deepEqual(treeBesideRoad(map, 20, 6), [20, 6]);
// op de band (0,1 m buiten de rand): naar 0,7 m buiten de rand, dwars op de weg
let p = treeBesideRoad(map, 20, 3.35);
assert.ok(p && near(p[0], 20) && p[1] > 3.25 + TREE_KERB - 0.01 && p[1] < 3.25 + TREE_KERB + 0.1, 'een boom op de band gaat naar de berm: ' + p);
// in de rijbaan (1 m van het midden): aan de dichtstbijzijnde kant naast de weg
p = treeBesideRoad(map, 30, 1.2);
assert.ok(p && p[1] > 3.9 && p[1] < 4.1, 'een boom in de rijbaan gaat naar de dichtstbijzijnde kant: ' + p);
p = treeBesideRoad(map, 30, -1.2);
assert.ok(p && p[1] < -3.9 && p[1] > -4.1, 'en aan de andere kant: ' + p);
// midden op de weg: weg
assert.equal(treeBesideRoad(map, 30, 0.1), null);
// de berm is een huis: weg
assert.equal(treeBesideRoad(map, 0, -3.3), null);
// een brug of een weg met hoogteprofiel telt niet
const viaduct = { ...road, z: [5, 5], bridge: true };
assert.deepEqual(treeBesideRoad({ ...map, roadsNear: () => [viaduct] }, 20, 0.5), [20, 0.5]);
// de rij
const rows = [[10, 3.3, 1, 100, 0], [10, 8, 1, 100, 0], [10, 0.05, 1, 100, 0]];
const stats = { moved: 0, removed: 0 };
const kept = clearTreesFromRoads(map, rows, stats);
assert.equal(kept.length, 2);
assert.deepEqual(stats, { moved: 1, removed: 1 });
assert.ok(kept[0][1] > 3.9 && kept[0][2] === 1 && kept[0][3] === 100, 'soort en hoogte blijven');

// de stad
const { heeftWereld, laadStadTegels } = await import('./lib/stadtegels.mjs');
if (!heeftWereld()) { console.log('treeclear_test: ok (alleen de kleine kaart; geen game/world voor de stad)'); process.exit(0); }
const city = (await laadStadTegels()).world;
assert.ok(city.treeClearStats.moved > 100 && city.treeClearStats.moved < 1500, 'verschoven: ' + city.treeClearStats.moved);
assert.ok(city.treeClearStats.removed < 200, 'verwijderd: ' + city.treeClearStats.removed);
let bad = 0, narrow = 0, n = 0;
const seen = new Set();
for (const arr of city.treeGrid.map.values()) {
  for (const t of arr) {
    if (seen.has(t)) continue;
    seen.add(t); n++;
    for (const r of city.roadsNear(t[0], t[1], 4)) {
      if (!['major', 'normal', 'minor', 'service'].includes(r.cat) || r.bridge || r.z) continue;
      let d = Infinity;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
        const u = Math.max(0, Math.min(1, ((t[0] - a[0]) * dx + (t[1] - a[1]) * dy) / L2));
        d = Math.min(d, Math.hypot(a[0] + dx * u - t[0], a[1] + dy * u - t[1]));
      }
      // (een boom naast de weg waar geen berm voor is, zoals in een smalle middenberm, blijft staan: die telt als 'smal')
      if (d - r.width / 2 < 0.05) { bad++; break; }
      if (d - r.width / 2 < TREE_KERB - 0.15) { narrow++; break; }
    }
  }
}
assert.equal(bad, 0, `${bad} van ${n} bomen staan nog op een rijbaan`);
assert.ok(narrow < n * 0.002, `${narrow} bomen staan tegen een rijbaan zonder dat er een berm voor is`);
console.log(`treeclear_test: ok (${n} bomen in de stad, ${city.treeClearStats.moved} naast de weg gezet, ${city.treeClearStats.removed} verwijderd, geen boom meer op de rijbaan, ${narrow} in een smalle berm)`);
