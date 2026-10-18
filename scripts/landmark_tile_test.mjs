// The everyday kits on the tiles' own buildings (landmarks3d.js kitFor,
// landmarkkit.js kitItemFromBuilding, issue #164): which tile building rows get
// which kit, and that the model builds a finite, placed geometry on the footprint.
//   node scripts/landmark_tile_test.mjs
import './node3d.mjs';

await import('../game/js/models3d_buildings.js');
const L = await import('../game/js/landmarks3d.js');
const K = await import('../game/js/landmarkkit.js');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const rect = (cx, cy, len, wid, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2], [-len / 2, -wid / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
};
const row = (type, cx, cy, len, wid, extra = {}) => ({ type, name: null, hm: 8, pts: rect(cx, cy, len, wid, 0.4), ...extra });

const cases = [
  [row('farm', -1400, 1100, 30, 16), 'farm'],
  [row('silo', -1500, 1200, 14, 10, { hm: 24 }), 'silo'],
  [row('industrial', -1600, 1300, 70, 40), 'factory'],
  [row('industrial', -1700, 1300, 40, 22, { name: 'Houtzagerij Test' }), 'factory'],
  [row('apartments', -1800, 1400, 60, 14, { hm: 30 }), 'flat'],
  [row('school', -1900, 1500, 40, 14), 'school'],
  [row('train_station', -2000, 1600, 34, 12), 'station'],
  [row('civic', -2100, 1700, 26, 14, { name: 'Stadhuis van Test' }), 'townhall'],
  [row('yes', -2200, 1800, 30, 16, { name: 'Museum Test' }), 'museum'],
  [row('industrial', -2900, 2500, 40, 20, { name: 'Boerderij Test' }), 'farm'],
  [row('house', -3000, 2600, 36, 16, { name: 'Stolpboerderij Zuid' }), 'farm'],
  [row('industrial', -3100, 2700, 40, 20, { name: 'Gemaal De Test' }), null],
  // not recognisable: an ordinary house, a small shed, a low flat, an unnamed civic block, a tiny school
  [row('house', -2300, 1900, 10, 8), null],
  [row('industrial', -2400, 2000, 20, 12), null],
  [row('apartments', -2500, 2100, 40, 12, { hm: 9 }), null],
  [row('civic', -2600, 2200, 26, 14), null],
  [row('school', -2700, 2300, 12, 8), null],
  [row('yes', -2800, 2400, 20, 10, { name: 'Kapper Test' }), null],
];
for (const [b, want] of cases) {
  const item = K.kitItemFromBuilding(b);
  check((item ? item.k : null) === want, `${b.type} ${b.name || ''}: kit ${item ? item.k : null}, want ${want}`);
  // the model builder: a finite geometry that lies on the footprint
  const has = L.hasLandmarkModel({ ...b });
  check(has === !!want, `${b.type} ${b.name || ''}: hasLandmarkModel ${has}`);
  if (!want) continue;
  const bb = { ...b };
  const geo = L.buildLandmarkGeometry(bb, b.pts.slice(0, -1), []);
  check(!!geo, `${b.type}: no geometry`);
  if (!geo) continue;
  const pos = geo.attributes.position.array;
  check(pos.every(Number.isFinite) && pos.length > 90, `${b.type}: bad positions`);
  // the geometry stays in the footprint's neighbourhood and above the ground
  const cx = b.pts.reduce((s, p) => s + p[0], 0) / b.pts.length, cy = b.pts.reduce((s, p) => s + p[1], 0) / b.pts.length;
  let far = 0, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    far = Math.max(far, Math.hypot(pos[i] - cx, pos[i + 2] - cy));
    minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
  }
  check(far < 80, `${b.type}: geometry ${far.toFixed(0)} m from the footprint`);
  check(minY > -1 && maxY > 4 && maxY < 90, `${b.type}: heights ${minY.toFixed(1)}..${maxY.toFixed(1)}`);
  check(geo.groups.every((g) => g.materialIndex < 5), `${b.type}: material groups`);
}
// the model is cached per building: asking twice gives the same answer
const b1 = row('farm', 0, 0, 30, 16);
check(L.hasLandmarkModel(b1) && L.hasLandmarkModel(b1) && b1._kitItem && b1._kitItem.k === 'farm', 'the kit item is cached on the building');
// a named landmark keeps its own model before the kit

console.log(fails.length ? 'FAIL\n' + fails.join('\n') : `ok (${cases.length} tile buildings)`);
process.exit(fails.length ? 1 : 0);
