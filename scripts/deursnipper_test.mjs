// Geen scherven langs de deuropening (23-11): bij het knippen van de deur uit de romp mogen er langs de contour geen losse snippers
// overblijven. Een snipper: een driehoek binnen 5 cm van de deurcontour, kleiner dan 4 cm2, die met geen enkel hoekpunt aan een andere
// driehoek van dezelfde mesh vastzit. Gecontroleerd voor de romp en voor elk deurblad, bij alle hybrides en de blokkenrompen.
//   node scripts/deursnipper_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const { VOERTUIG_REGISTER } = await import('../game/js/propregister.js');

const BAND = 0.05, KLEIN = 0.0004;
let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const sleutel = (p, i) => `${Math.round(p.getX(i) * 1000)},${Math.round(p.getY(i) * 1000)},${Math.round(p.getZ(i) * 1000)}`;
function snippers(geo, rects) {
  const p = geo.attributes.position, hoeken = new Map();
  for (let i = 0; i < p.count; i++) { const k = sleutel(p, i); hoeken.set(k, (hoeken.get(k) || 0) + 1); }
  const randAf = (x, y) => Math.min(...rects.map((r) => {
    const binnen = x > r[0] - BAND && x < r[2] + BAND && y > r[1] - BAND && y < r[3] + BAND;
    return binnen ? Math.min(Math.abs(x - r[0]), Math.abs(x - r[2]), Math.abs(y - r[1]), Math.abs(y - r[3])) : Infinity;
  }));
  let n = 0;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i);
    const ux = p.getX(i + 1) - ax, uy = p.getY(i + 1) - ay, uz = p.getZ(i + 1) - az, wx = p.getX(i + 2) - ax, wy = p.getY(i + 2) - ay, wz = p.getZ(i + 2) - az;
    const opp = Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx) / 2;
    if (opp >= KLEIN) continue;
    const cx = (ax + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (ay + p.getY(i + 1) + p.getY(i + 2)) / 3;
    if (randAf(cx, cy) > BAND) continue;
    const los = [0, 1, 2].every((k) => hoeken.get(sleutel(p, i + k)) === 1);
    if (los) n++;
  }
  return n;
}
// de toets zelf: een losse kleine driehoek op de rand wordt gevonden, een vastzittende niet
{
  const THREE = await import('three');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0.9, 0.01, 0.5, 0.9, 0, 0.51, 0.9, 1, 1, 0.9, 1.5, 1, 0.9, 1, 1.5, 0.9, 1.5, 1, 0.9, 1.5, 1.5, 0.9, 1, 1.5, 0.9], 3));
  check('toets: een losse snipper op de rand telt', snippers(g, [[0, 0.3, 1, 1.2]]) === 1, String(snippers(g, [[0, 0.3, 1, 1.2]])));
}
const lijst = [
  ...Object.entries(VOERTUIG_REGISTER).filter(([, e]) => e.hybride).map(([id, e]) => [id, { ...e.model }, { isTaxi: !!e.isTaxi, isPolice: !!e.isPolice }]),
  ['bakwagen', { name: 'truck', len: 8.5, wid: 2.5, color: 0xe8e6e0 }],
  ['trekker', { name: 'tractor', len: 4.3, wid: 2.3, color: 0x3f7d3a }],
  ['trekker-limo', { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: 0x141414 }],
];
for (const [naam, model, extra = {}] of lijst) {
  const v = new Vehicle(0, 0, 0, { maxSpeed: 40, accel: 8, brake: 20, turnRate: 2.5, ...model });
  Object.assign(v, extra);
  const mesh = buildVehicleMesh(v);
  const rects = Object.values(mesh.userData.gatRects || {});
  check(naam + ': heeft deurcontouren', rects.length >= 2);
  const romp = snippers(mesh.userData.body.geometry, rects);
  check(naam + ': geen losse snippers in de romp langs de opening', romp === 0, `${romp} snippers`);
  for (const [id, g] of Object.entries(mesh.userData.deurPanelen || {})) {
    const s = snippers(g, rects);
    check(`${naam}.${id}: geen losse snippers aan het deurblad`, s === 0, `${s} snippers`);
  }
}
console.log(bad ? `deursnipper_test: ${bad} mislukt` : 'deursnipper_test: ok');
process.exit(bad ? 1 : 0);
