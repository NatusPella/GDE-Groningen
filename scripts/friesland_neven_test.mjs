// De twee neven bij de Friese grens staan niet stil (#436): het prop bouwt
// twee figuren en de tick laat ze ijsberen en zwaaien.
//   node scripts/friesland_neven_test.mjs
import './node3d.mjs';
const { buildProp, disposeProp } = await import('../game/js/ommelandprops3d.js');

let n = 0, bad = 0;
const ok = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };

const prop = buildProp('rand_neef', { hw: 3 }, {});
ok('twee neven', prop.people.length === 2, String(prop.people.length));
const [a, b] = prop.people.map((p) => p.mesh);
ok('beide figuren hebben benen en armen', !!(a.userData.legL && a.userData.armR && b.userData.legL && b.userData.armR));
const a0 = a.position.x, b0 = b.position.x;
prop.tick(1 / 60, 0.1);
const a1 = a.position.x, b1 = b.position.x;
prop.tick(1 / 60, 1.2);
ok('de neven bewegen langs het hek', a1 !== a0 && a.position.x !== a1 && b.position.x !== b0, `${a0} ${a1} ${a.position.x}`);
ok('ze lopen (benen zwaaien)', Math.abs(a.userData.legL.rotation.z) + Math.abs(b.userData.legR.rotation.z) > 0.001);
// op het keerpunt zwaait er een arm in plaats van een stilstaand beeld
for (let k = 0; k < 240; k++) prop.tick(1 / 60, k / 60);
ok('geen NaN in de figuren', Number.isFinite(a.position.x) && Number.isFinite(b.position.x));
ok('het prop ruimt netjes op', (disposeProp(prop), true));
console.log(`friesland_neven_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
