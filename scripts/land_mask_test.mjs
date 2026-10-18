// The land mask of the maps without any world data (#244, #233): with only the built-in outline
// (regiondata.js) the whole province's land - the city, the Ommeland, the villages - is land, the
// sea and what lies beyond the border is not. So the polder drawn on the maps and the minimap is
// never withheld from the Ommeland. (scripts/procedural_land_test.mjs does the same with the real
// province layer when game/world exists.)   node scripts/land_mask_test.mjs
import { provinceLandAt, regionAt } from '../game/js/regions.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0, fails = 0;
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra !== undefined ? JSON.stringify(extra) : ''); } };

// places of the province as lat/lon, so the test does not lean on world coordinates
const PLACES = { Groningen: [53.2194, 6.5665], Haren: [53.1727, 6.6054], 'Ten Boer': [53.2779, 6.6988], Hoogezand: [53.1632, 6.7616], Winsum: [53.3319, 6.5170], Bedum: [53.3036, 6.6044], Delfzijl: [53.3322, 6.9172], Winschoten: [53.1438, 7.0376], Leek: [53.1655, 6.3769], Uithuizen: [53.4094, 6.6777], Appingedam: [53.3223, 6.8574], Zuidhorn: [53.2461, 6.4072], Veendam: [53.1056, 6.8795] };
for (const [name, [la, lo]] of Object.entries(PLACES)) {
  const [x, y] = wgsToWorld(la, lo);
  const r = regionAt(x, y);
  // a place that the outline puts in Groningen must be land; the others only have to agree with the region
  if (r.id === 'groningen') ok(provinceLandAt(x, y), `${name} is land`, [Math.round(x), Math.round(y)]);
  else ok(provinceLandAt(x, y) === false, `${name} lies in ${r.id} and is not drawn`, r.id);
}
ok(provinceLandAt(201, 45), 'the city centre is land');
ok(!provinceLandAt(0, -31000) && !provinceLandAt(-20000, -30000) && !provinceLandAt(0, -60000), 'the Wadden Sea and the North Sea are not');
ok(!provinceLandAt(60000, 40000) && !provinceLandAt(-40000, 20000), 'beyond the province is not');

// over the whole map: land by the mask is the province's land (inside Groningen, not at sea) within a cell of the coast
let inside = 0, masked = 0, wrong = 0;
for (let x = -26000; x < 44000; x += 1000) for (let y = -38000; y < 42000; y += 1000) {
  const r = regionAt(x, y);
  const land = provinceLandAt(x, y);
  if (r.id === 'groningen') { inside++; if (land) masked++; }
  else if (land) wrong++;
}
ok(inside > 1500 && masked / inside > 0.98, 'at least 98% of the province is land to the mask', [inside, masked]);
ok(wrong <= inside * 0.01, 'nothing outside the province is land (within a cell of the coast)', wrong);

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
