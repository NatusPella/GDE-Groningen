// Trekker-limo (#1201): de limowielen staan op de grond (as op wielstraal) en passen in de wielkast.
//   node scripts/trekkerlimo_wielen_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
let bad = 0;
const check = (n, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', n, info); } };
const g = buildVehicleMesh({ id: 'limo-wielen', model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' } });
const wheels = g.userData.wheels || [];
check('acht wielen', wheels.length === 8, String(wheels.length));
const limo = wheels.filter((w) => w.position.x < 0);
check('vier limowielen achterin', limo.length === 4, String(limo.length));
for (const w of limo) {
  w.geometry?.computeBoundingBox?.();
  const r = w.geometry?.boundingBox ? (w.geometry.boundingBox.max.y - w.geometry.boundingBox.min.y) / 2 : w.position.y;
  check('limowiel raakt de grond', Math.abs(w.position.y - r) < 0.02, `y=${w.position.y} r=${r}`);
  check('limowiel is minstens 0,38 m (geen zwevend model)', r >= 0.375, String(r));
  check('limowiel past in de wielkast van 0,43', r <= 0.43, String(r));
}
console.log(bad ? `trekkerlimo_wielen_test: ${bad} mislukt` : 'trekkerlimo_wielen_test: ok');
process.exit(bad ? 1 : 0);
