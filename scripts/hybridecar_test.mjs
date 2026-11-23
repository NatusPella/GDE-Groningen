// Proef hybride auto (23-11): de Quaternius-romp (CC0, game/js/models/qcar_sedan.js) met onze functies. Per functie: werkt het?
//   node scripts/hybridecar_test.mjs [--meet]   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, updateVehicleWheelSpin, applyVehicleDamage, carBodyFit } = await import('../game/js/models3d_vehicles.js');
const { syncVehicleDoors } = await import('../game/js/vehicledoors3d.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const { VOERTUIG_REGISTER } = await import('../game/js/propregister.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const tel = (m) => { let t = 0, d = 0; m.traverse((o) => { if (o.isMesh && o.visible) { d++; t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { t: Math.round(t), d }; };
const spec = { name: 'sedan', len: 4.3, wid: 1.8, color: '#90b0d1', maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6 };

const h = new Vehicle(0, 0, 0, { ...spec });
const mesh = buildVehicleMesh(h);
check('hybride: eigen bouwer (standaard voor een gewone sedan)', mesh.userData.hybride === 'sedan', String(mesh.userData.hybride));
// wielen: vier, twee sturen, draaien en sturen werkt
check('wielen: vier, twee voor', mesh.userData.wheels.length === 4 && mesh.userData.frontWheels.length === 2);
const w0 = mesh.userData.wheels[0].rotation.z, f0 = mesh.userData.frontWheels[0];
updateVehicleWheelSpin(mesh, 10, 0.05, 0.6);
check('wielen draaien', mesh.userData.wheels[0].rotation.z !== w0);
check('voorwielen sturen', Math.abs(f0.rotation.y) > 0.01);
// lak volgt de kleur, lampen in de lampgroep, glas in de glasgroep
const g = mesh.userData.body.geometry;
check('drie materiaalgroepen (lak, glas, lampen)', g.groups.length === 3 && g.groups.every((gr) => gr.count > 0), JSON.stringify(g.groups));
// de meest voorkomende kleur van de romp is dezelfde lakkleur als bij de procedurele sedan in die kleur
const meest = (geo) => { const n = new Map(), c = geo.attributes.color; for (let i = 0; i < c.count; i++) { const k = c.getX(i) + ',' + c.getY(i) + ',' + c.getZ(i); n.set(k, (n.get(k) || 0) + 1); } return [...n.entries()].sort((a, b) => b[1] - a[1])[0][0]; };
const lakGevonden = meest(g) === meest(buildVehicleMesh(new Vehicle(0, 0, 0, { ...spec, hybride: false })).userData.body.geometry);
check('kleurvariant: de lak is de kleur van het voertuig', lakGevonden);
const rood = buildVehicleMesh(new Vehicle(0, 0, 0, { ...spec, color: '#a3473f' }));
check('kleurvariant: een andere kleur geeft een andere geometrie', rood.userData.body.geometry !== g);
// deuren: naden op de flank, de rig op de gebogen flank, open met interieur
check('deuren: per deur een flank (deurZ)', Object.keys(mesh.userData.deurZ || {}).length === 4, JSON.stringify(mesh.userData.deurZ));
for (const [id, z] of Object.entries(mesh.userData.deurZ || {})) check(`deur ${id}: flank binnen de breedte`, z > 0.6 && z <= 0.91, String(z));
const voor = tel(mesh);
for (let k = 0; k < 30; k++) for (const rol of ['bestuurder', 'achter']) for (const side of [-1, 1]) syncVehicleDoors(mesh, h, 0.05, { rol, open: true, side });
check('deuren gaan open (rig gebouwd)', !!mesh.userData.doorRig && Object.keys(mesh.userData.doorRig.doors).length >= 4);
// schade: een deuk verandert de romp, zonder NaN
const damaged = new Vehicle(0, 0, 0, { ...spec });
const dm = buildVehicleMesh(damaged);
let fout = null;
try { applyVehicleDamage(dm, damaged, 1.8, 0.3, 0.8); } catch (e) { fout = e; }
check('schade: deuk zonder fout', !fout, fout && fout.message);
const pa = dm.userData.body.geometry.attributes.position.array;
let nan = false; for (let i = 0; i < pa.length; i++) if (!Number.isFinite(pa[i])) nan = true;
check('schade: geen NaN', !nan);
check('schade: eigen kopie van de romp', dm.userData.body.geometry !== g);
// cabine: de profielmaten van de procedurele sedan (raamlijn, dak) vallen binnen de hybride romp
const fit = carBodyFit(h);
g.computeBoundingBox();
check('cabine: het dak van de cabine past onder het hybride dak', fit && fit.roof <= g.boundingBox.max.y + 0.08, `${fit && fit.roof} tegen ${g.boundingBox.max.y.toFixed(2)}`);
// kwaliteitsnorm uit het register
const norm = VOERTUIG_REGISTER.hybrideSedan && VOERTUIG_REGISTER.hybrideSedan.norm;
check('register: hybride sedan met norm', !!norm);
if (norm) check('register: driehoeken binnen de norm', voor.t >= norm.tris[0] && voor.t <= norm.tris[1], `${voor.t} niet in ${norm.tris}`);
if (process.argv.includes('--meet')) {
  const p = buildVehicleMesh(new Vehicle(0, 0, 0, { ...spec, hybride: false }));
  console.log('procedureel', JSON.stringify(tel(p)), 'hybride', JSON.stringify(voor), 'hybride met open deuren', JSON.stringify(tel(mesh)));
}
console.log(bad ? `hybridecar_test: ${bad} mislukt` : 'hybridecar_test: ok');
process.exit(bad ? 1 : 0);
