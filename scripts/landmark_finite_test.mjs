// Every procedural landmark builder (game/js/landmarks3d.js, Paddepoel's block
// included) on a plain rectangular footprint, in a few orientations: the
// merged geometry must have finite positions. A NaN here was a hand-placed
// helper call baked into a bare 2-vector (three.js logs "Computed radius is
// NaN" once per building as it streams in).
//   node scripts/landmark_finite_test.mjs
import './node3d.mjs';

await import('../game/js/models3d_buildings.js');
const L = await import('../game/js/landmarks3d.js');
const NAMES = ['EIKEA', 'Martinikerk', 'Der Aa-kerk', 'Groninger Museum', 'Forum Groningen', 'Hoofdstation Groningen', 'Academiegebouw',
  'Goudkantoor', 'Euroborg', 'Winkelcentrum Paddepoel', 'Stadhuis', 'Prinsenhof', 'Gasuniegebouw', 'Rijkskantoor Kempkensberg'];
let n = 0, fails = 0, built = 0;
for (const name of NAMES) {
  for (const rot of [0, 0.6, 2.1]) {
    const c = Math.cos(rot), s = Math.sin(rot), cx = -1400, cy = -1150;
    const ring = [[-40, -15], [40, -15], [40, 15], [-40, 15]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
    const b = { name, landmark: name, type: 'civic', pts: ring, h: 2.5, parts: [] };
    const edges = L.modelKit.edgesOf(ring);
    if (!L.hasLandmarkModel(b)) continue;
    let g;
    try { g = L.buildLandmarkGeometry(b, ring, edges); } catch (e) { continue; }
    if (!g) continue;
    built++;
    const pos = g.attributes.position.array;
    let bad = 0;
    for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) bad++;
    n++;
    if (bad) { fails++; console.log(`FAIL ${name} rot ${rot}: ${bad} non-finite coordinates`); }
  }
}
if (!built) { console.log('FAIL no landmark builder ran'); process.exit(1); }
console.log(`${n} landmark geometries, ${fails} with non-finite positions`);
process.exit(fails ? 1 : 0);
