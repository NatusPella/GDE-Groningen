// Driehoeken per LOD-niveau en draw calls van voertuigen (24-11): node scripts/voertuig_tris.mjs bus,midibus,maaidorser,laadmachine
import './node3d.mjs';
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const SPECS = {
  bus: { model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44' }, isBus: true },
  midibus: { model: { name: 'midibus', len: 8, wid: 2.4, color: '#0f3a4a' }, isBus: true },
  maaidorser: { model: { name: 'maaidorser', len: 7.4, wid: 3.3, color: '#c43d2b' } },
  laadmachine: { model: { name: 'laadmachine', len: 3.4, wid: 1.8, color: '#e0a92b' } },
};
const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
for (const n of (process.argv[2] || Object.keys(SPECS).join(',')).split(',')) {
  const m = buildVehicleMesh({ id: 'tris-' + n, health: 100, ...SPECS[n] });
  let t0 = 0, calls = 0, mats = 0;
  m.traverse((o) => { if (o.isMesh && !/^lod[12]$/.test(o.name)) { t0 += tri(o.geometry); calls += Array.isArray(o.material) ? o.geometry.groups.length || 1 : 1; mats += Array.isArray(o.material) ? o.material.length : 1; } });
  const l = m.userData.lods;
  console.log(n, 'LOD0', Math.round(t0), 'LOD1', l ? l.tris[1] : '-', 'LOD2', l ? l.tris[2] : '-', 'draw calls (niveau 0, zonder interieur)', calls, 'materialen', mats);
}
