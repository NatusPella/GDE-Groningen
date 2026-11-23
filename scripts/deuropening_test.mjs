// Echte deuropeningen (eis eigenaar 23-11): de romp heeft een gat waar de deur zit, de dichte deur vult het, en door de open
// deur kijk je de auto in. Puur (Node, geen browser):
//  (a) de romp heeft binnen de deurcontour op het zijvlak geen driehoeken meer;
//  (b) een straal door het midden van de open opening raakt eerst interieur (stoel, vloer, dashboard) of de overkant, niet de romp;
//  (c) met de deur dicht raakt diezelfde straal eerst de dichte deur, in de flank (geen kier, geen doorkijk).
//   node scripts/deuropening_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { syncVehicleDoors } = await import('../game/js/vehicledoors3d.js');
const { doorsFor } = await import('../game/js/vehicledoors.js');
const { Vehicle } = await import('../game/js/vehicle.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const MODELLEN = [
  ['hatch', { name: 'hatch', len: 3.8, wid: 1.7, color: '#c7c9cc' }],
  ['sedan', { name: 'sedan', len: 4.3, wid: 1.8, color: '#a3473f' }],
  ['suv', { name: 'suv', len: 4.7, wid: 1.95, color: '#23262a' }],
  ['sport', { name: 'sport', len: 4.1, wid: 1.85, color: '#b93a32', qcar: 'sport' }],
  ['taxi', { name: 'taxi', len: 4.6, wid: 1.8, color: '#e8c93a' }, { isTaxi: true }],
  ['politie', { name: 'police', len: 4.3, wid: 1.8, color: '#1c1c1c' }, { isPolice: true }],
  ['wagon (eigen bouwer)', { name: 'wagon', len: 4.5, wid: 1.8, color: '#6e937c' }],
  ['bestelbus (eigen bouwer)', { name: 'van', len: 5.0, wid: 2.0, color: '#d9d9d9' }],
  ['sedan zonder hybride (eigen bouwer)', { name: 'sedan', len: 4.3, wid: 1.8, color: '#a3473f', hybride: false }],
  ['bakwagen', { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' }],
  ['trekker', { name: 'tractor', len: 4.3, wid: 2.3, color: '#3f7d3a' }],
  ['trekker-limo', { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' }],
];
const zichtbaar = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
// het open deurblad zelf telt niet (dat staat bij 63 graden schuin voor de opening, zoals bij een echte auto)
function eersteRaak(mesh, x, y, side, behalve = null) {
  mesh.updateMatrixWorld(true);
  const doelen = [];
  const binnen = (o) => { for (let p = o; p; p = p.parent) if (p === behalve) return true; return false; };
  const getekend = (o) => (Array.isArray(o.material) ? o.material : [o.material]).some((m) => m && m.visible !== false && m.colorWrite !== false); // een LOD-niveau dat niet staat telt niet
  mesh.traverse((o) => { if (o.isMesh && zichtbaar(o) && !binnen(o) && getekend(o) && o.geometry.attributes.position.count) doelen.push(o); });
  const rc = new THREE.Raycaster(new THREE.Vector3(x, y, side * 3), new THREE.Vector3(0, 0, -side));
  rc.far = 6;
  const hits = rc.intersectObjects(doelen, false);
  return hits[0] || null;
}
for (const [naam, model, extra = {}] of MODELLEN) {
  const v = new Vehicle(0, 0, 0, { maxSpeed: 40, accel: 8, brake: 20, turnRate: 2.5, ...model });
  Object.assign(v, extra);
  const mesh = buildVehicleMesh(v);
  const rects = mesh.userData.gatRects || {};
  const echt = mesh.userData.echtGat;
  check(naam + ': heeft echte deuropeningen', echt && echt.size >= 2, String(echt && echt.size));
  if (!echt) continue;
  const defs = doorsFor(v).filter((d) => echt.has(d.id));
  const body = mesh.userData.body, pos = body.geometry.attributes.position;
  const hw = (mesh.userData.deurWid || v.model.wid) / 2;
  for (const d of defs) {
    const r = rects[d.id];
    check(`${naam}.${d.id}: gatcontour bekend`, !!r);
    if (!r) continue;
    // (a) geen romp binnen de contour (2 cm marge): geen driehoek van de flank zelf (8 cm rond de zijkant van deze deur). Een spatbord
    // of opstap vóór de opening (een trekker) en het interieur achter de opening (stoelen, vloer, binnenbak) zijn geen wand in het gat.
    const zd = (mesh.userData.deurZ && mesh.userData.deurZ[d.id]) || hw;
    let binnen = 0;
    const a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), c3 = new THREE.Vector3(), n3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a3.fromBufferAttribute(pos, i); b3.fromBufferAttribute(pos, i + 1); c3.fromBufferAttribute(pos, i + 2);
      n3.subVectors(b3, a3).cross(c3.clone().sub(a3)).normalize();
      const cx = (a3.x + b3.x + c3.x) / 3, cy = (a3.y + b3.y + c3.y) / 3, cz = (a3.z + b3.z + c3.z) / 3;
      if (!(cx > r[0] + 0.02 && cx < r[2] - 0.02 && cy > r[1] + 0.02 && cy < r[3] - 0.02)) continue;
      if (Math.abs(cz * d.side - zd) < 0.08) binnen++; // de flank zelf (met zijn dikte en wat erop ligt)
    }
    check(`${naam}.${d.id}: (a) geen romp in de deuropening`, binnen === 0, `${binnen} driehoeken`);
    // (c) dicht: de straal door het midden raakt eerst de dichte deur, in de flank
    const mx = (r[0] + r[2]) / 2, my = r[1] + 0.65 * (r[3] - r[1]); // midden in de lengte, op twee derde van de hoogte (boven een spatbord of wiel voor de opening)
    const dicht = eersteRaak(mesh, mx, my, d.side);
    check(`${naam}.${d.id}: (c) dicht: eerst de deur`, dicht && (dicht.object === mesh.userData.deurenDicht || dicht.object.parent === mesh.userData.deurenDicht) && dicht.point.z * d.side > hw * 0.7, dicht ? `${dicht.object.name || dicht.object.type} op z ${dicht.point.z.toFixed(2)}` : 'niets');
  }
  // (b) open: de deuren aan één kant open (de overkant dicht), de straal door het midden van elke opening raakt interieur of de
  // overkant (de binnenkant van de dichte deur daar, of de romp aan die kant)
  for (const side of [-1, 1]) {
  const m2 = buildVehicleMesh(v);
  const rollen = [...new Set(defs.filter((q) => q.side === side).map((q) => q.seat))];
  for (let k = 0; k < 30; k++) for (const rol of rollen) syncVehicleDoors(m2, v, 0.05, { rol, open: true, side });
  for (const d of defs.filter((q) => q.side === side)) {
    const r = rects[d.id];
    if (!r) continue;
    const mx = (r[0] + r[2]) / 2, my = r[1] + 0.65 * (r[3] - r[1]); // midden in de lengte, op twee derde van de hoogte (boven een spatbord of wiel voor de opening)
    const open = eersteRaak(m2, mx, my, d.side, m2.userData.doorRig && m2.userData.doorRig.doors[d.id] && m2.userData.doorRig.doors[d.id].pivot);
    const goed = open && (open.object === m2.userData.interieurSimpel || (open.point.z * d.side < 0)) && open.object !== m2.userData.deurenDicht;
    check(`${naam}.${d.id}: (b) open: eerst interieur of de overkant`, goed, open ? `${open.object.name || open.object.type} op z ${open.point.z.toFixed(2)}` : 'niets');
  }
  }
}
console.log(bad ? `deuropening_test: ${bad} mislukt` : 'deuropening_test: ok');
process.exit(bad ? 1 : 0);
