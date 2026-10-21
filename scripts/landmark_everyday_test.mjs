// The everyday landmark kits (game/js/landmarkkit.js, issue #164): farms in
// four types, silos and factories, flats, town halls, stations, schools and
// museums, on synthetic items (no province data needed).
//   node scripts/landmark_everyday_test.mjs
import './node3d.mjs';

const K = await import('../game/js/landmarkkit.js');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const BUDGET = [8000, 3000, 900];

// a rectangle outline len x wid at (x, y)
const rect = (x, y, len, wid) => [x - len / 2, y - wid / 2, x + len / 2, y - wid / 2, x + len / 2, y + wid / 2, x - len / 2, y + wid / 2];
const item = (k, n, x, y, len, wid, t = {}) => ({ k, n, x, y, o: rect(x, y, len, wid), t });

const cases = [];
// farm types: by name, by tag and by footprint shape
cases.push(['farm', item('farm', 'Stolpboerderij Oost', 100, 200, 22, 20), { kit: 'farm', type: 'stolp' }]);
cases.push(['farm', item('farm', 'Langhuis Noord', 300, 200, 50, 16), { kit: 'farm', type: 'langhuis' }]);
cases.push(['farm', item('farm', 'Kop-hals-romp West', 500, 200, 40, 20), { kit: 'farm', type: 'kophalsromp' }]);
cases.push(['farm', item('farm', '', 700, 200, 36, 18, { 'farm:type': 'tvorm' }), { kit: 'farm', type: 'tvorm' }]);
cases.push(['farm', item('farm', '', 900, 200, 21, 20), { kit: 'farm' }]);
cases.push(['farm', item('farm', '', 1100, 200, 60, 14), { kit: 'farm' }]);
cases.push(['silo', item('silo', 'Graansilo Zuid', 100, 400, 20, 12), { kit: 'industry', type: 'silo' }]);
cases.push(['silo', item('silo', '', 300, 400, 14, 10, { man_made: 'silo', height: '32' }), { kit: 'industry', type: 'silo' }]);
cases.push(['factory', item('factory', 'Suikerfabriek', 500, 400, 70, 30), { kit: 'industry', type: 'factory', chimney: true }]);
cases.push(['factory', item('factory', '', 700, 400, 30, 18, { building: 'industrial' }), { kit: 'industry', type: 'factory' }]);
cases.push(['pakhuis', item('pakhuis', 'Pakhuis Zuiderhaven', 1300, 400, 40, 14), { kit: 'industry', type: 'pakhuis' }]);
cases.push(['pakhuis', item('pakhuis', '', 1500, 400, 30, 12, { building: 'warehouse' }), { kit: 'industry', type: 'pakhuis' }]);
cases.push(['flat', item('flat', '', 100, 600, 60, 14, { 'building:levels': '10' }), { kit: 'flat', levels: 10 }]);
cases.push(['flat', item('flat', '', 300, 600, 40, 12), { kit: 'flat' }]);
cases.push(['townhall', item('townhall', 'Stadhuis van Test', 500, 600, 30, 14, { amenity: 'townhall' }), { kit: 'hall', type: 'townhall' }]);
cases.push(['station', item('station', 'Station Test', 700, 600, 34, 12, { railway: 'station' }), { kit: 'hall', type: 'station' }]);
cases.push(['school', item('school', 'Basisschool De Test', 900, 600, 40, 14, { amenity: 'school' }), { kit: 'hall', type: 'school' }]);
cases.push(['museum', item('museum', 'Museum Test', 1100, 600, 30, 16, { tourism: 'museum' }), { kit: 'hall', type: 'museum' }]);
// no outline: the fit box stands in
cases.push(['farm', { k: 'farm', n: '', x: 0, y: 0, t: {} }, { kit: 'farm' }]);

