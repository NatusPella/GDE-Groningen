// #953: een voet- of fietsbrug die hoog klimt zonder water, spoor of weg eronder (de wallen van Vesting Bourtange)
// verliest zijn profiel en brugvlag en ligt op de grond; een echte brug houdt zijn dek.
//   node scripts/deck_needless_test.mjs
import { dropNeedlessDeck } from '../game/js/mapdata.js';
import { SpatialGrid } from '../game/js/spatialgrid.js';
import { polygonBounds } from '../game/js/util.js';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

const mk = (water = [], rails = [], roads = []) => {
  const g = (items) => { const s = new SpatialGrid(100); for (const it of items) { it.bounds = polygonBounds(it.pts); s.insert(it, it.bounds); } return s; };
  return { waterGrid: g(water), railGrid: g(rails), roadGrid: g(roads) };
};
const path = (z = 3.5, cat = 'foot') => ({ id: 1, cat, bridge: true, pts: [[0, 0], [10, 0], [20, 0], [30, 0]], z: [0, z, z, 0], st: [1, 1, 1], ly: [1, 1, 1] });
const lake = { pts: [[8, -5], [22, -5], [22, 5], [8, 5]] };

let r = path();
ok(dropNeedlessDeck(mk(), r) === true, 'wal zonder water: dek vervalt');
ok(!r.z && !r.st && !r.bridge && r.deckDropped, 'profiel en brugvlag weg');

r = path();
ok(dropNeedlessDeck(mk([lake]), r) === false && r.z && r.bridge, 'brug over water houdt zijn dek');
r = path();
ok(dropNeedlessDeck(mk([{ pts: [[8, 3], [22, 3], [22, 9], [8, 9]] }]), r) === false, 'water naast het pad (binnen 6 m) houdt het dek');
r = path();
ok(dropNeedlessDeck(mk([], [{ pts: [[10, -20], [10, 20]] }]), r) === false, 'brug over spoor houdt zijn dek');
r = path();
ok(dropNeedlessDeck(mk([], [], [{ id: 2, cat: 'major', pts: [[15, -20], [15, 20]] }]), r) === false, 'brug over autoweg houdt zijn dek');
r = path();
ok(dropNeedlessDeck(mk([], [], [{ id: 3, cat: 'foot', pts: [[15, -20], [15, 20]] }]), r) === true, 'een ander voetpad ernaast is geen reden');
r = path(1.2);
ok(dropNeedlessDeck(mk(), r) === false, 'lage brug (ondiepe sloot) blijft');
r = path(3.5, 'normal');
ok(dropNeedlessDeck(mk(), r) === false, 'autoweg valt er niet onder');
r = path(); r.bridge = false;
ok(dropNeedlessDeck(mk(), r) === false, 'zonder brugvlag niets te doen');
r = path(); r.tunnel = true;
ok(dropNeedlessDeck(mk(), r) === false, 'tunnel blijft');
console.log(`deck_needless_test: ${bad ? 'FAIL' : 'ok'} (${n} controles)`);
process.exit(bad ? 1 : 0);
