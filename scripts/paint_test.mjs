// Spray shop: every paint's swatch hex is the colour the car body is built
// in (name -> hex -> body vertex colour, compared in linear space), also on a
// stolen police car and through the shop's preview spec.
//   node scripts/paint_test.mjs
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { PAINTS } = await import('../game/js/shops.js');

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };

// Share of body vertices whose colour matches `hex` within tolerance.
function paintShare(mesh, hex) {
  const want = new THREE.Color(hex);
  let hit = 0, n = 0;
  mesh.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.color) return;
    const c = o.geometry.attributes.color;
    for (let i = 0; i < c.count; i++) {
      n++;
      if (Math.abs(c.getX(i) - want.r) < 0.01 && Math.abs(c.getY(i) - want.g) < 0.01 && Math.abs(c.getZ(i) - want.b) < 0.01) hit++;
    }
  });
  return n ? hit / n : 0;
}

const ids = new Set();
for (const p of PAINTS) {
  if (!/^#[0-9a-f]{6}$/.test(p.color)) fail(`${p.id}: colour ${p.color} is not a lowercase #rrggbb (the shop compares strings)`);
  if (ids.has(p.color)) fail(`${p.label}: duplicate colour ${p.color}`);
  ids.add(p.color);
  const cases = [
    ['hatch', { id: 1, model: { name: 'hatch', len: 3.8, wid: 1.7, color: p.color } }],
    ['sedan', { id: 2, model: { name: 'sedan', len: 4.3, wid: 1.8, color: p.color } }],
    ['stolen police car', { id: 3, isPolice: true, model: { name: 'police', len: 4.3, wid: 1.8, color: p.color, resprayed: true } }],
  ];
  for (const [label, v] of cases) {
    const share = paintShare(buildVehicleMesh(v), p.color);
    if (share < 0.15) fail(`${p.label} (${p.color}) on ${label}: only ${(share * 100).toFixed(0)}% of the body in that colour`);
  }
  // control: an unsprayed police car keeps its livery (black matches its trim)
  if (p.id !== 'zwart' && paintShare(buildVehicleMesh({ id: 4, isPolice: true, model: { name: 'police', len: 4.3, wid: 1.8, color: p.color } }), p.color) > 0.05) fail(`${p.label}: police livery check is not discriminating`);
}
console.log(fails ? `${fails} paint problem(s)` : `paint ok: ${PAINTS.length} colours`);
process.exitCode = fails ? 1 : 0;
