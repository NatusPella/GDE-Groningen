// Wielen van voertuigen via de wielinstancing (wheelinstances3d.js) bij elke LOD-afstand (#1340, #1337): een voertuig dat op 5 m staat
// moet zijn banden tekenen, ook als er eerder een voertuig op 60 m werd geregistreerd (de gedeelde instantiemateriaal erft anders
// material.visible = false van een wiel dat de LOD verborg), en een voertuig op 60 m tekent zijn wielen niet dubbel.
//   node scripts/wielinstancing_lod_test.mjs
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { zetLodAfstand } = await import('../game/js/vehiclelod3d.js');
const { VOERTUIG_REGISTER } = await import('../game/js/propregister.js');
const { beginWheels, addVehicleWheels, endWheels } = await import('../game/js/wheelinstances3d.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const extra = {
  bakwagen: { model: { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' } }, bus: { model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44' }, isBus: true },
  tractor: { model: { name: 'tractor', len: 4.3, wid: 2.3, color: '#3f7d3a' } }, quad: { model: { name: 'quad', len: 2.1, wid: 1.2, color: '#b8322a' } },
  foodtruck: { model: { name: 'foodtruck', len: 5.4, wid: 2.1, color: '#2f6fb0' } }, ambulance: { model: { name: 'van', len: 5.6, wid: 2, color: '#f1d21c' }, isAmbulance: true },
  fiets: { model: { name: 'bike', len: 1.75, wid: 0.5, color: '#1c1c1c' }, isBike: true }, racefiets: { model: { name: 'bike', stijl: 'race', len: 1.75, wid: 0.5, color: '#c43d2b' }, isBike: true },
  bakfiets: { model: { name: 'bike', cargo: true, len: 2.55, wid: 0.72, color: '#2f4a3a' }, isBike: true }, fatbike: { model: { name: 'bike', fat: true, len: 1.95, wid: 0.62, color: '#20221f' }, isBike: true },
  step: { model: { name: 'scooter', len: 1.1, wid: 0.4, color: '#e8e6e0' }, isScooter: true }, bromfiets: { model: { name: 'scooter', moped: true, len: 1.7, wid: 0.62, color: '#e6e1d6' }, isScooter: true },
};
const lijst = [...Object.entries(VOERTUIG_REGISTER).filter(([, e]) => !e.lod).map(([id, e]) => [id, { model: { ...e.model }, isTaxi: !!e.isTaxi, isPolice: !!e.isPolice }]), ...Object.entries(extra)];
const scene = new THREE.Scene();
// instanties die nu getekend worden: per pool (InstancedMesh onder de wheel-instances-groep) telt alleen een zichtbaar materiaal mee
const getekend = () => { let c = 0; scene.traverse((o) => { if (o.isInstancedMesh && o.name === 'wheel-instances' && o.visible && o.material.visible) c += o.count; }); return c; };
const tel = (mesh) => { let c = (mesh.userData.wheels || []).length; for (const w of mesh.userData.wheels || []) c += w.children.filter((x) => x.isMesh).length; return c; };
// een model met een tweede LOD-keten (de achterwagen van de gelede bus) krijgt dezelfde afstand
const zet = (m, d) => { zetLodAfstand(m, d); m.traverse((o) => { if (o !== m && o.userData && o.userData.lods) zetLodAfstand(o, d); }); };
const ronde = (meshes) => { beginWheels(scene); for (const m of meshes) addVehicleWheels(m, null); endWheels(); };

// 1. de eerste die zich meldt staat ver weg (60 m), daarna dezelfde modellen dichtbij
const ver = [], dicht = [];
for (const [id, spec] of lijst) {
  const a = buildVehicleMesh({ id: 'v-' + id, health: 100, ...spec }), b = buildVehicleMesh({ id: 'n-' + id, health: 100, ...spec });
  a.position.x = 60; scene.add(a); scene.add(b);
  ver.push([id, a]); dicht.push([id, b]);
}
for (const [, m] of ver) zet(m, 60);
for (const [, m] of dicht) zet(m, 5);
ronde(ver.map(([, m]) => m));
ronde(dicht.map(([, m]) => m)); // dezelfde pools, het ver-voertuig maakte ze eerst
for (const [id, m] of dicht) {
  ok((m.userData.wheels || []).length > 0, `${id}: heeft wielen`);
  ronde([m]);
  ok(getekend() === tel(m), `${id}: op 5 m worden alle ${tel(m)} wielonderdelen getekend`, String(getekend()));
}
// 2. een voertuig op 60 m (niveau 1 of 2 met eigen wielen in de romp) tekent zijn losse wielen niet nog eens
for (const [id, m] of ver) {
  if (!m.userData.lods) continue;
  ronde([m]);
  ok(getekend() === 0, `${id}: op 60 m geen dubbele wielen naast die van het LOD-niveau`, String(getekend()));
}
// 3. op 20 m (niveau 0) wel
for (const [id, m] of dicht) { zet(m, 20); ronde([m]); ok(getekend() === tel(m), `${id}: op 20 m worden de wielen getekend`, String(getekend())); }
console.log(bad ? `wielinstancing_lod_test: ${bad} van ${n} mislukt` : `wielinstancing_lod_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