const heights = {};
for (const [label, it, want] of cases) {
  const p = K.landmarkParams(it);
  if (!p) { fails.push(`${label} ${it.n}: no params`); continue; }
  for (const [k, v] of Object.entries(want)) check(p[k] === v, `${label} ${it.n}: ${k} is ${p[k]}, want ${v}`);
  // same item, same result
  check(JSON.stringify(K.landmarkParams(it)) === JSON.stringify(p), `${label} ${it.n}: not deterministic`);
  for (const lod of [K.LOD_FULL, K.LOD_MASS, K.LOD_SKY]) {
    const g = K.landmarkGeometry({ ...p }, lod);
    const pos = g.geometry.attributes.position.array;
    check(pos.every(Number.isFinite), `${label} ${it.n}: NaN at lod ${lod}`);
    const tris = pos.length / 9;
    check(tris >= 12 && tris <= BUDGET[lod], `${label} ${it.n}: ${Math.round(tris)} triangles at lod ${lod}`);
    check(g.geometry.groups.length <= 3, `${label} ${it.n}: too many groups`);
    if (lod === K.LOD_FULL) {
      check(g.height >= 4 && g.height <= 80, `${label} ${it.n}: height ${g.height.toFixed(1)}`);
      heights[`${label}:${p.type || p.kit}`] = Math.max(heights[`${label}:${p.type || p.kit}`] || 0, g.height);
    }
  }
}

// the farm types differ in shape: the four give four different triangle counts / tops
const farmShapes = new Set(cases.filter((c) => c[0] === 'farm' && c[2].type).map(([, it]) => {
  const p = K.landmarkParams(it);
  const g = K.landmarkGeometry({ ...p }, K.LOD_FULL);
  return `${p.type}:${g.geometry.attributes.position.count}`;
}));
check(farmShapes.size === 4, `four farm types give four shapes (${farmShapes.size})`);
// a tower on the town hall and the station, none on the school
const top = (it) => K.landmarkGeometry({ ...K.landmarkParams(it) }, K.LOD_FULL).height;
check(top(cases.find((c) => c[0] === 'townhall')[1]) > 18, 'the town hall has a clock tower');
check(top(cases.find((c) => c[0] === 'school')[1]) < 12, 'the school is low');
check(top(cases.find((c) => c[1].n === 'Suikerfabriek')[1]) > 25, 'the sugar factory has a chimney');
// more levels, a taller flat
check(top(cases.find((c) => c[0] === 'flat')[1]) > 28, 'ten levels is over 28 m');

// a harbour warehouse out of a tile building row: only named ones, only the right size
{
  const row = (name, len, wid, type = 'warehouse') => ({ type, name, hm: 8, pts: [[0, 0], [len, 0], [len, wid], [0, wid]] });
  check(K.kitItemFromBuilding(row('Pakhuis Noordhaven', 40, 14)) && K.kitItemFromBuilding(row('Pakhuis Noordhaven', 40, 14)).k === 'pakhuis', 'a named warehouse becomes a pakhuis');
  check(!K.kitItemFromBuilding(row('', 40, 14)), 'an unnamed warehouse stays a plain building');
  check(!K.kitItemFromBuilding(row('Pakhuis X', 8, 8)), 'a shed is too small');
  // (#348) the name decides when the tag says something else: OSM maps harbour warehouses as building=yes, converted ones as apartments
  for (const type of ['yes', 'apartments', 'commercial']) check(K.kitItemFromBuilding(row('Pakhuis Friesland', 40, 14, type)) && K.kitItemFromBuilding(row('Pakhuis Friesland', 40, 14, type)).k === 'pakhuis', 'a pakhuis mapped as ' + type + ' is a pakhuis');
  check(!K.kitItemFromBuilding(row('Pakhuis Friesland', 40, 14, 'house')), 'a house named pakhuis stays a house');
  check(!K.kitItemFromBuilding(row('Pakhuis Friesland', 300, 40, 'yes')), 'a block of 12.000 m2 is no pakhuis');
  check(!K.kitItemFromBuilding(row('Loods', 40, 14, 'yes')), 'a loods alone is not a pakhuis');
}
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : `ok (${cases.length} synthetic items)`);
process.exit(fails.length ? 1 : 0);
